"""One-time downloads only. The game never calls an external service."""
import json
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BOUND = (-7.291, 112.625, -7.277, 112.641)

def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'AFL2GIS-Student-Project/1.0'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()

def main():
    vendor = ROOT / 'frontend/public/vendor'
    vendor.mkdir(parents=True, exist_ok=True)
    for name in ['build/three.module.js', 'build/three.core.js', 'LICENSE']:
        (vendor / name.split('/')[-1]).write_bytes(download('https://cdn.jsdelivr.net/npm/three@0.180.0/' + name))
    bbox = ','.join(map(str, BOUND))
    query = f'[out:json][timeout:90];(way["highway"]({bbox});way["building"]({bbox});way["landuse"]({bbox});way["natural"="water"]({bbox});way["amenity"="university"]({bbox});way["amenity"="hospital"]({bbox}););out geom;'
    from urllib.parse import urlencode
    # The small OSM map extract avoids reliance on busy Overpass workers.
    import xml.etree.ElementTree as ET
    south, west, north, east = BOUND
    xml = download(f'https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}')
    root = ET.fromstring(xml)
    nodes = {node.attrib['id']: {'lon': float(node.attrib['lon']), 'lat': float(node.attrib['lat'])} for node in root.findall('node')}
    elements = []
    for way in root.findall('way'):
        tags = {tag.attrib['k']: tag.attrib['v'] for tag in way.findall('tag')}
        if not any(k in tags for k in ['highway', 'building', 'landuse']) and tags.get('natural') != 'water' and tags.get('amenity') not in ['university', 'hospital']:
            continue
        elements.append({'id': int(way.attrib['id']), 'tags': tags, 'geometry': [nodes[n.attrib['ref']] for n in way.findall('nd')]})
    raw = json.dumps({'elements': elements}).encode()
    original = ROOT / 'data/original'
    original.mkdir(parents=True, exist_ok=True)
    (original / 'osm.json').write_bytes(raw)
    (original / 'osm.osm').write_bytes(xml)
    groups = {key: [] for key in ['paths', 'buildings', 'landcover']}
    for el in json.loads(raw)['elements']:
        tags = el.get('tags', {})
        coords = [[p['lon'], p['lat']] for p in el.get('geometry', [])]
        if len(coords) < 2:
            continue
        key = 'paths' if 'highway' in tags else 'buildings' if 'building' in tags else 'landcover'
        polygon = key != 'paths'
        if polygon and (len(coords) < 4 or coords[0] != coords[-1]):
            continue
        groups[key].append({'type': 'Feature', 'id': el['id'], 'properties': {'osm_id': el['id'], **tags}, 'geometry': {'type': 'Polygon' if polygon else 'LineString', 'coordinates': [coords] if polygon else coords}})
    target = ROOT / 'data/editable'
    target.mkdir(parents=True, exist_ok=True)
    for key, features in groups.items():
        (target / f'{key}.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}), encoding='utf-8')
    (original / 'download_metadata.json').write_text(json.dumps({'downloaded_utc': datetime.now(timezone.utc).isoformat(), 'bbox_south_west_north_east': BOUND, 'source': 'https://api.openstreetmap.org/api/0.6/map', 'crs': 'EPSG:4326', 'counts': {k: len(v) for k,v in groups.items()}}, indent=2))
    print({key: len(features) for key, features in groups.items()})

if __name__ == '__main__':
    main()

