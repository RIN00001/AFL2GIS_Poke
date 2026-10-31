import math
import unittest
from shapely.geometry import box
from backend.app.gis.coordinates import to_local, to_lonlat
from backend.app.gis.analysis import eligible
from backend.app.game.movement import move

class SpatialTests(unittest.TestCase):
    def test_coordinate_round_trip_and_metric_distance(self):
        lon,lat=112.6346424,-7.2811676
        x,y=to_local(lon,lat)
        actual=to_lonlat(x,y)
        self.assertAlmostEqual(actual[0],lon,places=9)
        self.assertAlmostEqual(actual[1],lat,places=9)
        self.assertTrue(590 < math.hypot(x,y) < 630)

    def test_circle_boundary_at_non_vertex_angle(self):
        a=.1234
        spawns=[dict(id='edge',x=30*math.cos(a),y=30*math.sin(a)),dict(id='out',x=30.001,y=0)]
        self.assertEqual(eligible((0,0),spawns,30),['edge'])

    def test_movement_diagonal_speed_and_boundary(self):
        position=move((0,0),1,1,.1,10,box(-10,-10,10,10))
        self.assertAlmostEqual(math.hypot(*position),1)
        self.assertEqual(move((9.9,0),1,0,.1,10,box(-10,-10,10,10)),(9.9,0))

if __name__=='__main__':
    unittest.main()
