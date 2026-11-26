"""Template: a rock-salt crystal rendered headless with Blender.

Run (no Blender window opens):
    blender -b --factory-startup -P scene_template.py -- --out crystal.png
Windows: use the full path, e.g. "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe".

Everything is built from data with the bpy data API (no bpy.ops, which can silently do nothing
when Blender runs without a window). Change the PARAMETERS block, not the code below it.
"""
import math
import os
import sys
import time

import bpy
from mathutils import Vector

# ---- PARAMETERS ------------------------------------------------------------------------------
N = 2                     # conventional cubic cells per side
A = 1.0                   # distance between neighbouring atoms (Blender units)
RADII = (0.30, 0.20)      # sphere radius for the two species
COLOURS = ((0.07, 0.17, 0.36, 1), (0.96, 0.62, 0.42, 1))   # dark blue and orange (from Crameri batlow)
VIEW = Vector((1.0, 0.8, 0.6))   # camera direction, from the crystal towards the camera
RES = (1600, 900)
SAMPLES = 32
# ------------------------------------------------------------------------------------------------

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = argv[argv.index("--out") + 1] if "--out" in argv else "crystal.png"
t0 = time.time()

scene = bpy.context.scene
for ob in list(bpy.data.objects):          # start from an empty scene
    bpy.data.objects.remove(ob, do_unlink=True)


def material(name, rgba, roughness=0.2):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    return m


def sphere_mesh(name, radius, material_):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material_)
    return me


meshes = [sphere_mesh("atom%d" % s, RADII[s], material("species%d" % s, COLOURS[s])) for s in (0, 1)]
M = 2 * N + 1                              # atoms per edge, so the cubes are closed
centre = Vector(((M - 1) * A / 2,) * 3)
for i in range(M):
    for j in range(M):
        for k in range(M):
            s = (i + j + k) % 2                # rock salt: species alternate
            ob = bpy.data.objects.new("a_%d_%d_%d" % (i, j, k), meshes[s])
            ob.location = Vector((i * A, j * A, k * A)) - centre
            scene.collection.objects.link(ob)

# camera: orthographic, looking at the centre along -VIEW
cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
# ortho_scale sets the larger (horizontal) side; fit the crystal's height with a margin
cam_data.ortho_scale = 1.95 * (M - 1) * A * RES[0] / RES[1]
cam = bpy.data.objects.new("cam", cam_data)
cam.location = VIEW.normalized() * 30
cam.rotation_euler = (-VIEW).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(cam)
scene.camera = cam

# lights: a key and a fill from the front, low; a weak rim from behind
def area_light(name, energy, size, direction):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy, ld.size = energy, size
    ob = bpy.data.objects.new(name, ld)
    ob.location = direction.normalized() * 20
    ob.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(ob)

area_light("key", 1800, 8, Vector((1.2, 0.2, 0.9)))
area_light("fill", 700, 10, Vector((0.2, 1.2, 0.3)))
area_light("rim", 500, 6, Vector((-1, -1, 1)))

# world: plain light grey, so the background is calm
world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.92, 0.91, 0.89, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
scene.world = world

# render settings: EEVEE (fast), Standard view transform (true colours), PNG at slide size
for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
try:
    scene.eevee.taa_render_samples = SAMPLES
except AttributeError:
    pass
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x, scene.render.resolution_y = RES
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.abspath(out)

bpy.ops.render.render(write_still=True)
print("Rendered %s with %s in %.1f s" % (scene.render.filepath, scene.render.engine, time.time() - t0))
