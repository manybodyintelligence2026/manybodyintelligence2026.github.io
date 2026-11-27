---
name: scope-to-one-day
description: "Plan the Many-Body Intelligence 2026 hackathon day from the team's idea: in the team's hackathon repository, turn the research idea (the Q0 line in README.md and the files in our-idea/) into a plan that fits one day: a sharpened question, a feasibility check with numbers, what \"done\" means at three levels, fallbacks tied to the stages of the day, checks chosen in advance and a split of the work, written as plan.md (short, for the team) and plan-ai.md (the full reasoning, for the AI sessions). Use it at the start of the hackathon day, and whenever a team in its hackathon repository asks for a plan, a schedule, how to split the work, whether their idea fits in a day, or says \"let's start\" or \"what do we do today\", even if they do not name the skill."
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

## Two readers

What you write has one of two readers, and they need different things.

- **People** read your replies and `plan.md` on a shared screen while they talk. Keep each reply
  under about 200 words and `plan.md` under about 300, lead with what needs a decision, and leave
  the reasoning out unless they ask for it.
- **AI sessions** read `plan-ai.md`: this session later in the day, and the session each teammate
  starts for their own track. Put all the reasoning, numbers and references there, written so that
  a session that has read nothing else can act on it.

When in doubt, move detail out of the reply and into `plan-ai.md`. Neither reader gets clock
times: the times in `event.json` are approximate, so always name the stage instead.

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
  the two or three strongest in a small table (idea, fits the day?, main risk, who would lead),
  using what the team already wrote (interest, who can do which part, time estimates), recommend
  one with a reason, and ask the team to choose. Plan once they have.
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

## 9. Write the plan twice: plan-ai.md for the AI sessions, plan.md for the people

Both files go in the repository root and must agree with each other.

**`plan-ai.md` first**, because that is where the thinking goes. Write it for a reader who has
seen nothing else: a teammate's fresh session that has to pick up a track, or this session later
in the day when a fallback is needed. It holds everything from steps 2–8: the question and why it
was narrowed, the cost estimate with its arithmetic, where each input comes from, tools, the parts
done analytically, known traps, the benchmark and the literature (DOI or arXiv number; say which
you have not opened), the three levels of done, each fallback with its trigger and the reason for
it, the checks with method (names from `log/CODEBOOK.md`) and expected outcome, the conventions,
the assumptions, and one brief per track: inputs, first step, output file, hand-over point, and
what to check before handing over. Use one heading per track so that a session can jump to its
own. No padding, and no length limit.

**`plan.md`** is what the team looks at on the shared screen: decisions only, at most about 300
words, no reasoning, arithmetic or references (they are in `plan-ai.md`). In this shape:

```markdown
# <title>: plan for the day

**Question:** <one sentence>
**Verdict:** <fits / fits if narrowed: how / does not fit: what instead>

## Done
- Minimum (end of First result): <one line>
- Target (before Check): <one line>
- Stretch (only after Check): <one line>

## If it goes wrong
- <trigger tied to a stage> → <narrower question>

## Tracks
| Track | Who | Output | Hand-over |
|-|-|-|-|

To start your track, tell your own Claude: "Read plan-ai.md, I'm on track <letter>."

## Checks for the Check stage
- <check>: expect <outcome> (<person / second AI>)

## Still open
- <only what the team still has to decide; leave the section out if nothing is open>
```

Then reply to the team in about 200 words, without repeating the plan: the verdict in one line,
and the lines this gives for the question history in `README.md`, for them to confirm or reword:
Q1 (the sharpened question), "Done today means" and "Expected at the end of the day", plus one
task-split row per person. "Confidence (1–5)" is the team's own judgement: ask for it, do not fill
it in. Write these lines into the README only once the team agrees. Commit `plan.md` and
`plan-ai.md` (and the README once agreed), and offer `/log-entry` once: scoping is a task like any
other.

## During the day

If the team comes back later ("we're at the end of First result and have nothing"), re-read
`plan-ai.md`, apply the matching fallback, and update both files: `plan-ai.md` with what changed
and why, `plan.md` with the new decision. If the
question narrows, the README needs a Q2 line with the time and the reason, worded by the team. Do
not enlarge the scope quietly: if the team wants to add something, check it against the time left
first.
