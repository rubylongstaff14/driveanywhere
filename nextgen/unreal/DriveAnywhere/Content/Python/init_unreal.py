"""Startup: chase viewpoint + play reminder."""

from __future__ import annotations

import re
import unreal

_state = {"done": False}


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _roads():
    roads = []
    for a in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
        if _label(a).startswith("Road_"):
            roads.append(a)

    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    roads.sort(key=key)
    return roads


def _frame(_dt):
    if _state["done"]:
        return False
    roads = _roads()
    if len(roads) < 2:
        return True
    p0 = roads[0].get_actor_location()
    p1 = roads[1].get_actor_location()
    d = p1 - p0
    length = d.length() or 1.0
    forward = d / length
    cam = p0 - forward * 12000.0 + unreal.Vector(0, 0, 5000.0)
    target = p0 + forward * 7000.0
    look = unreal.MathLibrary.find_look_at_rotation(cam, target)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        pass
    unreal.log("========================================")
    unreal.log("DriveAnywhere READY FOR LOCAL TEST")
    unreal.log("Alt+P = Play | WASD | Mouse | Esc quit")
    unreal.log("========================================")
    _state["done"] = True
    return False


unreal.log("DriveAnywhere: ship-ready startup…")
try:
    unreal.register_slate_post_tick_callback(_frame)
except Exception:
    pass
