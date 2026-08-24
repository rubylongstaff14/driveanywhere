"""DriveAnywhere ADVANCE — chase cam, tuned driving, richer cities.

Run via UnrealEditor-Cmd -ExecutePythonScript=.../da_advance.py
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import traceback
import unreal

from da_rot import pitch_yaw, yaw_rot

MAPS = "/Game/DriveAnywhere/Maps"
CONTENT = "/Game/DriveAnywhere"
WEST = "/Game/DriveAnywhere/Maps/MAP_WestminsterSprint"
RACER = "/Game/DriveAnywhere/BP_DARacer"
GM = "/Game/DriveAnywhere/BP_DAGameMode"
MAT_DIR = "/Game/DriveAnywhere/Materials"
BLD_MAT = "/Game/DriveAnywhere/Materials/Buildings"

# Sports GT from chaos-vehicles.json (cm/s, arcade)
SPORTS = {
    "max_speed": 4470.0,  # ~161 km/h
    "accel": 16000.0,
    "decel": 9000.0,
    "length": 4.1,
    "width": 1.76,
    "height": 0.64,
}


def _status_path():
    return os.path.normpath(
        os.path.join(
            unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()),
            "..",
            "export",
            "advance-status.json",
        )
    )


def _write_status(payload):
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


def _tools():
    return unreal.AssetToolsHelpers.get_asset_tools()


def _folder(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def _label(a):
    try:
        return a.get_actor_label() or ""
    except Exception:
        return ""


def _make_mat(name, folder, color, rough=0.8, metallic=0.0, emissive=None, unlit=False):
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
    if emissive is not None:
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
                mat, unreal.MaterialExpressionConstant, -400, 420
            )
            m.set_editor_property("r", metallic)
            unreal.MaterialEditingLibrary.connect_material_property(
                m, "", unreal.MaterialProperty.MP_METALLIC
            )
    unreal.MaterialEditingLibrary.recompile_material(mat)
    unreal.EditorAssetLibrary.save_asset(full)
    return mat


def _ensure_mats():
    return {
        "asphalt": _make_mat(
            "M_Asphalt",
            MAT_DIR,
            unreal.LinearColor(0.03, 0.03, 0.035, 1),
            0.95,
            emissive=unreal.LinearColor(0.01, 0.01, 0.012, 1),
        ),
        "ground": _make_mat(
            "M_Ground",
            MAT_DIR,
            unreal.LinearColor(0.09, 0.11, 0.07, 1),
            0.97,
            emissive=unreal.LinearColor(0.015, 0.02, 0.01, 1),
        ),
        "car": _make_mat(
            "M_CarBody",
            MAT_DIR,
            unreal.LinearColor(0.7, 0.02, 0.05, 1),
            0.25,
            0.35,
            emissive=unreal.LinearColor(0.05, 0.0, 0.0, 1),
        ),
        "cabin": _make_mat(
            "M_CarCabin",
            MAT_DIR,
            unreal.LinearColor(0.05, 0.08, 0.12, 1),
            0.2,
            0.5,
        ),
        "wheel": _make_mat(
            "M_CarWheel",
            MAT_DIR,
            unreal.LinearColor(0.02, 0.02, 0.02, 1),
            0.9,
        ),
        "window": _make_mat(
            "M_WindowLit",
            BLD_MAT,
            unreal.LinearColor(0.4, 0.55, 0.7, 1),
            0.1,
            0.3,
            emissive=unreal.LinearColor(0.35, 0.45, 0.55, 1),
            unlit=False,
        ),
        "lamp": _make_mat(
            "M_StreetLamp",
            BLD_MAT,
            unreal.LinearColor(0.9, 0.85, 0.6, 1),
            0.3,
            emissive=unreal.LinearColor(2.0, 1.7, 1.0, 1),
            unlit=True,
        ),
        "sidewalk": _make_mat(
            "M_Sidewalk",
            MAT_DIR,
            unreal.LinearColor(0.35, 0.35, 0.33, 1),
            0.9,
        ),
        "line": _make_mat(
            "M_CenterLine",
            MAT_DIR,
            unreal.LinearColor(0.95, 0.9, 0.2, 1),
            0.5,
            emissive=unreal.LinearColor(0.15, 0.12, 0.02, 1),
        ),
        "stone": _make_mat("M_Bld_Stone", BLD_MAT, unreal.LinearColor(0.45, 0.42, 0.38, 1), 0.85),
        "brick": _make_mat("M_Bld_Brick", BLD_MAT, unreal.LinearColor(0.35, 0.18, 0.12, 1), 0.9),
        "glass": _make_mat(
            "M_Bld_Glass",
            BLD_MAT,
            unreal.LinearColor(0.12, 0.22, 0.32, 1),
            0.12,
            0.65,
            emissive=unreal.LinearColor(0.04, 0.08, 0.12, 1),
        ),
        "concrete": _make_mat(
            "M_Bld_Concrete", BLD_MAT, unreal.LinearColor(0.55, 0.55, 0.52, 1), 0.88
        ),
        "dark": _make_mat("M_Bld_Dark", BLD_MAT, unreal.LinearColor(0.08, 0.09, 0.11, 1), 0.5, 0.2),
        "white": _make_mat("M_Bld_White", BLD_MAT, unreal.LinearColor(0.85, 0.86, 0.88, 1), 0.55),
        "sand": _make_mat("M_Bld_Sand", BLD_MAT, unreal.LinearColor(0.72, 0.62, 0.42, 1), 0.92),
        "gold": _make_mat("M_Bld_Gold", BLD_MAT, unreal.LinearColor(0.65, 0.5, 0.2, 1), 0.35, 0.7),
        "red": _make_mat("M_Bld_Red", BLD_MAT, unreal.LinearColor(0.45, 0.08, 0.06, 1), 0.75),
        "sky": _make_mat(
            "M_SkyDome",
            MAT_DIR,
            unreal.LinearColor(0.4, 0.6, 0.95, 1),
            unlit=True,
            emissive=unreal.LinearColor(0.4, 0.6, 0.95, 1),
        ),
    }


def _cube():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")


def _cyl():
    return unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")


def _spawn_mesh(label, mesh, loc, scale, rot, mat, collide=True, folder="DriveAnywhere/City"):
    actor = _actors().spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    actor.set_actor_label(label)
    try:
        actor.set_actor_scale3d(scale)
    except Exception:
        pass
    try:
        actor.set_folder_path(folder)
        if actor.root_component:
            actor.root_component.set_editor_property(
                "mobility", unreal.ComponentMobility.MOVABLE
            )
    except Exception:
        pass
    comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if comp and mesh:
        comp.set_static_mesh(mesh)
        if mat:
            comp.set_material(0, mat)
        if collide:
            comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            comp.set_collision_profile_name("BlockAll")
        else:
            comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
        try:
            comp.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            comp.set_editor_property("cast_shadow", True)
        except Exception:
            pass
    return actor


def _add_bp_component(bp, parent_handle, cls, name, sds):
    """Add a component subobject to a Blueprint. Returns handle or None."""
    try:
        params = unreal.AddNewSubobjectParams()
        params.set_editor_property("parent_handle", parent_handle)
        params.set_editor_property("new_class", cls)
        # Some UE versions want blueprint asset on params
        try:
            params.set_editor_property("blueprint_context", bp)
        except Exception:
            pass
        result = sds.add_new_subobject(params)
        # result may be (handle, fail_reason) or handle
        if isinstance(result, tuple):
            handle, reason = result[0], result[1] if len(result) > 1 else ""
            if reason:
                unreal.log_warning("add {}: {}".format(name, reason))
            handle = result[0]
        else:
            handle = result
        if handle:
            try:
                sds.rename_subobject(handle, name)
            except Exception:
                try:
                    sds.rename_subobject(unreal.SubobjectDataHandle(handle), unreal.Name(name))
                except Exception:
                    pass
        return handle
    except Exception as exc:
        unreal.log_warning("add_bp_component {}: {}".format(name, exc))
        return None


def _upgrade_racer(mats):
    """Sports GT–tuned DefaultPawn + chase SpringArm camera."""
    _folder(CONTENT)
    # Recreate clean racer BP from DefaultPawn (has WASD built-in)
    if unreal.EditorAssetLibrary.does_asset_exist(RACER):
        # Keep asset; retune
        bp = unreal.EditorAssetLibrary.load_asset(RACER)
    else:
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.DefaultPawn)
        _tools().create_asset("BP_DARacer", CONTENT, None, factory)
        bp = unreal.EditorAssetLibrary.load_asset(RACER)

    # Ensure parent is DefaultPawn
    try:
        gen = bp.generated_class()
        cdo = unreal.get_default_object(gen)
    except Exception as exc:
        unreal.log_warning("racer CDO: {}".format(exc))
        return RACER + ".BP_DARacer_C"

    # Movement = Sports GT pace
    move = None
    try:
        move = cdo.get_component_by_class(unreal.FloatingPawnMovement)
    except Exception:
        pass
    if move is None:
        for prop in ("movement_component", "floating_pawn_movement"):
            try:
                move = cdo.get_editor_property(prop)
                if move:
                    break
            except Exception:
                pass
    if move:
        try:
            move.set_editor_property("max_speed", SPORTS["max_speed"])
            move.set_editor_property("acceleration", SPORTS["accel"])
            move.set_editor_property("deceleration", SPORTS["decel"])
            move.set_editor_property("turning_boost", 12.0)
        except Exception as exc:
            unreal.log_warning("move tune: {}".format(exc))

    # Body mesh
    cube = _cube()
    try:
        mesh = cdo.get_editor_property("mesh_component")
        if mesh and cube:
            mesh.set_static_mesh(cube)
            # chassis ~4.1 x 1.76 x 0.64 m → scale in UU (cm): cube=100cm
            mesh.set_relative_scale3d(
                unreal.Vector(SPORTS["length"] * 1.05, SPORTS["width"], SPORTS["height"])
            )
            mesh.set_material(0, mats["car"])
            mesh.set_relative_location(unreal.Vector(0, 0, -20))
    except Exception as exc:
        unreal.log_warning("mesh: {}".format(exc))

    # Chase camera via SubobjectData
    try:
        sds = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
        handles = sds.k2_gather_subobject_data_for_blueprint(bp)
        root = handles[0] if handles else None
        has_boom = False
        for h in handles:
            try:
                data = sds.get_data(h)
                n = str(data.get_variable_name())
                if "Boom" in n or "SpringArm" in n:
                    has_boom = True
            except Exception:
                pass
        if root and not has_boom:
            boom = _add_bp_component(bp, root, unreal.SpringArmComponent, "CameraBoom", sds)
            if boom:
                try:
                    data = sds.get_data(boom)
                    obj = data.get_object() if hasattr(data, "get_object") else None
                    # Prefer editing via CDO after compile
                except Exception:
                    pass
                cam = _add_bp_component(bp, boom, unreal.CameraComponent, "FollowCamera", sds)
                unreal.log("DriveAnywhere: chase CameraBoom + FollowCamera added")
        # Compile / save
        try:
            unreal.BlueprintEditorLibrary.compile_blueprint(bp)
        except Exception:
            pass
    except Exception as exc:
        unreal.log_warning("chase cam subobjects: {}".format(exc))

    # After compile, tune boom on CDO if present
    try:
        unreal.EditorAssetLibrary.save_asset(RACER)
        bp = unreal.EditorAssetLibrary.load_asset(RACER)
        cdo = unreal.get_default_object(bp.generated_class())
        boom = cdo.get_component_by_class(unreal.SpringArmComponent)
        if boom:
            boom.set_editor_property("target_arm_length", 900.0)
            boom.set_editor_property("b_use_pawn_control_rotation", True)
            boom.set_editor_property("b_do_collision_test", True)
            try:
                boom.set_relative_rotation(pitch_yaw(-12.0, 0.0, 0.0))
                boom.set_relative_location(unreal.Vector(0, 0, 80))
            except Exception:
                pass
        cam = cdo.get_component_by_class(unreal.CameraComponent)
        if cam:
            try:
                cam.set_editor_property("b_use_pawn_control_rotation", False)
                cam.set_field_of_view(80.0)
            except Exception:
                pass
        try:
            cdo.set_editor_property("base_eye_height", 60.0)
            cdo.set_editor_property("b_add_default_movement_bindings", True)
        except Exception:
            pass
    except Exception as exc:
        unreal.log_warning("boom tune: {}".format(exc))

    unreal.EditorAssetLibrary.save_asset(RACER)
    unreal.log("DriveAnywhere: BP_DARacer = Sports GT pace + chase cam")
    return RACER + ".BP_DARacer_C"


def _ensure_gm(racer_cls):
    if not unreal.EditorAssetLibrary.does_asset_exist(GM):
        factory = unreal.BlueprintFactory()
        factory.set_editor_property("parent_class", unreal.GameModeBase)
        _tools().create_asset("BP_DAGameMode", CONTENT, None, factory)
    bp = unreal.EditorAssetLibrary.load_asset(GM)
    try:
        cdo = unreal.get_default_object(bp.generated_class())
        racer = unreal.load_class(None, racer_cls)
        if racer:
            cdo.set_editor_property("default_pawn_class", racer)
        cdo.set_editor_property("player_controller_class", unreal.PlayerController.static_class())
        unreal.EditorAssetLibrary.save_asset(GM)
    except Exception as exc:
        unreal.log_warning("GM: {}".format(exc))
    return GM + ".BP_DAGameMode_C"


def _roads():
    out = []
    for a in _actors().get_all_level_actors():
        if _label(a).startswith("Road_"):
            out.append(a)
    # sort by label index
    def key(a):
        m = re.search(r"(\d+)", _label(a))
        return int(m.group(1)) if m else 0

    out.sort(key=key)
    return out


def _kill(prefixes):
    eas = _actors()
    for a in list(eas.get_all_level_actors()):
        lab = _label(a)
        if any(lab.startswith(p) for p in prefixes):
            try:
                eas.destroy_actor(a)
            except Exception:
                pass


def _road_dirs(roads):
    """List of (pos, tangent_yaw_deg, normal)."""
    info = []
    n = len(roads)
    for i, a in enumerate(roads):
        p = a.get_actor_location()
        nxt = roads[(i + 1) % n].get_actor_location()
        tx, ty = nxt.x - p.x, nxt.y - p.y
        length = math.sqrt(tx * tx + ty * ty) or 1.0
        tx, ty = tx / length, ty / length
        yaw = math.degrees(math.atan2(ty, tx))
        info.append((p, yaw, (-ty, tx)))
    return info


def _fix_player_start(roads):
    _kill(["DA_PlayerStart"])
    if len(roads) < 2:
        return None
    p0 = roads[0].get_actor_location()
    p1 = roads[1].get_actor_location()
    tx, ty = p1.x - p0.x, p1.y - p0.y
    yaw = math.degrees(math.atan2(ty, tx))
    loc = unreal.Vector(p0.x, p0.y, p0.z + 160.0)
    rot = yaw_rot(yaw)
    ps = _actors().spawn_actor_from_class(unreal.PlayerStart, loc, rot)
    ps.set_actor_label("DA_PlayerStart")
    try:
        ps.set_folder_path("DriveAnywhere")
    except Exception:
        pass
    return (loc, rot, unreal.Vector(tx, ty, 0))


def _frame_chase(roads):
    """Editor camera behind start, looking down the track — fixes wrong viewpoint."""
    if len(roads) < 2:
        return
    p0 = roads[0].get_actor_location()
    p1 = roads[1].get_actor_location()
    d = p1 - p0
    length = d.length() or 1.0
    forward = d / length
    # Behind and above the start line
    cam = p0 - forward * 14000.0 + unreal.Vector(0, 0, 5500.0)
    target = p0 + forward * 8000.0 + unreal.Vector(0, 0, 200.0)
    look = unreal.MathLibrary.find_look_at_rotation(cam, target)
    try:
        unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
            cam, look
        )
    except Exception:
        try:
            unreal.EditorLevelLibrary.set_level_viewport_camera_info(cam, look)
        except Exception:
            pass


def _paint_roads(roads, mat):
    for a in roads:
        comp = a.get_component_by_class(unreal.StaticMeshComponent)
        if comp and mat:
            comp.set_material(0, mat)


def _add_sidewalks(info, mats, rng):
    _kill(["DA_Walk_"])
    mesh = _cube()
    n = 0
    for i, (p, yaw, normal) in enumerate(info):
        if i % 2 != 0:
            continue
        for sign, tag in ((1.0, "L"), (-1.0, "R")):
            # Just outside road edge (~9m half-width + 2m)
            dist = 1100.0
            loc = unreal.Vector(
                p.x + normal[0] * dist * sign,
                p.y + normal[1] * dist * sign,
                p.z + 12.0,
            )
            _spawn_mesh(
                "DA_Walk_{}_{}".format(tag, i),
                mesh,
                loc,
                unreal.Vector(3.5, 1.4, 0.12),
                yaw_rot(yaw),
                mats["sidewalk"],
                collide=True,
                folder="DriveAnywhere/Streets",
            )
            n += 1
    return n


def _add_street_lamps(info, mats, rng):
    _kill(["DA_Lamp_"])
    mesh = _cube()
    n = 0
    for i, (p, yaw, normal) in enumerate(info):
        if i % 5 != 0:
            continue
        for sign, tag in ((1.0, "L"), (-1.0, "R")):
            if rng.random() < 0.25:
                continue
            dist = 1300.0
            base = unreal.Vector(
                p.x + normal[0] * dist * sign,
                p.y + normal[1] * dist * sign,
                p.z,
            )
            # Pole
            _spawn_mesh(
                "DA_Lamp_{}_{}_Pole".format(tag, i),
                mesh,
                base + unreal.Vector(0, 0, 350),
                unreal.Vector(0.12, 0.12, 7.0),
                yaw_rot(yaw),
                mats["dark"],
                collide=False,
                folder="DriveAnywhere/Streets",
            )
            # Glow head
            _spawn_mesh(
                "DA_Lamp_{}_{}_Head".format(tag, i),
                mesh,
                base + unreal.Vector(0, 0, 720),
                unreal.Vector(0.5, 0.5, 0.35),
                yaw_rot(yaw),
                mats["lamp"],
                collide=False,
                folder="DriveAnywhere/Streets",
            )
            n += 1
    return n


def _add_windows_on_building(cx, cy, cz, w, d, h_cm, yaw, mats, rng, tag):
    """Emissive window grid on the long faces."""
    mesh = _cube()
    h = h_cm
    floors = max(3, int(h / 350.0))
    cols = max(2, int(max(w, d) / 2.5))
    count = 0
    # Front face along +local Y roughly
    for fi in range(1, floors):
        fz = cz - h * 0.5 + (fi + 0.5) * (h / floors)
        for ci in range(cols):
            if rng.random() < 0.2:
                continue  # some dark windows
            # Position across width
            t = (ci + 0.5) / cols - 0.5
            # Front
            rad = math.radians(yaw)
            fx = cx + math.cos(rad) * (d * 50.0 * 0.52) + math.sin(rad) * t * w * 100.0 * 0.85
            fy = cy + math.sin(rad) * (d * 50.0 * 0.52) - math.cos(rad) * t * w * 100.0 * 0.85
            # scale w,d are already in "cube scale" units (100cm base)
            _spawn_mesh(
                "Bld_Win_{}_{}_{}".format(tag, fi, ci),
                mesh,
                unreal.Vector(fx, fy, fz),
                unreal.Vector(0.35, 0.08, 0.45),
                yaw_rot(yaw),
                mats["window"],
                collide=False,
                folder="DriveAnywhere/Windows",
            )
            count += 1
            if count > 40:
                return count
    return count


def _enrich_existing_buildings(mats, rng):
    """Add window grids to existing Bld_*_Body actors."""
    _kill(["Bld_Win_"])
    bodies = [
        a
        for a in _actors().get_all_level_actors()
        if "_Body" in _label(a) and _label(a).startswith("Bld_")
    ]
    wins = 0
    for a in bodies:
        loc = a.get_actor_location()
        scale = a.get_actor_scale3d()
        rot = a.get_actor_rotation()
        # scale.z * 100 = height cm
        h_cm = abs(scale.z) * 100.0
        if h_cm < 1500:
            continue
        tag = re.sub(r"[^A-Za-z0-9]", "", _label(a))[-20:]
        wins += _add_windows_on_building(
            loc.x, loc.y, loc.z, abs(scale.x), abs(scale.y), h_cm, rot.yaw, mats, rng, tag
        )
    return wins


def _dense_fill(info, mats, rng):
    """Extra city blocks — denser skyline, clear of asphalt."""
    _kill(["Bld_Dense_"])
    mesh = _cube()
    count = 0
    for i, (p, yaw, normal) in enumerate(info):
        if i % 2 != 0:
            continue
        for sign, tag in ((1.0, "L"), (-1.0, "R")):
            # Two rings of density
            for ring, dist in enumerate((3400.0, 5200.0, 7000.0)):
                if rng.random() > 0.42:
                    continue
                px = p.x + normal[0] * dist * sign + rng.uniform(-400, 400)
                py = p.y + normal[1] * dist * sign + rng.uniform(-400, 400)
                # Stay off road
                if math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2) < 2000:
                    continue
                h = rng.uniform(2500, 14000)
                w = rng.uniform(10.0, 28.0)
                d = rng.uniform(10.0, 24.0)
                mat = rng.choice(
                    [
                        mats["stone"],
                        mats["concrete"],
                        mats["brick"],
                        mats["glass"],
                        mats["white"],
                        mats["dark"],
                    ]
                )
                loc = unreal.Vector(px, py, p.z + h * 0.5)
                body = _spawn_mesh(
                    "Bld_Dense_{}_{}_{}".format(tag, i, ring),
                    mesh,
                    loc,
                    unreal.Vector(w, d, h / 100.0),
                    yaw_rot(yaw + rng.uniform(-8, 8)),
                    mat,
                    folder="DriveAnywhere/Buildings",
                )
                # Small crown
                _spawn_mesh(
                    "Bld_Dense_{}_{}_{}_C".format(tag, i, ring),
                    mesh,
                    unreal.Vector(px, py, p.z + h * 0.92),
                    unreal.Vector(w * 0.7, d * 0.7, h * 0.08 / 100.0),
                    yaw_rot(yaw),
                    mats["dark"] if mat == mats["glass"] else mats["white"],
                    collide=False,
                    folder="DriveAnywhere/Buildings",
                )
                count += 1
    return count


def _set_world_gm(gm_path):
    try:
        ws = unreal.EditorLevelLibrary.get_editor_world().get_world_settings()
        gm = unreal.load_class(None, gm_path)
        if gm:
            ws.set_editor_property("default_game_mode", gm)
        ws.set_editor_property("force_no_precomputed_lighting", True)
    except Exception:
        pass


def _advance_map(path, mats, gm_path, rng):
    _levels().load_level(path)
    roads = _roads()
    _paint_roads(roads, mats["asphalt"])
    info = _road_dirs(roads) if roads else []

    _fix_player_start(roads)
    walks = _add_sidewalks(info, mats, rng) if info else 0
    lamps = _add_street_lamps(info, mats, rng) if info else 0
    dense = _dense_fill(info, mats, rng) if info else 0
    wins = _enrich_existing_buildings(mats, rng)

    _set_world_gm(gm_path)
    _frame_chase(roads)
    _levels().save_current_level()
    return {
        "map": path,
        "roads": len(roads),
        "sidewalks": walks,
        "lamps": lamps,
        "dense": dense,
        "windows": wins,
    }


def main():
    unreal.log("DriveAnywhere: ADVANCE — camera, car, cities…")
    _write_status({"state": "running"})
    try:
        mats = _ensure_mats()
        racer = _upgrade_racer(mats)
        gm = _ensure_gm(racer)

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
            slug = m.rsplit("/", 1)[-1]
            rng = random.Random(hash(slug) & 0xFFFFFFFF)
            unreal.log("Advancing {}".format(m))
            results.append(_advance_map(m, mats, gm, rng))

        if unreal.EditorAssetLibrary.does_asset_exist(WEST):
            _levels().load_level(WEST)
            _frame_chase(_roads())
            _levels().save_current_level()

        _write_status(
            {
                "state": "ok",
                "results": results,
                "racer": racer,
                "gameMode": gm,
                "howToPlay": "Alt+P — WASD drive, mouse look (chase cam). Sports GT pace.",
            }
        )
        unreal.log("DriveAnywhere ADVANCE complete.")
    except Exception as exc:
        _write_status({"state": "error", "error": str(exc), "trace": traceback.format_exc()})
        unreal.log_error(str(exc))
        raise


main()
