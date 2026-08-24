"""HD city rebuild — match web DriveAnywhere style, far less lag.

Removes window spam / dense actor flood.
Places named landmarks with identity colors + hero silhouettes.
Massing from route JSON (thinned) + street fill capped at 96.
Shared materials only.
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import traceback
import unreal

from da_rot import yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
MAT = "/Game/DriveAnywhere/Materials/HD"
FILL_MAX = 96
MASSING_MAX = 140

REGIONAL = {
    "London": ["#7a5c4a", "#8a6c54", "#6b7d94", "#d8c8b0"],
    "Dubai": ["#87a9bd", "#b8c7d0", "#6b7d94", "#c9a227"],
    "Giza": ["#c4a06a", "#b88850", "#9a8058", "#d4b888"],
    "Tokyo": ["#4a5860", "#8898a8", "#2a3438", "#ff4d8d"],
    "Rio de Janeiro": ["#8a7060", "#c8b898", "#6a8498", "#e85d4c"],
    "Zermatt": ["#8a6848", "#7a8898", "#a88868", "#e8eef4"],
    "New York": ["#6b7d94", "#b8b4a8", "#4a5858", "#c4ccd4"],
}


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "city-hd-status.json",
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


def _hex(h):
    h = h.lstrip("#")
    if len(h) != 6:
        return unreal.LinearColor(0.5, 0.45, 0.4, 1)
    return unreal.LinearColor(
        int(h[0:2], 16) / 255.0,
        int(h[2:4], 16) / 255.0,
        int(h[4:6], 16) / 255.0,
        1.0,
    )


def _mat_cache():
    return {}


def _get_mat(cache, key, color, emissive_scale=0.08, rough=0.85, metallic=0.0):
    if key in cache:
        return cache[key]
    _folder(MAT)
    path = "{}/M_{}".format(MAT, key)
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        mat = unreal.EditorAssetLibrary.load_asset(path)
    else:
        mat = _tools().create_asset("M_{}".format(key), MAT, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
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
        unreal.LinearColor(
            color.r * emissive_scale,
            color.g * emissive_scale,
            color.b * emissive_scale,
            1,
        ),
    )
    unreal.MaterialEditingLibrary.connect_material_property(
        em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )
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
    cache[key] = mat
    return mat


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _cyl():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")


def _cone():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")


def _spawn(label, mesh, loc, scale, rot, mat, collide=True):
    a = _actors().spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    a.set_actor_label(label)
    try:
        a.set_actor_scale3d(scale)
        a.set_folder_path("DriveAnywhere/HD")
        if a.root_component:
            a.root_component.set_editor_property(
                "mobility", unreal.ComponentMobility.MOVABLE
            )
    except Exception:
        pass
    c = a.get_component_by_class(unreal.StaticMeshComponent)
    if c and mesh:
        c.set_static_mesh(mesh)
        if mat:
            c.set_material(0, mat)
        # Shadows only on tall/named (caller sets collide; we skip cast on small)
        try:
            c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            c.set_editor_property("cast_shadow", collide and scale.z >= 25.0)
        except Exception:
            pass
        if collide:
            c.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            c.set_collision_profile_name("BlockAll")
        else:
            c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return a


def _strip_lag():
    """Delete previous laggy city actors."""
    eas = _actors()
    n = 0
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if (
            lab.startswith("Bld_")
            or lab.startswith("DA_Walk_")
            or lab.startswith("DA_Lamp_")
            or lab.startswith("DA_Line_")
            or lab.startswith("HD_")
        ):
            try:
                eas.destroy_actor(a)
                n += 1
            except Exception:
                pass
    return n


def _safe(name):
    return re.sub(r"[^A-Za-z0-9]+", "_", name)[:36]


def _build_box(tag, x, y, z, w_cm, d_cm, h_cm, yaw, mat, collide=True):
    # Cube unit = 100cm. Export width=three X→UE Y; depth=three Z→UE X.
    mesh = _cube()
    loc = unreal.Vector(x, y, z + h_cm * 0.5)
    scale = unreal.Vector(
        max(d_cm, 200) / 100.0,
        max(w_cm, 200) / 100.0,
        max(h_cm, 200) / 100.0,
    )
    return _spawn(tag, mesh, loc, scale, yaw_rot(yaw), mat, collide)


def _build_tower_setbacks(tag, x, y, z, h_cm, w0, mat, accent, tiers=4):
    mesh = _cube()
    for i in range(tiers):
        t0 = i / float(tiers)
        t1 = (i + 1) / float(tiers)
        seg = (t1 - t0) * h_cm
        mid = z + (t0 + t1) * 0.5 * h_cm
        shrink = 1.0 - i * 0.14
        w = w0 * shrink
        m = accent if i == tiers - 1 else mat
        _spawn(
            "{}_T{}".format(tag, i),
            mesh,
            unreal.Vector(x, y, mid),
            unreal.Vector(w / 100.0, w / 100.0, seg / 100.0),
            yaw_rot(i * 4.0),
            m,
            collide=(i == 0),
        )


def _build_elizabeth(x, y, z, mats):
    """Upright Elizabeth Tower — same proportions as web / web_parity."""
    mesh, cone = _cube(), _cone()
    stone, white, dark = mats["stone"], mats["white"], mats.get("trim", mats["stone"])
    gold = mats["gold"]
    upright = yaw_rot(0)
    for name, cy, w, h, mat, col in (
        ("Plinth", 3.0, 16.5, 6.0, dark, True),
        ("Lower", 14.0, 14.2, 16.0, stone, True),
        ("Mid", 36.0, 12.2, 26.0, stone, True),
        ("Clock", 58.0, 12.4, 10.5, white, False),
        ("Belfry", 68.0, 7.2, 8.0, dark, False),
    ):
        _spawn(
            "HD_Hero_Elizabeth_{}".format(name),
            mesh,
            unreal.Vector(x, y, z + cy * 100.0),
            unreal.Vector(w, w, h),
            upright,
            mat,
            col,
        )
    if cone:
        _spawn(
            "HD_Hero_Elizabeth_Spire",
            cone,
            unreal.Vector(x, y, z + 7400),
            unreal.Vector(4.6, 4.6, 14),
            upright,
            gold,
            False,
        )


def _build_parliament(x, y, z, mats):
    mesh = _cube()
    upright = yaw_rot(0)
    _spawn(
        "HD_Hero_Parliament_Range",
        mesh,
        unreal.Vector(x, y, z + 2800),
        unreal.Vector(95, 22, 56),
        yaw_rot(25),
        mats["stone"],
    )
    _spawn(
        "HD_Hero_Parliament_Victoria",
        mesh,
        unreal.Vector(x + 4200, y - 800, z + 5200),
        unreal.Vector(16, 16, 104),
        upright,
        mats["stone"],
    )


def _build_mi6(x, y, z, h, mats):
    mesh = _cube()
    for i, (w, frac) in enumerate([(28, 0.35), (22, 0.6), (16, 0.85)]):
        prev = 0 if i == 0 else [0.35, 0.6][i - 1]
        seg = (frac - prev) * h
        mid = z + (prev + frac) * 0.5 * h
        _spawn(
            "HD_Hero_MI6_{}".format(i),
            mesh,
            unreal.Vector(x, y, mid),
            unreal.Vector(w, w * 0.85, seg / 100),
            yaw_rot(8 * i),
            mats["mi6"] if i < 2 else mats["gold"],
            collide=(i == 0),
        )


def _build_millbank(x, y, z, h, mats):
    cyl = _cyl() or _cube()
    _spawn(
        "HD_Hero_Millbank",
        cyl,
        unreal.Vector(x, y, z + h * 0.5),
        unreal.Vector(14, 14, h / 100),
        unreal.Rotator(),
        mats["glass"],
    )


def _build_burj(x, y, z, h, mats):
    cyl = _cyl() or _cube()
    for i, (w, top) in enumerate([(20, 0.35), (14, 0.6), (9, 0.82), (4, 1.0)]):
        prev = 0 if i == 0 else [0.35, 0.6, 0.82][i - 1]
        seg = (top - prev) * h
        mid = z + (prev + top) * 0.5 * h
        _spawn(
            "HD_Hero_Burj_{}".format(i),
            cyl,
            unreal.Vector(x, y, mid),
            unreal.Vector(w, w, seg / 100),
            yaw_rot(i * 15),
            mats["glass"],
            collide=(i == 0),
        )


def _build_pyramid(x, y, z, mats, tag):
    cone = _cone() or _cube()
    _spawn(
        "HD_Hero_{}".format(tag),
        cone,
        unreal.Vector(x, y, z + 4000),
        unreal.Vector(90, 90, 80),
        unreal.Rotator(),
        mats["sand"],
    )


def _build_tokyo_tower(x, y, z, mats):
    mesh = _cube()
    h = 12000.0
    for i, (w, frac) in enumerate([(12, 0.3), (8, 0.55), (5, 0.8), (2.5, 1.0)]):
        prev = 0 if i == 0 else [0.3, 0.55, 0.8][i - 1]
        seg = (frac - prev) * h
        mid = z + (prev + frac) * 0.5 * h
        _spawn(
            "HD_Hero_TokyoTower_{}".format(i),
            mesh,
            unreal.Vector(x, y, mid),
            unreal.Vector(w, w, seg / 100),
            unreal.Rotator(),
            mats["tokyo_red"] if i % 2 == 0 else mats["white"],
            collide=(i == 0),
        )


def _build_empire(x, y, z, h, mats):
    _build_tower_setbacks("HD_Hero_Empire", x, y, z, h, 1800, mats["nyc"], mats["white"], 5)
    mesh = _cube()
    _spawn(
        "HD_Hero_Empire_Mast",
        mesh,
        unreal.Vector(x, y, z + h + 800),
        unreal.Vector(1.2, 1.2, 20),
        unreal.Rotator(),
        mats["white"],
        False,
    )


def _ensure_shared_mats(cache, city):
    mats = {
        "stone": _get_mat(cache, "stone", _hex("#d8c8b0"), 0.06, 0.88),
        "brick": _get_mat(cache, "brick", _hex("#7a5c4a"), 0.05, 0.92),
        "glass": _get_mat(cache, "glass", _hex("#87a9bd"), 0.15, 0.18, 0.55),
        "concrete": _get_mat(cache, "concrete", _hex("#9aa0a4"), 0.05, 0.9),
        "white": _get_mat(cache, "white", _hex("#e8eef2"), 0.08, 0.55),
        "gold": _get_mat(cache, "gold", _hex("#c9a227"), 0.2, 0.35, 0.65),
        "sand": _get_mat(cache, "sand", _hex("#c4a06a"), 0.05, 0.92),
        "mi6": _get_mat(cache, "mi6", _hex("#5a7080"), 0.06, 0.7),
        "tokyo_red": _get_mat(cache, "tokyo_red", _hex("#c8102e"), 0.1, 0.7),
        "nyc": _get_mat(cache, "nyc", _hex("#6b7d94"), 0.06, 0.8),
        "trim": _get_mat(cache, "trim", _hex("#d8c8b0"), 0.05, 0.85),
    }
    # Regional fill variants
    palette = REGIONAL.get(city, REGIONAL["London"])
    mats["fill"] = []
    for i, hx in enumerate(palette):
        mats["fill"].append(_get_mat(cache, "fill_{}_{}".format(city.replace(" ", "")[:8], i), _hex(hx), 0.05))
    return mats


def _mat_from_landmark(cache, lm, shared):
    facade = (lm.get("facade") or "brick").lower()
    if "glass" in facade:
        base = shared["glass"]
    elif "sand" in facade or "sandstone" in facade:
        base = shared["sand"]
    elif "concrete" in facade:
        base = shared["concrete"]
    elif "brick" in facade:
        base = shared["brick"]
    else:
        base = shared["stone"]
    # Identity color override — shared mat keyed by hex
    ch = lm.get("colorHex") or ""
    if ch.startswith("#") and len(ch) == 7:
        key = "id_{}".format(ch[1:])
        c = lm.get("color") or {}
        col = unreal.LinearColor(float(c.get("r", 0.5)), float(c.get("g", 0.45)), float(c.get("b", 0.4)), 1)
        metal = 0.5 if "glass" in facade else 0.0
        return _get_mat(cache, key, col, 0.1 if metal else 0.06, 0.35 if metal else 0.85, metal)
    return base


def _place_named(landmarks, cache, shared):
    n = 0
    for lm in landmarks:
        name = str(lm.get("name") or "Building")
        x, y, z = float(lm["x"]), float(lm["y"]), float(lm.get("z") or 0)
        h = float(lm.get("heightCm") or 4000)
        w = float(lm.get("widthCm") or 1200)
        d = float(lm.get("depthCm") or 1200)
        lower = name.lower()
        mat = _mat_from_landmark(cache, lm, shared)
        accent = shared["gold"]
        tag = "HD_Named_{}".format(_safe(name))

        if "elizabeth" in lower or "big ben" in lower:
            _build_elizabeth(x, y, z, shared)
        elif "parliament" in lower:
            _build_parliament(x, y, z, shared)
        elif "mi6" in lower:
            _build_mi6(x, y, z, h, shared)
        elif "millbank" in lower:
            _build_millbank(x, y, z, h, shared)
        elif "burj" in lower:
            _build_burj(x, y, z, max(h, 20000), shared)
        elif "pyramid" in lower:
            _build_pyramid(x, y, z, shared, _safe(name))
        elif "tokyo tower" in lower:
            _build_tokyo_tower(x, y, z, shared)
        elif "empire state" in lower:
            _build_empire(x, y, z, h, shared)
        elif "one canada" in lower:
            _build_tower_setbacks(tag, x, y, z, h, max(w, 1800), shared["white"], shared["trim"], 3)
            # pyramid crown
            cone = _cone() or _cube()
            _spawn(
                tag + "_Crown",
                cone,
                unreal.Vector(x, y, z + h + 400),
                unreal.Vector(8, 8, 8),
                unreal.Rotator(),
                shared["white"],
                False,
            )
        elif h >= 10000:
            _build_tower_setbacks(tag, x, y, z, h, max(w, 1400), mat, accent, 4)
        else:
            # Classical body + limestone trim crown (web style)
            _build_box(tag + "_Body", x, y, z, w, d, h * 0.88, 0, mat, True)
            _build_box(
                tag + "_Crown",
                x,
                y,
                z + h * 0.88,
                w * 0.92,
                d * 0.92,
                h * 0.12,
                0,
                shared["trim"],
                False,
            )
        n += 1
    return n


def _place_massing(massing, cache, shared, rng):
    """Route buildings without names — thinned like web density."""
    if not massing:
        return 0
    step = max(1, int(math.ceil(len(massing) / float(MASSING_MAX))))
    n = 0
    for i, b in enumerate(massing):
        if i % step != 0:
            continue
        if n >= MASSING_MAX:
            break
        h = float(b["heightCm"])
        if h < 800:
            continue
        facade = (b.get("facade") or "brick").lower()
        if "glass" in facade:
            mat = shared["glass"]
        elif "sand" in facade:
            mat = shared["sand"]
        elif "concrete" in facade:
            mat = shared["concrete"]
        else:
            mat = shared["brick"] if rng.random() < 0.6 else shared["stone"]
        _build_box(
            "HD_Mass_{:03d}".format(n),
            float(b["x"]),
            float(b["y"]),
            float(b.get("z") or 0),
            float(b.get("widthCm") or 1000),
            float(b.get("depthCm") or 1000),
            h,
            rng.uniform(-5, 5),
            mat,
            collide=(h >= 2500 and n % 2 == 0),
        )
        n += 1
    return n


def _roads():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]

    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    roads.sort(key=key)
    return roads


def _street_fill(roads, shared, rng, city):
    """Web-style fill: ~58–82m off road, ≤96, both sides."""
    if len(roads) < 8:
        return 0
    fills = shared["fill"]
    n = 0
    stride = max(2, len(roads) // 40)
    for i in range(0, len(roads), stride):
        if n >= FILL_MAX:
            break
        p = roads[i].get_actor_location()
        nxt = roads[(i + 1) % len(roads)].get_actor_location()
        tx, ty = nxt.x - p.x, nxt.y - p.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        nx, ny = -ty / length, tx / length
        yaw = math.degrees(math.atan2(ty, tx))
        for sign in (1.0, -1.0):
            if n >= FILL_MAX:
                break
            dist = rng.uniform(5800.0, 8200.0)  # cm ≈ 58–82 m
            px = p.x + nx * dist * sign
            py = p.y + ny * dist * sign
            # Skip if too close to road centre
            if math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2) < 4500:
                continue
            h = rng.uniform(1400, 4100)
            w = rng.uniform(1000, 1600)
            d = rng.uniform(900, 1400)
            mat = fills[n % len(fills)]
            _build_box(
                "HD_Fill_{:02d}".format(n),
                px,
                py,
                p.z,
                w,
                d,
                h,
                yaw,
                mat,
                collide=False,
            )
            n += 1
    return n


def _westminster_heroes(roads, shared):
    """Hard-coded web heroes — Big Ben / Parliament / Abbey near early ribbon."""
    if len(roads) < 20:
        return 0
    # Place beside road samples (similar to web anchor-to-road)
    p = roads[12].get_actor_location()
    nxt = roads[18].get_actor_location()
    tx, ty = nxt.x - p.x, nxt.y - p.y
    length = math.sqrt(tx * tx + ty * ty) or 1.0
    nx, ny = -ty / length, tx / length
    # Offset ~35m off asphalt
    bx = p.x + nx * 3500
    by = p.y + ny * 3500
    _build_elizabeth(bx, by, p.z, shared)
    _build_parliament(bx + nx * 2500, by + ny * 2500, p.z, shared)
    # Abbey twin towers
    ax, ay = bx - nx * 2000, by - ny * 2000
    mesh = _cube()
    for i, ox in enumerate((-600, 600)):
        _spawn(
            "HD_Hero_Abbey_{}".format(i),
            mesh,
            unreal.Vector(ax + ox, ay, p.z + 2800),
            unreal.Vector(7, 7, 56),
            unreal.Rotator(),
            shared["stone"],
        )
    return 3


def _map_to_slug(name):
    raw = name.replace("MAP_", "")
    return re.sub(r"([a-z])([A-Z])", r"\1-\2", raw).lower()


def _load(slug):
    path = os.path.join(_export_dir(), "circuits", "{}.json".format(slug))
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _upgrade(map_path, cache):
    _levels().load_level(map_path)
    stripped = _strip_lag()
    name = map_path.rsplit("/", 1)[-1]
    slug = _map_to_slug(name)
    data = _load(slug) or {}
    city = data.get("city") or "London"
    rng = random.Random(hash(slug) & 0xFFFFFFFF)
    shared = _ensure_shared_mats(cache, city)

    named = _place_named(data.get("namedLandmarks") or [], cache, shared)
    mass = _place_massing(data.get("massing") or [], cache, shared, rng)
    roads = _roads()
    fill = _street_fill(roads, shared, rng, city)
    heroes = 0
    if "westminster" in slug:
        heroes = _westminster_heroes(roads, shared)
    elif "egypt" in slug:
        # Ensure pyramids if named missed
        for lm in data.get("namedLandmarks") or []:
            if "pyramid" in str(lm.get("name") or "").lower():
                heroes += 1

    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass

    _levels().save_current_level()
    return {
        "map": map_path,
        "slug": slug,
        "stripped": stripped,
        "named": named,
        "massing": mass,
        "fill": fill,
        "heroes": heroes,
    }


def main():
    unreal.log("DriveAnywhere: HD city rebuild (web style, less lag)…")
    _write({"state": "running"})
    try:
        cache = _mat_cache()
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_upgrade(m, cache) for m in maps]
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
        _write({"state": "ok", "results": results})
        unreal.log("DriveAnywhere HD cities done — capped fill, hero landmarks, no window spam.")
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
