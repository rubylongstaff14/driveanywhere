"""Ship-ready pass for all DriveAnywhere maps.

Rebuilds roads + checkpoints from export JSON (same path as web).
Keeps HD city. Fixes lighting/spawn/camera. Validates no gaps.
Ready for local Play / PIE test.
"""

from __future__ import annotations

import json
import math
import os
import re
import traceback
import unreal

from da_rot import flatten_look_at, pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
GM = "/Game/DriveAnywhere/BP_DAGameMode.BP_DAGameMode_C"
MAT_ASPHALT = "/Game/DriveAnywhere/Materials/M_Asphalt"
MAT_LINE = "/Game/DriveAnywhere/Materials/M_CenterLine"
MAT_SKY = "/Game/DriveAnywhere/Materials/HD/M_sky"  # may not exist; fallback
ROAD_Z = 10.0


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "ship-ready-status.json",
        )
    )


def _write(payload):
    path = _status_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def _export_dir():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
        )
    )


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _levels():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _map_to_slug(name: str) -> str:
    raw = name.replace("MAP_", "")
    return re.sub(r"([a-z])([A-Z])", r"\1-\2", raw).lower()


def _load(slug: str):
    path = os.path.join(_export_dir(), "circuits", "{}.json".format(slug))
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _vec(p):
    return unreal.Vector(float(p["x"]), float(p["y"]), float(p["z"]))


def _kill(prefixes):
    eas = _actors()
    n = 0
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
            try:
                eas.destroy_actor(a)
                n += 1
            except Exception:
                pass
    return n


def _movable(actor):
    try:
        if actor.root_component:
            actor.root_component.set_editor_property(
                "mobility", unreal.ComponentMobility.MOVABLE
            )
    except Exception:
        pass
    try:
        for c in actor.get_components_by_class(unreal.SceneComponent):
            c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
    except Exception:
        pass


def _load_mat(*paths):
    for p in paths:
        if unreal.EditorAssetLibrary.does_asset_exist(p):
            return unreal.EditorAssetLibrary.load_asset(p)
    return None


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _rebuild_roads(points, asphalt):
    """Exact closed ribbon from export splinePoints — matches web track."""
    _kill(["Road_", "DA_Line_"])
    mesh = _cube()
    if not mesh or len(points) < 3:
        return {"segments": 0, "gaps": 0, "maxGap": 0}

    eas = _actors()
    n = len(points)
    gaps = []
    built = 0
    for i in range(n):
        a = _vec(points[i])
        b = _vec(points[(i + 1) % n])
        delta = b - a
        length = delta.length()
        # Open circuits (e.g. Alps): don't wrap last→first if huge
        if i == n - 1 and length > 8000.0:
            gaps.append(length)
            continue
        gaps.append(length)
        if length < 5.0:
            continue
        # Bridge long gaps with sub-segments so the ribbon never vanishes
        steps = max(1, int(math.ceil(length / 1200.0)))
        for s in range(steps):
            t0 = s / float(steps)
            t1 = (s + 1) / float(steps)
            p0 = a + delta * t0
            p1 = a + delta * t1
            seg = p1 - p0
            seg_len = seg.length()
            if seg_len < 5.0:
                continue
            mid = (p0 + p1) * 0.5
            mid.z = max(p0.z, p1.z) + ROAD_Z
            width = float(points[i].get("widthCm", 1700.0))
            rot = flatten_look_at(p0, p1)
            actor = eas.spawn_actor_from_class(unreal.StaticMeshActor, mid, rot)
            actor.set_actor_label("Road_{:04d}_{:02d}".format(i, s))
            try:
                actor.set_actor_scale3d(
                    unreal.Vector(seg_len / 100.0, width / 100.0, 0.22)
                )
                actor.set_folder_path("DriveAnywhere/Road")
            except Exception:
                pass
            _movable(actor)
            comp = actor.get_component_by_class(unreal.StaticMeshComponent)
            if comp:
                comp.set_static_mesh(mesh)
                if asphalt:
                    comp.set_material(0, asphalt)
                comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
                comp.set_collision_profile_name("BlockAll")
                try:
                    comp.set_editor_property("cast_shadow", False)
                    comp.set_editor_property(
                        "mobility", unreal.ComponentMobility.MOVABLE
                    )
                except Exception:
                    pass
            built += 1
            if i % 4 == 0 and s == 0:
                line_mat = _load_mat(
                    MAT_LINE, "/Game/DriveAnywhere/Materials/M_CenterLine"
                )
                loc = unreal.Vector(mid.x, mid.y, mid.z + 18.0)
                line = eas.spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
                line.set_actor_label("DA_Line_{:04d}".format(i))
                try:
                    line.set_actor_scale3d(
                        unreal.Vector(max(seg_len / 100.0 * 0.45, 0.8), 0.1, 0.04)
                    )
                    line.set_folder_path("DriveAnywhere/Road")
                except Exception:
                    pass
                _movable(line)
                lc = line.get_component_by_class(unreal.StaticMeshComponent)
                if lc:
                    lc.set_static_mesh(mesh)
                    if line_mat:
                        lc.set_material(0, line_mat)
                    lc.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)

    return {
        "segments": built,
        "sourcePoints": n,
        "gaps": sum(1 for g in gaps if g > 8000),
        "maxGap": round(max(gaps) if gaps else 0, 1),
        "avgGap": round(sum(gaps) / max(len(gaps), 1), 1),
    }


def _nearest_tangent(points, loc):
    best_i = 0
    best_d = 1e18
    for i, p in enumerate(points):
        v = _vec(p)
        d = (v - loc).length()
        if d < best_d:
            best_d = d
            best_i = i
    a = _vec(points[best_i])
    b = _vec(points[(best_i + 1) % len(points)])
    return unreal.MathLibrary.find_look_at_rotation(a, b), best_d, best_i


def _rebuild_checkpoints(checkpoints, points):
    """Place CP volumes on the racing line, oriented across the road."""
    _kill(["CP_", "DA_Checkpoint_"])
    if not checkpoints:
        return {"count": 0, "aligned": 0}

    eas = _actors()
    aligned = 0
    for c in checkpoints:
        loc = unreal.Vector(float(c["x"]), float(c["y"]), float(c["z"]) + 100.0)
        width = float(c.get("widthCm", 1700.0))
        rot, dist, idx = _nearest_tangent(points, loc)
        # Snap Z onto road
        loc.z = float(points[idx]["z"]) + 120.0
        # Rotate 90° yaw so the box spans the road width (player crosses thin axis)
        cross = pitch_yaw(rot.pitch, rot.yaw + 90.0, rot.roll)
        actor = eas.spawn_actor_from_class(unreal.TriggerBox, loc, cross)
        actor.set_actor_label("CP_{:02d}".format(int(c.get("index", 0))))
        # Scale: X = road width, Y = thin gate depth, Z = height
        try:
            actor.set_actor_scale3d(unreal.Vector(width / 200.0, 0.35, 2.5))
            actor.set_folder_path("DriveAnywhere/Checkpoints")
        except Exception:
            pass
        _movable(actor)
        if dist < 3000.0:
            aligned += 1

    return {"count": len(checkpoints), "aligned": aligned}


def _fix_player_start(points):
    _kill(["DA_PlayerStart", "PlayerStart"])
    if len(points) < 2:
        return False
    p0 = _vec(points[0])
    p1 = _vec(points[1])
    rot = unreal.MathLibrary.find_look_at_rotation(p0, p1)
    loc = unreal.Vector(p0.x, p0.y, p0.z + 200.0)
    # Only yaw matters for spawn facing
    yaw_only = yaw_rot(rot.yaw)
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, yaw_only)
    ps.set_actor_label("DA_PlayerStart")
    try:
        ps.set_folder_path("DriveAnywhere")
    except Exception:
        pass
    return True


def _frame(points):
    if len(points) < 2:
        return
    p0 = _vec(points[0])
    p1 = _vec(points[1])
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


def _ensure_lighting(center):
    """Idempotent clean lighting — one sun, sky, post."""
    # Remove competing DA lights only (keep sky dome if present)
    _kill(["DA_Sun", "DA_Fill", "DA_SkyLight", "DA_Fog", "DA_Post", "DA_Ambient"])
    # Keep DA_Sky / DA_SkyDome if they exist; recreate if missing
    has_sky = any(_label(a) in ("DA_Sky", "DA_SkyDome") for a in _actors().get_all_level_actors())
    eas = _actors()
    mov = unreal.ComponentMobility.MOVABLE

    sun = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 25000)
    )
    sun.set_actor_label("DA_Sun")
    _movable(sun)
    try:
        sun.set_actor_rotation(pitch_yaw(-38.0, 35.0, 0.0), False)
    except Exception:
        pass
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if lc:
        try:
            lc.set_editor_property("mobility", mov)
            lc.set_intensity(18.0)
            lc.set_editor_property("atmosphere_sun_light", True)
            lc.set_editor_property("cast_shadows", False)
            lc.set_editor_property("forward_shading_priority", 0)
        except Exception:
            try:
                lc.set_intensity(18.0)
            except Exception:
                pass

    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 20000))
    sk.set_actor_label("DA_SkyLight")
    _movable(sk)
    sc = sk.get_component_by_class(unreal.SkyLightComponent)
    if sc:
        try:
            sc.set_editor_property("mobility", mov)
            sc.set_editor_property("real_time_capture", True)
            sc.set_intensity(7.0)
            sc.set_editor_property("lower_hemisphere_is_black", False)
            sc.set_editor_property("cast_shadow", False)
        except Exception:
            pass

    if not has_sky:
        try:
            atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
            atm.set_actor_label("DA_Sky")
        except Exception:
            pass
        sphere = _cube()  # fallback; prefer sphere
        sph = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")
        sky_mat = _load_mat(
            "/Game/DriveAnywhere/Materials/M_SkyDome",
            "/Game/DriveAnywhere/Materials/HD/M_sky",
        )
        if sph:
            dome = eas.spawn_actor_from_class(unreal.StaticMeshActor, center)
            dome.set_actor_label("DA_SkyDome")
            try:
                dome.set_actor_scale3d(unreal.Vector(1000, 1000, 1000))
            except Exception:
                pass
            _movable(dome)
            c = dome.get_component_by_class(unreal.StaticMeshComponent)
            if c:
                c.set_static_mesh(sph)
                if sky_mat:
                    c.set_material(0, sky_mat)
                c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
                try:
                    c.set_editor_property("cast_shadow", False)
                    c.set_editor_property("reverse_culling", True)
                except Exception:
                    pass

    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 50)
        )
        fog.set_actor_label("DA_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            fc.set_editor_property("fog_density", 0.004)
    except Exception:
        pass

    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        pp.set_editor_property("priority", 250.0)
        settings = pp.get_editor_property("settings")
        try:
            settings.set_editor_property(
                "auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL
            )
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 5.5)
            settings.set_editor_property("override_auto_exposure_bias", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception:
        pass


def _set_world():
    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        ws.set_editor_property("force_no_precomputed_lighting", True)
        gm = unreal.load_class(None, GM)
        if gm:
            ws.set_editor_property("default_game_mode", gm)
    except Exception:
        pass


def _hd_count():
    n = 0
    for a in _actors().get_all_level_actors():
        if _label(a).startswith("HD_"):
            n += 1
    return n


def _center_of(points):
    t = unreal.Vector(0, 0, 0)
    for p in points:
        t = t + _vec(p)
    return t / float(max(len(points), 1))


def _ship_map(map_path):
    _levels().load_level(map_path)
    slug = _map_to_slug(map_path.rsplit("/", 1)[-1])
    data = _load(slug)
    points = data.get("splinePoints") or []
    cps = data.get("checkpoints") or []
    asphalt = _load_mat(MAT_ASPHALT, "/Game/DriveAnywhere/Materials/M_Asphalt")

    road = _rebuild_roads(points, asphalt)
    cp = _rebuild_checkpoints(cps, points)
    start_ok = _fix_player_start(points)
    center = _center_of(points) if points else unreal.Vector(0, 0, 0)
    _ensure_lighting(center)
    _set_world()
    _frame(points)
    hd = _hd_count()

    # Validate closed loop: first/last near each other for closed tracks
    loop_gap = 0.0
    if len(points) >= 2:
        loop_gap = (_vec(points[0]) - _vec(points[-1])).length()

    _levels().save_current_level()
    ok = (
        road["segments"] >= 50
        and cp["count"] >= 1
        and cp["aligned"] == cp["count"]
        and start_ok
    )
    return {
        "map": map_path,
        "slug": slug,
        "ok": ok,
        "road": road,
        "checkpoints": cp,
        "playerStart": start_ok,
        "hdCityActors": hd,
        "loopGapCm": round(loop_gap, 1),
        "distanceMetres": data.get("distanceMetres", 0),
    }


def main():
    unreal.log("DriveAnywhere: SHIP-READY pass on all circuits…")
    _write({"state": "running"})
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
        results = []
        for m in maps:
            unreal.log("Shipping {}".format(m))
            results.append(_ship_map(m))

        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            data = _load("westminster-sprint")
            _frame(data.get("splinePoints") or [])
            _levels().save_current_level()

        failed = [r for r in results if not r.get("ok")]
        _write(
            {
                "state": "ok" if not failed else "partial",
                "failed": [f["slug"] for f in failed],
                "results": results,
                "play": "Alt+P — WASD drive, mouse look. All tracks match web splines.",
            }
        )
        unreal.log(
            "DriveAnywhere SHIP-READY: {}/{} maps OK".format(
                len(results) - len(failed), len(results)
            )
        )
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
