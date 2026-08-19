import { readFile } from "node:fs/promises";
import path from "node:path";
import type { OverpassResponse } from "../../lib/geo/route-generation-types";

function lengthMetres(geometry: Array<{ lat: number; lon: number }>): number {
  let metres = 0;
  for (let index = 1; index < geometry.length; index += 1) {
    const a = geometry[index - 1];
    const b = geometry[index];
    const latitudeRadians = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    const north = (b.lat - a.lat) * 111_320;
    const east = (b.lon - a.lon) * 111_320 * Math.cos(latitudeRadians);
    metres += Math.hypot(north, east);
  }
  return metres;
}

async function main() {
  const filePath = path.join(
    process.cwd(),
    "data/routes/canary-wharf/raw/osm-area.json",
  );
  const data = JSON.parse(await readFile(filePath, "utf8")) as OverpassResponse;
  const targetName = process.argv[2]?.toLowerCase();

  for (const element of data.elements) {
    if (element.type !== "way" || !element.geometry || !element.tags?.highway) continue;
    const name = element.tags.name ?? "(unnamed)";
    if (targetName && !name.toLowerCase().includes(targetName)) continue;
    const first = element.geometry[0];
    const last = element.geometry.at(-1);
    console.info(
      [
        element.id,
        name,
        element.tags.highway,
        `${Math.round(lengthMetres(element.geometry))}m`,
        `access=${element.tags.access ?? "default"}`,
        `operator=${element.tags.operator ?? "none"}`,
        `oneway=${element.tags.oneway ?? "no"}`,
        `layer=${element.tags.layer ?? element.tags.level ?? "0"}`,
        `${first.lat.toFixed(6)},${first.lon.toFixed(6)}`,
        `${last?.lat.toFixed(6)},${last?.lon.toFixed(6)}`,
      ].join("\t"),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
