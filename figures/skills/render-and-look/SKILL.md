---
name: render-and-look
description: Visual inspection and repair loop for any generated figure, schematic, slide, or animation frame. Renders a PNG at final size, opens it directly with Claude Code's Read tool so Claude actually sees the pixels, checks readability, hierarchy, and physics like a referee, fixes concrete defects for at most 3 rounds, and reports what was checked and what could not be checked. Use immediately after generating or changing anything visual, or when asked "does this look right?".
---

# Render and Look (`render-and-look`)

You cannot see a figure from its code. Render it, open the PNG with Claude Code's `Read` tool, and inspect it like a skeptical referee. Visual feedback gives the largest single jump in figure quality (MatPlotAgent: `48.9 -> 53.4 -> 61.2`), and even careful groups catch physics and layout bugs only when inspecting the pixels.

## 1. Render at the Final Size

- **Matplotlib / Python plots:** Save a PNG at the final physical size, 200–300 dpi (`fig.savefig("figures/out.png", dpi=250)`). Avoid `bbox_inches="tight"` when exact column width matters.
- **SVG / LaTeX / TikZ:** Compile or convert to PNG (`pdftoppm -png -r 220`, Inkscape, or headless browser) so you inspect the rasterized pixels.
- **HTML pages & animations:** Capture screenshots at slide size (`1600x900`) at **at least three moments** — start, middle, and end (e.g. `?t=0`, `?t=2`, `?t=6` if the page supports `?t=`):
  - **Windows (Edge):**
    `msedge --headless --screenshot="C:\full\path\shot.png" --window-size=1600,900 "file:///C:/full/path/page.html?t=2"`
    *(Chrome works the same with `chrome`; for pages using WebGL or ES module imports, serve locally with `python -m http.server 8000` and pass `http://127.0.0.1:8000/...` with `--headless=new --enable-webgl --use-gl=angle --use-angle=swiftshader`.)*
  - **macOS (Chrome):**
    `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=/full/path/shot.png --window-size=1600,900 "file:///full/path/page.html?t=2"`

## 2. Look at It (Must Use `Read`)

Open every rendered PNG with Claude Code's **`Read`** tool. **Never skip this step** and never claim you inspected an image you did not open.

Check the pixels item by item and write concrete observations (*"y-label overlaps colorbar ticks"* — never *"looks good"*):

**Can it be read? (Scan every label and inset one by one)**
- Treat **every text annotation as guilty of colliding with something** until you visually clear it: does any label touch or graze a curve, filled peak, legend, panel border, or arrow? If tight, move it to open whitespace with a short leader arrow.
- Does any dashed reference line, gridline, or contour **cut through text**? Add a background-matched `bbox` halo so the line breaks cleanly around the text.
- Does any **inset** (BZ diagram, zoom box) cover data curves, or do any peaks/bands clip unintentionally against an axis spine?
- Are all **math symbols, subscripts, superscripts, and negative tick signs (`−`)** rendered cleanly (zero missing-glyph boxes and zero raw underscores like `L_M` or `v_F`)?
- Is the smallest text readable at final size? (Paper: >= 6 pt; full-size 16:9 slide: >= 14 pt.)
- Does every axis carry a physical quantity and units (or dimensionless ratio)? Does every colour-mapped panel have a labelled colorbar? Are diverging maps centred on zero and `jet`/`rainbow` absent?
- Are multi-panel edges aligned, with consistent fonts, panel letters, and line widths?

**Does it say what it should?**
- Where does the eye land in the first 5 seconds? Is that the main result?
- Is anything on the canvas distracting or redundant? Remove it.
- Could a colleague from the other half of the division understand it quickly with the caption?

**Is the physics right?** *(the check that matters most)*
- Do limits, signs, symmetries, high-symmetry points, node locations, band crossings, and orders of magnitude match the calculation and text?
- Any plotting artefacts (wrap-around lines, `NaN` gaps drawn as zero, swapped axes, wrong aspect ratio)?
- For schematics: are arrows, ray paths, lattice vectors, and labels physically true — not merely tidy?
- **Data honesty:** No silent smoothing, dropped points, or unlabelled rescaling.

## 3. Fix and Repeat — Maximum 3 Rounds

Fix concrete defects in the generating script (never paint over the PNG), re-render, and re-read. **Stop after at most 3 rounds.** If a subtle issue remains after round 3, stop and flag it concisely rather than spinning indefinitely.

## 4. Required Final Report

Write a compact 4–6 line summary with the **final PNG path** so the physicist can inspect it too — their eyes are the final check:

```text
Visual check (figures/bands_pdos.png, round 2/3):
- Readability & collisions: pass — widened gap between panels (a) and (b); colorbar ticks clear.
- Axes, units & colour: pass — E - E_F (eV), Gamma-X-M-Gamma ticks, Crameri batlow colorbar labelled "d-orbital weight".
- Physics sanity: pass — band crossing at E_F matches PDOS peak; symmetry along M-Gamma verified.
- Could not check: exact experimental lattice constant from the draft caption (please verify).
```

---
*Written for MBI 2026; drawing on MatPlotAgent (Yang et al., 2024), Pirat83 `matplotlib-render-review`, and Zhao & Wright (2026).*
