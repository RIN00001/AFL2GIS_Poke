"""Isolated browser preview: progress is in memory; never touches the real save.

Run from the project root: .venv/Scripts/python.exe tests/visual_preview.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app import main
import uvicorn

if __name__ == '__main__':
    main.caught = set()
    main.position = main.world['start']
    main.save = lambda caught: None
    uvicorn.run(main.app, host='127.0.0.1', port=8001)
