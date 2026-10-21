"""BIZET OS 10.5.7 Visualization Integration acceptance suite.

Use mocked transport for paid OpenAI calls; no live account access is implied.
Browser/iPhone geometry + actual paid image generation still require owner QA.
"""
import base64
import os
import shutil
import subprocess
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.api import visualization_r1056 as viz

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "app" / "static"


def source(file):
    return (STATIC / file).read_text(encoding="utf-8")


def example_scene():
    return {
        "source": "BIZET_OS_CANONICAL_PROJECT_STATE",
        "project_id": "qa-example-no-identifying-data",
        "source_version": "R10.5.7",
        "configuration": "WALL_CENTER",
        "room_mm": {"length": 6000, "depth": 4200, "height": 2800},
        "room_elements": [],
        "modules": [
            {
                "id": "fridge", "kind": "FRIDGE", "wall": "A", "x_mm": 0,
                "y_mm": 3640, "z_mm": 100, "width_mm": 600,
                "depth_mm": 560, "height_mm": 2400,
                "facade_count": 2, "facade_openings": ["LEFT", "LEFT"]
            },
            {
                "id": "sink", "kind": "SINK", "wall": "A", "x_mm": 600,
                "y_mm": 3640, "z_mm": 100, "width_mm": 600,
                "depth_mm": 560, "height_mm": 762,
                "facade_count": 1, "facade_openings": ["RIGHT"]
            },
            {
                "id": "cooktop", "kind": "COOKTOP", "wall": "A", "x_mm": 1200,
                "y_mm": 3640, "z_mm": 100, "width_mm": 600,
                "depth_mm": 560, "height_mm": 762,
                "facade_count": 0, "facade_openings": []
            },
        ],
        "room_surfaces": {
            "floor": {"type": None, "preset": None, "custom_texture_name": None},
            "walls": {"type": None, "preset": None, "custom_texture_name": None},
        },
        "fixtures": {"lighting_enabled": "NO", "lighting_kelvin": 3000}
    }


def fake_reference():
    raw = b"\x89PNG\r\n\x1a\n" + b"\x00" * 120
    return "data:image/png;base64," + base64.b64encode(raw).decode()


def test_canonical_prompt_is_server_enforced_and_read_only():
    c = TestClient(app)
    p = c.post("/api/v1.1/visualization/prompt", json={"scene": example_scene()})
    assert p.status_code == 200, p.text
    body = p.json()
    assert body["version"] == "10.5.7"
    assert len(body["scene_sha256"]) == 64
    prompt = body["prompt"]
    for text in [
        "ENGINEERING LOCKED", "CANONICAL_SCENE_DESCRIPTOR_JSON",
        "No missing", "sink or hob", "40 mm fridge-to-wall filler",
        "green apple", "red apple", "banana", "orange",
        "do not invent a replacement", "appliances",
    ]:
        assert text.lower() in prompt.lower(), text
    assert "FRIDGE_WALL_FILLER_40MM_UNRESOLVED" in body["warnings"]


def test_unknown_scene_is_rejected_not_silently_fabricated():
    c = TestClient(app)
    r = c.post("/api/v1.1/visualization/prompt", json={"scene": {}})
    assert r.status_code == 422
    bad = example_scene()
    bad["modules"][0]["height_mm"] = -4
    r = c.post("/api/v1.1/visualization/prompt", json={"scene": bad})
    assert r.status_code == 422


def test_provider_status_without_secrets():
    with patch.dict(os.environ, {}, clear=True):
        r = TestClient(app).get("/api/v1.1/visualization/status")
        assert r.status_code == 200
        assert r.json()["ready"] is False
        assert r.json()["model"] == "gpt-image-2.5-sunburst"
        denied = TestClient(app).post("/api/v1.1/visualization/generate", json={
            "scene": example_scene(), "reference_image": fake_reference()})
        assert denied.status_code == 503


def test_access_denied_with_wrong_code_even_when_provider_is_ready():
    with patch.dict(os.environ, {
        "OPENAI_API_KEY": "FAKE_TEST_TOKEN",
        "BIZET_VISUALIZATION_ACCESS_CODE": "OWNER_TEST_ONLY",
    }, clear=True):
        c = TestClient(app)
        assert c.get("/api/v1.1/visualization/status").json()["ready"] is True
        r = c.post("/api/v1.1/visualization/generate",
                   headers={"X-Bizet-Visualization-Code": "INVALID"},
                   json={"scene": example_scene(), "reference_image": fake_reference()})
        assert r.status_code == 403


def test_mocked_real_generation_request_roundtrip(monkeypatch):
    """Verify multipart body, GPT Image model, service receipt and output."""
    class FakeResponse:
        status_code = 200
        def json(self):
            return {"data": [{"b64_json": base64.b64encode(b"\x89PNG\r\n\x1a\nqa").decode()}]}

    calls = {}
    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, **kwargs):
            calls.update({"url": url, **kwargs})
            return FakeResponse()

    monkeypatch.setattr(viz.httpx, "AsyncClient", FakeAsyncClient)
    viz._last_call.clear()
    viz._daily_calls.clear()
    with patch.dict(os.environ, {
        "OPENAI_API_KEY": "FAKE_TEST_TOKEN",
        "BIZET_VISUALIZATION_ACCESS_CODE": "OWNER_TEST_ONLY",
    }, clear=True):
        r = TestClient(app).post(
            "/api/v1.1/visualization/generate",
            headers={"X-Bizet-Visualization-Code": "OWNER_TEST_ONLY"},
            json={
                "scene": example_scene(), "reference_image": fake_reference(),
                "additional_requirements": "Warm afternoon daylight"
            })
    assert r.status_code == 200, r.text
    assert r.json()["image_data_url"].startswith("data:image/png;base64,")
    assert r.json()["provider_model"] == "gpt-image-2.5-sunburst"
    assert r.json()["engineering_verified"] is False
    assert calls["url"] == "https://api.openai.com/v1/images/edits"
    assert calls["data"]["size"] == "1536x1024"
    assert calls["data"]["model"] == "gpt-image-2.5-sunburst"
    assert "Warm afternoon daylight" in calls["data"]["prompt"]
    assert "FINAL NON-OVERRIDABLE CHECK" in calls["data"]["prompt"]
    assert calls["files"]["image"][0].endswith(".png")
    assert calls["headers"]["Authorization"] == "Bearer FAKE_TEST_TOKEN"


def test_visualization_button_is_first_and_prompt_is_locked():
    html = source("workspace-r8.html")
    menu = html[html.index('id="workspaceTools"'):html.index("</nav>", html.index('id="workspaceTools"'))]
    assert 'id="openVisualizationR1056"' not in menu
    assert menu.index('data-panel="general"') > menu.index('data-panel="room"')
    assert 'id="openVisualizationTop"' in html
    assert "/static/visualization-r1055.js?v=1057" in html
    js = source("visualization-r1055.js")
    for phrase in [
        "readonly aria-readonly", "function referenceCapture()", "function promptFor(scene)",
        "function snapshot()", "function downloadImage()", "function generate()",
        "phaseUpdate('GENERATING')", "phaseUpdate('SUCCESS')",
        "phaseUpdate('ERROR')", "window.BizetVisualizationR1056",
        "/generate", "/prompt", "r1057Save", "retry",
    ]:
        if phrase == "retry":
            assert "Сгенерировать повторно" in js
        else:
            assert phrase in js, phrase


def test_10_5_7_current_version_and_node_syntax():
    assert 'version="R10.5.8"' in (ROOT / "app" / "main.py").read_text()
    assert "R10.5.8 — Робоча модель" in source("workspace-r8.html")
    node = shutil.which("node")
    if not node:
        import pytest
        pytest.skip("Node.js unavailable")
    p = subprocess.run([node, "--check", str(STATIC / "visualization-r1055.js")],
                       capture_output=True, text=True)
    assert p.returncode == 0, p.stderr
