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

    currency = str(payload.get("currency") or "UAH").upper()
    raw_price = str(payload.get("price") or "—").strip()
    price = raw_price if currency in raw_price.upper() else f"{raw_price} {currency}"
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
        "BIZET by Zaborsky · Generated from the current saved BIZET OS project configuration. Approval drawings and manufacturing documentation are separate documents.",
        fontsize=7.5,
        fontname="helv",
        color=muted,
        align=fitz.TEXT_ALIGN_LEFT,
    )
    return doc.tobytes(garbage=4, deflate=True)


def build_approval_pdf(svg_pages: list[str]) -> bytes:
    """Fail-closed 10.6.5 approval PDF. No silently omitted sheets / placeholder PDFs."""
    if not isinstance(svg_pages, list) or not 4 <= len(svg_pages) <= 30:
        raise ValueError("STOP_APPROVAL_PAGE_COUNT_INVALID")
    hashes = []
    for index, svg in enumerate(svg_pages, 1):
        if not isinstance(svg, str) or "<svg" not in svg or "</svg>" not in svg:
            raise ValueError(f"STOP_APPROVAL_SVG_MISSING_PAGE_{index}")
        match = re.search(r"SNAPSHOT\s+(R1065-[0-9a-f]{8})", svg)
        if match is None:
            raise ValueError(f"STOP_APPROVAL_STATE_HASH_MISSING_PAGE_{index}")
        hashes.append(match.group(1))
    if len(set(hashes)) != 1:
        raise ValueError("STOP_APPROVAL_MIXED_STATE_HASHES")
    output = fitz.open()
    for index, svg in enumerate(svg_pages, 1):
        try:
            source = fitz.open("svg", svg.encode("utf-8"))
            pdf_bytes = source.convert_to_pdf()
            pdf_doc = fitz.open("pdf", pdf_bytes)
            if pdf_doc.page_count != 1:
                raise ValueError(f"SVG produced {pdf_doc.page_count} pages")
            page = pdf_doc[0]
            # HTML/print paths are A4 landscape; adjust each converted SVG to A4.
            page.set_cropbox(page.rect)
            output.insert_pdf(pdf_doc)
            actual = output[-1].rect
            if actual.width <= 0 or actual.height <= 0:
                raise ValueError("Invalid geometry or missing page box")
        except Exception as exc:
            raise ValueError(f"STOP_APPROVAL_CONVERSION_FAILED_PAGE_{index}: {exc}") from exc
    if output.page_count != len(svg_pages):
        raise ValueError("STOP_APPROVAL_INCOMPLETE_PDF")
    # The artwork is 1120 × 790 SVG units; scale all exported sheets uniformly
    # into exact 297 × 210 mm PDF physical paper (841.8898 × 595.2756 pt).
    final = fitz.open()
    for index in range(output.page_count):
        page = final.new_page(width=841.8898, height=595.2756)
        # Match browser's 282 mm wide SVG print area, not a 297 mm bleed.
        x0 = (297 - 282) / 2 * 72 / 25.4
        y0 = (210 - 198.94) / 2 * 72 / 25.4
        target = fitz.Rect(x0, y0, 841.8898 - x0, 595.2756 - y0)
        page.show_pdf_page(target, output, index, keep_proportion=True)
    if final.page_count != len(svg_pages):
        raise ValueError("STOP_APPROVAL_A4_LAYOUT_MISMATCH")
    return final.tobytes(garbage=4, deflate=True)
