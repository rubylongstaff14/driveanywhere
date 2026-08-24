"""One-shot DriveAnywhere bootstrap for Unreal Editor.

File → Execute Python Script → pick this file
  OR launch with -ExecutePythonScript=.../da_bootstrap.py
"""

from __future__ import annotations

import json
import os
import traceback
import unreal


def _status_path() -> str:
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "import-status.json",
        )
    )


def _write_status(payload: dict) -> None:
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def main() -> None:
    unreal.log("DriveAnywhere: bootstrap starting…")
    _write_status({"state": "running"})
    try:
        import da_import
        import da_vehicles

        maps = da_import.import_all()
        da_vehicles.import_classes()
        _write_status({"state": "ok", "maps": maps})
        unreal.log("DriveAnywhere: done. Open MAP_WestminsterSprint and press Play.")
        unreal.log("Imported maps: {}".format(", ".join(maps)))
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error("DriveAnywhere bootstrap failed: {}".format(exc))
        raise


main()
