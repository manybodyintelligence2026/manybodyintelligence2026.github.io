---
name: write-note
description: "Write the team's two-page note at the Many-Body Intelligence 2026 hackathon: in the team's hackathon repository, fill note/note.md (or note.tex) under its eight fixed headings from what the repository holds (the question history in README.md, the checked results, the checks table, the AI logs), with one figure from code/, every number traced in note/provenance.md and the length checked against two pages. Use it in the Write stage, and whenever the team asks to write, draft, shorten or polish the note, the write-up or the report, even if they do not name the skill."
---

# Write the note

The day ends with a two-page note under eight fixed headings. Each team's note becomes one section
of the organisers' joint paper, so it has to read like a section of a paper, not like a log: one
question, what was done, the main result and how it was checked, how AI was used, and what would
come next. The repository is the evidence; the note is the argument. Most of what the team did (the
dead ends, the debugging, the order things happened in) stays out, and the note uses its
conclusions.

The note belongs to the team. You write a draft they can edit; they decide what it claims. If
`note/note.md` already has text, revise it rather than replace it, and say what you changed.

This skill is for a team repository of the hackathon: one with `event.json`, `checks/checks.md`
and `note/note.md`. If the current folder has none of these, say in one line that this skill writes
a hackathon team's note in its repository, and ask whether to go on anyway.

**Time.** The Write stage is short (the times in `event.json` are approximate; name stages, not
clock times). Have a complete first draft within about 15 minutes, so the team has time to read and
change it.

## 0. The results must be right first

Every number in the note must be checked. If `note/results.md` exists (written by `/check-results`),
build on it. Otherwise re-run, on a copy outside the repository, the script behind each number you
will quote, and treat everything you could not re-run as unchecked. A note built on an unchecked
result spreads the error into a document that looks authoritative.

## 1. Gather

Read, in this order: `README.md` (question history Q0 to Final, "Done today means", "Expected",
task split, Conventions), `note/results.md`, `checks/checks.md`, `plan.md` and `plan-ai.md` if they
exist, the log entries in every `log/P##.md` (for section 6), `CONTRIBUTIONS.md` (for section 8),
`event.json` (team ID), `our-idea/team.md` (names), and the scripts and figures behind the main
result in `code/`, `figures/` and the people's folders.

## 2. Claim map

Before writing, work out (see `references/writing-guide.md` §2):

- **Main result**: one sentence a referee could disagree with. If the day ended with a negative or
  partial result, say so plainly: a well-checked negative result is a result.
- **Support**: two or three points, each with its source (script or paper) and one number.
- **Checked and not checked**: which parts of the result the checks table covers.
- **What stays out**, so that leaving it out is a decision.

Show it to the team in a few lines when the main result is not obvious, or when the repository
supports two different stories. Otherwise state it in your reply and go on.

## 3. The eight sections

Keep the headings exactly as they are in `note/note.md`, in the same order. A team that prefers
LaTeX writes `note/note.tex` with the same headings instead; start it from
`assets/note_template.tex`. Section by section
(details and budgets in `references/writing-guide.md` §4):

1. **Title, team ID, members.** The title is the result as a claim, not the topic. Team ID from
   `event.json`, names as the team writes them.
2. **Question history.** Copy the README's lines Q0 to Final exactly as they are. Lines still "..."
   stay "...", and your reply tells the team which ones to fill: the history is theirs, so never
   write a Q1 or Q2 for them. You may propose wording for "Final" in the reply, matching the note's
   claim.
3. **Approach and methods.** Model, method, codes, parameters with their sources, the conventions in
   one line, and the shortcuts taken.
4. **Main result.** One figure and its paragraph. Say which parts were checked (naming the checks
   table rows) and which were not.
5. **Checks table.** Copy the table rows from `checks/checks.md` unchanged. If it is empty, leave it
   empty and say so in the reply; never add rows yourself. Rows that `note/results.md` proposes are
   for the team to add to `checks/checks.md` first.
6. **How AI was used.** Three to five bullets from the log entries: what the AI did, what it got
   wrong, what people did. Use only what the logs say, with counts where they help ("14 entries; 3
   outputs were wrong, all caught by a person"). Never describe AI output more favourably than the
   logs do, and never supply a judgement (outcome, checked by) that the logs do not contain. If the
   logs are thin, say so in the note.
7. **What would come next.** Two to four sentences: the Stretch goal or the fallback not taken, the
   open question, what a longer project would do first.
8. **Requested treatment in the joint paper.** Copy the answer from `CONTRIBUTIONS.md`. If it is
   empty, leave "..." and ask the team: it is their decision.

Keep the "Appendix: AI log" heading and its comment; the logs are attached as they are.

## 4. Figure

One figure: the main result. When it was made in a person's folder, the team's rule is that a
figure chosen for the note moves to `figures/` and its script to `code/`, writing there. Ask the
person who made it before moving their files, and never write into a person's folder yourself. Use
a PNG in `note.md` (Markdown viewers do not show PDFs) and the PDF in `note.tex`. If the figure
exists only as a PDF, render a PNG copy into `figures/` (`pdftoppm -png -r 200 -singlefile
<pdf> figures/<name>`), link that, and say so in the reply. If a figure style skill such as `/figure-style` is installed, use
it; otherwise keep labels readable at the printed width. The script should print every number the
caption or text quotes.

## 5. Write

Follow `references/writing-guide.md` §5–§7: full sentences, the physics in words after each key
equation, one number per claim, prior work credited by name, no hype. Cite only what you can
identify by DOI or arXiv number. `examples/note.example.md` is a complete note in this style, on a
made-up team.

## 6. Provenance

Write `note/provenance.md`: one row per number or claim in the note, with the value, the source
(script and output, paper, checks table row) and how it was checked (re-run, read from the paper,
checks table, not checked). End with what is not verified. `examples/provenance.example.md` shows
the format.

## 7. Check the fit

Run `python3 <skill-dir>/scripts/note_check.py note/note.md` (or `note/note.tex`) from the
repository root. It checks that the eight headings are there in order, that sections 2, 5 and 8
match `README.md`, `checks/checks.md` and `CONTRIBUTIONS.md`, that figure links resolve, and the
length: two pages is about 1,000 words of text with one figure (for `note.tex` it compiles and
counts pages). Cut in the order of `references/writing-guide.md` §9, then run it again. After
cutting, re-read for accuracy: shortened sentences turn into overclaims.

## 8. Report

Reply in at most about 200 words, without repeating what the note already says: where the files
are (`note/note.md`, `note/provenance.md`), the main result in one line, what is checked and what
is not in one or two lines, what the team still has to supply as a short list (question-history
lines, the "Final" line, section 8, the CRediT roles in `CONTRIBUTIONS.md`), and any question for a
teammate (for example about moving their figure).
Commit the note and the provenance file, offer `/log-entry` once, and remind the team that
`/log-check` runs at the end of the Write stage.
