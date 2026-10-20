import unittest
from shapely.geometry import box, Polygon, mapping
from backend.app.game.collision import CollisionMap, from_layers
from backend.app.game.movement import move


class CollisionTests(unittest.TestCase):
    def test_thin_wall_cannot_be_crossed_in_one_step(self):
        boundary=box(-10,-10,10,10)
        collision=CollisionMap(boundary,[box(1,-10,1.1,10)])
        self.assertEqual(move((0,0),1,0,.15,32,boundary,collision),(0,0))

    def test_diagonal_slides_without_crossing_wall(self):
        boundary=box(-10,-10,10,10)
        collision=CollisionMap(boundary,[box(1,-10,2,10)])
        result=move((0,0),1,1,.15,32,boundary,collision)
        self.assertEqual(result[0],0)
        self.assertGreater(result[1],0)
        self.assertTrue(collision.allows((0,0),result))

    def test_player_radius_and_boundary(self):
        collision=CollisionMap(box(-10,-10,10,10),[box(3,-2,5,2)],radius=1)
        self.assertFalse(collision.allows((0,0),(2.5,0)))
        self.assertFalse(collision.allows((0,5),(9.5,5)))
        self.assertTrue(collision.allows((0,5),(8,5)))

    def test_concave_boundary_and_polygon_holes(self):
        boundary=Polygon([(0,0),(8,0),(8,8),(6,8),(6,2),(2,2),(2,8),(0,8),(0,0)])
        self.assertFalse(CollisionMap(boundary).allows((1,6),(7,6)))
        building=Polygon([(-4,-4),(4,-4),(4,4),(-4,4),(-4,-4)], holes=[[(-2,-2),(-2,2),(2,2),(2,-2),(-2,-2)]])
        collision=CollisionMap(box(-10,-10,10,10),[building])
        self.assertTrue(collision.allows((0,0),(1,1)))
        self.assertFalse(collision.allows((0,0),(5,0)))

    def test_embedded_player_recovered_and_fully_blocked_rejected(self):
        collision=CollisionMap(box(-10,-10,10,10),[box(-2,-2,2,2)],radius=1)
        point=collision.safe_position((0,0))
        self.assertTrue(collision.allows(point,point))
        with self.assertRaises(ValueError):
            CollisionMap(box(-1,-1,1,1),[box(-2,-2,2,2)]).safe_position((0,0))

    def test_per_polygon_override(self):
        def feature(solid):return {'properties':{'collidable':solid},'geometry':mapping(box(1,-2,2,2))}
        layers={'buildings':{'features':[feature(False)]},'habitats':{'features':[feature(True)]},'landcover':{'features':[]}}
        collision=from_layers(box(-10,-10,10,10),layers,{'player_radius_m':0})
        self.assertFalse(collision.allows((0,0),(3,0)))
        layers['habitats']['features']=[]
        self.assertTrue(from_layers(box(-10,-10,10,10),layers,{'player_radius_m':0}).allows((0,0),(3,0)))
