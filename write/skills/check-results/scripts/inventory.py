#!/usr/bin/env python3
"""Inventory a hackathon team repository before checking its results.

Usage:  python3 inventory.py <repo-root>

Prints, as markdown:
  * the state of the records: question-history lines still empty, rows in checks/checks.md, log
    entries per participant, whether note/note.md and note/results.md have content;
  * per working folder (each person's folder, code/, figures/, talk/): scripts, the files each script
    writes (savefig / np.save* / open(..., 'w') targets, best effort), local modules it imports,
    data files and figures;
  * figures that no script mentions (made by hand, in a notebook, or the script is missing);
  * byte-identical copies of a figure in two places (a person's folder and figures/);
  * the papers in our-idea/papers/.
Read-only: it never modifies, runs or extracts anything.
"""
import hashlib
import os
import re
import sys
from collections import defaultdict

KIT_DIRS = {"code", "figures", "checks", "log", "note", "talk", "photos", "review", "our-idea",
            "scripts", "transcripts"}
SKIP = {".git", ".claude", ".github", "__pycache__", ".ipynb_checkpoints", ".venv", "venv"}
SCRIPT_EXT = {".py", ".ipynb", ".jl", ".m", ".wl", ".nb", ".f90", ".c", ".cpp", ".sh"}
DATA_EXT = {".npz", ".npy", ".csv", ".dat", ".txt", ".h5", ".hdf5", ".json", ".pkl"}
FIG_EXT = {".pdf", ".png", ".svg", ".jpg", ".jpeg", ".gif", ".mp4", ".webp", ".html"}
WRITE_RE = re.compile(r"""(?:savefig|np\.save\w*|to_csv|write_text|open)\(\s*(?:[rf]?['"]([^'"]+)['"])?""")
WRITES_ANY = re.compile(r"(savefig|np\.save\w*|to_csv|write_text|open\([^)]*['\"][wa]b?['\"])")
IMPORT_RE = re.compile(r"^\s*(?:from\s+(\w+)\s+import|import\s+(\w+))", re.M)


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read(path):
    try:
        with open(path, errors="replace") as f:
            return f.read()
    except OSError:
        return ""


def walk(folder):
    for d, dirs, files in os.walk(folder):
        dirs[:] = sorted(x for x in dirs if x not in SKIP)
        for f in sorted(files):
            yield os.path.join(d, f)


def records(root):
    print("## Records\n")
    readme = read(os.path.join(root, "README.md"))
    empty = re.findall(r"^\s*-\s+(Q\d[^:]*|Final[^:]*|Done today means|Expected at the end of the day|"
                       r"Confidence \(1.5\)):\s*\.\.\.\s*$", readme, re.M)
    print("- Question history lines still `...`: " + (", ".join(e.split(" (")[0] for e in empty) or "none"))
    checks = read(os.path.join(root, "checks", "checks.md"))
    checks = re.sub(r"<!--.*?-->", "", checks, flags=re.S)
    rows = [l for l in checks.splitlines() if l.strip().startswith("|")][2:]
    rows = [r for r in rows if r.strip("| \t")]
    print(f"- Rows in `checks/checks.md`: {len(rows)}")
    logdir = os.path.join(root, "log")
    if os.path.isdir(logdir):
        counts = []
        for f in sorted(os.listdir(logdir)):
            if re.fullmatch(r"P\d+\.md", f):
                n = len(re.findall(r"^### ", read(os.path.join(logdir, f)), re.M))
                counts.append(f"{f[:-3]}: {n}")
        print("- Log entries: " + (", ".join(counts) or "none"))
    for name in ("note/note.md", "note/results.md", "plan.md", "plan-ai.md"):
        p = os.path.join(root, name)
        if os.path.exists(p):
            text = re.sub(r"<!--.*?-->", "", read(p), flags=re.S)
            words = len(re.sub(r"^#.*$", "", text, flags=re.M).split())
            print(f"- `{name}`: {words} words of text outside headings and comments")
        else:
            print(f"- `{name}`: not there")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    root = os.path.abspath(sys.argv[1])
    print(f"# Inventory of `{root}`\n")
    records(root)

    tops = sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d)) and d not in SKIP
                  and not d.startswith("."))
    people = [d for d in tops if d not in KIT_DIRS]
    folders = people + [d for d in ("code", "figures", "talk", "note") if d in tops]
    all_scripts, all_figs = [], []

    print("\n## Working folders\n")
    print("Person folders (not part of the kit): " + (", ".join(f"`{p}/`" for p in people) or "none") + "\n")
    for top in folders:
        scripts, data, figs = [], [], []
        for p in walk(os.path.join(root, top)):
            ext = os.path.splitext(p)[1].lower()
            rel = os.path.relpath(p, root)
            if ext in SCRIPT_EXT:
                scripts.append(rel)
            elif ext in FIG_EXT:
                figs.append(rel)
            elif ext in DATA_EXT and not rel.endswith("README.md"):
                data.append(rel)
        if not (scripts or data or figs):
            continue
        print(f"### `{top}/`\n")
        for s in scripts:
            text = read(os.path.join(root, s))
            targets = sorted({m.group(1) for m in WRITE_RE.finditer(text) if m.group(1)})
            writes = bool(WRITES_ANY.search(text))
            here = os.path.dirname(os.path.join(root, s))
            local = sorted({a or b for a, b in IMPORT_RE.findall(text)
                            if os.path.exists(os.path.join(here, (a or b) + ".py"))})
            line = f"- script `{s}`"
            if targets:
                line += " writes " + ", ".join(f"`{t}`" for t in targets)
            elif writes:
                line += " writes files (names built at run time)"
            if local:
                line += "; imports " + ", ".join(f"`{m}.py`" for m in local)
            print(line)
            all_scripts.append((s, text))
        for d in data:
            print(f"- data `{d}`")
        for f in figs:
            print(f"- figure `{f}`")
            all_figs.append(f)
        print()

    print("## Figures that no script mentions\n")
    lonely = []
    for f in all_figs:
        stem = os.path.splitext(os.path.basename(f))[0]
        if f.endswith(".html"):
            continue
        if not any(stem in text for _, text in all_scripts):
            lonely.append(f)
    print("\n".join(f"- `{f}`" for f in lonely) or "- none")

    print("\n## Byte-identical copies\n")
    by_hash = defaultdict(list)
    for f in all_figs:
        by_hash[md5(os.path.join(root, f))].append(f)
    dups = [v for v in by_hash.values() if len(v) > 1]
    print("\n".join("- " + " = ".join(f"`{x}`" for x in v) for v in dups) or "- none")

    print("\n## Papers in `our-idea/papers/`\n")
    pdir = os.path.join(root, "our-idea", "papers")
    papers = [os.path.relpath(p, pdir) for p in walk(pdir) if p.lower().endswith(".pdf")] if os.path.isdir(pdir) else []
    print("\n".join(f"- `{p}`" for p in papers) or "- none")
    print("\nRe-run scripts on copies in a scratch directory outside the repository, never in place.")


if __name__ == "__main__":
    main()
