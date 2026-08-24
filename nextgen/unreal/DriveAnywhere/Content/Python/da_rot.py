"""Unreal Rotator helpers — UE Python ctor is (roll, pitch, yaw), NOT (pitch, yaw, roll)."""

from __future__ import annotations

import unreal


def yaw_rot(yaw_deg: float = 0.0) -> unreal.Rotator:
    """World yaw only — buildings/props stand upright."""
    return unreal.Rotator(0.0, 0.0, float(yaw_deg))


def pitch_yaw(pitch_deg: float = 0.0, yaw_deg: float = 0.0, roll_deg: float = 0.0) -> unreal.Rotator:
    """Intentional pitch/yaw/roll using keyword-safe order."""
    return unreal.Rotator(float(roll_deg), float(pitch_deg), float(yaw_deg))


def flatten_look_at(from_loc: unreal.Vector, to_loc: unreal.Vector) -> unreal.Rotator:
    """Look-at but keep meshes flat on XY (no pitch from Z delta)."""
    look = unreal.MathLibrary.find_look_at_rotation(from_loc, to_loc)
    return unreal.Rotator(0.0, 0.0, float(look.yaw))
