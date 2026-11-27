<!-- Example for /check-results, made up for illustration: the team (T00: Alex, Sam, Kim), its files
     and its claims are fictional. The numbers in R1 and R2 are real: they come from
     ../../write-note/examples/fig_phase.example.py (Haldane model, 1.4 s on a laptop). -->

# Results for the note

Checked at the start of Write. Scripts re-run on copies; nothing in the repository was changed.

## R1. Chern-number phase diagram of the Haldane model, matching the analytic boundary
- Value: C = −sgn(sin φ) for |M| < 3√3 t₂|sin φ|, C = 0 outside (t₁ = 1, t₂ = 0.1). On the
  41 × 41 grid (M step 0.3 t₂, 24 × 24 k-mesh) 1 of 1,681 points differs from the analytic diagram,
  next to the boundary.
- Source: `code/fig_phase.py` → `figures/phase.pdf`, by Alex
- Checked: re-run reproduced every number; checks.md rows "Boundary against Haldane's analytic
  result" (literature, person) and "Same diagram on a 12 × 12 mesh" (convergence, second-AI)
- Problems: none

## R2. The gap closes at one valley at each phase boundary
- Value: at M = 3√3 t₂, φ = π/2 the gap is 0.000 at one valley and 2.08 t₁ at the other
- Source: `code/fig_phase.py` (printed), by Alex
- Checked: re-run reproduced it
- Problems: **Error (in the text).** `README.md` ("Expected") says the gap closes "at K and K′". It
  closes at one valley only, which is why C changes by 1 across each boundary. The numbers are
  right; the sentence is not.

## R3. Third-neighbour hopping shifts the boundary
- Value: "the boundary moves by 0.4 t₂ at t₃ = 0.05" (Sam's log entry P02-E04)
- Source: `sam/code/t3_scan.py`, by Sam; no output file in the repository
- Checked: not checked (the scan takes about 40 minutes; a reduced 11 × 11 run did not finish in
  the time available)
- Problems: **Inconsistency.** The number in the log has no output behind it; the script's default
  grid (`n_t3 = 5`) does not include t₃ = 0.05.

## Not checked
- R3, as above.
- The literature claim "no one has mapped t₃ for the Haldane model" (Kim's literature check):
  outside what files can show.

## Decisions for the team
- The sign of C depends on the orientation of the t₂ phase and on which band is filled: state the
  convention in the note (code: next-nearest-neighbour vectors anticlockwise, lower band).
- Whether R3 goes into the note, and if so as unchecked.

## Proposed rows for checks/checks.md
| Result | Check | Method | Done by | Outcome | What changed |
|-|-|-|-|-|-|
| Gap closing at the boundary | Gap at both valleys at M = 3√3 t₂, φ = π/2 | limiting-case | second-AI | holds | README wording to correct: one valley, not both |
