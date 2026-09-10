from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.api.routes_v11 import router as router_v11

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"

app = FastAPI(title="BIZET OS 1.1", version="1.1-D")
app.include_router(router)
app.include_router(router_v11)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/custom-configuration", include_in_schema=False)
def custom_configuration():
    """Standalone user-drawn kitchen configuration UX pilot."""
    return FileResponse(STATIC / "custom-configuration.html")


@app.get("/room", include_in_schema=False)
def room_viewport():
    """Interactive room / geometry pilot."""
    return FileResponse(STATIC / "room.html")


@app.get("/room-elements", include_in_schema=False)
def room_elements():
    """Next-step shell for communications and structural room features."""
    return FileResponse(STATIC / "room-elements.html")


@app.get("/legacy", include_in_schema=False)
def legacy_pilot():
    """Preserved OS 1.0 technical pilot for regression/debug use."""
    return FileResponse(STATIC / "legacy.html")
