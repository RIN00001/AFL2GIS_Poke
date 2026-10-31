import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app import main
from backend.app.game import pokedex
from backend.app.gis.manual import build_world
from backend.app.gis.layers import ROOT


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.old = main.position, main.caught.copy(), main.visited.copy()
        self.temp = tempfile.TemporaryDirectory()
        self.patch = patch.object(pokedex, 'SAVE', Path(self.temp.name) / 'save.json')
        self.patch.start()
        self.client = TestClient(main.app)
        self.client.post('/api/reset')

    def tearDown(self):
        main.position = self.old[0]
        main.caught.clear(); main.caught.update(self.old[1])
        main.visited.clear(); main.visited.update(self.old[2])
        self.patch.stop(); self.temp.cleanup()

    def test_failed_catch_is_retryable(self):
        spawn = main.world['spawns'][0]
        main.position = (spawn['x'], spawn['y'])
        with patch.object(main, 'save', side_effect=OSError('disk full')):
            self.assertEqual(self.client.post('/api/catch').status_code, 503)
        self.assertNotIn(spawn['id'], main.caught)
        self.assertEqual(self.client.post('/api/catch').json()['caught_pokemon']['id'], spawn['id'])
        self.assertIn(spawn['id'], pokedex.read_progress()[0])

    def test_failed_visit_and_reset_keep_progress(self):
        landmark = main.world['landmarks'][0]
        main.position = landmark['position']
        url = '/api/landmarks/' + landmark['id'] + '/visit'
        with patch.object(main, 'save', side_effect=OSError('disk full')):
            self.assertEqual(self.client.post(url).status_code, 503)
        self.assertNotIn(landmark['id'], main.visited)
        self.assertEqual(self.client.post(url).status_code, 200)
        with patch.object(main, 'save', side_effect=OSError('disk full')):
            self.assertEqual(self.client.post('/api/reset').status_code, 503)
        self.assertIn(landmark['id'], main.visited)
        self.assertEqual(main.position, landmark['position'])

    def test_bad_road_is_rejected_before_rendering(self):
        original = json.loads((ROOT / 'data/manual_scene.json').read_text())
        for value in ('point', 'width'):
            raw = copy.deepcopy(original)
            if value == 'point': raw['paths'][0]['geometry'] = {'type':'Point','coordinates':[0,0]}
            else: raw['paths'][0]['width_m'] = -1
            with patch('backend.app.gis.manual.json.loads', return_value=raw):
                with self.assertRaises(ValueError): build_world(main.world['config'])

    def test_unsupported_boundary_and_holes_are_rejected(self):
        from shapely.geometry import shape
        original = json.loads((ROOT / 'data/manual_scene.json').read_text())
        for kind in ('line', 'hole'):
            raw = copy.deepcopy(original)
            if kind == 'line':
                raw['boundary'] = {'type':'LineString','coordinates':[[0,0],[1,1]]}
            else:
                hole = shape(raw['boundary']).representative_point().buffer(1)
                raw['boundary']['coordinates'].append(list(hole.exterior.coords))
            with patch('backend.app.gis.manual.json.loads', return_value=raw):
                with self.assertRaises(ValueError): build_world(main.world['config'])

    def test_invalid_scenarios_return_useful_errors(self):
        for value in (-1, 5, 501, 'twenty', None, True, float('nan')):
            with patch.object(main.yaml, 'safe_load', return_value={'alternative_detection_m':value}):
                response = self.client.get('/api/scenarios')
            self.assertEqual(response.status_code, 400)
            self.assertIn('Invalid scenario settings', response.json()['detail'])
        self.assertEqual(self.client.get('/api/scenarios').status_code, 200)

    def test_complete_collection_and_duplicate_catch(self):
        for spawn in main.world['spawns']:
            main.position = (spawn['x'], spawn['y'])
            self.assertEqual(self.client.post('/api/catch').json()['caught_pokemon']['id'], spawn['id'])
        response = self.client.post('/api/catch').json()
        self.assertIsNone(response['caught_pokemon'])
        self.assertEqual(response['state']['eligible'], [])
        self.assertEqual(response['state']['detected'], [])
        self.assertEqual(len(pokedex.read_progress()[0]), len(main.world['spawns']))

    def test_nonfinite_movement_is_rejected(self):
        previous = main.position
        for value in ('NaN', 'Infinity', '-Infinity'):
            response = self.client.post('/api/move', content='{"dx":'+value+',"dy":0,"dt":0.1}', headers={'Content-Type':'application/json'})
            self.assertEqual(response.status_code, 422)
        self.assertEqual(main.position, previous)
