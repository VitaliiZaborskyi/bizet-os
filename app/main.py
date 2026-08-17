from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"

app = FastAPI(title="BIZET OS 1.0 Prototype", version="0.1.0")
app.include_router(router)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")
