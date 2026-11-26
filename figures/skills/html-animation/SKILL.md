---
name: html-animation
description: Build physics animations and interactive 2D/3D figures for talks as a single self-contained offline HTML page (Canvas 2D, SVG, Three.js, or GLSL shaders) with a pure draw(t)/seek(t) scene, fixed 1600x900 stage, arrow-key beat stepping, ?t= still-frame freeze, and live audience controls. Default choice for talk animations and 3D structures before reaching for Blender.
---

# HTML Animation (`html-animation`)

For 95% of talk animations and 3D lattice/mode visualisations, a **single offline HTML page** beats a rendered video or Blender film: it is 10–30 kB instead of 10–100 MB, needs zero render time, runs live at 60 fps, and lets you pause, step through beats, or drag a physical parameter (temperature, twist angle, momentum $k$) live during Q&A. Use Blender (`blender-scene`) only when a browser genuinely isn't enough (photoreal glass/refraction, very heavy meshes, ray-traced print hero stills).

**Start from `template.html` in this folder** — it is a working 1600×900 1D phonon chain demonstrating the full pattern cleanly.

## 1. Core Architecture (Non-Negotiable Rules)

- **One self-contained file** (`figures/<name>.html` or `talk/<name>.html`) with CSS, HTML, and JS inside. Plain Canvas 2D / SVG pages should open cleanly by double-clicking with zero network access.
- **Fixed 1600×900 stage**, scaled to fit the window (`scale(Math.min(w/1600, h/900))`), so typography and framing look identical on a laptop and a lecture-hall projector.
- **Pure deterministic `draw(t)` (or `seek(t)`) function:** Every frame at time `t` is computed directly from `t` — never accumulated in `dt += ...` state that drifts when scrubbing backward or capturing stills. Put physical parameters (amplitude, frequency, wavevector) as named constants at the top, or embed exact arrays exported from Python.
- **Presentation beats:** Define a `BEATS = [[t0, caption], ...]` list. Wire `ArrowRight`/`PageDown` and `ArrowLeft`/`PageUp` to step between beats (so a slide clicker works), `Space` to play/pause, and `R` to reset parameters.
- **Still-frame export via `?t=`:** If `?t=2.5` is in the URL, start paused at `t = 2.5` (and optionally hide controls with `?chrome=0`) so a headless browser can capture reproducible stills for checking or for the 2-page note.
- **Live controls:** Keep to 1–2 clearly labelled physical sliders/toggles (with units) for the parameter the talk is actually about. Respect `prefers-reduced-motion` where appropriate.

## 2. Which Technology to Pick

| Visual need | Recommended stack |
|---|---|
| 2D chains, lattices, waves, band diagrams, particles | **Canvas 2D** (as in `template.html` — zero dependencies, ~8–20 kB) |
| Crisp build-up schematics, equations, arrows | **Inline SVG** in the HTML page |
| Rotatable 3D crystals, octahedra, Fermi surfaces, spin textures | **Three.js** (vendored locally) |
| Continuous fields, interference, wavefunctions (colour per pixel) | **GLSL shader** (Three.js `ShaderMaterial`, or prototype in `smoothstep.io`) |

- **Three.js offline tip:** Vendor `three.min.js` (classic script, works even from `file://`) or `three.module.js` + addons inside `figures/lib/` (served via `python -m http.server` because browsers block ES module imports on `file://`). Keep lighting clean and colour-accurate: two front lights (low key + soft fill), little ambient light, glossy spheres (`roughness: 0.2`), and **`renderer.toneMapping = THREE.NoToneMapping`** so Crameri colours stay true.

## 3. Physics & Style Discipline

- Animate real physics: displacements from actual normal modes, phases from the real dispersion. If amplitudes are exaggerated for visibility, say so on the slide or aloud.
- Match the talk's background, ink, and Crameri / Paul Tol team colours; reserve one accent colour for the feature the audience should track.
- **Only the element being discussed moves.** Avoid idle wobbling or decorative motion that competes with the speaker.
- Keep text legible from the back of Å4002 (>= 22–30 px on the 1600×900 stage).

## 4. Check It & Optional Video Fallback

1. Capture screenshots at `?t=0`, each beat start, and the end with a headless browser (see `render-and-look`) and inspect them with Claude Code's `Read` tool. Verify zero console errors and zero external network dependencies.
2. Open it yourself and press Arrow keys, Space, and drag the sliders once before the talk.
3. **If a venue requires MP4 (PowerPoint / conference upload):** render `?t=0, 1/30, 2/30, ...` stills and stitch them with:
   ```bash
   ffmpeg -framerate 30 -i frame_%04d.png -pix_fmt yuv420p out.mp4
   ```

---
*Written for MBI 2026; drawing on the MBI onboarding deck, Pramodh's 6 Nov division seminar prototypes, and Anthropic's example web/canvas skills.*
