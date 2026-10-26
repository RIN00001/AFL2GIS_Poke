"""Proposal GIS: named place points -> 20 m zones -> Pokemon/place spatial join."""
import json

import geopandas as gpd
from shapely.affinity import translate
from shapely.geometry import Point, mapping

from .coordinates import SOURCE_CRS, ANALYSIS_CRS, ORIGIN_E, ORIGIN_N
from .layers import ROOT

PLACE_RADIUS_M = 20


def place_analysis(spawns):
    raw = json.loads((ROOT / 'data/editable/places.geojson').read_text(encoding='utf-8'))
    places = gpd.GeoDataFrame.from_features(raw['features'], crs=SOURCE_CRS).to_crs(ANALYSIS_CRS)
    if places.empty or places['id'].duplicated().any() or not places.geometry.geom_type.eq('Point').all():
        raise ValueError('Places must be nonempty Point features with unique IDs.')
    if places[['name', 'category']].isna().any().any() or not places.geometry.is_valid.all():
        raise ValueError('Places need valid geometry, name and category.')
    zones = places[['id', 'name', 'category', 'geometry']].rename(columns={'id': 'place_id', 'name': 'place_name'}).copy()
    zones.geometry = zones.geometry.buffer(PLACE_RADIUS_M, quad_segs=64)
    pokemon = gpd.GeoDataFrame({'spawn_id': [s['id'] for s in spawns]},
                              geometry=[Point(s['x'] + ORIGIN_E, s['y'] + ORIGIN_N) for s in spawns], crs=ANALYSIS_CRS)
    joined = gpd.sjoin(pokemon, zones, how='left', predicate='intersects')
    memberships = {s['id']: [] for s in spawns}
    for row in joined.itertuples():
        if isinstance(row.place_name, str):
            memberships[row.spawn_id].append(row.place_name)
    return places, zones, joined, memberships


def local_features(frame):
    """Serialize full UTM analysis geometry as local scene metres, without a false CRS label."""
    return {'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': row.drop(labels='geometry').to_dict(),
         'geometry': mapping(translate(row.geometry, -ORIGIN_E, -ORIGIN_N))}
        for _, row in frame.iterrows()]}
