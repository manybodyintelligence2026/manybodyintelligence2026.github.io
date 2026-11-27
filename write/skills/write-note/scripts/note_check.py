#!/usr/bin/env python3
"""Check a hackathon team note against the rules of the day, and build its PDF.

Usage:  python3 note_check.py note/note.tex [--build] [--sheet out.png] [--pages 2] [--repo .]
        python3 note_check.py note/note.md  [--words 1000] [--repo .]

Run it from the repository root (or give --repo). It reports:
  * the eight headings (run-in heads such as \\textit{4. Main result.}--- in note.tex, '## ' headings
    in note.md): present, in order, with the template's wording;
  * section 2 against the question-history lines in README.md (Q0 to Final);
  * the checks table against checks/checks.md (rows copied unchanged);
  * section 8 against the "Requested treatment" answer in CONTRIBUTIONS.md;
  * figures that resolve, placeholders left ('...', TODO, <<...>>), references without DOI or arXiv;
  * for note.tex: compiles twice with pdflatex in a temporary folder and reports pages against the
    target, how full the last page is, the abstract length, errors, overfull boxes, undefined
    references and Unicode characters LaTeX cannot typeset. --build copies the PDF to note/note.pdf
    (no build files are left in note/); --sheet writes the pages side by side as a PNG to look at;
  * for note.md: words per section and in total (two pages is about 1,000 words plus one figure).
Comparisons of copied text ignore LaTeX markup, spacing and how symbols are written (t′ vs $t'$).
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata

HEADINGS = ["1. Title, team ID, members", "2. Question history", "3. Approach and methods",
            "4. Main result", "5. Checks table", "6. How AI was used", "7. What would come next",
            "8. Requested treatment in the joint paper", "Appendix: AI log"]
HISTORY_RE = re.compile(r"^\s*[-*]\s+((?:Q\d|Final)[^:]*):\s*(.*?)\s*$", re.M)
DOI_RE = re.compile(r"(doi[:.]|10\.\d{4,9}/|arxiv[: ]\s*(\d{4}\.\d{4,5}|[a-z-]+/\d{7})|arxiv\.org/abs/)", re.I)
REFLIKE_RE = re.compile(r"(Phys\. ?Rev|Nature|Science|J\. ?[A-Z]|et al\.|Rev\. ?Mod|PRL|PRB|npj|Nat\. )")


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def nocomments(text, tex=False):
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return re.sub(r"(?<!\\)%.*", "", text) if tex else text


def norm(s):
    """Letters and digits only, after LaTeX markup is dropped and Unicode is folded (₁ -> 1)."""
    s = re.sub(r"\\(textbf|textit|emph|texttt|mathrm|text)\b", "", s)
    s = re.sub(r"\\[A-Za-z]+", " ", s)
    s = unicodedata.normalize("NFKC", s)
    return "".join(ch for ch in s.lower() if ch.isalnum())


def report(label, ok, detail=""):
    print(f"[{'ok' if ok else '!!'}] {label}" + (f": {detail}" if detail else ""))
    return ok


def md_table_rows(text):
    rows = [l.strip() for l in nocomments(text).splitlines() if l.strip().startswith("|")]
    rows = [r for r in rows if not re.fullmatch(r"\|[\s:|-]+\|", r)]
    cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows]
    return [c for c in cells if c and c[0].lower() != "result" and any(c)]


def tabular_bodies(text):
    """Bodies of every tabular, skipping the column spec with its nested braces (p{3cm})."""
    i = 0
    while True:
        i = text.find("\\begin{tabular}", i)
        if i < 0:
            return
        j = text.find("{", i + len("\\begin{tabular}"))
        depth, k = 0, j
        while k < len(text):
            depth += {"{": 1, "}": -1}.get(text[k], 0)
            k += 1
            if depth == 0:
                break
        end = text.find("\\end{tabular}", k)
        if end < 0:
            return
        yield text[k:end]
        i = end


def tex_table_rows(text):
    for raw in tabular_bodies(nocomments(text, True)):
        body = re.sub(r"\\(hline|toprule|midrule|bottomrule|colrule)\b", "", raw)
        rows = [[c.strip() for c in r.split("&")] for r in body.split("\\\\")]
        rows = [r for r in rows if any(r)]
        if rows and norm(rows[0][0]) == "result":
            return rows[1:]
    return None


def history_from_readme(repo):
    return HISTORY_RE.findall(nocomments(read(os.path.join(repo, "README.md")) or ""))


def check_history(sec2, repo):
    want = history_from_readme(repo)
    got = HISTORY_RE.findall(sec2)
    if not want:
        return report("section 2 against README.md", False, "no question-history lines found in README.md")
    g = {norm(k.split(" (")[0]): v for k, v in got}
    diff = [k.split(" (")[0] for k, v in want if norm(g.get(norm(k.split(" (")[0]), "")) != norm(v)]
    report("section 2 against README.md", not diff, "matches" if not diff else "differs for " + ", ".join(diff))
    empty = [k.split(" (")[0] for k, v in want if v.strip() in ("...", "")]
    if empty:
        report("question-history lines the team still has to fill", False, ", ".join(empty))


def check_checks(got_rows, repo):
    src = read(os.path.join(repo, "checks", "checks.md"))
    if src is None:
        return report("checks table against checks/checks.md", False, "checks/checks.md not found")
    want = md_table_rows(src)
    if got_rows is None:
        return report("checks table", False, "no table with the header 'Result & Check & ...' found")
    if not want:
        report("checks/checks.md", False, "the table has no rows yet (leave it empty; do not invent rows)")
    same = [list(map(norm, r)) for r in want] == [list(map(norm, r)) for r in got_rows]
    report("checks table against checks/checks.md", same,
           f"{len(got_rows)} rows, copied unchanged" if same else
           f"note has {len(got_rows)} rows, checks.md has {len(want)}; they must be identical")


def check_treatment(sec8, repo):
    m = re.search(r"Requested treatment[^:\n]*:\s*(.*)", nocomments(read(os.path.join(repo, "CONTRIBUTIONS.md")) or ""))
    answer = m.group(1).strip() if m else ""
    if answer in ("", "..."):
        return report("section 8", False, "CONTRIBUTIONS.md has no answer yet; the team decides")
    ok = norm(answer) in norm(sec8)
    report("section 8 against CONTRIBUTIONS.md", ok, "matches" if ok else f"CONTRIBUTIONS.md says '{answer}'")


def check_common(text, base, tex):
    clean = nocomments(text, tex)
    figs = re.findall(r"!\[[^\]]*\]\(([^)\s]+)", clean) + re.findall(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", clean)
    def found(f):
        cands = [os.path.join(base, f), os.path.join(base, "..", "figures", f)]
        return any(os.path.exists(c) or any(os.path.exists(c + e) for e in (".pdf", ".png", ".jpg")) for c in cands)
    bad = [f for f in figs if not f.startswith("http") and not found(f)]
    report("figures", len(figs) >= 1 and not bad, f"{len(figs)} linked" + (f"; missing: {', '.join(bad)}" if bad else ""))
    if len(figs) > 1:
        report("one figure", False, f"{len(figs)} figures; the template asks for one")
    rest = re.sub(r"^.*\b(Q\d|Final|Done today means|Expected at the end of the day|Confidence)\b[^:\n]*:.*$",
                  "", clean, flags=re.M)
    ph = len(re.findall(r"(?<![.\w])\.\.\.(?![.\w])", rest)) + len(re.findall(r"\bTODO\b|<<", rest))
    report("placeholders", ph == 0, f"{ph} left ('...', TODO or <<...>>) outside the question history" if ph else "none")
    if tex:
        items = re.findall(r"\\bibitem(?:\[[^\]]*\])?\{[^}]*\}(.*?)(?=\\bibitem|\\end\{thebibliography\})", clean, re.S)
        refs = [" ".join(i.split()) for i in items if not DOI_RE.search(i)]
    else:
        refs = [l.strip() for l in clean.splitlines() if REFLIKE_RE.search(l) and not DOI_RE.search(l)]
    report("references with DOI or arXiv", not refs,
           "all identified" if not refs else f"{len(refs)} without one, e.g. '{refs[0][:90]}'")


def tex_sections(text):
    clean = nocomments(text, True)
    marks = []
    for h in HEADINGS:
        m = re.search(r"\\(?:textit|section\*?)\{\s*" + re.escape(h) + r"\.?\s*\}", clean)
        marks.append((m.start() if m else None, h))
    found = [(p, h) for p, h in marks if p is not None]
    order_ok = [h for p, h in sorted(found)] == [h for p, h in found]
    body = {}
    for i, (p, h) in enumerate(sorted(found)):
        end = sorted(found)[i + 1][0] if i + 1 < len(found) else len(clean)
        body[h] = clean[p:end]
    return [h for p, h in marks if p is None], order_ok, body


def build_tex(note, target, do_build, sheet):
    base, name = os.path.split(note)
    stem = os.path.splitext(name)[0]
    if not shutil.which("pdflatex"):
        return report("compile", False, "pdflatex is not installed: compile on Overleaf (upload note.tex and the figure)")
    cls = subprocess.run(["kpsewhich", "revtex4-2.cls"], capture_output=True, text=True).stdout.strip() \
        if shutil.which("kpsewhich") else "?"
    if not cls and "revtex4-2" in (read(note) or ""):
        return report("compile", False, "revtex4-2 is not installed: compile on Overleaf (upload note.tex and the figure)")
    tmp = tempfile.mkdtemp()
    try:
        cmd = ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", f"-output-directory={tmp}", name]
        r = subprocess.run(cmd, cwd=base, capture_output=True, text=True)
        r = subprocess.run(cmd, cwd=base, capture_output=True, text=True)
        log = r.stdout
        pdf = os.path.join(tmp, stem + ".pdf")
        if r.returncode != 0 or not os.path.exists(pdf):
            errs = [l for l in log.splitlines() if l.startswith("!") or "not set up for use with LaTeX" in l]
            return report("compile", False, "; ".join(errs)[:400] or "pdflatex failed")
        info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
        pages = int(re.search(r"Pages:\s+(\d+)", info).group(1))
        def lines(p):
            t = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), "-layout", pdf, "-"], capture_output=True, text=True).stdout
            return sum(1 for l in t.splitlines() if l.strip())
        full = max(lines(p) for p in range(1, pages + 1))
        report("pages", pages <= target,
               f"{pages} (target {target}); last page about {100 * lines(pages) / max(full, 1):.0f} % full")
        src = nocomments(read(note) or "", True)
        m = re.search(r"\\begin\{abstract\}(.*?)\\end\{abstract\}", src, re.S)
        if m:
            a = " ".join(m.group(1).split())
            report("abstract", len(a) <= 600, f"about {len(a)} characters (limit 600)")
        issues = sorted({l.strip() for l in log.splitlines()
                         if "Overfull" in l or re.search(r"(Citation|Reference) .* undefined", l)})
        report("LaTeX warnings", not issues, "none" if not issues else f"{len(issues)}, e.g. {issues[0][:100]}")
        if do_build:
            shutil.copy(pdf, os.path.join(base, stem + ".pdf"))
            print(f"built: {os.path.join(base, stem + '.pdf')}")
        if sheet:
            pre = os.path.join(tmp, "page")
            subprocess.run(["pdftoppm", "-r", "80", "-png", pdf, pre], capture_output=True)
            pngs = sorted(glob.glob(pre + "-*.png"))
            try:
                from PIL import Image
                ims = [Image.open(p) for p in pngs]
                w, h = ims[0].size
                c = Image.new("RGB", (w * len(ims), h), "white")
                for i, im in enumerate(ims):
                    c.paste(im, (i * w, 0))
                c.save(sheet)
            except ImportError:
                for p in pngs:
                    shutil.copy(p, os.path.splitext(sheet)[0] + "-" + os.path.basename(p).split("-")[-1])
            print(f"pages to look at: {sheet}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


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
    tex = note.endswith(".tex")
    if tex:
        missing, order_ok, body = tex_sections(text)
        report("eight headings and the appendix", not missing and order_ok,
               "present, in order" if not missing and order_ok else
               ("missing: " + "; ".join(missing) if missing else "out of order"))
        check_history(body.get(HEADINGS[1], "").replace("\\item", "\n-"), repo)
        check_checks(tex_table_rows(text), repo)
        check_treatment(body.get(HEADINGS[7], ""), repo)
        check_common(text, base, True)
        build_tex(note, int(arg("--pages", "2")), "--build" in sys.argv, arg("--sheet", None))
    else:
        parts = re.split(r"^##\s+(.+?)\s*$", text, flags=re.M)
        order = [parts[i] for i in range(1, len(parts), 2)]
        body = {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}
        missing = [h for h in HEADINGS if h not in order]
        order_ok = [h for h in order if h in HEADINGS] == [h for h in HEADINGS if h in order]
        report("eight headings and the appendix", not missing and order_ok,
               "present, in order" if not missing and order_ok else
               ("missing: " + "; ".join(missing) if missing else "out of order"))
        check_history(body.get(HEADINGS[1], ""), repo)
        check_checks(md_table_rows(body.get(HEADINGS[4], "")), repo)
        check_treatment(body.get(HEADINGS[7], ""), repo)
        check_common(text, base, False)
        def words(t):
            t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", nocomments(t))
            t = re.sub(r"^\s*\|[\s:|-]+\|\s*$", "", t, flags=re.M)
            return len(re.sub(r"[|#*_`>]", " ", t).split())
        budget = int(arg("--words", "1000"))
        per = {h: words(body.get(h, "")) for h in HEADINGS[:-1]}
        total = words(re.split(r"^##\s", text, flags=re.M)[0]) + sum(per.values())
        print("words per section: " + ", ".join(f"{h.split('.')[0]}: {n}" for h, n in per.items()))
        report("length", total <= budget * 1.1, f"{total} words of text (budget about {budget} for two pages with one figure)")


if __name__ == "__main__":
    main()
