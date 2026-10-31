"""Distance checks and visible buffer rings for the game server."""
from shapely.geometry import Point

def eligible(player, spawns, radius):
    # Distance <= radius explicitly includes the exact circular boundary.
    return [s['id'] for s in spawns if Point(player).distance(Point(s['x'], s['y'])) <= radius + 1e-8]

def buffer_ring(player, radius):
    return list(Point(player).buffer(radius, quad_segs=64).exterior.coords)
