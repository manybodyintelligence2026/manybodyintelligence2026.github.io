---
name: check-results
description: "Check the team's results before they go into the note or the talk at the Many-Body Intelligence 2026 hackathon: in the team's hackathon repository, re-run the scripts behind each result on copies, compare every number the team quotes with what the code gives, check the cited papers, re-derive the key steps and look for convention clashes between people's tracks, then collect what holds up in note/results.md for /write-note. Use it at the end of the Check or Make figures stage and before writing, and whenever someone asks to check, verify or audit the team's results, numbers, figures or references, or asks \"is this right?\", \"can we trust this?\" or \"what do we actually have?\", even if they do not name the skill."
---

# Check results

By the Write stage a team's results come from several people and several AI sessions, each in
their own folder. Before they go into the two-page note, someone has to check them the way a
careful referee would who also re-runs the code. This skill does that, and collects what holds up
in `note/results.md`, which `/write-note` builds the note on.

The value is in finding real problems and in being trustworthy about them. A report that calls
correct things wrong, or misses a sign error in the main formula, wastes the team's time either
way.

This skill is for a team repository of the hackathon: one with `event.json`, `checks/checks.md`
and `note/note.md`. If the current folder has none of these, say in one line that this skill checks
a hackathon team's results in its repository, and ask whether to go on anyway.

## Two readers, and the time

- **People** read your reply in the chat: at most about 250 words, problems first, then what holds,
  then what the team must decide.
- **The note and the AI sessions** read `note/results.md`: every result with its value, its source
  and how it was checked, written so that `/write-note` or a fresh session can use it without
  redoing the work.

The Write stage is short (the times in `event.json` are approximate; name stages, not clock
times). Aim to finish in about 15 minutes: check the results the note will claim first (the main
result and its figure), then the rest. A rerun that takes more than a few minutes gets a reduced
grid, or is marked "not re-run".

**Independence.** A check of a result made in another session counts as `second-AI`. If this
session produced a result, its check of that result is not independent: say so, and do not record
it as a check.

## Before starting

- Read `README.md` (question history, "Done today", task split, Conventions), `plan.md` and
  `plan-ai.md` if they exist, `checks/checks.md`, and the log entries in `log/P##.md` for what each
  person says they did and checked.
- Run `python3 <skill-dir>/scripts/inventory.py .` from the repository root. It lists, per folder
  (each person's folder, `code/`, `figures/`), the scripts, the figures each script writes, figures
  with no script, scripts that write files (re-run those on copies), data files and the papers in
  `our-idea/papers/`.
- If it is not clear which results the team means to put in the note, ask in one line and start
  with the obvious main result meanwhile.

## 1. Verify

Follow `references/checklist.md`. In outline:

1. **Start the reruns first.** Copy the scripts (and what they import) to a scratch directory outside
   the repository and run them there, in the background and in parallel. Never run them in the
   repository: scripts write figures and data with fixed names and would overwrite the team's.
2. **Numbers.** Compare every number the team quotes (README, plan, log entries, figure labels, a
   note draft, slides) with the rerun output, and the parameters in the text with those in the code.
3. **Citations.** Open each cited paper (the PDFs in `our-idea/papers/`, or the arXiv text) and check
   the numbers taken from it, the equation and table numbers, and how the source is described. Every
   reference needs a DOI or an arXiv number; a reproduced published result is a benchmark, credited,
   not a finding.
4. **Derivations.** Re-derive the key steps from the line before: limits, special cases, signs,
   factors of 2, units.
5. **Conventions across tracks.** Compare units, sign and Fourier conventions, lattice and basis
   between the people's code and the Conventions section of `README.md`. Two tracks that disagree
   on a convention is the most common error of the day.
6. **Test every suspicion numerically before reporting it.** A small grid or a toy case often shows
   that the numbers are fine and only the argument is wrong, or the reverse.

Classify each finding as Error, Justification, Inconsistency, Attribution, Decision or Minor (defined
in the checklist), the most serious first.

## 2. Fixes belong to their owners

The scripts, figures and text belong to the people who made them. Do not edit them. Report the fix
with its evidence, and make it only if that person asks. A figure regenerated for the check stays in
the scratch directory.

## 3. Collect in note/results.md

Write `note/results.md` in this shape (`examples/results.example.md` is a filled-in example):

```markdown
# Results for the note

Checked during <stage>. Scripts re-run on copies; nothing in the repository was changed.

## R1. <the result in one line>
- Value: <number with units, or the figure>
- Source: <script> → <output or figure>, by <person>
- Checked: <re-run reproduced it / checks.md row "<check>" / read from <paper> / not checked>
- Problems: <none, or the finding with its class>

## Not checked
- <result>: <why>

## Decisions for the team
- <one line each>

## Proposed rows for checks/checks.md
| Result | Check | Method | Done by | Outcome | What changed |
|-|-|-|-|-|-|
```

Propose rows only for checks this session actually carried out on results made elsewhere
(`second-AI`), with method names from `log/CODEBOOK.md`. The team adds them: the checks table is
copied unchanged into the note, so it is theirs. Which results go into the note is the team's choice
too; do not rank them as main or minor in the file.

## 4. Report

Reply in at most about 250 words, and leave the details to `note/results.md`: the problems, most
serious first, one line each with its class and the key number; what was verified, in one line;
what could not be checked; and the decisions for the team, a few words each. Commit
`note/results.md`, suggest `/write-note` as the next step, and offer `/log-entry` once.

## Practical notes

- Keep reruns and their output in the scratch directory; never commit them.
- When a script needs a package that is missing, say which, and check the rest by reading.
- A number stated in a log entry or a README with no script behind it cannot be reproduced from the
  files: say so; do not call it wrong.
