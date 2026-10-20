from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import fitz


@dataclass
class RoomImportAnalysis:
    file_type: str
    width_px: int
    height_px: int
    segments_norm: list[list[float]]
    contour_norm: list[list[float]]
    bbox_norm: list[float]
    confidence: float
    method: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "file_type": self.file_type,
            "width_px": self.width_px,
            "height_px": self.height_px,
            "segments_norm": self.segments_norm,
            "contour_norm": self.contour_norm,
            "bbox_norm": self.bbox_norm,
            "confidence": self.confidence,
            "method": self.method,
        }


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _norm_point(x: float, y: float, width: float, height: float) -> list[float]:
    return [round(_clamp01(x / max(width, 1.0)), 5), round(_clamp01(y / max(height, 1.0)), 5)]


def _select_peaks(scores: list[tuple[float, int]], limit: int, min_gap: int) -> list[int]:
    chosen: list[int] = []
    for _, pos in sorted(scores, reverse=True):
        if all(abs(pos - other) >= min_gap for other in chosen):
            chosen.append(pos)
        if len(chosen) >= limit:
            break
    return sorted(chosen)


def _analysis_from_pixmap(pix: fitz.Pixmap, file_type: str, method: str) -> RoomImportAnalysis:
    width, height = int(pix.width), int(pix.height)
    n = int(pix.n)
    samples = pix.samples
    step = max(1, int(max(width, height) / 420))

    def gray(x: int, y: int) -> int:
        idx = (y * width + x) * n
        if n >= 3:
            return (int(samples[idx]) * 30 + int(samples[idx + 1]) * 59 + int(samples[idx + 2]) * 11) // 100
        return int(samples[idx])

    row_scores: list[tuple[float, int]] = []
    for y in range(step, height - step, step):
        total = 0
        count = 0
        for x in range(0, width, step):
            total += abs(gray(x, y) - gray(x, y - step))
            count += 1
        row_scores.append((total / max(1, count), y))

    col_scores: list[tuple[float, int]] = []
    for x in range(step, width - step, step):
        total = 0
        count = 0
        for y in range(0, height, step):
            total += abs(gray(x, y) - gray(x - step, y))
            count += 1
        col_scores.append((total / max(1, count), x))

    min_gap_x = max(step * 3, int(width * 0.08))
    min_gap_y = max(step * 3, int(height * 0.08))
    xs = _select_peaks(col_scores, 4, min_gap_x)
    ys = _select_peaks(row_scores, 4, min_gap_y)

    if len(xs) >= 2:
        x0, x1 = xs[0], xs[-1]
    else:
        x0, x1 = int(width * 0.08), int(width * 0.92)
    if len(ys) >= 2:
        y0, y1 = ys[0], ys[-1]
    else:
        y0, y1 = int(height * 0.08), int(height * 0.92)

    if x1 - x0 < width * 0.25:
        x0, x1 = int(width * 0.08), int(width * 0.92)
    if y1 - y0 < height * 0.25:
        y0, y1 = int(height * 0.08), int(height * 0.92)

    segments: list[list[float]] = []
    for x in xs:
        segments.append([*_norm_point(x, y0, width, height), *_norm_point(x, y1, width, height)])
    for y in ys:
        segments.append([*_norm_point(x0, y, width, height), *_norm_point(x1, y, width, height)])

    contour = [
        _norm_point(x0, y0, width, height),
        _norm_point(x1, y0, width, height),
        _norm_point(x1, y1, width, height),
        _norm_point(x0, y1, width, height),
    ]
    bbox = [round(x0 / width, 5), round(y0 / height, 5), round((x1 - x0) / width, 5), round((y1 - y0) / height, 5)]
    confidence = round(min(0.78, 0.28 + 0.07 * len(segments)), 3)
    return RoomImportAnalysis(
        file_type=file_type,
        width_px=width,
        height_px=height,
        segments_norm=segments,
        contour_norm=contour,
        bbox_norm=bbox,
        confidence=confidence,
        method=method,
    )


def analyze_room_file(data: bytes, filename: str, content_type: str | None = None) -> RoomImportAnalysis:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    if name.endswith(".pdf") or ctype == "application/pdf":
        doc = fitz.open(stream=data, filetype="pdf")
        if doc.page_count < 1:
            raise ValueError("PDF has no pages")
        page = doc[0]
        drawings = page.get_drawings()
        vector_segments: list[list[float]] = []
        width, height = float(page.rect.width), float(page.rect.height)
        for drawing in drawings:
            for item in drawing.get("items", []):
                if not item:
                    continue
                if item[0] == "l":
                    p1, p2 = item[1], item[2]
                    vector_segments.append([*_norm_point(p1.x, p1.y, width, height), *_norm_point(p2.x, p2.y, width, height)])
                elif item[0] == "re":
                    rect = item[1]
                    pts = [(rect.x0, rect.y0), (rect.x1, rect.y0), (rect.x1, rect.y1), (rect.x0, rect.y1)]
                    for i in range(4):
                        a, b = pts[i], pts[(i + 1) % 4]
                        vector_segments.append([*_norm_point(a[0], a[1], width, height), *_norm_point(b[0], b[1], width, height)])
        if len(vector_segments) >= 4:
            xs = [v for s in vector_segments for v in (s[0], s[2])]
            ys = [v for s in vector_segments for v in (s[1], s[3])]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            contour = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
            confidence = min(0.92, 0.45 + min(0.45, len(vector_segments) / 80.0))
            return RoomImportAnalysis(
                file_type="PDF",
                width_px=max(1, int(round(width))),
                height_px=max(1, int(round(height))),
                segments_norm=vector_segments[:48],
                contour_norm=contour,
                bbox_norm=[round(x0, 5), round(y0, 5), round(x1 - x0, 5), round(y1 - y0, 5)],
                confidence=round(confidence, 3),
                method="PDF_VECTOR_LINES",
            )
        pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        return _analysis_from_pixmap(pix, "PDF", "PDF_RASTER_EDGE_PROFILE")

    try:
        pix = fitz.Pixmap(data)
    except Exception as exc:
        raise ValueError("Unsupported or unreadable image") from exc
    if pix.alpha:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return _analysis_from_pixmap(pix, "PHOTO", "IMAGE_EDGE_PROFILE")
