"""Generate reproducible tables and an SVG map without starting the web server."""
import csv
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.app.main import load_world
from backend.app.gis.analysis import compare_scenarios
from scripts.analysis_map import render_map
from backend.app.gis.places import place_analysis
from backend.app.gis.coordinates import SOURCE_CRS
import geopandas as gpd
from shapely.geometry import Point
import yaml

def analyze():
    world=load_world()
    position=world['start']
    settings=yaml.safe_load((ROOT/'config/scenarios.yaml').read_text())
    rows=compare_scenarios(position,world['spawns'],settings['baseline_radius_m'],settings['alternative_radius_m'])
    output=ROOT/'outputs';output.mkdir(exist_ok=True)
    with (output/'scenario_comparison.csv').open('w',newline='',encoding='utf-8') as file:
        writer=csv.DictWriter(file,fieldnames=['radius_m','unique_catchable','spawn_ids'])
        writer.writeheader()
        writer.writerows([{**r,'spawn_ids':'; '.join(r['spawn_ids'])} for r in rows])
    with (output/'spawn_table.csv').open('w',newline='',encoding='utf-8') as file:
        writer=csv.writer(file);writer.writerow(['id','species','longitude','latitude','east_from_origin_m','north_from_origin_m','habitats','places','hint'])
        for s in world['spawns']:writer.writerow([s['id'],s['species'],*s['coordinates'],s['x'],s['y'],'; '.join(s['habitats']),'; '.join(s['places']),s['hint']])
    places, zones, joined, memberships = place_analysis(world['spawns'])
    places.to_crs(SOURCE_CRS).to_file(output/'places.geojson', driver='GeoJSON')
    pokemon = gpd.GeoDataFrame([{'id': s['id'], 'species': s['species'], 'geometry': Point(*s['coordinates'])} for s in world['spawns']], crs=SOURCE_CRS)
    pokemon.to_file(output/'pokemon.geojson', driver='GeoJSON')
    zones.to_crs(SOURCE_CRS).to_file(output/'place_zones.geojson', driver='GeoJSON')
    joined.drop(columns=['geometry', 'index_right']).to_csv(output/'place_join.csv', index=False)
    (output/'analysis_map.svg').write_text(render_map(world, rows), encoding='utf-8')
    (output/'analysis_detail.svg').write_text(render_map(world, rows, detail=True), encoding='utf-8')
    return rows

if __name__=='__main__':
    print(json.dumps(analyze(),indent=2))
