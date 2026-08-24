"""Every landmark is unique — name-specific heroes + hashed variation."""
from __future__ import annotations
import hashlib
import math
import unreal
from da_rot import yaw_rot

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
    def box(self, loc, sx, sy, sz, mat, col=False, yaw=0):
        self.n += 1
        self.spawn('{}_P{}'.format(self.tag, self.n), self.mesh, loc, unreal.Vector(sx, sy, sz), yaw_rot(yaw), mat, col, self.folder)
    def cyli(self, loc, r, sz, mat, col=False):
        self.n += 1
        self.spawn('{}_C{}'.format(self.tag, self.n), self.cyl, loc, unreal.Vector(r, r, sz), _up(), mat, col, self.folder)
    def coni(self, loc, r, sz, mat, col=False):
        self.n += 1
        self.spawn('{}_N{}'.format(self.tag, self.n), self.cone, loc, unreal.Vector(r, r, sz), _up(), mat, col, self.folder)
    def sph(self, loc, r, mat, col=False):
        self.n += 1
        self.spawn('{}_S{}'.format(self.tag, self.n), self.sphere, loc, unreal.Vector(r, r, r), _up(), mat, col, self.folder)

