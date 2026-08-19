import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  canaryWharfAreaQuery,
  OsmOverpassProvider,
} from "../../lib/geo/providers/osm-overpass-provider";
import type { OverpassResponse } from "../../lib/geo/route-generation-types";

const cachePath = path.join(
  process.cwd(),
  "data",
  "routes",
  "canary-wharf",
  "raw",
  "osm-area.json",
);

async function readCache(): Promise<OverpassResponse | null> {
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as OverpassResponse;
  } catch {
    return null;
  }
}

async function main() {
  const offline = process.argv.includes("--offline");
  const refresh = process.argv.includes("--refresh");
  const cached = refresh ? null : await readCache();

  if (cached) {
    console.info(
      `Using cached OSM area (${cached.elements.length} elements): ${cachePath}`,
    );
    return;
  }

  if (offline) {
    throw new Error(
      `No cache available at ${cachePath}. Run without --offline once to populate it.`,
    );
  }

  const provider = new OsmOverpassProvider();
  const response = await provider.query(canaryWharfAreaQuery());
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(response, null, 2)}\n`, "utf8");
  console.info(`Cached ${response.elements.length} OSM elements at ${cachePath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
