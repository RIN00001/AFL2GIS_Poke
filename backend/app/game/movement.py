from math import hypot
from shapely.geometry import Point, LineString

def move(position, dx, dy, dt, speed, boundary, collision=None):
    length = hypot(dx, dy)
    if not length:
        return position
    scale = min(1, 1 / length) * speed * min(max(dt, 0), 0.15)
    destination = (position[0] + dx * scale, position[1] + dy * scale)
    def clear(target):
        if collision is not None:
            return collision.allows(position, target)
        path = Point(position) if target == position else LineString([position, target])
        return boundary.covers(path)

    if clear(destination):
        return destination
    # Slide along a wall when only one component of diagonal input is blocked.
    candidates = [(destination[0], position[1]), (position[0], destination[1])]
    candidates.sort(key=lambda p: hypot(p[0]-position[0], p[1]-position[1]), reverse=True)
    for candidate in candidates:
        if candidate != position and clear(candidate):
            return candidate
    return position
