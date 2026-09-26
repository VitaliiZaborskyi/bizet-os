from __future__ import annotations

import io

import fitz
from fastapi.testclient import TestClient

from app.main import app
from app.project.repository import repository

client = TestClient(app)


def create_project() -> str:
    response = client.post("/api/v1.1/projects", json={})
    assert response.status_code == 200
    return response.json()["identity"]["internal_id"]


def test_room_import_png_analyze_calibrate_confirm_changes_project_geometry():
    pid = create_project()
    doc = fitz.open()
    page = doc.new_page(width=800, height=500)
    shape = page.new_shape()
    shape.draw_rect(fitz.Rect(80, 100, 720, 420))
    shape.finish(color=(0, 0, 0), width=7)
    shape.commit()
    pix = page.get_pixmap(alpha=False)
    png = pix.tobytes("png")
    analyze = client.post(
        f"/api/v1.1/projects/{pid}/room-import/analyze",
        files={"file": ("plan.png", png, "image/png")},
    )
    assert analyze.status_code == 200, analyze.text
    state = analyze.json()["room_import"]
    assert state["status"] == "ANALYZED_SCALE_REQUIRED"
    assert state["analysis"]["file_type"] == "PHOTO"
    assert len(state["analysis"]["segments_norm"]) >= 4

    calibrate = client.post(
        f"/api/v1.1/projects/{pid}/room-import/calibrate",
        json={"known_dimension_mm": 4000},
    )
    assert calibrate.status_code == 200, calibrate.text
    data = calibrate.json()
    assert data["room_import"]["status"] == "ROOM_MODEL_PREVIEW_READY"
    assert data["project"]["room"]["geometry"]["wall_length"]["value_mm"] == 4000
    assert data["project"]["room"]["geometry"]["wall_depth"]["value_mm"] >= 600
    assert data["room_import"]["canonical_room_model"]["walls"][0]["label"] == "A"

    confirm = client.post(f"/api/v1.1/projects/{pid}/room-import/confirm")
    assert confirm.status_code == 200, confirm.text
    project = confirm.json()
    assert project["scene"]["visual_settings"]["room_import"]["status"] == "ROOM_MODEL_CONFIRMED"
    assert project["room"]["geometry"]["wall_length"]["provenance"]["confirmed"] is True


def test_room_import_pdf_vector_lines_are_detected():
    pid = create_project()
    doc = fitz.open()
    page = doc.new_page(width=800, height=500)
    shape = page.new_shape()
    shape.draw_rect(fitz.Rect(100, 100, 700, 400))
    shape.finish(color=(0, 0, 0), width=2)
    shape.commit()
    data = doc.tobytes()
    analyze = client.post(
        f"/api/v1.1/projects/{pid}/room-import/analyze",
        files={"file": ("plan.pdf", data, "application/pdf")},
    )
    assert analyze.status_code == 200, analyze.text
    state = analyze.json()["room_import"]
    assert state["analysis"]["file_type"] == "PDF"
    assert state["analysis"]["method"] in {"PDF_VECTOR_LINES", "PDF_RASTER_HOUGH"}
    assert len(state["analysis"]["contour_norm"]) >= 4


def test_proposal_send_returns_not_configured_without_resend_env(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM", raising=False)
    pid = create_project()
    active = client.post(
        f"/api/v1.1/projects/{pid}/activate-order",
        json={"country_code": "UA", "city_code": "ODS"},
    )
    assert active.status_code == 200
    response = client.post(
        f"/api/v1.1/projects/{pid}/proposal/send",
        json={
            "recipient": "client@example.com",
            "price": "100 000 грн",
            "manufacturer": "BIZET Furniture",
            "configuration": "Прямая",
            "runs": "Стена A: 4000 mm",
            "features": ["Корпус — ЛДСП 18 мм"],
        },
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "MAIL_PROVIDER_NOT_CONFIGURED"


def test_proposal_send_records_resend_message_id(monkeypatch):
    pid = create_project()
    active = client.post(
        f"/api/v1.1/projects/{pid}/activate-order",
        json={"country_code": "UA", "city_code": "ODS"},
    )
    assert active.status_code == 200

    monkeypatch.setattr("app.api.routes_v11.send_with_resend", lambda recipient, subject, html_body: "email_test_123")
    response = client.post(
        f"/api/v1.1/projects/{pid}/proposal/send",
        json={
            "recipient": "client@example.com",
            "price": "100 000 грн",
            "manufacturer": "BIZET Furniture",
            "configuration": "Прямая",
            "runs": "Стена A: 4000 mm",
            "features": ["Корпус — ЛДСП 18 мм"],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["message_id"] == "email_test_123"
    project = repository.get(pid)
    assert project is not None
    assert project.commerce.proposal_status == "SENT"
    assert project.commerce.proposal_delivery_status == "SENT"
    assert project.commerce.proposal_recipient == "client@example.com"
