# MBI 2026 Scoping Skill

One Claude Code skill for the **Scope** phase (Monday 30 November 2026, 09:15–10:15):
`/scope-to-one-day` turns your team's research idea into a plan that fits the day, written to
`plan.md` in your team repository.

| Skill | What it does |
|---|---|
| `scope-to-one-day` | Reads your idea (the Q0 line in `README.md` and `our-idea/`), sharpens the question to one sentence, checks with rough numbers that the core calculation fits about three hours on a laptop, suggests a quick literature check, defines "done" at three levels, writes fallbacks tied to the stages of the day, chooses the checks for the Check phase in advance, and proposes one track per person. |

It does not decide for you: if `our-idea/` holds several candidates, it compares the strongest two
or three and asks you to choose; if there is no idea yet, it says so and offers a few. It shows you
the lines for the question history in `README.md` (Q1, "Done today means", "Expected") and writes
them only once you agree. "Confidence (1–5)" is yours to fill in.

## Installing (30 seconds)

**Easiest way — ask Claude Code to do it for you:**
Download `mbi2026-scope-skill.zip`, then paste into Claude Code:
```text
Unzip ~/Downloads/mbi2026-scope-skill.zip and install the scope-to-one-day skill into my personal ~/.claude/skills/ folder. Do not modify this repo's .claude/ folder.
```

**Or run the installer script yourself** (leaving your team repository's `.claude/` folder
untouched so `/log-entry` and `/log-check` keep working):
- **macOS / Linux / Git Bash:** `bash install-skill.sh`
- **Windows (PowerShell):** `.\install-skill.ps1`
- **Or copy manually** the `scope-to-one-day` folder into `~/.claude/skills/` (macOS/Linux) or
  `C:\Users\<you>\.claude\skills\` (Windows).

Start a new Claude Code session after installing.

## Running it

1. In your team repository, `git pull` so you see everything your teammates have put in
   `our-idea/`.
2. Start Claude Code there and type `/scope-to-one-day` (or "let's plan the day").
3. Answer its questions and decide together. It commits `plan.md` and offers `/log-entry`. Your
   teammates then `git pull` to get the plan.

One person per team runs it, with the others looking on; anyone can install it. Later in the day,
ask it again to apply a fallback ("we're at the end of First result and have nothing").
