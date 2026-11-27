# From a day's work to a two-page note: writing guide

Contents: 1 The repository is not a note · 2 The claim map · 3 Budget · 4 The eight sections ·
5 Prose · 6 Honesty · 7 Credit and citations · 8 The figure · 9 Fitting two pages · 10 Final checks

## 1. The repository is not a note

The repository records a day in the order it happened: personal folders, attempts, log entries, a
fix that a later script depends on. The note makes one argument, in the order a reader needs it.
Most of the record stays out: the dead ends, the debugging, the order things were found. The note
uses their conclusions ("the boundary matches the analytic result to one grid step") with one
number that makes each one concrete. The details stay in the repository, which the joint paper's
authors can open.

Logs and folders also have a voice that does not belong in a note: compressed lines, private
labels ("Kim's script", "the v2 run"), lists of numbers, results without interpretation. A draft
written from them keeps that voice unless it is rewritten on purpose (§5).

## 2. The claim map (before writing a sentence)

1. **Main result**: one sentence a referee could disagree with. Example: "On a laptop, the
   Chern-number phase diagram of the Haldane model is reproduced within one grid step of the
   analytic boundary, which makes it a usable benchmark for adding third-neighbour hopping."
2. **Support** (two or three points), each with its source script or paper, one number, and
   whether it is new or a reproduction (credit it).
3. **Checked and not checked**: match each claim to its rows in `checks/checks.md`.
4. **What stays out**: list it, so leaving it out is a decision.

The main result decides the title, the figure and the first sentence of section 4. A result that
does not support it goes to "what stays out", however much work it was.

## 3. Budget

Two pages of a revtex4-2 letter (`reprint,aps,prl`, two columns) hold the title block and abstract,
one column-width figure, the full-width checks table, a few references and about 1,100–1,300 words
of body text. The page count from `scripts/note_check.py --build` decides, not the word count. A
working split:

| Part | Words |
|-|-|
| Abstract | 60–90 (at most 600 characters) |
| 1. Title, team ID, members | one line |
| 2. Question history | copied |
| 3. Approach and methods | 150–250 |
| 4. Main result | 200–300, plus the figure and a two- or three-line caption |
| 5. Checks table | one sentence, plus Table I copied |
| 6. How AI was used | 80–150 (three to five bullets) |
| 7. What would come next | 50–100 |
| 8. Requested treatment | one line, copied |

The copied parts take real space: the question history is about a third of a column, and a checks
table of four to six rows about a quarter of a page.

## 4. The eight sections

In the letter they are run-in heads (`\textit{3. Approach and methods.}---`), with the template's
wording, after the title block and the abstract.

1. **Title, team ID, members.** The title states the result ("The Haldane Phase Diagram as a Laptop
   Benchmark, Boundary within One Grid Step"), not the topic ("On the Haldane Model"). One line, in
   title case. The run-in section repeats only the team ID and the names.
2. **Question history.** The README's lines, copied unchanged: they are the record of how the
   question changed during the day, and the organisers compare them across teams. Lines that are
   still "..." stay that way until the team fills them.
3. **Approach and methods.** Open with the model in a full sentence. Then the method and the code
   (existing libraries named), the parameters with their sources (DOI or arXiv), the conventions in
   one line (units, sign of the hopping phase, basis), and the shortcuts taken ("a 24 × 24 k-mesh,
   checked against 12 × 12").
4. **Main result.** Open with the result in one sentence, then the figure reference, then one or two
   numbers that make it concrete, then what the result means physically. End with what was checked
   (naming the table rows) and what was not.
5. **Checks table.** Copied unchanged from `checks/checks.md`. A failed check stays in the table;
   "fails, then holds" with what changed is one of the most useful rows in the joint paper.
6. **How AI was used.** Three to five bullets, from the log entries only:
   - what the AI did (by task type: code, derivation, literature, figures);
   - what it got wrong and who caught it;
   - what people did that the AI did not;
   - counts where they help ("14 entries from three people; 3 outputs wrong, all caught by a
     person"). If the logs are thin, say so rather than filling the gap.
7. **What would come next.** The Stretch goal or the fallback not taken, the open question, and what
   a longer project would do first. Concrete, not a wish list.
8. **Requested treatment.** The team's answer from `CONTRIBUTIONS.md`.

## 5. Prose: from log style to paper style

| Log habit | Paper style |
|-|-|
| Colon chains: "Boundary: matches; mesh: fine; sign: flipped" | Separate sentences with connectives: *because, whereas, therefore, by contrast* |
| Private labels: "Kim's script", "the v2 run", "P02's numbers" | Say what it is: "an independent code", "the 24 × 24 calculation" |
| A result with no interpretation | One sentence of physics after each key equation or number |
| Lists of numbers: "(0.3, 0.6, 0.9 t₂ at three φ)" | One number per claim; a range when the trend is the point |
| A paragraph that starts mid-argument | The first sentence says what the paragraph establishes |
| The same punchline in three places | Once where it is shown, once in "what next" if needed |

Also:

- **Tense and person**: present tense for results and physics, past tense for what others did,
  "we" for the team.
- **Symbols**: one meaning per symbol, defined at first use.
- **No hype**: no "novel", "first ever", "remarkably". State what is new and let the reader judge.

A before/after from the example note (`examples/note.example.tex`):

> *Log style:* phase diagram done, 41x41, matches 3√3 sin φ except 1 pt; 12 vs 24 mesh ok; sign
> of C flipped vs README → convention.
>
> *Paper style:* The computed Chern numbers reproduce Haldane's phase diagram: C = ±1 for
> |M| < 3√3 t₂|sin φ| and C = 0 outside, with one of 1,681 grid points off, next to the boundary
> [Fig. 1]. The sign of C follows from the orientation of the next-nearest-neighbour phase, which we
> take anticlockwise.

## 6. Honesty

- Separate what was checked from what was not, in section 4 and in the provenance file. "Unchecked"
  is a legitimate state at the end of a day; presenting an unchecked result as checked is not.
- A negative or partial result, clearly stated and checked, is worth as much to the joint paper as a
  positive one.
- Section 6 reports the logs as they are. The AI's mistakes go in, and so do the people's.

## 7. Credit and citations

- Read what the key prior papers say (their first page and the text around their main equations)
  before claiming anything is new; claim only the increment.
- A reproduced published result is a benchmark, credited in the sentence that uses it
  ("reproducing the boundary of Haldane, doi:10.1103/PhysRevLett.61.2015").
- Cite only what you can identify by DOI or arXiv number, taken from the PDFs in `our-idea/papers/`
  where possible. Never invent a reference; if a claim needs one you cannot find, shorten the claim.

## 8. The figure

- One figure that shows the main result, regenerated by a script in `code/` from saved data or a
  quick calculation, written to `figures/` as a PDF.
- At the width of one column: `\includegraphics[width=\columnwidth]{...}`, made at 8.6 cm (3.4 in)
  so that the fonts print at their real size. Labels at least 7 pt. A full-width `figure*` (17.8 cm)
  costs twice the space; use it only if the result needs it.
- One visual vocabulary across panels, explained once in the caption. The caption is short: what is
  plotted, then the parameters.
- The script prints every number the caption or the text quotes.

## 9. Fitting two pages

Run `scripts/note_check.py` after each round. When the note is too long, cut in this order:

1. Method details a reader can take on trust (they stay in the repository).
2. Sentences that restate the main result.
3. Validation remarks that the checks table already shows.
4. Secondary numbers and series.
5. Long captions: what is plotted once, one phrase per panel.
6. References that only decorate a statement already supported.
7. Figure height.

Never cut the copied sections (2, 5, 8), the "checked and not checked" sentence of section 4, or the
AI bullets about errors. When it is too short, add back in reverse order.

Layout mechanics that decide whether a nearly fitting letter fits:

- **Full-width elements cost double**: a title that wraps, an abstract whose last line holds one
  word, a long caption of a `table*`. Trim them first.
- **Short last lines of paragraphs** are cheap to remove: trim three to five words in that
  paragraph.
- **Place the `table*` early in the source**, before the text that ends page 1: a full-width float
  can only appear at the top of a later page, and placed too late it moves to page 3.
- **Use `[t]`** for the figure and the table; bottom placement often leaves a white gap.
- **Do not shrink fonts or margins**: the joint paper needs all notes in the same layout.
- After every cut round, re-read the rendered pages for accuracy.

## 10. Final checks

- `note_check.py --build` reports the eight run-in heads in order, sections 2, 5 and 8 matching
  their sources, figures, references, two pages, an abstract within 600 characters and no LaTeX
  warnings; and you have looked at the rendered pages.
- Every number in the note is in `note/provenance.md`, with its source and how it was checked.
- The main result is stated once, qualified exactly as far as the checks go.
- No private labels, no undefined symbols, no hype.
- The reply tells the team what they still have to supply.
