"""The web adaptation of the standalone notebook's manual geometry and rules."""
import json
import math
import geopandas as gpd
from shapely.affinity import translate
from shapely.geometry import Point, shape
from .coordinates import ANALYSIS_CRS, ORIGIN_LON_LAT, ORIGIN_E, ORIGIN_N, to_lonlat
from .layers import ROOT
from ..game.collision import CollisionMap

STYLE = {
    'pikachu': ('Electric', '#f2c942'), 'squirtle': ('Water', '#65b8db'),
    'bulbasaur': ('Grass', '#65b58e'), 'eevee': ('Normal', '#b68455'),
    'charizard': ('Fire', '#ef9051'),
}
LANDMARK_DETAILS = {
    'UC Main Building': ('Campus heart', 'A meeting point for the campus journey. The connected western footprint is manually traced from the campus reference; elevation is illustrative.', 'main'),
    'UC Tower': ('A new perspective', 'The eastern campus wing, identified in the user reference. Its outline is manually traced; elevation is illustrative.', 'new'),
    'UC LOOP': ('Meet along the loop', 'A reference point northwest of the main campus cluster. UC Loop is distinct from UC Walk.', 'loop'),
    'Hokky Supermarket': ('The eastern stop', 'Hokky sits southeast of the campus in this compact map. The market facade is an original schematic illustration.', 'market'),
    'UC Hill Parking': ('Open parking', 'A point marking the open parking area. It is not a roof or a building footprint.', 'parking'),
}

def collection(features):
    return {'type': 'FeatureCollection', 'features': features}

def feature(geometry, **properties):
    return {'type': 'Feature', 'geometry': geometry, 'properties': properties}

def area_membership(spawns, area_features):
    points = gpd.GeoDataFrame({'spawn_id': [s['id'] for s in spawns]},
        geometry=[Point(s['x'] + ORIGIN_E, s['y'] + ORIGIN_N) for s in spawns], crs=ANALYSIS_CRS)
    areas = gpd.GeoDataFrame({'area_name': [f['properties']['name'] for f in area_features]},
        geometry=[translate(shape(f['geometry']), ORIGIN_E, ORIGIN_N) for f in area_features], crs=ANALYSIS_CRS)
    joined = gpd.sjoin(points, areas, how='left', predicate='intersects')
    return {s['id']: sorted(set(joined.loc[joined.spawn_id.eq(s['id']), 'area_name'].dropna())) for s in spawns}

def detect_ids(player, spawns, radius):
    # Same 256-segment polygon and intersects predicate as notebook S05.
    points = gpd.GeoDataFrame({'spawn_id': [s['id'] for s in spawns]},
        geometry=[Point(s['x'] + ORIGIN_E, s['y'] + ORIGIN_N) for s in spawns], crs=ANALYSIS_CRS)
    zone = gpd.GeoDataFrame({'zone': ['Detection']},
        geometry=[Point(player[0] + ORIGIN_E, player[1] + ORIGIN_N).buffer(radius, quad_segs=64)], crs=ANALYSIS_CRS)
    joined = gpd.sjoin(points, zone, how='inner', predicate='intersects')
    return sorted(set(joined.spawn_id))

def spatial_status(player, spawns, detection_m, capture_m):
    detected = detect_ids(player, spawns, detection_m)
    capturable = sorted(s['id'] for s in spawns if s['id'] in detected and math.dist(player, (s['x'], s['y'])) <= capture_m + 1e-8)
    return detected, capturable

def build_world(config):
    raw = json.loads((ROOT / 'data/manual_scene.json').read_text(encoding='utf-8'))
    if raw['analysis_crs'] != ANALYSIS_CRS or tuple(raw['anchor_lon_lat']) != ORIGIN_LON_LAT:
        raise ValueError('Manual scene anchor/CRS differs from the application coordinate system.')
    boundary = shape(raw['boundary'])
    if boundary.geom_type != 'Polygon' or boundary.is_empty or not boundary.is_valid or boundary.interiors:
        raise ValueError('Site boundary must be a valid Polygon without holes.')
    area_features = [feature(row['geometry'], id=row['id'], name=row['name'], role=row['role']) for row in raw['areas']]
    for f in area_features:
        g = shape(f['geometry'])
        if g.geom_type != 'Polygon' or not g.is_valid or g.is_empty or g.interiors or not boundary.covers(g):
            raise ValueError('Manual areas must be valid Polygons without holes, inside the site.')
    for path in raw['paths']:
        geometry = shape(path['geometry'])
        width = path['width_m']
        if geometry.geom_type != 'LineString' or geometry.is_empty or not geometry.is_valid:
            raise ValueError('Roads must be valid LineStrings.')
        if not isinstance(width, (int, float)) or not math.isfinite(width) or width <= 0:
            raise ValueError('Road widths must be positive finite metres.')
    spawns = []
    for row in raw['spawns']:
        x, y = row['position']
        if not all(math.isfinite(v) for v in (x, y)) or not boundary.covers(Point(x, y)):
            raise ValueError(f'Invalid spawn position: {row["id"]}')
        kind, color = STYLE.get(row['id'], ('Normal', '#8ba99c'))
        spawns.append({**row, 'x': x, 'y': y, 'coordinates': to_lonlat(x,y), 'kind': kind, 'color': color})
    if not spawns or len({s['id'] for s in spawns}) != len(spawns):
        raise ValueError('Spawn IDs must be unique and nonempty.')
    membership = area_membership(spawns, area_features)
    for s in spawns:
        s['areas'] = membership[s['id']]
        if s['areas']:
            s['hint'] = ' / '.join(s['areas'])
        else:
            # Outdoor Pokemon remain valid after a parking polygon becomes a POI.
            # Keep areas empty: being near a point is not polygon containment.
            nearest = min(raw['landmarks'], key=lambda p: math.dist((s['x'], s['y']), p['position']))
            s['hint'] = 'Near ' + nearest['name']
    landmarks = []
    for row in raw['landmarks']:
        if not boundary.covers(Point(*row['position'])):
            raise ValueError('Landmark outside site.')
        subtitle, description, style = LANDMARK_DETAILS.get(row['name'], ('Campus stop', 'Approximate manual reference point.', 'main'))
        landmarks.append({**row, 'subtitle': subtitle, 'description': description, 'style': style})
    if len({p['id'] for p in landmarks}) != len(landmarks):
        raise ValueError('Landmark IDs must be unique.')
    # Named areas are schematic, not collision footprints. Match notebook free
    # coordinate access; enforce the enclosing site boundary only.
    collision = CollisionMap(boundary, (), radius=0)
    start = tuple(raw['player_xy'])
    if not boundary.covers(Point(*start)):
        raise ValueError('Player start outside site.')
    layers = {'areas': collection(area_features),
              'paths': collection([feature(p['geometry'], name=p['name'], width_m=p['width_m']) for p in raw['paths']]),
              'play_area': collection([feature(raw['boundary'], name='Manual site')])}
    return dict(config=config, spawns=spawns, landmarks=landmarks, layers=layers,
                boundary=boundary, collision=collision, start=start,
                source_notebook_sha256=raw['notebook_sha256'])
