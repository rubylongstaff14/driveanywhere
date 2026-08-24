"""Unique landmark kind silhouettes for Unreal — mirrors web unique-landmarks.tsx.

Heights/widths in cm. Always upright (yaw only).
"""
from __future__ import annotations

import math
import unreal
from da_rot import yaw_rot

def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")

def _cyl():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")

def _cone():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")

def _sphere():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")


def build_kind(kind, tag, x, y, z, h_cm, paint, accent, spawn_fn):
    """spawn_fn(name, mesh, loc, scale, rot, mat, collide, folder) -> actor"""
    kind = str(kind or "art-deco")
    h = max(float(h_cm), 1200.0)
    w = max(800.0, h * 0.22)
    mesh, cyl, cone, sphere = _cube(), _cyl(), _cone(), _sphere()
    upright = yaw_rot(0)
    folder = "DriveAnywhere/Unique"

    def s(name, m, loc, sx, sy, sz, mat, col=False):
        spawn_fn(name, m or mesh, loc, unreal.Vector(sx, sy, sz), upright, mat, col, folder)

    def box(name, cx, cy, cz, sx, sy, sz, mat, col=False):
        # sx,sy,sz already in cube-scale units (1 = 100cm)
        s(name, mesh, unreal.Vector(cx, cy, cz), sx, sy, sz, mat, col)

    def cyli(name, cx, cy, cz, r_xy, sz, mat, col=False):
        s(name, cyl or mesh, unreal.Vector(cx, cy, cz), r_xy, r_xy, sz, mat, col)

    def coni(name, cx, cy, cz, r_xy, sz, mat, col=False):
        s(name, cone or mesh, unreal.Vector(cx, cy, cz), r_xy, r_xy, sz, mat, col)

    def sph(name, cx, cy, cz, r, mat, col=False):
        s(name, sphere or mesh, unreal.Vector(cx, cy, cz), r, r, r, mat, col)

    # Convert web-style fractions: position mid height, scale = size/100 for cube
    def mid(t):
        return z + h * t

    ww = w / 100.0  # width in cube units

    if kind == "lattice-spire":
        for i, t in enumerate((0.12, 0.38, 0.62, 0.82)):
            r = ww * (0.34 - t * 0.18)
            cyli("{}_T{}".format(tag, i), x, y, mid(t), r, h * 0.22 / 100.0, paint if i % 2 == 0 else accent, i == 0)
        coni("{}_Tip".format(tag), x, y, mid(0.98), ww * 0.06, h * 0.12 / 100.0, accent)
    elif kind == "pagoda":
        for i, t in enumerate((0.18, 0.42, 0.66, 0.88)):
            bw = ww * (0.9 - i * 0.14)
            box("{}_B{}".format(tag, i), x, y, mid(t * 0.85), bw, bw, h * 0.12 / 100.0, paint, i == 0)
            coni("{}_R{}".format(tag, i), x, y, mid(t * 0.85) + h * 0.07, ww * (0.72 - i * 0.12), h * 0.06 / 100.0, accent)
    elif kind == "torii":
        for i, side in enumerate((-1, 1)):
            box("{}_P{}".format(tag, i), x + side * w * 0.45, y, mid(0.42), ww * 0.1, ww * 0.1, h * 0.84 / 100.0, paint, True)
        box("{}_Top".format(tag), x, y, mid(0.82), ww * 1.35, ww * 0.16, h * 0.08 / 100.0, accent)
        box("{}_Bar".format(tag), x, y, mid(0.7), ww * 1.05, ww * 0.1, h * 0.05 / 100.0, paint)
    elif kind == "capsule":
        cyli("{}_Body".format(tag), x, y, mid(0.5), ww * 0.22, h * 0.92 / 100.0, paint, True)
    elif kind == "clock-spire":
        box("{}_Shaft".format(tag), x, y, mid(0.38), ww * 0.55, ww * 0.55, h * 0.76 / 100.0, paint, True)
        box("{}_Face".format(tag), x, y + w * 0.29, mid(0.82), ww * 0.32, 0.2, ww * 0.32, accent)
        coni("{}_Tip".format(tag), x, y, mid(0.96), ww * 0.12, h * 0.16 / 100.0, accent)
    elif kind == "sail":
        # Burj Al Arab–style sail
        box("{}_Sail".format(tag), x, y, mid(0.48), ww * 0.12, ww * 0.85, h * 0.96 / 100.0, paint, True)
        box("{}_Mast".format(tag), x + w * 0.08, y, mid(0.5), ww * 0.08, ww * 0.7, h * 0.9 / 100.0, accent)
    elif kind == "twist":
        for i in range(8):
            t = i / 8.0
            ang = t * 90.0
            bw = ww * (0.7 - t * 0.25)
            bd = ww * (0.55 - t * 0.18)
            spawn_fn("{}_S{}".format(tag, i), mesh, unreal.Vector(x, y, mid(t + 0.05)),
                     unreal.Vector(bw, bd, h * 0.11 / 100.0), yaw_rot(ang), paint, i == 0, folder)
    elif kind == "tri-needle":
        for i, a in enumerate((0, 2.094, 4.189)):
            ox = math.cos(a) * w * 0.12
            oy = math.sin(a) * w * 0.12
            cyli("{}_N{}".format(tag, i), x + ox, y + oy, mid(0.5), ww * 0.1, h / 100.0, paint, i == 0)
        sph("{}_Cap".format(tag), x, y, mid(1.02), ww * 0.06, accent)
    elif kind == "gold-frame":
        for i, side in enumerate((-1, 1)):
            box("{}_L{}".format(tag, i), x + side * w * 0.42, y, mid(0.5), ww * 0.12, ww * 0.12, h / 100.0, paint, True)
        box("{}_Top".format(tag), x, y, mid(0.96), ww * 1.05, ww * 0.14, h * 0.1 / 100.0, accent)
        box("{}_Base".format(tag), x, y, mid(0.08), ww * 1.05, ww * 0.14, h * 0.08 / 100.0, accent)
    elif kind == "torus-museum":
        # Approximate ring with stacked cylinders
        cyli("{}_Ring".format(tag), x, y, mid(0.42), ww * 0.55, ww * 0.16, paint, True)
        cyli("{}_Base".format(tag), x, y, mid(0.12), ww * 0.25, h * 0.16 / 100.0, accent)
    elif kind == "pyramid":
        coni("{}_Pyr".format(tag), x, y, mid(0.5), ww * 0.85, h / 100.0, paint, True)
    elif kind == "sphinx":
        box("{}_Body".format(tag), x, y, mid(0.22), ww * 1.4, ww * 0.7, h * 0.32 / 100.0, paint, True)
        box("{}_Head".format(tag), x, y + w * 0.15, mid(0.52), ww * 0.45, ww * 0.4, h * 0.4 / 100.0, accent)
    elif kind == "pylon-gate":
        for i, side in enumerate((-1, 1)):
            box("{}_P{}".format(tag, i), x + side * w * 0.5, y, mid(0.5), ww * 0.28, ww * 0.18, h / 100.0, paint, True)
        box("{}_Lint".format(tag), x, y, mid(0.78), ww * 1.15, ww * 0.16, h * 0.12 / 100.0, accent)
    elif kind == "obelisk":
        cyli("{}_Shaft".format(tag), x, y, mid(0.48), ww * 0.12, h * 0.92 / 100.0, paint, True)
        coni("{}_Tip".format(tag), x, y, mid(0.98), ww * 0.09, h * 0.12 / 100.0, accent)
    elif kind == "statue":
        cyli("{}_Plinth".format(tag), x, y, mid(0.12), ww * 0.3, h * 0.16 / 100.0, accent)
        cyli("{}_Body".format(tag), x, y, mid(0.48), ww * 0.14, h * 0.5 / 100.0, paint, True)
        sph("{}_Head".format(tag), x, y, mid(0.82), ww * 0.12, paint)
    elif kind == "gothic-spire":
        box("{}_Base".format(tag), x, y, mid(0.28), ww * 0.7, ww * 0.55, h * 0.5 / 100.0, paint, True)
        coni("{}_Spire".format(tag), x, y, mid(0.72), ww * 0.22, h * 0.55 / 100.0, accent)
    elif kind == "dome":
        cyli("{}_Drum".format(tag), x, y, mid(0.28), ww * 0.58, h * 0.48 / 100.0, paint, True)
        sph("{}_Dome".format(tag), x, y, mid(0.62), ww * 0.52, accent)
    elif kind == "mill":
        cyli("{}_Tower".format(tag), x, y, mid(0.4), ww * 0.25, h * 0.8 / 100.0, paint, True)
        box("{}_Blade".format(tag), x, y + w * 0.08, mid(0.72), ww * 1.1, h * 0.05 / 100.0, h * 0.06 / 100.0, accent)
    elif kind == "chalet":
        box("{}_Body".format(tag), x, y, mid(0.28), ww * 1.1, ww * 0.8, h * 0.5 / 100.0, paint, True)
        coni("{}_Roof".format(tag), x, y, mid(0.62), ww * 0.85, h * 0.38 / 100.0, accent)
    elif kind == "cable-pylon":
        for i, side in enumerate((-1, 1)):
            box("{}_L{}".format(tag, i), x + side * w * 0.18, y, mid(0.5), ww * 0.06, ww * 0.06, h / 100.0, paint, True)
        box("{}_Cross".format(tag), x, y, mid(0.92), ww * 0.9, ww * 0.08, h * 0.06 / 100.0, accent)
    elif kind == "lighthouse":
        cyli("{}_Tower".format(tag), x, y, mid(0.45), ww * 0.18, h * 0.9 / 100.0, paint, True)
        cyli("{}_Lamp".format(tag), x, y, mid(0.95), ww * 0.16, h * 0.12 / 100.0, accent)
    elif kind == "ferris":
        # London Eye–style: ring approximated by radial boxes + hub
        cyli("{}_Hub".format(tag), x, y, mid(0.55), ww * 0.08, ww * 0.08, paint, True)
        for i in range(12):
            ang = i * 30.0
            rad = math.radians(ang)
            ox = math.cos(rad) * h * 0.42
            oz = math.sin(rad) * h * 0.42
            box("{}_R{}".format(tag, i), x + ox, y, mid(0.55) + oz * 0.0, ww * 0.06, ww * 0.06, h * 0.08 / 100.0, paint)
            # spoke
            box("{}_S{}".format(tag, i), x + ox * 0.5, y, mid(0.55), max(ww * 0.04, 0.3), max(ww * 0.04, 0.3), (h * 0.42) / 100.0, accent)
        box("{}_Leg".format(tag), x, y, mid(0.12), ww * 0.12, ww * 0.12, h * 0.28 / 100.0, accent, True)
    elif kind == "bridge-tower":
        for i, side in enumerate((-1, 1)):
            box("{}_T{}".format(tag, i), x + side * w * 0.38, y, mid(0.5), ww * 0.22, ww * 0.22, h / 100.0, paint, True)
        box("{}_Walk".format(tag), x, y, mid(0.72), ww * 1.05, ww * 0.12, h * 0.08 / 100.0, accent)
    elif kind == "art-deco":
        # Empire State setbacks
        for i, t in enumerate((0.2, 0.45, 0.68)):
            bw = ww * (0.85 - i * 0.18)
            bd = ww * (0.7 - i * 0.14)
            box("{}_T{}".format(tag, i), x, y, mid(t), bw, bd, h * 0.24 / 100.0, paint, i == 0)
        cyli("{}_Mast".format(tag), x, y, mid(0.92), ww * 0.08, h * 0.2 / 100.0, accent)
    elif kind == "copper-steps":
        for i in range(4):
            box("{}_S{}".format(tag, i), x + i * w * 0.12, y, mid(0.2 + i * 0.18), ww * 0.5, ww * 0.5, h * 0.22 / 100.0, paint, i == 0)
    elif kind == "neon-drum":
        cyli("{}_Drum".format(tag), x, y, mid(0.45), ww * 0.5, h * 0.88 / 100.0, paint, True)
        box("{}_Sign".format(tag), x, y + w * 0.52, mid(0.72), ww * 0.7, 0.12, h * 0.1 / 100.0, accent)
    elif kind == "sugarloaf":
        coni("{}_Rock".format(tag), x, y, mid(0.48), ww * 0.7, h / 100.0, paint, True)
    elif kind == "cristo":
        cyli("{}_Body".format(tag), x, y, mid(0.42), ww * 0.1, h * 0.55 / 100.0, paint, True)
        box("{}_Arms".format(tag), x, y, mid(0.62), ww * 1.15, ww * 0.1, h * 0.08 / 100.0, paint)
        sph("{}_Head".format(tag), x, y, mid(0.88), ww * 0.1, accent)
    elif kind == "portico":
        for i, ox in enumerate((-0.45, -0.15, 0.15, 0.45)):
            cyli("{}_C{}".format(tag, i), x + ox * w, y + w * 0.3, mid(0.38), ww * 0.06, h * 0.7 / 100.0, paint, i == 0)
        box("{}_Ent".format(tag), x, y, mid(0.78), ww * 1.3, ww * 0.85, h * 0.12 / 100.0, accent)
    elif kind == "ziggurat":
        for i, t in enumerate((0.18, 0.4, 0.62, 0.82)):
            bw = ww * (1.2 - i * 0.22)
            bd = ww * (1.1 - i * 0.2)
            box("{}_Z{}".format(tag, i), x, y, mid(t), bw, bd, h * 0.18 / 100.0, paint, i == 0)
    else:
        # Fallback tower
        box("{}_Body".format(tag), x, y, mid(0.5), ww * 0.6, ww * 0.6, h / 100.0, paint, True)
        box("{}_Crown".format(tag), x, y, mid(0.95), ww * 0.5, ww * 0.5, h * 0.1 / 100.0, accent)

