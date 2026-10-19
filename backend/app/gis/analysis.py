"""Reusable GIS operations for the server AND the submitted notebook."""
import geopandas as gpd
from shapely.geometry import Point, shape
from .coordinates import ANALYSIS_CRS, ORIGIN_E, ORIGIN_N

def eligible(player, spawns, radius):
    # Distance <= radius explicitly includes the exact circular boundary.
    return [s['id'] for s in spawns if Point(player).distance(Point(s['x'], s['y'])) <= radius + 1e-8]

def buffer_ring(player, radius):
    return list(Point(player).buffer(radius, quad_segs=64).exterior.coords)

def habitat_join(spawns, habitats):
    # Add the origin back so these are actual EPSG:32749 coordinates.
    from shapely.affinity import translate
    points = gpd.GeoDataFrame({'spawn_id': [s['id'] for s in spawns]}, geometry=[Point(s['x'] + ORIGIN_E, s['y'] + ORIGIN_N) for s in spawns], crs=ANALYSIS_CRS)
    polygons = gpd.GeoDataFrame({'habitat': [f['properties']['name'] for f in habitats['features']]}, geometry=[translate(shape(f['geometry']), ORIGIN_E, ORIGIN_N) for f in habitats['features']], crs=ANALYSIS_CRS)
    joined = gpd.sjoin(points, polygons, how='left', predicate='intersects')
    result = {s['id']: [] for s in spawns}
    for row in joined.itertuples():
        if isinstance(row.habitat, str):
            result[row.spawn_id].append(row.habitat)
    return result

def compare_scenarios(player, spawns, baseline=30, alternative=60):
    return [{'radius_m': r, 'unique_catchable': len(eligible(player, spawns, r)), 'spawn_ids': eligible(player, spawns, r)} for r in [baseline, alternative]]
