"""Web parity for Unreal — landmarks, labels, Tecpro, trees, signs, correct spawn.

Ports what the browser race had, stepped up for UE. Caps barrier actors for FPS.
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
BARRIER_STRIDE = 3  # every Nth Tecpro module (keeps look, cuts lag)
TREE_STRIDE = 1
LIGHT_STRIDE = 2


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "web-parity-status.json",
        )
    )


def _write(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def _export_dir():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
        )
    )


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _levels():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def _tools():
    return unreal.AssetToolsHelpers.get_asset_tools()


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _folder(p):
    if not unreal.EditorAssetLibrary.does_directory_exist(p):
        unreal.EditorAssetLibrary.make_directory(p)


def _map_slug(name):
    return re.sub(r"([a-z])([A-Z])", r"\1-\2", name.replace("MAP_", "")).lower()


def _load(slug):
    with open(os.path.join(_export_dir(), "circuits", "{}.json".format(slug)), encoding="utf-8") as f:
        return json.load(f)


def _kill(prefixes):
    n = 0
    for a in list(_actors().get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
            try:
                _actors().destroy_actor(a)
                n += 1
            except Exception:
                pass
    return n


def _movable(a):
    try:
        if a.root_component:
            a.root_component.set_editor_property(
                "mobility", unreal.ComponentMobility.MOVABLE
            )
    except Exception:
        pass


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _cyl():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")


def _cone():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")


def _hex(h):
    h = (h or "#888888").lstrip("#")
    if len(h) != 6:
        return unreal.LinearColor(0.5, 0.5, 0.5, 1)
    return unreal.LinearColor(
        int(h[0:2], 16) / 255.0,
        int(h[2:4], 16) / 255.0,
        int(h[4:6], 16) / 255.0,
        1.0,
    )


_MATS = {}


def _mat(key, color, emissive=0.05, rough=0.8, metallic=0.0, unlit=False):
    if key in _MATS:
        return _MATS[key]
    folder = "/Game/DriveAnywhere/Materials/Parity"
    _folder(folder)
    path = "{}/M_{}".format(folder, key)
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        mat = unreal.EditorAssetLibrary.load_asset(path)
    else:
        mat = _tools().create_asset(
            "M_{}".format(key), folder, unreal.Material, unreal.MaterialFactoryNew()
        )
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    if unlit:
        try:
            mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
        except Exception:
            pass
    base = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0
    )
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(
        base, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    em = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 160
    )
    em.set_editor_property(
        "constant",
        unreal.LinearColor(color.r * emissive, color.g * emissive, color.b * emissive, 1),
    )
    unreal.MaterialEditingLibrary.connect_material_property(
        em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )
    if not unlit:
        r = unreal.MaterialEditingLibrary.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -400, 300
        )
        r.set_editor_property("r", rough)
        unreal.MaterialEditingLibrary.connect_material_property(
            r, "", unreal.MaterialProperty.MP_ROUGHNESS
        )
        if metallic > 0.01:
            m = unreal.MaterialEditingLibrary.create_material_expression(
                mat, unreal.MaterialExpressionConstant, -400, 380
            )
            m.set_editor_property("r", metallic)
            unreal.MaterialEditingLibrary.connect_material_property(
                m, "", unreal.MaterialProperty.MP_METALLIC
            )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(path)
    _MATS[key] = mat
    return mat


def _spawn_mesh(name, mesh, loc, scale, rot, mat, collide=True, folder="DriveAnywhere/Trackside"):
    a = _actors().spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    a.set_actor_label(name)
    try:
        a.set_actor_scale3d(scale)
        a.set_folder_path(folder)
    except Exception:
        pass
    _movable(a)
    c = a.get_component_by_class(unreal.StaticMeshComponent)
    if c and mesh:
        c.set_static_mesh(mesh)
        if mat:
            c.set_material(0, mat)
        try:
            c.set_editor_property("cast_shadow", False)
            c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass
        if collide:
            c.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            c.set_collision_profile_name("BlockAll")
        else:
            c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return a


def _spawn_label(name, text, loc, height=350.0):
    """Floating name plate — Note actor (reliable in editor)."""
    pos = unreal.Vector(loc.x, loc.y, loc.z + height)
    try:
        note = _actors().spawn_actor_from_class(unreal.Note, pos)
    except Exception:
        note = _actors().spawn_actor_from_class(unreal.Actor, pos)
    note.set_actor_label("Label_{}".format(name))
    try:
        note.set_folder_path("DriveAnywhere/Labels")
        note.set_editor_property("text", text)
    except Exception:
        pass
    try:
        # Bigger note sphere so it's findable in outliner / viewport
        note.set_actor_scale3d(unreal.Vector(3, 3, 3))
    except Exception:
        pass
    return note


def _fix_spawn(data):
    _kill(["DA_PlayerStart"])
    start = data.get("start")
    points = data.get("splinePoints") or []
    if start:
        loc = unreal.Vector(float(start["x"]), float(start["y"]), float(start["z"]) + 200.0)
        yaw = float(start.get("yawDeg") or 0.0)
    elif len(points) >= 2:
        p0 = points[0]
        p1 = points[1]
        loc = unreal.Vector(float(p0["x"]), float(p0["y"]), float(p0["z"]) + 200.0)
        dx = float(p1["x"]) - float(p0["x"])
        dy = float(p1["y"]) - float(p0["y"])
        yaw = math.degrees(math.atan2(dy, dx))
    else:
        return False
    rot = yaw_rot(yaw)
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")
    try:
        ps.set_folder_path("DriveAnywhere")
    except Exception:
        pass
    # Frame camera behind start
    rad = math.radians(yaw)
    forward = unreal.Vector(math.cos(rad), math.sin(rad), 0)
    cam = loc - forward * 12000.0 + unreal.Vector(0, 0, 4800.0)
    look = unreal.MathLibrary.find_look_at_rotation(cam, loc + forward * 6000.0)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        pass
    return True


def _place_barriers(barriers):
    _kill(["Tecpro_", "DA_Barrier_"])
    mesh = _cube()
    white = _mat("tecpro_white", unreal.LinearColor(0.92, 0.92, 0.94, 1), 0.08, 0.7)
    red = _mat("tecpro_red", unreal.LinearColor(0.75, 0.05, 0.08, 1), 0.12, 0.7)
    n = 0
    for i, b in enumerate(barriers):
        if i % BARRIER_STRIDE != 0:
            continue
        length = float(b.get("lengthCm") or 200.0) * BARRIER_STRIDE * 0.85
        height = 85.0
        depth = 55.0
        loc = unreal.Vector(float(b["x"]), float(b["y"]), float(b["z"]) + height * 0.5)
        rot = yaw_rot(float(b.get("yawDeg") or 0.0))
        mat = red if int(b.get("stripe") or 0) == 1 else white
        _spawn_mesh(
            "Tecpro_{:04d}".format(n),
            mesh,
            loc,
            unreal.Vector(length / 100.0, depth / 100.0, height / 100.0),
            rot,
            mat,
            collide=(n % 2 == 0),
            folder="DriveAnywhere/Barriers",
        )
        n += 1
    return n


def _place_scenery(scenery):
    _kill(["Tree_", "Light_", "DA_Tree_", "DA_Light_"])
    mesh = _cube()
    cyl = _cyl() or mesh
    cone = _cone() or mesh
    bark = _mat("bark", unreal.LinearColor(0.25, 0.15, 0.08, 1), 0.03, 0.95)
    leaf = _mat("leaf", unreal.LinearColor(0.12, 0.35, 0.14, 1), 0.06, 0.9)
    lamp = _mat(
        "lamp_glow",
        unreal.LinearColor(1.0, 0.92, 0.7, 1),
        2.5,
        unlit=True,
    )
    metal = _mat("pole", unreal.LinearColor(0.15, 0.15, 0.18, 1), 0.04, 0.5, 0.4)
    trees = 0
    lights = 0
    for i, s in enumerate(scenery):
        t = str(s.get("type") or "")
        loc = unreal.Vector(float(s["x"]), float(s["y"]), float(s["z"]))
        scale = float(s.get("scale") or 1.0)
        yaw = float(s.get("yawDeg") or 0.0)
        rot = yaw_rot(yaw)
        if t == "tree":
            if i % TREE_STRIDE != 0:
                continue
            # Trunk + canopy
            _spawn_mesh(
                "Tree_{:03d}_Trunk".format(trees),
                cyl,
                loc + unreal.Vector(0, 0, 200 * scale),
                unreal.Vector(0.35 * scale, 0.35 * scale, 4.0 * scale),
                rot,
                bark,
                False,
                "DriveAnywhere/Trees",
            )
            _spawn_mesh(
                "Tree_{:03d}_Canopy".format(trees),
                cone,
                loc + unreal.Vector(0, 0, 550 * scale),
                unreal.Vector(2.2 * scale, 2.2 * scale, 3.5 * scale),
                rot,
                leaf,
                False,
                "DriveAnywhere/Trees",
            )
            trees += 1
        elif t == "street_light":
            if i % LIGHT_STRIDE != 0:
                continue
            _spawn_mesh(
                "Light_{:03d}_Pole".format(lights),
                mesh,
                loc + unreal.Vector(0, 0, 350),
                unreal.Vector(0.12, 0.12, 7.0),
                rot,
                metal,
                False,
                "DriveAnywhere/Lights",
            )
            _spawn_mesh(
                "Light_{:03d}_Head".format(lights),
                mesh,
                loc + unreal.Vector(0, 0, 720),
                unreal.Vector(0.55, 0.55, 0.35),
                rot,
                lamp,
                False,
                "DriveAnywhere/Lights",
            )
            lights += 1
    return {"trees": trees, "lights": lights}


def _place_signs(signs):
    _kill(["Sign_", "DA_Sign_"])
    mesh = _cube()
    yellow = _mat("sign_yellow", unreal.LinearColor(0.95, 0.8, 0.1, 1), 0.35, 0.5)
    black = _mat("sign_black", unreal.LinearColor(0.05, 0.05, 0.05, 1), 0.02, 0.9)
    n = 0
    for s in signs:
        loc = unreal.Vector(float(s["x"]), float(s["y"]), float(s["z"]))
        yaw = float(s.get("yawDeg") or 0.0)
        rot = yaw_rot(yaw)
        # Post
        _spawn_mesh(
            "Sign_{:02d}_Post".format(n),
            mesh,
            loc + unreal.Vector(0, 0, 120),
            unreal.Vector(0.1, 0.1, 2.4),
            rot,
            black,
            False,
            "DriveAnywhere/Signs",
        )
        # Board
        _spawn_mesh(
            "Sign_{:02d}_Board".format(n),
            mesh,
            loc + unreal.Vector(0, 0, 280),
            unreal.Vector(1.6, 0.12, 1.4),
            rot,
            yellow,
            False,
            "DriveAnywhere/Signs",
        )
        _spawn_label(
            "Sign_{:02d}".format(n),
            str(s.get("label") or "{}m".format(s.get("metres"))),
            loc,
            420.0,
        )
        n += 1
    return n


def _upright():
    return yaw_rot(0)


def _build_big_ben(x, y, z):
    """Elizabeth Tower — multi-tier upright silhouette (web ClockTowerLandmark)."""
    mesh, cyl, cone = _cube(), _cyl(), _cone()
    stone = _mat("stone_london", _hex("#d8c8b0"), 0.07, 0.88)
    dark = _mat("stone_dark", _hex("#b8a890"), 0.05, 0.9)
    gold = _mat("gold_clock", _hex("#c9a227"), 0.25, 0.35, 0.6)
    white = _mat("clock_face", _hex("#f4f0e8"), 0.15, 0.55)
    copper = _mat("copper_roof", _hex("#5a7a58"), 0.08, 0.55, 0.35)
    # metres → cm scale; Z is always up
    tiers = [
        ("Plinth", mesh, 3.0, 16.5, 6.0, dark, True),
        ("Lower", mesh, 14.0, 14.2, 16.0, stone, True),
        ("Mid", mesh, 36.0, 12.2, 26.0, stone, True),
        ("Band", mesh, 51.0, 13.2, 5.2, dark, False),
        ("Clock", mesh, 58.0, 12.4, 10.5, white, False),
        ("Belfry", mesh, 68.0, 7.2, 8.0, dark, False),
    ]
    for name, m, cy_m, w_m, h_m, mat, col in tiers:
        _spawn_mesh(
            "Hero_BigBen_{}".format(name),
            m,
            unreal.Vector(x, y, z + cy_m * 100.0),
            unreal.Vector(w_m, w_m, h_m),
            _upright(),
            mat,
            col,
            "DriveAnywhere/Heroes",
        )
    # Corner pinnacles + copper spire
    for i, (ox, oy) in enumerate(((-610, -610), (610, -610), (-610, 610), (610, 610))):
        _spawn_mesh(
            "Hero_BigBen_Pin_{}".format(i),
            mesh,
            unreal.Vector(x + ox, y + oy, z + 5800),
            unreal.Vector(1.6, 1.6, 16),
            _upright(),
            dark,
            False,
            "DriveAnywhere/Heroes",
        )
        if cone:
            _spawn_mesh(
                "Hero_BigBen_PinTip_{}".format(i),
                cone,
                unreal.Vector(x + ox, y + oy, z + 6800),
                unreal.Vector(1.15, 1.15, 5.4),
                _upright(),
                copper,
                False,
                "DriveAnywhere/Heroes",
            )
    if cone:
        _spawn_mesh(
            "Hero_BigBen_Spire",
            cone,
            unreal.Vector(x, y, z + 7400),
            unreal.Vector(4.6, 4.6, 14),
            _upright(),
            copper,
            False,
            "DriveAnywhere/Heroes",
        )
    if cyl:
        _spawn_mesh(
            "Hero_BigBen_Finial",
            cyl,
            unreal.Vector(x, y, z + 8250),
            unreal.Vector(0.28, 0.28, 6),
            _upright(),
            gold,
            False,
            "DriveAnywhere/Heroes",
        )
    _spawn_label("BigBen", "Big Ben", unreal.Vector(x, y, z), 10000.0)


def _build_parliament(x, y, z):
    """Palace of Westminster — long riverside range + Victoria Tower."""
    mesh = _cube()
    stone = _mat("stone_london", _hex("#d8c8b0"), 0.07, 0.88)
    dark = _mat("stone_dark", _hex("#b8a890"), 0.05, 0.9)
    # Long axis along riverside (UE X after remap ≈ Thames edge)
    _spawn_mesh(
        "Hero_Parliament_Range",
        mesh,
        unreal.Vector(x, y, z + 2800),
        unreal.Vector(95, 22, 56),
        yaw_rot(25),
        stone,
        True,
        "DriveAnywhere/Heroes",
    )
    _spawn_mesh(
        "Hero_Parliament_Terrace",
        mesh,
        unreal.Vector(x - 800, y + 600, z + 900),
        unreal.Vector(70, 10, 18),
        yaw_rot(25),
        dark,
        False,
        "DriveAnywhere/Heroes",
    )
    _spawn_mesh(
        "Hero_Parliament_Victoria",
        mesh,
        unreal.Vector(x + 4200, y - 800, z + 5200),
        unreal.Vector(16, 16, 104),
        _upright(),
        stone,
        True,
        "DriveAnywhere/Heroes",
    )
    _spawn_mesh(
        "Hero_Parliament_VictoriaCrown",
        mesh,
        unreal.Vector(x + 4200, y - 800, z + 10800),
        unreal.Vector(18, 18, 8),
        _upright(),
        dark,
        False,
        "DriveAnywhere/Heroes",
    )
    _spawn_label("Parliament", "Parliament", unreal.Vector(x, y, z), 11000.0)


def _build_abbey(x, y, z):
    """Westminster Abbey — nave + twin west towers, upright."""
    mesh = _cube()
    stone = _mat("stone_london", _hex("#d8c8b0"), 0.07, 0.88)
    dark = _mat("stone_dark", _hex("#b8a890"), 0.05, 0.9)
    lead = _mat("lead_roof", _hex("#6a7078"), 0.06, 0.7, 0.2)
    _spawn_mesh(
        "Hero_Abbey_Nave",
        mesh,
        unreal.Vector(x, y, z + 2600),
        unreal.Vector(32, 70, 52),
        yaw_rot(-90),
        stone,
        True,
        "DriveAnywhere/Heroes",
    )
    _spawn_mesh(
        "Hero_Abbey_Roof",
        mesh,
        unreal.Vector(x, y, z + 5400),
        unreal.Vector(28, 62, 6),
        yaw_rot(-90),
        lead,
        False,
        "DriveAnywhere/Heroes",
    )
    for i, ox in enumerate((-1100, 1100)):
        _spawn_mesh(
            "Hero_Abbey_Tower_{}".format(i),
            mesh,
            unreal.Vector(x + ox, y - 2200, z + 4200),
            unreal.Vector(11, 11, 84),
            _upright(),
            stone,
            True,
            "DriveAnywhere/Heroes",
        )
        _spawn_mesh(
            "Hero_Abbey_TowerTop_{}".format(i),
            mesh,
            unreal.Vector(x + ox, y - 2200, z + 8800),
            unreal.Vector(12, 12, 8),
            _upright(),
            dark,
            False,
            "DriveAnywhere/Heroes",
        )
    _spawn_label("Abbey", "Abbey", unreal.Vector(x, y, z), 9500.0)


def _place_route_heroes(heroes):
    from da_landmark_unique import build_landmark

    _kill(["Hero_", "HD_Hero_Elizabeth", "HD_Hero_Parliament", "HD_Hero_Abbey"])
    n = 0
    for h in heroes:
        kind = str(h.get("kind") or h.get("id") or "").lower()
        x, y, z = float(h["x"]), float(h["y"]), float(h.get("z") or 0)
        label = str(h.get("label") or h.get("id") or "Landmark")
        if "big" in kind or "clock-tower" in kind or kind == "ben" or "elizabeth" in kind:
            _build_big_ben(x, y, z)
            n += 1
            continue
        if "parliament" in kind:
            _build_parliament(x, y, z)
            n += 1
            continue
        if "abbey" in kind:
            _build_abbey(x, y, z)
            n += 1
            continue
        # Generic kind silhouette (Eye, Burj, Empire, Cristo, etc.)
        paint = _mat("hero_p_{}".format(n), _hex("#d8c8b0"), 0.08, 0.8)
        accent = _mat("hero_a_{}".format(n), _hex("#c9a227"), 0.15, 0.45)
        # Scale famous heroes larger
        h_cm = 14000.0
        if "burj" in kind or "tri-needle" in kind:
            h_cm = 22000.0
        elif "ferris" in kind:
            h_cm = 12000.0
        elif "pyramid" in kind:
            h_cm = 16000.0
        elif "art-deco" in kind:
            h_cm = 18000.0
        elif "sail" in kind:
            h_cm = 15000.0
        elif "lattice" in kind:
            h_cm = 16000.0
        elif "cristo" in kind:
            h_cm = 11000.0
        tag = "Hero_{}_{}".format(n, re.sub(r"[^A-Za-z0-9]", "", label)[:18])
        build_landmark(label, kind, tag, x, y, z, h_cm, paint, accent, _spawn_mesh)
        _spawn_label(tag, label, unreal.Vector(x, y, z), h_cm + 800)
        n += 1
    return n


def _label_named(named):
    """Ensure every famous building has a floating label."""
    _kill(["Label_Named_"])
    n = 0
    for lm in named:
        name = str(lm.get("name") or "")
        if not name:
            continue
        loc = unreal.Vector(float(lm["x"]), float(lm["y"]), float(lm.get("z") or 0))
        h = float(lm.get("heightCm") or 4000)
        _spawn_label("Named_{}".format(re.sub(r"[^A-Za-z0-9]", "", name)[:24]), name, loc, h + 400)
        n += 1
    return n


def _place_unique(unique, roads, rng):
    """All unique kind silhouettes (up to 60/circuit) — web UniqueCircuitLandmarks."""
    from da_landmark_unique import build_landmark

    _kill(["Unique_"])
    if not unique or len(roads) < 10:
        return 0
    n = 0
    count = min(60, len(unique))
    stride = max(1, len(roads) // max(count, 1))
    for i, u in enumerate(unique[:count]):
        ri = min(len(roads) - 2, i * stride + 5)
        p = roads[ri].get_actor_location()
        nxt = roads[min(ri + 1, len(roads) - 1)].get_actor_location()
        tx, ty = nxt.x - p.x, nxt.y - p.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        nx, ny = -ty / length, tx / length
        dist = rng.choice([9500, 11200, 12800, 14800, 17000, 19500])
        sign = 1 if i % 2 == 0 else -1
        x = p.x + nx * dist * sign
        y = p.y + ny * dist * sign
        h = float(u.get("heightCm") or 4000)
        paint = _mat(
            "uniq_p_{}".format(i),
            _hex(u.get("colorHex") or "#8899aa"),
            0.08,
            0.75,
        )
        accent = _mat(
            "uniq_a_{}".format(i),
            _hex(u.get("accentHex") or "#c8d0da"),
            0.1,
            0.55,
        )
        safe = re.sub(r"[^A-Za-z0-9]", "", u.get("name") or "Lm")[:16]
        tag = "Unique_{:02d}_{}".format(i, safe)
        build_landmark(
            u.get("name"),
            u.get("kind"),
            tag,
            x,
            y,
            float(p.z),
            h,
            paint,
            accent,
            _spawn_mesh,
        )
        _spawn_label(tag, str(u.get("name") or "Landmark"), unreal.Vector(x, y, p.z), h + 600)
        n += 1
    return n

def _roads():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]

    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    roads.sort(key=key)
    return roads


def _upgrade(map_path):
    _levels().load_level(map_path)
    slug = _map_slug(map_path.rsplit("/", 1)[-1])
    data = _load(slug)
    rng = random.Random(hash(slug) & 0xFFFFFFFF)

    spawn_ok = _fix_spawn(data)
    barriers = _place_barriers(data.get("barriers") or [])
    scenery = _place_scenery(data.get("scenery") or [])
    signs = _place_signs(data.get("signs") or [])
    heroes = _place_route_heroes(data.get("routeHeroes") or [])
    labels = _label_named(data.get("namedLandmarks") or [])
    unique = _place_unique(data.get("uniqueLandmarks") or [], _roads(), rng)

    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass

    _levels().save_current_level()
    return {
        "map": map_path,
        "slug": slug,
        "spawn": spawn_ok,
        "barriers": barriers,
        "trees": scenery.get("trees", 0),
        "lights": scenery.get("lights", 0),
        "signs": signs,
        "heroes": heroes,
        "labels": labels,
        "unique": unique,
        "named": len(data.get("namedLandmarks") or []),
    }


def main():
    unreal.log("DriveAnywhere: WEB PARITY — Big Ben, Tecpro, trees, signs, labels, spawn…")
    _write({"state": "running"})
    try:
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_upgrade(m) for m in maps]
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            _fix_spawn(_load("westminster-sprint"))
            _levels().save_current_level()
        _write({"state": "ok", "results": results})
        unreal.log("DriveAnywhere WEB PARITY done. Start on Big Ben circuit with Tecpro + labels.")
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
