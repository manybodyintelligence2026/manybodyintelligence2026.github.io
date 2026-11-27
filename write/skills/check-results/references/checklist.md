# Verification checklist

What to check, and how. Work through the sections in this order: the reruns are slow, so they start
first and run while you do the reading-based checks.

Contents: 1 Reruns · 2 Numbers · 3 Citations · 4 Derivations · 5 Conventions between tracks ·
6 Discretisation and gauge · 7 Testing a suspicion · 8 Classifying findings · 9 What not to report

---

## 1. Reruns

- Copy every script (and the modules it imports, often in the same folder) into a scratch directory
  outside the repository and run it there. Scripts write `.npz`, `.pdf` and `.png` files with fixed
  names; a rerun in place silently overwrites the team's data and figures.
- Start all runs at once, in the background, one thread each
  (`OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 nohup python3 x.py > log_x.txt 2>&1 &`),
  using at most the number of cores.
- The Write stage is short. If a full run would take more than a few minutes, run a reduced grid: it
  confirms the trend now. Say which numbers come from the reduced run.
- Check the environment first: which interpreter has numpy, scipy and matplotlib. If plotting fails
  for lack of matplotlib, the numbers can still be checked; say that the figure was not regenerated.
- Run the script's own validation mode if it has one, and note what it validates. A check that
  makes the same assumption as the method validates the numerics, not the assumption.

## 2. Numbers

- Compare every number the team quotes with the rerun output: in `README.md`, `plan.md`, log
  entries, figure labels and captions, slides and any note draft.
- Recompute every number given in prose: ratios, percentages, "at most X", and above all **ranges**
  ("1.6–1.9×"). Prose ranges are where most slips are: they were computed on a subset, an earlier
  grid or a different estimator. Compute the range over the domain the text states.
- Check that parameters in the text match the code: broadening, grid sizes, cutoffs, which branch.
  Text written before the last code change drifts.
- Recompute derived constants by hand: prefactors, unit conversions, crossings and thresholds.
- Find the line of output behind every validation statement ("matches X to 0.3 %").
- A number with no script behind it cannot be reproduced from the files. Say so; do not call it
  wrong.

## 3. Citations

- Every "eq. (n)", "Fig. n" and "Table n" of a cited paper: open the PDF and confirm it. Use
  `pdftotext -layout`, then read around the hit.
- `pdftotext` drops or garbles ±, ∓, primes, overbars and Greek letters. When a sign or symbol
  matters, render the page and look at it: `pdftoppm -f P -l P -r 200 -png paper.pdf out`.
- Check numbers taken from a paper (couplings, elastic constants, exchange, frequencies) and the
  conditions they hold under (temperature, film or bulk, which cell).
- Check how the team describes the paper, and credit prior results: reproducing a published formula
  is a benchmark, not a finding.
- Check journal, volume and page; companion papers often sit on consecutive pages of one issue.
- Every reference needs a DOI or an arXiv number. If the paper is not in `our-idea/papers/`, look it
  up; if it cannot be identified, say so.
- Normalisation conventions differ between papers. Before calling a factor ½ wrong, find the
  definition the team follows.

## 4. Derivations

For each key equation, re-derive it from the line before, not from memory:

- **Order of limits.** q → 0 at fixed ω ≠ 0 and ω → 0 first give different results for intraband
  terms. A "q → 0" formula that keeps an intraband δ-function at finite ω is suspect.
- **Limits and special cases.** Check that the formula reduces to the known result, prefactors
  included.
- **Sum rules and identities.** If the team claims "A + B + C = 0", verify it algebraically, then
  check that the code has all the terms with the signs the identity needs.
- **Signs and factors of 2.** Spin and valley degeneracy, both orderings of a pair sum, ½ in
  definitions, FWHM against half width.
- **Units.** The dimensions of every displayed formula, and the unit labels printed next to numbers.

## 5. Conventions between tracks

Each person, and each person's AI session, may have chosen conventions on their own. Where two
tracks meet (one person's parameters feed another's code, a check compares two codes):

- Write down both conventions: units, sign and Fourier conventions, basis order, which cell
  (primitive or conventional), where on-site terms sit. Compare with the Conventions section of
  `README.md`.
- For Hamiltonians, compare through **gauge-invariant loop products** (products of hoppings around
  closed loops). A sign that changes a loop product is physical; one that does not is convention.
- If a source contradicts itself, do not pick a side: state both readings, rerun with the other
  choice and report what changes. A value that crosses a physical threshold turns a "convention
  detail" into a decision for the team.

## 6. Discretisation and gauge

- In a non-periodic Bloch gauge U_{k+G} ≠ U_k: a sum over a zone of a form factor then depends on
  which zone. Test it by summing over two different cells.
- Shifted k-grids avoid Dirac points; patch-based sums need their boundary outside the relevant
  energy window.
- Features smaller than the broadening are not resolved: "a gap of 6 meV" under 10 meV broadening is
  a tail.

## 7. Testing a suspicion before reporting it

Every suspected error gets a small numerical test before it goes into the report: a coarse grid, a
toy case, an analytic special case. Often only part of the suspicion survives, or the numbers turn
out to be fine and only the stated reason is wrong. Report what the test showed.

## 8. Classifying findings

| Class | Meaning | Example |
|---|---|---|
| **Error** | The physics or mathematics is wrong | a factor 2 missing from the spin sum in the code |
| **Justification** | The numbers are right but the stated reason is not | "converged" said of a single grid size |
| **Inconsistency** | Text against script, two tracks or two files disagree | the README says 24 × 24 k-points, the script uses 12 × 12 |
| **Attribution** | Wrong equation, page or paper; an uncredited prior result | the "new" boundary is eq. (3) of the cited paper |
| **Decision** | Needs the team: an ambiguous source, a convention choice | two published values of the exchange stiffness differ by 2 |
| **Minor** | Ranges slightly off, wording, labels | "1.6–1.9×" should be "1.6–2.1×" |

## 9. What not to report

- Do not restate the results. List what was checked and found correct in one line.
- Do not report style preferences as errors.
- Do not "correct" a transcription of a whiteboard or notebook photo; add a check beside it.
