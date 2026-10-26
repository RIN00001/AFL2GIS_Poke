# GIS readiness check — 25 October 2026

Scope: current assignment requirements relayed by the user, checked against the [team proposal](https://docs.google.com/document/d/1gFdK6-ZAbQMl1h5X1VpLAOoDld7UQuKD4UimivYkEkQ/edit?tab=t.0), read from Drive (modified 24 October). Local starting commit: `9f7c627`; working tree was clean. This is an engineering verification, not a guarantee of lecturer acceptance.

| Requirement | Status | Evidence |
|---|---|---|
| At least two spatial layers | PASS | Eight named place Points and eight Pokemon Points. `data/editable/places.geojson`, `outputs/places.geojson`, `outputs/pokemon.geojson`. Both saved point layers use EPSG:4326. Python is the editable spawn source; its GeoJSON is regenerated. |
| At least two GIS operations | PASS | `backend/app/gis/places.py`: `to_crs(32749)`, 20 m buffer, then GeoPandas `sjoin(..., predicate='intersects')`. Notebook displays place table and joined rows. Player buffers are additional GIS evidence. |
| Place names/categories and game hints | PASS | Source-recorded places, names and categories; all eight spawns join to a place. `Charizard ada di Hokky Supermarket` is computed from the join and rendered in the game. Purple 20 m rings are visible. |
| Degrees versus metres | PASS | Source 4326 degrees; operations in 32749 metres. Local scene offsets are documented. Metric buffer area, distance/CRS round-trip and exact capture-boundary tests pass. |
| Overlap handling and unique counts | PASS | Left join preserves multiple place matches and unmatched points. Synthetic overlap test produces two matches for one spawn; unique IDs avoid double counting. |
| Clear reproducible scenario | PASS | Same collision-safe campus start and all spawns, 30 m versus 60 m. Actual result: 1 (Pikachu, 12.39 m) versus 2 (adds Squirtle, 41.66 m). Counts are calculated, not hardcoded. |
| Lecturer-readable geographic map | PASS | Offline OSM roads/buildings, named reference points, labeled spawns, place zones, contrasting catch rings, legend, north arrow, 100 m overview and 50 m close-up scale bars. Both SVGs rendered in isolated headless Edge and visually inspected; clipped/crowded labels corrected. |
| Python notebook plus results | PASS | `notebooks/spatial_analysis.ipynb`: seven executed code cells numbered 1–7; HTML tables, two embedded SVG maps, generated interpretation; reopened, validated, no error outputs. CSV and GeoJSON exports in `outputs/`. |
| Movement/capture integration | PASS | Collision/movement/API tests pass. Each spawn has a collision-safe candidate position within 30 m. Browser test verifies capture, actual coordinate movement and reload preserving collection. |
| No external map API required | PASS | Retained local OSM extract; no key, GPS or live tile server needed. |

## Commands and results

Run from the project root in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r notebooks/requirements.txt
.\.venv\Scripts\python.exe scripts/run_notebook.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m pip check
git diff --check
```

Notebook execution/readback: PASS. Unit/API suite: 16/16 PASS. Dependency consistency: PASS. Whitespace check: PASS. The missing notebook tools were installed into `.venv`; existing project packages were not upgraded. Existing Shapely/Starlette deprecation warnings remain; they do not cause failures.

Browser integration uses `tests/visual_preview.py` on localhost:8001 with an in-memory collection and no real save writes. `tests/browser_gis.cjs` connects only to an isolated headless Edge target on localhost:9229. Do not run it against the regular game server. Visual QA screenshots are `outputs/analysis_map.png`, `outputs/analysis_detail.png` and `outputs/game_gis.png` (ignored by Git).

`node tests/browser_gis.cjs`: PASS — eight hints, scenario comparison, capture, movement, reload preserving collection, no uncaught browser exceptions. The initial movement assertion ran while the capture animation was still active; the test now waits for capture completion and passes without a gameplay change.

## Changes and limits to explain

The previous implementation joined spawns to synthetic habitat polygons. The proposal instead specifies named place points buffered 20 m. That gap is now implemented; habitats remain supplementary. Spawn placements changed explicitly to named places, including Charizard at Hokky. Squirtle moved to UC Apartment; its distance is now 41.66 m rather than 55.46 m. The 30/60 m count happens to remain 1/2 after the changes.

The selected eight places have provenance in the GeoJSON. UC Loop is an OSM bus stop; UC Walk and Plaza were not verified in the local extract, so their coordinates were not invented. The proposal describes examples, not a mandatory exhaustive list. If the lecturer requires those exact additional places, obtain verified coordinates before adding them.

Real-world business accuracy, entrances and walking access are unverified. Polygon-derived pins are representative interior points, not entrances. Pokemon are fictional. Distance is straight-line; capture can pass through walls. Place buffers are 256-segment polygon approximations. This is not routing/network analysis. Full manual playthrough, all-device/mobile QA and lecturer acceptance are not claimed. No proposal edits, push or submission were performed.
