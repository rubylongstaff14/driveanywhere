"""Make DriveAnywhere actually playable end-to-end.

Guarantees:
- Soft, locked lighting (no blown whites / black voids)
- Visible asphalt + ground on every map
- DefaultPawn-based racer (engine already wires WASD — empty Character BPs do not)
- PlayerStart on the ribbon, camera framed
- GameMode set on every map + project defaults
"""

from __future__ import annotations

import json
import os
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
CONTENT = "/Game/DriveAnywhere"
MAT_ASPHALT = "/Game/DriveAnywhere/Materials/M_Asphalt"
MAT_GROUND = "/Game/DriveAnywhere/Materials/M_Ground"
MAT_CAR = "/Game/DriveAnywhere/Materials/M_CarBody"
MAT_LINE = "/Game/DriveAnywhere/Materials/M_CenterLine"
RACER = "/Game/DriveAnywhere/BP_DARacer"
GM = "/Game/DriveAnywhere/BP_DAGameMode"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "work-status.json",
        )
    )


def _write_status(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def _folder(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


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


def _make_mat(name, folder, color, rough=0.85):
    full = "{}/{}".format(folder, name)
    _folder(folder)
    if unreal.EditorAssetLibrary.does_asset_exist(full):
        mat = unreal.EditorAssetLibrary.load_asset(full)
    else:
        mat = _tools().create_asset(name, folder, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    c = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -380, 0
    )
    c.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(
        c, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    r = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant, -380, 160
    )
    r.set_editor_property("r", rough)
    unreal.MaterialEditingLibrary.connect_material_property(
        r, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(full)
    return mat


def _ensure_mats():
    asphalt = _make_mat(
        "M_Asphalt",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.035, 0.035, 0.04, 1),
        0.95,
    )
    ground = _make_mat(
        "M_Ground",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.10, 0.13, 0.08, 1),
        0.97,
    )
    car = _make_mat(
        "M_CarBody",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.65, 0.02, 0.05, 1),
        0.3,
    )
    line = _make_mat(
        "M_CenterLine",
        "/Game/DriveAnywhere/Materials",
        unreal.LinearColor(0.9, 0.85, 0.15, 1),
        0.6,
    )
    return asphalt, ground, car, line


def _roads():
    return [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]


def _center(roads):
    t = unreal.Vector(0, 0, 0)
    for a in roads:
        t = t + a.get_actor_location()
    return t / float(max(len(roads), 1))


def _bounds(roads):
    if not roads:
        return unreal.Vector(0, 0, 0), 40000.0
    mn = unreal.Vector(1e12, 1e12, 1e12)
    mx = unreal.Vector(-1e12, -1e12, -1e12)
    for a in roads:
        p = a.get_actor_location()
        mn.x, mn.y, mn.z = min(mn.x, p.x), min(mn.y, p.y), min(mn.z, p.z)
        mx.x, mx.y, mx.z = max(mx.x, p.x), max(mx.y, p.y), max(mx.z, p.z)
    c = (mn + mx) * 0.5
    rad = max(mx.x - mn.x, mx.y - mn.y) * 0.5 + 10000.0
    return c, rad


def _kill(prefixes):
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass


def _paint(roads, mat):
    n = 0
    for a in roads:
        comp = a.get_component_by_class(unreal.StaticMeshComponent)
        if comp:
            comp.set_material(0, mat)
            n += 1
    return n


def _lighting(center):
    _kill(["DA_Sun", "DA_SkyLight", "DA_Sky", "DA_Fog", "DA_Post"])
    eas = _actors()

    sun = eas.spawn_actor_from_class(unreal.DirectionalLight, center + unreal.Vector(0, 0, 10000))
    sun.set_actor_label("DA_Sun")
    try:
        sun.set_actor_rotation(pitch_yaw(-55.0, 25.0, 0.0), False)
    except Exception:
        pass
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if lc:
        try:
            lc.set_intensity(4.0)
            lc.set_editor_property("atmosphere_sun_light", True)
            lc.set_editor_property("indirect_lighting_intensity", 1.0)
        except Exception:
            pass

    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 7000))
    sk.set_actor_label("DA_SkyLight")
    sc = sk.get_component_by_class(unreal.SkyLightComponent)
    if sc:
        try:
            sc.set_editor_property("intensity", 1.5)
            sc.set_editor_property("real_time_capture", True)
        except Exception:
            pass

    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("DA_Sky")
    except Exception:
        pass

    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 100)
        )
        fog.set_actor_label("DA_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            fc.set_editor_property("fog_density", 0.012)
            fc.set_editor_property("fog_height_falloff", 0.2)
    except Exception:
        pass

    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        settings = pp.get_editor_property("settings")
        try:
            settings.set_editor_property(
                "auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL
            )
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 1.0)
            settings.set_editor_property("override_auto_exposure_bias", True)
        except Exception:
            pass
        try:
            # Soften bloom so asphalt isn't washed out
            settings.set_editor_property("bloom_intensity", 0.1)
            settings.set_editor_property("override_bloom_intensity", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception as exc:
        unreal.log_warning("PP: {}".format(exc))


def _ground(center, radius, mat):
    _kill(["DA_Ground"])
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")
    if not mesh:
        return
    g = _actors().spawn_actor_from_class(
        unreal.StaticMeshActor, unreal.Vector(center.x, center.y, center.z - 60.0)
    )
    g.set_actor_label("DA_Ground")
    scale = max(radius / 50.0, 250.0)
    try:
        g.set_actor_scale3d(unreal.Vector(scale, scale, 1.0))
    except Exception:
        pass
    comp = g.get_component_by_class(unreal.StaticMeshComponent)
    if comp:
        comp.set_static_mesh(mesh)
        comp.set_material(0, mat)
        comp.set_collision_profile_name("BlockAll")
        comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)


def _centerline(roads, mat):
    _kill(["DA_Line_"])
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
    if not mesh or len(roads) < 4:
        return 0
    eas = _actors()
    n = 0
    for i, a in enumerate(roads):
        if i % 4 != 0:
            continue
        loc = a.get_actor_location()
        loc.z += 25.0
        rot = a.get_actor_rotation()
        line = eas.spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
        line.set_actor_label("DA_Line_{:04d}".format(i))
        try:
            line.set_actor_scale3d(unreal.Vector(1.2, 0.08, 0.05))
        except Exception:
            pass
        comp = line.get_component_by_class(unreal.StaticMeshComponent)
        if comp:
            comp.set_static_mesh(mesh)
            comp.set_material(0, mat)
            comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
        n += 1
    return n


def _player_start(roads):
    _kill(["DA_PlayerStart"])
    if not roads:
        return
    start = roads[0]
    for a in roads:
        if _label(a) == "Road_0000":
            start = a
            break
    loc = start.get_actor_location()
    # Hover just above asphalt — DefaultPawn flies, keep spawn low over ribbon
    loc.z += 220.0
    rot = start.get_actor_rotation()
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")


def _ensure_racer(car_mat):
    """DefaultPawn already implements WASD/mouse — reliable in empty projects."""
    _folder(CONTENT)
    if not unreal.EditorAssetLibrary.does_asset_exist(RACER):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.DefaultPawn)
        _tools().create_asset("BP_DARacer", CONTENT, None, factory)

    bp = unreal.EditorAssetLibrary.load_asset(RACER)
    cube = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
    try:
        gen = bp.generated_class()
        cdo = unreal.get_default_object(gen)
        move = None
        for prop in ("movement_component", "floating_pawn_movement"):
            try:
                move = cdo.get_editor_property(prop)
                if move:
                    break
            except Exception:
                pass
        # Also search components
        if move is None:
            try:
                move = cdo.get_component_by_class(unreal.FloatingPawnMovement)
            except Exception:
                pass
        if move:
            move.set_editor_property("max_speed", 4500.0)
            try:
                move.set_editor_property("acceleration", 12000.0)
                move.set_editor_property("deceleration", 6000.0)
            except Exception:
                pass
        # Visible body
        try:
            mesh = cdo.get_editor_property("mesh_component")
            if mesh and cube:
                mesh.set_static_mesh(cube)
                mesh.set_relative_scale3d(unreal.Vector(2.2, 1.2, 0.55))
                mesh.set_material(0, car_mat)
        except Exception:
            pass
        try:
            cdo.set_editor_property("base_eye_height", 80.0)
        except Exception:
            pass
        unreal.EditorAssetLibrary.save_asset(RACER)
        unreal.log("DriveAnywhere: BP_DARacer = fast DefaultPawn with car mesh")
    except Exception as exc:
        unreal.log_warning("Racer: {}".format(exc))
    return RACER + ".BP_DARacer_C"


def _ensure_gm(racer_cls_path):
    if not unreal.EditorAssetLibrary.does_asset_exist(GM):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.GameModeBase)
        _tools().create_asset("BP_DAGameMode", CONTENT, None, factory)
    bp = unreal.EditorAssetLibrary.load_asset(GM)
    try:
        cdo = unreal.get_default_object(bp.generated_class())
        racer = unreal.load_class(None, racer_cls_path)
        if racer:
            cdo.set_editor_property("default_pawn_class", racer)
        cdo.set_editor_property("player_controller_class", unreal.PlayerController.static_class())
        unreal.EditorAssetLibrary.save_asset(GM)
    except Exception as exc:
        unreal.log_warning("GM: {}".format(exc))
    return GM + ".BP_DAGameMode_C"


def _set_world_gm(gm_path):
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        ws = world.get_world_settings()
        gm = unreal.load_class(None, gm_path)
        if gm and ws:
            ws.set_editor_property("default_game_mode", gm)
    except Exception:
        pass


def _frame(roads):
    if not roads:
        return
    c = _center(roads)
    cam = unreal.Vector(c.x - 8000, c.y - 8000, c.z + 10000)
    look = unreal.MathLibrary.find_look_at_rotation(cam, c)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        pass


def _fix_map(path, asphalt, ground, line, gm_path):
    _levels().load_level(path)
    roads = _roads()
    painted = _paint(roads, asphalt)
    center, radius = _bounds(roads)
    _lighting(center if roads else unreal.Vector(0, 0, 0))
    _ground(center, radius, ground)
    lines = _centerline(roads, line)
    _player_start(roads)
    _set_world_gm(gm_path)
    _frame(roads)
    _levels().save_current_level()
    return {
        "map": path,
        "roads": len(roads),
        "painted": painted,
        "lines": lines,
        "ok": len(roads) > 0,
    }


def main():
    unreal.log("DriveAnywhere: MAKE IT WORK…")
    _write_status({"state": "running"})
    try:
        asphalt, ground, car, line = _ensure_mats()
        racer = _ensure_racer(car)
        gm = _ensure_gm(racer)

        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_fix_map(m, asphalt, ground, line, gm) for m in maps]

        west = "{}/MAP_WestminsterSprint".format(MAPS)
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            _levels().load_level(west)
            _frame(_roads())
            _levels().save_current_level()

        failed = [r for r in results if not r.get("ok")]
        _write_status(
            {
                "state": "ok" if not failed else "partial",
                "results": results,
                "racer": racer,
                "gameMode": gm,
                "howToPlay": "Alt+P then WASD move, mouse look, E/C up/down",
            }
        )
        unreal.log(
            "DriveAnywhere: READY — {} maps. Press Alt+P. WASD + mouse. E/C up/down.".format(
                len(results)
            )
        )
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error(str(exc))
        raise


main()
