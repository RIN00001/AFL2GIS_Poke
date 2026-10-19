# Geographic provenance

All source and editable GeoJSON coordinates use EPSG:4326, longitude first. The application transforms them to EPSG:32749 for analysis.

| Layer | Source | Meaning |
|---|---|---|
| paths | OpenStreetMap map API extract | Highway-tagged ways, including paths and service roads |
| buildings | OpenStreetMap map API extract | Closed building ways; default visual height 7 m |
| landcover | OpenStreetMap map API extract | Selected closed landuse/water/university/hospital ways |
| habitats | Generated for assignment | Synthetic gameplay zones, not actual land-use boundaries |
| play_area | Generated for assignment | Synthetic rectangular game boundary |
| spawns | `backend/app/game/spawns.py` | Synthetic creature points defined by geographic coordinates or meter offsets |

OSM endpoint: https://api.openstreetmap.org/api/0.6/map
Extract bounds (south, west, north, east): -7.291, 112.625, -7.277, 112.641.
Exact retrieval time is recorded in `original/download_metadata.json`. The original XML is retained. Imported polygon geometry does not assemble OSM multipolygon relations; coverage is incomplete by design.

University reference pin: longitude 112.631500, latitude -7.285631, from Indonesia's education reference page: https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/071071

Hospital reference pin: longitude 112.6346424, latitude -7.2811676, approximate listed map position: https://medicastore.com/faskes/detail?faskes=rumah-sakit-ciputra-surabaya-Mjg0MTA2Mjk%3D
Hospital address corroboration: https://ciputrahospital.com/surabaya/hubungi-kami/

These are reference points, not verified entrances. Habitats and creature placements do not claim survey accuracy. Real-world access restrictions are not modeled.

Attribution: © OpenStreetMap contributors. Map data under ODbL 1.0: https://www.openstreetmap.org/copyright . Retain attribution and applicable database-license obligations when sharing the extract.
