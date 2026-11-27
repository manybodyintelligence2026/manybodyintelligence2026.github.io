# MBI 2026 Board Skill

One Claude Code skill for the **First attempt & First result** phase (Monday 30 November 2026,
10:15–12:15): `/board-to-latex` turns photos of handwritten physics (whiteboards, blackboards,
paper) into faithful, compilable LaTeX, and acts on the commands written on the board.

| Write on the board | What the skill does |
|---|---|
| *Calculate this!* | Evaluates the circled expression numerically in Python, with the constants and units stated |
| *Check this!* | Verifies the circled derivation step by step (SymPy, numerical spot checks), with a verdict per step |
| *Feynman!* | Draws the circled Feynman diagram with tikz-feynman, exactly as drawn |

It asks about anything it cannot read instead of guessing, and never corrects your physics inside
the transcription. For the PDF you need LaTeX with `physics`, `slashed` and `tikz-feynman` (or
Overleaf).

## Installing (30 seconds)

**Easiest way — ask Claude Code to do it for you:**
Download `mbi2026-board-skill.zip`, then paste into Claude Code:
```text
Unzip ~/Downloads/mbi2026-board-skill.zip and install the board-to-latex skill into my personal ~/.claude/skills/ folder. Do not modify this repo's .claude/ folder.
```

**Or run the installer script yourself** (leaving your team repository's `.claude/` folder
untouched so `/log-entry` and `/log-check` keep working):
- **macOS / Linux / Git Bash:** `bash install-skill.sh`
- **Windows (PowerShell):** `.\install-skill.ps1`
- **Or copy manually** the `board-to-latex` folder into `~/.claude/skills/` (macOS/Linux) or
  `C:\Users\<you>\.claude\skills\` (Windows).

Start a new Claude Code session after installing.

## Running it

1. Photograph the board into `photos/` in your team repository (circle and write any command first).
2. Ask: "Use /board-to-latex on photos/board-1.jpg. Save the .tex in my folder."
3. Answer its questions about the red `?n` markers; it then carries out the commands.
