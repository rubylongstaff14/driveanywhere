"""Fix very-black scene: one sun only, real sky, brighter exposure."""

from __future__ import annotations

import json
import os
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
SKY_MAT = "/Game/DriveAnywhere/Materials/M_SkyDome"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "sky-fix-status.json",
        )
    )


def _write_status(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


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


def _kill_lights_and_sky():
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        cls = ""
        try:
            cls = a.get_class().get_name()
        except Exception:
            pass
        drop = (
            lab.startswith("DA_Sun")
            or lab.startswith("DA_Fill")
            or lab.startswith("DA_Sky")
            or lab.startswith("DA_Fog")
            or lab.startswith("DA_Post")
            or lab.startswith("DA_Ambient")
            or lab.startswith("DA_SkyDome")
            or "DirectionalLight" in cls
            or "SkyLight" in cls
            or "SkyAtmosphere" in cls
            or "ExponentialHeightFog" in cls
            or "PostProcessVolume" in cls
            or "PointLight" in cls
        )
        if drop and (lab.startswith("DA_") or "DirectionalLight" in cls or "SkyLight" in cls or "SkyAtmosphere" in cls):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass


def _roads():
    return [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]


def _center(roads):
    t = unreal.Vector(0, 0, 0)
    for a in roads:
        t = t + a.get_actor_location()
    return t / float(max(len(roads), 1))


def _ensure_sky_mat():
    folder = "/Game/DriveAnywhere/Materials"
    if not unreal.EditorAssetLibrary.does_directory_exist(folder):
        unreal.EditorAssetLibrary.make_directory(folder)
    if unreal.EditorAssetLibrary.does_asset_exist(SKY_MAT):
        mat = unreal.EditorAssetLibrary.load_asset(SKY_MAT)
    else:
        mat = _tools().create_asset("M_SkyDome", folder, unreal.Material, unreal.MaterialFactoryNew())

    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    # Unlit bright sky blue — always visible
    try:
        mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    except Exception:
        pass
    try:
        mat.set_editor_property("two_sided", True)
    except Exception:
        pass

    col = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -380, 0
    )
    # Soft daylight blue
    col.set_editor_property("constant", unreal.LinearColor(0.35, 0.55, 0.95, 1.0))
    unreal.MaterialEditingLibrary.connect_material_property(
        col, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )
    # Also base color fallback
    col2 = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -380, 200
    )
    col2.set_editor_property("constant", unreal.LinearColor(0.35, 0.55, 0.95, 1.0))
    unreal.MaterialEditingLibrary.connect_material_property(
        col2, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(SKY_MAT)
    return mat


def _boost_surface_emissive():
    """Slight lift on asphalt/ground so Lit mode never goes pure black."""
    for path, glow in (
        ("/Game/DriveAnywhere/Materials/M_Asphalt", unreal.LinearColor(0.02, 0.02, 0.025, 1)),
        ("/Game/DriveAnywhere/Materials/M_Ground", unreal.LinearColor(0.03, 0.04, 0.02, 1)),
    ):
        if not unreal.EditorAssetLibrary.does_asset_exist(path):
            continue
        mat = unreal.EditorAssetLibrary.load_asset(path)
        try:
            # Don't wipe whole graph — add emissive if missing by full rebuild keeping base
            unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
            if "Asphalt" in path:
                base_c = unreal.LinearColor(0.04, 0.04, 0.045, 1)
            else:
                base_c = unreal.LinearColor(0.10, 0.13, 0.08, 1)
            base = unreal.MaterialEditingLibrary.create_material_expression(
                mat, unreal.MaterialExpressionConstant3Vector, -400, 0
            )
            base.set_editor_property("constant", base_c)
            unreal.MaterialEditingLibrary.connect_material_property(
                base, "", unreal.MaterialProperty.MP_BASE_COLOR
            )
            em = unreal.MaterialEditingLibrary.create_material_expression(
                mat, unreal.MaterialExpressionConstant3Vector, -400, 200
            )
            em.set_editor_property("constant", glow)
            unreal.MaterialEditingLibrary.connect_material_property(
                em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
            )
            r = unreal.MaterialEditingLibrary.create_material_expression(
                mat, unreal.MaterialExpressionConstant, -400, 360
            )
            r.set_editor_property("r", 0.95)
            unreal.MaterialEditingLibrary.connect_material_property(
                r, "", unreal.MaterialProperty.MP_ROUGHNESS
            )
            unreal.MaterialEditingLibrary.recompile_material(mat)
            unreal.EditorAssetLibrary.save_asset(path)
        except Exception as exc:
            unreal.log_warning("mat boost {}: {}".format(path, exc))


def _install(center, sky_mat):
    eas = _actors()
    mov = unreal.ComponentMobility.MOVABLE

    # --- ONE directional light only (fixes competing-lights warning) ---
    sun = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 25000)
    )
    sun.set_actor_label("DA_Sun")
    try:
        sun.root_component.set_editor_property("mobility", mov)
    except Exception:
        pass
    try:
        sun.set_actor_rotation(pitch_yaw(-40.0, 35.0, 0.0), False)
    except Exception:
        pass
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if lc:
        try:
            lc.set_editor_property("mobility", mov)
            lc.set_intensity(10.0)
            lc.set_editor_property("atmosphere_sun_light", True)
            lc.set_editor_property("cast_shadows", True)
            lc.set_editor_property("forward_shading_priority", 0)
            lc.set_editor_property("light_color", unreal.Color(255, 245, 230, 255))
        except Exception:
            try:
                lc.set_intensity(10.0)
            except Exception:
                pass

    # Sky light (ambient — not a second sun)
    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 20000))
    sk.set_actor_label("DA_SkyLight")
    sc = sk.get_component_by_class(unreal.SkyLightComponent)
    if sc:
        try:
            sc.set_editor_property("mobility", mov)
            sc.set_editor_property("real_time_capture", True)
            sc.set_intensity(4.0)
            sc.set_editor_property("lower_hemisphere_is_black", False)
            sc.set_editor_property(
                "lower_hemisphere_color", unreal.LinearColor(0.25, 0.28, 0.32, 1)
            )
        except Exception:
            pass

    # Atmosphere
    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("DA_Sky")
    except Exception:
        pass

    # Light fog
    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 100)
        )
        fog.set_actor_label("DA_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            fc.set_editor_property("fog_density", 0.005)
            fc.set_editor_property(
                "fog_inscattering_color", unreal.LinearColor(0.55, 0.65, 0.85, 1)
            )
    except Exception:
        pass

    # Giant sky dome (unlit blue) — guarantees non-black background
    sphere = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")
    if sphere and sky_mat:
        dome = eas.spawn_actor_from_class(unreal.StaticMeshActor, center)
        dome.set_actor_label("DA_SkyDome")
        try:
            dome.set_actor_scale3d(unreal.Vector(800.0, 800.0, 800.0))
        except Exception:
            pass
        comp = dome.get_component_by_class(unreal.StaticMeshComponent)
        if comp:
            comp.set_static_mesh(sphere)
            comp.set_material(0, sky_mat)
            comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
            try:
                comp.set_editor_property("mobility", mov)
                comp.set_editor_property("cast_shadow", False)
                # Render inside of sphere
                comp.set_editor_property("reverse_culling", True)
            except Exception:
                pass

    # Exposure
    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        pp.set_editor_property("priority", 100.0)
        settings = pp.get_editor_property("settings")
        try:
            settings.set_editor_property(
                "auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL
            )
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 4.0)
            settings.set_editor_property("override_auto_exposure_bias", True)
        except Exception:
            pass
        try:
            settings.set_editor_property("bloom_intensity", 0.0)
            settings.set_editor_property("override_bloom_intensity", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception:
        pass


def _frame(roads):
    if not roads:
        return
    c = _center(roads)
    cam = unreal.Vector(c.x - 10000, c.y - 10000, c.z + 12000)
    look = unreal.MathLibrary.find_look_at_rotation(cam, c)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        pass


def _fix_map(path, sky_mat):
    _levels().load_level(path)
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        ws = world.get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass

    _kill_lights_and_sky()
    roads = _roads()
    center = _center(roads) if roads else unreal.Vector(0, 0, 0)
    _install(center, sky_mat)
    _frame(roads)
    _levels().save_current_level()
    return {"map": path, "roads": len(roads)}


def main():
    unreal.log("DriveAnywhere: fixing black sky / competing suns…")
    _write_status({"state": "running"})
    try:
        sky_mat = _ensure_sky_mat()
        _boost_surface_emissive()

        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_fix_map(m, sky_mat) for m in maps]

        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            _frame(_roads())

        _write_status({"state": "ok", "results": results})
        unreal.log("DriveAnywhere: one sun + blue sky dome. Scene should no longer be black.")
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
