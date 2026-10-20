# Live coding rehearsal

Start the server, open the game, and keep `backend/app/game/spawns.py` visible in your editor.

| Professor asks | Edit | Apply |
|---|---|---|
| Move Charizard hospital → university | `landmark='university'` on Charizard row | Save → Reload Python |
| Move east by 50 m | Add 50 to spawn `offset[0]` | Save → Reload Python |
| Put a point at lon/lat | Add `coordinates=(112.6315, -7.285631)` | Save → Reload Python |
| Increase catch radius | `config/game.yaml`, `catch_radius_m: 60` | Save → Reload Python |
| Change a polygon | `data/editable/habitats.geojson`, edit longitude/latitude vertices | Close the ring → Save → Reload Python |
| Explain one-to-many joins | Make two habitats overlap | Show the habitat list for a spawn |
| Change baseline/alternative | `config/scenarios.yaml` | Click Compare scenarios |
| Change logic | `analysis.py`, `catching.py`, or `movement.py` | Stop/restart server; these modules are not hot-reloaded |

Keep each polygon's last coordinate equal to its first. Avoid self-intersections. Reload validates geometry and spawn bounds; bad edits preserve the previously loaded world and display an error. Restore the file and reload again.

Caught IDs remain collected after edits. Reset the expedition when demonstrating the same Pokémon again. Editing display colors never changes catch eligibility.

Suggested rehearsal: catch Pikachu, compare scenarios, move Charizard to campus, reload, reset, catch Charizard, change radius to 60, show the larger ring, and restore defaults. Explain the projected CRS before discussing distances.

## Polygon collision

Buildings are solid by default. In a feature properties object in `data/editable/buildings.geojson`, set `"collidable": false` to allow movement through that building. Set `"collidable": true` on a habitat or landcover polygon to make it solid. Save and click Reload Python. Habitat zones stay walkable unless explicitly made solid.

`config/game.yaml` controls `player_radius_m` (default 3 meters) and `collision_layers` (default `[buildings]`). `backend/app/game/collision.py` handles spatial indexing and safe positions; `movement.py` handles segment checks and sliding. Changes to geometry/config reload live; algorithm edits require restarting Python. An invalid reload retains the prior world. If a polygon covers the player, reload relocates them to the nearest clear point.
