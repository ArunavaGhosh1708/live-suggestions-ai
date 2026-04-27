import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / 'server'
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from main import app  # noqa: E402

from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

DIST_DIR = Path(__file__).resolve().parents[1] / 'client' / 'dist'
ASSETS_DIR = DIST_DIR / 'assets'
INDEX_FILE = DIST_DIR / 'index.html'

if ASSETS_DIR.exists():
    app.mount('/assets', StaticFiles(directory=ASSETS_DIR), name='assets')


@app.get('/')
async def serve_frontend_root():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {'status': 'ok', 'message': 'Frontend build not found'}


@app.get('/{path:path}')
async def serve_frontend_fallback(path: str):
    if path.startswith('api/'):
        return {'detail': 'Not Found'}

    requested_file = DIST_DIR / path
    if requested_file.is_file():
        return FileResponse(requested_file)
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {'detail': 'Not Found'}
