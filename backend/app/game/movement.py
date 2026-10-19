from math import hypot
from shapely.geometry import Point

def move(position, dx, dy, dt, speed, boundary):
    length = hypot(dx, dy)
    if not length:
        return position
    scale = min(1, 1 / length) * speed * min(max(dt, 0), 0.15)
    destination = (position[0] + dx * scale, position[1] + dy * scale)
    return destination if boundary.covers(Point(destination)) else position
