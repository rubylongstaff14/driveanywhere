"""Stop 'lighting needs to be rebuilt' — use fully dynamic lights (Lumen-friendly)."""

from __future__ import annotations

import json
import os
import traceback
import unreal

MAPS = "/Game/DriveAnywhere/Maps"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "lighting-fix-status.json",
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


def _set_mobility(actor, mobility):
    try:
        root = actor.root_component
        if root:
            root.set_editor_property("mobility", mobility)
    except Exception:
        pass
    for cls in (
        unreal.DirectionalLightComponent,
        unreal.SkyLightComponent,
        unreal.StaticMeshComponent,
        unreal.LightComponent,
    ):
        try:
            comp = actor.get_component_by_class(cls)
            if comp:
                comp.set_editor_property("mobility", mobility)
        except Exception:
            pass


def _fix_map(map_path: str) -> dict:
    _levels().load_level(map_path)
    eas = _actors()
    movable = unreal.ComponentMobility.MOVABLE
    lights = 0
    meshes = 0

    # World: never require baked lightmaps
    try:
        world = unreal.EditorLevelLibrary.get_editor_world()
        ws = world.get_world_settings()
        for prop, val in (
            ("force_no_precomputed_lighting", True),
            ("b_force_no_precomputed_lighting", True),
            ("lightmass_settings", None),
        ):
            try:
                if val is not None:
                    ws.set_editor_property(prop, val)
            except Exception:
                pass
    except Exception as exc:
        unreal.log_warning("WorldSettings: {}".format(exc))

    for actor in eas.get_all_level_actors():
        lab = _label(actor)
        cls_name = ""
        try:
            cls_name = actor.get_class().get_name()
        except Exception:
            pass

        is_light = any(
            x in cls_name
            for x in ("DirectionalLight", "SkyLight", "PointLight", "SpotLight", "RectLight")
        ) or lab.startswith("DA_Sun") or lab.startswith("DA_Sky")

        if is_light or lab in ("DA_Sun", "DA_SkyLight", "DA_Sky", "DA_Fog", "DA_Post"):
            _set_mobility(actor, movable)
            lights += 1
            # Real-time skylight
            if "SkyLight" in cls_name or lab == "DA_SkyLight":
                sc = actor.get_component_by_class(unreal.SkyLightComponent)
                if sc:
                    try:
                        sc.set_editor_property("real_time_capture", True)
                        sc.set_editor_property("mobility", movable)
                    except Exception:
                        pass

        # Roads + buildings: movable so they don't demand lightmaps
        if lab.startswith("Road_") or lab.startswith("Bld_") or lab.startswith("DA_Ground") or lab.startswith("DA_Line_"):
            _set_mobility(actor, movable)
            meshes += 1

    # Clear built lighting data if API exists
    try:
        unreal.EditorLevelLibrary.get_editor_world()
        # Swipe lighting build quality to preview / unbuilt
        unreal.SystemLibrary.execute_console_command(
            None, "RebuildLevelLighting 0"
        )
    except Exception:
        pass

    _levels().save_current_level()
    unreal.log("Lighting fix {}: {} lights, {} meshes → Movable".format(map_path, lights, meshes))
    return {"map": map_path, "lights": lights, "meshes": meshes}


def main():
    unreal.log("DriveAnywhere: fixing lighting rebuild warning…")
    _write_status({"state": "running"})
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
        results = [_fix_map(m) for m in maps]

        west = "{}/MAP_WestminsterSprint".format(MAPS)
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            _levels().load_level(west)

        _write_status({"state": "ok", "results": results})
        unreal.log("DriveAnywhere: lighting is dynamic — no rebuild needed.")
    except Exception as e:
        _write_status({"state": "error", "error": str(e), "trace": traceback.format_exc()})
        raise


main()
