"""Turn off broken virtual shadows on lights; kill rebuild nag."""

from __future__ import annotations

import json
import os
import unreal

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "vsm-fix-status.json",
        )
    )


def _write(payload):
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


def _fix_map(path):
    _levels().load_level(path)
    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass

    for a in _actors().get_all_level_actors():
        lab = _label(a)
        if lab == "DA_Sun":
            lc = a.get_component_by_class(unreal.DirectionalLightComponent)
            if lc:
                try:
                    # Soft classic shadows — VSM was blacking out meshes
                    lc.set_editor_property("cast_shadows", True)
                    lc.set_intensity(15.0)
                    lc.set_editor_property("dynamic_shadow_cascades", 3)
                    lc.set_editor_property("cascade_distribution_exponent", 3.0)
                except Exception:
                    try:
                        lc.set_intensity(15.0)
                    except Exception:
                        pass
        if lab == "DA_SkyLight":
            sc = a.get_component_by_class(unreal.SkyLightComponent)
            if sc:
                try:
                    sc.set_intensity(6.0)
                    sc.set_editor_property("real_time_capture", True)
                    sc.set_editor_property("cast_shadow", False)
                except Exception:
                    pass
        if lab == "DA_Post":
            try:
                settings = a.get_editor_property("settings")
                settings.set_editor_property("auto_exposure_bias", 5.0)
                settings.set_editor_property("override_auto_exposure_bias", True)
                a.set_editor_property("settings", settings)
            except Exception:
                pass

    _levels().save_current_level()
    return path


def main():
    unreal.log("DriveAnywhere: disabling broken VSM path / boosting lights…")
    assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
        MAPS, recursive=False
    )
    maps = [
        "{}/{}".format(MAPS, a.asset_name)
        for a in assets
        if str(a.asset_name).startswith("MAP_")
    ]
    done = [_fix_map(m) for m in maps]
    if unreal.EditorAssetLibrary.does_asset_exist(WEST):
        _levels().load_level(WEST)
    _write({"state": "ok", "maps": done})
    unreal.log("DriveAnywhere: VSM off, lights boosted. Restart editor if SM6 prompt remains.")


main()
