# Figures & Presentation Resource Pack — Many-Body Intelligence 2026

Everything you need for the **14:00–15:00 Figures & Presentation phase** using **Claude Code** (preparing figures for your 2-page note and the **15:45 lightning talk**).

> **Core idea — Principles vs. Aesthetics:** Good scientific figures rely on objective *design principles* (readable font sizes for a paper or projector, colour maps that match your data's symmetry and work for colour-blind readers, honest axes, and checking the rendered image). Hand those principles to Claude Code as skills — freeing you to focus on physics clarity and your own *aesthetic* choices.

> **Team repo rule:** Keep your team repo's `.claude/` folder untouched (it holds the hackathon's `/log-entry` and `/log-check` logging tools). Install the five figure skills into your **personal** `~/.claude/skills/` folder so they work across all projects. You do not need all five skills — most teams start with **Skill 1 + Skill 3**.

---

## Install the 5 Claude Code Skills (30 seconds)

Download `mbi2026-figure-skills.zip` from `resources.html` (or Discord), then simply ask **Claude Code** to install it for you:

```text
Unzip ~/Downloads/mbi2026-figure-skills.zip (or wherever I saved it) and install all five
skills into my personal ~/.claude/skills/ folder. Do not modify this repo's .claude/ folder.
```

*(Prefer running a script yourself? Unzip and run `bash install-skills.sh` on macOS/Linux or `.\install-skills.ps1` on Windows.)*

- **Recommended per team:** Ask Claude to copy `mbi.mplstyle` into your team repository as `code/team.mplstyle` so every teammate's Claude generates matching plots.

| # | Skill | Bundled starter | What it does |
|---|---|---|---|
| Skill 1 | `/figure-style` | `mbi.mplstyle` | Colour-blind friendly Crameri colour maps, LaTeX-style math, exact paper/note/slide sizes, shared style |
| Skill 2 | `/schematic` | — | Asks before guessing unclear physics → two editable vector drafts (SVG/PDF/TikZ) → referee critique (~2× text) |
| Skill 3 | `/render-and-look` | — | Saves a PNG, forces Claude to inspect every label and inset for collisions & physics errors (max 3 rounds) |
| Skill 4 | `/html-animation` | `template.html` | Single offline browser page with arrow-key beats, time scrubbing, and live sliders during Q&A |
| Skill 5 | `/blender-scene` | `scene_template.py` | Runs Blender automatically from Python for photoreal or heavy 3D stills (checks one still first) |

---

## Guides & Copy-and-Paste Prompts (Matching the Talk 1–5)

### Skill 1 · Data Plots (`/figure-style`)
- **Why avoid rainbow / `jet`?** Our eyes do not perceive rainbow colours evenly — bright yellow and cyan jump out as sharp fake edges even where smooth data has none (as Crameri's Marie Curie portrait demonstrates), and rainbow maps break down for colour-blind readers or black-and-white print.
- **Useful links:**
  - [Scientific Colour Maps (Fabio Crameri)](https://www.fabiocrameri.ch/colourmaps/) & `pip install cmcrameri`
  - [Crameri, Shephard & Heron, *Nat. Commun.* 11, 5444 (2020)](https://doi.org/10.1038/s41467-020-19160-7)
  - [Paul Tol's Colour Schemes](https://personal.sron.nl/~pault/) — colour-blind friendly palettes
  - [SciencePlots](https://github.com/garrettj403/SciencePlots) — journal matplotlib styles
- **Starter prompt:**
  ```text
  Use /figure-style and /render-and-look.
  Read our checked data from code/<data_file> and write code/fig_<name>.py to output
  figures/<name>.pdf and figures/<name>.png (APS double-column, 178 mm wide).
  5-second message: <one sentence>.
  Panels: (a) ..., (b) ...
  Use code/team.mplstyle and Crameri batlow (or vik centred on 0 for signed data).
  Label every axis and colorbar with quantities and units, record input parameters in a comment,
  then render the PNG, open it to inspect, and fix any layout or physics issues (max 3 rounds).
  ```

### Skill 2 · Editable Vector Schematics (`/schematic`)
- **Why draw schematics from code with a skill?** As Zhao & Wright (*Automating schematic figure making*, Yale LGW Lab, 2026) put it: *"Doing science is fun, but drawing the schematic figure that explains it has been challenging for us: we were never trained to do it, yet that figure is often the first thing a reader looks at."* An image generator gives you flat pixels you cannot edit; a skill gives you **editable vector graphics** (SVG / PDF) together with the drawing code, using a plan → two drafts → referee critique workflow.
- **Useful links:**
  - [Automating schematic figure making (Zhao & Wright, Yale LGW Lab, 2026)](https://lgwrightlab.github.io/schematic-figure/)
  - [Inkscape](https://inkscape.org/) (optional vector polish or SVG→PDF conversion)
- **Starter prompt:**
  ```text
  Use /schematic and /render-and-look.
  Create an editable vector schematic showing <physical mechanism or crystal geometry> via
  code/fig_<name>.py -> figures/<name>.svg and .png.
  Ask me first if any physical detail is ambiguous. Then write a 5-line plan, build two
  contrasting layout drafts, render both to PNG, inspect them like a PRB referee (check
  physics accuracy and ~2x readable text), and refine the better draft.
  ```

### Skill 3 · Visual Self-Review & Repair (`/render-and-look`)
- **Why this matters most:** Writing plotting code without looking at the output is flying blind. In a 2024 study testing AI on real scientific plots (*MatPlotAgent*), simply having the AI open its rendered PNG and fix what it sees raised accuracy from 49% to 61% — the largest jump of any step. Run this after any other skill, or standalone on an existing plot you already made. Your eyes are always the final physics check.
- **Starter prompt (standalone review of an existing figure):**
  ```text
  Use /render-and-look on figures/<my_plot>.png (generated by code/fig_<my_plot>.py).
  Open the PNG, inspect every text label, inset, curve, and minus sign like a PRB referee
  (check collisions, lines crossing text, font size at final column width, units, and physics),
  fix concrete issues in the script for at most 3 rounds, and tell me what you changed
  plus anything physical I should double-check myself.
  ```

### Skill 4 · Interactive Talk Animations & 3D (`/html-animation`)
- **Start with a browser page before Blender:** A single offline HTML file is ~15 kB instead of a 50 MB video, needs zero render time, runs smoothly at 60 fps, and lets you pause, step through beats with arrow keys, or drag a physical parameter live during Q&A. Start from the bundled `skills/html-animation/template.html`.
- **Useful tools:**
  - Plain **HTML5 Canvas / SVG** (zero dependencies, opens by double-clicking)
  - [Three.js](https://threejs.org/) (interactive 3D crystals and surfaces in the browser)
  - [smoothstep.io](https://smoothstep.io/) (real-time wave and interference shaders)
  - [MatterViz](https://github.com/janosh/matterviz) (3D Brillouin zones & Fermi surfaces)
  - [Manim Community](https://www.manim.community/) (mathematical derivation animations)
  - [VESTA](https://jp-minerals.org/vesta/en/) & [OVITO](https://www.ovito.org/) (quick crystal structure viewers)
- **Starter prompt:**
  ```text
  Use /html-animation and /render-and-look.
  Starting from template.html, build a single offline HTML animation at talk/<name>.html
  showing <physical phenomenon>, using the exact numbers from <data_file>.
  Include Space to play/pause, Left/Right arrow keys to step through 3 beats, a live
  slider for <parameter>, and ?t=2.5 URL support so any moment can be frozen for checking.
  Capture start, middle, and end screenshots and inspect them.
  ```

### Skill 5 · Scripted 3D Renders with Blender (`/blender-scene`)
- **When to use:** Only when a browser page genuinely isn't enough — photorealistic materials/glass, thousands of objects, or a ray-traced cover still. You don't need to know Blender's menus: Claude writes a Python script (starting from `skills/blender-scene/scene_template.py`) that runs Blender automatically in the background.
- **Starter prompt:**
  ```text
  Use /blender-scene and /render-and-look.
  Starting from scene_template.py, write code/fig_<name>_blender.py to render <3D system>
  from <data_file> automatically via Blender in the background. Keep Standard view transform
  (true colours), orthographic camera, EEVEE, and soft studio lighting. Render ONE still
  frame first, inspect the PNG, and only render an animation once the still looks right.
  ```

---

## Further Reading & Credits

- **Rougier, Droettboom & Bourne (2014)**, "Ten Simple Rules for Better Figures", *PLoS Comput. Biol.* 10, e1003833 — [doi:10.1371/journal.pcbi.1003833](https://doi.org/10.1371/journal.pcbi.1003833)
- **Nicolas P. Rougier**, *Scientific Visualization: Python + Matplotlib* (free open-access book) — [github.com/rougier/scientific-visualization-book](https://github.com/rougier/scientific-visualization-book)
- **Fabio Crameri et al. (2020)**, "The misuse of colour in science communication", *Nature Communications* 11, 5444 — [fabiocrameri.ch/colourmaps](https://www.fabiocrameri.ch/colourmaps/)
- **Claus O. Wilke**, *Fundamentals of Data Visualization* (free online book) — [clauswilke.com/dataviz](https://clauswilke.com/dataviz/)
- **Zhao & Wright (2026)**, *Automating schematic figure making* ([lgwrightlab.github.io/schematic-figure](https://lgwrightlab.github.io/schematic-figure/), CC BY 4.0).
- **Yang et al. (2024)**, *MatPlotAgent* ([arXiv:2402.11453](https://arxiv.org/abs/2402.11453)) — visual self-review raises AI plot accuracy from 49% to 61%.

### Skill Inspirations & Acknowledgements
All five skills in `skills/` (plus starter templates `mbi.mplstyle`, `template.html`, and `scene_template.py`) were written for MBI 2026, inspired by Pramodh's `journal-figure-style`, **K-Dense** `scientific-visualization`, **MatPlotAgent**, **Pirat83** `matplotlib-render-review`, **Wright Lab** `schematic-figure`, the MBI onboarding deck & 6 Nov seminar prototypes, and **Anthropic's** example skills.
