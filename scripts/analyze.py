"""Generate reproducible tables and an SVG map without starting the web server."""
import csv
import json
import sys
from html import escape
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.app.main import load_world
from backend.app.gis.analysis import compare_scenarios, buffer_ring
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
        writer=csv.writer(file);writer.writerow(['id','species','longitude','latitude','east_from_origin_m','north_from_origin_m','habitats'])
        for s in world['spawns']:writer.writerow([s['id'],s['species'],*s['coordinates'],s['x'],s['y'],'; '.join(s['habitats'])])
    def xy(x,y):return (60+(x+500)*.55,90+(900-y)*.55)
    def points(coords):return ' '.join(f'{a:.2f},{b:.2f}' for a,b in (xy(x,y) for x,y in coords))
    svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="980" viewBox="0 0 1100 980">', '<rect width="1100" height="980" fill="#f6f5ed"/>','<text x="50" y="40" font-family="sans-serif" font-size="24" fill="#294a3c">Ciputra Field Dex · baseline spatial analysis</text>','<text x="50" y="65" font-family="sans-serif" font-size="13">EPSG:32749 · distances in meters · source data EPSG:4326</text>', '<defs><clipPath id="map"><rect x="60" y="90" width="742.5" height="770"/></clipPath></defs><g clip-path="url(#map)">']
    for name,color in [('landcover','#d8e3c9'),('habitats','#b2caa7'),('buildings','#d5cfc2')]:
        for f in world['layers'][name]['features']:
            svg.append(f'<polygon points="{points(f["geometry"]["coordinates"][0])}" fill="{color}" stroke="#bec7b0" stroke-width=".4"/>')
    for f in world['layers']['paths']['features']:
        svg.append(f'<polyline points="{points(f["geometry"]["coordinates"])}" fill="none" stroke="#fffdf5" stroke-width="3"/>')
    svg.append(f'<polygon points="{points(world["layers"]["play_area"]["features"][0]["geometry"]["coordinates"][0])}" fill="none" stroke="#658568" stroke-dasharray="7 5"/>')
    for r in reversed(rows):
        svg.append(f'<polygon points="{points(buffer_ring(position,r["radius_m"]))}" fill="#6d9984" fill-opacity=".15" stroke="#528473" stroke-width="1.5"/>')
    for s in world['spawns']:
        x,y=xy(s['x'],s['y']);svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{escape(s["color"])}" stroke="#3b5143"/><text x="{x+9}" y="{y+4}" font-family="sans-serif" font-size="11">{escape(s["species"])}</text>')
    x,y=xy(*position);svg.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#213d32"/>')
    for landmark in world['landmarks']:
        x,y=xy(*landmark['position']);svg.append(f'<text x="{x-70}" y="{y-28}" font-family="sans-serif" font-size="13" font-weight="bold">{escape(landmark["name"])}</text>')
    svg.append('</g>')
    for i,text in enumerate(['LEGEND','Dark dot: player start','Colored dots: Pokemon','Green zones: synthetic habitats','Gray: OSM buildings','White: OSM paths',f'Rings: {rows[0]["radius_m"]} m / {rows[1]["radius_m"]} m','Dashed: playable boundary','N ↑','Scale: 100 m']):
        svg.append(f'<text x="835" y="{120+i*28}" font-family="sans-serif" font-size="12" fill="#34513f">{text}</text>')
    svg.append('<path d="M835 394h55" stroke="#34513f" stroke-width="3"/>')
    svg.append('<text x="50" y="920" font-family="sans-serif" font-size="12">© OpenStreetMap contributors · ODbL · https://www.openstreetmap.org/copyright</text>')
    svg.append('<text x="50" y="943" font-family="sans-serif" font-size="11">Synthetic game zones and spawns. Straight-line proximity; not road access. Landmark pins are approximate.</text></svg>')
    (output/'analysis_map.svg').write_text('\n'.join(svg),encoding='utf-8')
    return rows

if __name__=='__main__':
    print(json.dumps(analyze(),indent=2))
