---
name: write-note
description: "Write the team's two-page note at the Many-Body Intelligence 2026 hackathon as a PRL-style letter: in the team's hackathon repository, write note/note.tex in revtex4-2 and build note/note.pdf, two pages, under the eight fixed headings, from what the repository holds (the question history in README.md, the checked results, the checks table, the AI logs), with one figure, every number traced in note/provenance.md and the page count checked. Use it in the Write stage, and whenever the team asks to write, draft, shorten or polish the note, the paper, the write-up or the PDF, even if they do not name the skill."
---

# Write the note

The day ends with a two-page note: a PRL-style letter (revtex4-2, two columns, title, abstract,
one figure, references) whose body follows the eight fixed headings of the event, as run-in heads.
Each team's note becomes one section of the organisers' joint paper, so it has to read like a
paper, not like a log: one question, what was done, the main result and how it was checked, how AI
was used, and what would come next. The repository is the evidence; the note is the argument. Most
of what the team did (the dead ends, the debugging, the order things happened in) stays out, and
the note uses its conclusions.

The note belongs to the team. You write a draft they can edit; they decide what it claims. If
`note/note.tex` already has text, revise it rather than replace it, and say what you changed.

This skill is for a team repository of the hackathon: one with `event.json`, `checks/checks.md`
and `note/note.md`. If the current folder has none of these, say in one line that this skill writes
a hackathon team's note in its repository, and ask whether to go on anyway.

**Time.** The Write stage is short (the times in `event.json` are approximate; name stages, not
clock times). Have a complete first draft, compiled, within about 15 minutes, so the team has time
to read and change it.

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

Check that LaTeX can build the letter: `pdflatex` on the PATH and `kpsewhich revtex4-2.cls`. If
either is missing, write the `.tex` anyway and plan for Overleaf (§7).

## 2. Claim map

Before writing, work out (see `references/writing-guide.md` §2):

- **Main result**: one sentence a referee could disagree with. If the day ended with a negative or
  partial result, say so plainly: a well-checked negative result is a result.
- **Support**: two or three points, each with its source (script or paper) and one number.
- **Checked and not checked**: which parts of the result the checks table covers.
- **What stays out**, so that leaving it out is a decision.

Show it to the team in a few lines when the main result is not obvious, or when the repository
supports two different stories. Otherwise state it in your reply and go on.

## 3. The letter, section by section

Copy `assets/note_template.tex` to `note/note.tex` and fill it. Keep the run-in heads exactly as in
the template (`\textit{4. Main result.}---`), in the same order: the organisers read them across
teams. Details and budgets are in `references/writing-guide.md` §3–§4.

- **Title and abstract.** The title is the result as a claim, one line, title case. The abstract
  (at most 600 characters, no symbols that need definitions, no citations): the question, the
  result, how it was checked. Authors as the team writes their names; the team ID goes in the
  `\collaboration` line.
1. **Title, team ID, members.** One line: "Title above; team T0n: names."
2. **Question history.** Copy the README's lines Q0 to Final into the list exactly as they are.
   Lines still "..." stay "...", and your reply tells the team which ones to fill: the history is
   theirs, so never write a Q1 or Q2 for them. You may propose wording for "Final" in the reply.
3. **Approach and methods.** Model, method, codes, parameters with their sources, the conventions in
   one line, and the shortcuts taken.
4. **Main result.** The figure and its paragraph. Say which parts were checked (pointing to
   Table I) and which were not.
5. **Checks table.** Table I, with the rows of `checks/checks.md` copied cell by cell, unchanged.
   If it is empty, leave the table with its header only and say so in the reply; never add rows
   yourself. Rows that `note/results.md` proposes are for the team to add to `checks/checks.md`
   first.
6. **How AI was used.** Three to five bullets from the log entries: what the AI did, what it got
   wrong, what people did. Use only what the logs say, with counts where they help. Never describe
   AI output more favourably than the logs do, and never supply a judgement (outcome, checked by)
   that the logs do not contain. If the logs are thin, say so in the note.
7. **What would come next.** Two to four sentences.
8. **Requested treatment in the joint paper.** Copy the answer from `CONTRIBUTIONS.md`. If it is
   empty, leave "..." and ask the team: it is their decision.

Keep the "Appendix: AI log" line; the logs stay in `log/`. References go in `thebibliography`, each
with a DOI or an arXiv number. Write your own math as LaTeX math. Text copied from the README or the
checks table may keep its Unicode symbols: the template maps the common ones, and the checker names
any it cannot typeset.

Add one line at the top of `note/note.md`, under its comment: "This team's note is `note/note.tex`
(PDF: `note/note.pdf`)." The kit allows the LaTeX note in place of the Markdown one.

`examples/note.example.tex` (with `note.example.pdf`) is a complete letter in this form, on a
made-up team.

## 4. Figure

One figure, the main result, at the width of one column (`\columnwidth`, 8.6 cm), as a PDF.
When it was made in a person's folder, the team's rule is that a figure chosen for the note moves
to `figures/` and its script to `code/`, writing there. Ask the person who made it before moving
their files, and never write into a person's folder yourself: until they answer, copy the PDF into
`figures/` and say so in the reply. If a figure style skill such as `/figure-style` is installed,
use it; otherwise keep labels at least 7 pt at the printed width. The script should print every
number the caption or the text quotes.

## 5. Write

Follow `references/writing-guide.md` §5–§7: full sentences, the physics in words after each key
equation, one number per claim, prior work credited by name, no hype. Cite only what you can
identify by DOI or arXiv number.

## 6. Provenance

Write `note/provenance.md`: one row per number or claim in the note, with the value, the source
(script and output, paper, checks table row) and how it was checked (re-run, read from the paper,
checks table, not checked). End with what is not verified. `examples/provenance.example.md` shows
the format.

## 7. Build and fit

From the repository root:

```
python3 <skill-dir>/scripts/note_check.py note/note.tex --build --sheet <scratch>/pages.png
```

It checks the eight run-in heads, that sections 2, 5 and 8 match `README.md`, `checks/checks.md`
and `CONTRIBUTIONS.md`, figures, placeholders and references; then it compiles twice in a temporary
folder, reports the pages (target 2), how full the last page is, the abstract length and LaTeX
warnings, copies the PDF to `note/note.pdf` and writes the pages side by side to `pages.png`.
**Look at the pages**: a page count can be right while the table lands far from its text or a
column ends in a white gap. Cut in the order of `references/writing-guide.md` §9 and build again.
After cutting, re-read for accuracy: shortened sentences turn into overclaims.

**No LaTeX on the laptop:** tell the team to open Overleaf, create a blank project, upload
`note/note.tex` and the figure PDF into it, compile (Overleaf has revtex4-2), and download the PDF
as `note/note.pdf`. The template finds a figure in the same folder.

## 8. Report

Reply in at most about 200 words, without repeating what the note already says: where the files
are (`note/note.tex`, `note/note.pdf`, `note/provenance.md`), the main result in one line, what is
checked and what is not in one or two lines, what the team still has to supply as a short list
(question-history lines, the "Final" line, section 8, the CRediT roles in `CONTRIBUTIONS.md`), and
any question for a teammate (for example about moving their figure). Commit `note/note.tex`,
`note/note.pdf`, `note/provenance.md`, the line in `note/note.md` and the figure, never the LaTeX
build files. Offer `/log-entry` once, and remind the team that `/log-check` runs at the end of the
Write stage.

If the team explicitly asks for a Markdown note instead, write `note/note.md` under the same
headings; the checker handles it too (`note_check.py note/note.md`).
