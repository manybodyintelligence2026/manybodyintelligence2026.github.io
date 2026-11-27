<!-- Example for /write-note, made up for illustration: the team and its files are fictional; the
     numbers are real and come from fig_phase.example.py in this folder. -->

# Provenance of the numbers in note.tex

Every number and claim in the note, where it comes from, and how it was checked. "Re-run" means the
script was run again on a copy during Write and gave the same value.

| Note statement | Value | Source | Check |
|-|-|-|-|
| model parameters | t₁ = 1, t₂ = 0.1 | `code/fig_phase.py` (constants) | read from the code |
| grid | 41 φ × 41 M, M step 0.3 t₂, 24 × 24 k-mesh | `code/fig_phase.py` output | re-run |
| phase diagram | C = −sgn(sin φ) inside \|M\| < 3√3 t₂\|sin φ\|, 0 outside | `code/fig_phase.py` output | re-run; checks table row 1 (person) |
| points off the analytic diagram | 1 of 1,681, next to the boundary | `code/fig_phase.py` output | re-run |
| analytic boundary | M = ±3√3 t₂ sin φ | Haldane, doi:10.1103/PhysRevLett.61.2015 | read from the paper (person) |
| mesh convergence | 12 × 12 and 24 × 24 agree at 99.9 % of points | `code/fig_phase.py` output | re-run; checks table row 2 (second-AI) |
| gap at the boundary | below 10⁻¹⁵ t₁ at one valley, 2.08 t₁ at the other (M = 3√3 t₂, φ = π/2) | `code/fig_phase.py` output | re-run; checks table row 4 (second-AI) |
| sign convention | phase +φ anticlockwise | `code/fig_phase.py`, README Conventions | checks table row 3 (person) |
| run time | about 1.4 s on a laptop | timed run | re-run |
| log counts | 11 entries, three people | `log/P01.md`–`log/P03.md` | counted |
| t₃ scan time | about 40 minutes for one scan | Sam's log entry | not checked |
| coarser t₃ grid | about ten minutes for 21 × 21 | estimate from the 41 × 41 timing at fixed t₃ cost | not checked |

Not verified: the t₃ timings (log entry and estimate only).
