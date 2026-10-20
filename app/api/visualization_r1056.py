"""BIZET OS R10.5.6 owner-gated image edit provider.

The canonical scene is authoritative; the AI output is a visual proposal,
NEVER an engineering or manufacturing confirmation.
Set OPENAI_API_KEY and BIZET_VISUALIZATION_ACCESS_CODE on the Render service
to enable paid generation. No API secrets are exposed to the client.
"""
from __future__ import annotations

import base64
import hmac
import os
import time
from collections import defaultdict
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1.1/visualization", tags=["Pilot visualization"])
_last_call: dict[str, float] = {}
_daily_calls: dict[tuple[str, int], int] = defaultdict(int)


class RenderRequest(BaseModel):
    scene: dict[str, Any]
    reference_image: str = Field(min_length=100, max_length=5_500_000)
    additional_requirements: str = Field(default="", max_length=2000)


def _available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY") and os.getenv("BIZET_VISUALIZATION_ACCESS_CODE"))


def _locked_prompt(scene: dict[str, Any], extra: str) -> str:
    import json

    # The base instructions are authored and enforced here: never trust
    # a freeform browser-provided 'base prompt' or editable prompt field.
    serialized = json.dumps(scene, ensure_ascii=False, separators=(",", ":"))
    if len(serialized) > 30_000:
        raise HTTPException(status_code=422, detail="SCENE_DESCRIPTOR_TOO_LARGE")
    return (
        "Create a high quality photorealistic interior visualization of the "
        "EXACT furniture, room, materials and lighting visible in the supplied "
        "3D viewport reference image. Maintain identical perspective, object "
        "counts, dimensions, proportions, door placements, visible appliances, "
        "worktop joins, colors and textures. Do not add cabinets, doors or "
        "appliances or change any structural geometry. Make light realistic "
        "without covering or transforming the engineered scene. The screenshot "
        "and scene descriptor are strict constraints; preserve source fidelity. "
        "The user addendum may change only non-structural atmosphere and décor. "
        "\nCANONICAL_SCENE_JSON:\n" + serialized
        + "\nOPTIONAL_NONSTRUCTURAL_USER_STYLE_ADDITIONS:\n" + extra[:2000]
    )


@router.get("/status")
def status() -> dict[str, Any]:
    # Do not disclose environment variables, secrets, user data, quota or keys.
    return {
        "ready": _available(),
        "provider": "OpenAI images edits",
        "access_required": True,
        "reason": None if _available() else "PROVIDER_KEY_OR_OWNER_ACCESS_CODE_NOT_CONFIGURED",
        "model": os.getenv("BIZET_VISUALIZATION_MODEL", "gpt-image-1"),
    }


@router.post("/generate")
async def generate(
    payload: RenderRequest, request: Request,
    access_code: str | None = Header(default=None, alias="X-Bizet-Visualization-Code"),
) -> dict[str, Any]:
    if not _available():
        raise HTTPException(503, "PROVIDER_KEY_OR_OWNER_ACCESS_CODE_NOT_CONFIGURED")
    code = os.environ["BIZET_VISUALIZATION_ACCESS_CODE"]
    if not hmac.compare_digest(access_code or "", code):
        raise HTTPException(403, "OWNER_ACCESS_REQUIRED")
    key = os.environ["OPENAI_API_KEY"]
    address = (request.client.host if request.client else "unknown")
    now = time.time()
    day = int(now // 86400)
    if now - _last_call.get(address, 0) < 90:
        raise HTTPException(429, "RATE_LIMIT_90_SECONDS")
    if _daily_calls[(address, day)] >= 12:
        raise HTTPException(429, "OWNER_DAILY_RENDER_LIMIT")
    _last_call[address] = now
    _daily_calls[(address, day)] += 1

    image = payload.reference_image
    if not image.startswith("data:image/png;base64,"):
        raise HTTPException(422, "PNG_SCENE_REFERENCE_REQUIRED")
    try:
        png = base64.b64decode(image.partition(",")[2], validate=True)
    except Exception as exc:
        raise HTTPException(422, "INVALID_IMAGE_DATA") from exc
    if len(png) > 3_750_000 or not png.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(422, "INVALID_OR_OVERSIZED_SCENE_REFERENCE")
    prompt = _locked_prompt(payload.scene, payload.additional_requirements)
    model = os.getenv("BIZET_VISUALIZATION_MODEL", "gpt-image-1")
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            reply = await client.post(
                "https://api.openai.com/v1/images/edits",
                headers={"Authorization": f"Bearer {key}"},
                data={"model": model, "prompt": prompt, "size": "1536x1024", "quality": "medium"},
                files={"image": ("bizet_canonical_scene.png", png, "image/png")},
            )
        if reply.status_code != 200:
            # Never forward upstream exception payloads or credentials.
            raise HTTPException(502, f"IMAGE_PROVIDER_HTTP_{reply.status_code}")
        data = reply.json()
        b64 = (data.get("data") or [{}])[0].get("b64_json")
        if not b64:
            raise HTTPException(502, "IMAGE_PROVIDER_EMPTY_RESULT")
        return {"image_data_url": "data:image/png;base64," + b64, "provider_model": model, "engineering_verified": False}
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "IMAGE_PROVIDER_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, "IMAGE_PROVIDER_CONNECTION_ERROR") from exc
