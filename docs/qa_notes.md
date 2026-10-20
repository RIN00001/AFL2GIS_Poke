# Q&A notes

**What makes this GIS?** Real geographic map features have coordinates and attributes. Python transforms CRS, creates distance buffers, joins points to habitat polygons, and compares spatial scenarios.

**Why EPSG:32749?** The study area is in WGS 84 / UTM zone 49 south. Its meter units are suitable for this small Surabaya area. EPSG:4326 uses angles; buffering degrees as if they were meters is incorrect.

**set_crs or to_crs?** Assigning CRS metadata does not transform numbers. Our pyproj Transformer computes new coordinates, equivalent in purpose to GeoPandas to_crs.

**What does the origin do?** Subtracting a fixed UTM easting/northing makes local scene numbers small. It preserves planar distances. It is not a new EPSG code. Full UTM coordinates are restored for GIS tables.

**What are the two operations?** A buffer around the player represents catch range. A GeoPandas spatial join links creature points to habitat polygons. Exact distance checks ensure circular boundary inclusion, and scenario comparisons count unique eligible IDs.

**Why not use the buffer polygon alone for catching?** A computer approximates a circle using straight segments. Direct distance <= radius avoids rejecting a mathematically exact boundary point between those vertices.

**What happens on a habitat boundary?** `intersects` includes the edge. `within` would exclude it. Overlapping polygons can produce multiple matches.

**How does collision work?** Python buffers obstacles by the player radius, shrinks the playable boundary, and checks each movement LineString against a spatial index of solid polygons. Checking the entire segment prevents tunneling through thin walls. If a diagonal move is blocked, a clear axis can slide along the wall. Catch distance remains straight-line distance and does not test walls.

**What runs in Python?** Coordinate transformations, source loading, movement validation, spatial join, catch range checks, collection persistence, and scenario analysis. JavaScript draws the scene and sends input.

**Is the map Google Maps?** No. Local OSM vector data is rendered with local Three.js. No runtime network map requests occur.

**What is synthetic?** Pokémon, habitats, play boundary, accelerated speed, and fallback building heights. The map layer comes from OSM; landmark points are approximate sourced references.

**Does completing the index prove geographic coverage?** No. It only means collecting the deliberately placed game entities. It does not measure real population access, safety, or service quality.
