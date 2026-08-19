import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attribution",
  description: "Data sources and attribution for DriveAnywhere.ai",
};

export default function AttributionPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl text-white">Attribution</h1>
      <p className="text-mist mt-4">
        DriveAnywhere.ai uses openly attributed mapping data and procedural
        placeholders. We do not scrape, bake, or redistribute Google Street View
        or Google Earth imagery.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl text-white">Current MVP sources</h2>
        <ul className="text-mist list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">
              OpenStreetMap-compatible sample data
            </strong>{" "}
            — local GeoJSON / route JSON inspired by real London layouts.
            Attribution: © OpenStreetMap contributors.
          </li>
          <li>
            <strong className="text-white">Procedural geometry</strong> — roads,
            buildings and scenery generated in-engine from route parameters.
          </li>
          <li>
            <strong className="text-white">Placeholder textures</strong> —
            locally stored or openly licensed assets only.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl text-white">Future-compatible sources</h2>
        <ul className="text-mist list-disc space-y-2 pl-5">
          <li>User-owned and self-captured imagery</li>
          <li>Properly licensed street imagery providers</li>
          <li>Open elevation datasets</li>
          <li>OpenStreetMap building footprints</li>
        </ul>
      </section>

      <p className="text-fog mt-10 font-mono text-sm">
        © OpenStreetMap contributors ·{" "}
        <a
          className="text-accent-bright underline-offset-4 hover:underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          openstreetmap.org/copyright
        </a>
      </p>
    </div>
  );
}
