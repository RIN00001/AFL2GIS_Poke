# Assets and sources

Everything needed to play is served locally. The source links below open only when clicked; they are not required by the game.

- **Map geometry and pin locations:** `data/manual_scene.json`, based on manual campus/Hokky reference tracing. The former pixel tracing was approximately calibrated to EPSG:4326; local distance calculations use EPSG:32749. Coordinate precision and calibration fit do not establish survey accuracy. Building heights, trees and small architectural details are illustrative decoration.
- **Three.js 0.180.0:** [Three.js](https://github.com/mrdoob/three.js), MIT license bundled at `frontend/public/vendor/LICENSE`.
- **Player and five creature models:** original procedural low-poly fan art in `frontend/src/scene/models.js`. Portraits are rendered from these same models. Pokémon names and characters belong to their respective owners; this is an unofficial classroom project.
- **Species effects and animation:** original code-generated lightning, bubbles, leaves, stars and embers in `frontend/src/scene/elemental.js`, with species choreography in `personality.js`. No downloaded animation clips or game assets. Blinking, tail motion, cheek glow, wing motion and themed portrait cards use the same local models.
- **Audio:** original Web Audio oscillator and filtered-noise synthesis in `frontend/src/audio/sound.js`. No official game recordings. Includes steps, discovery, scan, throw, impact, catch, completion and check-in cues, plus occasional quiet bird notes. Sound is opt-in, with remembered mute and volume settings.
- **Fonts:** local Segoe UI and Arial; no remote fonts.
- **Interface icons:** original inline SVG artwork in `frontend/src/icons.js`, including map, radar, Pokédex, sound and location controls. No external icon library or image service is required.
- **UC LOOP and Hill Parking:** original SVG illustrations in `frontend/public/landmarks/`. They are explicitly labelled illustrations rather than site photographs.

## Local reference photographs

These are credited source photographs, not assets licensed under the project's code license. A separate reuse license has not been established. The photo cards name the source and link to the original page.

| Local file | What it shows | Source |
|---|---|---|
| `frontend/public/landmarks/uc-main.jpg` | Universitas Ciputra campus courtyard | [Universitas Ciputra article](https://www.ciputra.ac.id/inilah-beberapa-universitas-swasta-di-surabaya-kamu-pilih-yang-mana/) |
| `frontend/public/landmarks/uc-tower.jpg` | Student lounge **inside** UC Tower | [Universitas Ciputra student lounge article](https://www.ciputra.ac.id/students-lounge-baru-uc-tower-yang-sarat-dengan-seni/) |
| `frontend/public/landmarks/hokky.jpg` | Hokky CitraLand opening, September 2024 | [Erajaya opening announcement](https://www.erajaya.com/news/gerai-terbaru-hokky-di-citraland-surabaya-resmi-dibuka) |

Photo and caption mappings are in `frontend/src/map/landmarks.js`. Replacing an image or its caption does not change a location: all coordinates come from `data/manual_scene.json`.

The current map is manually constructed. Earlier OpenStreetMap extracts and their unused import pipeline have been removed.
