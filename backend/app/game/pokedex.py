import json
from pathlib import Path

# Persistent progress for the current FieldDex game.
SAVE = Path(__file__).resolve().parents[3] / 'outputs/manual_game_save.json'

def read_progress():
    try:
        data = json.loads(SAVE.read_text(encoding='utf-8'))
        return set(data['caught']), set(data.get('visited', []))
    except (OSError, ValueError, KeyError, TypeError):
        return set(), set()

def read_save():
    return read_progress()[0]

def save(caught, visited=()):
    SAVE.parent.mkdir(parents=True, exist_ok=True)
    temporary = SAVE.with_suffix('.tmp')
    temporary.write_text(json.dumps({'caught': sorted(caught), 'visited': sorted(visited)}, indent=2), encoding='utf-8')
    temporary.replace(SAVE)
