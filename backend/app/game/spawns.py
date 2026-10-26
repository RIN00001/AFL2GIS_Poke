"""EDIT THIS FILE during live coding, save, then click Reload Python in the game.

Coordinates are always (longitude, latitude) in EPSG:4326.
Offsets are meters east and north in EPSG:32749, relative to a landmark.
To move Charizard to campus: change its landmark from hospital to university.
To use an exact point: add coordinates=(112.6315, -7.285631) to that row.
Exact coordinates override the landmark and offset.
"""

import json
from pathlib import Path

# Named place points are the canonical place layer. Reload Python rereads this file.
_places = json.loads((Path(__file__).resolve().parents[3] / 'data/editable/places.geojson').read_text(encoding='utf-8'))
LANDMARKS = {f['properties']['id']: {'name': f['properties']['name'], 'coordinates': tuple(f['geometry']['coordinates'])}
             for f in _places['features']}

SPAWNS = [
    dict(id='pikachu_01', species='Pikachu', kind='Electric', color='#f5c842', landmark='university', offset=(14, 8)),
    dict(id='bulbasaur_01', species='Bulbasaur', kind='Grass', color='#64b894', landmark='uc_loop', offset=(10, 0)),
    dict(id='squirtle_01', species='Squirtle', kind='Water', color='#68b7db', landmark='apartment', offset=(0, -15)),
    dict(id='eevee_01', species='Eevee', kind='Normal', color='#bb875b', landmark='pirates', offset=(10, 0)),
    dict(id='jigglypuff_01', species='Jigglypuff', kind='Fairy', color='#ed9fbe', landmark='indomaret', offset=(0, 10)),
    dict(id='charizard_01', species='Charizard', kind='Fire', color='#ed9156', landmark='hokky', offset=(15, 0)),
    dict(id='snorlax_01', species='Snorlax', kind='Normal', color='#4f8790', landmark='hospital', offset=(10, 0)),
    dict(id='gengar_01', species='Gengar', kind='Ghost', color='#9475ba', landmark='hospital_bus', offset=(0, 10)),
]
