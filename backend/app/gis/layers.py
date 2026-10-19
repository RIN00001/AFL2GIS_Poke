import json
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import transform
from .coordinates import to_local

ROOT = Path(__file__).resolve().parents[3]

def load_layer(name):
    data = json.loads((ROOT / 'data/editable' / f'{name}.geojson').read_text(encoding='utf-8'))
    features = []
    for item in data['features']:
        geometry = shape(item['geometry'])
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError(f'Invalid geometry in {name}: {item.get("id", "unknown")}')
        projected = transform(to_local, geometry)
        features.append({**item, 'geometry': mapping(projected)})
    return {'type': 'FeatureCollection', 'features': features}
