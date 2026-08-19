import * as THREE from "three";

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function configureRoadTexture(
  texture: THREE.CanvasTexture,
  repeatX: number,
  repeatY: number,
  colorSpace = false,
): THREE.CanvasTexture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Charcoal asphalt with aggregate, tyre wear, and oil stains — tuned so white
 * paint pops while the deck still reads as tarmac from the chase cam.
 */
export function createAsphaltTextures(): {
  color: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const size = 512;
  const colourCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  const normalCanvas = document.createElement("canvas");
  colourCanvas.width = colourCanvas.height = size;
  roughnessCanvas.width = roughnessCanvas.height = size;
  normalCanvas.width = normalCanvas.height = size;
  const colour = colourCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const normal = normalCanvas.getContext("2d");
  if (!colour || !roughness || !normal) {
    return {
      color: new THREE.CanvasTexture(colourCanvas),
      roughness: new THREE.CanvasTexture(roughnessCanvas),
      normal: new THREE.CanvasTexture(normalCanvas),
    };
  }

  const rng = random(0x41535048);
  const colourImage = colour.createImageData(size, size);
  const roughnessImage = roughness.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let pixel = 0; pixel < size * size; pixel += 1) {
    const x = pixel % size;
    const y = (pixel / size) | 0;
    const nx = x / size;
    const ny = y / size;

    // Fine aggregate grain
    const grain = (rng() - 0.5) * 22;
    // Occasional bright stone chip
    const chip = rng() > 0.985 ? 18 + rng() * 22 : 0;
    // Oil / patch darkening
    const oil = rng() > 0.994 ? -18 - rng() * 14 : 0;
    // Large-scale mottling
    const mottling =
      Math.sin(x * 0.011 + y * 0.007) * 6 +
      Math.sin(x * 0.029 - y * 0.019) * 4 +
      Math.sin(x * 0.003 + y * 0.004) * 5;
    // Longitudinal tyre wear tracks (darker polished lanes)
    const laneA = Math.exp(-Math.pow((nx - 0.28) * 7.5, 2)) * 4;
    const laneB = Math.exp(-Math.pow((nx - 0.72) * 7.5, 2)) * 4;
    const wear = -(laneA + laneB) * (0.25 + 0.25 * Math.sin(ny * Math.PI * 14));

    const base = 148 + grain * 0.55 + chip + oil * 0.5 + mottling + wear;
    const offset = pixel * 4;
    colourImage.data[offset] = Math.max(118, Math.min(198, base));
    colourImage.data[offset + 1] = Math.max(120, Math.min(200, base + 2));
    colourImage.data[offset + 2] = Math.max(124, Math.min(204, base + 5));
    colourImage.data[offset + 3] = 255;

    // Polished tyre lanes are smoother (lower roughness value in map = smoother if used as roughness)
    const polish = (laneA + laneB) * 1.4;
    const rough = Math.max(
      90,
      Math.min(
        250,
        215 - grain * 1.6 + (oil < 0 ? -50 : 0) + chip * 0.5 - polish * 6,
      ),
    );
    roughnessImage.data[offset] = rough;
    roughnessImage.data[offset + 1] = rough;
    roughnessImage.data[offset + 2] = rough;
    roughnessImage.data[offset + 3] = 255;

    height[pixel] =
      (grain + chip * 0.85 + oil * 0.5 + mottling * 0.3 + wear * 0.15) / 48;
  }
  colour.putImageData(colourImage, 0, 0);
  roughness.putImageData(roughnessImage, 0, 0);

  // Tar seams / crack network
  colour.strokeStyle = "rgba(70,74,80,0.28)";
  colour.lineWidth = 1.4;
  for (let index = 0; index < 16; index += 1) {
    colour.beginPath();
    colour.moveTo(rng() * size, rng() * size);
    colour.bezierCurveTo(
      rng() * size,
      rng() * size,
      rng() * size,
      rng() * size,
      rng() * size,
      rng() * size,
    );
    colour.stroke();
  }

  // Repair patches
  for (let index = 0; index < 9; index += 1) {
    const px = rng() * size;
    const py = rng() * size;
    const pw = 28 + rng() * 70;
    const ph = 16 + rng() * 40;
    colour.fillStyle = "rgba(130,136,144,0.35)";
    colour.fillRect(px, py, pw, ph);
    colour.strokeStyle = "rgba(90,94,100,0.4)";
    colour.lineWidth = 1.5;
    colour.strokeRect(px, py, pw, ph);
  }

  // Soft longitudinal sheen in the wheel tracks
  for (const laneX of [size * 0.28, size * 0.72]) {
    const grad = colour.createLinearGradient(laneX - 40, 0, laneX + 40, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.045)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    colour.fillStyle = grad;
    colour.fillRect(laneX - 40, 0, 80, size);
  }

  const normalImage = normal.createImageData(size, size);
  const strength = 1.6;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const dx = (left - right) * strength;
      const dy = (up - down) * strength;
      const dz = 1;
      const len = Math.hypot(dx, dy, dz) || 1;
      const offset = (y * size + x) * 4;
      normalImage.data[offset] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 3] = 255;
    }
  }
  normal.putImageData(normalImage, 0, 0);

  // Road mesh U: across width (tile a few times), V: along arc (~5 m per unit).
  return {
    color: configureRoadTexture(
      new THREE.CanvasTexture(colourCanvas),
      2.4,
      1,
      true,
    ),
    roughness: configureRoadTexture(
      new THREE.CanvasTexture(roughnessCanvas),
      2.4,
      1,
    ),
    normal: configureRoadTexture(new THREE.CanvasTexture(normalCanvas), 2.4, 1),
  };
}

/**
 * Paved sidewalk slabs — lighter than asphalt, with mortar joints.
 */
export function createSidewalkTextures(): {
  color: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const size = 512;
  const colourCanvas = document.createElement("canvas");
  const roughnessCanvas = document.createElement("canvas");
  const normalCanvas = document.createElement("canvas");
  colourCanvas.width = colourCanvas.height = size;
  roughnessCanvas.width = roughnessCanvas.height = size;
  normalCanvas.width = normalCanvas.height = size;
  const colour = colourCanvas.getContext("2d");
  const roughness = roughnessCanvas.getContext("2d");
  const normal = normalCanvas.getContext("2d");
  if (!colour || !roughness || !normal) {
    return {
      color: new THREE.CanvasTexture(colourCanvas),
      roughness: new THREE.CanvasTexture(roughnessCanvas),
      normal: new THREE.CanvasTexture(normalCanvas),
    };
  }

  const rng = random(0x53494445);
  const slab = 64;
  const joint = 3;
  const height = new Float32Array(size * size);

  colour.fillStyle = "#6a6e74";
  colour.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += slab) {
    for (let x = 0; x < size; x += slab) {
      const shade = 145 + Math.round((rng() - 0.5) * 28);
      colour.fillStyle = `rgb(${shade},${shade + 2},${shade + 4})`;
      colour.fillRect(x + joint, y + joint, slab - joint * 2, slab - joint * 2);
      // Soft bevel
      colour.fillStyle = "rgba(255,255,255,0.08)";
      colour.fillRect(x + joint, y + joint, slab - joint * 2, 2);
      colour.fillStyle = "rgba(0,0,0,0.1)";
      colour.fillRect(
        x + joint,
        y + slab - joint - 2,
        slab - joint * 2,
        2,
      );
    }
  }

  // Mortar grooves
  colour.fillStyle = "#4a4e54";
  for (let i = 0; i <= size; i += slab) {
    colour.fillRect(0, i, size, joint);
    colour.fillRect(i, 0, joint, size);
  }

  const colourImage = colour.getImageData(0, 0, size, size);
  const roughnessImage = roughness.createImageData(size, size);
  for (let pixel = 0; pixel < size * size; pixel += 1) {
    const r = colourImage.data[pixel * 4];
    const isJoint = r < 100;
    const rough = isJoint ? 230 : 170 + (rng() * 40) | 0;
    roughnessImage.data[pixel * 4] = rough;
    roughnessImage.data[pixel * 4 + 1] = rough;
    roughnessImage.data[pixel * 4 + 2] = rough;
    roughnessImage.data[pixel * 4 + 3] = 255;
    height[pixel] = isJoint ? -0.35 : (r - 145) / 80;
  }
  roughness.putImageData(roughnessImage, 0, 0);

  const normalImage = normal.createImageData(size, size);
  const strength = 4.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const dx = (left - right) * strength;
      const dy = (up - down) * strength;
      const dz = 1;
      const len = Math.hypot(dx, dy, dz) || 1;
      const offset = (y * size + x) * 4;
      normalImage.data[offset] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      normalImage.data[offset + 3] = 255;
    }
  }
  normal.putImageData(normalImage, 0, 0);

  return {
    color: configureRoadTexture(
      new THREE.CanvasTexture(colourCanvas),
      1.2,
      1.2,
      true,
    ),
    roughness: configureRoadTexture(
      new THREE.CanvasTexture(roughnessCanvas),
      1.2,
      1.2,
    ),
    normal: configureRoadTexture(
      new THREE.CanvasTexture(normalCanvas),
      1.2,
      1.2,
    ),
  };
}
