import math
import unittest
from shapely.geometry import shape
from backend.app.main import load_world
from backend.app.gis.manual import spatial_status

class ManualSceneTests(unittest.TestCase):
    def test_manual_scene_baseline(self):
        world=load_world()
        self.assertRegex(world['source_notebook_sha256'],r'^[0-9a-f]{64}$')
        detected,capturable=spatial_status(world['start'],world['spawns'],40,10)
        self.assertEqual(detected,['pikachu'])
        self.assertEqual(capturable,[])
        self.assertEqual(len(world['spawns']),5)
        self.assertEqual(len(world['layers']['areas']['features']),12)

    def test_manual_world_membership(self):
        world=load_world()
        eevee=next(s for s in world['spawns'] if s['id']=='eevee')
        self.assertEqual(eevee['areas'], [])
        self.assertEqual(eevee['hint'], 'Near UC Hill Parking')
        self.assertEqual(len(set(s['hint'] for s in world['spawns'])),5)
        charizard=next(s for s in world['spawns'] if s['id']=='charizard')
        self.assertEqual(charizard['areas'],['Hokky Supermarket'])
        self.assertEqual(world['config']['detection_radius_m'],40)
        self.assertEqual(world['config']['catch_radius_m'],10)
        self.assertNotIn('water',world['layers'])

    def test_capture_boundary_and_unique_detection(self):
        angle=.1234
        spawns=[{'id':'edge','x':10*math.cos(angle),'y':10*math.sin(angle)},
                {'id':'outside','x':10.001,'y':0}]
        detected,capturable=spatial_status((0,0),spawns,40,10)
        self.assertEqual(detected,['edge','outside'])
        self.assertEqual(capturable,['edge'])
        self.assertEqual(spatial_status((0,0),[],40,10),([],[]))

    def test_traced_footprints_do_not_overlap(self):
        world=load_world()
        buildings={f['properties']['name']:shape(f['geometry']) for f in world['layers']['areas']['features']}
        self.assertLess(buildings['UC Main Building'].intersection(buildings['UC Tower']).area,1e-6)
        self.assertTrue(all(g.is_valid for g in buildings.values()))
        self.assertEqual(set(world['layers']),{'areas','paths','play_area'})
        self.assertNotIn('Yoshinoya building', buildings)
        self.assertNotIn('UC Hill Parking schematic area', buildings)
        self.assertEqual(len(buildings['Hokky Supermarket'].exterior.coords), 9)
        self.assertTrue(any(p['name'] == 'UC Hill Parking' for p in world['landmarks']))

if __name__=='__main__':unittest.main()
