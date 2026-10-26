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
| places | Retained OSM ways/nodes plus existing university reference pin | Named Point features with name, category and per-feature provenance in `data/editable/places.geojson` |

## Named-place analysis (October 25 readiness update)

`places.geojson` contains eight named points. Hokky Supermarket (way 548665386), UC Apartment (way 344100870) and Ciputra Hospital (way 344100866) use interior representative points calculated after projection to UTM 49S from the retained `osm.json` polygons. UC Loop (node 10785203505), Indomaret (5217656991), Pirates cafe (5300385308) and Ciputra Hospital B (12322231040) use recorded nodes from `osm.osm`. Universitas Ciputra retains the documented education reference pin below. Polygon representative points are analytical simplifications, not surveyed entrances. OSM names reflect the retained extract, not a fresh business verification.

UC Loop is a bus stop. UC Walk and Plaza were not verified in the local extract and are not invented or conflated with UC Loop. The proposal lists examples rather than a mandatory exhaustive inventory.

The main analysis buffers these points by 20 m in EPSG:32749 and joins synthetic Pokemon points with `intersects`. The original synthetic habitat join is retained as supplementary context. Spawn placements were changed explicitly to named place offsets (at most 20 m), including Charizard at Hokky. Python remains the editable spawn source; `scripts/analyze.py` exports the resulting point layer as `outputs/pokemon.geojson`, the place layer as `outputs/places.geojson`, and derived zones as `outputs/place_zones.geojson`, all in EPSG:4326. `outputs/place_join.csv` retains one row per match, including overlap duplicates and unmatched rows.

OSM endpoint: https://api.openstreetmap.org/api/0.6/map
Extract bounds (south, west, north, east): -7.291, 112.625, -7.277, 112.641.
Exact retrieval time is recorded in `original/download_metadata.json`. The original XML is retained. Imported polygon geometry does not assemble OSM multipolygon relations; coverage is incomplete by design.

University reference pin: longitude 112.631500, latitude -7.285631, from Indonesia's education reference page: https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/071071

Hospital reference pin: longitude 112.6346424, latitude -7.2811676, approximate listed map position: https://medicastore.com/faskes/detail?faskes=rumah-sakit-ciputra-surabaya-Mjg0MTA2Mjk%3D
Hospital address corroboration: https://ciputrahospital.com/surabaya/hubungi-kami/

These are reference points, not verified entrances. Habitats and creature placements do not claim survey accuracy. Real-world access restrictions are not modeled.

Attribution: © OpenStreetMap contributors. Map data under ODbL 1.0: https://www.openstreetmap.org/copyright . Retain attribution and applicable database-license obligations when sharing the extract.
