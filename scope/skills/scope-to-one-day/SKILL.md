---
name: scope-to-one-day
description: "Plan the Many-Body Intelligence 2026 hackathon day from the team's idea: in the team's hackathon repository, turn the research idea (the Q0 line in README.md and the files in our-idea/) into a plan that fits one day: a sharpened question, a feasibility check with numbers, what \"done\" means at three levels, fallbacks tied to the stages of the day, checks chosen in advance and a split of the work, written to plan.md. Use it at the start of the hackathon day, and whenever a team in its hackathon repository asks for a plan, a schedule, how to split the work, whether their idea fits in a day, or says \"let's start\" or \"what do we do today\", even if they do not name the skill."
---

# Scope to one day

A team of 3–6 physicists, each with their own AI session, has one day to take a new research
question as far as it can. This skill turns the team's idea into a plan that fits the day. It runs
during the Scope stage, which lasts about an hour; the team should spend most of that hour talking
to each other, so be quick and keep your questions to one message at a time.

The team makes the scientific decisions. Your job is to make the options and their costs clear,
to push back when something will not fit, and to write the result down. A plan that is honest
about what fits is worth more than an ambitious one: the most common way to lose the day is to
start three heavy calculations and finish none.

This skill is for a team repository of the hackathon: one with `event.json`, a `README.md` with a
Q0 line and an `our-idea/` folder. If the current folder has none of these, say in one line that
this skill plans the hackathon day in the team's repository, and ask whether to go on anyway
before doing anything else.

## The day

Read the stages and their milestones from `event.json` (`phases`, and `team_stages` if present).
The times there are approximate, so plan by stage, not by clock time. The usual order is Welcome,
Scope, First attempt, First result, Lunch, Check, Make figures, Write, Talks, Peer review. That
leaves about three hours of building between the end of Scope and the start of Check: scope for
those three hours, not for the whole day.

## 1. Find the idea

Read `README.md` (the Q0 line and the question history), `our-idea/` (the team's descriptions in
`team.md`, any idea or proposal files, any assessment the team made) and the names of the papers
in `our-idea/papers/`. Open a paper only if the plan depends on something in it. Then:

- **One agreed idea** (Q0 is filled in, or the person names it): go on to step 2.
- **Several candidates and no decision:** do not plan all of them. In one short message, compare
  the two or three strongest, using what the team already wrote (interest, who can do which part,
  time estimates), recommend one with a reason, and ask the team to choose. Plan once they have.
- **No idea at all:** say so plainly and do not invent a project for them. Offer to propose two or
  three ideas that fit the rules below and draw on the people in `team.md`, and let them pick.

In the same message, ask for anything the plan needs and the files do not say: who is here today,
who is comfortable with which methods and codes, and what compute they have. If nobody can answer
right now, carry on with stated assumptions and list them in the plan.

## 2. Restate the question

Write the question as one sentence that names the system or model, what is varied and what is
computed. Example: "How does next-nearest-neighbour hopping t′ change the Chern-number phase diagram
of the Haldane model, as a function of t′/t and M/t?" If the idea holds several questions or
routes, list them and ask the team to pick one.

Check it against the event's rules and say plainly when something does not fit:

- **Size:** about a Master's project, the kind of thing that could become a short paper with more
  time. If it is bigger, say so and offer two or three smaller versions.
- **New to everyone on the team**, and not part of a group's current research. Existing codes and
  methods are fine.
- **Free to share:** not part of a group's plans or a grant without the PI's agreement, and no
  unpublished or confidential data goes into AI tools.
- **Laptop-sized**, unless the team says it has other compute.
- **A first result is possible by the end of the day**, however rough.

## 3. Feasibility audit

Estimate with numbers whether the core calculation fits the three building hours and the hardware:

- **Cost:** matrix size or Hilbert-space dimension, k-points, bond dimension, number of parameter
  points, rough time per point, multiplied out over the whole sweep. If it is more than about an
  hour on a laptop, propose a coarser grid, a smaller system or a cheaper method.
- **Chains of heavy steps:** if the idea strings together several steps that are each a day's work
  (for example DFT → Wannier model → computed interaction → RPA → gap equation), keep one step as the
  day's core and take the others from published values, an existing model or a simpler
  approximation. Say which, and what is lost.
- **Inputs:** where every parameter comes from. If published values disagree, plan for the spread
  rather than one number.
- **Tools:** which existing code or library does the heavy lifting, whether someone on the team
  already knows it, and how long setup takes. Installing and learning a major new code (or setting
  up a DFT workflow) on the day is a red flag.
- **Analytics:** which parts can be derived by hand or with SymPy instead of computed.
- **Known traps:** gauge choices, finite-size effects near transitions, slow convergence, a sign
  problem, a Stoner instability in RPA, and so on.

Give a verdict: fits / fits if narrowed (say how) / does not fit (say what would).

## 4. Quick literature check

Suggest that one person runs this in their own session while the others continue with steps 5–8.
Look for whether the exact question has been answered, the closest existing results, and one known
result the team can reproduce first as a benchmark. Cite only what you can identify by DOI or arXiv
number, and say when you have not opened a paper. A reference that merely sounds right does more
harm than none. If the question turns out to be answered already, say so at once and help the team
move to a nearby open variant, with the existing result as its benchmark.

## 5. Define "done" at three levels

Each level is a concrete thing the team could put on a slide: which figure with which axes, which
parameter range, which equation.

- **Minimum (by the end of First result):** usually the benchmark, or the simplest limit of the
  new question.
- **Target (before Check starts):** the answer to the sharpened question at modest resolution.
- **Stretch (only after Check):** a finer grid, a larger system, a second method, one more parameter.

## 6. Fallbacks

Write two or three narrower questions now, each with a trigger tied to a stage, so that nobody has
to re-scope under pressure later. For example:

- If nothing is running halfway through First attempt → drop the numerics and derive the boundary
  analytically in the limit where that is possible.
- If there is no first result by the end of First result → one parameter value, a coarse grid.
- If the benchmark does not reproduce → finding out why is the rest of the day, and a valid result.

## 7. Checks, chosen now

Choose the independent checks for the Check stage before any result exists, so that they are not
picked to fit the result. For each: what it is (limiting case, symmetry or sum rule, units,
convergence, second method, published value) and what outcome is expected. At least one should be
done by a person. A check run in the same AI session that produced the result is not independent.
When the checks are run, they become rows in `checks/checks.md`, using the method names in
`log/CODEBOOK.md`.

## 8. Split the work

Propose parallel tracks, one per person, each with a clear output and a hand-over point. Typical
tracks: the core calculation; the benchmark or analytic limits the numerics must match; an
independent check built from the start without looking at the core code; conventions, figures and
the note. With more people, double up the core track or add the literature and write-up.

Tracks that touch the same equations agree on conventions first: units, sign and Fourier
conventions, lattice and basis, the Hamiltonian as the team writes it. Put them in the Conventions
section of `README.md`. Work in progress lives in each person's own folder; code and figures that
go into the note move to `code/` and `figures/`.

You may say who looks like a natural fit for a track, from `team.md`, but the team decides who
takes what.

## 9. Write plan.md and propose the README lines

Write `plan.md` in the repository root, one page, in this shape:

```markdown
# <title>: plan for the day

**Question:** <one sentence>

**Verdict:** <fits / fits if narrowed: how / does not fit: what instead>. Cost: <the numbers>.

## Done
- Minimum (end of First result): <figure or equation>
- Target (before Check): <...>
- Stretch (only after Check): <...>

## Fallbacks
- If <trigger tied to a stage> → <narrower question>

## Benchmark
<the known result to reproduce first, with its reference>

## Literature
- <reference with DOI or arXiv number>: <one line; say if not opened>

## Checks for the Check stage
| Check | Expected outcome | Method | Done by (person / second AI / both) |

## Tracks
| Track | Who | Output | Hand-over |

## Conventions
<units, Hamiltonian, lattice, Fourier convention; also copied to README.md>

## Assumptions and open questions
- ...
```

Then show the team the lines this gives for the question history in `README.md`, for them to
confirm or reword: Q1 (the sharpened question), "Done today means" and "Expected at the end of the
day", plus one task-split row per person. "Confidence (1–5)" is the team's own judgement: ask for
it, do not fill it in. Write these lines into the README only once the team agrees. Commit
`plan.md` (and the README once agreed), and offer `/log-entry` once: scoping is a task like any
other.

## During the day

If the team comes back later ("we're at the end of First result and have nothing"), re-read
`plan.md`, apply the matching fallback, and update the file with what changed and why. If the
question narrows, the README needs a Q2 line with the time and the reason, worded by the team. Do
not enlarge the scope quietly: if the team wants to add something, check it against the time left
first.
