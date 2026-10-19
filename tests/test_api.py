import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app import main

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.saved_position,self.saved_caught=main.position,main.caught.copy()
        self.patcher=patch('backend.app.game.pokedex.SAVE',Path(self.temp.name)/'save.json')
        self.patcher.start()
        self.client=TestClient(main.app)
        self.client.post('/api/reset')

    def tearDown(self):
        main.position=self.saved_position
        main.caught.clear();main.caught.update(self.saved_caught)
        self.patcher.stop();self.temp.cleanup()

    def test_world_and_catch_persistence(self):
        world=self.client.get('/api/world').json()
        self.assertEqual(len(world['spawns']),8)
        self.assertIn('pikachu_01',world['state']['eligible'])
        result=self.client.post('/api/catch').json()
        self.assertEqual(result['caught_pokemon']['id'],'pikachu_01')
        self.assertIn('pikachu_01',result['state']['caught'])
        self.assertIsNone(self.client.post('/api/catch').json()['caught_pokemon'])
        self.assertTrue((Path(self.temp.name)/'save.json').exists())

    def test_invalid_movement_and_reload(self):
        self.assertEqual(self.client.post('/api/move',json={'dx':999,'dy':0,'dt':.1}).status_code,422)
        self.assertEqual(self.client.post('/api/reload').status_code,200)
        before=main.world
        with patch('backend.app.main.load_world',side_effect=ValueError('broken polygon')):
            response=self.client.post('/api/reload')
        self.assertEqual(response.status_code,400)
        self.assertIs(main.world,before)

    def test_spawns_can_move_using_python_landmark(self):
        import runpy
        source=runpy.run_path(str(main.ROOT/'backend/app/game/spawns.py'))
        row=next(s for s in source['SPAWNS'] if s['id']=='charizard_01')
        row['landmark']='university'
        with patch('backend.app.main.runpy.run_path',return_value=source):
            world=main.load_world()
        charizard=next(s for s in world['spawns'] if s['id']=='charizard_01')
        self.assertAlmostEqual(charizard['x'],-25)
        self.assertAlmostEqual(charizard['y'],-20)

if __name__=='__main__':unittest.main()
