# Ciputra Field Dex

A local, offline Pokémon-style GIS collection game around Universitas Ciputra Surabaya and Ciputra Hospital. Eight simplified procedural 3D Pokémon, WASD movement, press E to catch, and a saved Pokédex. This is a classroom prototype, not a navigation tool.

## Start on this computer

The `.venv` environment is already installed. In PowerShell, from this folder:

```powershell
.\scripts\start-local.ps1
```

Open **http://127.0.0.1:8000**. Keep the terminal running. Stop with Ctrl+C. If PowerShell blocks scripts, run the equivalent directly:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

On another computer, install Python 3.11+ and run `scripts/setup.ps1` once while online. Do not copy `.venv` between computers. Map data, rendering library, and models are already local. No npm install, Google key, or cloud service is needed.

## Play

- WASD or arrow keys: move east/west/north/south inside the dashed boundary.
- E or the catch button: catch the nearest eligible Pokémon, within 30 m.
- View whole area: overview of campus and hospital; switch back to follow.
- + / −: zoom. Show habitats: toggle synthetic game polygons.
- Sound on/off: locally synthesized footsteps, proximity chime, catch swoosh, and discovery fanfare. Audio starts after a click or key press; the preference is saved in this browser.
- Player steps/arm swings, Pokémon idle motion, Charizard wing flaps, capture-ball arcs, particles, and discovery banners are visual only. System reduced-motion preferences disable decorative motion.
- Reload Python: reload spawn source, configuration, and GeoJSON without restarting.
- Compare scenarios: same current position, all spawns, 30 m versus 60 m.
- Reset expedition: clear collection and return to campus after confirmation.
- Save location: `outputs/save.json`. Collection persists across restarts; player position resets to campus.

## Move Charizard in Python

Edit **backend/app/game/spawns.py**. Change the Charizard row:

```python
dict(id='charizard_01', species='Charizard', kind='Fire', color='#ed9156',
     landmark='university', offset=(-25, -20)),
```

Save, then click **Reload Python**. `offset` is `(east_m, north_m)` relative to the landmark. Use `coordinates=(longitude, latitude)` for an explicit geographic location; it overrides landmark/offset. Keep IDs stable. A caught spawn stays caught after reload; use Reset expedition to see it again.

## Structure

```text
config/                 Catch radius, movement speed, scenario settings
data/original/          Original OSM extract and download metadata
data/editable/          Roads, buildings, landcover, habitats, play boundary
backend/app/gis/        CRS transformations, geometry loading, buffer/join analysis
backend/app/game/       Editable spawns, movement, catch rules, save handling
backend/app/main.py     Local API and static file server
frontend/src/map/       Geographic layer rendering
frontend/src/scene/     Original procedural 3D models
frontend/src/controls/  Keyboard input
frontend/src/api/       Communication with Python
frontend/src/main.js    Scene/UI coordination
frontend/public/vendor/ Locally bundled Three.js and MIT license
notebooks/             Reproducible analysis using the same Python functions
tests/                 Geometry, movement, and API checks
outputs/               Scenario CSV, map SVG, saved progress
docs/                  Live coding guide, Q&A, source and asset credits
scripts/               Start, setup, offline analysis, optional downloads
```

## GIS design

Data is EPSG:4326 (longitude, latitude). pyproj converts to EPSG:32749 (UTM 49S) before measurement. The scene subtracts a fixed projected origin for small local coordinates; north maps to negative Three.js Z. Analysis restores full UTM coordinates for GeoPandas tables.

Python builds a buffer and computes exact projected distance for eligibility (distance <= radius, including the edge). The drawn buffer approximates the circle with 256 segments. GeoPandas spatial join assigns spawn points to intersecting habitat polygons, including polygon edges. Overlapping habitats may produce multiple matches; counts use unique spawn IDs.

The backend owns position and catch decisions; JavaScript sends input direction and renders results. The default 32 m/s speed is deliberately accelerated for demonstrations. Movement checks the entire path against building polygons and the outer boundary, with a configurable 3 m player radius. Diagonal input slides along an unblocked axis. It does not snap to roads. The server is intended for a single local player; all tabs share the same session.

## Reproduce analysis and tests

```powershell
.\.venv\Scripts\python.exe scripts/analyze.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The notebook in `notebooks/` uses the same functions. Open with VS Code Jupyter or JupyterLab and select `.venv` as kernel (install `ipykernel` if needed). It generates a result CSV and a standalone SVG map with labels, legend, units, and layer order. Notebook tools are optional; the script works in the installed environment.

## Limitations

OSM coverage may be incomplete or outdated. Only simple closed ways are imported as polygons; multipolygon relations are not assembled. Building heights default to 7 m if unavailable and are visual approximations. Landmark pins are approximate reference locations, not entrances. Habitats, spawn positions, and playable boundary are synthetic. Buildings block movement, but catch distance remains planar proximity and can pass through walls; it is not travel distance or accessibility. Models are oversized, simplified fan-art primitives. Credits and provenance: `data/sources.md` and `docs/asset_credits.md`.
