from __future__ import annotations

import base64
import re
from typing import Any

import fitz


def _data_url_bytes(value: str | None) -> bytes | None:
    if not value:
        return None
    match = re.match(r"^data:[^;]+;base64,(.+)$", value, re.S)
    if not match:
        return None
    try:
        return base64.b64decode(match.group(1), validate=False)
    except Exception:
        return None


def build_proposal_pdf(order_ref: str, payload: dict[str, Any]) -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    ink = (0.09, 0.09, 0.09)
    muted = (0.38, 0.38, 0.38)
    blue = (0.184, 0.486, 1.0)

    page.draw_rect(fitz.Rect(36, 30, 559, 84), color=ink, fill=(0.03, 0.07, 0.12))
    page.insert_text((52, 63), "BIZET", fontsize=24, fontname="helv", color=(1, 1, 1))
    page.insert_text((118, 63), "OS", fontsize=24, fontname="helv", color=blue)
    page.insert_text((404, 48), "COMMERCIAL PROPOSAL", fontsize=8.5, fontname="helv", color=(1, 1, 1))
    page.insert_text((404, 64), str(order_ref or "PROJECT"), fontsize=8.5, fontname="helv", color=(0.8, 0.8, 0.8))

    image = _data_url_bytes(str(payload.get("visualization_data_url") or ""))
    hero = fitz.Rect(36, 100, 559, 390)
    page.draw_rect(hero, color=(0.7, 0.7, 0.7), fill=(0.95, 0.94, 0.92))
    if image:
        try:
            page.insert_image(hero, stream=image, keep_proportion=True)
        except Exception:
            pass

    price = str(payload.get("price") or "—")
    manufacturer = str(payload.get("manufacturer") or "BIZET")
    configuration = str(payload.get("configuration") or "—")
    runs = str(payload.get("runs") or "")
    features = payload.get("features") if isinstance(payload.get("features"), list) else []

    page.draw_rect(fitz.Rect(36, 405, 559, 462), color=ink)
    page.insert_text((50, 430), "Project price", fontsize=10, fontname="helv", color=muted)
    page.insert_text((50, 449), manufacturer, fontsize=8.5, fontname="helv", color=muted)
    page.insert_text((390, 442), price, fontsize=22, fontname="helv", color=ink)

    page.insert_text((36, 500), "Kitchen specification", fontsize=14, fontname="helv", color=ink)
    y = 524
    for line in [configuration, runs] + [str(item) for item in features if item]:
        if not line:
            continue
        page.insert_textbox(fitz.Rect(48, y, 550, y + 28), f"• {line}", fontsize=9.5, fontname="helv", color=ink)
        y += 24
        if y > 730:
            break

    page.insert_textbox(
        fitz.Rect(36, 760, 559, 810),
        "BIZET by Zaborsky · Preliminary commercial proposal. Final engineering and production validation is required.",
        fontsize=7.5,
        fontname="helv",
        color=muted,
        align=fitz.TEXT_ALIGN_LEFT,
    )
    return doc.tobytes(garbage=4, deflate=True)


def build_approval_pdf(svg_pages: list[str]) -> bytes:
    output = fitz.open()
    for svg in svg_pages[:12]:
        if not isinstance(svg, str) or "<svg" not in svg:
            continue
        try:
            source = fitz.open("svg", svg.encode("utf-8"))
            pdf_bytes = source.convert_to_pdf()
            pdf_doc = fitz.open("pdf", pdf_bytes)
            output.insert_pdf(pdf_doc)
        except Exception:
            continue
    if output.page_count == 0:
        page = output.new_page(width=842, height=595)
        page.insert_text((40, 60), "BIZET Approval Drawings", fontsize=20, fontname="helv")
        page.insert_text((40, 90), "Drawing payload could not be converted.", fontsize=10, fontname="helv")
    return output.tobytes(garbage=4, deflate=True)
