"""Upgrade all DriveAnywhere maps with real building meshes.

Named landmarks → multi-part buildings (base / body / crown).
Road-adjacent fill → simple city blocks kept clear of asphalt.
Heroes (Burj, Elizabeth Tower, etc.) get distinctive silhouettes.
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
MAT_DIR = "/Game/DriveAnywhere/Materials/Buildings"
EXPORT = None  # set in main

HERO_TAGS = (
    "elizabeth",
    "big ben",
    "parliament",
    "burj",
    "tokyo tower",
    "skytree",
    "empire state",
    "statue of liberty",
    "christ the redeemer",
    "pyramid",
    "matterhorn",
    "one canada square",
    "shard",
    "gherkin",
    "mi6",
    "millbank",
    "vauxhall tower",
)


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "buildings-status.json",
        )
    )


def _write_status(payload):
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


def _folder(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _make_mat(name, color, rough=0.7, metallic=0.0):
    full = "{}/{}".format(MAT_DIR, name)
    _folder(MAT_DIR)
    if unreal.EditorAssetLibrary.does_asset_exist(full):
        mat = unreal.EditorAssetLibrary.load_asset(full)
    else:
        mat = _tools().create_asset(name, MAT_DIR, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    base = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0
    )
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(
        base, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    r = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 160
    )
    r.set_editor_property("r", rough)
    unreal.MaterialEditingLibrary.connect_material_property(
        r, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    if metallic > 0.01:
        m = unreal.MaterialEditingLibrary.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -400, 280
        )
        m.set_editor_property("r", metallic)
        unreal.MaterialEditingLibrary.connect_material_property(
            m, "", unreal.MaterialProperty.MP_METALLIC
        )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(full)
    return mat


def _ensure_mats():
    return {
        "stone": _make_mat("M_Bld_Stone", unreal.LinearColor(0.45, 0.42, 0.38, 1), 0.85),
        "brick": _make_mat("M_Bld_Brick", unreal.LinearColor(0.35, 0.18, 0.12, 1), 0.9),
        "glass": _make_mat("M_Bld_Glass", unreal.LinearColor(0.15, 0.25, 0.35, 1), 0.15, 0.6),
        "concrete": _make_mat("M_Bld_Concrete", unreal.LinearColor(0.55, 0.55, 0.52, 1), 0.88),
        "dark": _make_mat("M_Bld_Dark", unreal.LinearColor(0.08, 0.09, 0.11, 1), 0.5, 0.2),
        "sand": _make_mat("M_Bld_Sand", unreal.LinearColor(0.72, 0.62, 0.42, 1), 0.92),
        "white": _make_mat("M_Bld_White", unreal.LinearColor(0.85, 0.86, 0.88, 1), 0.55),
        "gold": _make_mat("M_Bld_Gold", unreal.LinearColor(0.65, 0.5, 0.2, 1), 0.35, 0.7),
        "green": _make_mat("M_Bld_Green", unreal.LinearColor(0.12, 0.35, 0.18, 1), 0.8),
        "red": _make_mat("M_Bld_Red", unreal.LinearColor(0.45, 0.08, 0.06, 1), 0.75),
    }


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _cylinder():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")


def _cone():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")


def _spawn_mesh(label, mesh, loc, scale, rot, mat, collide=True):
    eas = _actors()
    actor = eas.spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    actor.set_actor_label(label)
    try:
        actor.set_actor_scale3d(scale)
    except Exception:
        pass
    try:
        actor.set_folder_path("DriveAnywhere/Buildings")
    except Exception:
        pass
    comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if comp and mesh:
        comp.set_static_mesh(mesh)
        if mat:
            comp.set_material(0, mat)
        if collide:
            comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            comp.set_collision_profile_name("BlockAll")
        else:
            comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return actor


def _is_hero(name: str) -> bool:
    lower = name.lower()
    return any(t in lower for t in HERO_TAGS)


def _mat_for_name(name: str, mats: dict, rng: random.Random):
    n = name.lower()
    if "burj" in n or "glass" in n or "tower" in n and "tokyo" not in n:
        return mats["glass"]
    if "pyramid" in n or "giza" in n or "egypt" in n:
        return mats["sand"]
    if "brick" in n or "palace" in n or "church" in n:
        return mats["brick"]
    if "mi6" in n or "dark" in n:
        return mats["dark"]
    if "gold" in n or "burj al arab" in n:
        return mats["gold"]
    if "statue" in n or "christ" in n:
        return mats["white"]
    if "parliament" in n or "elizabeth" in n or "big ben" in n:
        return mats["stone"]
    return rng.choice([mats["stone"], mats["concrete"], mats["brick"], mats["glass"], mats["white"]])


def _kill_old_buildings():
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if lab.startswith("Bld_") or lab.startswith("Hero_") or lab.startswith("Landmark_"):
            # Keep Notes? Replace Notes that were landmarks
            try:
                eas.destroy_actor(a)
            except Exception:
                pass
        # Old Note landmarks from importer
        if a.get_class() and "Note" in str(a.get_class().get_name()):
            if lab.startswith("Hero_") or lab.startswith("Landmark_"):
                try:
                    eas.destroy_actor(a)
                except Exception:
                    pass


def _build_standard(name, x, y, z, height_cm, mats, rng, hero=False):
    mesh = _cube()
    mat = _mat_for_name(name, mats, rng)
    h = max(height_cm, 1200.0)
    # Footprint grows a bit with height, heroes wider
    base_w = (18.0 if hero else 12.0) + min(h / 800.0, 25.0)
    base_d = base_w * rng.uniform(0.75, 1.15)
    # Cube is 100cm; scale Z = height/100
    body_h = h * 0.82
    base_h = h * 0.08
    crown_h = h * 0.12

    base_loc = unreal.Vector(x, y, z + base_h * 0.5)
    body_loc = unreal.Vector(x, y, z + base_h + body_h * 0.5)
    crown_loc = unreal.Vector(x, y, z + base_h + body_h + crown_h * 0.5)
    rot = yaw_rot(rng.uniform(-20, 20))

    prefix = "Bld_Hero" if hero else "Bld"
    safe = re.sub(r"[^A-Za-z0-9]+", "_", name)[:40]

    _spawn_mesh(
        "{}_{}_Base".format(prefix, safe),
        mesh,
        base_loc,
        unreal.Vector(base_w * 1.08, base_d * 1.08, base_h / 100.0),
        rot,
        mats["concrete"],
    )
    _spawn_mesh(
        "{}_{}_Body".format(prefix, safe),
        mesh,
        body_loc,
        unreal.Vector(base_w, base_d, body_h / 100.0),
        rot,
        mat,
    )
    # Crown / setback
    _spawn_mesh(
        "{}_{}_Crown".format(prefix, safe),
        mesh,
        crown_loc,
        unreal.Vector(base_w * 0.72, base_d * 0.72, crown_h / 100.0),
        rot,
        mats["dark"] if mat == mats["glass"] else mats["white"],
    )


def _build_elizabeth_tower(x, y, z, mats):
    """Clock tower silhouette — tall shaft + lantern."""
    mesh = _cube()
    cyl = _cylinder()
    h = 9600.0
    # Shaft
    _spawn_mesh(
        "Bld_Hero_ElizabethTower_Shaft",
        mesh,
        unreal.Vector(x, y, z + h * 0.42),
        unreal.Vector(9.0, 9.0, h * 0.84 / 100.0),
        yaw_rot(0),
        mats["stone"],
    )
    # Clock faces band
    _spawn_mesh(
        "Bld_Hero_ElizabethTower_Clock",
        mesh,
        unreal.Vector(x, y, z + h * 0.72),
        unreal.Vector(11.0, 11.0, 6.0),
        yaw_rot(0),
        mats["white"],
    )
    # Lantern / spire
    if cyl:
        _spawn_mesh(
            "Bld_Hero_ElizabethTower_Lantern",
            cyl,
            unreal.Vector(x, y, z + h * 0.92),
            unreal.Vector(4.0, 4.0, 12.0),
            yaw_rot(0),
            mats["gold"],
        )


def _build_pyramid(x, y, z, mats, name):
    cone = _cone() or _cube()
    safe = re.sub(r"[^A-Za-z0-9]+", "_", name)[:40]
    _spawn_mesh(
        "Bld_Hero_{}".format(safe),
        cone,
        unreal.Vector(x, y, z + 3500),
        unreal.Vector(80.0, 80.0, 70.0),
        yaw_rot(0),
        mats["sand"],
    )


def _build_burj(x, y, z, mats, name):
    mesh = _cube()
    cyl = _cylinder() or mesh
    safe = re.sub(r"[^A-Za-z0-9]+", "_", name)[:40]
    # Tiered tower
    tiers = [(22, 0.35), (16, 0.55), (11, 0.75), (6, 0.92)]
    h = 28000.0 if "khalifa" in name.lower() else 16000.0
    prev = 0.0
    for i, (w, top_frac) in enumerate(tiers):
        seg_h = (top_frac - (0.0 if i == 0 else tiers[i - 1][1])) * h
        mid_z = z + prev + seg_h * 0.5
        prev = prev + seg_h
        _spawn_mesh(
            "Bld_Hero_{}_T{}".format(safe, i),
            cyl,
            unreal.Vector(x, y, mid_z),
            unreal.Vector(w, w, seg_h / 100.0),
            yaw_rot(i * 12.0),
            mats["glass"],
        )


def _build_tokyo_tower(x, y, z, mats):
    mesh = _cube()
    # Lattice-ish: red tapering stack
    for i, (w, frac) in enumerate([(14, 0.25), (10, 0.5), (6, 0.75), (3, 0.95)]):
        h = 33300.0 * 0.35  # scaled readable
        z0 = z + (0 if i == 0 else [0.25, 0.5, 0.75][i - 1]) * h
        z1 = z + frac * h
        mid = (z0 + z1) * 0.5
        _spawn_mesh(
            "Bld_Hero_TokyoTower_{}".format(i),
            mesh,
            unreal.Vector(x, y, mid),
            unreal.Vector(w, w, (z1 - z0) / 100.0),
            yaw_rot(0),
            mats["red"] if i % 2 == 0 else mats["white"],
        )


def _spawn_named(landmarks, mats, rng):
    count = 0
    for lm in landmarks:
        name = str(lm.get("name") or "Building")
        x = float(lm["x"])
        y = float(lm["y"])
        z = float(lm.get("z") or 0.0)
        h = float(lm.get("heightCm") or 4000.0)
        lower = name.lower()
        hero = _is_hero(name)

        if "elizabeth" in lower or "big ben" in lower:
            _build_elizabeth_tower(x, y, z, mats)
        elif "pyramid" in lower:
            _build_pyramid(x, y, z, mats, name)
        elif "burj" in lower:
            _build_burj(x, y, z, mats, name)
        elif "tokyo tower" in lower:
            _build_tokyo_tower(x, y, z, mats)
        else:
            _build_standard(name, x, y, z, h, mats, rng, hero=hero)
        count += 1
    return count


def _road_samples():
    samples = []
    for a in _actors().get_all_level_actors():
        if _label(a).startswith("Road_"):
            samples.append(a.get_actor_location())
    return samples


def _min_road_dist(px, py, roads):
    best = 1e18
    for r in roads:
        dx = px - r.x
        dy = py - r.y
        d = math.sqrt(dx * dx + dy * dy)
        if d < best:
            best = d
    return best


def _spawn_fill(roads, mats, rng, density=0.35):
    """City blocks beside the ribbon — never on the asphalt."""
    if len(roads) < 8:
        return 0
    mesh = _cube()
    count = 0
    step = max(1, int(1.0 / max(density, 0.1)))
    for i in range(0, len(roads), step):
        r = roads[i]
        # Perpendicular offset left/right of travel
        nxt = roads[(i + 1) % len(roads)]
        tx, ty = nxt.x - r.x, nxt.y - r.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        nx, ny = -ty / length, tx / length
        for side, sign in (("L", 1.0), ("R", -1.0)):
            if rng.random() > density + 0.25:
                continue
            # Road width ~17m → keep 25–55m clear of centerline
            dist = rng.uniform(2800.0, 5200.0)
            px = r.x + nx * dist * sign
            py = r.y + ny * dist * sign
            if _min_road_dist(px, py, roads) < 2200.0:
                continue
            h = rng.uniform(1800.0, 9000.0)
            w = rng.uniform(8.0, 22.0)
            d = rng.uniform(8.0, 20.0)
            mat = rng.choice(
                [mats["stone"], mats["concrete"], mats["brick"], mats["glass"], mats["white"], mats["dark"]]
            )
            loc = unreal.Vector(px, py, r.z + h * 0.5)
            _spawn_mesh(
                "Bld_Fill_{}_{}".format(side, i),
                mesh,
                loc,
                unreal.Vector(w, d, h / 100.0),
                yaw_rot(math.degrees(math.atan2(ty, tx))),
                mat,
            )
            count += 1
    return count


def _map_to_slug(map_name: str) -> str:
    # MAP_WestminsterSprint → westminster-sprint
    raw = map_name.replace("MAP_", "")
    # Insert dashes before capitals
    spaced = re.sub(r"([a-z])([A-Z])", r"\1-\2", raw)
    return spaced.lower()


def _load_circuit(slug: str):
    path = os.path.join(_export_dir(), "circuits", "{}.json".format(slug))
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def upgrade_map(map_path: str, mats: dict) -> dict:
    _levels().load_level(map_path)
    map_name = map_path.rsplit("/", 1)[-1]
    slug = _map_to_slug(map_name)
    data = _load_circuit(slug)
    rng = random.Random(hash(slug) & 0xFFFFFFFF)

    _kill_old_buildings()

    named = 0
    if data:
        named = _spawn_named(data.get("namedLandmarks") or [], mats, rng)

    roads = _road_samples()
    fill = _spawn_fill(roads, mats, rng, density=0.4)

    _levels().save_current_level()
    unreal.log(
        "DriveAnywhere buildings: {} → {} named, {} fill ({})".format(
            map_name, named, fill, slug
        )
    )
    return {"map": map_path, "slug": slug, "named": named, "fill": fill}


def main():
    unreal.log("DriveAnywhere: building city upgrade…")
    _write_status({"state": "running"})
    try:
        mats = _ensure_mats()
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [upgrade_map(m, mats) for m in maps]

        west = "{}/MAP_WestminsterSprint".format(MAPS)
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            _levels().load_level(west)
            _levels().save_current_level()

        _write_status({"state": "ok", "results": results})
        unreal.log("DriveAnywhere: buildings done on {} maps.".format(len(results)))
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error(str(exc))
        raise


main()
