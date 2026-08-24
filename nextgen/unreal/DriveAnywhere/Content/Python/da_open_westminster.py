"""Open Westminster and frame the camera on the road ribbon."""

from __future__ import annotations

import unreal

MAP_PATH = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"


def main() -> None:
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if not unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
        unreal.log_error("Missing map {}. Run da_bootstrap.py first.".format(MAP_PATH))
        return

    levels.load_level(MAP_PATH)
    unreal.log("DriveAnywhere: loaded {}".format(MAP_PATH))

    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    roads = []
    for actor in eas.get_all_level_actors():
        label = ""
        try:
            label = actor.get_actor_label()
        except Exception:
            pass
        if label.startswith("Road_"):
            roads.append(actor)

    if not roads:
        unreal.log_warning("No Road_* actors found — map may be empty.")
        return

    # Average road position → look from above
    total = unreal.Vector(0, 0, 0)
    for actor in roads:
        total = total + actor.get_actor_location()
    center = total / float(len(roads))
    cam = unreal.Vector(center.x - 8000.0, center.y - 8000.0, center.z + 12000.0)
    look = unreal.MathLibrary.find_look_at_rotation(cam, center)

    try:
        ue = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        ue.set_level_viewport_camera_info(cam, look)
    except Exception:
        try:
            unreal.EditorLevelLibrary.set_level_viewport_camera_info(cam, look)
        except Exception as exc:
            unreal.log_warning("Could not move camera: {}".format(exc))

    unreal.log(
        "DriveAnywhere: {} road pieces. Camera framed on track. Press Play to look around.".format(
            len(roads)
        )
    )


main()
