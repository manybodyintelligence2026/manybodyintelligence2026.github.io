# MBI 2026 Write Skills

Two Claude Code skills for the **Write** phase (Monday 30 November 2026, 15:00–15:45): check what you
are about to claim, then write the two-page note.

| Skill | What it does |
|---|---|
| `check-results` | Re-runs the scripts behind your results on copies (never in your folders), compares every number you quote with the code, opens the cited papers, re-derives the key steps and looks for convention clashes between people's tracks. Writes `note/results.md`: each result with its value, source and how it was checked, the findings with their class and evidence, and proposed rows for `checks/checks.md`. |
| `write-note` | Drafts `note/note.md` (or `note.tex`) under its eight headings from the repository: the question history from `README.md`, the checked results, the checks table, your AI logs and `CONTRIBUTIONS.md`. One figure, every number traced in `note/provenance.md`, and `scripts/note_check.py` checks the headings, that sections 2, 5 and 8 match their sources, and that the note fits two pages. |

They propose; you decide. They do not write your question history, add rows to your checks table or
answer section 8, they report your AI logs as they are, and they do not edit or move a teammate's
files without asking. `write-note/examples/` holds a complete example note on a made-up team, with
real numbers from a one-second Haldane-model calculation.

## Installing (30 seconds)

**Easiest way — ask Claude Code to do it for you:**
Download `mbi2026-write-skills.zip`, then paste into Claude Code:
```text
Unzip ~/Downloads/mbi2026-write-skills.zip and install the check-results and write-note skills into my personal ~/.claude/skills/ folder. Do not modify this repo's .claude/ folder.
```

**Or run the installer script yourself** (leaving your team repository's `.claude/` folder
untouched so `/log-entry` and `/log-check` keep working):
- **macOS / Linux / Git Bash:** `bash install-skills.sh`
- **Windows (PowerShell):** `.\install-skills.ps1`
- **Or copy manually** the two folders into `~/.claude/skills/` (macOS/Linux) or
  `C:\Users\<you>\.claude\skills\` (Windows).

Start a new Claude Code session after installing.

## Running them

1. **Check** (end of Make figures or start of Write): one person runs `/check-results`, best in a
   fresh session so that its checks count as independent. Add the proposed check rows you agree with
   to `checks/checks.md`.
2. **Write**: run `/write-note`. Edit the draft together; fill in the question-history lines,
   section 8 and `CONTRIBUTIONS.md` yourselves.
3. Everyone runs `/log-check` at the end of the Write phase.
