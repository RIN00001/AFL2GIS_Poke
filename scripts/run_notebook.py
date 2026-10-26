"""Execute and save the notebook with this Python interpreter (requires ipykernel, nbclient)."""
import sys
import os
from pathlib import Path
from tempfile import TemporaryDirectory

import nbformat
from jupyter_client import KernelManager
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'notebooks/spatial_analysis.ipynb'
notebook = nbformat.read(path, as_version=4)
with TemporaryDirectory(prefix='afl2-notebook-', dir=ROOT / '.venv', ignore_cleanup_errors=True) as runtime:
    os.environ['IPYTHONDIR'] = str(Path(runtime) / 'ipython')
    os.environ['JUPYTER_RUNTIME_DIR'] = runtime
    manager = KernelManager(connection_file=str(Path(runtime) / 'kernel.json'))
    manager.kernel_spec.argv[0] = sys.executable
    try:
        NotebookClient(notebook, km=manager, timeout=180, resources={'metadata': {'path': str(ROOT / 'notebooks')}}).execute()
    finally:
        if manager.has_kernel:
            manager.shutdown_kernel(now=True)
nbformat.validate(notebook)
nbformat.write(notebook, path)
saved = nbformat.read(path, as_version=4)
cells = [cell for cell in saved.cells if cell.cell_type == 'code']
assert all(cell.execution_count is not None for cell in cells)
assert not any(output.output_type == 'error' for cell in cells for output in cell.outputs)
print(f'Saved and read back {path}: {len(cells)} executed code cells, no errors.')
for cell in cells:
    print(cell.execution_count, [list(output.get('data', {})) or output.output_type for output in cell.outputs])
