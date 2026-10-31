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
        self.assertEqual(len(world['spawns']),5)
        self.assertEqual(world['state']['detected'],['pikachu'])
        self.assertEqual(world['state']['eligible'],[])
        self.assertEqual(world['config']['catch_radius_m'],10)
        self.assertEqual(len(world['layers']['areas']['features']),12)
        self.assertIsNone(self.client.post('/api/catch').json()['caught_pokemon'])
        spawn=world['spawns'][0]
        main.position=(spawn['x'],spawn['y'])
        result=self.client.post('/api/catch').json()
        self.assertEqual(result['caught_pokemon']['id'],'pikachu')
        self.assertIn('pikachu',result['state']['caught'])
        self.assertIsNone(self.client.post('/api/catch').json()['caught_pokemon'])
        self.assertTrue((Path(self.temp.name)/'save.json').exists())

    def test_landmark_visit_and_reset(self):
        landmark=next(p for p in main.world['landmarks'] if p['name']=='Hokky Supermarket')
        url='/api/landmarks/'+landmark['id']+'/visit'
        self.assertEqual(self.client.post(url).status_code,409)
        main.position=landmark['position']
        self.assertTrue(self.client.post(url).json()['newly_visited'])
        self.assertFalse(self.client.post(url).json()['newly_visited'])
        reset=self.client.post('/api/reset').json()
        self.assertEqual(reset['visited'],[])
        self.assertEqual(reset['caught'],[])

    def test_invalid_movement_and_reload(self):
        self.assertEqual(self.client.post('/api/move',json={'dx':999,'dy':0,'dt':.1}).status_code,422)
        self.assertEqual(self.client.post('/api/reload').status_code,200)
        before=main.world
        with patch('backend.app.main.load_world',side_effect=ValueError('broken polygon')):
            response=self.client.post('/api/reload')
        self.assertEqual(response.status_code,400)
        self.assertIs(main.world,before)

if __name__=='__main__':unittest.main()
