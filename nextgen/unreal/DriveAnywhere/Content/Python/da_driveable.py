"""DriveAnywhere next-level: no track overlap, no hero duplicates, driveable detail, map colours."""
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
MAT = "/Game/DriveAnywhere/Materials/Next"
# Minimum centreline clearance (cm) — keep buildings off asphalt + Tecpro
MIN_ROAD_CLEAR_CM = 7200.0  # keep footprints well clear of asphalt + Tecpro
ROAD_PURGE_MARGIN_CM = 2800.0  # hard kill anything this close to asphalt edge
BARRIER_STRIDE = 1
TREE_STRIDE = 1
LIGHT_STRIDE = 1
MAX_UNIQUE = 81
MAX_NAMED = 90
MAX_MASSING = 135
MAX_SKYLINE = 72
MAX_STREET = 105
MAX_HEROES = 30

# Names that are covered by route heroes — never spawn Unique_/HD_Named copies
HERO_ALIASES = {
    "big ben", "elizabeth tower", "big ben lantern", "elizabeth tower court",
    "parliament", "palace of westminster", "parliament frame",
    "abbey", "westminster abbey", "abbey chapter",
    "victoria tower",
    "mi6", "mi6 building",
    "london eye", "london eye court", "eye wheel court", "london eye south",
    "admiralty arch", "admiralty",
    "millbank tower", "millbank",
    "st george wharf", "st george wharf tower",
    "westminster bridge",
    "battersea", "battersea power station",
    "horse guards",
    "the shard", "shard",
    "burj khalifa", "khalifa needle", "burj lantern court",
    "burj al arab", "burj al arab sail",
    "ain dubai", "cayan tower", "dubai frame", "museum of the future",
    "empire state", "empire state building", "empire deco", "chrysler", "chrysler building",
    "statue of liberty", "liberty statue court", "liberty lantern",
    "one world trade", "brooklyn bridge", "flatiron", "woolworth",
    "tokyo tower", "tokyo tower court", "senso-ji", "sensoji",
    "skytree", "skytree needle", "tokyo skytree",
    "christ the redeemer", "cristo", "cristo redentor", "cristo statue",
    "sugarloaf", "sugarloaf mountain", "sugarloaf cone",
    "great pyramid", "great pyramid of khufu", "khufu beacon", "khafre", "menkaure",
    "great sphinx", "sphinx",
    "one canada square", "canada square lantern", "hsbc tower", "citigroup",
    "tate britain", "foreign office", "cleopatra", "county hall", "portcullis",
    "ministry of defence", "lambeth palace", "the gherkin", "gherkin", "walkie talkie",
    "st pauls", "st paul", "tower bridge", "the monument",
    "scotland yard", "shell centre", "us embassy", "boudica", "vauxhall cross",
    "cenotaph", "downing street", "nine elms", "st thomas", "riverwalk",
    "chrysler", "flatiron", "woolworth", "grand central", "brooklyn bridge",
    "senso-ji", "meiji", "mode gakuen", "rainbow bridge", "matterhorn",
}


def _status_path():
    return os.path.normpath(os.path.join(
        unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
        "..", "export", "driveable-status.json"))


def _write(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def _export_dir():
    return os.path.normpath(os.path.join(
        unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
        "..", "export"))


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
    h = (h or "#8899aa").lstrip("#")
    if len(h) != 6:
        return unreal.LinearColor(0.5, 0.45, 0.4, 1)
    return unreal.LinearColor(
        int(h[0:2], 16) / 255.0,
        int(h[2:4], 16) / 255.0,
        int(h[4:6], 16) / 255.0,
        1.0,
    )


_MATS = {}


def _mat(key, color, emis=0.05, rough=0.8, metallic=0.0, force=False):
    """Load cached material; only build/recompile when missing (avoids OOM)."""
    if key in _MATS:
        return _MATS[key]
    _folder(MAT)
    path = "{}/M_{}".format(MAT, key)
    if unreal.EditorAssetLibrary.does_asset_exist(path) and not force:
        mat = unreal.EditorAssetLibrary.load_asset(path)
        _MATS[key] = mat
        return mat
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        mat = unreal.EditorAssetLibrary.load_asset(path)
    else:
        mat = _tools().create_asset("M_{}".format(key), MAT, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    base = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
    em = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 160)
    em.set_editor_property(
        "constant",
        unreal.LinearColor(color.r * emis, color.g * emis, color.b * emis, 1),
    )
    unreal.MaterialEditingLibrary.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    r = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 300)
    r.set_editor_property("r", rough)
    unreal.MaterialEditingLibrary.connect_material_property(r, "", unreal.MaterialProperty.MP_ROUGHNESS)
    if metallic > 0.01:
        m = unreal.MaterialEditingLibrary.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -400, 380)
        m.set_editor_property("r", metallic)
        unreal.MaterialEditingLibrary.connect_material_property(m, "", unreal.MaterialProperty.MP_METALLIC)
    unreal.MaterialEditingLibrary.recompile_material(mat)
    try:
        unreal.EditorAssetLibrary.save_asset(path)
    except Exception:
        pass
    _MATS[key] = mat
    return mat


CITY_PALETTE = {
    # Saturated showcase moods — never pale/whitewashed
    "westminster-sprint": {"stone": "#b89a72", "accent": "#c9a227", "asphalt": (0.035, 0.035, 0.038), "sky": (0.35, 0.52, 0.78)},
    "embankment-run": {"stone": "#a89070", "accent": "#8a7050", "asphalt": (0.035, 0.035, 0.038), "sky": (0.34, 0.5, 0.76)},
    "canary-wharf-loop": {"stone": "#6a8498", "accent": "#4a90b0", "asphalt": (0.03, 0.03, 0.035), "sky": (0.3, 0.45, 0.72)},
    "dubai-marina-circuit": {"stone": "#7a98b0", "accent": "#c9a84a", "asphalt": (0.06, 0.05, 0.04), "sky": (0.45, 0.65, 0.9)},
    "egypt-pyramids": {"stone": "#b88848", "accent": "#d4b878", "asphalt": (0.09, 0.07, 0.05), "sky": (0.55, 0.68, 0.88)},
    "new-york-harbor-circuit": {"stone": "#7a7870", "accent": "#c4a860", "asphalt": (0.03, 0.03, 0.035), "sky": (0.38, 0.55, 0.82)},
    "tokyo-drift-circuit": {"stone": "#2a3840", "accent": "#c8102e", "asphalt": (0.025, 0.025, 0.03), "sky": (0.12, 0.16, 0.28)},
    "alps-mountain-pass": {"stone": "#6a5040", "accent": "#d8e0e8", "asphalt": (0.05, 0.05, 0.055), "sky": (0.45, 0.62, 0.88)},
    "rio-coast-circuit": {"stone": "#6a7860", "accent": "#c9a227", "asphalt": (0.05, 0.045, 0.04), "sky": (0.4, 0.65, 0.92)},
}


def _city_mats(slug):
    pal = CITY_PALETTE.get(slug, CITY_PALETTE["westminster-sprint"])
    a = pal["asphalt"]
    sk = pal["sky"]
    return {
        "stone": _mat("hq2_stone_{}".format(slug[:8]), _hex(pal["stone"]), 0.04, 0.82),
        "dark": _mat("hq2_dark_{}".format(slug[:8]), _hex("#4a3a2c"), 0.03, 0.9),
        "gold": _mat("hq2_gold_{}".format(slug[:8]), _hex(pal["accent"]), 0.35, 0.35, 0.75),
        "white": _mat("hq2_white_{}".format(slug[:8]), _hex("#d8d0c4"), 0.08, 0.55),
        "copper": _mat("hq2_copper_{}".format(slug[:8]), _hex("#3a6840"), 0.1, 0.5, 0.45),
        "glass": _mat("hq2_glass_{}".format(slug[:8]), _hex("#3a6a88"), 0.4, 0.08, 0.85),
        "steel": _mat("hq2_steel_{}".format(slug[:8]), _hex("#6a7278"), 0.15, 0.25, 0.9),
        "sand": _mat("hq2_sand_{}".format(slug[:8]), _hex("#b88848"), 0.05, 0.92),
        "green": _mat("hq2_green_{}".format(slug[:8]), _hex("#2a5530"), 0.06, 0.85),
        "red": _mat("hq2_red_{}".format(slug[:8]), _hex("#a01020"), 0.15, 0.5),
        "blue": _mat("hq2_blue_{}".format(slug[:8]), _hex("#1a3a68"), 0.12, 0.45, 0.7),
        "brick": _mat("hq2_brick_{}".format(slug[:8]), _hex("#6a4030"), 0.04, 0.9),
        "trim": _mat("hq2_trim_{}".format(slug[:8]), _hex("#8a7860"), 0.05, 0.8),
        "asphalt": _mat("hq2_asphalt_{}".format(slug[:8]), unreal.LinearColor(a[0], a[1], a[2], 1), 0.12, 0.95),
        "line": _mat("hq2_line_{}".format(slug[:8]), unreal.LinearColor(0.85, 0.82, 0.7, 1), 0.35, 0.55),
        "sky": _mat("hq2_sky_{}".format(slug[:8]), unreal.LinearColor(sk[0], sk[1], sk[2], 1), 0.6, 1.0),
        "tecpro_w": _mat("hq2_tec_w", unreal.LinearColor(0.85, 0.85, 0.88, 1), 0.08, 0.6),
        "tecpro_r": _mat("hq2_tec_r", unreal.LinearColor(0.7, 0.04, 0.06, 1), 0.15, 0.6),
        "bark": _mat("hq2_bark", unreal.LinearColor(0.22, 0.12, 0.06, 1), 0.03, 0.95),
        "leaf": _mat("hq2_leaf", unreal.LinearColor(0.1, 0.32, 0.12, 1), 0.08, 0.88),
        "lamp": _mat("hq2_lamp", unreal.LinearColor(1.0, 0.9, 0.65, 1), 2.0, 0.35),
        "sign": _mat("hq2_sign", unreal.LinearColor(0.9, 0.7, 0.05, 1), 0.4, 0.4),
        "pole": _mat("hq2_pole", unreal.LinearColor(0.08, 0.08, 0.1, 1), 0.03, 0.45, 0.5),
        "ground": _mat("hq2_ground_{}".format(slug[:8]), unreal.LinearColor(0.12, 0.13, 0.11, 1), 0.02, 0.95),
    }


def _movable(a):
    try:
        if a.root_component:
            a.root_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
    except Exception:
        pass


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _cyl():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")


def _cone():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")


def _spawn_mesh(name, mesh, loc, scale, rot, mat, collide=True, folder="DriveAnywhere/City"):
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
            c.set_editor_property("cast_shadow", True)
            c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass
        if collide:
            c.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            c.set_collision_profile_name("BlockAll")
        else:
            c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return a


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


def _is_hero_dupe(name):
    """True if this named/unique label is already covered by a route hero."""
    low = (name or "").lower().strip()
    if not low:
        return False
    if low in HERO_ALIASES:
        return True
    for key in (
        "big ben", "elizabeth tower", "palace of westminster", "westminster abbey",
        "victoria tower", "mi6", "london eye", "admiralty", "millbank",
        "st george wharf", "westminster bridge", "battersea", "horse guards", "the shard",
        "burj khalifa", "burj al arab", "ain dubai", "dubai frame", "cayan",
        "empire state", "chrysler", "statue of liberty", "one world trade",
        "tokyo tower", "tokyo skytree", "skytree", "senso-ji",
        "christ the redeemer", "cristo redentor", "sugarloaf",
        "great pyramid", "great sphinx", "khafre", "menkaure",
        "one canada square", "shell mex", "tate modern", "matterhorn",
    ):
        if key in low:
            return True
    # Exact alias containment only for longer phrases (avoid "abbey" false positives)
    for alias in HERO_ALIASES:
        if len(alias) >= 8 and alias in low:
            return True
    return False


def _map_slug(name):
    return re.sub(r"([a-z])([A-Z])", r"\1-\2", name.replace("MAP_", "")).lower()


def _load(slug):
    with open(os.path.join(_export_dir(), "circuits", "{}.json".format(slug)), encoding="utf-8") as f:
        return json.load(f)


def _roads():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]

    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    roads.sort(key=key)
    return roads


def _road_samples(roads):
    """(x,y,z, half_width_cm) along ribbon."""
    out = []
    for a in roads:
        loc = a.get_actor_location()
        sc = a.get_actor_scale3d()
        # road scale.y is width/100 for cube
        half_w = abs(sc.y) * 50.0
        out.append((loc.x, loc.y, loc.z, max(half_w, 700.0)))
    return out


def _clearance(samples, x, y, footprint_half=1200.0):
    """Min signed distance from point (+ footprint) to asphalt edge. Negative = on track."""
    best = 1e12
    for sx, sy, sz, half_w in samples:
        d = math.hypot(x - sx, y - sy) - half_w - footprint_half
        if d < best:
            best = d
    return best


def _find_safe_spot(samples, roads, ri, side_sign, rng, footprint_half=1500.0):
    """Walk outward until clear of road."""
    if ri >= len(roads) - 1:
        ri = max(0, len(roads) - 2)
    p = roads[ri].get_actor_location()
    nxt = roads[min(ri + 1, len(roads) - 1)].get_actor_location()
    tx, ty = nxt.x - p.x, nxt.y - p.y
    length = math.sqrt(tx * tx + ty * ty) or 1.0
    nx, ny = -ty / length, tx / length
    for dist in (7500, 9500, 12000, 15000, 18500, 23000, 28000, 34000):
        # jitter along tangent so buildings don't stack in a line
        along = rng.uniform(-800, 800)
        x = p.x + nx * dist * side_sign + (tx / length) * along
        y = p.y + ny * dist * side_sign + (ty / length) * along
        if _clearance(samples, x, y, footprint_half) >= MIN_ROAD_CLEAR_CM - footprint_half:
            return x, y, float(p.z)
    return None


def _center(roads):
    if not roads:
        return unreal.Vector(0, 0, 0)
    sx = sy = sz = 0.0
    for a in roads:
        p = a.get_actor_location()
        sx += p.x
        sy += p.y
        sz += p.z
    n = float(len(roads))
    return unreal.Vector(sx / n, sy / n, sz / n)


def _place_skyline(roads, samples, mats, rng, slug):
    """Far-ring skyline for city showcase — tall, never near asphalt."""
    _kill(["Skyline_"])
    if not roads or len(roads) < 12:
        return 0
    mesh = _cube()
    n = 0
    paints = [mats["glass"], mats["steel"], mats["stone"], mats["brick"], mats["dark"], mats["sand"]]
    stride = max(1, len(roads) // max(MAX_SKYLINE, 1))
    for i in range(0, len(roads) - 1, stride):
        if n >= MAX_SKYLINE:
            break
        side = 1 if (i // stride) % 2 == 0 else -1
        # Far out so heroes stay readable from track
        spot = _find_safe_spot(samples, roads, i, side, rng, 2000.0)
        if not spot:
            continue
        # Push further for skyline ring — stagger two depth rings
        p = roads[i].get_actor_location()
        nxt = roads[min(i + 1, len(roads) - 1)].get_actor_location()
        tx, ty = nxt.x - p.x, nxt.y - p.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        nx, ny = -ty / length, tx / length
        ring = 0 if n % 3 else 1
        dist = (18000.0 if ring == 0 else 26000.0) + rng.uniform(0, 9000)
        x = p.x + nx * dist * side
        y = p.y + ny * dist * side
        z = float(p.z)
        if _clearance(samples, x, y, 2000.0) < 11000.0:
            continue
        h = 5500.0 + rng.uniform(0, 16000.0)
        if "dubai" in slug or "canary" in slug or "york" in slug or "tokyo" in slug:
            h *= 1.4
        elif "egypt" in slug or "alps" in slug:
            h *= 0.55
        w = 10.0 + rng.uniform(0, 22.0)
        d = 9.0 + rng.uniform(0, 16.0)
        mat = paints[n % len(paints)]
        yaw = rng.uniform(-12, 12)
        # Stepped massing so towers read as real skyline, not flat slabs
        tiers = 2 + (n % 3)
        prev = 0.0
        for ti in range(tiers):
            t1 = (ti + 1) / float(tiers)
            shrink = 1.0 - ti * 0.12
            mid = z + h * (prev + t1) * 0.5
            _spawn_mesh(
                "Skyline_{:02d}_T{}".format(n, ti), mesh,
                unreal.Vector(x, y, mid),
                unreal.Vector(d * shrink, w * shrink, h * (t1 - prev) / 100.0),
                yaw_rot(yaw), mat if ti % 2 == 0 else paints[(n + 1) % len(paints)],
                collide=False, folder="DriveAnywhere/Skyline",
            )
            prev = t1
        # Glass facade strips (photo cue: curtain wall)
        floors = 6 + (n % 8)
        for fi in range(floors):
            t = 0.12 + 0.7 * (fi + 0.5) / floors
            _spawn_mesh(
                "Skyline_{:02d}_W{}".format(n, fi), mesh,
                unreal.Vector(x, y, z + h * t),
                unreal.Vector(d * 0.08, w * 0.88, h * 0.03 / 100.0),
                yaw_rot(yaw), mats["glass"], False, "DriveAnywhere/Skyline",
            )
        if h > 9000:
            _spawn_mesh(
                "Skyline_{:02d}_Crown".format(n), mesh,
                unreal.Vector(x, y, z + h * 0.97),
                unreal.Vector(d * 0.55, w * 0.55, h * 0.07 / 100.0),
                yaw_rot(0), mats["gold"] if n % 3 == 0 else mats["steel"],
                collide=False, folder="DriveAnywhere/Skyline",
            )
        n += 1
    return n


def _kill_city():
    return _kill([
        "Hero_", "HD_Hero_", "HD_Named_", "HD_Mass_", "HD_Fill_",
        "Unique_", "Bld_", "Skyline_", "NX_CarPreview_", "Street_", "Shop_", "Terrace_",
        "Label_", "LabelPlate_",
        "Label_Unique_", "Label_Named_", "Label_Hero_",
        "Label_BigBen", "Label_Parliament", "Label_Abbey",
    ])


def _lighting(center, mats, slug):
    """ONE directional sun only — competing lights wash the scene white."""
    _kill(["PR_Sun", "PR_Sky", "PR_Fog", "PR_Post", "PR_SkyDome", "DA_Sun", "DA_Sky", "DA_Fog", "DA_Post", "DA_Fill", "DA_Ambient", "NX_"])
    eas = _actors()
    # Destroy EVERY directional light in the level (default + leftovers)
    for a in list(eas.get_all_level_actors()):
        try:
            cls = a.get_class().get_name()
            lab = _label(a)
        except Exception:
            continue
        if "DirectionalLight" in cls or lab in ("Light Source", "DirectionalLight", "LightSource"):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass
        elif any(k in cls for k in ("SkyLight", "SkyAtmosphere", "ExponentialHeightFog", "PostProcessVolume")):
            lab = _label(a)
            if lab.startswith(("DA_", "PR_", "NX_", "Light Source", "SkyLight", "SkyAtmosphere", "ExponentialHeightFog", "PostProcess")) or lab == "":
                try:
                    # keep unnamed carefully — only kill known clutter / empties with those classes if labeled
                    if lab.startswith(("DA_", "PR_", "NX_")) or lab in ("SkyLight", "SkyAtmosphere", "ExponentialHeightFog", "PostProcessVolume", "Light Source"):
                        eas.destroy_actor(a)
                except Exception:
                    pass

    sun = eas.spawn_actor_from_class(unreal.DirectionalLight, center + unreal.Vector(0, 0, 22000))
    sun.set_actor_label("NX_Sun")
    try:
        pitch = -48.0 if "tokyo" in slug else (-55.0 if "dubai" in slug or "egypt" in slug else -38.0)
        sun.set_actor_rotation(pitch_yaw(pitch, 40.0, 0.0), False)
        sc = sun.get_component_by_class(unreal.DirectionalLightComponent)
        if sc:
            # Keep intensity modest — high values + Lumen = white wash
            intensity = 6.5 if "dubai" in slug or "egypt" in slug else (3.5 if "tokyo" in slug else 5.0)
            sc.set_editor_property("intensity", intensity)
            sc.set_editor_property("light_color", unreal.LinearColor(1.0, 0.96, 0.9, 1))
            sc.set_editor_property("cast_shadows", True)
            sc.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            try:
                sc.set_editor_property("forward_shading_priority", 0)
            except Exception:
                pass
            for prop, val in (
                ("atmosphere_sun_light", True),
                ("dynamic_shadow_distance_movable_light", 60000.0),
                ("indirect_lighting_intensity", 0.85),
                ("specular_scale", 0.9),
                ("shadow_amount", 1.0),
                ("volumetric_scattering_intensity", 0.35),
            ):
                try:
                    sc.set_editor_property(prop, val)
                except Exception:
                    pass
            # Demote any leftover directionals that spawn after us
            for a in list(eas.get_all_level_actors()):
                if a == sun:
                    continue
                try:
                    if "DirectionalLight" in a.get_class().get_name():
                        oc = a.get_component_by_class(unreal.DirectionalLightComponent)
                        if oc:
                            try:
                                oc.set_editor_property("forward_shading_priority", 10)
                                oc.set_editor_property("intensity", 0.01)
                            except Exception:
                                pass
                            eas.destroy_actor(a)
                except Exception:
                    pass
    except Exception:
        pass
    _movable(sun)

    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 26000))
    sk.set_actor_label("NX_SkyLight")
    try:
        sc = sk.get_component_by_class(unreal.SkyLightComponent)
        if sc:
            sc.set_editor_property("intensity", 1.4 if "tokyo" not in slug else 0.7)
            sc.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            try:
                sc.set_editor_property("real_time_capture", True)
            except Exception:
                pass
    except Exception:
        pass
    _movable(sk)

    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("NX_SkyAtmosphere")
    except Exception:
        pass

    try:
        fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 400))
        fog.set_actor_label("NX_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            dens = 0.012 if "dubai" in slug else (0.022 if "alps" in slug else (0.016 if "tokyo" in slug else 0.014))
            fc.set_editor_property("fog_density", dens)
            fc.set_editor_property("fog_height_falloff", 0.2)
            try:
                fc.set_editor_property("volumetric_fog", True)
                fc.set_editor_property("volumetric_fog_extinction_scale", 0.4)
            except Exception:
                pass
    except Exception:
        pass

    # NO emissive sky dome — it was bleaching the whole map white

    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("NX_Post")
        pp.set_editor_property("unbound", True)
        settings = pp.get_editor_property("settings")
        for prop, val in (
            ("override_auto_exposure_method", True),
            ("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL),
            ("override_auto_exposure_bias", True),
            ("auto_exposure_bias", -0.35),
            ("override_bloom_intensity", True),
            ("bloom_intensity", 0.25),
            ("override_ambient_occlusion_intensity", True),
            ("ambient_occlusion_intensity", 0.85),
            ("override_ambient_occlusion_radius", True),
            ("ambient_occlusion_radius", 250.0),
            ("override_color_saturation", True),
            ("color_saturation", unreal.Vector4(1.18, 1.16, 1.1, 1.0)),
            ("override_color_contrast", True),
            ("color_contrast", unreal.Vector4(1.12, 1.12, 1.1, 1.0)),
            ("override_color_gamma", True),
            ("color_gamma", unreal.Vector4(0.95, 0.95, 0.97, 1.0)),
            ("override_vignette_intensity", True),
            ("vignette_intensity", 0.35),
            ("override_motion_blur_amount", True),
            ("motion_blur_amount", 0.0),
        ):
            try:
                settings.set_editor_property(prop, val)
            except Exception:
                pass
        pp.set_editor_property("settings", settings)
    except Exception:
        pass

    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass


def _purge_road_blockers(samples):
    """Hard-delete any city mesh sitting on / into the racing asphalt."""
    if not samples:
        return 0
    eas = _actors()
    n = 0
    keep_prefix = ("Road_", "Tecpro_", "DA_Line_", "DA_PlayerStart", "Sign_", "Tree_", "Light_", "NX_Sun", "NX_Sky", "NX_Fog", "NX_Post", "NX_Car", "Label_")
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if not lab or lab.startswith(keep_prefix):
            continue
        if not lab.startswith(("Hero_", "Unique_", "HD_Named_", "HD_Mass_", "HD_Fill_", "Skyline_", "Bld_", "PR_", "DA_Bld")):
            continue
        try:
            loc = a.get_actor_location()
            sc = a.get_actor_scale3d()
            half = max(abs(sc.x), abs(sc.y)) * 50.0  # cube half-extent cm approx
        except Exception:
            continue
        # Heroes: push off instead of delete
        if lab.startswith("Hero_"):
            if _clearance(samples, loc.x, loc.y, half) < ROAD_PURGE_MARGIN_CM:
                best = None
                best_d = 1e12
                best_half = 900.0
                for sx, sy, sz, hw in samples:
                    d = math.hypot(loc.x - sx, loc.y - sy)
                    if d < best_d:
                        best_d = d
                        best = (sx, sy)
                        best_half = hw
                if best and best_d > 1:
                    ux = (loc.x - best[0]) / best_d
                    uy = (loc.y - best[1]) / best_d
                    target = best_half + MIN_ROAD_CLEAR_CM + half
                    a.set_actor_location(
                        unreal.Vector(best[0] + ux * target, best[1] + uy * target, loc.z),
                        False, False,
                    )
                    n += 1
            continue
        if _clearance(samples, loc.x, loc.y, half) < ROAD_PURGE_MARGIN_CM:
            try:
                eas.destroy_actor(a)
                n += 1
            except Exception:
                pass
    return n


def _paint_ground(mats):
    """Darken default floor / landscape-ish planes so asphalt reads."""
    n = 0
    for a in _actors().get_all_level_actors():
        lab = _label(a)
        if lab.startswith(("Floor", "Ground", "Plane", "SM_Plane", "Landscape")) or lab in ("Floor", "StaticMeshActor"):
            c = a.get_component_by_class(unreal.StaticMeshComponent)
            if c and mats.get("ground"):
                try:
                    c.set_material(0, mats["ground"])
                    n += 1
                except Exception:
                    pass
        if lab.startswith("Road_"):
            c = a.get_component_by_class(unreal.StaticMeshComponent)
            if c:
                c.set_material(0, mats["asphalt"])
                n += 1
    return n


def _dist_point_seg(px, py, ax, ay, bx, by):
    """Return (dist, t) from point to segment AB."""
    abx, aby = bx - ax, by - ay
    ab2 = abx * abx + aby * aby
    if ab2 < 1e-6:
        return math.hypot(px - ax, py - ay), 0.0
    t = ((px - ax) * abx + (py - ay) * aby) / ab2
    t_clamped = max(0.0, min(1.0, t))
    qx, qy = ax + abx * t_clamped, ay + aby * t_clamped
    return math.hypot(px - qx, py - qy), t


def _actor_height_cm(a):
    try:
        sc = a.get_actor_scale3d()
        return abs(sc.z) * 100.0
    except Exception:
        return 2000.0


def _open_sightlines(hero_locs, samples):
    """Cull / shove low Unique/Named/Mass that sit between track and heroes."""
    if not hero_locs or not samples:
        return {"cleared": 0, "pushed": 0}
    corridor = 4200.0  # cm half-width of viewing cone
    cleared = pushed = 0
    eas = _actors()
    blockers = []
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if lab.startswith(("Unique_", "HD_Named_", "HD_Mass_", "Bld_")):
            blockers.append(a)
    for hx, hy, hz, h_cm in hero_locs:
        # nearest road samples for viewing
        near = sorted(samples, key=lambda s: math.hypot(s[0] - hx, s[1] - hy))[:8]
        for sx, sy, sz, half_w in near:
            for a in list(blockers):
                try:
                    loc = a.get_actor_location()
                except Exception:
                    continue
                dist, t = _dist_point_seg(loc.x, loc.y, sx, sy, hx, hy)
                if t < 0.12 or t > 0.88 or dist > corridor:
                    continue
                ah = _actor_height_cm(a)
                # Always clear short blockers in the cone; push mid-height off-axis
                if ah < h_cm * 0.45 or ah < 3500:
                    try:
                        eas.destroy_actor(a)
                        if a in blockers:
                            blockers.remove(a)
                        cleared += 1
                    except Exception:
                        pass
                elif ah < h_cm * 0.75:
                    # push perpendicular to sightline
                    vx, vy = hx - sx, hy - sy
                    L = math.hypot(vx, vy) or 1.0
                    px, py = -vy / L, vx / L
                    # choose side farther from road centreline
                    side = 1.0 if (loc.x - sx) * px + (loc.y - sy) * py >= 0 else -1.0
                    try:
                        a.set_actor_location(
                            unreal.Vector(loc.x + px * side * 5500.0, loc.y + py * side * 5500.0, loc.z),
                            False, False,
                        )
                        pushed += 1
                    except Exception:
                        pass
    return {"cleared": cleared, "pushed": pushed}


def _polish_racer():
    """GT silhouette at spawn + snappier arcade Character feel (grip / brake / turn-in)."""
    try:
        bp = unreal.EditorAssetLibrary.load_asset("/Game/DriveAnywhere/BP_DARacer")
        if bp:
            gen = bp.generated_class()
            cdo = unreal.get_default_object(gen)
            move = cdo.get_editor_property("character_movement")
            if move:
                # Arcade GT: fast, planted, quick to turn — not floaty
                move.set_editor_property("max_walk_speed", 6200.0)
                move.set_editor_property("max_acceleration", 18500.0)
                try:
                    move.set_editor_property("ground_friction", 18.0)
                    move.set_editor_property("braking_deceleration_walking", 17500.0)
                    move.set_editor_property("braking_friction_factor", 1.35)
                    move.set_editor_property("air_control", 0.55)
                    move.set_editor_property("max_step_height", 40.0)
                    move.set_editor_property("jump_z_velocity", 0.0)
                    move.set_editor_property("orientation_to_movement", True)
                    move.set_editor_property("rotation_rate", yaw_rot(1100))
                    move.set_editor_property("mass", 1280.0)
                except Exception:
                    pass
            try:
                unreal.EditorAssetLibrary.save_asset("/Game/DriveAnywhere/BP_DARacer")
            except Exception:
                pass
    except Exception:
        pass
    starts = [a for a in _actors().get_all_level_actors() if _label(a) == "DA_PlayerStart"]
    if not starts:
        return False
    ps = starts[0].get_actor_location()
    yaw = 0.0
    try:
        yaw = starts[0].get_actor_rotation().yaw
    except Exception:
        pass
    _kill(["NX_CarPreview_"])
    body = _mat("hq2_car_body", _hex("#b01018"), 0.45, 0.12, 0.95)
    carbon = _mat("hq2_car_carbon", _hex("#1a1a1c"), 0.08, 0.35, 0.7)
    glass = _mat("hq2_car_glass", _hex("#0a1828"), 0.65, 0.04, 0.98)
    wheel = _mat("hq2_car_wheel", _hex("#0c0c0c"), 0.04, 0.7, 0.2)
    chrome = _mat("hq2_car_chrome", _hex("#d0d0d8"), 0.35, 0.1, 0.98)
    light = _mat("hq2_car_light", _hex("#ffe8c0"), 0.9, 0.05, 0.9)
    mesh, cyl = _cube(), _cyl() or _cube()
    # Lowered GT: nose / cabin / rear deck / aero / lights
    _spawn_mesh("NX_CarPreview_Body", mesh, ps + unreal.Vector(10, 0, 52),
                unreal.Vector(4.8, 2.05, 0.78), yaw_rot(yaw), body, True, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Nose", mesh, ps + unreal.Vector(210, 0, 48),
                unreal.Vector(0.9, 1.95, 0.45), yaw_rot(yaw), body, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Hood", mesh, ps + unreal.Vector(150, 0, 78),
                unreal.Vector(1.7, 1.9, 0.28), yaw_rot(yaw), body, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Cabin", mesh, ps + unreal.Vector(-30, 0, 118),
                unreal.Vector(2.1, 1.7, 0.62), yaw_rot(yaw), glass, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Roof", mesh, ps + unreal.Vector(-40, 0, 155),
                unreal.Vector(1.5, 1.55, 0.12), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Deck", mesh, ps + unreal.Vector(-170, 0, 95),
                unreal.Vector(1.4, 1.95, 0.35), yaw_rot(yaw), body, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Wing", mesh, ps + unreal.Vector(-210, 0, 138),
                unreal.Vector(0.32, 2.15, 0.22), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_WingEndL", mesh, ps + unreal.Vector(-210, -100, 145),
                unreal.Vector(0.35, 0.12, 0.45), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_WingEndR", mesh, ps + unreal.Vector(-210, 100, 145),
                unreal.Vector(0.35, 0.12, 0.45), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Splitter", mesh, ps + unreal.Vector(245, 0, 26),
                unreal.Vector(0.45, 2.05, 0.1), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_Diffuser", mesh, ps + unreal.Vector(-245, 0, 28),
                unreal.Vector(0.55, 1.85, 0.18), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_HL", mesh, ps + unreal.Vector(245, -70, 55),
                unreal.Vector(0.15, 0.35, 0.2), yaw_rot(yaw), light, False, "DriveAnywhere/Vehicles")
    _spawn_mesh("NX_CarPreview_HR", mesh, ps + unreal.Vector(245, 70, 55),
                unreal.Vector(0.15, 0.35, 0.2), yaw_rot(yaw), light, False, "DriveAnywhere/Vehicles")
    for ox, oy in ((-145, -98), (-145, 98), (155, -98), (155, 98)):
        _spawn_mesh("NX_CarPreview_W{}".format(ox + oy), cyl,
                    ps + unreal.Vector(ox, oy, 40),
                    unreal.Vector(0.7, 0.7, 0.32), pitch_yaw(90, yaw, 0), wheel, True, "DriveAnywhere/Vehicles")
        _spawn_mesh("NX_CarPreview_Rim{}".format(ox + oy), cyl,
                    ps + unreal.Vector(ox, oy, 40),
                    unreal.Vector(0.42, 0.42, 0.34), pitch_yaw(90, yaw, 0), chrome, False, "DriveAnywhere/Vehicles")
    # Class lineup beside spawn (Sports / F1 / Corsa / G-Wagon silhouettes)
    lineup = [
        ("F1", unreal.Vector(-900, 1400, 0), "#e8e8ec", True),
        ("Corsa", unreal.Vector(-900, 2800, 0), "#2a6ad4", False),
        ("GWagon", unreal.Vector(-900, 4200, 0), "#1a1a18", False),
    ]
    rad = math.radians(yaw)
    fx, fy = math.cos(rad), math.sin(rad)
    rx, ry = -fy, fx
    for name, offset, hexcol, open_wheel in lineup:
        ox = offset.x * fx + offset.y * rx
        oy = offset.x * fy + offset.y * ry
        base = unreal.Vector(ps.x + ox, ps.y + oy, ps.z)
        col = _mat("hq2_car_{}".format(name.lower()), _hex(hexcol), 0.4, 0.2, 0.9)
        if open_wheel:
            _spawn_mesh("NX_CarPreview_{}_Body".format(name), mesh, base + unreal.Vector(0, 0, 45),
                        unreal.Vector(3.2, 1.1, 0.45), yaw_rot(yaw), col, False, "DriveAnywhere/Vehicles")
            _spawn_mesh("NX_CarPreview_{}_Wing".format(name), mesh, base + unreal.Vector(-180, 0, 90),
                        unreal.Vector(0.2, 1.8, 0.15), yaw_rot(yaw), carbon, False, "DriveAnywhere/Vehicles")
        elif name == "GWagon":
            _spawn_mesh("NX_CarPreview_{}_Body".format(name), mesh, base + unreal.Vector(0, 0, 90),
                        unreal.Vector(4.0, 2.1, 1.5), yaw_rot(yaw), col, False, "DriveAnywhere/Vehicles")
        else:
            _spawn_mesh("NX_CarPreview_{}_Body".format(name), mesh, base + unreal.Vector(0, 0, 55),
                        unreal.Vector(3.6, 1.7, 0.9), yaw_rot(yaw), col, False, "DriveAnywhere/Vehicles")
            _spawn_mesh("NX_CarPreview_{}_Cabin".format(name), mesh, base + unreal.Vector(-40, 0, 110),
                        unreal.Vector(1.6, 1.5, 0.55), yaw_rot(yaw), glass, False, "DriveAnywhere/Vehicles")
        for wx, wy in ((-120, -85), (-120, 85), (130, -85), (130, 85)):
            _spawn_mesh("NX_CarPreview_{}_W{}{}".format(name, wx, wy), cyl,
                        base + unreal.Vector(wx, wy, 38),
                        unreal.Vector(0.55, 0.55, 0.28), pitch_yaw(90, yaw, 0), wheel, False, "DriveAnywhere/Vehicles")
    return True


def _paint_roads(mats):
    n = 0
    for a in _actors().get_all_level_actors():
        lab = _label(a)
        if lab.startswith("Road_"):
            c = a.get_component_by_class(unreal.StaticMeshComponent)
            if c:
                c.set_material(0, mats["asphalt"])
            _movable(a)
            n += 1
        elif lab.startswith("DA_Line_"):
            c = a.get_component_by_class(unreal.StaticMeshComponent)
            if c:
                c.set_material(0, mats["line"])
            _movable(a)
    return n


def _fix_spawn(data):
    _kill(["DA_PlayerStart"])
    start = data.get("start")
    points = data.get("splinePoints") or []
    if start:
        loc = unreal.Vector(float(start["x"]), float(start["y"]), float(start["z"]) + 220.0)
        yaw = float(start.get("yawDeg") or 0.0)
    elif len(points) >= 2:
        p0, p1 = points[0], points[1]
        loc = unreal.Vector(float(p0["x"]), float(p0["y"]), float(p0["z"]) + 220.0)
        yaw = math.degrees(math.atan2(float(p1["y"]) - float(p0["y"]), float(p1["x"]) - float(p0["x"])))
    else:
        return False
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, yaw_rot(yaw))
    ps.set_actor_label("DA_PlayerStart")
    try:
        ps.set_folder_path("DriveAnywhere")
    except Exception:
        pass
    rad = math.radians(yaw)
    forward = unreal.Vector(math.cos(rad), math.sin(rad), 0)
    cam = loc - forward * 14000.0 + unreal.Vector(0, 0, 5200.0)
    look = unreal.MathLibrary.find_look_at_rotation(cam, loc + forward * 8000.0)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(cam, look)
    except Exception:
        pass
    return True


def _place_barriers(barriers, mats):
    _kill(["Tecpro_", "DA_Barrier_"])
    mesh = _cube()
    n = 0
    for i, b in enumerate(barriers):
        if i % BARRIER_STRIDE != 0:
            continue
        length = float(b.get("lengthCm") or 200.0) * BARRIER_STRIDE * 0.85
        height = 90.0
        depth = 58.0
        loc = unreal.Vector(float(b["x"]), float(b["y"]), float(b["z"]) + height * 0.5)
        rot = yaw_rot(float(b.get("yawDeg") or 0.0))
        mat = mats["tecpro_r"] if int(b.get("stripe") or 0) == 1 else mats["tecpro_w"]
        _spawn_mesh(
            "Tecpro_{:04d}".format(n), mesh, loc,
            unreal.Vector(length / 100.0, depth / 100.0, height / 100.0),
            rot, mat, collide=True, folder="DriveAnywhere/Barriers",
        )
        n += 1
    return n


def _place_scenery(scenery, mats):
    _kill(["Tree_", "Light_", "DA_Tree_", "DA_Light_"])
    mesh, cyl, cone = _cube(), _cyl() or _cube(), _cone() or _cube()
    trees = lights = 0
    for i, s in enumerate(scenery):
        t = str(s.get("type") or "")
        loc = unreal.Vector(float(s["x"]), float(s["y"]), float(s["z"]))
        scale = float(s.get("scale") or 1.0)
        rot = yaw_rot(float(s.get("yawDeg") or 0.0))
        if t == "tree":
            if i % TREE_STRIDE != 0:
                continue
            _spawn_mesh("Tree_{:03d}_Trunk".format(trees), cyl, loc + unreal.Vector(0, 0, 200 * scale),
                        unreal.Vector(0.35 * scale, 0.35 * scale, 4.0 * scale), rot, mats["bark"], False, "DriveAnywhere/Trees")
            _spawn_mesh("Tree_{:03d}_Canopy".format(trees), cone, loc + unreal.Vector(0, 0, 550 * scale),
                        unreal.Vector(2.2 * scale, 2.2 * scale, 3.5 * scale), rot, mats["leaf"], False, "DriveAnywhere/Trees")
            trees += 1
        elif t == "street_light":
            if i % LIGHT_STRIDE != 0:
                continue
            _spawn_mesh("Light_{:03d}_Pole".format(lights), mesh, loc + unreal.Vector(0, 0, 350),
                        unreal.Vector(0.12, 0.12, 7.0), rot, mats["pole"], False, "DriveAnywhere/Lights")
            _spawn_mesh("Light_{:03d}_Head".format(lights), mesh, loc + unreal.Vector(0, 0, 720),
                        unreal.Vector(0.55, 0.55, 0.35), rot, mats["lamp"], False, "DriveAnywhere/Lights")
            lights += 1
    return {"trees": trees, "lights": lights}


def _place_signs(signs, mats):
    _kill(["Sign_", "DA_Sign_"])
    mesh = _cube()
    n = 0
    for s in signs:
        loc = unreal.Vector(float(s["x"]), float(s["y"]), float(s["z"]))
        rot = yaw_rot(float(s.get("yawDeg") or 0.0))
        _spawn_mesh("Sign_{:02d}_Post".format(n), mesh, loc + unreal.Vector(0, 0, 120),
                    unreal.Vector(0.1, 0.1, 2.4), rot, mats["pole"], False, "DriveAnywhere/Signs")
        _spawn_mesh("Sign_{:02d}_Board".format(n), mesh, loc + unreal.Vector(0, 0, 280),
                    unreal.Vector(1.6, 0.12, 1.4), rot, mats["sign"], False, "DriveAnywhere/Signs")
        n += 1
    return n


def _spawn_label(tag, text, loc, height):
    """In-world landmark labels (like the web race HUD nameplates)."""
    _kill_one = None
    pos = unreal.Vector(loc.x, loc.y, loc.z + max(height, 800) + 400)
    # Prefer TextRenderActor so labels show in Lit/Play (Note only shows in editor)
    try:
        a = _actors().spawn_actor_from_class(unreal.TextRenderActor, pos, yaw_rot(0))
        a.set_actor_label("Label_{}".format(tag))
        try:
            a.set_folder_path("DriveAnywhere/Labels")
        except Exception:
            pass
        tr = a.get_component_by_class(unreal.TextRenderComponent)
        if tr:
            tr.set_text(str(text)[:40])
            try:
                tr.set_horizontal_alignment(unreal.HorizTextAligment.EHTA_CENTER)
            except Exception:
                try:
                    tr.set_horizontal_alignment(unreal.EHorizTextAligment.EHTA_CENTER)
                except Exception:
                    pass
            try:
                tr.set_world_size(280.0)
                tr.set_text_render_color(unreal.Color(255, 240, 200, 255))
                tr.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
            except Exception:
                pass
            try:
                tr.set_editor_property("x_scale", 1.0)
                tr.set_editor_property("y_scale", 1.0)
            except Exception:
                pass
        # Dark plate behind text
        plate = _spawn_mesh(
            "LabelPlate_{}".format(tag), _cube(),
            unreal.Vector(pos.x, pos.y, pos.z - 40),
            unreal.Vector(max(6.0, len(str(text)) * 0.55), 0.2, 1.4),
            yaw_rot(0),
            _mat("hq2_label_plate", unreal.LinearColor(0.05, 0.06, 0.08, 1), 0.15, 0.6),
            False, "DriveAnywhere/Labels",
        )
        return a
    except Exception:
        pass
    try:
        note = _actors().spawn_actor_from_class(unreal.Note, pos)
        note.set_actor_label("Label_{}".format(tag))
        try:
            note.set_folder_path("DriveAnywhere/Labels")
            note.set_editor_property("text", text)
        except Exception:
            pass
        return note
    except Exception:
        return None


def _place_street_fill(roads, samples, mats, rng):
    """Dense small terrace / shop blocks — city texture between heroes."""
    _kill(["Street_", "Shop_", "Terrace_"])
    if not roads or len(roads) < 8:
        return 0
    mesh = _cube()
    n = 0
    paints = [mats["brick"], mats["stone"], mats["dark"], mats["trim"], mats["sand"]]
    stride = max(1, len(roads) // max(MAX_STREET, 1))
    for i in range(0, len(roads) - 1, stride):
        if n >= MAX_STREET:
            break
        side = 1 if (i // stride) % 2 == 0 else -1
        spot = _find_safe_spot(samples, roads, i, side, rng, 900.0)
        if not spot:
            continue
        x, y, z = spot
        # Pull a bit closer for street feel but still clear of asphalt
        if _clearance(samples, x, y, 800.0) < 3500.0:
            continue
        # London terrace / shop parade: 2–4 adjoining small buildings
        rows = 2 + (n % 3)
        for r in range(rows):
            h = 800.0 + rng.uniform(500, 2800)
            w = 6.5 + rng.uniform(0, 9)
            d = 9.0 + rng.uniform(0, 10)
            ox = (r - (rows - 1) * 0.5) * (w * 105)
            mat = paints[(n + r) % len(paints)]
            yaw = rng.uniform(-4, 4)
            _spawn_mesh(
                "Street_{:03d}_{}".format(n, r), mesh,
                unreal.Vector(x + ox, y, z + h * 0.5),
                unreal.Vector(d, w, h / 100.0),
                yaw_rot(yaw), mat,
                collide=(r == 0), folder="DriveAnywhere/Street",
            )
            # pitched roof plate (terrace silhouette)
            _spawn_mesh(
                "Street_{:03d}_{}_Roof".format(n, r), mesh,
                unreal.Vector(x + ox, y, z + h * 0.98),
                unreal.Vector(d * 1.05, w * 1.05, h * 0.06 / 100.0),
                yaw_rot(yaw), mats["dark"] if r % 2 == 0 else mats["trim"],
                False, "DriveAnywhere/Street",
            )
            # shop fascia + upper window bands (photo cue: Georgian/Victorian frontage)
            _spawn_mesh(
                "Street_{:03d}_{}_Shop".format(n, r), mesh,
                unreal.Vector(x + ox, y, z + h * 0.22),
                unreal.Vector(d * 0.12, w * 0.9, h * 0.18 / 100.0),
                yaw_rot(yaw), mats["glass"], False, "DriveAnywhere/Street",
            )
            for wi, wt in enumerate((0.45, 0.62, 0.78)):
                if h < 1400 and wi > 1:
                    break
                _spawn_mesh(
                    "Street_{:03d}_{}_Win{}".format(n, r, wi), mesh,
                    unreal.Vector(x + ox, y, z + h * wt),
                    unreal.Vector(d * 0.1, w * 0.72, h * 0.08 / 100.0),
                    yaw_rot(yaw), mats["glass"], False, "DriveAnywhere/Street",
                )
            # chimney stack on every other house
            if r % 2 == 0:
                _spawn_mesh(
                    "Street_{:03d}_{}_Chim".format(n, r), mesh,
                    unreal.Vector(x + ox + d * 30, y, z + h * 1.08),
                    unreal.Vector(0.8, 0.8, h * 0.12 / 100.0),
                    yaw_rot(0), mats["brick"], False, "DriveAnywhere/Street",
                )
        n += 1
    return n


def _place_heroes(heroes, mats, samples):
    from da_landmark_unique import build_landmark
    _kill(["Hero_"])
    n = 0
    seen = set()
    locs = []
    for h in heroes:
        name = str(h.get("label") or h.get("id") or "Hero")
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        kind = str(h.get("kind") or "")
        x, y, z = float(h["x"]), float(h["y"]), float(h.get("z") or 0)
        # Push heroes off asphalt if too close
        if samples and _clearance(samples, x, y, 2800.0) < 2500.0:
            best = None
            best_d = 1e12
            best_half = 900.0
            for sx, sy, sz, half_w in samples:
                d = math.hypot(x - sx, y - sy)
                if d < best_d:
                    best_d = d
                    best = (sx, sy)
                    best_half = half_w
            if best and best_d > 1:
                ux = (x - best[0]) / best_d
                uy = (y - best[1]) / best_d
                target = best_half + MIN_ROAD_CLEAR_CM + 2800.0
                if best_d < target:
                    x = best[0] + ux * target
                    y = best[1] + uy * target
        h_cm = 14000.0
        lk = (kind + " " + name).lower()
        if "burj khalifa" in lk or ("tri-needle" in lk and "sky" not in lk and "tokyo" not in lk):
            h_cm = 30000
        elif "skytree" in lk:
            h_cm = 22000
        elif "shard" in lk:
            h_cm = 21000
        elif "ferris" in lk or "eye" in lk or "ain dubai" in lk:
            h_cm = 16500
        elif "pyramid" in lk:
            h_cm = 20000
        elif "empire" in lk or "chrysler" in lk:
            h_cm = 24000
        elif "art-deco" in lk:
            h_cm = 16000
        elif "sail" in lk or "arab" in lk:
            h_cm = 19000
        elif "tokyo" in lk or "lattice" in lk:
            h_cm = 18000
        elif "cristo" in lk or "christ" in lk:
            h_cm = 13000
        elif "clock" in lk or "elizabeth" in lk or "big ben" in lk:
            h_cm = 15000
        elif "victoria" in lk:
            h_cm = 14500
        elif "parliament" in lk or ("westminster" in lk and "palace" in lk):
            h_cm = 13500
        elif "abbey" in lk:
            h_cm = 10500
        elif "liberty" in lk:
            h_cm = 12500
        elif "mi6" in lk:
            h_cm = 9000
        elif "battersea" in lk:
            h_cm = 11000
        elif "millbank" in lk or "capsule" in lk:
            h_cm = 16000
        elif "st george" in lk or "needle" in lk:
            h_cm = 18000
        elif "matterhorn" in lk or "sugarloaf" in lk:
            h_cm = 16000
        elif "horse" in lk or "admiralty" in lk or "bridge" in lk or "portico" in lk:
            h_cm = 6500
        tag = "Hero_{}_{}".format(n, re.sub(r"[^A-Za-z0-9]", "", name)[:18])
        build_landmark(name, kind, tag, x, y, z, h_cm, mats["stone"], mats["gold"], _spawn_mesh, mats)
        _spawn_label(tag, name, unreal.Vector(x, y, z), h_cm + 900)
        locs.append((x, y, z, h_cm))
        n += 1
    return n, locs


def _place_unique(unique, roads, samples, rng, mats):
    from da_landmark_unique import build_landmark
    _kill(["Unique_"])
    if not unique or len(roads) < 10:
        return 0
    n = skipped = 0
    count = min(MAX_UNIQUE, len(unique))
    stride = max(1, len(roads) // max(count, 1))
    paint_cycle = [mats["stone"], mats["glass"], mats["brick"], mats["steel"], mats["dark"], mats["sand"]]
    for i, u in enumerate(unique[:count]):
        name = str(u.get("name") or "")
        if _is_hero_dupe(name):
            skipped += 1
            continue
        ri = min(len(roads) - 2, i * stride + 3)
        side = 1 if i % 2 == 0 else -1
        h = float(u.get("heightCm") or 4000)
        footprint = max(1400.0, min(h * 0.2, 3800.0))
        spot = _find_safe_spot(samples, roads, ri, side, rng, footprint)
        if not spot:
            skipped += 1
            continue
        x, y, z = spot
        paint = paint_cycle[i % len(paint_cycle)]
        accent = mats["gold"] if i % 3 == 0 else mats["trim"]
        safe = re.sub(r"[^A-Za-z0-9]", "", name or "Lm")[:18]
        tag = "Unique_{:02d}_{}".format(n, safe)
        build_landmark(name, u.get("kind"), tag, x, y, z, h, paint, accent, _spawn_mesh, mats)
        _spawn_label(tag, name, unreal.Vector(x, y, z), h + 700)
        n += 1
    return n


def _place_named(named, samples, mats):
    """Named route buildings — skip hero dupes, skip on-track."""
    from da_landmark_unique import build_landmark
    _kill(["HD_Named_"])
    n = skipped = 0
    mesh = _cube()
    paint_cycle = [mats["stone"], mats["brick"], mats["dark"], mats["glass"], mats["sand"]]
    for lm in named:
        if n >= MAX_NAMED:
            break
        name = str(lm.get("name") or "")
        if _is_hero_dupe(name):
            skipped += 1
            continue
        x, y, z = float(lm["x"]), float(lm["y"]), float(lm.get("z") or 0)
        h = float(lm.get("heightCm") or 4000)
        w = float(lm.get("widthCm") or 1200)
        d = float(lm.get("depthCm") or 1200)
        half = max(w, d) * 0.55
        if samples and _clearance(samples, x, y, half) < 2800.0:
            skipped += 1
            continue
        paint = paint_cycle[n % len(paint_cycle)]
        accent = mats["trim"]
        safe = re.sub(r"[^A-Za-z0-9]", "", name)[:20]
        tag = "HD_Named_{}".format(safe)
        lower = name.lower()
        if h >= 9000 or any(k in lower for k in ("tower", "centre", "center", "plaza", "square")):
            kind = "glass-slab" if "glass" in str(lm.get("facade") or "").lower() else "art-deco"
            build_landmark(name, kind, tag, x, y, z, h, paint, accent, _spawn_mesh, mats)
        else:
            loc = unreal.Vector(x, y, z + h * 0.44)
            _spawn_mesh(tag + "_Body", mesh, loc,
                        unreal.Vector(max(d, 200) / 100.0, max(w, 200) / 100.0, h * 0.88 / 100.0),
                        yaw_rot(0), paint, True, "DriveAnywhere/HD")
            _spawn_mesh(tag + "_Crown", mesh, unreal.Vector(x, y, z + h * 0.92),
                        unreal.Vector(max(d, 200) * 0.92 / 100.0, max(w, 200) * 0.92 / 100.0, h * 0.12 / 100.0),
                        yaw_rot(0), accent, False, "DriveAnywhere/HD")
        _spawn_label(tag, name, unreal.Vector(x, y, z), h + 500)
        n += 1
    return n


def _place_massing(massing, samples, mats, rng):
    _kill(["HD_Mass_", "HD_Fill_"])
    if not massing:
        return 0
    mesh = _cube()
    n = 0
    step = max(1, int(math.ceil(len(massing) / float(MAX_MASSING))))
    for i, b in enumerate(massing):
        if i % step != 0 or n >= MAX_MASSING:
            continue
        h = float(b.get("heightCm") or 0)
        if h < 600:
            continue
        x, y, z = float(b["x"]), float(b["y"]), float(b.get("z") or 0)
        w = float(b.get("widthCm") or 1000)
        d = float(b.get("depthCm") or 1000)
        half = max(w, d) * 0.55
        if samples and _clearance(samples, x, y, half) < 2400.0:
            continue
        facade = (b.get("facade") or "brick").lower()
        if "glass" in facade:
            mat = mats["glass"]
        elif "sand" in facade:
            mat = mats["sand"]
        else:
            mat = mats["brick"] if rng.random() < 0.55 else mats["stone"]
        # Soft push if slightly close
        if samples and _clearance(samples, x, y, half) < 3200.0:
            best = None
            best_d = 1e12
            for sx, sy, sz, half_w in samples:
                d = math.hypot(x - sx, y - sy)
                if d < best_d:
                    best_d = d
                    best = (sx, sy, half_w)
            if best and best_d > 1:
                ux = (x - best[0]) / best_d
                uy = (y - best[1]) / best_d
                target = best[2] + half + 2800.0
                if best_d < target:
                    x = best[0] + ux * target
                    y = best[1] + uy * target
        _spawn_mesh(
            "HD_Mass_{:03d}".format(n), mesh,
            unreal.Vector(x, y, z + h * 0.5),
            unreal.Vector(max(d, 200) / 100.0, max(w, 200) / 100.0, h / 100.0),
            yaw_rot(rng.uniform(-8, 8)), mat,
            collide=(h >= 2500 and n % 3 == 0),
            folder="DriveAnywhere/HD",
        )
        floors = max(3, min(12, int(h / 450)))
        for fi in range(floors):
            t = 0.15 + 0.7 * (fi + 0.5) / floors
            _spawn_mesh(
                "HD_Mass_{:03d}_W{}".format(n, fi), mesh,
                unreal.Vector(x, y, z + h * t),
                unreal.Vector(max(d, 200) * 0.08 / 100.0, max(w, 200) * 0.82 / 100.0, h * 0.035 / 100.0),
                yaw_rot(0), mats["glass"], False, "DriveAnywhere/HD",
            )
        n += 1
    return n


def _upgrade(map_path):
    _levels().load_level(map_path)
    slug = _map_slug(map_path.rsplit("/", 1)[-1])
    data = _load(slug)
    rng = random.Random((hash(slug) ^ 0xA5A5) & 0xFFFFFFFF)
    mats = _city_mats(slug)
    roads = _roads()
    samples = _road_samples(roads)
    center = _center(roads)

    stripped = _kill_city()
    _lighting(center, mats, slug)
    roads_n = _paint_roads(mats)
    _paint_ground(mats)
    spawn_ok = _fix_spawn(data)
    barriers = _place_barriers(data.get("barriers") or [], mats)
    scenery = _place_scenery(data.get("scenery") or [], mats)
    signs = _place_signs(data.get("signs") or [], mats)
    heroes, hero_locs = _place_heroes((data.get("routeHeroes") or [])[:MAX_HEROES], mats, samples)
    unique = _place_unique(data.get("uniqueLandmarks") or [], roads, samples, rng, mats)
    named = _place_named(data.get("namedLandmarks") or [], samples, mats)
    massing = _place_massing(data.get("massing") or [], samples, mats, rng)
    street = _place_street_fill(roads, samples, mats, rng)
    skyline = _place_skyline(roads, samples, mats, rng, slug)
    sight = _open_sightlines(hero_locs, samples)
    purged = _purge_road_blockers(samples)
    car = _polish_racer()

    _levels().save_current_level()
    return {
        "map": map_path,
        "slug": slug,
        "stripped": stripped,
        "roads": roads_n,
        "spawn": spawn_ok,
        "barriers": barriers,
        "trees": scenery.get("trees", 0),
        "lights": scenery.get("lights", 0),
        "signs": signs,
        "heroes": heroes,
        "unique": unique,
        "named": named,
        "massing": massing,
        "street": street,
        "skyline": skyline,
        "sight_cleared": sight.get("cleared", 0),
        "sight_pushed": sight.get("pushed", 0),
        "road_purged": purged,
        "car_preview": car,
    }


def main():
    # DA_ONLY_MAP=MAP_WestminsterSprint  → one map per process (avoids OOM)
    only = (os.environ.get("DA_ONLY_MAP") or "").strip()
    unreal.log("DriveAnywhere FIVE-STAR: heroes + sightlines + cinematic lighting…")
    prev = {}
    try:
        with open(_status_path(), encoding="utf-8") as f:
            prev = json.load(f) or {}
    except Exception:
        prev = {}
    results = list(prev.get("results") or [])
    _write({"state": "running", "only": only or "all", "results": results})
    try:
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(MAPS, recursive=False)
        maps = ["{}/{}".format(MAPS, a.asset_name) for a in assets if str(a.asset_name).startswith("MAP_")]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        if only:
            want = only if only.startswith("MAP_") else "MAP_{}".format(only)
            maps = [m for m in maps if m.rsplit("/", 1)[-1] == want]
            if not maps:
                raise RuntimeError("Map not found: {}".format(only))
        for m in maps:
            row = _upgrade(m)
            results = [r for r in results if r.get("map") != row["map"]]
            results.append(row)
            _write({"state": "running", "only": only or "all", "results": results, "last": row["slug"]})
            try:
                unreal.SystemLibrary.collect_garbage()
            except Exception:
                pass
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
        done = not only or len(results) >= 9
        _write({"state": "ok" if done else "partial", "results": results})
        unreal.log("NEXT LEVEL done for {} map(s).".format(len(maps)))
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc(), "results": results})
        raise


main()
