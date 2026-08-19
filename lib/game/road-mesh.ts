import * as THREE from "three";
import type { RoadPoint, RouteData } from "@/lib/validation/route-data";

export interface RoadSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
}

function catmullRom(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return new THREE.Vector3(
    0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
}

export function sampleRoad(
  points: RoadPoint[],
  segmentsPerSpan = 16,
): RoadSample[] {
  if (points.length < 2) return [];

  const vecs = points.map((p) => new THREE.Vector3(p.x, Math.max(0, p.y ?? 0), p.z));
  const widths = points.map((p) => p.width);
  const samples: RoadSample[] = [];

  for (let i = 0; i < vecs.length - 1; i += 1) {
    const p0 = vecs[Math.max(0, i - 1)];
    const p1 = vecs[i];
    const p2 = vecs[i + 1];
    const p3 = vecs[Math.min(vecs.length - 1, i + 2)];
    const w0 = widths[i];
    const w1 = widths[Math.min(widths.length - 1, i + 1)];

    for (let s = 0; s < segmentsPerSpan; s += 1) {
      const t = s / segmentsPerSpan;
      const pos = catmullRom(p0, p1, p2, p3, t);
      pos.y = Math.max(0, pos.y);
      const lookAhead = Math.min(1, t + 0.02);
      const ahead = catmullRom(p0, p1, p2, p3, lookAhead);
      ahead.y = Math.max(0, ahead.y);
      const tang = ahead.clone().sub(pos);
      const flat = new THREE.Vector3(tang.x, 0, tang.z);
      if (flat.lengthSq() < 0.001) continue;
      flat.normalize();
      const w = w0 + (w1 - w0) * t;
      samples.push({
        position: pos,
        tangent: tang.normalize(),
        normal: new THREE.Vector3(-flat.z, 0, flat.x),
        width: w,
      });
    }
  }

  const last = vecs[vecs.length - 1].clone();
  last.y = Math.max(0, last.y);
  const prev = vecs[vecs.length - 2];
  const tang = last.clone().sub(prev);
  const flat = new THREE.Vector3(tang.x, 0, tang.z).normalize();
  samples.push({
    position: last.clone(),
    tangent: tang.normalize(),
    normal: new THREE.Vector3(-flat.z, 0, flat.x),
    width: points[points.length - 1].width,
  });

  return samples;
}

/** Solid asphalt deck — thin slab on flat ground; embankment sides only when elevated. */
export function createRoadGeometry(
  samples: RoadSample[],
  thickness = 0.65,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  let arcLen = 0;

  const isElevated = (y: number) => y > 1.15;

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const half = s.width / 2;
    const topY = s.position.y + 0.04;
    const elevated = isElevated(s.position.y);
    const slabThick = elevated ? thickness : 0.11;
    const botY = elevated ? Math.min(0, topY - thickness) : topY - slabThick;
    const l = s.position.clone().addScaledVector(s.normal, -half);
    const r = s.position.clone().addScaledVector(s.normal, half);
    if (i > 0) {
      arcLen += s.position.distanceTo(samples[i - 1].position);
    }
    const v = arcLen / 5;
    positions.push(l.x, topY, l.z, r.x, topY, r.z);
    uvs.push(0, v, 1, v);
    positions.push(r.x, botY, r.z, l.x, botY, l.z);
    uvs.push(1, v, 0, v);
  }

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = i * 4;
    const b = (i + 1) * 4;
    const elevated =
      isElevated(samples[i].position.y) || isElevated(samples[i + 1].position.y);
    indices.push(a, b, a + 1, a + 1, b, b + 1);
    if (elevated) {
      indices.push(a + 3, a + 2, b + 3, a + 2, b + 2, b + 3);
      indices.push(a, a + 3, b, b, a + 3, b + 3);
      indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }

  if (samples.length >= 2) {
    const startElevated = isElevated(samples[0].position.y);
    const endElevated = isElevated(samples[samples.length - 1].position.y);
    const start = 0;
    const end = (samples.length - 1) * 4;
    if (startElevated) {
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
    if (endElevated) {
      indices.push(end, end + 3, end + 2, end, end + 2, end + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Light gravel/apron strip between asphalt and grass — stops the road reading
 * as a dark trench against the world floor.
 */
export function createRoadShoulderApronGeometry(
  samples: RoadSample[],
  apronWidth = 1.8,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  let vertexBase = 0;

  for (const side of [-1, 1] as const) {
    let arc = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const s = samples[i];
      if (i > 0) arc += s.position.distanceTo(samples[i - 1].position);
      const y = s.position.y + 0.035;
      const inner = (s.width / 2 + 0.08) * side;
      const outer = (s.width / 2 + apronWidth) * side;
      const pi = s.position.clone().addScaledVector(s.normal, inner);
      const po = s.position.clone().addScaledVector(s.normal, outer);
      positions.push(pi.x, y, pi.z, po.x, y, po.z);
      const v = arc / 4.5;
      uvs.push(0, v, 1, v);
    }
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = vertexBase + i * 2;
      if (side === -1) {
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      } else {
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    vertexBase += samples.length * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Bold white dashed centre line — highway-readable dash cadence. */
export function createCentreLineGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const dashLen = 4.4;
  const gapLen = 2.2;
  const hw = 0.28;
  let arc = 0;
  let vertex = 0;

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    arc += b.position.distanceTo(a.position);
    const phase = arc % (dashLen + gapLen);
    if (phase > dashLen) continue;

    const ay = a.position.y + 0.055;
    const by = b.position.y + 0.055;
    const al = a.position.clone().addScaledVector(a.normal, -hw);
    const ar = a.position.clone().addScaledVector(a.normal, hw);
    const bl = b.position.clone().addScaledVector(b.normal, -hw);
    const br = b.position.clone().addScaledVector(b.normal, hw);
    positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
    indices.push(
      vertex, vertex + 2, vertex + 1,
      vertex + 1, vertex + 2, vertex + 3,
    );
    vertex += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Continuous white edge / fog lines at both sides of the road. */
export function createEdgeLineGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const hw = 0.3;
  const inset = 0.16;
  let v = 0;

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      const ay = a.position.y + 0.055;
      const by = b.position.y + 0.055;
      const offsetA = (a.width / 2 - inset) * side;
      const offsetB = (b.width / 2 - inset) * side;
      const al = a.position.clone().addScaledVector(a.normal, offsetA - hw * side);
      const ar = a.position.clone().addScaledVector(a.normal, offsetA + hw * side);
      const bl = b.position.clone().addScaledVector(b.normal, offsetB - hw * side);
      const br = b.position.clone().addScaledVector(b.normal, offsetB + hw * side);
      positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Dashed lane dividers. Street-width ribbons (~10 m) get a second pair of
 * short dashes either side of centre so two lanes read clearly; wider
 * decks get the classic ±⅓ markings.
 */
export function createLaneLineGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const dashLen = 2.8;
  const gapLen = 3.6;
  const hw = 0.09;
  let v = 0;

  const laneOffsetsFor = (width: number): number[] => {
    if (width < 14) return [];
    if (width < 18) return [-0.3, 0.3];
    return [-0.33, -0.11, 0.11, 0.33];
  };

  const offsetSet = new Set<number>();
  for (const sample of samples) {
    for (const lane of laneOffsetsFor(sample.width)) offsetSet.add(lane);
  }

  for (const lane of offsetSet) {
    let arc = 0;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      if (a.width < 14) continue;
      const allowed = laneOffsetsFor(a.width);
      if (!allowed.includes(lane)) continue;
      arc += b.position.distanceTo(a.position);
      const phase = arc % (dashLen + gapLen);
      if (phase > dashLen) continue;

      const ay = a.position.y + 0.052;
      const by = b.position.y + 0.052;
      const offA = a.width * lane;
      const offB = b.width * lane;
      const al = a.position.clone().addScaledVector(a.normal, offA - hw);
      const ar = a.position.clone().addScaledVector(a.normal, offA + hw);
      const bl = b.position.clone().addScaledVector(b.normal, offB - hw);
      const br = b.position.clone().addScaledVector(b.normal, offB + hw);
      positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Dark bitumen underlay under white paint — gives edges and dashes crisp
 * contrast without thickening the bright stripe itself.
 */
export function createPaintUnderlayGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let v = 0;

  // Edge underlays
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      const ay = a.position.y + 0.048;
      const by = b.position.y + 0.048;
      const hw = 0.3;
      const inset = 0.18;
      const offsetA = (a.width / 2 - inset) * side;
      const offsetB = (b.width / 2 - inset) * side;
      const al = a.position.clone().addScaledVector(a.normal, offsetA - hw * side);
      const ar = a.position.clone().addScaledVector(a.normal, offsetA + hw * side);
      const bl = b.position.clone().addScaledVector(b.normal, offsetB - hw * side);
      const br = b.position.clone().addScaledVector(b.normal, offsetB + hw * side);
      positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  // Centre underlay (continuous thin dark strip; white dashes sit on top)
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const ay = a.position.y + 0.048;
    const by = b.position.y + 0.048;
    const hw = 0.24;
    const al = a.position.clone().addScaledVector(a.normal, -hw);
    const ar = a.position.clone().addScaledVector(a.normal, hw);
    const bl = b.position.clone().addScaledVector(b.normal, -hw);
    const br = b.position.clone().addScaledVector(b.normal, hw);
    positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
    indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    v += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Thin solid shoulder / fog stripe just inside the edge line — separates
 * asphalt from kerb without looking like a second thick white border.
 */
export function createShoulderStripeGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const hw = 0.14;
  const inset = 0.52;
  let v = 0;

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      const ay = a.position.y + 0.05;
      const by = b.position.y + 0.05;
      const offsetA = (a.width / 2 - inset) * side;
      const offsetB = (b.width / 2 - inset) * side;
      const al = a.position.clone().addScaledVector(a.normal, offsetA - hw * side);
      const ar = a.position.clone().addScaledVector(a.normal, offsetA + hw * side);
      const bl = b.position.clone().addScaledVector(b.normal, offsetB - hw * side);
      const br = b.position.clone().addScaledVector(b.normal, offsetB + hw * side);
      positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Start / finish transverse stripe across the grid. */
export function createStartFinishLineGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  if (samples.length < 2) {
    return new THREE.BufferGeometry();
  }

  const a = samples[0];
  const b = samples[Math.min(3, samples.length - 1)];
  const depth = 2.4;
  const along = b.position.clone().sub(a.position);
  if (along.lengthSq() < 1e-6) {
    along.copy(a.tangent);
  }
  along.normalize().multiplyScalar(depth);
  const half = a.width / 2 - 0.25;
  const y = a.position.y + 0.056;
  const checks = 10;
  let v = 0;

  for (let i = 0; i < checks; i += 1) {
    const t0 = i / checks;
    const t1 = (i + 1) / checks;
    const n0 = -half + half * 2 * t0;
    const n1 = -half + half * 2 * t1;
    const p00 = a.position.clone().addScaledVector(a.normal, n0);
    const p01 = a.position.clone().addScaledVector(a.normal, n1);
    const p10 = p00.clone().add(along);
    const p11 = p01.clone().add(along);
    positions.push(
      p00.x, y, p00.z,
      p01.x, y, p01.z,
      p10.x, y, p10.z,
      p11.x, y, p11.z,
    );
    const light = i % 2 === 0;
    const col = light ? [0.97, 0.97, 0.95] : [0.08, 0.08, 0.1];
    for (let c = 0; c < 4; c += 1) colors.push(col[0], col[1], col[2]);
    indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    v += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Raised concrete kerb strip along both road edges. */
export function createKerbGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const kW = 0.55;
  const kH = 0.14;
  let v = 0;
  let arc = 0;

  for (const side of [-1, 1] as const) {
    arc = 0;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      arc += a.position.distanceTo(b.position);
      const dirA = a.normal.clone().multiplyScalar(side);
      const dirB = b.normal.clone().multiplyScalar(side);
      const inner = a.width / 2;
      const outer = inner + kW;
      const a0 = a.position.clone().addScaledVector(dirA, inner);
      const a1 = a.position.clone().addScaledVector(dirA, outer);
      const b0 = b.position.clone().addScaledVector(dirB, inner);
      const b1 = b.position.clone().addScaledVector(dirB, outer);
      const ay = a.position.y;
      const by = b.position.y;
      const u0 = arc / 2;
      const u1 = (arc + a.position.distanceTo(b.position)) / 2;
      positions.push(
        a0.x, ay + kH, a0.z,
        a1.x, ay + kH, a1.z,
        b0.x, by + kH, b0.z,
        b1.x, by + kH, b1.z,
      );
      uvs.push(u0, 0, u0, 1, u1, 0, u1, 1);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      positions.push(
        a1.x, ay, a1.z,
        b1.x, by, b1.z,
        a1.x, ay + kH, a1.z,
        b1.x, by + kH, b1.z,
      );
      uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);
      const o = v + 4;
      if (side === 1) {
        indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      } else {
        indices.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
      }
      v += 8;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * F1-style red / white sausage kerbs sitting on the asphalt edge.
 * Vertex colours alternate every ~2.2 m of arc.
 */
export function createRacingKerbGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const kW = 0.48;
  const kH = 0.1;
  let v = 0;
  let arc = 0;
  const red = [0.86, 0.1, 0.14];
  const white = [0.96, 0.96, 0.94];

  for (const side of [-1, 1] as const) {
    arc = 0;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      arc += a.position.distanceTo(b.position);
      const stripe = Math.floor(arc / 2.2) % 2 === 0 ? red : white;
      const dirA = a.normal.clone().multiplyScalar(side);
      const dirB = b.normal.clone().multiplyScalar(side);
      const inner = a.width / 2 - 0.02;
      const outer = inner + kW;
      const a0 = a.position.clone().addScaledVector(dirA, inner);
      const a1 = a.position.clone().addScaledVector(dirA, outer);
      const b0 = b.position.clone().addScaledVector(dirB, inner);
      const b1 = b.position.clone().addScaledVector(dirB, outer);
      const ay = a.position.y + 0.045;
      const by = b.position.y + 0.045;
      positions.push(
        a0.x, ay + kH, a0.z,
        a1.x, ay + kH * 0.7, a1.z,
        b0.x, by + kH, b0.z,
        b1.x, by + kH * 0.7, b1.z,
      );
      for (let c = 0; c < 4; c += 1) colors.push(stripe[0], stripe[1], stripe[2]);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Pavement strip beyond the kerb. */
export function createPavementGeometry(
  samples: RoadSample[],
  side: "left" | "right",
  pavementWidth = 3,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const dir = side === "left" ? -1 : 1;
  const kW = 0.55;
  let arc = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    if (i > 0) arc += s.position.distanceTo(samples[i - 1].position);
    const y = s.position.y + 0.06;
    const inner = (s.width / 2 + kW) * dir;
    const outer = (s.width / 2 + kW + pavementWidth) * dir;
    const pi = s.position.clone().addScaledVector(s.normal, inner);
    const po = s.position.clone().addScaledVector(s.normal, outer);
    positions.push(pi.x, y, pi.z, po.x, y, po.z);
    const v = arc / 3.2;
    uvs.push(0, v, 1, v);
  }

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = i * 2;
    if (side === "left") {
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    } else {
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Worn wheel tracks — two darker strips in each lane. This is what makes
 * a 10 m ribbon read as a real road instead of a grey carpet.
 */
export function createWheelPathGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const hw = 0.72;
  let v = 0;

  for (const lane of [-1, 1] as const) {
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      const b = samples[i + 1];
      const offA = Math.min(2.15, a.width * 0.22) * lane;
      const offB = Math.min(2.15, b.width * 0.22) * lane;
      const ay = a.position.y + 0.046;
      const by = b.position.y + 0.046;
      const al = a.position.clone().addScaledVector(a.normal, offA - hw);
      const ar = a.position.clone().addScaledVector(a.normal, offA + hw);
      const bl = b.position.clone().addScaledVector(b.normal, offB - hw);
      const br = b.position.clone().addScaledVector(b.normal, offB + hw);
      positions.push(al.x, ay, al.z, ar.x, ay, ar.z, bl.x, by, bl.z, br.x, by, br.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Diagonal rumble hashes just inside each fog line — the same kind of
 * trackside detail as Tecpro, but painted on the asphalt.
 */
export function createRumbleHatchGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const barLen = 0.72;
  const barW = 0.11;
  const spacing = 2.15;
  let v = 0;
  let arc = 0;
  let nextAt = 0;

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    arc += b.position.distanceTo(a.position);
    if (arc < nextAt) continue;
    nextAt += spacing;
    const y = a.position.y + 0.053;
    for (const side of [-1, 1] as const) {
      const inset = a.width / 2 - 0.55;
      const along = a.tangent.clone().normalize();
      const n = a.normal;
      const base = a.position.clone().addScaledVector(n, inset * side);
      const p0 = base.clone().addScaledVector(along, -barLen * 0.5).addScaledVector(n, -barW);
      const p1 = base.clone().addScaledVector(along, -barLen * 0.5).addScaledVector(n, barW);
      const p2 = base.clone().addScaledVector(along, barLen * 0.5).addScaledVector(n, -barW);
      const p3 = base.clone().addScaledVector(along, barLen * 0.5).addScaledVector(n, barW);
      positions.push(p0.x, y, p0.z, p1.x, y, p1.z, p2.x, y, p2.z, p3.x, y, p3.z);
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Forward chevrons / direction arrows along the racing line. */
export function createDirectionArrowGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let v = 0;
  let arc = 0;
  let nextAt = 28;

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    arc += b.position.distanceTo(a.position);
    if (arc < nextAt) continue;
    nextAt += 72;
    const y = a.position.y + 0.054;
    const along = a.tangent.clone().normalize();
    const n = a.normal;
    const tip = a.position.clone().addScaledVector(along, 1.55);
    const left = a.position
      .clone()
      .addScaledVector(along, -0.85)
      .addScaledVector(n, 0.72);
    const right = a.position
      .clone()
      .addScaledVector(along, -0.85)
      .addScaledVector(n, -0.72);
    const innerL = a.position
      .clone()
      .addScaledVector(along, -0.25)
      .addScaledVector(n, 0.18);
    const innerR = a.position
      .clone()
      .addScaledVector(along, -0.25)
      .addScaledVector(n, -0.18);
    positions.push(
      tip.x, y, tip.z,
      left.x, y, left.z,
      innerL.x, y, innerL.z,
      tip.x, y, tip.z,
      innerR.x, y, innerR.z,
      right.x, y, right.z,
    );
    indices.push(v, v + 1, v + 2, v + 3, v + 4, v + 5);
    v += 6;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Start-grid chevrons in the first ~30 m — extra paint at lights-out. */
export function createStartChevronGeometry(
  samples: RoadSample[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let v = 0;
  let arc = 0;

  for (let i = 0; i < samples.length - 1 && arc < 32; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    arc += b.position.distanceTo(a.position);
    if (i % 3 !== 0) continue;
    const y = a.position.y + 0.054;
    const along = a.tangent.clone().normalize();
    const n = a.normal;
    for (const side of [-1, 1] as const) {
      const origin = a.position.clone().addScaledVector(n, side * (a.width * 0.28));
      const tip = origin.clone().addScaledVector(along, 1.1);
      const backL = origin
        .clone()
        .addScaledVector(along, -0.55)
        .addScaledVector(n, side * 0.45);
      const backR = origin
        .clone()
        .addScaledVector(along, -0.55)
        .addScaledVector(n, side * -0.12);
      positions.push(
        tip.x, y, tip.z,
        backL.x, y, backL.z,
        backR.x, y, backR.z,
      );
      indices.push(v, v + 1, v + 2);
      v += 3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function getRouteBounds(route: RouteData) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of route.roadPoints) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}
