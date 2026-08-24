"""Every landmark is unique — name-specific heroes + hashed variation."""
from __future__ import annotations
import hashlib
import math
import unreal
from da_rot import pitch_yaw, yaw_rot

def _cube():
    return unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube')
def _cyl():
    return unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cylinder')
def _cone():
    return unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cone')
def _sphere():
    return unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Sphere')
def _hash(name):
    return int(hashlib.md5(name.encode('utf-8')).hexdigest()[:8], 16)
def _up():
    return yaw_rot(0)

class Spawner:
    def __init__(self, spawn_fn, tag, folder='DriveAnywhere/Unique'):
        self.spawn = spawn_fn; self.tag = tag; self.folder = folder
        self.mesh = _cube(); self.cyl = _cyl() or self.mesh
        self.cone = _cone() or self.mesh; self.sphere = _sphere() or self.mesh; self.n = 0
    def box(self, loc, sx, sy, sz, mat, col=False, yaw=0, pitch=0):
        self.n += 1
        rot = pitch_yaw(pitch, yaw, 0) if pitch else yaw_rot(yaw)
        self.spawn('{}_P{}'.format(self.tag, self.n), self.mesh, loc, unreal.Vector(sx, sy, sz), rot, mat, col, self.folder)
    def cyli(self, loc, r, sz, mat, col=False, pitch=0, yaw=0):
        self.n += 1
        rot = pitch_yaw(pitch, yaw, 0) if pitch else _up()
        self.spawn('{}_C{}'.format(self.tag, self.n), self.cyl, loc, unreal.Vector(r, r, sz), rot, mat, col, self.folder)
    def coni(self, loc, r, sz, mat, col=False):
        self.n += 1
        self.spawn('{}_N{}'.format(self.tag, self.n), self.cone, loc, unreal.Vector(r, r, sz), _up(), mat, col, self.folder)
    def sph(self, loc, r, mat, col=False):
        self.n += 1
        self.spawn('{}_S{}'.format(self.tag, self.n), self.sphere, loc, unreal.Vector(r, r, r), _up(), mat, col, self.folder)


def _window_bands(sp, x, y, z, h, w, d, glass, floors=12, yaw=0):
    """Push glass strip bands into a facade so towers read as real buildings."""
    floors = max(4, min(int(floors), 28))
    for i in range(floors):
        t = 0.12 + (0.72 * (i + 0.5) / floors)
        sp.box(
            unreal.Vector(x, y, z + h * t),
            max(w * 0.92, 2.0), max(d * 0.08, 0.35), h * 0.035 / 100,
            glass, False, yaw,
        )


def _london_eye(sp, x, y, z, h, steel, glass, white=None):
    """Photo-readable London Eye: vertical wheel, A-frame, 32 hanging capsules, plaza."""
    white = white or steel
    # Real Eye ~135m diameter → radius ~67.5m. Scale for readable trackside silhouette.
    r = max(min(h * 0.48, 7200.0), 5800.0)  # cm
    # Hub high enough that lowest capsule clears plaza (~boarding height)
    hub_z = z + r + 900.0
    # Boarding plaza + ticket pavilion (South Bank cue)
    sp.box(unreal.Vector(x, y + 600, z + 60), 70.0, 40.0, 1.2, white, True)
    sp.box(unreal.Vector(x, y + 1400, z + 220), 22.0, 14.0, 3.5, steel, True)
    sp.box(unreal.Vector(x, y + 1400, z + 420), 18.0, 12.0, 0.8, glass, False)
    # Twin A-frame legs behind the wheel (real Eye: angled supports on land side)
    leg_h = (hub_z - z) * 0.92 / 100.0
    for sx in (-1, 1):
        # Outer leg
        sp.box(
            unreal.Vector(x + sx * 1600, y + 2200, z + (hub_z - z) * 0.42),
            2.4, 2.4, leg_h, steel, True, yaw=sx * 8, pitch=sx * 18,
        )
        # Inner brace
        sp.box(
            unreal.Vector(x + sx * 900, y + 1600, z + (hub_z - z) * 0.38),
            1.6, 1.6, leg_h * 0.85, white, False, yaw=sx * 6, pitch=sx * 14,
        )
    # Cross-beam under hub
    sp.box(unreal.Vector(x, y + 1900, hub_z - 400), 28.0, 2.0, 1.8, steel, True)
    # Hub axle (along Y) + hub disc
    sp.cyli(unreal.Vector(x, y, hub_z), 3.2, 14.0, steel, True, pitch=90, yaw=0)
    sp.sph(unreal.Vector(x, y, hub_z), 6.5, white)
    sp.cyli(unreal.Vector(x, y, hub_z), 8.0, 2.5, steel, False, pitch=90, yaw=0)

    pods = 32
    rim_segments = 48
    # Continuous outer rim (tangential boxes in the XZ plane — vertical wheel)
    for i in range(rim_segments):
        ang = i * (360.0 / rim_segments)
        rad = math.radians(ang)
        cx = x + math.cos(rad) * r
        cz = hub_z + math.sin(rad) * r
        # Tangential chord: yaw so long axis follows rim
        sp.box(unreal.Vector(cx, y, cz), 1.8, 2.2, 3.6, steel, False, yaw=ang + 90)
        # Inner rail
        ir = r * 0.94
        sp.box(
            unreal.Vector(x + math.cos(rad) * ir, y, hub_z + math.sin(rad) * ir),
            1.0, 1.2, 2.4, white, False, yaw=ang + 90,
        )

    for i in range(pods):
        ang = i * (360.0 / pods)
        rad = math.radians(ang)
        cx = x + math.cos(rad) * r
        cz = hub_z + math.sin(rad) * r
        # Spoke: midpoint hub→rim, length ≈ r, oriented in XZ plane
        mx = x + math.cos(rad) * r * 0.5
        mz = hub_z + math.sin(rad) * r * 0.5
        # Cylinder default along Z → pitch so it lies in XZ toward rim
        # At ang=0 (rim at +X): need cylinder along +X → pitch 90, yaw 0
        # At ang=90 (rim at +Z): cylinder along +Z → pitch 0
        sp.cyli(
            unreal.Vector(mx, y, mz),
            0.35, (r * 0.96) / 100.0,
            steel if i % 2 == 0 else white,
            False, pitch=90.0 - ang, yaw=0,
        )
        # Capsule stays upright (gravity cue) — slightly outboard on +Y toward river view
        cab_y = y - 280
        sp.box(unreal.Vector(cx, cab_y, cz), 5.2, 7.5, 4.8, glass, False)
        sp.box(unreal.Vector(cx, cab_y, cz), 4.0, 6.0, 3.6, white, False)
        # Capsule hangers (short cables)
        sp.box(unreal.Vector(cx, y - 80, cz), 0.35, 2.2, 0.35, steel, False)

    # Inner tension ring
    for i in range(16):
        ang = i * 22.5
        rad = math.radians(ang)
        ir = r * 0.52
        sp.box(
            unreal.Vector(x + math.cos(rad) * ir, y, hub_z + math.sin(rad) * ir),
            1.2, 1.2, 1.2, white, False, yaw=ang,
        )
    # Boarding spindle / base collar
    sp.cyli(unreal.Vector(x, y + 400, z + 400), 6.0, 6.0, steel, True)
    sp.box(unreal.Vector(x, y + 400, z + 150), 16.0, 16.0, 2.0, white, True)


def _dubai_frame(sp, x, y, z, h, gold, glass):
    """Dubai Frame: giant gold picture-frame portal."""
    th = max(h, 9000)
    sp.box(unreal.Vector(x - 1800, y, z + th * 0.48), 8.0, 22.0, th * 0.9 / 100, gold, True)
    sp.box(unreal.Vector(x + 1800, y, z + th * 0.48), 8.0, 22.0, th * 0.9 / 100, gold, True)
    sp.box(unreal.Vector(x, y, z + th * 0.92), 42.0, 24.0, th * 0.12 / 100, gold, True)
    sp.box(unreal.Vector(x, y, z + th * 0.08), 42.0, 24.0, th * 0.1 / 100, gold, True)
    sp.box(unreal.Vector(x, y, z + th * 0.5), 28.0, 2.0, th * 0.7 / 100, glass, False)


def _flatiron(sp, x, y, z, h, stone, dark):
    """Flatiron: sharp triangular plan tapering upward."""
    for i in range(8):
        t0 = i / 8.0
        t1 = (i + 1) / 8.0
        mid = z + h * (t0 + t1) * 0.5
        w = 28.0 * (1.0 - t0 * 0.35)
        sp.box(unreal.Vector(x, y, mid), w, w * 0.28, h * (t1 - t0) / 100, stone if i % 2 == 0 else dark, i == 0, 15)
    sp.box(unreal.Vector(x, y, z + h * 0.98), 12.0, 4.0, h * 0.05 / 100, dark)


def _brooklyn_bridge(sp, x, y, z, h, stone, steel):
    for ox in (-2400, 2400):
        sp.box(unreal.Vector(x + ox, y, z + h * 0.5), 12.0, 18.0, h * 0.95 / 100, stone, True)
        sp.box(unreal.Vector(x + ox, y, z + h * 1.02), 14.0, 20.0, h * 0.08 / 100, stone)
    sp.box(unreal.Vector(x, y, z + h * 0.88), 55.0, 3.0, 1.2, steel)
    sp.box(unreal.Vector(x, y, z + h * 0.2), 52.0, 14.0, 1.5, stone, True)


def _museum_future(sp, x, y, z, h, steel, glass):
    """Museum of the Future: torus / ring tower silhouette."""
    sp.cyli(unreal.Vector(x, y, z + h * 0.45), 18.0, h * 0.7 / 100, steel, True)
    sp.cyli(unreal.Vector(x, y, z + h * 0.45), 12.0, h * 0.55 / 100, glass, False)
    # Oval cut suggestion
    sp.box(unreal.Vector(x + 1200, y, z + h * 0.55), 8.0, 22.0, h * 0.45 / 100, glass, False)


def _millbank(sp, x, y, z, h, glass, white, dark):
    """Millbank Tower: round concrete shaft + glazed curtain wall (photo cue)."""
    for i in range(14):
        t0 = i / 14.0
        t1 = (i + 1) / 14.0
        mid = z + h * (t0 + t1) * 0.5
        r = 9.5 * (1.0 - t0 * 0.08)
        sp.cyli(unreal.Vector(x, y, mid), r, h * (t1 - t0) / 100, glass if i % 2 == 0 else white, i == 0)
    sp.cyli(unreal.Vector(x, y, z + h * 0.98), 7.0, h * 0.05 / 100, dark)
    sp.box(unreal.Vector(x, y, z + h * 0.08), 28.0, 28.0, h * 0.1 / 100, white, True)


def _st_george_wharf(sp, x, y, z, h, glass, white, tip):
    """St George Wharf Tower: slender glass needle with pointed crown."""
    for i in range(12):
        t0 = i / 12.0
        t1 = (i + 1) / 12.0
        mid = z + h * (t0 + t1) * 0.5
        w = 14.0 * (1.0 - t0 * 0.55)
        sp.box(unreal.Vector(x, y, mid), w, w * 0.85, h * (t1 - t0) / 100, glass if i % 2 == 0 else white, i == 0)
    sp.coni(unreal.Vector(x, y, z + h * 0.97), 3.5, h * 0.1 / 100, tip)
    _window_bands(sp, x, y, z, h, 12.0, 10.0, tip, floors=18)


def _tower_bridge(sp, x, y, z, h, stone, blue, gold):
    """Tower Bridge: twin gothic towers + high-level walkways."""
    for ox in (-2200, 2200):
        sp.box(unreal.Vector(x + ox, y, z + h * 0.45), 14.0, 18.0, h * 0.85 / 100, stone, True)
        sp.box(unreal.Vector(x + ox, y, z + h * 0.92), 16.0, 20.0, h * 0.1 / 100, blue)
        sp.box(unreal.Vector(x + ox, y, z + h * 1.05), 6.0, 6.0, h * 0.12 / 100, gold)
    sp.box(unreal.Vector(x, y, z + h * 0.78), 50.0, 4.0, 1.2, blue)
    sp.box(unreal.Vector(x, y, z + h * 0.22), 48.0, 12.0, 1.5, stone, True)


def _cleopatra_needle(sp, x, y, z, h, stone, gold):
    sp.box(unreal.Vector(x, y, z + h * 0.08), 10.0, 10.0, h * 0.12 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.55), 3.2, 3.2, h * 0.9 / 100, stone, True)
    sp.coni(unreal.Vector(x, y, z + h * 1.02), 2.0, h * 0.12 / 100, gold)


def _county_hall(sp, x, y, z, h, stone, white, dark):
    """County Hall: long Portland-stone riverside palace with corner domes."""
    sp.box(unreal.Vector(x, y, z + h * 0.38), 85.0, 32.0, h * 0.7 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.75), 82.0, 28.0, h * 0.08 / 100, white)
    for ox in (-3200, 3200):
        sp.box(unreal.Vector(x + ox, y, z + h * 0.55), 16.0, 16.0, h * 0.7 / 100, stone, True)
        sp.sph(unreal.Vector(x + ox, y, z + h * 0.95), 8.0, dark)
    for i in range(7):
        ox = (i - 3) * 900
        sp.box(unreal.Vector(x + ox, y + 1400, z + h * 0.42), 4.0, 3.0, h * 0.35 / 100, dark)


def _shell_mex(sp, x, y, z, h, stone, clock, dark):
    """Shell Mex House: massive art-deco river block with giant clock face."""
    sp.box(unreal.Vector(x, y, z + h * 0.4), 70.0, 28.0, h * 0.75 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.82), 72.0, 30.0, h * 0.1 / 100, dark)
    sp.cyli(unreal.Vector(x, y + 1200, z + h * 0.55), 10.0, h * 0.35 / 100, clock, True, pitch=90)
    sp.box(unreal.Vector(x, y + 1200, z + h * 0.55), 0.4, 8.0, 0.4, dark)


def _victoria_tower(sp, x, y, z, h, stone, dark, gold):
    sp.box(unreal.Vector(x, y, z + h * 0.42), 16.0, 16.0, h * 0.82 / 100, stone, True)
    for ox, oy in ((-7, -7), (7, -7), (-7, 7), (7, 7)):
        sp.box(unreal.Vector(x + ox * 100, y + oy * 100, z + h * 0.55), 2.2, 2.2, h * 0.55 / 100, dark)
    sp.box(unreal.Vector(x, y, z + h * 0.9), 18.5, 18.5, h * 0.1 / 100, dark)
    sp.box(unreal.Vector(x, y, z + h * 1.02), 10.0, 10.0, h * 0.12 / 100, stone)
    sp.box(unreal.Vector(x, y, z + h * 1.14), 6.0, 6.0, h * 0.08 / 100, gold)
    _window_bands(sp, x, y, z, h, 15.5, 15.5, dark, floors=16)


def _mi6(sp, x, y, z, h, paint, accent, dark):
    tiers = [(0.22, 32, 28), (0.48, 26, 22), (0.72, 20, 17), (0.9, 14, 12)]
    prev = 0.0
    for i, (top, w, d) in enumerate(tiers):
        mid = z + h * (prev + top) * 0.5
        sp.box(unreal.Vector(x, y, mid), w, d, h * (top - prev) / 100, paint if i % 2 == 0 else accent, i == 0)
        prev = top
    sp.box(unreal.Vector(x, y, z + h * 0.96), 16.0, 14.0, h * 0.05 / 100, dark)
    _window_bands(sp, x, y, z, h, 30.0, 26.0, accent, floors=10)


def _battersea(sp, x, y, z, h, brick, copper, white):
    sp.box(unreal.Vector(x, y, z + h * 0.28), 70.0, 45.0, h * 0.5 / 100, brick, True)
    sp.box(unreal.Vector(x, y, z + h * 0.58), 72.0, 47.0, h * 0.08 / 100, copper)
    for ox, oy in ((-2200, -1200), (2200, -1200), (-2200, 1200), (2200, 1200)):
        sp.cyli(unreal.Vector(x + ox, y + oy, z + h * 0.72), 4.5, h * 0.55 / 100, white, True)
        sp.cyli(unreal.Vector(x + ox, y + oy, z + h * 1.02), 5.2, h * 0.06 / 100, copper)


def _horse_guards(sp, x, y, z, h, stone, white, dark):
    sp.box(unreal.Vector(x, y, z + h * 0.35), 55.0, 22.0, h * 0.65 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.72), 50.0, 18.0, h * 0.08 / 100, white)
    sp.box(unreal.Vector(x, y, z + h * 0.55), 14.0, 24.0, h * 0.55 / 100, dark, True)
    for ox in (-1800, 1800):
        sp.box(unreal.Vector(x + ox, y, z + h * 0.55), 10.0, 10.0, h * 0.7 / 100, stone, True)
        sp.box(unreal.Vector(x + ox, y, z + h * 0.95), 11.0, 11.0, h * 0.08 / 100, dark)


def _admiralty_arch(sp, x, y, z, h, stone, dark):
    sp.box(unreal.Vector(x - 1800, y, z + h * 0.4), 18.0, 22.0, h * 0.75 / 100, stone, True)
    sp.box(unreal.Vector(x + 1800, y, z + h * 0.4), 18.0, 22.0, h * 0.75 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.78), 55.0, 24.0, h * 0.22 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.95), 58.0, 26.0, h * 0.08 / 100, dark)
    for ox in (-900, 0, 900):
        sp.box(unreal.Vector(x + ox, y, z + h * 0.35), 8.0, 2.0, h * 0.55 / 100, dark)


def _elizabeth_tower(sp, x, y, z, h, stone, dark, gold, white, copper):
    sp.box(unreal.Vector(x, y, z + h * 0.04), 17.5, 17.5, h * 0.08 / 100, dark, True)
    sp.box(unreal.Vector(x, y, z + h * 0.22), 15.0, 15.0, h * 0.28 / 100, stone, True)
    for ox, oy in ((-7.0, -7.0), (7.0, -7.0), (-7.0, 7.0), (7.0, 7.0)):
        sp.box(unreal.Vector(x + ox * 100, y + oy * 100, z + h * 0.22), 1.6, 1.6, h * 0.26 / 100, dark)
    # window bands
    for t in (0.18, 0.28, 0.38, 0.48):
        sp.box(unreal.Vector(x, y, z + h * t), 15.4, 15.4, h * 0.02 / 100, dark)
    sp.box(unreal.Vector(x, y, z + h * 0.48), 13.0, 13.0, h * 0.28 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.68), 14.5, 14.5, h * 0.14 / 100, white)
    for yaw, ox, oy in ((0, 0, 7.4), (90, 7.4, 0), (180, 0, -7.4), (270, -7.4, 0)):
        sp.box(unreal.Vector(x + ox * 100, y + oy * 100, z + h * 0.68), 0.35, 7.0, 7.0, gold, False, yaw)
        sp.box(unreal.Vector(x + ox * 95, y + oy * 95, z + h * 0.68), 0.15, 0.4, 3.2, dark, False, yaw)
    sp.box(unreal.Vector(x, y, z + h * 0.82), 8.0, 8.0, h * 0.1 / 100, dark)
    sp.coni(unreal.Vector(x, y, z + h * 0.94), 5.2, h * 0.18 / 100, copper)
    sp.cyli(unreal.Vector(x, y, z + h * 1.02), 0.3, h * 0.05 / 100, gold)

def _empire_state(sp, x, y, z, h, body, trim, white):
    tiers = [(0.18, 0.95), (0.38, 0.78), (0.58, 0.62), (0.74, 0.48), (0.86, 0.36)]
    prev = 0.0
    for i, (top, wfrac) in enumerate(tiers):
        mid = z + h * (prev + top) * 0.5
        seg = h * (top - prev) / 100.0
        w = 22.0 * wfrac
        sp.box(unreal.Vector(x, y, mid), w, w * 0.82, seg, body if i < 4 else trim, i == 0)
        prev = top
    sp.cyli(unreal.Vector(x, y, z + h * 0.95), 1.2, h * 0.12 / 100, white)
    sp.coni(unreal.Vector(x, y, z + h * 1.02), 0.6, h * 0.06 / 100, trim)

def _chrysler(sp, x, y, z, h, body, steel, accent):
    for i, (t0, t1, wf) in enumerate([(0, 0.45, 0.9), (0.45, 0.7, 0.7), (0.7, 0.85, 0.5)]):
        mid = z + h * (t0 + t1) * 0.5
        sp.box(unreal.Vector(x, y, mid), 18 * wf, 16 * wf, h * (t1 - t0) / 100, body, i == 0)
    for i, t in enumerate((0.88, 0.92, 0.95)):
        sp.cyli(unreal.Vector(x, y, z + h * t), 6.0 - i * 1.2, h * 0.035 / 100, steel)
    sp.coni(unreal.Vector(x, y, z + h * 0.99), 2.0, h * 0.06 / 100, accent)

def _burj_khalifa(sp, x, y, z, h, glass, accent):
    for i in range(12):
        t0 = i / 12.0
        t1 = (i + 1) / 12.0
        mid = z + h * (t0 + t1) * 0.5
        shrink = 1.0 - i * 0.07
        yaw = i * 8.0
        w = 28.0 * shrink
        for a in (0, 120, 240):
            rad = math.radians(a + yaw)
            ox = math.cos(rad) * w * 35
            oy = math.sin(rad) * w * 35
            sp.box(unreal.Vector(x + ox, y + oy, mid), w * 0.55, w * 0.35, h * (t1 - t0) / 100,
                   glass if i % 2 == 0 else accent, i == 0 and a == 0, yaw + a)
    sp.cyli(unreal.Vector(x, y, z + h * 0.97), 1.5, h * 0.08 / 100, accent)

def _burj_al_arab(sp, x, y, z, h, sail, mast, gold):
    sp.box(unreal.Vector(x, y, z + h * 0.48), 4.0, 28.0, h * 0.92 / 100, sail, True, 12)
    sp.box(unreal.Vector(x + 600, y, z + h * 0.5), 3.0, 22.0, h * 0.88 / 100, mast, False, -8)
    sp.box(unreal.Vector(x, y, z + h * 0.96), 10.0, 10.0, 0.8, gold)
    sp.cyli(unreal.Vector(x, y + 800, z + h * 0.55), 2.0, h * 0.7 / 100, mast)

def _shard(sp, x, y, z, h, glass, tip):
    for i in range(8):
        t0 = i / 8.0
        t1 = (i + 1) / 8.0
        mid = z + h * (t0 + t1) * 0.5
        w = 22.0 * (1.0 - t0 * 0.85)
        sp.box(unreal.Vector(x, y, mid), w, w * 0.7, h * (t1 - t0) / 100, glass, i == 0, i * 2)
    sp.coni(unreal.Vector(x, y, z + h * 0.98), 2.5, h * 0.08 / 100, tip)
    _window_bands(sp, x, y, z, h, 18.0, 12.0, tip, floors=20)

def _gherkin(sp, x, y, z, h, glass, accent):
    for i in range(10):
        t = (i + 0.5) / 10.0
        bulge = 1.0 + 0.35 * math.sin(t * math.pi)
        mid = z + h * t
        r = 9.0 * bulge * (1.0 - abs(t - 0.5) * 0.15)
        sp.cyli(unreal.Vector(x, y, mid), r, h * 0.11 / 100, glass if i % 2 == 0 else accent, i == 0)
    sp.coni(unreal.Vector(x, y, z + h * 0.98), 3.0, h * 0.06 / 100, accent)

def _walkie_talkie(sp, x, y, z, h, glass, stone):
    for i in range(7):
        t0 = i / 7.0
        t1 = (i + 1) / 7.0
        w = 12.0 + t0 * 14.0
        d = 10.0 + t0 * 10.0
        mid = z + h * (t0 + t1) * 0.5
        sp.box(unreal.Vector(x, y, mid), w, d, h * (t1 - t0) / 100, glass if i > 1 else stone, i == 0)
    sp.box(unreal.Vector(x, y, z + h * 0.97), 28.0, 22.0, h * 0.05 / 100, stone)

def _one_canada(sp, x, y, z, h, body, crown):
    sp.box(unreal.Vector(x, y, z + h * 0.42), 18.0, 18.0, h * 0.82 / 100, body, True)
    sp.coni(unreal.Vector(x, y, z + h * 0.92), 10.0, h * 0.14 / 100, crown)
    sp.sph(unreal.Vector(x, y, z + h * 0.995), 1.2, crown)

def _tokyo_tower(sp, x, y, z, h, red, white):
    for i in range(6):
        t0 = i / 6.0
        t1 = (i + 1) / 6.0
        mid = z + h * (t0 + t1) * 0.5
        w = 14.0 * (1.0 - t0 * 0.7)
        mat = red if i % 2 == 0 else white
        for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            sp.box(unreal.Vector(x + ox * w * 40, y + oy * w * 40, mid), 1.2, 1.2, h * (t1 - t0) / 100, mat, i == 0 and ox < 0)
        sp.box(unreal.Vector(x, y, mid), w * 0.9, 0.6, 0.6, mat)
    sp.cyli(unreal.Vector(x, y, z + h * 0.95), 1.0, h * 0.08 / 100, red)

def _skytree(sp, x, y, z, h, body, accent):
    for i in range(10):
        t0 = i / 10.0
        t1 = (i + 1) / 10.0
        mid = z + h * (t0 + t1) * 0.5
        r = 8.0 * (1.0 - t0 * 0.85)
        for a in (0, 120, 240):
            rad = math.radians(a)
            sp.cyli(unreal.Vector(x + math.cos(rad) * r * 40, y + math.sin(rad) * r * 40, mid),
                    r * 0.35, h * (t1 - t0) / 100, body if i % 2 == 0 else accent, i == 0 and a == 0)
    sp.cyli(unreal.Vector(x, y, z + h * 0.96), 1.2, h * 0.1 / 100, accent)

def _cristo(sp, x, y, z, h, stone, accent):
    sp.box(unreal.Vector(x, y, z + h * 0.12), 14.0, 14.0, h * 0.22 / 100, stone, True)
    sp.cyli(unreal.Vector(x, y, z + h * 0.48), 2.8, h * 0.45 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.72), 28.0, 2.2, h * 0.06 / 100, stone)
    sp.sph(unreal.Vector(x, y, z + h * 0.82), 3.2, accent)

def _sugarloaf(sp, x, y, z, h, rock, green):
    sp.coni(unreal.Vector(x, y, z + h * 0.4), 35.0, h * 0.7 / 100, rock, True)
    sp.sph(unreal.Vector(x, y, z + h * 0.72), 18.0, rock)
    sp.box(unreal.Vector(x, y, z + h * 0.08), 40.0, 40.0, h * 0.1 / 100, green)

def _great_pyramid(sp, x, y, z, h, sand, tip):
    sp.coni(unreal.Vector(x, y, z + h * 0.48), 55.0, h * 0.92 / 100, sand, True)
    sp.coni(unreal.Vector(x, y, z + h * 0.92), 8.0, h * 0.1 / 100, tip)

def _sphinx(sp, x, y, z, h, sand, accent):
    sp.box(unreal.Vector(x, y, z + h * 0.22), 55.0, 22.0, h * 0.35 / 100, sand, True)
    sp.box(unreal.Vector(x, y + 800, z + h * 0.55), 16.0, 14.0, h * 0.4 / 100, accent)
    sp.box(unreal.Vector(x, y + 1400, z + h * 0.35), 8.0, 20.0, h * 0.15 / 100, sand)

def _parliament(sp, x, y, z, h, stone, dark):
    # Long palace block + Victoria Tower + river-facing bays (grand silhouette)
    sp.box(unreal.Vector(x, y, z + h * 0.32), 110.0, 28.0, h * 0.58 / 100, stone, True, 18)
    sp.box(unreal.Vector(x, y, z + h * 0.62), 105.0, 24.0, h * 0.08 / 100, dark, False, 18)
    for i in range(9):
        ox = (i - 4) * 1100
        sp.box(unreal.Vector(x + ox, y + 1100, z + h * 0.48), 5.5, 5.5, h * 0.28 / 100, dark)
        sp.box(unreal.Vector(x + ox, y - 1100, z + h * 0.42), 7.0, 4.0, h * 0.18 / 100, stone)
    # Victoria Tower (taller end)
    sp.box(unreal.Vector(x + 5200, y - 600, z + h * 0.55), 18.0, 18.0, h * 1.05 / 100, stone, True)
    sp.box(unreal.Vector(x + 5200, y - 600, z + h * 1.12), 20.0, 20.0, h * 0.1 / 100, dark)
    sp.box(unreal.Vector(x + 5200, y - 600, z + h * 1.22), 8.0, 8.0, h * 0.12 / 100, dark)
    # Central spire cluster
    sp.box(unreal.Vector(x, y, z + h * 0.78), 10.0, 10.0, h * 0.35 / 100, stone, True)
    sp.box(unreal.Vector(x, y, z + h * 0.98), 12.0, 12.0, h * 0.06 / 100, dark)


def _abbey(sp, x, y, z, h, stone, lead):
    sp.box(unreal.Vector(x, y, z + h * 0.4), 36.0, 78.0, h * 0.75 / 100, stone, True, -90)
    sp.box(unreal.Vector(x, y, z + h * 0.82), 30.0, 68.0, h * 0.1 / 100, lead, False, -90)
    for ox in (-1200, 1200):
        sp.box(unreal.Vector(x + ox, y - 2400, z + h * 0.55), 12.0, 12.0, h * 1.0 / 100, stone, True)
        sp.box(unreal.Vector(x + ox, y - 2400, z + h * 1.08), 14.0, 14.0, h * 0.08 / 100, lead)
    sp.box(unreal.Vector(x, y + 1800, z + h * 0.55), 22.0, 18.0, h * 0.55 / 100, stone, True)


def _liberty(sp, x, y, z, h, green, stone):
    sp.box(unreal.Vector(x, y, z + h * 0.15), 22.0, 22.0, h * 0.28 / 100, stone, True)
    sp.cyli(unreal.Vector(x, y, z + h * 0.45), 4.0, h * 0.35 / 100, green, True)
    sp.box(unreal.Vector(x + 500, y, z + h * 0.72), 1.5, 1.5, h * 0.25 / 100, green)
    sp.sph(unreal.Vector(x + 500, y, z + h * 0.88), 2.0, green)

def _wtc(sp, x, y, z, h, glass, steel):
    for i in range(9):
        t0 = i / 9.0
        t1 = (i + 1) / 9.0
        mid = z + h * (t0 + t1) * 0.5
        w = 20.0 * (1.0 - t0 * 0.15)
        sp.box(unreal.Vector(x, y, mid), w, w, h * (t1 - t0) / 100, glass, i == 0)
    sp.cyli(unreal.Vector(x, y, z + h * 0.96), 1.0, h * 0.1 / 100, steel)

def _generic_varied(sp, name, kind, x, y, z, h, paint, accent):
    hv = _hash(name)
    tiers = 3 + (hv % 5)
    twist = (hv % 17) - 8
    fat = 0.7 + (hv % 40) / 100.0
    crown = hv % 4
    footprint = 10.0 + (hv % 20)
    if kind in ("pyramid", "sugarloaf", "ziggurat"):
        r = footprint * (1.2 + (hv % 10) / 20.0)
        if kind == "ziggurat":
            for i in range(tiers):
                t = (i + 0.5) / tiers
                w = r * (1.2 - i * 0.18)
                sp.box(unreal.Vector(x, y, z + h * t), w, w * 0.9, h * 0.18 / 100, paint, i == 0)
        else:
            sp.coni(unreal.Vector(x, y, z + h * 0.48), r, h * 0.9 / 100, paint, True)
            if crown == 1:
                sp.box(unreal.Vector(x, y, z + h * 0.95), 3, 3, 2, accent)
        return
    if kind == "ferris":
        _london_eye(sp, x, y, z, h, paint, accent, paint)
        return
    if kind == "sail":
        lean = 8 + (hv % 15)
        sp.box(unreal.Vector(x, y, z + h * 0.48), 3 + (hv % 4), footprint * 0.9, h * 0.9 / 100, paint, True, lean)
        sp.box(unreal.Vector(x + 400, y, z + h * 0.5), 2, footprint * 0.7, h * 0.85 / 100, accent, False, -lean // 2)
        return
    if kind == "dome":
        sp.cyli(unreal.Vector(x, y, z + h * 0.3), footprint * 0.5, h * 0.5 / 100, paint, True)
        sp.sph(unreal.Vector(x, y, z + h * 0.62), footprint * 0.48, accent)
        return
    if kind in ("obelisk", "lighthouse", "needle-spire", "lattice-spire"):
        w0 = 2.5 + (hv % 8) / 2.0
        for i in range(tiers):
            t0 = i / float(tiers)
            t1 = (i + 1) / float(tiers)
            mid = z + h * (t0 + t1) * 0.5
            w = w0 * (1.0 - t0 * 0.6)
            sp.cyli(unreal.Vector(x, y, mid), w, h * (t1 - t0) / 100, paint if i % 2 == 0 else accent, i == 0)
        if crown == 0:
            sp.coni(unreal.Vector(x, y, z + h * 0.98), w0 * 0.4, h * 0.08 / 100, accent)
        return
    # H-gates ONLY for real arch/bridge/gate names — not random Unique landmarks
    if kind in ("bridge-tower", "pylon-gate", "torii", "gold-frame"):
        low = (name or "").lower()
        if any(k in low for k in ("arch", "bridge", "gate", "torii", "frame", "admiralty", "downing")):
            gap = 10 + (hv % 8)
            for side in (-1, 1):
                sp.box(unreal.Vector(x + side * gap * 100, y, z + h * 0.45), 5 + (hv % 3), 6 + (hv % 3), h * 0.85 / 100, paint, True)
            sp.box(unreal.Vector(x, y, z + h * 0.78), gap * 2.4, 6.0, h * 0.18 / 100, accent)
            for ox in (-gap * 50, 0, gap * 50):
                sp.box(unreal.Vector(x + ox, y, z + h * 0.35), 4.0, 1.5, h * 0.5 / 100, accent)
            return
        # Fall through to solid building with windows instead of random H plinths
        kind = "art-deco"
    if kind in ("statue", "cristo"):
        sp.cyli(unreal.Vector(x, y, z + h * 0.12), 4, h * 0.15 / 100, accent)
        sp.cyli(unreal.Vector(x, y, z + h * 0.5), 2.2, h * 0.5 / 100, paint, True)
        sp.sph(unreal.Vector(x, y, z + h * 0.82), 2.5, paint)
        if hv % 2 == 0:
            sp.box(unreal.Vector(x, y, z + h * 0.65), 12 + (hv % 8), 1.5, 1.5, paint)
        return
    if kind in ("gherkin", "capsule", "twist", "neon-drum"):
        for i in range(tiers):
            t = (i + 0.5) / tiers
            bulge = 1.0 + 0.25 * math.sin(t * math.pi) * (1 if kind == "gherkin" else 0.3)
            mid = z + h * t
            r = (footprint * 0.4) * bulge * fat
            yaw = twist * i
            if kind == "twist":
                sp.box(unreal.Vector(x, y, mid), r * 1.4, r, h * 0.12 / 100, paint, i == 0, yaw)
            else:
                sp.cyli(unreal.Vector(x, y, mid), r, h * 0.12 / 100, paint if i % 2 == 0 else accent, i == 0)
        return
    if kind in ("shard", "tri-needle", "stepped-tower", "art-deco", "glass-slab", "walkie-talkie", "clock-spire", "gothic-spire", "pagoda", "chalet", "mill", "copper-steps", "portico", "sphinx"):
        for i in range(tiers):
            t0 = i / float(tiers)
            t1 = (i + 1) / float(tiers)
            mid = z + h * (t0 + t1) * 0.5
            if kind == "walkie-talkie":
                w = footprint * (0.6 + t0 * 0.7) * fat
            elif kind == "shard":
                w = footprint * (1.0 - t0 * 0.85) * fat
            else:
                w = footprint * (1.0 - t0 * 0.35) * fat
            d = w * (0.7 + (hv % 30) / 100.0)
            sp.box(unreal.Vector(x, y, mid), w, d, h * (t1 - t0) / 100, paint, i == 0, twist * i * 0.5)
        _window_bands(sp, x, y, z, h, footprint * 0.95 * fat, footprint * 0.15, accent, floors=8 + (hv % 10))
        if crown == 0:
            sp.coni(unreal.Vector(x, y, z + h * 0.97), 3, h * 0.08 / 100, accent)
        elif crown == 1:
            sp.box(unreal.Vector(x, y, z + h * 0.97), footprint * 0.4, footprint * 0.4, h * 0.06 / 100, accent)
        elif crown == 2:
            sp.cyli(unreal.Vector(x, y, z + h * 0.97), 2, h * 0.08 / 100, accent)
        return
    for i in range(tiers):
        t0 = i / float(tiers)
        t1 = (i + 1) / float(tiers)
        mid = z + h * (t0 + t1) * 0.5
        w = footprint * (1.0 - t0 * 0.25) * fat
        sp.box(unreal.Vector(x, y, mid), w, w * 0.85, h * (t1 - t0) / 100, paint, i == 0, twist)
    if crown != 3:
        sp.box(unreal.Vector(x, y, z + h * 0.96), footprint * 0.5, footprint * 0.5, h * 0.06 / 100, accent)

def build_landmark(name, kind, tag, x, y, z, h_cm, paint, accent, spawn_fn, mats=None):
    h = max(float(h_cm), 1200.0)
    sp = Spawner(spawn_fn, tag)
    mats = mats or {}
    stone = mats.get("stone", paint)
    dark = mats.get("dark", accent)
    gold = mats.get("gold", accent)
    white = mats.get("white", paint)
    copper = mats.get("copper", accent)
    glass = mats.get("glass", paint)
    steel = mats.get("steel", accent)
    sand = mats.get("sand", paint)
    green = mats.get("green", accent)
    red = mats.get("red", paint)
    key = (name or "").lower()
    kind = (kind or "").lower()

    if "elizabeth tower" in key or "big ben" in key or kind == "clock-tower":
        _elizabeth_tower(sp, x, y, z, max(h, 9600), stone, dark, gold, white, copper); return
    if "empire state" in key:
        _empire_state(sp, x, y, z, max(h, 14000), stone, steel, white); return
    if "chrysler" in key:
        _chrysler(sp, x, y, z, max(h, 13000), stone, steel, gold); return
    if "burj khalifa" in key:
        _burj_khalifa(sp, x, y, z, max(h, 22000), glass, accent); return
    if "burj al arab" in key:
        _burj_al_arab(sp, x, y, z, max(h, 15000), glass, steel, gold); return
    if "london eye" in key or key == "eye wheel court" or kind == "ferris":
        _london_eye(sp, x, y, z, max(h, 13500), steel, glass, white); return
    if key == "the shard" or (key.startswith("the shard")):
        _shard(sp, x, y, z, max(h, 15000), glass, steel); return
    if "gherkin" in key:
        _gherkin(sp, x, y, z, max(h, 11000), glass, accent); return
    if "walkie" in key:
        _walkie_talkie(sp, x, y, z, max(h, 10000), glass, stone); return
    if "one canada" in key:
        _one_canada(sp, x, y, z, max(h, 14000), white, gold); return
    if "tokyo tower" in key:
        _tokyo_tower(sp, x, y, z, max(h, 12000), red, white); return
    if "skytree" in key:
        _skytree(sp, x, y, z, max(h, 17000), steel, accent); return
    if "christ the redeemer" in key or "cristo redentor" in key:
        _cristo(sp, x, y, z, max(h, 10000), stone, white); return
    if "sugarloaf mountain" in key or key == "sugarloaf":
        _sugarloaf(sp, x, y, z, max(h, 9000), stone, green); return
    if "great pyramid of khufu" in key or key == "great pyramid":
        _great_pyramid(sp, x, y, z, max(h, 15000), sand, white); return
    if "great sphinx" in key:
        _sphinx(sp, x, y, z, max(h, 4500), sand, accent); return
    if "palace of westminster" in key or key == "parliament" or kind == "parliament":
        _parliament(sp, x, y, z, max(h, 9000), stone, dark); return
    if "westminster abbey" in key or (key == "abbey" and kind == "abbey") or kind == "abbey":
        _abbey(sp, x, y, z, max(h, 8000), stone, steel); return
    if "statue of liberty" in key:
        _liberty(sp, x, y, z, max(h, 9000), green, stone); return
    if "one world trade" in key:
        _wtc(sp, x, y, z, max(h, 18000), glass, steel); return
    if "victoria tower" in key:
        _victoria_tower(sp, x, y, z, max(h, 11000), stone, dark, gold); return
    if "mi6" in key:
        _mi6(sp, x, y, z, max(h, 7500), paint, accent, dark); return
    if "battersea" in key:
        _battersea(sp, x, y, z, max(h, 9000), mats.get("brick", paint), copper, white); return
    if "horse guards" in key:
        _horse_guards(sp, x, y, z, max(h, 5500), stone, white, dark); return
    if "admiralty" in key:
        _admiralty_arch(sp, x, y, z, max(h, 5000), stone, dark); return
    if "millbank" in key:
        _millbank(sp, x, y, z, max(h, 14000), glass, white, dark); return
    if "st george" in key or "st. george" in key:
        _st_george_wharf(sp, x, y, z, max(h, 16000), glass, white, steel); return
    if "tower bridge" in key:
        _tower_bridge(sp, x, y, z, max(h, 7000), stone, mats.get("blue", dark), gold); return
    if "cleopatra" in key:
        _cleopatra_needle(sp, x, y, z, max(h, 3500), stone, gold); return
    if "county hall" in key:
        _county_hall(sp, x, y, z, max(h, 6000), stone, white, dark); return
    if "shell mex" in key or "shell-mex" in key:
        _shell_mex(sp, x, y, z, max(h, 8000), stone, gold, dark); return
    if "dubai frame" in key:
        _dubai_frame(sp, x, y, z, max(h, 10000), gold, glass); return
    if "flatiron" in key:
        _flatiron(sp, x, y, z, max(h, 9000), stone, dark); return
    if "brooklyn bridge" in key:
        _brooklyn_bridge(sp, x, y, z, max(h, 8000), stone, steel); return
    if "museum of the future" in key or "museum future" in key:
        _museum_future(sp, x, y, z, max(h, 9000), steel, glass); return
    if "st paul" in key:
        sp.cyli(unreal.Vector(x, y, z + h * 0.28), 18, h * 0.45 / 100, stone, True)
        sp.sph(unreal.Vector(x, y, z + h * 0.65), 16, accent)
        sp.cyli(unreal.Vector(x, y, z + h * 0.88), 3, h * 0.15 / 100, gold); return
    if "matterhorn peak" in key or key == "matterhorn":
        sp.coni(unreal.Vector(x, y, z + h * 0.45), 40, h * 0.85 / 100, stone, True)
        sp.coni(unreal.Vector(x, y, z + h * 0.88), 8, h * 0.2 / 100, white); return
    if "ain dubai" in key or "cosmo wheel" in key or "wonder wheel" in key:
        _london_eye(sp, x, y, z, h, steel, glass, white); return

    _generic_varied(sp, name, kind, x, y, z, h, paint, accent)
