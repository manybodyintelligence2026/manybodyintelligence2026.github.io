---
name: figure-style
description: House style for scientific data figures (plots, maps, multi-panel figures) for a paper, a team note, or a talk at Many-Body Intelligence 2026. Enforces Crameri perceptually uniform colour maps, exact journal or slide canvas widths, legible font thresholds, labelled colorbars, shared .mplstyle conventions, and strict data honesty while following the MBI repo layout (code/fig_<name>.py -> figures/<name>.pdf). Use whenever creating, styling, or polishing a scientific plot.
---

# Figure Style (`figure-style`)

**Principles vs. Aesthetics:** A figure has one job — make one point quickly and honestly. This skill enforces the objective **design principles** automatically (legible font thresholds for the target medium, Crameri colour-map class matching data symmetry, CVD-safety, zero label collisions, honest data) so the physicist stays free to choose the **aesthetics** (typeface, palette within the right class, visual composition) and every figure from the team matches, whoever's Claude made it.

## 1. Before You Plot (MBI 2026 Conventions)

- **State the takeaway in one sentence:** Ask, or read from context, what the figure must show in 5 seconds. If nobody can say it, the figure isn't ready to make.
- **Ask where it goes:** Paper column, team note, or slide. Canvas size and font threshold follow from that — never shrink a giant figure afterwards.
- **One script per figure:** `code/fig_<name>.py` reads the data and writes `figures/<name>.pdf` (vector, for the 2-page note) and `figures/<name>.png` (200–300 dpi, for slides and visual review). Put data paths, model parameters, and seeds/commit info at the top of the script.
- **Never edit `.claude/` inside a team repo.** Copy this skill's `mbi.mplstyle` into your team repo as `code/team.mplstyle` and load it with `plt.style.use("code/team.mplstyle")`.

## 2. Sizes (Draw at Final Size — Never Scale Afterwards)

| Target | Width | Font size (base / ticks) |
|---|---|---|
| Paper, 1-column (`aps-single` / `nature-single`) | 8.6 cm (3.39 in) / 8.9 cm (3.50 in) | 7–8 pt / 6.5–7 pt (never below 6 pt) |
| Paper, 2-column (`aps-double` / `nature-double`) | 17.8 cm (7.01 in) / 18.3 cm (7.20 in) | 7–8 pt / 6.5–7 pt (never below 6 pt) |
| Team 2-page note | 16.0 cm (6.30 in) | 9 pt / 8 pt |
| Slide (full 16:9 canvas, `13.3 × 7.5 in`) | 13.3 in (or the box it fills) | 16–20 pt; nothing below 14 pt |
| Slide (compact `160 × 90 mm` export) | 16.0 cm (6.30 in) | 10.5–12 pt; nothing below 9 pt |

- **Line floor:** Spines `0.55–0.6 pt`, data lines `1.1–1.4 pt` in print (`2.0 pt` on full-size slides), guides `0.5–0.7 pt` (never below `0.3 pt`).
- **Vector text:** Keep `pdf.fonttype = 42` and `svg.fonttype = 'none'` so text stays sharp and editable in PDF/LaTeX.

## 3. Colour Rules (Crameri Scientific Colour Maps)

Use Fabio Crameri's Scientific Colour Maps (`pip install cmcrameri`, `import cmcrameri.cm as cmc`). They are perceptually uniform, colour-vision-deficiency safe, and readable in greyscale. (Fall back to `cividis`/`viridis` or Paul Tol palettes only if `cmcrameri` is unavailable.)

- **Never use `jet`, `rainbow`, `hsv`, `turbo`, or red–green pairs (`r`/`g`):** they inject false edges into smooth data and fail for ~8% of male readers.

| Data symmetry | Recommended Crameri maps | Principle to enforce |
|---|---|---|
| **Sequential** (density, spectral weight, DOS, intensity) | `cmc.batlow`, `cmc.lajolla`, `cmc.oslo`, `cmc.lipari`, `cmc.glasgow` | Monotonic lightness; always attach a labelled colorbar with units. |
| **Diverging** (order parameter, $\Delta\rho$, spin, Berry curvature) | `cmc.vik`, `cmc.cork`, `cmc.bam`, `cmc.roma`, `cmc.berlin` | **Always centre on the meaningful zero** (`TwoSlopeNorm(vcenter=0)` or symmetric `vmin=-M, vmax=M`). |
| **Cyclic** (phase $\theta \in [-\pi, \pi]$, angle, Bloch phase) | `cmc.romaO`, `cmc.vikO`, `cmc.bamO`, `twilight` | Endpoints must wrap seamlessly with no artificial seam. |
| **Categorical** (2–6 curves or orbitals) | `cmc.batlowS` (skip very pale entries) or Paul Tol (`#0077BB`, `#EE7733`, `#009988`, `#CC3311`, `#AA3377`) | Pair colour with line styles (`-`, `--`, `:`), markers, or direct labels so greyscale print still reads clearly. |
| **Context / guides** | Neutral grey (`#B8B8B8` bulk, `#555555` guides, `#EAECEF` shaded bands) | Reserve saturated colour for the physics the eye should hit first. |

- Say `$\log_{10}$` explicitly when a colour scale is logarithmic, and use `extend='both'` / `'max'` arrows whenever values are clipped.

## 4. Layout, Axes, and Micro-Polish (Anti-Collision Rules)

- **Quantity + units on every axis and colorbar:** e.g. `$E - E_F\ (\mathrm{eV})$`, `$\omega / \omega_z$`, `$q_y\ (\mu\mathrm{m}^{-1})$` — never bare `E`, `q`, or `w`.
- **LaTeX-style math & minus signs:** `mbi.mplstyle` uses `mathtext.fontset: cm`, `STIXGeneral`, and `axes.formatter.use_mathtext: True` so equations, subscripts, and negative tick signs (`−`) render cleanly like LaTeX without needing a TeX install. Never leave literal underscores (`L_M`, `v_F`) in rendered labels.
- **Direct labels beat legends** when 2–4 curves are clearly separated; otherwise keep legends frameless (`legend.frameon: False`).
- **Keep every text label in genuine whitespace:** Peak tags, curve labels, and callouts must have visible breathing room from every curve, filled region, spine, and guide line. If the feature is tight, place the label in nearby open whitespace and connect it with a short thin leader arrow (`arrowprops`).
- **Never let lines strike through text:** Whenever a label sits on or near a dashed reference line, contour, or shaded region, give it a background-matched halo (`bbox=dict(facecolor=<panel_bg>, edgecolor="none", pad=1.2)`) so the line breaks cleanly around the text.
- **Insets belong only in verified empty pockets:** Never place an inset (Brillouin zone, zoom box, mini-schematic) over data curves — check open corners or adjust `ylim`/margins so both the curves and inset breathe cleanly.
- **No accidental clipping:** Check that band extrema, peaks, and error bars clear the top/bottom spines with a small margin unless intentionally zoomed (and annotated).
- **Panel letters & alignment:** Consistent `(a)`, `(b)`, `(c)` (APS) or `a`, `b`, `c` (Nature) at top-left, same size and weight everywhere; share axes (`sharex`/`sharey`) across linked panels and remove clutter (heavy grids, legend boxes, redundant titles).

## 5. Data Honesty (Non-Negotiable)

- Never smooth, clip, drop outliers, or truncate axes to make a figure look cleaner without explicitly annotating it in both the script and the caption.
- Never synthesize or silently interpolate across missing data points.
- If you add a guide-to-the-eye curve or schematic arrow on top of numerical data, label it explicitly as a guide.

## 6. Starter Boilerplate

```python
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import cmcrameri.cm as cmc

MM = 1.0 / 25.4
plt.style.use(Path(__file__).with_name("team.mplstyle"))  # copied from mbi.mplstyle

fig, axs = plt.subplots(1, 2, figsize=(178 * MM, 68 * MM), constrained_layout=True)
# ... plot checked data with cmc.batlow / cmc.vik, units, panel letters, labelled colorbar ...

out = Path("figures/my_result")
out.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(out.with_suffix(".pdf"))
fig.savefig(out.with_suffix(".png"), dpi=250)
plt.close(fig)
```

## 7. After You Plot

Immediately run the script, render the PNG at final size, and inspect it with **`render-and-look`** (open the PNG using Claude Code's `Read` tool) before calling the figure done.

---
*Written for MBI 2026; drawing on Crameri et al. (2020), Rougier et al. (2014), Rougier's Scientific Visualization with Matplotlib, Pramodh's `journal-figure-style`, and K-Dense `scientific-visualization`.*
