from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.api.routes_v11 import router as router_v11

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"

app = FastAPI(title="BIZET OS 1.1", version="1.1-D")
app.add_middleware(GZipMiddleware, minimum_size=500)
app.include_router(router)
app.include_router(router_v11)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.middleware("http")
async def pilot_cache_headers(request: Request, call_next):
    """Keep QA HTML fresh while allowing lightweight asset reuse on phone/laptop."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=86400"
    elif path in {"/", "/room", "/room-elements", "/custom-configuration", "/linear-span", "/dimensions", "/guided", "/model", "/materials"}:
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.head("/", include_in_schema=False)
def index_head():
    """Fast wake/health response for Render and browser preflight probes."""
    return Response(status_code=200)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/custom-configuration", include_in_schema=False)
def custom_configuration():
    """Standalone user-drawn kitchen configuration UX pilot."""
    return FileResponse(STATIC / "custom-configuration.html")


@app.get("/linear-span", include_in_schema=False)
def linear_span_pilot():
    """Straight-kitchen wall coverage and edge-offset pilot."""
    return FileResponse(STATIC / "linear-span.html")


@app.get("/dimensions", include_in_schema=False)
def dimensions_pilot():
    """Configuration-aware perspective 3D room dimension pilot."""
    return FileResponse(STATIC / "dimensions.html")


@app.get("/guided", include_in_schema=False)
def guided_pilot():
    """One-screen-one-question appliance and ceiling pilot."""
    return FileResponse(STATIC / "guided.html")


@app.get("/model", include_in_schema=False)
def model_pilot():
    """Generated kitchen model interaction scaffold."""
    return FileResponse(STATIC / "model.html")


@app.get("/materials", include_in_schema=False)
def materials_pilot():
    """Materials and hardware confirmation scaffold."""
    return FileResponse(STATIC / "materials.html")


@app.get("/room", include_in_schema=False)
def room_viewport():
    """Preserved interactive room / geometry pilot."""
    return FileResponse(STATIC / "room.html")


@app.get("/room-elements", include_in_schema=False)
def room_elements():
    """Preserved communications / room-elements pilot."""
    return FileResponse(STATIC / "room-elements.html")


@app.get("/legacy", include_in_schema=False)
def legacy_pilot():
    """Preserved OS 1.0 technical pilot for regression/debug use."""
    return FileResponse(STATIC / "legacy.html")
