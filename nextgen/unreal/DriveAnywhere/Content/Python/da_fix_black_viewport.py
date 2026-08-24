"""Fix black viewport: rebuild daylight, exposure, and frame the track."""

from __future__ import annotations

import json
import os
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "black-viewport-fix.json",
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


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _kill(prefixes):
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
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


def _set_movable(actor):
    try:
        if actor.root_component:
            actor.root_component.set_editor_property(
                "mobility", unreal.ComponentMobility.MOVABLE
            )
    except Exception:
        pass


def _disable_world_partition():
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        ws = world.get_world_settings()
        for prop, val in (
            ("force_no_precomputed_lighting", True),
            ("b_force_no_precomputed_lighting", True),
            ("enable_world_partition", False),
            ("b_enable_world_partition", False),
        ):
            try:
                ws.set_editor_property(prop, val)
            except Exception:
                pass
    except Exception as exc:
        unreal.log_warning("WP: {}".format(exc))


def _install_daylight(center):
    """Bright, simple daylight that works even if Lumen misbehaves."""
    _kill(["DA_Sun", "DA_SkyLight", "DA_Sky", "DA_Fog", "DA_Post", "DA_FillLight", "DA_Ambient"])
    eas = _actors()
    mov = unreal.ComponentMobility.MOVABLE

    # Key sun — bright
    sun = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 20000)
    )
    sun.set_actor_label("DA_Sun")
    _set_movable(sun)
    try:
        sun.set_actor_rotation(pitch_yaw(-45.0, 30.0, 0.0), False)
    except Exception:
        pass
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if lc:
        try:
            lc.set_editor_property("mobility", mov)
            lc.set_intensity(12.0)
            lc.set_editor_property("atmosphere_sun_light", True)
            lc.set_editor_property("cast_shadows", True)
            lc.set_editor_property("indirect_lighting_intensity", 1.5)
            lc.set_editor_property("volumetric_scattering_intensity", 1.0)
        except Exception:
            try:
                lc.set_intensity(12.0)
            except Exception:
                pass

    # Fill directional from opposite side (kills pure-black shadows)
    fill = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 18000)
    )
    fill.set_actor_label("DA_FillLight")
    _set_movable(fill)
    try:
        fill.set_actor_rotation(pitch_yaw(-25.0, -140.0, 0.0), False)
    except Exception:
        pass
    fc = fill.get_component_by_class(unreal.DirectionalLightComponent)
    if fc:
        try:
            fc.set_editor_property("mobility", mov)
            fc.set_intensity(3.5)
            fc.set_editor_property("cast_shadows", False)
            fc.set_editor_property("atmosphere_sun_light", False)
        except Exception:
            pass

    # Sky light
    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 15000))
    sk.set_actor_label("DA_SkyLight")
    _set_movable(sk)
    sc = sk.get_component_by_class(unreal.SkyLightComponent)
    if sc:
        try:
            sc.set_editor_property("mobility", mov)
            sc.set_editor_property("real_time_capture", True)
            sc.set_intensity(2.5)
            sc.set_editor_property("lower_hemisphere_is_black", False)
            sc.set_editor_property("lower_hemisphere_color", unreal.LinearColor(0.2, 0.22, 0.25, 1))
        except Exception:
            pass

    # Atmosphere
    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("DA_Sky")
    except Exception:
        pass

    # Soft fog (not crushing blacks)
    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 200)
        )
        fog.set_actor_label("DA_Fog")
        fogc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fogc:
            fogc.set_editor_property("fog_density", 0.008)
            fogc.set_editor_property("fog_inscattering_color", unreal.LinearColor(0.4, 0.45, 0.55, 1))
    except Exception:
        pass

    # Manual exposure — bright enough to see grey asphalt
    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        pp.set_editor_property("priority", 10.0)
        settings = pp.get_editor_property("settings")
        try:
            settings.set_editor_property(
                "auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL
            )
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 3.0)
            settings.set_editor_property("override_auto_exposure_bias", True)
        except Exception:
            pass
        try:
            # UE5 sometimes uses fixed luminance for manual
            settings.set_editor_property("auto_exposure_apply_physical_camera_exposure", False)
            settings.set_editor_property(
                "override_auto_exposure_apply_physical_camera_exposure", True
            )
        except Exception:
            pass
        try:
            settings.set_editor_property("bloom_intensity", 0.05)
            settings.set_editor_property("override_bloom_intensity", True)
        except Exception:
            pass
        try:
            # Ambient cubemap-ish lift via color grading gamma
            settings.set_editor_property("color_gamma", unreal.Vector4(1.15, 1.15, 1.15, 1.15))
            settings.set_editor_property("override_color_gamma", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception as exc:
        unreal.log_warning("Post: {}".format(exc))

    # Giant unlit-ish ambient point lights around the circuit so Lit mode can't go pure black
    for i, offset in enumerate(
        (
            unreal.Vector(15000, 0, 8000),
            unreal.Vector(-15000, 0, 8000),
            unreal.Vector(0, 15000, 8000),
            unreal.Vector(0, -15000, 8000),
        )
    ):
        pl = eas.spawn_actor_from_class(unreal.PointLight, center + offset)
        pl.set_actor_label("DA_Ambient_{}".format(i))
        _set_movable(pl)
        pc = pl.get_component_by_class(unreal.PointLightComponent)
        if pc:
            try:
                pc.set_editor_property("mobility", mov)
                pc.set_intensity(80.0)
                pc.set_editor_property("intensity_units", unreal.LightUnits.UNITLESS)
                pc.set_attenuation_radius(60000.0)
                pc.set_editor_property("cast_shadows", False)
            except Exception:
                try:
                    pc.set_intensity(50.0)
                    pc.set_attenuation_radius(60000.0)
                except Exception:
                    pass


def _frame(roads):
    if not roads:
        return
    c = _center(roads)
    cam = unreal.Vector(c.x - 12000, c.y - 12000, c.z + 16000)
    look = unreal.MathLibrary.find_look_at_rotation(cam, c)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        try:
            unreal.EditorLevelLibrary.set_level_viewport_camera_info(cam, look)
        except Exception:
            pass


def _fix_map(path):
    _levels().load_level(path)
    _disable_world_partition()
    roads = _roads()
    blds = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Bld_")]
    center = _center(roads) if roads else unreal.Vector(0, 0, 200)
    _install_daylight(center)
    _frame(roads)
    _levels().save_current_level()
    return {
        "map": path,
        "roads": len(roads),
        "buildings": len(blds),
        "ok": len(roads) > 0,
    }


def main():
    unreal.log("DriveAnywhere: fixing BLACK viewport…")
    _write_status({"state": "running"})
    try:
        # Prefer Westminster first for immediate user view
        results = []
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            results.append(_fix_map(WEST))

        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        for a in assets:
            name = str(a.asset_name)
            if not name.startswith("MAP_"):
                continue
            path = "{}/{}".format(MAPS, name)
            if path == WEST:
                continue
            results.append(_fix_map(path))

        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            _frame(_roads())
            _levels().save_current_level()

        _write_status({"state": "ok", "results": results})
        unreal.log(
            "DriveAnywhere: viewport lighting restored. Look for the grey road + buildings."
        )
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
