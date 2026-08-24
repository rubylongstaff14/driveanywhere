"""Fix upright buildings: rebuild HD city + web parity after Rotator order fix."""

from __future__ import annotations

import json
import os
import traceback
import unreal


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "upright-fix-status.json",
        )
    )


def _write(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def main():
    unreal.log("DriveAnywhere: FIX UPRIGHT — Rotator was (roll,pitch,yaw); buildings were pitched sideways")
    _write({"state": "running"})
    try:
        # Re-import modules so edits are picked up if already loaded
        import importlib
        import da_rot
        import da_city_hd
        import da_web_parity

        importlib.reload(da_rot)
        importlib.reload(da_city_hd)
        importlib.reload(da_web_parity)

        da_city_hd.main()
        da_web_parity.main()

        # Leave Westminster open
        levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        west = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
        if unreal.EditorAssetLibrary.does_asset_exist(west):
            levels.load_level(west)

        _write({"state": "ok", "note": "city_hd + web_parity rebuilt with yaw_rot upright"})
        unreal.log("DriveAnywhere: upright fix complete — Big Ben / buildings stand on Z")
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
