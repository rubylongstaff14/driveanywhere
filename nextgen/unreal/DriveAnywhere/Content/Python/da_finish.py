"""Finish DriveAnywhere for Play: lights, bright track, spawn, game mode.

Run once via -ExecutePythonScript. Then open the editor normally and press Play.
"""

from __future__ import annotations

import json
import os
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS_FOLDER = "/Game/DriveAnywhere/Maps"
CONTENT = "/Game/DriveAnywhere"
MAT_PATH = "/Game/DriveAnywhere/Materials/M_TrackVisible"
GM_PATH = "/Game/DriveAnywhere/BP_DAGameMode"


def _status_path() -> str:
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "finish-status.json",
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


def _ensure_track_material():
    _ensure_folder("/Game/DriveAnywhere/Materials")
    if unreal.EditorAssetLibrary.does_asset_exist(MAT_PATH):
        return unreal.EditorAssetLibrary.load_asset(MAT_PATH)

    factory = unreal.MaterialFactoryNew()
    mat = _tools().create_asset("M_TrackVisible", "/Game/DriveAnywhere/Materials", unreal.Material, factory)
    # Bright amber so the ribbon is impossible to miss in the viewport.
    expr = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -350, 0
    )
    expr.set_editor_property("constant", unreal.LinearColor(0.95, 0.55, 0.05, 1.0))
    unreal.MaterialEditingLibrary.connect_material_property(
        expr, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    rough = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -350, 200
    )
    rough.set_editor_property("r", 0.85)
    unreal.MaterialEditingLibrary.connect_material_property(
        rough, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(MAT_PATH)
    unreal.log("DriveAnywhere: created bright track material")
    return mat


def _ensure_game_mode():
    _ensure_folder(CONTENT)
    if not unreal.EditorAssetLibrary.does_asset_exist(GM_PATH):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.GameModeBase)
        _tools().create_asset("BP_DAGameMode", CONTENT, None, factory)
        unreal.EditorAssetLibrary.save_asset(GM_PATH)

    bp = unreal.EditorAssetLibrary.load_asset(GM_PATH)
    try:
        gen = bp.generated_class()
        cdo = unreal.get_default_object(gen)
        cdo.set_editor_property("default_pawn_class", unreal.DefaultPawn.static_class())
        cdo.set_editor_property("player_controller_class", unreal.PlayerController.static_class())
        cdo.set_editor_property("hud_class", None)
        unreal.EditorAssetLibrary.save_asset(GM_PATH)
        unreal.log("DriveAnywhere: GameMode uses DefaultPawn (fly with WASD)")
    except Exception as exc:
        unreal.log_warning("GameMode defaults: {}".format(exc))
    return GM_PATH + ".BP_DAGameMode_C"


def _label(actor) -> str:
    try:
        return actor.get_actor_label() or ""
    except Exception:
        return ""


def _has_label(prefix: str) -> bool:
    for actor in _actors().get_all_level_actors():
        if _label(actor).startswith(prefix):
            return True
    return False


def _road_actors():
    out = []
    for actor in _actors().get_all_level_actors():
        if _label(actor).startswith("Road_"):
            out.append(actor)
    return out


def _road_center(roads):
    total = unreal.Vector(0, 0, 0)
    for actor in roads:
        total = total + actor.get_actor_location()
    return total / float(max(len(roads), 1))


def _paint_roads(mat) -> int:
    count = 0
    for actor in _road_actors():
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp is None:
            continue
        comp.set_material(0, mat)
        # Thicker / slightly taller so it's obvious from altitude
        scale = actor.get_actor_scale3d()
        if scale.z < 0.4:
            try:
                actor.set_actor_scale3d(unreal.Vector(scale.x, scale.y, 0.45))
            except Exception:
                pass
        count += 1
    return count


def _spawn_environment(center: unreal.Vector) -> None:
    eas = _actors()
    if not _has_label("DA_Sun"):
        sun = eas.spawn_actor_from_class(
            unreal.DirectionalLight, center + unreal.Vector(0, 0, 5000)
        )
        sun.set_actor_label("DA_Sun")
        sun.set_actor_rotation(pitch_yaw(-40.0, 35.0, 0.0), False)
        try:
            light = sun.get_component_by_class(unreal.DirectionalLightComponent)
            if light:
                light.set_editor_property("intensity", 8.0)
                light.set_editor_property("atmosphere_sun_light", True)
        except Exception:
            pass

    if not _has_label("DA_SkyLight"):
        sky_light = eas.spawn_actor_from_class(
            unreal.SkyLight, center + unreal.Vector(0, 0, 4000)
        )
        sky_light.set_actor_label("DA_SkyLight")

    if not _has_label("DA_Sky"):
        try:
            sky = eas.spawn_actor_from_class(
                unreal.SkyAtmosphere, center + unreal.Vector(0, 0, 100)
            )
            sky.set_actor_label("DA_Sky")
        except Exception:
            pass

    if not _has_label("DA_Fog"):
        try:
            fog = eas.spawn_actor_from_class(
                unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 200)
            )
            fog.set_actor_label("DA_Fog")
        except Exception:
            pass


def _spawn_player_start(roads) -> None:
    if _has_label("DA_PlayerStart"):
        return
    if not roads:
        return
    # Start near Road_0000 if present, else first road
    start_actor = roads[0]
    for actor in roads:
        if _label(actor) == "Road_0000":
            start_actor = actor
            break
    loc = start_actor.get_actor_location()
    loc.z += 250.0
    rot = start_actor.get_actor_rotation()
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")


def _set_world_game_mode(gm_class_path: str) -> None:
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        settings = world.get_world_settings()
        gm_class = unreal.load_class(None, gm_class_path)
        if gm_class and settings:
            settings.set_editor_property("default_game_mode", gm_class)
    except Exception as exc:
        unreal.log_warning("World game mode: {}".format(exc))


def _frame_camera(roads) -> None:
    if not roads:
        return
    center = _road_center(roads)
    cam = unreal.Vector(center.x - 9000.0, center.y - 9000.0, center.z + 14000.0)
    look = unreal.MathLibrary.find_look_at_rotation(cam, center)
    try:
        ue = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        ue.set_level_viewport_camera_info(cam, look)
    except Exception:
        try:
            unreal.EditorLevelLibrary.set_level_viewport_camera_info(cam, look)
        except Exception:
            pass


def finish_map(map_path: str, mat, gm_class_path: str) -> dict:
    levels = _levels()
    levels.load_level(map_path)
    roads = _road_actors()
    painted = _paint_roads(mat)
    center = _road_center(roads) if roads else unreal.Vector(0, 0, 0)
    _spawn_environment(center)
    _spawn_player_start(roads)
    _set_world_game_mode(gm_class_path)
    _frame_camera(roads)
    levels.save_current_level()
    return {"map": map_path, "roads": len(roads), "painted": painted}


def main() -> None:
    unreal.log("DriveAnywhere: finishing project for Play…")
    _write_status({"state": "running"})
    try:
        mat = _ensure_track_material()
        gm_class_path = _ensure_game_mode()
        asset_reg = unreal.AssetRegistryHelpers.get_asset_registry()
        assets = asset_reg.get_assets_by_path(MAPS_FOLDER, recursive=False)
        map_paths = []
        for asset in assets:
            name = str(asset.asset_name)
            if name.startswith("MAP_"):
                map_paths.append("{}/{}".format(MAPS_FOLDER, name))
        # Westminster first so last-saved / startup is that map
        map_paths.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = []
        for path in map_paths:
            unreal.log("DriveAnywhere: finishing {}".format(path))
            results.append(finish_map(path, mat, gm_class_path))
        # Leave editor on Westminster
        west = "{}/MAP_WestminsterSprint".format(MAPS_FOLDER)
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            _levels().load_level(west)
            _frame_camera(_road_actors())
            _levels().save_current_level()
        _write_status({"state": "ok", "results": results, "gameMode": gm_class_path})
        unreal.log("DriveAnywhere: FINISHED. Open editor and press Play (Alt+P).")
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error("DriveAnywhere finish failed: {}".format(exc))
        raise


main()
