#!/usr/bin/env python3
"""Check a hackathon team note against the rules of the day.

Usage:  python3 note_check.py note/note.md [--repo .] [--words 1000]
        python3 note_check.py note/note.tex [--repo .] [--pages 2]

Run it from the repository root (or give --repo). It reports:
  * the eight headings: present, in order, with the wording of the template;
  * section 2 against the question-history lines in README.md (Q0 to Final);
  * section 5 against the table in checks/checks.md (rows must be copied unchanged);
  * section 8 against the "Requested treatment" answer in CONTRIBUTIONS.md;
  * figures: links that resolve, how many, PDFs linked from Markdown (not shown by viewers);
  * placeholders left ("...", TODO) and reference-like lines with no DOI or arXiv number;
  * length: words per section and in total for note.md (two pages is about 1,000 words of text plus
    one figure, appendix excluded); for note.tex it compiles in a temporary folder and counts pages.
Read-only for the repository: it writes nothing there.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

HEADINGS = ["1. Title, team ID, members", "2. Question history", "3. Approach and methods",
            "4. Main result", "5. Checks table", "6. How AI was used", "7. What would come next",
            "8. Requested treatment in the joint paper", "Appendix: AI log"]
HISTORY_RE = re.compile(r"^\s*[-*]\s+((?:Q\d|Final)[^:]*):\s*(.*?)\s*$", re.M)
DOI_RE = re.compile(r"(doi[:.]|10\.\d{4,9}/|arxiv[: ]\s*\d{4}\.\d{4,5}|arxiv\.org/abs/)", re.I)
REFLIKE_RE = re.compile(r"(Phys\. ?Rev|Nature|Science|J\. ?[A-Z]|et al\.|Rev\. ?Mod|PRL|PRB|npj|Nat\. )")


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def nocomments(text):
    return re.sub(r"<!--.*?-->", "", text, flags=re.S)


def table_rows(text):
    rows = [l.strip() for l in nocomments(text).splitlines() if l.strip().startswith("|")]
    rows = [r for r in rows if not re.fullmatch(r"\|[\s:|-]+\|", r)]
    norm = [re.sub(r"\s*\|\s*", "|", r) for r in rows]
    return norm[1:] if norm and "result" in norm[0].lower() else norm


def tex_table_rows(text):
    """Rows of the first tabular between \\midrule and \\bottomrule, as '|a|b|...|' strings."""
    m = re.search(r"\\midrule(.*?)\\bottomrule", re.sub(r"(?<!\\)%.*", "", text), re.S)
    if not m:
        return []
    rows = []
    for r in m.group(1).split("\\\\"):
        cells = [c.strip() for c in r.split("&")]
        if any(cells):
            rows.append("|" + "|".join(cells) + "|")
    return rows


def md_sections(text):
    """Split note.md into {heading: body} for '## ' headings, keeping order."""
    parts = re.split(r"^##\s+(.+?)\s*$", text, flags=re.M)
    order, body = [], {}
    for i in range(1, len(parts), 2):
        order.append(parts[i])
        body[parts[i]] = parts[i + 1]
    return order, body


def words(text):
    text = nocomments(text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"^\s*\|[\s:|-]+\|\s*$", "", text, flags=re.M)
    text = re.sub(r"[|#*_`>]", " ", text)
    return len(text.split())


def report(label, ok, detail=""):
    print(f"[{'ok' if ok else '!!'}] {label}" + (f": {detail}" if detail else ""))
    return ok


def check_history(sec2, repo):
    readme = read(os.path.join(repo, "README.md")) or ""
    want = HISTORY_RE.findall(nocomments(readme))
    got = HISTORY_RE.findall(nocomments(sec2))
    if not want:
        return report("section 2 against README.md", False, "no question-history lines found in README.md")
    w = {k.split(" (")[0]: v for k, v in want}
    g = {k.split(" (")[0]: v for k, v in got}
    diff = [k for k in w if g.get(k) != w[k]]
    empty = [k for k, v in w.items() if v.strip() in ("...", "")]
    ok = report("section 2 against README.md", not diff,
                "matches" if not diff else "differs for " + ", ".join(diff))
    if empty:
        report("question-history lines the team still has to fill", False, ", ".join(empty))
    return ok


def check_checks(sec5, repo, tex=False):
    src = read(os.path.join(repo, "checks", "checks.md"))
    if src is None:
        return report("section 5 against checks/checks.md", False, "checks/checks.md not found")
    want, got = table_rows(src), (tex_table_rows(sec5) if tex else table_rows(sec5))
    if not want:
        report("checks/checks.md", False, "the table has no rows yet (leave section 5 empty; do not invent rows)")
    ok = report("section 5 against checks/checks.md", want == got,
                f"{len(got)} rows, copied unchanged" if want == got else
                f"note has {len(got)} rows, checks.md has {len(want)}; they must be identical")
    return ok


def check_treatment(sec8, repo):
    contrib = read(os.path.join(repo, "CONTRIBUTIONS.md")) or ""
    m = re.search(r"Requested treatment[^:\n]*:\s*(.*)", nocomments(contrib))
    answer = m.group(1).strip() if m else ""
    body = nocomments(sec8).strip()
    if answer in ("", "..."):
        return report("section 8", False, "CONTRIBUTIONS.md has no answer yet; the team decides")
    return report("section 8 against CONTRIBUTIONS.md", answer.lower() in body.lower(),
                  "matches" if answer.lower() in body.lower() else f"CONTRIBUTIONS.md says '{answer}'")


def check_common(text, base):
    figs = re.findall(r"!\[[^\]]*\]\(([^)\s]+)", text) + re.findall(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", text)
    bad = [f for f in figs if not f.startswith("http") and not os.path.exists(os.path.join(base, f))
           and not any(os.path.exists(os.path.join(base, "..", "figures", f + e)) for e in ("", ".pdf", ".png"))]
    report("figures", len(figs) >= 1 and not bad,
           f"{len(figs)} linked" + (f"; missing: {', '.join(bad)}" if bad else ""))
    if len(figs) > 1:
        report("one figure", False, f"{len(figs)} figures; the template asks for one")
    if any(f.lower().endswith(".pdf") for f in re.findall(r"!\[[^\]]*\]\(([^)\s]+)", text)):
        report("figure format", False, "a PDF linked from Markdown is not shown by viewers; link the PNG")
    clean = nocomments(text)
    ph = len(re.findall(r"(?<![.\w])\.\.\.(?![.\w])", clean)) + len(re.findall(r"\bTODO\b", clean))
    report("placeholders", ph == 0, f"{ph} left ('...' or TODO)" if ph else "none")
    refs = [l.strip() for l in clean.splitlines() if REFLIKE_RE.search(l) and not DOI_RE.search(l)]
    report("references with DOI or arXiv", not refs,
           "all identified" if not refs else f"{len(refs)} line(s) without one, e.g. '{refs[0][:90]}'")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    note = os.path.abspath(sys.argv[1])
    repo = os.path.abspath(arg("--repo", "."))
    text = read(note)
    if text is None:
        print(f"cannot read {note}")
        sys.exit(1)
    base = os.path.dirname(note)

    if note.endswith(".md"):
        order, body = md_sections(text)
        want = [h for h in HEADINGS]
        present = [h for h in want if h in order]
        in_order = [h for h in order if h in want] == present
        missing = [h for h in want if h not in order]
        report("eight headings and the appendix", not missing and in_order,
               "present, in order" if not missing and in_order else
               ("missing: " + "; ".join(missing) if missing else "out of order"))
        check_history(body.get(HEADINGS[1], ""), repo)
        check_checks(body.get(HEADINGS[4], ""), repo)
        check_treatment(body.get(HEADINGS[7], ""), repo)
        check_common(text, base)
        budget = int(arg("--words", "1000"))
        main_text = text.split("## " + HEADINGS[-1])[0]
        per = {h: words(body.get(h, "")) for h in HEADINGS[:-1]}
        title = words(re.split(r"^##\s", main_text, flags=re.M)[0])
        total = title + sum(per.values())
        print("words per section: " + ", ".join(f"{h.split('.')[0]}: {n}" for h, n in per.items()))
        report("length", total <= budget * 1.1,
               f"{total} words of text (budget about {budget} for two pages with one figure)")
    else:
        heads = re.findall(r"\\section\*?\{([^}]*)\}", text)
        missing = [h for h in HEADINGS if h not in heads]
        report("eight headings and the appendix", not missing,
               "present" if not missing else "missing: " + "; ".join(missing))
        sec = lambda h: (text.split("{" + h + "}", 1) + [""])[1].split("\\section", 1)[0]
        check_history(sec(HEADINGS[1]).replace("\\item", "-"), repo)
        check_checks(sec(HEADINGS[4]), repo, tex=True)
        check_treatment(sec(HEADINGS[7]), repo)
        check_common(text, base)
        target = int(arg("--pages", "2"))
        tmp = tempfile.mkdtemp()
        try:
            r = subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error",
                                f"-output-directory={tmp}", os.path.basename(note)],
                               cwd=base, capture_output=True, text=True)
            pdf = os.path.join(tmp, os.path.splitext(os.path.basename(note))[0] + ".pdf")
            if r.returncode != 0 or not os.path.exists(pdf):
                report("compile", False, "; ".join(l for l in r.stdout.splitlines() if l.startswith("!"))[:300])
            else:
                info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
                pages = int(re.search(r"Pages:\s+(\d+)", info).group(1))
                body_txt = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True).stdout
                body_txt = body_txt.split("Appendix: AI log")[0]
                report("length", pages <= target + 1,
                       f"{pages} pages including the appendix heading; {len(body_txt.split())} words before the appendix (target {target} pages)")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
