# MBI 2026 Figure & Presentation Skills

Five numbered Claude Code skills plus one bonus skill (with tested starter templates) for the **Figures & Presentation** phase (Monday 30 November 2026, 14:00–15:00), in the exact order covered in the talk and `resources.html`.

**Core idea — Principles vs. Aesthetics:** Objective *design principles* (readable font sizes for a paper or projector, colour maps that match your data's symmetry and work for colour-blind readers, honest axes, and checking the rendered image) can be handed to Claude Code as skills — leaving you free to focus on the physics and your own *aesthetic* choices.

| # | Skill | Bundled starter | Use it for |
|---|---|---|---|
| Skill 1 | `figure-style` | `mbi.mplstyle` | Data plots for papers, team notes, or slides: colour-blind friendly Crameri colour maps, LaTeX-style math, right font sizes, anti-collision rules. |
| Skill 2 | `schematic` | — | Editable vector diagrams (SVG, matplotlib, or TikZ): asks before guessing unclear physics, draws two drafts, critiques like a referee, uses ~2x larger labels. |
| Skill 3 | `render-and-look` | — | Quality gate after *any* visual: renders a PNG, forces Claude to inspect every label and inset for collisions & physics errors, fixes the script (max 3 rounds). |
| Skill 4 | `html-animation` | `template.html` | Interactive talk animations & 3D figures as a single offline browser page (arrow-key beats, time scrubbing, live sliders). Default before Blender. |
| Skill 5 | `blender-scene` | `scene_template.py` | Drives Blender automatically from Python (no clicking menus) when a browser page isn't enough — checks one still frame first. |
| Bonus | `html-fractal` | `template.html` | Animate *any* calculation the way a fractal is built — level by level, generation by generation, iteration by iteration (solvers, time steps, lattices, sweeps), with every number on screen computed by the page; how to drop it into an HTML slide deck. |

## Installing (30 seconds)

**Easiest way — ask Claude Code to do it for you:**
Download `mbi2026-figure-skills.zip`, then paste into Claude Code:
```text
Unzip ~/Downloads/mbi2026-figure-skills.zip and install all six skills into my personal ~/.claude/skills/ folder. Do not modify this repo's .claude/ folder.
```

**Or run the installer script yourself** (leaving your team repository's `.claude/` folder untouched so `/log-entry` and `/log-check` keep working):
- **macOS / Linux / Git Bash:** `bash install-skills.sh`
- **Windows (PowerShell):** `.\install-skills.ps1`
- **Or copy manually** into `~/.claude/skills/` (macOS/Linux) or `C:\Users\<you>\.claude\skills\` (Windows).
- **Recommended per team:** copy `figure-style/mbi.mplstyle` into your team repo as `code/team.mplstyle` so every teammate's Claude produces visually matching figures.

Start a new Claude Code session after installing. Claude loads a skill automatically when the task fits, or you can invoke one directly (e.g., `Use /figure-style and /render-and-look`).

## Credits & Inspirations
Written for MBI 2026, drawing on:
- Zhao & Wright, *"Automating schematic figure making"* (2026), https://lgwrightlab.github.io/schematic-figure/
- Yang et al., *"MatPlotAgent"* (2024), https://arxiv.org/abs/2402.11453
- Crameri, Shephard & Heron, *"The misuse of colour in science communication"*, *Nat. Commun.* 11, 5444 (2020)
- Rougier, Droettboom & Bourne, *"Ten simple rules for better figures"*, *PLOS Comput. Biol.* 10, e1003833 (2014)
- Anthropic's example skills (`algorithmic-art`, `canvas-design`), https://github.com/anthropics/skills
- K-Dense's `scientific-visualization` skill, https://github.com/K-Dense-AI/scientific-agent-skills
- Pirat83's `matplotlib-render-review` skill, https://github.com/Pirat83/claude-code-skills
