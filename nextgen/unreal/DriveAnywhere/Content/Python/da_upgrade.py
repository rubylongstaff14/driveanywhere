"""Lighting fix + grounded arcade racer so Play feels like a game.

- Soft daylight / locked exposure (fixes blown-out or black scenes)
- Dark asphalt track (still readable)
- Ground plane under each circuit
- BP_DARacer Character pawn (fast ground move) as default Play pawn
"""

from __future__ import annotations

import json
import os
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS_FOLDER = "/Game/DriveAnywhere/Maps"
CONTENT = "/Game/DriveAnywhere"
MAT_ASPHALT = "/Game/DriveAnywhere/Materials/M_Asphalt"
MAT_GROUND = "/Game/DriveAnywhere/Materials/M_Ground"
MAT_CAR = "/Game/DriveAnywhere/Materials/M_CarBody"
RACER_PATH = "/Game/DriveAnywhere/BP_DARacer"
GM_PATH = "/Game/DriveAnywhere/BP_DAGameMode"


def _status_path() -> str:
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "upgrade-status.json",
        )
    )


def _write_status(payload: dict) -> None:
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def _ensure_folder(path: str) -> None:
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _levels():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def _tools():
    return unreal.AssetToolsHelpers.get_asset_tools()


def _label(actor) -> str:
    try:
        return actor.get_actor_label() or ""
    except Exception:
        return ""


def _has_label(prefix: str) -> bool:
    return any(_label(a).startswith(prefix) for a in _actors().get_all_level_actors())


def _make_color_material(asset_name: str, path: str, color: unreal.LinearColor, rough: float = 0.8):
    full = "{}/{}".format(path, asset_name)
    if unreal.EditorAssetLibrary.does_asset_exist(full):
        # Rebuild color so re-runs fix old neon asphalt.
        mat = unreal.EditorAssetLibrary.load_asset(full)
    else:
        _ensure_folder(path)
        factory = unreal.MaterialFactoryNew()
        mat = _tools().create_asset(asset_name, path, unreal.Material, factory)

    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    base = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0
    )
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(
        base, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    r = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -400, 180
    )
    r.set_editor_property("r", rough)
    unreal.MaterialEditingLibrary.connect_material_property(
        r, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(full)
    return mat


def _ensure_materials():
    asphalt = _make_color_material(
        "M_Asphalt",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.04, 0.04, 0.045, 1.0),
        0.92,
    )
    ground = _make_color_material(
        "M_Ground",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.12, 0.14, 0.10, 1.0),
        0.95,
    )
    car = _make_color_material(
        "M_CarBody",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.55, 0.02, 0.05, 1.0),
        0.35,
    )
    return asphalt, ground, car


def _road_actors():
    return [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]


def _road_center(roads):
    total = unreal.Vector(0, 0, 0)
    for actor in roads:
        total = total + actor.get_actor_location()
    return total / float(max(len(roads), 1))


def _road_bounds(roads):
    if not roads:
        return unreal.Vector(0, 0, 0), 50000.0
    min_v = unreal.Vector(1e12, 1e12, 1e12)
    max_v = unreal.Vector(-1e12, -1e12, -1e12)
    for actor in roads:
        p = actor.get_actor_location()
        min_v.x = min(min_v.x, p.x)
        min_v.y = min(min_v.y, p.y)
        min_v.z = min(min_v.z, p.z)
        max_v.x = max(max_v.x, p.x)
        max_v.y = max(max_v.y, p.y)
        max_v.z = max(max_v.z, p.z)
    center = (min_v + max_v) * 0.5
    radius = max(max_v.x - min_v.x, max_v.y - min_v.y) * 0.5 + 8000.0
    return center, radius


def _paint_roads(mat) -> int:
    n = 0
    for actor in _road_actors():
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if not comp:
            continue
        comp.set_material(0, mat)
        n += 1
    return n


def _destroy_labeled(prefixes) -> None:
    eas = _actors()
    for actor in list(eas.get_all_level_actors()):
        lab = _label(actor)
        if any(lab.startswith(p) for p in prefixes):
            try:
                eas.destroy_actor(actor)
            except Exception:
                pass


def _fix_lighting(center: unreal.Vector) -> None:
    """Replace old DA lights with a clean soft daylight setup."""
    _destroy_labeled(["DA_Sun", "DA_SkyLight", "DA_Sky", "DA_Fog", "DA_Post", "DA_Ground"])

    eas = _actors()

    sun = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 8000)
    )
    sun.set_actor_label("DA_Sun")
    try:
        sun.set_actor_rotation(pitch_yaw(-50.0, 40.0, 0.0), False)
    except Exception:
        sun.set_actor_rotation(pitch_yaw(-50.0, 40.0, 0.0), False)
    light = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if light:
        try:
            light.set_intensity(5.0)
            light.set_editor_property("atmosphere_sun_light", True)
            light.set_editor_property("cast_shadows", True)
            light.set_editor_property("light_color", unreal.Color(255, 244, 230, 255))
        except Exception:
            pass

    sky_light = eas.spawn_actor_from_class(
        unreal.SkyLight, center + unreal.Vector(0, 0, 6000)
    )
    sky_light.set_actor_label("DA_SkyLight")
    sl = sky_light.get_component_by_class(unreal.SkyLightComponent)
    if sl:
        try:
            sl.set_editor_property("intensity", 1.2)
            sl.set_editor_property("real_time_capture", True)
        except Exception:
            pass

    try:
        sky = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        sky.set_actor_label("DA_Sky")
    except Exception:
        pass

    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 200)
        )
        fog.set_actor_label("DA_Fog")
        fog_comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fog_comp:
            fog_comp.set_editor_property("fog_density", 0.015)
    except Exception:
        pass

    # Lock exposure so tracks aren't blown white or crushed black.
    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        settings = pp.get_editor_property("settings")
        # Auto exposure off / pinned
        try:
            settings.set_editor_property("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL)
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 0.0)
            settings.set_editor_property("override_auto_exposure_bias", True)
            settings.set_editor_property("auto_exposure_apply_physical_camera_exposure", False)
            settings.set_editor_property("override_auto_exposure_apply_physical_camera_exposure", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception as exc:
        unreal.log_warning("PostProcess: {}".format(exc))


def _spawn_ground(center, radius, ground_mat) -> None:
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")
    if not mesh:
        return
    eas = _actors()
    loc = unreal.Vector(center.x, center.y, center.z - 40.0)
    ground = eas.spawn_actor_from_class(unreal.StaticMeshActor, loc)
    ground.set_actor_label("DA_Ground")
    # Plane is 100cm; scale so it covers the circuit footprint
    scale = max(radius / 50.0, 200.0)
    try:
        ground.set_actor_scale3d(unreal.Vector(scale, scale, 1.0))
    except Exception:
        pass
    comp = ground.get_component_by_class(unreal.StaticMeshComponent)
    if comp:
        comp.set_static_mesh(mesh)
        comp.set_material(0, ground_mat)
        comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
        comp.set_collision_profile_name("BlockAll")


def _ensure_player_start(roads) -> None:
    # Refresh spawn on Road_0000
    _destroy_labeled(["DA_PlayerStart"])
    if not roads:
        return
    start = roads[0]
    for a in roads:
        if _label(a) == "Road_0000":
            start = a
            break
    loc = start.get_actor_location()
    loc.z += 180.0
    rot = start.get_actor_rotation()
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")


def _ensure_racer_blueprint(car_mat):
    """Fast Character pawn — grounded arcade stand-in until Chaos wheels are tuned."""
    _ensure_folder(CONTENT)
    if not unreal.EditorAssetLibrary.does_asset_exist(RACER_PATH):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.Character)
        _tools().create_asset("BP_DARacer", CONTENT, None, factory)

    bp = unreal.EditorAssetLibrary.load_asset(RACER_PATH)
    try:
        gen = bp.generated_class()
        cdo = unreal.get_default_object(gen)
        # Speedy ground move
        move = cdo.get_editor_property("character_movement")
        if move:
            move.set_editor_property("max_walk_speed", 6200.0)
            move.set_editor_property("max_acceleration", 18500.0)
            try:
                move.set_editor_property("ground_friction", 18.0)
                move.set_editor_property("braking_deceleration_walking", 17500.0)
                move.set_editor_property("air_control", 0.55)
            except Exception:
                pass
            move.set_editor_property("braking_deceleration_walking", 17500.0)
            move.set_editor_property("ground_friction", 18.0)
            move.set_editor_property("orientation_to_movement", True)
            move.set_editor_property("rotation_rate", yaw_rot(900))
        cdo.set_editor_property("b_use_controller_rotation_yaw", False)
        unreal.EditorAssetLibrary.save_asset(RACER_PATH)
        unreal.log("DriveAnywhere: BP_DARacer tuned for arcade ground speed")
    except Exception as exc:
        unreal.log_warning("Racer BP: {}".format(exc))
    return RACER_PATH + ".BP_DARacer_C"


def _ensure_game_mode(racer_class_path: str):
    if not unreal.EditorAssetLibrary.does_asset_exist(GM_PATH):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.GameModeBase)
        _tools().create_asset("BP_DAGameMode", CONTENT, None, factory)

    bp = unreal.EditorAssetLibrary.load_asset(GM_PATH)
    try:
        gen = bp.generated_class()
        cdo = unreal.get_default_object(gen)
        racer = unreal.load_class(None, racer_class_path)
        if racer:
            cdo.set_editor_property("default_pawn_class", racer)
        cdo.set_editor_property("player_controller_class", unreal.PlayerController.static_class())
        unreal.EditorAssetLibrary.save_asset(GM_PATH)
    except Exception as exc:
        unreal.log_warning("GameMode: {}".format(exc))
    return GM_PATH + ".BP_DAGameMode_C"


def _set_world_gm(gm_path: str) -> None:
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        settings = world.get_world_settings()
        gm = unreal.load_class(None, gm_path)
        if gm and settings:
            settings.set_editor_property("default_game_mode", gm)
    except Exception:
        pass


def _frame(roads) -> None:
    if not roads:
        return
    center = _road_center(roads)
    cam = unreal.Vector(center.x - 9000, center.y - 9000, center.z + 12000)
    look = unreal.MathLibrary.find_look_at_rotation(cam, center)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(cam, look)
    except Exception:
        pass


def upgrade_map(map_path, asphalt, ground, gm_path) -> dict:
    _levels().load_level(map_path)
    roads = _road_actors()
    painted = _paint_roads(asphalt)
    center, radius = _road_bounds(roads)
    _fix_lighting(center if roads else unreal.Vector(0, 0, 0))
    _spawn_ground(center, radius, ground)
    _ensure_player_start(roads)
    _set_world_gm(gm_path)
    _frame(roads)
    _levels().save_current_level()
    return {"map": map_path, "roads": len(roads), "painted": painted, "radius": radius}


def main():
    unreal.log("DriveAnywhere: lighting + racer upgrade…")
    _write_status({"state": "running"})
    try:
        asphalt, ground, car = _ensure_materials()
        racer_path = _ensure_racer_blueprint(car)
        gm_path = _ensure_game_mode(racer_path)

        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS_FOLDER, recursive=False
        )
        maps = []
        for a in assets:
            name = str(a.asset_name)
            if name.startswith("MAP_"):
                maps.append("{}/{}".format(MAPS_FOLDER, name))
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))

        results = [upgrade_map(m, asphalt, ground, gm_path) for m in maps]

        west = "{}/MAP_WestminsterSprint".format(MAPS_FOLDER)
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            _levels().load_level(west)
            _frame(_road_actors())
            _levels().save_current_level()

        _write_status({"state": "ok", "results": results, "racer": racer_path, "gameMode": gm_path})
        unreal.log("DriveAnywhere: upgrade done — soft lighting + grounded racer. Press Play.")
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error("Upgrade failed: {}".format(exc))
        raise


main()
