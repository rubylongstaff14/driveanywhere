"""Hard fix: kill lighting-rebuild nag + make scene/play clearly visible.

- Force No Precomputed Lighting on every map
- Every road/building/prop → Movable (no lightmaps)
- One bright sun + skylight + sky dome (no competing directionals)
- Emissive-boosted asphalt / buildings so Lit mode never goes black
- PlayerStart facing down track + chase viewpoint
"""

from __future__ import annotations

import json
import math
import os
import re
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
MAT_DIR = "/Game/DriveAnywhere/Materials"
BLD_MAT = "/Game/DriveAnywhere/Materials/Buildings"


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "playable-fix-status.json",
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


def _tools():
    return unreal.AssetToolsHelpers.get_asset_tools()


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _folder(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _set_movable(actor):
    mov = unreal.ComponentMobility.MOVABLE
    try:
        if actor.root_component:
            actor.root_component.set_editor_property("mobility", mov)
    except Exception:
        pass
    for comp in actor.get_components_by_class(unreal.SceneComponent):
        try:
            comp.set_editor_property("mobility", mov)
        except Exception:
            pass


def _make_mat(name, folder, color, emissive, rough=0.85, metallic=0.0, unlit=False):
    full = "{}/{}".format(folder, name)
    _folder(folder)
    if unreal.EditorAssetLibrary.does_asset_exist(full):
        mat = unreal.EditorAssetLibrary.load_asset(full)
    else:
        mat = _tools().create_asset(name, folder, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
    if unlit:
        try:
            mat.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
        except Exception:
            pass
    base = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 0
    )
    base.set_editor_property("constant", color)
    unreal.MaterialEditingLibrary.connect_material_property(
        base, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    em = unreal.MaterialEditingLibrary.create_material_expression(
        mat, unreal.MaterialExpressionConstant3Vector, -400, 180
    )
    em.set_editor_property("constant", emissive)
    unreal.MaterialEditingLibrary.connect_material_property(
        em, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )
    if not unlit:
        r = unreal.MaterialEditingLibrary.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -400, 320
        )
        r.set_editor_property("r", rough)
        unreal.MaterialEditingLibrary.connect_material_property(
            r, "", unreal.MaterialProperty.MP_ROUGHNESS
        )
        if metallic > 0.01:
            m = unreal.MaterialEditingLibrary.create_material_expression(
                mat, unreal.MaterialExpressionConstant, -400, 400
            )
            m.set_editor_property("r", metallic)
            unreal.MaterialEditingLibrary.connect_material_property(
                m, "", unreal.MaterialProperty.MP_METALLIC
            )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(full)
    return mat


def _ensure_mats():
    # Stronger emissive so surfaces read without baked lighting
    return {
        "asphalt": _make_mat(
            "M_Asphalt",
            MAT_DIR,
            unreal.LinearColor(0.05, 0.05, 0.055, 1),
            unreal.LinearColor(0.04, 0.04, 0.045, 1),
            0.95,
        ),
        "ground": _make_mat(
            "M_Ground",
            MAT_DIR,
            unreal.LinearColor(0.12, 0.14, 0.09, 1),
            unreal.LinearColor(0.05, 0.06, 0.03, 1),
            0.97,
        ),
        "sky": _make_mat(
            "M_SkyDome",
            MAT_DIR,
            unreal.LinearColor(0.45, 0.65, 1.0, 1),
            unreal.LinearColor(0.55, 0.72, 1.1, 1),
            unlit=True,
        ),
        "car": _make_mat(
            "M_CarBody",
            MAT_DIR,
            unreal.LinearColor(0.75, 0.02, 0.05, 1),
            unreal.LinearColor(0.2, 0.01, 0.02, 1),
            0.25,
            0.4,
        ),
        "line": _make_mat(
            "M_CenterLine",
            MAT_DIR,
            unreal.LinearColor(1.0, 0.92, 0.15, 1),
            unreal.LinearColor(0.4, 0.35, 0.05, 1),
            0.5,
        ),
        "stone": _make_mat(
            "M_Bld_Stone",
            BLD_MAT,
            unreal.LinearColor(0.5, 0.47, 0.42, 1),
            unreal.LinearColor(0.06, 0.055, 0.05, 1),
        ),
        "brick": _make_mat(
            "M_Bld_Brick",
            BLD_MAT,
            unreal.LinearColor(0.4, 0.2, 0.14, 1),
            unreal.LinearColor(0.05, 0.02, 0.015, 1),
        ),
        "glass": _make_mat(
            "M_Bld_Glass",
            BLD_MAT,
            unreal.LinearColor(0.15, 0.28, 0.4, 1),
            unreal.LinearColor(0.12, 0.2, 0.3, 1),
            0.15,
            0.6,
        ),
        "concrete": _make_mat(
            "M_Bld_Concrete",
            BLD_MAT,
            unreal.LinearColor(0.58, 0.58, 0.55, 1),
            unreal.LinearColor(0.06, 0.06, 0.055, 1),
        ),
        "dark": _make_mat(
            "M_Bld_Dark",
            BLD_MAT,
            unreal.LinearColor(0.12, 0.13, 0.15, 1),
            unreal.LinearColor(0.03, 0.035, 0.04, 1),
            0.5,
            0.2,
        ),
        "white": _make_mat(
            "M_Bld_White",
            BLD_MAT,
            unreal.LinearColor(0.88, 0.88, 0.9, 1),
            unreal.LinearColor(0.1, 0.1, 0.11, 1),
        ),
        "window": _make_mat(
            "M_WindowLit",
            BLD_MAT,
            unreal.LinearColor(0.5, 0.65, 0.85, 1),
            unreal.LinearColor(0.6, 0.75, 1.0, 1),
            0.2,
            0.3,
        ),
        "lamp": _make_mat(
            "M_StreetLamp",
            BLD_MAT,
            unreal.LinearColor(1.0, 0.9, 0.6, 1),
            unreal.LinearColor(3.0, 2.5, 1.2, 1),
            unlit=True,
        ),
        "sidewalk": _make_mat(
            "M_Sidewalk",
            MAT_DIR,
            unreal.LinearColor(0.4, 0.4, 0.38, 1),
            unreal.LinearColor(0.05, 0.05, 0.045, 1),
        ),
    }


def _kill_da_lights():
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        cls = ""
        try:
            cls = a.get_class().get_name()
        except Exception:
            pass
        if lab.startswith("DA_Sun") or lab.startswith("DA_Fill") or lab.startswith("DA_Sky") or lab.startswith(
            "DA_Fog"
        ) or lab.startswith("DA_Post") or lab.startswith("DA_Ambient") or lab.startswith("DA_SkyDome"):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass
        elif "DirectionalLight" in cls and lab.startswith("DA_"):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass


def _roads():
    roads = [a for a in _actors().get_all_level_actors() if _label(a).startswith("Road_")]

    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    roads.sort(key=key)
    return roads


def _center(roads):
    t = unreal.Vector(0, 0, 0)
    for a in roads:
        t = t + a.get_actor_location()
    return t / float(max(len(roads), 1))


def _world_no_bake():
    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        for prop in ("force_no_precomputed_lighting", "b_force_no_precomputed_lighting"):
            try:
                ws.set_editor_property(prop, True)
            except Exception:
                pass
        # Hide "lighting needs rebuild" by treating level as dynamic-only
        try:
            ws.set_editor_property("lightmass_settings", ws.get_editor_property("lightmass_settings"))
        except Exception:
            pass
    except Exception as exc:
        unreal.log_warning("world settings: {}".format(exc))


def _make_all_movable():
    n = 0
    for a in _actors().get_all_level_actors():
        lab = _label(a)
        cls = ""
        try:
            cls = a.get_class().get_name()
        except Exception:
            pass
        if (
            lab.startswith("Road_")
            or lab.startswith("Bld_")
            or lab.startswith("DA_")
            or lab.startswith("CP_")
            or "StaticMesh" in cls
            or "Light" in cls
        ):
            _set_movable(a)
            n += 1
    return n


def _install_lights(center, sky_mat):
    _kill_da_lights()
    eas = _actors()
    mov = unreal.ComponentMobility.MOVABLE

    sun = eas.spawn_actor_from_class(
        unreal.DirectionalLight, center + unreal.Vector(0, 0, 30000)
    )
    sun.set_actor_label("DA_Sun")
    _set_movable(sun)
    try:
        sun.set_actor_rotation(pitch_yaw(-35.0, 40.0, 0.0), False)
    except Exception:
        pass
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if lc:
        try:
            lc.set_editor_property("mobility", mov)
            lc.set_intensity(20.0)
            lc.set_editor_property("atmosphere_sun_light", True)
            lc.set_editor_property("cast_shadows", False)  # avoid black VSM slabs
            lc.set_editor_property("forward_shading_priority", 0)
            lc.set_editor_property("light_color", unreal.Color(255, 248, 235, 255))
        except Exception:
            try:
                lc.set_intensity(20.0)
                lc.set_editor_property("cast_shadows", False)
            except Exception:
                pass

    sk = eas.spawn_actor_from_class(unreal.SkyLight, center + unreal.Vector(0, 0, 25000))
    sk.set_actor_label("DA_SkyLight")
    _set_movable(sk)
    sc = sk.get_component_by_class(unreal.SkyLightComponent)
    if sc:
        try:
            sc.set_editor_property("mobility", mov)
            sc.set_editor_property("real_time_capture", True)
            sc.set_intensity(8.0)
            sc.set_editor_property("lower_hemisphere_is_black", False)
            sc.set_editor_property(
                "lower_hemisphere_color", unreal.LinearColor(0.35, 0.38, 0.42, 1)
            )
            sc.set_editor_property("cast_shadow", False)
        except Exception:
            pass

    try:
        atm = eas.spawn_actor_from_class(unreal.SkyAtmosphere, center)
        atm.set_actor_label("DA_Sky")
    except Exception:
        pass

    try:
        fog = eas.spawn_actor_from_class(
            unreal.ExponentialHeightFog, center + unreal.Vector(0, 0, 50)
        )
        fog.set_actor_label("DA_Fog")
        fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
        if fc:
            fc.set_editor_property("fog_density", 0.003)
            fc.set_editor_property(
                "fog_inscattering_color", unreal.LinearColor(0.6, 0.7, 0.9, 1)
            )
    except Exception:
        pass

    sphere = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")
    if sphere and sky_mat:
        dome = eas.spawn_actor_from_class(unreal.StaticMeshActor, center)
        dome.set_actor_label("DA_SkyDome")
        try:
            dome.set_actor_scale3d(unreal.Vector(1200.0, 1200.0, 1200.0))
        except Exception:
            pass
        _set_movable(dome)
        comp = dome.get_component_by_class(unreal.StaticMeshComponent)
        if comp:
            comp.set_static_mesh(sphere)
            comp.set_material(0, sky_mat)
            comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
            try:
                comp.set_editor_property("cast_shadow", False)
                comp.set_editor_property("reverse_culling", True)
            except Exception:
                pass

    try:
        pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, center)
        pp.set_actor_label("DA_Post")
        pp.set_editor_property("unbound", True)
        pp.set_editor_property("priority", 200.0)
        settings = pp.get_editor_property("settings")
        try:
            settings.set_editor_property(
                "auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL
            )
            settings.set_editor_property("override_auto_exposure_method", True)
            settings.set_editor_property("auto_exposure_bias", 6.0)
            settings.set_editor_property("override_auto_exposure_bias", True)
        except Exception:
            pass
        try:
            settings.set_editor_property("bloom_intensity", 0.0)
            settings.set_editor_property("override_bloom_intensity", True)
        except Exception:
            pass
        pp.set_editor_property("settings", settings)
    except Exception:
        pass


def _repaint(mats):
    painted = 0
    for a in _actors().get_all_level_actors():
        lab = _label(a)
        comp = a.get_component_by_class(unreal.StaticMeshComponent)
        if not comp:
            continue
        mat = None
        if lab.startswith("Road_"):
            mat = mats["asphalt"]
        elif lab.startswith("DA_Ground"):
            mat = mats["ground"]
        elif lab.startswith("DA_Line_") or lab.startswith("DA_Walk_"):
            mat = mats["sidewalk"] if "Walk" in lab else mats["line"]
        elif lab.startswith("Bld_Win_"):
            mat = mats["window"]
        elif "Lamp" in lab and "Head" in lab:
            mat = mats["lamp"]
        elif lab.startswith("Bld_"):
            # keep existing variety but ensure emissive family
            if "Glass" in lab or "_Body" in lab:
                cur = None
                try:
                    cur = comp.get_material(0)
                except Exception:
                    pass
                name = str(cur.get_name()) if cur else ""
                if "Glass" in name:
                    mat = mats["glass"]
                elif "Brick" in name:
                    mat = mats["brick"]
                elif "Dark" in name:
                    mat = mats["dark"]
                elif "White" in name:
                    mat = mats["white"]
                elif "Concrete" in name:
                    mat = mats["concrete"]
                else:
                    mat = mats["stone"]
        if mat:
            comp.set_material(0, mat)
            painted += 1
    return painted


def _fix_start_and_cam(roads):
    for a in list(_actors().get_all_level_actors()):
        if _label(a) == "DA_PlayerStart":
            try:
                _actors().destroy_actor(a)
            except Exception:
                pass
    if len(roads) < 2:
        return
    p0 = roads[0].get_actor_location()
    p1 = roads[1].get_actor_location()
    d = p1 - p0
    length = d.length() or 1.0
    forward = d / length
    yaw = math.degrees(math.atan2(forward.y, forward.x))
    loc = unreal.Vector(p0.x, p0.y, p0.z + 180.0)
    rot = yaw_rot(yaw)
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")

    cam = p0 - forward * 12000.0 + unreal.Vector(0, 0, 4500.0)
    target = p0 + forward * 6000.0
    look = unreal.MathLibrary.find_look_at_rotation(cam, target)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        pass


def _retune_racer(mats):
    path = "/Game/DriveAnywhere/BP_DARacer"
    if not unreal.EditorAssetLibrary.does_asset_exist(path):
        return
    bp = unreal.EditorAssetLibrary.load_asset(path)
    try:
        cdo = unreal.get_default_object(bp.generated_class())
        move = cdo.get_component_by_class(unreal.FloatingPawnMovement)
        if move:
            move.set_editor_property("max_speed", 4500.0)
            move.set_editor_property("acceleration", 18000.0)
            move.set_editor_property("deceleration", 10000.0)
            move.set_editor_property("turning_boost", 14.0)
        mesh = None
        try:
            mesh = cdo.get_editor_property("mesh_component")
        except Exception:
            pass
        cube = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
        if mesh and cube:
            mesh.set_static_mesh(cube)
            mesh.set_relative_scale3d(unreal.Vector(4.2, 1.8, 0.7))
            mesh.set_material(0, mats["car"])
            mesh.set_relative_location(unreal.Vector(0, 0, -10))
        boom = cdo.get_component_by_class(unreal.SpringArmComponent)
        if boom:
            boom.set_editor_property("target_arm_length", 1000.0)
            boom.set_editor_property("b_use_pawn_control_rotation", True)
            try:
                boom.set_relative_rotation(pitch_yaw(-15.0, 0.0, 0.0))
                boom.set_relative_location(unreal.Vector(0, 0, 100))
            except Exception:
                pass
        unreal.EditorAssetLibrary.save_asset(path)
    except Exception as exc:
        unreal.log_warning("racer retune: {}".format(exc))


def _fix_map(path, mats):
    _levels().load_level(path)
    _world_no_bake()
    movable = _make_all_movable()
    roads = _roads()
    center = _center(roads) if roads else unreal.Vector(0, 0, 0)
    _install_lights(center, mats["sky"])
    painted = _repaint(mats)
    _fix_start_and_cam(roads)
    _make_all_movable()  # again after new lights
    _levels().save_current_level()
    unreal.log(
        "Playable fix {}: roads={} movable={} painted={}".format(
            path, len(roads), movable, painted
        )
    )
    return {"map": path, "roads": len(roads), "movable": movable, "painted": painted}


def main():
    unreal.log("DriveAnywhere: HARD playable + lighting fix…")
    _write({"state": "running"})
    try:
        mats = _ensure_mats()
        _retune_racer(mats)
        assets = unreal.AssetRegistryHelpers.get_asset_registry().get_assets_by_path(
            MAPS, recursive=False
        )
        maps = [
            "{}/{}".format(MAPS, a.asset_name)
            for a in assets
            if str(a.asset_name).startswith("MAP_")
        ]
        maps.sort(key=lambda p: (0 if "Westminster" in p else 1, p))
        results = [_fix_map(m, mats) for m in maps]
        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            _fix_start_and_cam(_roads())
            _levels().save_current_level()
        _write({"state": "ok", "results": results})
        unreal.log("DriveAnywhere: lighting rebuild should be gone. Alt+P to drive.")
    except Exception as exc:
        _write({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        raise


main()
