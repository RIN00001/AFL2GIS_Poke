"""Run from project root: python -m uvicorn backend.app.main:app --port 8000"""
import json
import math
import runpy
import time
import threading
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from shapely.geometry import shape, Point
from .gis.layers import ROOT, load_layer
from .gis.coordinates import to_local, to_lonlat
from .gis.analysis import eligible, habitat_join, compare_scenarios, buffer_ring
from .game.movement import move
from .game.catching import catch
from .game.pokedex import read_save, save

app = FastAPI(title='Ciputra Field Dex', docs_url='/api/docs')
lock = threading.RLock()

def load_world():
    config = yaml.safe_load((ROOT / 'config/game.yaml').read_text())
    if not 1 <= config['catch_radius_m'] <= 500 or not 1 <= config['movement_speed_mps'] <= 100:
        raise ValueError('Catch radius must be 1–500 m; speed must be 1–100 m/s.')
    # run_path reads fresh source without Python's import cache during live coding.
    source = runpy.run_path(str(ROOT / 'backend/app/game/spawns.py'))
    landmarks = [{**v, 'id': k, 'position': to_local(*v['coordinates'])} for k, v in source['LANDMARKS'].items()]
    spawns = []
    for row in source['SPAWNS']:
        row = dict(row)
        if 'coordinates' in row:
            x, y = to_local(*row['coordinates'])
        else:
            x, y = to_local(*source['LANDMARKS'][row['landmark']]['coordinates'])
            dx, dy = row.get('offset', (0, 0))
            x, y = x + dx, y + dy
        if not all(math.isfinite(v) for v in (x,y)):
            raise ValueError('Spawn coordinates must be finite.')
        spawns.append({**row, 'x': x, 'y': y, 'coordinates': to_lonlat(x, y)})
    if not spawns or len({s['id'] for s in spawns}) != len(spawns):
        raise ValueError('Provide at least one spawn with unique IDs.')
    layers = {name: load_layer(name) for name in ['paths', 'buildings', 'landcover', 'habitats', 'play_area']}
    boundary = shape(layers['play_area']['features'][0]['geometry'])
    for s in spawns:
        if not boundary.covers(Point(s['x'], s['y'])):
            raise ValueError(f"Spawn {s['id']} is outside the playable area.")
    habitats = habitat_join(spawns, layers['habitats'])
    for s in spawns:
        s['habitats'] = habitats[s['id']]
    start = to_local(*source['LANDMARKS'][config['start_landmark']]['coordinates'])
    if not boundary.covers(Point(start)):
        raise ValueError('Starting point is outside the playable area.')
    return dict(config=config, spawns=spawns, landmarks=landmarks, layers=layers, boundary=boundary, start=start)

world = load_world()
position = world['start']
caught = read_save()
last_move = time.monotonic()

def state():
    active = [s for s in world['spawns'] if s['id'] not in caught]
    return {'position': position, 'coordinates': to_lonlat(*position), 'caught': sorted(caught), 'eligible': eligible(position, active, world['config']['catch_radius_m']), 'buffer': buffer_ring(position, world['config']['catch_radius_m'])}

@app.get('/api/world')
def get_world():
    with lock:
        return {k: v for k, v in world.items() if k != 'boundary'} | {'state': state()}

class Movement(BaseModel):
    dx: float = Field(ge=-1, le=1)
    dy: float = Field(ge=-1, le=1)
    dt: float = Field(ge=0, le=0.15)

@app.post('/api/move')
def movement(command: Movement):
    global position, last_move
    with lock:
        now = time.monotonic()
        dt = min(command.dt, now - last_move)
        last_move = now
        position = move(position, command.dx, command.dy, dt, world['config']['movement_speed_mps'], world['boundary'])
        return state()

@app.post('/api/catch')
def catching():
    with lock:
        selected = catch(position, world['spawns'], world['config']['catch_radius_m'], caught)
        if selected:
            save(caught)
        return {'caught_pokemon': selected, 'state': state()}

@app.post('/api/reload')
def reload_world():
    global world, position
    with lock:
        try:
            updated = load_world()
        except Exception as error:
            raise HTTPException(400, f'Reload failed; previous world retained: {error}') from error
        world = updated
        if not world['boundary'].covers(Point(position)):
            position = world['start']
        return get_world()

@app.post('/api/reset')
def reset():
    global position
    with lock:
        caught.clear()
        save(caught)
        position = world['start']
        return state()

@app.get('/api/scenarios')
def scenarios():
    with lock:
        settings = yaml.safe_load((ROOT / 'config/scenarios.yaml').read_text())
        return compare_scenarios(position, world['spawns'], settings['baseline_radius_m'], settings['alternative_radius_m'])

app.mount('/', StaticFiles(directory=ROOT / 'frontend', html=True), name='frontend')
