"""Create four Chaos vehicle class DataAssets from chaos-vehicles.json.

Fairness: same class is equal. Cosmetics must never write these properties.

Usage:
    import da_vehicles
    da_vehicles.import_classes()
"""

from __future__ import annotations

import json
import os
import unreal

from da_import import export_dir


CLASS_FOLDER = "/Game/DriveAnywhere/Vehicles"


def _ensure_folder(path: str) -> None:
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _hex_to_linear(hex_color: str) -> unreal.LinearColor:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return unreal.LinearColor(0.8, 0.1, 0.15, 1.0)
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return unreal.LinearColor(r, g, b, 1.0)


def _write_data_asset(spec: dict) -> str:
    """PrimaryDataAsset-style JSON next to the project for Blueprint designers.

    Creating ChaosWheeledVehiclePawn blueprints from Python differs by engine
    version; we always write a readable asset the Racing template can copy from.
    """
    _ensure_folder(CLASS_FOLDER)
    name = "DA_{}".format(spec["id"].title())
    asset_path = "{}/{}".format(CLASS_FOLDER, name)

    payload = {
        "id": spec["id"],
        "displayName": spec["name"],
        "fairness": spec.get("fairness"),
        "massKg": spec["massKg"],
        "maxSpeedKmh": spec["maxSpeedKmh"],
        "maxEngineTorqueNm": spec["maxEngineTorqueNm"],
        "brakeTorqueNm": spec["brakeTorqueNm"],
        "maxSteerAngleDeg": spec["maxSteerAngleDeg"],
        "highSpeedSteerAngleDeg": spec["highSpeedSteerAngleDeg"],
        "lateralFriction": spec["lateralFriction"],
        "dragCoefficient": spec["dragCoefficient"],
        "downforceKg": spec["downforceKg"],
        "wheelRadiusCm": spec["wheelRadiusCm"],
        "chassisCm": spec["chassisCm"],
        "defaultPaint": spec["defaultPaint"],
        "cosmeticsNeverChangePace": True,
    }

    disk = os.path.join(
        os.path.normpath(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())),
        "Content",
        "DriveAnywhere",
        "Vehicles",
        "{}.json".format(name),
    )
    os.makedirs(os.path.dirname(disk), exist_ok=True)
    with open(disk, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")

    try:
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.PrimaryDataAsset)
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        asset = tools.create_asset(name, CLASS_FOLDER, unreal.PrimaryDataAsset, factory)
        if asset:
            unreal.EditorAssetLibrary.save_asset(asset_path)
    except Exception as exc:
        unreal.log_warning("Could not create PrimaryDataAsset {}: {}".format(name, exc))

    unreal.log("Wrote vehicle class {} → {}".format(spec["id"], disk))
    return disk


def _try_create_vehicle_blueprint(spec: dict) -> None:
    parent = None
    for path in (
        "/Script/ChaosVehicles.WheeledVehiclePawn",
        "/Script/ChaosVehicles.ChaosWheeledVehiclePawn",
        "/Script/Engine.Pawn",
    ):
        try:
            parent = unreal.load_class(None, path)
        except Exception:
            parent = None
        if parent:
            break
    if not parent:
        unreal.log_warning("No vehicle pawn class — use the Racing template and paste JSON tunes.")
        return
    _ensure_folder(CLASS_FOLDER)
    name = "BP_{}".format(spec["name"].replace(" ", "").replace("-", ""))
    if unreal.EditorAssetLibrary.does_asset_exist("{}/{}".format(CLASS_FOLDER, name)):
        return
    try:
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", parent)
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        tools.create_asset(name, CLASS_FOLDER, None, factory)
        unreal.EditorAssetLibrary.save_asset("{}/{}".format(CLASS_FOLDER, name))
        unreal.log("Created vehicle blueprint {}".format(name))
    except Exception as exc:
        unreal.log_warning("Blueprint {} skipped: {}".format(name, exc))


def import_classes():
    data = json.load(open(os.path.join(export_dir(), "chaos-vehicles.json"), encoding="utf-8"))
    written = []
    for spec in data["classes"]:
        written.append(_write_data_asset(spec))
        _try_create_vehicle_blueprint(spec)
        paint = _hex_to_linear(spec.get("defaultPaint") or "#ffffff")
        unreal.log("{} paint linear {} {} {}".format(spec["id"], paint.r, paint.g, paint.b))
    unreal.log("DriveAnywhere: {} class tunes ready. Do not let cosmetics edit Chaos movement.".format(len(written)))
    return written


if __name__ == "__main__":
    import_classes()
