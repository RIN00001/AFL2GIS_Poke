import json
import math
import unittest
from unittest.mock import patch

from backend.app.gis.coordinates import to_lonlat
from backend.app.gis.places import place_analysis
from backend.app.main import load_world


class PlaceTests(unittest.TestCase):
    def test_metric_buffers_overlaps_and_unmatched_points(self):
        raw = {'features': [
            {'type': 'Feature', 'properties': {'id': key, 'name': key, 'category': 'test'},
             'geometry': {'type': 'Point', 'coordinates': to_lonlat(x, 0)}}
            for key, x in [('A', 0), ('B', 20)]]}
        spawns = [{'id': key, 'x': x, 'y': y} for key, x, y in
                  [('overlap', 10, 0), ('outside', 100, 0), ('inside', -19.9, 0)]]
        with patch('pathlib.Path.read_text', return_value=json.dumps(raw)):
            places, zones, joined, memberships = place_analysis(spawns)
        self.assertEqual(places.crs.to_epsg(), 32749)
        self.assertAlmostEqual(zones.geometry.iloc[0].area, math.pi * 20**2, delta=.2)
        self.assertEqual(set(memberships['overlap']), {'A', 'B'})
        self.assertEqual(memberships['outside'], [])
        self.assertEqual(memberships['inside'], ['A'])
        self.assertEqual(len(joined[joined.spawn_id == 'overlap']), 2)
        self.assertEqual(joined.loc[joined.place_id.notna(), 'spawn_id'].nunique(), 2)

    def test_real_world_hints_are_join_results(self):
        world = load_world()
        self.assertTrue(all(s['places'] for s in world['spawns']))
        charizard = next(s for s in world['spawns'] if s['id'] == 'charizard_01')
        self.assertEqual(charizard['places'], ['Hokky Supermarket'])
        self.assertEqual(charizard['hint'], 'Charizard ada di Hokky Supermarket')
        self.assertEqual(world['config']['place_radius_m'], 20)
        self.assertEqual(len(world['layers']['places']['features']), 8)
        # Every spawn has at least one collision-safe catch position within 30 m.
        for spawn in world['spawns']:
            point = (spawn['x'], spawn['y'])
            safe = world['collision'].safe_position(point)
            self.assertLessEqual(math.dist(point, safe), world['config']['catch_radius_m'])


if __name__ == '__main__':
    unittest.main()
