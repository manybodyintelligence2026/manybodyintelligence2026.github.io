---
name: html-fractal
description: Turn any calculation into a live, animated HTML figure for a talk, a slide or a web page, built the way a fractal is built - level by level, generation by generation, iteration by iteration - with every number on screen computed by the page. Use it whenever someone at the hackathon wants to animate their results, show how a computation converges or grows (iterations of a solver, time steps, generations, refinement levels, parameter sweeps, eigenstates, lattices, fractals), add an interactive figure to a slide deck, or make a data visualisation that a click or a drag can drive, even if they do not say "skill", "fractal", "canvas" or "animation".
---

# /html-fractal: animate a calculation the way a fractal is built

A fractal is a rule applied again and again: cut the middle ninth, add a ring of heptagons, fold the curve. Most
calculations have the same shape. A solver iterates, a simulation steps in time, a lattice grows, a mesh is refined,
a parameter is swept. Showing that sequence one step at a time is often the clearest picture of what the
calculation does. This skill makes such a figure as one HTML file that runs offline in any browser, drops into an
HTML slide deck, and stays honest: what the audience sees is what the page computes.

It distils two figure toolkits (a dark "ember" style for physics explainers and a raymarched gold-fractal library)
and the fractal slide built from them for MBI 2026 (a growing hyperbolic {7,3} lattice, and a Sierpinski carpet that
cuts the next level of holes on each click). `template.html` next to this file is a working example of every rule
below, on a non-fractal calculation (Jacobi relaxation of the Laplace equation). Copy it and replace the model.

## Workflow

1. **Name the sequence.** What is one step of the calculation, and what changes from step to step? Write it in one
   sentence per step; these become the captions. Examples:
   - solver: "iteration k: the residual drops to r_k";
   - growth: "generation g: N(g) sites, N_b of them on the boundary";
   - time evolution: "t = 2.0 ps: the wave packet reaches the barrier";
   - sweep: "B = 0.4 T: the gap closes";
   - fractal: "level n: (8^n - 1)/7 holes, area left (8/9)^n".
2. **Compute first, draw second.** Put the model in plain functions with no drawing in them (`step(state)`,
   `levels(n)`, `observables(state)`). Precompute the steps once if they are cheap (snapshots in typed arrays),
   or compute them in a Web Worker if they are not. Store them so step k can be drawn at any time.
3. **Check the numbers against an independent calculation.** For every number that appears on screen, compute it
   once in Python (numpy/scipy) or by hand and compare with the page: exact counts must agree exactly, floating
   point to about 1e-10, anything approximate to a stated tolerance. Expose the arrays on `window.__fig` so the
   check can read them. This step finds real bugs every time (an off-by-one generation, a mirrored curve, a sign).
4. **Script the beats.** 4 to 10 beats, 2 to 6 s each, one caption each. Write a state function
   `stateAt(t) -> { beat, step, fade, ... }` and draw only from it. Nothing is carried from frame to frame and there is
   no unseeded `Math.random()`, so any moment can be reproduced, linked (`?t=12.5`) and screenshotted.
5. **Draw** with Canvas2D for up to about 10^4 elements, WebGL or three.js beyond that or for 3D. Follow the style
   rules below.
6. **Add interaction only where it explains something.** One click = one more step (the carpet); a drag moves the
   view (a Mobius translation of the hyperbolic disc, a rotation of a 3D object); a double-click resets or starts.
   Say on the figure what a click does.
7. **Verify in a browser**: open it, look at several times (`?t=`), click through the interactions, check the
   console is clean, check a phone-width window if it will be on the web. Look at the screenshots yourself.
8. **Caption honestly**: model, parameters, units, system size, what is computed live and what is precomputed,
   and any approximation or deviation from the source paper.

## Rules that make the figure good

**Time and motion**
- Every frame is a pure function of t. Ease with smoothstep `s*s*(3-2*s)`; fade a new step in over 0.6-0.9 s.
- When a step adds something, the new part is the one that glows; older parts cool down to the structure colour.
  One hot thing per frame reads best.
- Loop long sequences, or hold the last state. If the figure should wait for the speaker, start paused on step 0
  and start on a click or double-click ("double-click to start" in the HUD).
- A `SPEED` constant scales the clock; tune it on the real slide, not in the code editor.
- Respect `prefers-reduced-motion`: show one representative still and make clicks jump instead of animate.

**Numbers on screen**
- HUD: live values only, tabular numbers, the symbol in italic serif (`N`, `g`, `D`), the value in bold.
- Show the formula next to the counted number when there is one ("holes 73 = (8^n - 1)/7") and count the number
  from what is drawn, not from the formula, so the two agreeing is visible evidence.
- Never type in a number the page could compute.

**Look** (pick one style per deck and keep it)
- Dark "ember" style: background #08040d -> #170b21, structure in violet/lilac (#7d4fc0, #b3a5c9), computed "hot"
  quantities in ember (#fff1e0, #ffc49b, #ff8f45, #ff5a1f, #e3262f). Light paper style: the deck's own tokens
  (for the MBI figures deck: paper #f6f4ef, principles teal #1d5e57, aesthetics ochre #a85513).
- Colour maps: perceptually uniform and colour-blind safe (Crameri batlow, vik for signed data centred on 0); never
  jet or rainbow.
- Glow without a bloom pass: stroke the same path three times - wide dim halo (9 px, alpha .10), medium halo
  (4 px, .28), thin bright core (1.3 px, .95). Scale the widths down when the elements get small.
- Caption box top-left in a dark translucent box, one sentence; HUD bottom-left; nothing over the data.

**Performance**
- Batch: build one `Path2D` (or one `beginPath`) per colour and fill/stroke it once, not once per element.
- Skip elements below about half a pixel; they only cost time.
- Draw only while the figure is visible and something moves; otherwise draw once and stop the
  `requestAnimationFrame` loop.
- Size the canvas backing store from `getBoundingClientRect()` x devicePixelRatio (capped at 2), and draw in the
  canvas's CSS units with `ctx.setTransform`. This keeps it sharp inside a deck that scales its 1600x900 stage.

## Putting it into an HTML slide deck

- Give the figure its own `<section>` and its own `(() => { ... })()` or `<script type="module">` block; do not
  edit the deck's navigation code.
- React to the slide being shown or hidden with a `MutationObserver` on the section's class (most hand-written decks
  toggle a class such as `on` or `present`): start or reset the clock when it appears, stop drawing and **pause any
  `<video>`** when it disappears (a hidden video keeps playing its sound).
- Keys: the deck listens for arrows and Space on `window`. Stop Space on a focused `<video>` with
  `e.stopPropagation()` so it plays/pauses instead of changing slide. Clicks on a canvas do not change slides.
- An `<iframe>` with a demo inside takes keyboard focus; after clicking in it, the arrow keys stop working until
  the presenter clicks outside or uses the deck's on-screen arrows. Embed directly in the slide when possible.
- Embed a video with `<video src="media/clip.mp4" controls preload="metadata" playsinline>`; keep the file next to
  the deck (GitHub accepts files up to 100 MB; GitHub Pages serves mp4 with range requests).
- Opening the deck by double-click (`file://`): separate ES-module files do not load there. Inline the code, or
  serve the folder (`python -m http.server`) while developing. Inline module scripts work in both.
- To reuse tested code (for example a geometry library from a website), copy it into the page at build time with a
  small script rather than rewriting it; then a fix in the original reaches the slide by rebuilding.

## Ideas: the fractal pattern applied to other calculations

| Calculation | One step | What glows | HUD | Interaction |
|---|---|---|---|---|
| iterative solver (Jacobi, SCF, DMRG sweeps) | one iteration | the change since the last one | residual, energy | click = next iteration |
| time evolution | one time step | the current wave packet / density | t, norm, energy | drag a slider in t |
| lattice or graph growth | one generation | the new ring | N, N_b, N_b/N | drag to move the view |
| mesh / k-grid refinement | one refinement level | the new points | grid size, converged value | click = refine |
| parameter sweep | one parameter value | the state at that value | parameter, gap, order parameter | slider |
| spectrum | one eigenstate | its weight on the sites | E_n, IPR | click = next state |
| Monte Carlo / annealing | one sweep (fixed seed) | flipped spins | T, magnetisation | play / pause |
| fractals | one level | the new holes / copies | count, area, D = log N / log s | click = next level |

## Files

- `template.html`: a working single-file example (Laplace equation relaxed by Jacobi iteration on a grid; heat map
  in a colour-blind safe map; click = more iterations, double-click = start/reset, `?t=` seek, HUD with the
  residual, `window.__fig` for checks). Copy it, replace `model` and `stateAt`, keep the rest.
