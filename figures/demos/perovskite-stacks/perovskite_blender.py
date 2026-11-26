"""Headless Blender 5.3 demo: 2x2x2 ABO3 perovskite octahedral tilt phonon mode.

Supports three modes:
  --mode cycles : Photoreal Cycles ray-traced hero still (refractive glass octahedra,
                  brushed metal/ceramic ions, soft studio shadows & DOF -> blender_cycles.png)
  --mode still  : Fast EEVEE still (-> blender_still.png)
  --mode anim   : Fast EEVEE animation frames (-> frames/f_###.png)

Run headlessly:
    "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" -b --factory-startup -P perovskite_blender.py -- --mode cycles
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
A_LAT = 2.0
AMP_DEG = 12.0


def parse_mode() -> str:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if "--mode" in argv:
        i = argv.index("--mode")
        if i + 1 < len(argv):
            return argv[i + 1]
    return "cycles"


def srgb_to_lin(rgb):
    return tuple(c ** 2.2 for c in rgb)


def make_mat(
    name: str,
    srgb,
    roughness: float = 0.22,
    metallic: float = 0.1,
    alpha: float = 1.0,
    transmission: float = 0.0,
    ior: float = 1.46,
    coat: float = 0.0,
    coat_roughness: float = 0.05,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*srgb_to_lin(srgb), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = ior
    if transmission > 0.0 and "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if coat > 0.0 and "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        if "Coat Roughness" in bsdf.inputs:
            bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def make_sphere_mesh(name: str, radius: float, mat, u_seg: int = 40, v_seg: int = 24):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    return mesh


def make_octahedron_mesh(name: str, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [
        bm.verts.new((1, 0, 0)),
        bm.verts.new((-1, 0, 0)),
        bm.verts.new((0, 1, 0)),
        bm.verts.new((0, -1, 0)),
        bm.verts.new((0, 0, 1)),
        bm.verts.new((0, 0, -1)),
    ]
    faces = [
        (0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4),
        (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5),
    ]
    for f in faces:
        bm.faces.new([verts[i] for i in f])
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    return mesh


def make_oct_struts_mesh(name: str, mat, radius: float = 0.017):
    """Build 12 sleek metallic edge struts + 6 subtle inner B-O rods in one bmesh."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = [
        Vector((1, 0, 0)), Vector((-1, 0, 0)),
        Vector((0, 1, 0)), Vector((0, -1, 0)),
        Vector((0, 0, 1)), Vector((0, 0, -1)),
    ]
    edges = [
        (0, 2), (2, 1), (1, 3), (3, 0),
        (0, 4), (1, 4), (2, 4), (3, 4),
        (0, 5), (1, 5), (2, 5), (3, 5),
    ]

    def add_rod(p1: Vector, p2: Vector, r: float):
        diff = p2 - p1
        length = diff.length
        mid = 0.5 * (p1 + p2)
        rot = Vector((0, 0, 1)).rotation_difference(diff.normalized()).to_matrix().to_4x4()
        mat_xform = Matrix.Translation(mid) @ rot
        bmesh.ops.create_cone(
            bm, cap_ends=False, segments=14,
            radius1=r, radius2=r, depth=length, matrix=mat_xform
        )

    for i, j in edges:
        add_rod(pts[i], pts[j], radius)
    for p in pts:
        add_rod(Vector((0, 0, 0)), p * 0.85, radius * 1.35)

    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    return mesh


def add_studio_floor(scene, z_floor: float = -2.35):
    """Clean seamless studio floor catching soft ray-traced contact shadows."""
    mesh = bpy.data.meshes.new("StudioFloor")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=90.0)
    bm.to_mesh(mesh)
    bm.free()
    mat_floor = make_mat("StudioFloorMat", (0.945, 0.935, 0.915), roughness=0.48, metallic=0.0, coat=0.06, coat_roughness=0.28)
    mesh.materials.append(mat_floor)
    obj = bpy.data.objects.new("StudioFloor", mesh)
    obj.location = (0.0, 0.0, z_floor)
    scene.collection.objects.link(obj)


def build_scene(res_x: int, res_y: int, use_cycles: bool = False):
    scene = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)

    if use_cycles:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 96
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 10
        scene.cycles.diffuse_bounces = 4
        scene.cycles.glossy_bounces = 6
        scene.cycles.transmission_bounces = 10
        scene.cycles.transparent_max_bounces = 8
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"
        scene.view_settings.exposure = 0.05
    else:
        engines = {e.identifier for e in scene.render.bl_rna.properties["engine"].enum_items}
        scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"

    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.image_settings.file_format = "PNG"

    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    if use_cycles:
        # Soft warm ivory studio ambient light
        bg.inputs["Color"].default_value = (*srgb_to_lin((0.955, 0.945, 0.925)), 1.0)
        bg.inputs["Strength"].default_value = 0.65
    else:
        bg.inputs["Color"].default_value = (*srgb_to_lin((0.90, 0.878, 0.847)), 1.0)
        bg.inputs["Strength"].default_value = 0.92

    if use_cycles:
        # Photoreal materials: brushed sapphire metal B, glossy glazed ceramic O, champagne-silver A, refractive glass BO6!
        mat_b = make_mat("B_site", (0.07, 0.24, 0.48), roughness=0.14, metallic=0.82, coat=0.5, coat_roughness=0.05)
        mat_o = make_mat("O_site", (0.83, 0.34, 0.20), roughness=0.14, metallic=0.05, coat=0.85, coat_roughness=0.04)
        mat_a = make_mat("A_site", (0.82, 0.78, 0.71), roughness=0.16, metallic=0.90, coat=0.3)
        mat_oct = make_mat("Oct_Glass", (0.58, 0.78, 0.93), roughness=0.04, metallic=0.0, transmission=0.90, ior=1.45, coat=0.45, coat_roughness=0.02)
        mat_strut = make_mat("Oct_Strut", (0.10, 0.22, 0.36), roughness=0.22, metallic=0.85)
    else:
        mat_b = make_mat("B_site", (0.086, 0.235, 0.400), roughness=0.22, metallic=0.25)
        mat_o = make_mat("O_site", (0.831, 0.416, 0.263), roughness=0.26, metallic=0.10)
        mat_a = make_mat("A_site", (0.608, 0.576, 0.533), roughness=0.30, metallic=0.22)
        mat_oct = make_mat("Oct", (0.165, 0.361, 0.541), roughness=0.18, metallic=0.05, alpha=0.42)
        mat_strut = None

    b_mesh = make_sphere_mesh("B_Mesh", 0.30 if use_cycles else 0.28, mat_b)
    o_mesh = make_sphere_mesh("O_Mesh", 0.19 if use_cycles else 0.185, mat_o)
    a_mesh = make_sphere_mesh("A_Mesh", 0.35 if use_cycles else 0.32, mat_a)
    oct_mesh = make_octahedron_mesh("BO6_Mesh", mat_oct)
    strut_mesh = make_oct_struts_mesh("BO6_Struts", mat_strut) if use_cycles else None

    if use_cycles:
        add_studio_floor(scene, z_floor=-2.38)

    # Central A-site cation
    a_obj = bpy.data.objects.new("A_center", a_mesh)
    scene.collection.objects.link(a_obj)

    oct_groups = []
    o_dirs = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
    for ix in range(2):
        for iy in range(2):
            for iz in range(2):
                parent = bpy.data.objects.new(f"OctGrp_{ix}{iy}{iz}", None)
                scene.collection.objects.link(parent)
                base = Vector(((ix - 0.5) * A_LAT, (iy - 0.5) * A_LAT, (iz - 0.5) * A_LAT))
                parent.location = base

                bm_obj = bpy.data.objects.new(f"B_{ix}{iy}{iz}", b_mesh)
                bm_obj.parent = parent
                scene.collection.objects.link(bm_obj)

                om_obj = bpy.data.objects.new(f"Oct_{ix}{iy}{iz}", oct_mesh)
                om_obj.parent = parent
                scene.collection.objects.link(om_obj)

                if strut_mesh is not None:
                    st_obj = bpy.data.objects.new(f"Strut_{ix}{iy}{iz}", strut_mesh)
                    st_obj.parent = parent
                    scene.collection.objects.link(st_obj)

                for k, d in enumerate(o_dirs):
                    ox = bpy.data.objects.new(f"O_{ix}{iy}{iz}_{k}", o_mesh)
                    ox.location = d
                    ox.parent = parent
                    scene.collection.objects.link(ox)

                parity = (1 if (ix + iy) % 2 == 0 else -1) * (1 if iz % 2 == 0 else -1)
                oct_groups.append((parent, base, parity))

    # Camera: gentle studio telephoto perspective with subtle DOF for Cycles hero; ortho for EEVEE
    cam_data = bpy.data.cameras.new("Cam")
    if use_cycles:
        cam_data.type = "PERSP"
        cam_data.lens = 72.0
        az, el, dist = 0.62, 0.36, 15.0
        target = Vector((0.0, 0.0, -0.15))
    else:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = 8.4
        az, el, dist = 0.62, 0.44, 18.0
        target = Vector((0.0, 0.0, 0.0))

    cam_obj = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = Vector((
        dist * math.cos(el) * math.sin(az),
        -dist * math.cos(el) * math.cos(az),
        dist * math.sin(el),
    ))
    cam_obj.rotation_euler = (target - cam_obj.location).to_track_quat("-Z", "Y").to_euler()

    if use_cycles:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_distance = (target - cam_obj.location).length - 0.6
        cam_data.dof.aperture_fstop = 4.5

    scene.camera = cam_obj

    def add_area(name, loc, energy, size, col=(1, 1, 1), size_y=None):
        ld = bpy.data.lights.new(name, type="AREA")
        ld.energy = energy
        ld.size = size
        if size_y is not None:
            ld.shape = "RECTANGLE"
            ld.size_y = size_y
        ld.color = col
        lo = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, -0.2)) - lo.location).to_track_quat("-Z", "Y").to_euler()

    if use_cycles:
        # Crisp studio 3-softbox lighting for dramatic glass Fresnel + clean soft contact shadows
        add_area("KeySoftbox", (8.0, -8.5, 11.0), 1750, 6.0, (1.0, 0.97, 0.93), size_y=8.0)
        add_area("CoolFill", (-9.0, -6.0, 5.5), 780, 7.5, (0.86, 0.93, 1.0))
        add_area("WarmRim", (-2.0, 10.5, 7.5), 1150, 6.5, (1.0, 0.94, 0.86))
    else:
        add_area("Key", (9, -10, 13), 1400, 8, (1.0, 0.98, 0.95))
        add_area("Fill", (-10, -8, 6), 600, 9, (0.88, 0.94, 1.0))
        add_area("Rim", (0, 12, 8), 480, 9, (1.0, 0.96, 0.92))

    return scene, oct_groups


def set_phase(oct_groups, t: float) -> None:
    phi = math.radians(AMP_DEG) * math.sin(2.0 * math.pi * t)
    c = math.cos(phi)
    for parent, base, parity in oct_groups:
        parent.location = (base.x * c, base.y * c, base.z)
        parent.rotation_euler = (0.0, 0.0, parity * phi)


def main() -> None:
    mode = parse_mode()
    tpath = HERE / "timing.json"
    timing = json.loads(tpath.read_text(encoding="utf-8")) if tpath.exists() else {}
    timing["blender_version"] = bpy.app.version_string

    if mode == "cycles":
        t0 = time.perf_counter()
        scene, octs = build_scene(1200, 960, use_cycles=True)
        set_phase(octs, 0.22)
        out = HERE / "blender_cycles.png"
        scene.render.filepath = str(out)
        bpy.ops.render.render(write_still=True)
        dt = time.perf_counter() - t0
        timing["cycles_s"] = round(dt, 1)
        timing["cycles_kb"] = round(out.stat().st_size / 1024, 1)
        tpath.write_text(json.dumps(timing, indent=2), encoding="utf-8")
        print(f"Cycles hero rendered in {dt:.1f}s ({timing['cycles_kb']} kB) -> {out}")
    elif mode == "cycles_anim":
        # Exact cosine symmetry: phi(t) = -AMP_DEG * cos(2*pi*t) has 13 unique poses for a 24-frame seamless loop!
        n_half = 13
        fdir = HERE / "frames_cycles"
        fdir.mkdir(exist_ok=True)
        t0 = time.perf_counter()
        scene, octs = build_scene(800, 720, use_cycles=True)
        scene.cycles.samples = 48
        scene.cycles.max_bounces = 8
        scene.cycles.transmission_bounces = 8
        for k in range(n_half):
            # t from 0.0 to 0.5 -> cos(2*pi*t) goes +1 -> -1, so use sin(2*pi*t - pi/2) = -cos(2*pi*t)
            t_phase = k / (2 * (n_half - 1)) - 0.25
            set_phase(octs, t_phase)
            scene.render.filepath = str(fdir / f"c_{k:03d}.png")
            bpy.ops.render.render(write_still=True)
        dt = time.perf_counter() - t0
        timing["cycles_anim_unique_frames"] = n_half
        timing["cycles_anim_loop_frames"] = 2 * (n_half - 1)
        timing["cycles_anim_s"] = round(dt, 1)
        tpath.write_text(json.dumps(timing, indent=2), encoding="utf-8")
        print(f"Cycles anim ({n_half} unique frames -> 24-frame loop) rendered in {dt:.1f}s")
    elif mode == "still":
        t0 = time.perf_counter()
        scene, octs = build_scene(1000, 800, use_cycles=False)
        set_phase(octs, 0.20)
        out = HERE / "blender_still.png"
        scene.render.filepath = str(out)
        bpy.ops.render.render(write_still=True)
        dt = time.perf_counter() - t0
        timing["still_s"] = round(dt, 2)
        timing["still_kb"] = round(out.stat().st_size / 1024, 1)
        tpath.write_text(json.dumps(timing, indent=2), encoding="utf-8")
        print(f"Still rendered in {dt:.2f}s -> {out}")
    elif mode == "anim":
        n = 36
        fdir = HERE / "frames"
        fdir.mkdir(exist_ok=True)
        t0 = time.perf_counter()
        scene, octs = build_scene(640, 520, use_cycles=False)
        for k in range(n):
            set_phase(octs, k / n)
            scene.render.filepath = str(fdir / f"f_{k:03d}.png")
            bpy.ops.render.render(write_still=True)
        dt = time.perf_counter() - t0
        timing["anim_frames"] = n
        timing["anim_s"] = round(dt, 2)
        tpath.write_text(json.dumps(timing, indent=2), encoding="utf-8")
        print(f"{n} frames rendered in {dt:.2f}s")


if __name__ == "__main__":
    main()
