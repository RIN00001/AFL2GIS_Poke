"""Local manual-campus game. Run python -m uvicorn backend.app.main:app."""
import math
import time
import threading
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from .gis.layers import ROOT
from .gis.coordinates import to_lonlat
from .gis.analysis import buffer_ring
from .gis.manual import build_world, spatial_status
from .game.movement import move
from .game.catching import catch
from .game.pokedex import read_progress, save

app = FastAPI(title='Ciputra Field Dex', docs_url='/api/docs')
lock = threading.RLock()

@app.exception_handler(RequestValidationError)
async def invalid_request(_request, error):
    # Do not echo invalid input: NaN/Infinity cannot be serialized as JSON.
    messages = [f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in error.errors()]
    return JSONResponse(status_code=422, content={'detail': '; '.join(messages)})

def load_world():
    config = yaml.safe_load((ROOT / 'config/game.yaml').read_text())
    detection = config['detection_radius_m']
    capture = config['catch_radius_m']
    if not 1 <= capture <= detection <= 500:
        raise ValueError('Require 1 <= capture radius <= detection radius <= 500 m.')
    if not 1 <= config['movement_speed_mps'] <= 100:
        raise ValueError('Movement speed must be 1–100 m/s.')
    if not 1 <= config['landmark_visit_radius_m'] <= detection:
        raise ValueError('Landmark visit radius must be inside detection radius.')
    return build_world(config)

world = load_world()
position = world['start']
caught, visited = read_progress()
last_move = time.monotonic()

def commit_progress(next_caught, next_visited):
    """Persist first so a failed write cannot consume a catch or erase progress."""
    try:
        save(next_caught, next_visited)
    except OSError as error:
        raise HTTPException(503, 'Could not save progress. Your previous progress is kept; please try again.') from error
    caught.clear(); caught.update(next_caught)
    visited.clear(); visited.update(next_visited)

def state():
    active = [s for s in world['spawns'] if s['id'] not in caught]
    detected, capturable = spatial_status(position, active, world['config']['detection_radius_m'], world['config']['catch_radius_m'])
    valid_ids = {s['id'] for s in world['spawns']}
    valid_landmarks = {p['id'] for p in world['landmarks']}
    return {'position': position, 'coordinates': to_lonlat(*position),
            'caught': sorted(caught & valid_ids), 'visited': sorted(visited & valid_landmarks),
            'detected': detected, 'eligible': capturable,
            'buffer': buffer_ring(position, world['config']['catch_radius_m']),
            'detection_buffer': buffer_ring(position, world['config']['detection_radius_m'])}

@app.get('/api/world')
def get_world():
    with lock:
        return {k:v for k,v in world.items() if k not in {'boundary','collision'}} | {'state':state()}

class Movement(BaseModel):
    dx: float = Field(ge=-1, le=1)
    dy: float = Field(ge=-1, le=1)
    dt: float = Field(ge=0, le=0.15)

@app.post('/api/move')
def movement(command: Movement):
    global position, last_move
    with lock:
        now = time.monotonic()
        dt = min(command.dt, now-last_move)
        last_move = now
        position = move(position, command.dx, command.dy, dt, world['config']['movement_speed_mps'], world['boundary'], world['collision'])
        return state()

@app.post('/api/catch')
def catching():
    with lock:
        detected = set(state()['detected'])
        next_caught = caught.copy()
        selected = catch(position, [s for s in world['spawns'] if s['id'] in detected], world['config']['catch_radius_m'], next_caught)
        if selected: commit_progress(next_caught, visited.copy())
        return {'caught_pokemon': selected, 'state':state()}

@app.post('/api/landmarks/{landmark_id}/visit')
def visit_landmark(landmark_id: str):
    with lock:
        landmark = next((p for p in world['landmarks'] if p['id']==landmark_id), None)
        if landmark is None: raise HTTPException(404,'Unknown landmark')
        if math.dist(position, landmark['position']) > world['config']['landmark_visit_radius_m'] + 1e-8:
            raise HTTPException(409,'Move within the landmark visit radius first.')
        first_visit = landmark_id not in visited
        commit_progress(caught.copy(), visited | {landmark_id})
        return {'newly_visited':first_visit, 'landmark_id':landmark_id, 'state':state()}

@app.post('/api/reload')
def reload_world():
    global world, position
    with lock:
        try:
            updated = load_world()
            safe_position = updated['collision'].safe_position(position)
        except Exception as error:
            raise HTTPException(400, f'Reload failed; previous world retained: {error}') from error
        world, position = updated, safe_position
        return get_world()

@app.post('/api/reset')
def reset():
    global position
    with lock:
        commit_progress(set(), set())
        position = world['start']
        return state()

@app.get('/api/scenarios')
def scenarios():
    with lock:
        try:
            settings = yaml.safe_load((ROOT / 'config/scenarios.yaml').read_text())
            alternative = settings['alternative_detection_m']
            if (isinstance(alternative, bool) or not isinstance(alternative, (int, float))
                    or not math.isfinite(alternative)
                    or not world['config']['catch_radius_m'] <= alternative <= 500):
                raise ValueError('Alternative detection radius must be between the capture radius and 500 m.')
        except (OSError, yaml.YAMLError, KeyError, TypeError, ValueError) as error:
            raise HTTPException(400, f'Invalid scenario settings: {error}') from error
        rows = []
        for radius in (world['config']['detection_radius_m'], alternative):
            detected, capturable = spatial_status(position, world['spawns'], radius, world['config']['catch_radius_m'])
            rows.append({'detection_m':radius, 'capture_m':world['config']['catch_radius_m'],
                'unique_detected':len(detected), 'unique_capturable':len(capturable),
                'detected_ids':detected, 'capturable_ids':capturable})
        return rows

app.mount('/', StaticFiles(directory=ROOT / 'frontend', html=True), name='frontend')
