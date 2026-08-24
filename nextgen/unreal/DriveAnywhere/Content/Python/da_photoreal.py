"""Photoreal lighting + unique landmarks rebuild for all DriveAnywhere maps."""
from __future__ import annotations
import json, math, os, random, re, traceback
import unreal
from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
MAT = "/Game/DriveAnywhere/Materials/Photo"

def _status_path():
    return os.path.normpath(os.path.join(
        unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
        "..", "export", "photoreal-status.json"))

def _write(p):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(p, f, indent=2); f.write("\n")

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
    try: return a.get_actor_label() or ""
    except Exception: return ""

def _folder(p):
    if not unreal.EditorAssetLibrary.does_directory_exist(p):
        unreal.EditorAssetLibrary.make_directory(p)

def _hex(h):
    h = h.lstrip("#")
    if len(h) != 6: return unreal.LinearColor(0.5, 0.45, 0.4, 1)
    return unreal.LinearColor(int(h[0:2],16)/255.0, int(h[2:4],16)/255.0, int(h[4:6],16)/255.0, 1.0)

_MATS = {}
def _mat(key, color, emis=0.06, rough=0.75, metallic=0.0):
    if key in _MATS: return _MATS[key]
    _folder(MAT)
    path = "{}/M_{}".format(MAT, key)
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        mat = unreal.EditorAssetLibrary.load_asset(path)
    else:
        mat = _tools().create_asset("M_{}".format(key), MAT, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    base = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 0)
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
    em = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -400, 160)
    em.set_editor_property("constant", unreal.LinearColor(color.r*emis, color.g*emis, color.b*emis, 1))
    unreal.MaterialEditingLibrary.connect_material_property(em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    r = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -400, 300)
    r.set_editor_property("r", rough)
    unreal.MaterialEditingLibrary.connect_material_property(r, "", unreal.MaterialProperty.MP_ROUGHNESS)
    if metallic > 0.01:
        m = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -400, 380)
        m.set_editor_property("r", metallic)
        unreal.MaterialEditingLibrary.connect_material_property(m, "", unreal.MaterialProperty.MP_METALLIC)
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(path)
    _MATS[key] = mat
    return mat

def _shared_mats():
    return {
        "stone": _mat("pr_stone", _hex("#d4c4a8"), 0.04, 0.88),
        "dark": _mat("pr_dark", _hex("#9a8a72"), 0.03, 0.9),
        "gold": _mat("pr_gold", _hex("#c9a227"), 0.18, 0.35, 0.7),
        "white": _mat("pr_white", _hex("#f0ebe4"), 0.08, 0.55),
        "copper": _mat("pr_copper", _hex("#5a7a58"), 0.1, 0.5, 0.4),
        "glass": _mat("pr_glass", _hex("#87a9bd"), 0.22, 0.12, 0.65),
        "steel": _mat("pr_steel", _hex("#a8b0b8"), 0.12, 0.28, 0.85),
        "sand": _mat("pr_sand", _hex("#c4a06a"), 0.04, 0.92),
        "green": _mat("pr_green", _hex("#4a6848"), 0.05, 0.85),
        "red": _mat("pr_red", _hex("#c8102e"), 0.08, 0.55),
    }

def _movable(a):
    try:
        if a.root_component:
            a.root_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
    except Exception: pass

def _spawn_mesh(name, mesh, loc, scale, rot, mat, collide=True, folder="DriveAnywhere/Unique"):
    a = _actors().spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    a.set_actor_label(name)
    try:
        a.set_actor_scale3d(scale); a.set_folder_path(folder)
    except Exception: pass
    _movable(a)
    c = a.get_component_by_class(unreal.StaticMeshComponent)
    if c and mesh:
        c.set_static_mesh(mesh)
        if mat: c.set_material(0, mat)
        try:
            c.set_editor_property("cast_shadow", True)
            c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        except Exception: pass
        if collide:
            c.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            c.set_collision_profile_name("BlockAll")
        else:
            c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    return a

def _kill(prefixes):
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
            try: eas.destroy_actor(a)
            except Exception: pass

def _kill_lights():
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        try: cls = a.get_class().get_name()
        except Exception: cls = ""
        if (lab.startswith("DA_Sun") or lab.startswith("DA_Sky") or lab.startswith("DA_Fog")
            or lab.startswith("DA_Post") or lab.startswith("DA_Fill") or lab.startswith("DA_SkyDome")
            or lab.startswith("PR_")
            or "DirectionalLight" in cls or "SkyLight" in cls or "SkyAtmosphere" in cls
            or "ExponentialHeightFog" in cls or "PostProcessVolume" in cls):
            if lab.startswith("DA_") or lab.startswith("PR_") or "DirectionalLight" in cls or "SkyLight" in cls or "SkyAtmosphere" in cls:
                try: eas.destroy_actor(a)
                except Exception: pass

def _center():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]
    if not roads: return unreal.Vector(0, 0, 0)
    sx = sy = sz = 0.0
    for a in roads:
        p = a.get_actor_location(); sx += p.x; sy += p.y; sz += p.z
    n = float(len(roads))
    return unreal.Vector(sx/n, sy/n, sz/n)

def _lighting(center):
    """Bright daylight that actually works in Lit view."""
    _kill_lights()
    eas = _actors()
    sun = eas.spawn_actor_from_class(unreal.DirectionalLight, center + unreal.Vector(0, 0, 20000))
    sun.set_actor_label("PR_Sun")
    try:
        sun.set_actor_rotation(pitch_yaw(-42.0, 38.0, 0.0), False)
        sc = sun.get_component_by_class(unreal.DirectionalLightComponent)
        if sc:
            sc.set_editor_property("intensity", 12.0)
            sc.set_editor_property("light_color", unreal.LinearColor(1.0, 0.96, 0.88, 1))
            sc.set_editor_property("cast_shadows", True)
            sc.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            try: sc.set_editor_property("atmosphere_sun_light", True)
            except Exception: pass
    except Exception: pass
    _movable(sun)

    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 25000))
    sk.set_actor_label("PR_SkyLight")
    try:
        sc = sk.get_component_by_class(unreal.SkyLightComponent)
        if sc:
            sc.set_editor_property("intensity", 2.5)
            sc.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            try:
                sc.set_editor_property("real_time_capture", True)
            except Exception: pass
    except Exception: pass
    _movable(sk)

    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("PR_SkyAtmosphere")
    except Exception: pass

    try:
        fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 500))
        fog.set_actor_label("PR_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            fc.set_editor_property("fog_density", 0.012)
            fc.set_editor_property("fog_height_falloff", 0.15)
            fc.set_editor_property("fog_inscattering_color", unreal.LinearColor(0.55, 0.65, 0.78, 1))
    except Exception: pass

    # soft sky dome
    try:
        dome = eas.spawn_actor_from_class(unreal.StaticMeshActor, center)
        dome.set_actor_label("PR_SkyDome")
        dome.set_actor_scale3d(unreal.Vector(1200, 1200, 1200))
        dc = dome.get_component_by_class(unreal.StaticMeshComponent)
        if dc:
            dc.set_static_mesh(unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere"))
            sky_mat = _mat("pr_sky", unreal.LinearColor(0.35, 0.55, 0.85, 1), 2.5, 1.0)
            try:
                # unlit-ish via high emissive
                pass
            except Exception: pass
            dc.set_material(0, sky_mat)
            dc.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
            try: dc.set_editor_property("cast_shadow", False)
            except Exception: pass
        _movable(dome)
    except Exception: pass

    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("PR_Post")
        try:
            pp.set_editor_property("unbound", True)
            settings = pp.get_editor_property("settings")
            # Manual-ish exposure so Lit never goes black
            try:
                settings.set_editor_property("override_auto_exposure_method", True)
                settings.set_editor_property("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL)
                settings.set_editor_property("override_auto_exposure_bias", True)
                settings.set_editor_property("auto_exposure_bias", 1.2)
            except Exception:
                try:
                    settings.set_editor_property("override_auto_exposure_min_brightness", True)
                    settings.set_editor_property("auto_exposure_min_brightness", 0.8)
                    settings.set_editor_property("override_auto_exposure_max_brightness", True)
                    settings.set_editor_property("auto_exposure_max_brightness", 1.8)
                except Exception: pass
            try:
                settings.set_editor_property("override_bloom_intensity", True)
                settings.set_editor_property("bloom_intensity", 0.35)
            except Exception: pass
            pp.set_editor_property("settings", settings)
        except Exception: pass
    except Exception: pass

    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception: pass

def _load(slug):
    path = os.path.join(_export_dir(), "circuits", "{}.json".format(slug))
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def _map_slug(name):
    return re.sub(r"([a-z])([A-Z])", r"\1-\2", name.replace("MAP_", "")).lower()

def _roads():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]
    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0
    roads.sort(key=key)
    return roads

def _place_unique(unique, roads, rng, shared):
    from da_landmark_unique import build_landmark
    _kill(["Unique_"])
    if not unique or len(roads) < 10:
        return 0
    n = 0
    count = min(60, len(unique))
    stride = max(1, len(roads) // max(count, 1))
    for i, u in enumerate(unique[:count]):
        ri = min(len(roads) - 2, i * stride + 3)
        p = roads[ri].get_actor_location()
        nxt = roads[min(ri + 1, len(roads) - 1)].get_actor_location()
        tx, ty = nxt.x - p.x, nxt.y - p.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        nx, ny = -ty / length, tx / length
        dist = rng.choice([9000, 11000, 13000, 15500, 18000, 21000])
        sign = 1 if i % 2 == 0 else -1
        x = p.x + nx * dist * sign
        y = p.y + ny * dist * sign
        h = float(u.get("heightCm") or 4000)
        paint = _mat("u_p_{}".format(i), _hex(u.get("colorHex") or "#8899aa"), 0.07, 0.7, 0.15)
        accent = _mat("u_a_{}".format(i), _hex(u.get("accentHex") or "#c8d0da"), 0.1, 0.45, 0.35)
        safe = re.sub(r"[^A-Za-z0-9]", "", u.get("name") or "Lm")[:18]
        tag = "Unique_{:02d}_{}".format(i, safe)
        build_landmark(u.get("name"), u.get("kind"), tag, x, y, float(p.z), h, paint, accent, _spawn_mesh, shared)
        # label
        try:
            note = _actors().spawn_actor_from_class(unreal.Note, unreal.Vector(x, y, p.z + h + 600))
            note.set_actor_label("Label_{}".format(tag))
            note.set_folder_path("DriveAnywhere/Labels")
            try: note.set_editor_property("text", str(u.get("name") or ""))
            except Exception: pass
        except Exception: pass
        n += 1
    return n

def _place_heroes(heroes, shared):
    from da_landmark_unique import build_landmark
    _kill(["Hero_"])
    n = 0
    for h in heroes:
        name = str(h.get("label") or h.get("id") or "Hero")
        kind = str(h.get("kind") or "")
        x, y, z = float(h["x"]), float(h["y"]), float(h.get("z") or 0)
        h_cm = 14000.0
        lk = kind.lower() + " " + name.lower()
        if "burj khalifa" in lk or "tri-needle" in lk: h_cm = 24000
        elif "ferris" in lk or "eye" in lk: h_cm = 13000
        elif "pyramid" in lk: h_cm = 16000
        elif "art-deco" in lk or "empire" in lk: h_cm = 18000
        elif "sail" in lk: h_cm = 16000
        elif "lattice" in lk or "tokyo" in lk: h_cm = 16000
        elif "cristo" in lk or "christ" in lk: h_cm = 11000
        elif "clock" in lk or "big" in lk or "elizabeth" in lk: h_cm = 11000
        tag = "Hero_{}_{}".format(n, re.sub(r"[^A-Za-z0-9]", "", name)[:18])
        build_landmark(name, kind, tag, x, y, z, h_cm, shared["stone"], shared["gold"], _spawn_mesh, shared)
        n += 1
    return n

def _upgrade(map_path):
    _levels().load_level(map_path)
    slug = _map_slug(map_path.rsplit("/", 1)[-1])
    data = _load(slug)
    rng = random.Random(hash(slug) & 0xFFFFFFFF)
    shared = _shared_mats()
    center = _center()
    _lighting(center)
    # boost road emissive slightly
    asphalt = _mat("pr_asphalt", unreal.LinearColor(0.08, 0.08, 0.09, 1), 0.15, 0.92)
    for a in _actors().get_all_level_actors():
        if _label(a).startswith("Road_"):
            c = a.get_component_by_class(unreal.StaticMeshComponent)
            if c: c.set_material(0, asphalt)
            _movable(a)
    heroes = _place_heroes(data.get("routeHeroes") or [], shared)
    unique = _place_unique(data.get("uniqueLandmarks") or [], _roads(), rng, shared)
    _levels().save_current_level()
    return {"map": map_path, "slug": slug, "heroes": heroes, "unique": unique,
            "named": len(data.get("namedLandmarks") or [])}

def main():
    unreal.log("DriveAnywhere PHOTOREAL: lighting + unique landmarks…")
    _write({"state": "running"})
    try:
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(MAPS, recursive=False)
        maps = ["{}/{}".format(MAPS, a.asset_name) for a in assets if str(a.asset_name).startswith("MAP_")]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_upgrade(m) for m in maps]
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
        _write({"state": "ok", "results": results})
        unreal.log("PHOTOREAL done.")
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise

main()
