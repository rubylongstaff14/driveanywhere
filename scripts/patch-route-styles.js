const fs = require("fs");

function facadeForStyle(style) {
  if (style === "glass_curtain_wall" || style === "steel_and_glass_tower")
    return "glass";
  if (style === "brick_commercial") return "brick";
  if (style === "landmark_placeholder") return "sandstone";
  if (
    style === "concrete_office" ||
    style === "modern_office" ||
    style === "warehouse" ||
    style === "retail_ground_floor"
  )
    return "concrete";
  if (style === "modern_office_podium") return "concrete";
  if (style === "apartment_block" || style === "contemporary_apartment")
    return "sandstone";
  if (style === "dockside_warehouse") return "concrete";
  return "brick";
}

function styleForTokyo(name, i) {
  const n = (name || "").toLowerCase();
  if (n.includes("109")) return "retail_ground_floor";
  if (
    n.includes("scramble") ||
    n.includes("hikarie") ||
    n.includes("midtown") ||
    n.includes("solasta")
  )
    return "glass_curtain_wall";
  if (n.includes("tower"))
    return n.includes("tokyo tower")
      ? "glass_curtain_wall"
      : "steel_and_glass_tower";
  if (
    n.includes("department") ||
    n.includes("takashimaya") ||
    n.includes("odakyu") ||
    n.includes("keio") ||
    n.includes("lumine")
  )
    return "retail_ground_floor";
  if (n.includes("hotel") || n.includes("park tower"))
    return "contemporary_apartment";
  if (n.includes("stadium")) return "warehouse";
  if (
    n.includes("park") ||
    n.includes("plaza") ||
    n.includes("hills") ||
    n.includes("commons")
  )
    return "modern_office_podium";

  // Procedural fallback for unnamed buildings.
  const m = i % 7;
  if (m === 0) return "steel_and_glass_tower";
  if (m === 1) return "glass_curtain_wall";
  if (m === 2) return "modern_office";
  if (m === 3) return "apartment_block";
  if (m === 4) return "contemporary_apartment";
  if (m === 5) return "retail_ground_floor";
  return "brick_commercial";
}

function styleForRio(name, i) {
  const n = (name || "").toLowerCase();
  if (n.includes("cathedral")) return "landmark_placeholder";
  if (n.includes("lapa")) return "brick_commercial";
  if (n.includes("museum of tomorrow") || n.includes("museum"))
    return "glass_curtain_wall";
  if (n.includes("edificio italia")) return "modern_office_podium";
  if (n.includes("bndes") || n.includes("petrobras"))
    return "modern_office";
  if (
    n.includes("copacabana") ||
    n.includes("hotel") ||
    n.includes("sheraton") ||
    n.includes("hilton")
  )
    return "concrete_office";
  if (
    n.includes("palace") ||
    n.includes("theatre") ||
    n.includes("municipal") ||
    n.includes("library")
  )
    return "brick_commercial";
  if (n.includes("church") || n.includes("candelaria"))
    return "landmark_placeholder";
  if (n.includes("tower")) return "modern_office";

  // Procedural fallback for unnamed buildings.
  const m = i % 6;
  if (m === 0) return "modern_office";
  if (m === 1) return "apartment_block";
  if (m === 2) return "retail_ground_floor";
  if (m === 3) return "brick_commercial";
  if (m === 4) return "concrete_office";
  return "warehouse";
}

function patchFile(slug, styleForFn) {
  const path = `public/routes/${slug}.json`;
  const d = JSON.parse(fs.readFileSync(path, "utf8"));

  let changed = 0;
  for (let i = 0; i < d.buildings.length; i++) {
    const b = d.buildings[i];
    const newStyle = styleForFn(b.name, i);
    const newFacade = facadeForStyle(newStyle);
    if (b.style !== newStyle) {
      b.style = newStyle;
      changed++;
    }
    if (b.facadeMaterial !== newFacade) {
      b.facadeMaterial = newFacade;
      changed++;
    }
  }

  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log(slug, "patched, changed entries=", changed);
  console.log(
    "styles now:",
    [...new Set(d.buildings.map((b) => b.style))].join(", "),
  );
}

patchFile("tokyo-drift-circuit", styleForTokyo);
patchFile("rio-coast-circuit", styleForRio);

