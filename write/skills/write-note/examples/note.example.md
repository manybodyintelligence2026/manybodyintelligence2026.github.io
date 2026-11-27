<!-- Example note for /write-note, made up for illustration. The team (T00: Alex, Sam, Kim), its
     question history, checks table and AI logs are fictional. The physics and the numbers are real:
     they come from fig_phase.example.py in this folder (Haldane model, 1.4 s on a laptop), and
     provenance.example.md traces each one. -->

# The Haldane phase diagram as a laptop benchmark: boundary within one grid step

## 1. Title, team ID, members

The Haldane phase diagram as a laptop benchmark: boundary within one grid step. Team T00: Alex,
Sam, Kim.

## 2. Question history

- Q0 (proposal): How does third-neighbour hopping t₃ change the Chern-number phase diagram of the Haldane model?
- Q1 (sharpened, end of Scope): Does the Haldane phase diagram survive third-neighbour hopping t₃ ≤ 0.1 t₁ at t₂ = 0.1 t₁, as a function of φ and M/t₂?
  - Done today means: the t₃ = 0 diagram reproduced and checked as a benchmark, and the boundary shift at one value of t₃.
  - Expected at the end of the day: the boundary moves outward with t₃, by less than one grid step at t₃ = 0.05 t₁.
  - Confidence (1–5): 3
- Q2 (narrowed, time + reason): At the end of First result, because one t₃ scan takes about 40 minutes: reproduce and check the t₃ = 0 diagram; the t₃ shift moves to "next".
- Final (as stated in the note): The Haldane phase diagram is reproduced on a laptop within one grid step of the analytic boundary; the shift with t₃ is not yet checked.

## 3. Approach and methods

We use the Haldane model on the honeycomb lattice: nearest-neighbour hopping t₁, next-nearest-neighbour
hopping t₂e^{±iφ} and a sublattice potential ±M [Haldane, doi:10.1103/PhysRevLett.61.2015]. The
Chern number of the lower band is computed from the lattice field strength of Fukui, Hatsugai and
Suzuki [doi:10.1143/JPSJ.74.1674] on a 24 × 24 mesh of the Brillouin zone, which avoids choosing a
smooth gauge. We fix t₁ = 1 and t₂ = 0.1 and scan 41 values of φ in [−π, π] and 41 values of M/t₂
in [−6, 6] (step 0.3). Convention: the phase +φ is taken for next-nearest-neighbour hops running
anticlockwise around a hexagon. One script, `code/fig_phase.py` (NumPy only), produces every number
below in about 1.4 s on a laptop.

## 4. Main result

The computed Chern numbers reproduce Haldane's phase diagram: C = −sgn(sin φ) for
|M| < 3√3 t₂|sin φ| and C = 0 outside, with one of the 1,681 grid points off, next to the boundary
[Fig. 1]. The boundary is where the gap closes at a Dirac point: at M = 3√3 t₂ and φ = π/2 the gap
vanishes at one valley (below 10⁻¹⁵ t₁) and stays at 2.08 t₁ at the other, so C changes by one. The
sign of C follows from the orientation of the hopping phase, which is a convention; the magnitude
and the boundary are not.

![Fig. 1. Chern number C of the lower band against φ/π and M/t₂ (red C = +1, blue C = −1, white 0) on a 41 × 41 grid; dashed: the analytic boundary M = ±3√3 t₂ sin φ. t₁ = 1, t₂ = 0.1, 24 × 24 k-mesh.](../figures/phase.png)

Checked: the boundary against Haldane's analytic result (by a person), the same diagram on a 12 × 12
mesh, which agrees at 99.9 % of the points (by a second AI session), the sign convention against the
paper (by a person, after a first error) and the gap closing at one valley (second AI session). Not
checked: the shift of the boundary with t₃; one scan was started but not finished in the time
available.

## 5. Checks table

| Result | Check | Method | Done by | Outcome | What changed |
|-|-|-|-|-|-|
| Phase diagram, t₃ = 0 | Boundary against Haldane's analytic result 3√3 t₂ sin φ | literature | person | holds | nothing |
| Phase diagram, t₃ = 0 | Same diagram on a 12 × 12 k-mesh | convergence | second-AI | holds | nothing |
| Chern-number code | Sign of the hopping phase against the paper's convention | re-derivation | person | fails, then holds | Next-nearest-neighbour vectors reordered to run anticlockwise |
| Gap closing at the boundary | Gap at both valleys at M = 3√3 t₂, φ = π/2 | limiting-case | second-AI | holds | README wording corrected: one valley, not both |

## 6. How AI was used

- Eleven log entries from three people. The AI wrote the Chern-number code and the figure script
  (used after edits) and ran the convergence comparison in a separate session.
- One AI error mattered: the first code ordered the next-nearest-neighbour vectors clockwise, which
  flipped the sign of every Chern number. Kim found it by deriving the convention from Haldane's paper
  by hand.
- The AI's literature summary credited the phase boundary to the wrong paper; the team corrected it
  after opening the PDF.
- An AI suggestion to compute the Berry curvature by finite differences was discarded in favour of
  the gauge-free lattice method.
- The scoping, the decision to narrow the question and all checks marked "person" were done by
  people.

## 7. What would come next

The question we set out with, how third-neighbour hopping moves the boundary, is now one parameter
away: the same code with t₃ added, run on a coarser 21 × 21 grid that takes about ten minutes, then
checked against the gap closing at the new Dirac points. A longer project would map the region where
t₃ creates new Dirac points and phases with |C| = 2.

## 8. Requested treatment in the joint paper

Brief summary.

## Appendix: AI log

<!-- The log files log/P##.md are attached as they are. They do not count toward the two pages. -->
