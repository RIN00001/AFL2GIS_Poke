import json
from pathlib import Path

SAVE = Path(__file__).resolve().parents[3] / 'outputs/save.json'

def read_save():
    if not SAVE.exists():
        return set()
    try:
        return set(json.loads(SAVE.read_text())['caught'])
    except (ValueError, KeyError, TypeError):
        return set()

def save(caught):
    SAVE.parent.mkdir(parents=True, exist_ok=True)
    temporary = SAVE.with_suffix('.tmp')
    temporary.write_text(json.dumps({'caught': sorted(caught)}, indent=2))
    temporary.replace(SAVE)
