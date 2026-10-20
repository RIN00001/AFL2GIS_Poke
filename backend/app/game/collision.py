"""Polygon collision in local projected meters, independent of the renderer."""
from shapely.geometry import Point, LineString, shape
from shapely.ops import unary_union, nearest_points
from shapely.strtree import STRtree


class CollisionMap:
    def __init__(self, boundary, obstacles=(), radius=0):
        # Inflate walls and shrink the outer boundary by the player's radius.
        self.boundary = boundary.buffer(-radius) if radius else boundary
        self.obstacles = [g.buffer(radius) if radius else g for g in obstacles]
        self.tree = STRtree(self.obstacles)
        self._safe_area = None

    def allows(self, start, end):
        path = Point(start) if start == end else LineString([start, end])
        return self.boundary.covers(path) and not len(self.tree.query(path, predicate='intersects'))

    def safe_position(self, position):
        """Move an embedded player out after edits, without altering spawn data."""
        position = tuple(position)
        if self.allows(position, position):
            return position
        if self._safe_area is None:
            free = self.boundary.difference(unary_union(self.obstacles))
            # A small clearance avoids placing the player exactly against a wall.
            self._safe_area = free.buffer(-0.05)
        if self._safe_area.is_empty:
            raise ValueError('Collision polygons leave no playable space.')
        point = nearest_points(Point(position), self._safe_area)[1]
        result = (point.x, point.y)
        if not self.allows(result, result):
            raise ValueError('Could not find a clear player position.')
        return result


def from_layers(boundary, layers, config):
    defaults = config.get('collision_layers', ['buildings'])
    allowed = {'buildings', 'habitats', 'landcover'}
    if not isinstance(defaults, list) or not set(defaults).issubset(allowed):
        raise ValueError('collision_layers must contain buildings, habitats, or landcover.')
    radius = config.get('player_radius_m', 3)
    if not isinstance(radius, (int, float)) or not 0 <= radius <= 10:
        raise ValueError('player_radius_m must be between 0 and 10 meters.')
    obstacles = []
    for name in allowed:
        for feature in layers[name]['features']:
            solid = feature['properties'].get('collidable', name in defaults)
            if not isinstance(solid, bool):
                raise ValueError('Polygon collidable property must be true or false.')
            if solid:
                obstacles.append(shape(feature['geometry']))
    return CollisionMap(boundary, obstacles, radius)
