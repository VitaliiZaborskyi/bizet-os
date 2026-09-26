from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any

import cv2
import fitz
import numpy as np


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


def _norm_point(x: float, y: float, width: float, height: float) -> list[float]:
    return [round(max(0.0, min(1.0, x / max(width, 1.0))), 5), round(max(0.0, min(1.0, y / max(height, 1.0))), 5)]


def _analysis_from_image(image: np.ndarray, file_type: str, method: str) -> RoomImportAnalysis:
    if image is None or image.size == 0:
        raise ValueError("Could not decode image")

    height, width = image.shape[:2]
    scale = min(1.0, 1200.0 / max(width, height))
    if scale < 1.0:
        work = cv2.resize(image, (max(1, int(width * scale)), max(1, int(height * scale))), interpolation=cv2.INTER_AREA)
    else:
        work = image.copy()

    wh, ww = work.shape[:2]
    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY) if len(work.shape) == 3 else work
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 55, 145)

    min_line = max(35, int(min(ww, wh) * 0.12))
    raw = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=max(35, int(min(ww, wh) * 0.06)),
                          minLineLength=min_line, maxLineGap=max(10, int(min(ww, wh) * 0.025)))
    segments: list[tuple[int, int, int, int, float]] = []
    if raw is not None:
        for row in raw[:, 0, :]:
            x1, y1, x2, y2 = map(int, row)
            length = float(np.hypot(x2 - x1, y2 - y1))
            if length >= min_line:
                segments.append((x1, y1, x2, y2, length))
    segments.sort(key=lambda s: s[4], reverse=True)
    segments = segments[:24]

    if segments:
        pts = np.array([(x, y) for s in segments for x, y in ((s[0], s[1]), (s[2], s[3]))], dtype=np.float32)
        x, y, bw, bh = cv2.boundingRect(pts.astype(np.int32))
    else:
        # Fallback: use the strongest edge contour rather than pretending exact geometry.
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            contour = max(contours, key=cv2.contourArea)
            x, y, bw, bh = cv2.boundingRect(contour)
        else:
            x, y, bw, bh = 0, 0, ww, wh

    # Keep the preliminary contour explicit. It is a detected envelope, not production geometry.
    contour_px = [(x, y), (x + bw, y), (x + bw, y + bh), (x, y + bh)]
    contour_norm = [_norm_point(px, py, ww, wh) for px, py in contour_px]
    bbox_norm = [round(x / ww, 5), round(y / wh, 5), round(bw / ww, 5), round(bh / wh, 5)]
    segment_norm = [
        [*_norm_point(x1, y1, ww, wh), *_norm_point(x2, y2, ww, wh)]
        for x1, y1, x2, y2, _ in segments
    ]

    line_factor = min(1.0, len(segments) / 10.0)
    envelope_factor = min(1.0, (bw * bh) / max(1.0, ww * wh) * 2.0)
    confidence = round(0.25 + 0.45 * line_factor + 0.20 * envelope_factor, 3)
    return RoomImportAnalysis(
        file_type=file_type,
        width_px=width,
        height_px=height,
        segments_norm=segment_norm,
        contour_norm=contour_norm,
        bbox_norm=bbox_norm,
        confidence=min(0.9, confidence),
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
                if not item or item[0] != "l":
                    continue
                p1, p2 = item[1], item[2]
                vector_segments.append([*_norm_point(p1.x, p1.y, width, height), *_norm_point(p2.x, p2.y, width, height)])
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
                segments_norm=vector_segments[:40],
                contour_norm=contour,
                bbox_norm=[round(x0, 5), round(y0, 5), round(x1 - x0, 5), round(y1 - y0, 5)],
                confidence=round(confidence, 3),
                method="PDF_VECTOR_LINES",
            )
        pix = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
        image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
        else:
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        return _analysis_from_image(image, "PDF", "PDF_RASTER_HOUGH")

    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    return _analysis_from_image(image, "PHOTO", "IMAGE_HOUGH")
