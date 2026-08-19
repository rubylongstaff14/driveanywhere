import * as THREE from "three";

export type FacadeKind =
  | "glass"
  | "glass_vertical"
  | "glass_diagrid"
  | "brick"
  | "concrete"
  | "sandstone";

/** Seeded pseudo-random for deterministic textures (no random variation on re-render). */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Brick texture — proper offset row pattern with mortar and colour variation.
// ---------------------------------------------------------------------------
function drawBrick(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rand = seededRand(42);

  const W = canvas.width, H = canvas.height;
  const brickW = 22, brickH = 10, mortar = 2;

  // Mortar background
  ctx.fillStyle = "#8a8074";
  ctx.fillRect(0, 0, W, H);

  const rows = Math.ceil(H / (brickH + mortar));
  for (let row = 0; row < rows; row++) {
    const y = row * (brickH + mortar);
    const offsetX = (row % 2) * (brickW / 2 + mortar / 2);
    const cols = Math.ceil((W + brickW) / (brickW + mortar));
    for (let col = 0; col < cols; col++) {
      const x = col * (brickW + mortar) - offsetX;
      // Slight colour variation per brick
      const r = seededRand(row * 100 + col)();
      const br = Math.round(148 + r * 40);
      const bg = Math.round(78 + r * 28);
      const bb = Math.round(58 + r * 22);
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(x, y, brickW, brickH);

      // Soft bevel
      ctx.fillStyle = `rgba(255,255,255,0.1)`;
      ctx.fillRect(x, y, brickW, 1);
      ctx.fillRect(x + brickW - 1, y, 1, brickH);
      ctx.fillStyle = `rgba(0,0,0,0.16)`;
      ctx.fillRect(x, y + brickH - 1, brickW, 1);

      // Occasional soot / weathering blotch
      if (r > 0.88) {
        ctx.fillStyle = `rgba(40,28,22,${0.08 + r * 0.08})`;
        ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
      }
    }
  }

  // Window openings at regular intervals
  const winW = 16, winH = 20;
  const winCols = Math.floor(W / 34);
  const winRows = Math.floor(H / 40);
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = c * 34 + 8;
      const wy = r * 40 + 7;
      const lit = rand() > 0.5;
      // Deep reveal
      ctx.fillStyle = "#0c1018";
      ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
      ctx.fillStyle = lit ? "#f0d8a0" : "#1a2434";
      ctx.fillRect(wx, wy, winW, winH);
      if (lit) {
        const glow = ctx.createLinearGradient(wx, wy, wx, wy + winH);
        glow.addColorStop(0, "rgba(255,240,180,0.35)");
        glow.addColorStop(1, "rgba(255,200,100,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(wx, wy, winW, winH);
      }
      ctx.strokeStyle = "#6a5a48";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx - 1, wy - 1, winW + 2, winH + 2);
      ctx.fillStyle = "#6a5a48";
      ctx.fillRect(wx + winW / 2 - 0.5, wy, 1, winH);
      ctx.fillRect(wx, wy + winH / 2 - 0.5, winW, 1);
    }
  }

  // Ground floor: darker band, larger windows
  ctx.fillStyle = "#2e2018";
  ctx.fillRect(0, H - 42, W, 42);
  for (let c = 0; c < winCols; c++) {
    const wx = c * 34 + 3;
    ctx.fillStyle = "#7a98b8";
    ctx.fillRect(wx, H - 38, winW + 6, 30);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(wx + 2, H - 36, 4, 26);
  }
}

// ---------------------------------------------------------------------------
// Glass curtain wall — structural steel grid, occupied/dark panels.
// ---------------------------------------------------------------------------
function drawGlass(
  canvas: HTMLCanvasElement,
  variant: "standard" | "vertical" | "diagrid" = "standard",
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rand = seededRand(99);

  const W = canvas.width, H = canvas.height;
  // Larger modules ≈ real floor plates (~3.5 m) once tiled on tall shafts.
  const colW = 28, rowH = 36, frame = 3;

  const cols = Math.floor(W / colW);
  const rows = Math.floor(H / rowH);

  // Cool spandrel / curtain wall substrate
  ctx.fillStyle = "#1a2632";
  ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * colW + frame;
      const y = r * rowH + frame;
      const w = colW - frame * 2;
      const h = rowH - frame * 2 - 4; // leave spandrel band

      const rng = rand();
      if (rng > 0.82) {
        ctx.fillStyle = `rgba(245,220,150,${0.55 + rng * 0.35})`;
      } else if (rng > 0.62) {
        ctx.fillStyle = "#0a1218";
      } else if (rng > 0.28) {
        const v = Math.round(70 + rng * 70);
        ctx.fillStyle = `rgb(${Math.round(v * 0.48)},${Math.round(v * 0.68)},${v})`;
      } else {
        ctx.fillStyle = "#243240";
      }
      ctx.fillRect(x, y, w, h);

      if (rng > 0.28 && rng <= 0.82) {
        const grad = ctx.createLinearGradient(x, y, x + w * 0.55, y + h);
        grad.addColorStop(0, "rgba(255,255,255,0.18)");
        grad.addColorStop(0.45, "rgba(255,255,255,0.04)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
      }

      // Narrow horizontal muntin
      ctx.fillStyle = "rgba(90,110,128,0.55)";
      ctx.fillRect(x, y + h * 0.48, w, 1);
    }
  }

  // Mullions
  ctx.fillStyle = "#6a7888";
  for (let c = 0; c <= cols; c++) {
    ctx.fillRect(c * colW, 0, frame, H);
  }
  // Floor spandrels
  for (let r = 0; r <= rows; r++) {
    ctx.fillStyle = "#2e3c4a";
    ctx.fillRect(0, r * rowH + rowH - 5, W, 5);
    ctx.fillStyle = "#4a5868";
    ctx.fillRect(0, r * rowH, W, frame);
  }

  // Lobby band
  ctx.fillStyle = "#141c26";
  ctx.fillRect(0, H - 48, W, 48);
  for (let c = 0; c < cols; c++) {
    const grad = ctx.createLinearGradient(0, H - 44, 0, H - 8);
    grad.addColorStop(0, "#7aa8d0");
    grad.addColorStop(1, "#3a6088");
    ctx.fillStyle = grad;
    ctx.fillRect(c * colW + frame, H - 44, colW - frame * 2, 36);
  }

  if (variant === "vertical") {
    ctx.fillStyle = "rgba(210,225,235,0.7)";
    for (let x = 0; x < W; x += colW * 2) {
      ctx.fillRect(x, 0, 2, H);
    }
  }

  if (variant === "diagrid") {
    ctx.strokeStyle = "rgba(220,230,235,0.75)";
    ctx.lineWidth = 2.5;
    const spacing = 56;
    for (let x = -H; x < W + H; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + H, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Concrete panel facade — precast panels, weathering, narrow window strips.
// ---------------------------------------------------------------------------
function drawConcrete(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width, H = canvas.height;
  const panelH = 28, panelW = 48, joint = 2;

  // Base concrete colour
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#7a818e");
  grad.addColorStop(1, "#606872");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const rows = Math.ceil(H / (panelH + joint));
  const cols = Math.ceil(W / (panelW + joint));

  // Joint lines (darker inset groove)
  ctx.fillStyle = "#46505c";
  for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * (panelH + joint), W, joint);
  for (let c = 0; c <= cols; c++) ctx.fillRect(c * (panelW + joint), 0, joint, H);

  // Subtle panel texture (slight light/dark variation)
  const rand = seededRand(77);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (panelW + joint) + joint;
      const y = r * (panelH + joint) + joint;
      const v = rand() * 14 - 7;
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
      ctx.fillRect(x, y, panelW, panelH);
    }
  }

  // Narrow horizontal window strips every other floor
  const rand2 = seededRand(33);
  for (let r = 0; r < rows; r += 2) {
    const y = r * (panelH + joint) + joint + 6;
    const winH = 10;
    for (let c = 0; c < cols; c++) {
      const x = c * (panelW + joint) + joint + 4;
      const lit = rand2() > 0.5;
      ctx.fillStyle = lit ? "#d0c090" : "#12181e";
      ctx.fillRect(x, y, panelW - 8, winH);
    }
  }

  // Ground level base
  ctx.fillStyle = "#38404c";
  ctx.fillRect(0, H - 36, W, 36);
}

// ---------------------------------------------------------------------------
// Sandstone / limestone — desert & historic masonry with eroded blocks.
// ---------------------------------------------------------------------------
function drawSandstone(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rand = seededRand(61);

  const W = canvas.width;
  const H = canvas.height;

  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#e2c896");
  base.addColorStop(0.55, "#d4b078");
  base.addColorStop(1, "#c09860");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Soft dune-like banding
  for (let y = 0; y < H; y += 6) {
    const v = rand() * 18 - 9;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 80},${v > 0 ? 240 : 60},${v > 0 ? 200 : 30},${Math.abs(v) / 220})`;
    ctx.fillRect(0, y, W, 6);
  }

  const blockW = 48;
  const blockH = 22;
  const joint = 3;
  const rows = Math.ceil(H / (blockH + joint));
  const cols = Math.ceil(W / (blockW + joint));

  for (let row = 0; row < rows; row++) {
    const y = row * (blockH + joint);
    const offsetX = (row % 2) * (blockW / 2);
    for (let col = 0; col < cols + 1; col++) {
      const x = col * (blockW + joint) - offsetX;
      const r = seededRand(row * 80 + col)();
      const br = Math.round(190 + r * 35);
      const bg = Math.round(150 + r * 30);
      const bb = Math.round(95 + r * 25);
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(x, y, blockW, blockH);
      ctx.fillStyle = "rgba(255,245,220,0.12)";
      ctx.fillRect(x, y, blockW, 2);
      ctx.fillStyle = "rgba(80,50,20,0.18)";
      ctx.fillRect(x, y + blockH - 2, blockW, 2);
      // Pit / erosion speckles
      if (r > 0.7) {
        ctx.fillStyle = `rgba(90,60,30,${0.1 + r * 0.12})`;
        ctx.beginPath();
        ctx.arc(x + r * blockW, y + r * blockH, 2 + r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Mortar grooves
  ctx.fillStyle = "rgba(120,90,50,0.35)";
  for (let r = 0; r <= rows; r++) {
    ctx.fillRect(0, r * (blockH + joint), W, joint);
  }

  // Occasional dark arched niches (temple / tomb cue)
  for (let i = 0; i < 4; i++) {
    const nx = 40 + i * 90;
    const ny = 50 + (i % 2) * 80;
    ctx.fillStyle = "#5a4030";
    ctx.beginPath();
    ctx.moveTo(nx, ny + 36);
    ctx.lineTo(nx, ny + 10);
    ctx.quadraticCurveTo(nx + 14, ny - 4, nx + 28, ny + 10);
    ctx.lineTo(nx + 28, ny + 36);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function makeFacadeCanvas(kind: FacadeKind): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  if (kind === "brick") drawBrick(canvas);
  if (kind === "glass") drawGlass(canvas);
  if (kind === "glass_vertical") drawGlass(canvas, "vertical");
  if (kind === "glass_diagrid") drawGlass(canvas, "diagrid");
  if (kind === "concrete") drawConcrete(canvas);
  if (kind === "sandstone") drawSandstone(canvas);
  return canvas;
}

export interface FacadeMaps {
  color: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

function configureFacadeTexture(
  texture: THREE.CanvasTexture,
  colorTexture = false,
): THREE.CanvasTexture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // ExtrudeGeometry side UVs are measured in local world units (~metres).
  // Target ≈ one floor band every 3.4 m with ~14 floors packed into the atlas.
  texture.repeat.set(0.12, 0.085);
  texture.anisotropy = 4;
  if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Shared albedo, normal and lit-window maps for one facade family.
 * All buildings reuse these maps, so the added surface detail costs only
 * fifteen textures for the entire district rather than three per building.
 */
export function createFacadeMaps(kind: FacadeKind): FacadeMaps {
  const colorCanvas = makeFacadeCanvas(kind);
  const width = colorCanvas.width;
  const height = colorCanvas.height;
  const source = colorCanvas.getContext("2d")?.getImageData(0, 0, width, height);
  const normalCanvas = document.createElement("canvas");
  const emissiveCanvas = document.createElement("canvas");
  normalCanvas.width = emissiveCanvas.width = width;
  normalCanvas.height = emissiveCanvas.height = height;
  const normalContext = normalCanvas.getContext("2d");
  const emissiveContext = emissiveCanvas.getContext("2d");

  if (source && normalContext && emissiveContext) {
    const normalImage = normalContext.createImageData(width, height);
    const emissiveImage = emissiveContext.createImageData(width, height);
    const luminance = new Float32Array(width * height);

    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const offset = pixel * 4;
      const red = source.data[offset];
      const green = source.data[offset + 1];
      const blue = source.data[offset + 2];
      luminance[pixel] = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

      // Only warm, bright occupied windows emit. The old implementation used
      // the entire albedo as an emissive map, making walls and mullions glow.
      const lit = red > 175 && green > 145 && red > blue * 1.15;
      emissiveImage.data[offset] = lit ? red : 0;
      emissiveImage.data[offset + 1] = lit ? green : 0;
      emissiveImage.data[offset + 2] = lit ? Math.min(150, blue) : 0;
      emissiveImage.data[offset + 3] = 255;
    }

    const strength =
      kind === "brick"
        ? 5.2
        : kind === "sandstone"
          ? 4.0
          : kind === "concrete"
            ? 3.2
            : 2.0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const left = luminance[y * width + ((x - 1 + width) % width)];
        const right = luminance[y * width + ((x + 1) % width)];
        const up = luminance[((y - 1 + height) % height) * width + x];
        const down = luminance[((y + 1) % height) * width + x];
        const nx = (left - right) * strength;
        const ny = (up - down) * strength;
        const nz = 1;
        const length = Math.hypot(nx, ny, nz) || 1;
        const offset = (y * width + x) * 4;
        normalImage.data[offset] = Math.round(((nx / length) * 0.5 + 0.5) * 255);
        normalImage.data[offset + 1] = Math.round(((ny / length) * 0.5 + 0.5) * 255);
        normalImage.data[offset + 2] = Math.round(((nz / length) * 0.5 + 0.5) * 255);
        normalImage.data[offset + 3] = 255;
      }
    }

    normalContext.putImageData(normalImage, 0, 0);
    emissiveContext.putImageData(emissiveImage, 0, 0);
  }

  return {
    color: configureFacadeTexture(new THREE.CanvasTexture(colorCanvas), true),
    normal: configureFacadeTexture(new THREE.CanvasTexture(normalCanvas)),
    emissive: configureFacadeTexture(
      new THREE.CanvasTexture(emissiveCanvas),
      true,
    ),
  };
}
