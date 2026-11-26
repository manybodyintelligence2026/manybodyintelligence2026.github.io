---
name: blender-scene
description: Headless 3D renders and animations in Blender driven by a Python script (blender -b --factory-startup -P scene.py) using pure bpy.data/bmesh API, Standard view transform, orthographic cameras, soft studio lighting, EEVEE by default, and a still-first render-and-look workflow. Use only when HTML/JS (html-animation) is not enough (photoreal materials, heavy 3D geometry, or print-quality ray-traced stills).
---

# Headless Blender Scene (`blender-scene`)

First ask whether Blender is genuinely needed. For most talk animations an HTML page (`html-animation`) is live, interactive, kilobytes instead of megabytes, and takes 0 s to render. Blender earns its place for **photorealistic materials/glass**, **very heavy 3D geometry** (thousands of objects, volumetric isosurfaces), and **print-quality 3D hero stills**.

**Start from `scene_template.py` in this folder** — a working headless rock-salt crystal with camera, lights, world, and Blender 4.x/5.x EEVEE settings already solved. Change its `PARAMETERS` block and geometry function; keep the rest.

## 1. How to Run It Headlessly

Always drive Blender from a reproducible script (`code/fig_<name>_blender.py`) — never rely on a hand-clicked `.blend` file:

```bash
blender -b --factory-startup -P code/fig_scene_blender.py -- --out figures/scene.png
```

- **Windows:** If `blender` is not on `PATH`, call the full executable path, e.g. `"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"`.
- **`--factory-startup`** ignores local user preferences so the render is reproducible across machines.
- Arguments after `--` are passed straight to your Python script.

## 2. Rules That Avoid the Usual Headless Failures

- **Use the data API (`bpy.data.objects.new`, `bmesh`), never `bpy.ops` for building geometry.** Operators depend on UI window context and can silently do nothing in headless mode.
- **Expect Blender version differences:** Print `bpy.app.version_string` once. For EEVEE compatibility across Blender 4.x and 5.x, check available engines dynamically (or try `BLENDER_EEVEE` / `BLENDER_EEVEE_NEXT` cleanly as in `scene_template.py`).
- **Colour management — always use `Standard` view transform:**
  `scene.view_settings.view_transform = "Standard"` and `look = "None"`. Default `AgX`/`Filmic` desaturates Crameri colours and turns clean light backgrounds muddy grey.
- **Engine — EEVEE first, Cycles only if needed:** EEVEE renders in seconds per frame; switch to `CYCLES` (with denoising) only for a single final hero still that requires true glass/refraction or ray-traced shadows.
- **Orthographic camera for crystals and lattices:** Set `cam_data.type = "ORTHO"` and point with `(-VIEW).to_track_quat("-Z", "Y").to_euler()`. Remember that `ortho_scale` sets the **larger** (horizontal) dimension of the frame — so on a 16:9 image, explicitly scale for height (`height * RES[0] / RES[1]`). Use mild perspective (50–85 mm) only for cover/hero renders.
- **Calm studio lighting & Crameri materials:** Key + fill `AREA` lights from the front and slightly low, a subtle rim light behind, plain calm neutral `World` background, and glossy materials (`Roughness ~ 0.2`) using colours from the team style (`figure-style`).

## 3. Stills First, Animation Second

1. Render **one still** at draft/final resolution and inspect it with **`render-and-look`** (open the PNG with Claude Code's `Read` tool): check framing, lighting, colours, and physics.
2. Fix defects and confirm the final still.
3. Only then render an animation: set **keyframes on object properties** (not frame handlers), check start/middle/end frames first, then render the full frame sequence and assemble with:
   ```bash
   ffmpeg -framerate 30 -i frame_%04d.png -pix_fmt yuv420p out.mp4
   ```

## 4. Required Report

Report the **Blender version**, **render engine**, **render time**, **output size**, and **output path** so the team can verify the visual and judge whether Blender was worth the cost over HTML.

---
*Written for MBI 2026.*
