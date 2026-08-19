# Data sources and licences

## Current Canary Wharf vertical slice

| Data | Provider | Licence | Use |
| --- | --- | --- | --- |
| Road centreline, road tags, nearby building footprints | OpenStreetMap contributors | ODbL | Cached local source data and generated route geometry |
| City environment preset | Poly Haven through Drei/pmndrs | CC0 1.0 | Runtime image-based lighting only |
| Road, vehicle, building, and street-furniture geometry | DriveAnywhere.ai | Original procedural work | Browser-rendered prototype assets |

Visible attribution is retained in the game interface and generated route records:

`© OpenStreetMap contributors`

## Prohibited sources

The project does not scrape, download, reconstruct, train from, or bake Google Street View or Google Earth imagery/assets.

## OSM provenance

Each generated real route records:

- provider and licence;
- source cache path;
- retrieval timestamp;
- OSM way identifiers;
- original WGS84 road and building geometry;
- the projection origin;
- gameplay-only adjustments made after source ingestion.

## Future sources

Elevation, street imagery, and third-party models are not yet part of this route. Each must be added through a typed provider adapter, documented here, and checked for commercial-use compatibility before it reaches a distributable build.
