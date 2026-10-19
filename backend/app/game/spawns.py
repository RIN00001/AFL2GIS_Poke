"""EDIT THIS FILE during live coding, save, then click Reload Python in the game.

Coordinates are always (longitude, latitude) in EPSG:4326.
Offsets are meters east and north in EPSG:32749, relative to a landmark.
To move Charizard to campus: change its landmark from hospital to university.
To use an exact point: add coordinates=(112.6315, -7.285631) to that row.
Exact coordinates override the landmark and offset.
"""

LANDMARKS = {
    'university': {'name': 'Universitas Ciputra', 'coordinates': (112.631500, -7.285631)},
    'hospital': {'name': 'Ciputra Hospital', 'coordinates': (112.6346424, -7.2811676)},
}

SPAWNS = [
    dict(id='pikachu_01', species='Pikachu', kind='Electric', color='#f5c842', landmark='university', offset=(14, 8)),
    dict(id='bulbasaur_01', species='Bulbasaur', kind='Grass', color='#64b894', landmark='university', offset=(-75, 65)),
    dict(id='squirtle_01', species='Squirtle', kind='Water', color='#68b7db', landmark='university', offset=(45, -25)),
    dict(id='eevee_01', species='Eevee', kind='Normal', color='#bb875b', landmark='university', offset=(85, 120)),
    dict(id='jigglypuff_01', species='Jigglypuff', kind='Fairy', color='#ed9fbe', landmark='university', offset=(-100, -100)),
    dict(id='charizard_01', species='Charizard', kind='Fire', color='#ed9156', landmark='hospital', offset=(-25, -20)),
    dict(id='snorlax_01', species='Snorlax', kind='Normal', color='#4f8790', landmark='hospital', offset=(100, 40)),
    dict(id='gengar_01', species='Gengar', kind='Ghost', color='#9475ba', landmark='hospital', offset=(-85, 100)),
]
