"""Import all DriveAnywhere circuits into Unreal Editor (UE 5.8+).

Creates one map per circuit under /Game/DriveAnywhere/Maps.

Usage:
    import da_import
    da_import.import_all()
"""

from __future__ import annotations

import json
import os
import re
import unreal

ROAD_Z = 8.0
HERO_TAGS = (
    "elizabeth",
    "big ben",
    "parliament",
    "burj",
    "tokyo tower",
    "skytree",
    "empire state",
    "statue of liberty",
    "christ the redeemer",
    "pyramid",
    "matterhorn",
    "one canada square",
    "shard",
)


def _project_dir() -> str:
    return os.path.normpath(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()))


def export_dir() -> str:
    here = os.path.normpath(os.path.join(_project_dir(), "..", "export"))
    if os.path.isdir(here):
        return here
    raise FileNotFoundError("DriveAnywhere export folder not found next to the .uproject")


def _slug_to_map(slug: str) -> str:
    parts = [p.title() for p in re.split(r"[-_]", slug) if p]
    return "MAP_" + "".join(parts)


def _load_json(path: str):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def _vec(p) -> unreal.Vector:
    return unreal.Vector(float(p["x"]), float(p["y"]), float(p["z"]))


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _levels():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def _try_load_mesh():
    for path in ("/Engine/BasicShapes/Cube", "/Engine/EngineMeshes/Cube"):
        asset = unreal.EditorAssetLibrary.load_asset(path)
        if asset:
            return asset
    return None


def _ensure_folder(path: str) -> None:
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _set_folder(actor, folder: str) -> None:
    try:
        actor.set_folder_path(folder)
    except Exception:
        pass


def _set_cesium_origin(lat: float, lon: float) -> None:
    if abs(lat) < 0.001 and abs(lon) < 0.001:
        return
    geo_class = None
    try:
        geo_class = unreal.load_class(None, "/Script/CesiumRuntime.CesiumGeoreference")
    except Exception:
        geo_class = None
    if not geo_class:
        unreal.log_warning(
            "Cesium not loaded — origin {} {} stored in JSON only.".format(lat, lon)
        )
        return
    eas = _actors()
    geo = None
    for actor in eas.get_all_level_actors():
        if actor.get_class() == geo_class:
            geo = actor
            break
    if geo is None:
        geo = eas.spawn_actor_from_class(geo_class, unreal.Vector(0, 0, 0))
    for name, value in (
        ("origin_latitude", lat),
        ("origin_longitude", lon),
        ("origin_height", 0.0),
    ):
        try:
            geo.set_editor_property(name, value)
        except Exception:
            pass
    unreal.log("Cesium origin set to {}, {}".format(lat, lon))


def _spawn_circuit_marker(points, label: str):
    """Marker actor at start; road ribbon is built from points directly."""
    eas = _actors()
    actor = eas.spawn_actor_from_class(unreal.Actor, _vec(points[0]))
    actor.set_actor_label(label)
    _set_folder(actor, "DriveAnywhere/Circuit")
    # Store point count on the label for humans; spline component APIs differ by UE version.
    return actor


def _build_road(points, mesh) -> None:
    if mesh is None:
        unreal.log_warning("No engine cube mesh — skipping asphalt ribbon.")
        return
    eas = _actors()
    n = len(points)
    for i in range(n):
        a = _vec(points[i])
        b = _vec(points[(i + 1) % n])
        delta = b - a
        length = delta.length()
        if length < 8.0:
            continue
        mid = (a + b) * 0.5
        mid.z = max(a.z, b.z) + ROAD_Z
        width = float(points[i].get("widthCm", 1400.0))
        rot = unreal.MathLibrary.find_look_at_rotation(a, b)
        scale = unreal.Vector(length / 100.0, width / 100.0, 0.16)
        actor = eas.spawn_actor_from_class(unreal.StaticMeshActor, mid, rot)
        actor.set_actor_label("Road_{:04d}".format(i))
        actor.set_actor_scale3d(scale)
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp is None:
            comp = actor.root_component
        comp.set_static_mesh(mesh)
        comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
        comp.set_collision_profile_name("BlockAll")
        _set_folder(actor, "DriveAnywhere/Road")


def _spawn_checkpoints(checkpoints) -> None:
    eas = _actors()
    for c in checkpoints:
        loc = unreal.Vector(float(c["x"]), float(c["y"]), float(c["z"]) + 80.0)
        actor = eas.spawn_actor_from_class(unreal.TriggerBox, loc)
        actor.set_actor_label("CP_{}".format(c.get("index", 0)))
        width = float(c.get("widthCm", 1700.0))
        actor.set_actor_scale3d(unreal.Vector(width / 200.0, 0.4, 2.0))
        _set_folder(actor, "DriveAnywhere/Checkpoints")


def _is_hero(name: str) -> bool:
    lower = name.lower()
    return any(tag in lower for tag in HERO_TAGS)


def _spawn_landmarks(landmarks) -> None:
    eas = _actors()
    for lm in landmarks:
        name = str(lm.get("name") or "Landmark")
        loc = unreal.Vector(float(lm["x"]), float(lm["y"]), float(lm.get("z") or 0.0))
        actor = eas.spawn_actor_from_class(unreal.Note, loc)
        tag = "Hero" if _is_hero(name) else "Landmark"
        actor.set_actor_label("{}_{}".format(tag, name))
        _set_folder(actor, "DriveAnywhere/Landmarks")
        try:
            if hasattr(actor, "text"):
                actor.set_editor_property("text", name)
        except Exception:
            pass


def import_circuit(slug: str, save: bool = True) -> str:
    data = _load_json(os.path.join(export_dir(), "circuits", "{}.json".format(slug)))
    map_name = _slug_to_map(slug)
    _ensure_folder("/Game/DriveAnywhere")
    _ensure_folder("/Game/DriveAnywhere/Maps")
    map_path = "/Game/DriveAnywhere/Maps/{}".format(map_name)

    unreal.log(
        "DriveAnywhere: building {} ({} points)".format(
            map_name, len(data.get("splinePoints") or [])
        )
    )
    levels = _levels()
    if unreal.EditorAssetLibrary.does_asset_exist(map_path):
        unreal.log("DriveAnywhere: clearing existing {}".format(map_path))
        levels.load_level(map_path)
        eas = _actors()
        for actor in list(eas.get_all_level_actors()):
            try:
                eas.destroy_actor(actor)
            except Exception:
                pass
    else:
        levels.new_level(map_path)

    points = data.get("splinePoints") or []
    if not points:
        raise RuntimeError("No splinePoints in {}".format(slug))

    _spawn_circuit_marker(points, "Circuit_{}".format(slug))
    _build_road(points, _try_load_mesh())
    _spawn_checkpoints(data.get("checkpoints") or [])
    _spawn_landmarks(data.get("namedLandmarks") or [])

    wgs = data.get("wgs84") or {}
    _set_cesium_origin(float(wgs.get("latitude") or 0), float(wgs.get("longitude") or 0))

    if save:
        levels.save_current_level()
        unreal.log("Saved {}".format(map_path))
    return map_path


def import_all():
    manifest = _load_json(os.path.join(export_dir(), "manifest.json"))
    built = []
    slugs = [c["slug"] for c in manifest["circuits"]]
    if "westminster-sprint" in slugs:
        slugs = ["westminster-sprint"] + [s for s in slugs if s != "westminster-sprint"]
    for slug in slugs:
        built.append(import_circuit(slug, save=True))
    unreal.log("DriveAnywhere: imported {} maps".format(len(built)))
    return built


if __name__ == "__main__":
    import_all()
