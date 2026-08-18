from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.api.routes_v11 import router as router_v11

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"

app = FastAPI(title="BIZET OS 1.1 Foundation", version="1.1-A")
app.include_router(router)
app.include_router(router_v11)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")
