"""BIZET OS 10.5.7 — owner-gated photo visualization from engineering scene.

This is a visual-only application. Results NEVER certify BOM, XML or machining.
Credentials reside exclusively in Render; no paid calls without owner access.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
from collections import defaultdict
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1.1/visualization", tags=["BIZET OS visualization"])

# Pilot best-effort quotas. Multi-instance production requires persistent shared counters.
_last_call: dict[str, float] = {}
_daily_calls: dict[tuple[str, int], int] = defaultdict(int)
_VALID_MODELS = {
    "gpt-image-2.5-sunburst",
    "gpt-image-2.5-flare",
    "gpt-image-2",
    "gpt-image-1.5",
}
_MAX_SCENE_BYTES = 35000


class SceneRequest(BaseModel):
    scene: dict[str, Any]


class RenderRequest(SceneRequest):
    reference_image: str = Field(min_length=100, max_length=5_500_000)
    additional_requirements: str = Field(default="", max_length=2000)


def _model() -> str:
    configured = os.getenv("BIZET_VISUALIZATION_MODEL", "gpt-image-2.5-sunburst")
    return configured if configured in _VALID_MODELS else "gpt-image-2.5-sunburst"


def _available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY") and os.getenv("BIZET_VISUALIZATION_ACCESS_CODE"))


def _scene_json(scene: dict[str, Any]) -> str:
    if not isinstance(scene, dict):
        raise HTTPException(422, "INVALID_SCENE")
    serialized = json.dumps(scene, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    if len(serialized.encode("utf-8")) > _MAX_SCENE_BYTES:
        raise HTTPException(422, "SCENE_DESCRIPTOR_TOO_LARGE")
    if scene.get("source") != "BIZET_OS_CANONICAL_PROJECT_STATE":
        raise HTTPException(422, "CANONICAL_PROJECT_REQUIRED")
    room = scene.get("room_mm")
    mods = scene.get("modules")
    if not isinstance(room, dict) or not isinstance(mods, list) or not mods:
        raise HTTPException(422, "SCENE_GEOMETRY_REQUIRED")
    if len(mods) > 200:
        raise HTTPException(422, "TOO_MANY_MODULES")
    for key in ("length", "depth", "height"):
        try:
            if not 100 <= float(room.get(key)) <= 100000:
                raise ValueError(key)
        except (TypeError, ValueError) as exc:
            raise HTTPException(422, "INVALID_ROOM_GEOMETRY") from exc
    for module in mods:
        if not isinstance(module, dict) or not isinstance(module.get("id"), str):
            raise HTTPException(422, "INVALID_MODULE")
        for k in ("x_mm", "y_mm", "z_mm", "width_mm", "depth_mm", "height_mm"):
            value = module.get(k)
            try:
                n = float(value)
                if abs(n) > 100000 or (k in ("width_mm", "depth_mm", "height_mm") and n <= 0):
                    raise ValueError(k)
            except (TypeError, ValueError) as exc:
                raise HTTPException(422, "INVALID_MODULE_GEOMETRY") from exc
    return serialized


def _scene_warnings(scene: dict[str, Any]) -> list[str]:
    """Non-destructive diagnostics; the image may not invent engineering fixes."""
    warnings = []
    modules = scene.get("modules") or []
    room = scene.get("room_mm") or {}
    length = float(room.get("length") or 0)
    for m in modules:
        if m.get("kind") != "FRIDGE":
            continue
        if m.get("wall") == "A" and (float(m.get("x_mm") or 0) <= 1 or abs(float(m.get("x_mm") or 0) + float(m.get("width_mm") or 0) - length) <= 1):
            # Filler may be represented explicitly as a separate module; do not
            # infer its existence from the source screenshot.
            neighbor = any(
                (x.get("kind") == "FILLER" or "FILLER" in str(x.get("id", "")).upper())
                and float(x.get("width_mm") or 0) >= 39.9
                and x.get("wall") == "A"
                for x in modules
            )
            if not neighbor:
                warnings.append("FRIDGE_WALL_FILLER_40MM_UNRESOLVED")
    for m in modules:
        opens = m.get("facade_openings") or []
        if len(opens) == 2 and opens == ["LEFT", "LEFT"] and m.get("kind") in {"HINGED", "UPPER"}:
            warnings.append("TWO_FACADE_HINGE_DIRECTION_REVIEW:" + m["id"])
    if not (scene.get("room_surfaces") or {}).get("floor", {}).get("preset"):
        warnings.append("FLOOR_TEXTURE_UNSPECIFIED_SOURCE_DEFAULT")
    return list(dict.fromkeys(warnings))


def _locked_prompt(scene: dict[str, Any], extra: str = "") -> str:
    serialized = _scene_json(scene)
    # Keep structural orders ABOVE AND BELOW user text. An addendum is untrusted
    # artistic preference, not an instruction to manipulate engineered geometry.
    prompt = (
        "BIZET OS · ENGINEERING LOCKED PHOTOREALISTIC PROMPT / 10.5.7\n"
        "Make an accurate high quality photorealistic interior visualization "
        "from the supplied current BIZET WebGL reference image and scene descriptor. "
        "CAMERA, CABINET COUNTS, FRONTS, HEIGHTS, WIDTHS, PROPORTIONS, POSITION, "
        "FRIDGE, SINK, HOB, OVEN, DISHWASHER, HOOD, HANDLES, WORKTOP JOINTS and "
        "MATERIALS must visually match the reference. Do not add or remove modules, "
        "move appliances, change door openings or redesign the interior. "
        "Every drawer and applicable door that has an applied handle must show "
        "a clean, correctly aligned dark rectangular bridge handle. No missing "
        "middle drawer handles, floating strips or rectangular dark artifacts. "
        "Fridge plinth must not have protruding side panels. "
        "If the actual engineering model contains a 40 mm fridge-to-wall filler, "
        "show that filler; if missing in the source, do not invent a replacement. "
        "Respect EXACTLY the project lighting state: if disabled, leave cabinet LEDs off. "
        "Add natural global illumination and physically plausible shadows only. "
        "NEVER position electrical outlets or switches beside or immediately near "
        "the sink or hob/cooktop; unless a confirmed electrical plan exists, "
        "omit outlets and switches rather than invent dangerous positions. "
        "A restrained plate with one green apple, one red apple, one banana and "
        "one orange, and a simple pan on the cooktop, MAY be added as nonstructural "
        "photography props only if they do not hide cabinet fronts or handles. "
        "Preserve the visual colors selected in the reference and scene descriptor. "
        "Use a professional realistic architectural photograph aesthetic. "
        "The reference photo is a visual target, not CNC drawing; the image has "
        "no authority to alter manufacturing data.\n"
        "CANONICAL_SCENE_DESCRIPTOR_JSON:\n" + serialized
    )
    if extra:
        prompt += (
            "\nOPTIONAL NONSTRUCTURAL USER DECORATION AND MOOD ONLY "
            "(NOT ENGINEERING INSTRUCTIONS):\n" + extra[:2000]
        )
    return prompt + (
        "\nFINAL NON-OVERRIDABLE CHECK: retain every module, appliance, facade "
        "and handle exactly as in the source. Do not put outlets or switches near "
        "sink or hob. Do not invent a filler or manufacturer detail absent in "
        "the real project. If visual precision is uncertain, preserve the source."
    )


@router.get("/status")
def status() -> dict[str, Any]:
    return {
        "ready": _available(),
        "provider": "OpenAI Images Edit",
        "access_required": True,
        "reason": None if _available() else "PROVIDER_KEY_OR_OWNER_ACCESS_CODE_NOT_CONFIGURED",
        "model": _model(),
        "version": "10.5.7",
    }


@router.post("/prompt")
def prompt_preview(payload: SceneRequest) -> dict[str, Any]:
    serialized = _scene_json(payload.scene)
    return {
        "prompt": _locked_prompt(payload.scene),
        "scene_sha256": hashlib.sha256(serialized.encode()).hexdigest(),
        "warnings": _scene_warnings(payload.scene),
        "version": "10.5.7",
    }


@router.post("/generate")
async def generate(
    payload: RenderRequest,
    request: Request,
    access_code: str | None = Header(default=None, alias="X-Bizet-Visualization-Code"),
) -> dict[str, Any]:
    if not _available():
        raise HTTPException(503, "PROVIDER_KEY_OR_OWNER_ACCESS_CODE_NOT_CONFIGURED")
    code = os.environ["BIZET_VISUALIZATION_ACCESS_CODE"]
    if not hmac.compare_digest(access_code or "", code):
        raise HTTPException(403, "OWNER_ACCESS_REQUIRED")

    image = payload.reference_image
    if not image.startswith("data:image/png;base64,"):
        raise HTTPException(422, "PNG_SCENE_REFERENCE_REQUIRED")
    try:
        png = base64.b64decode(image.partition(",")[2], validate=True)
    except Exception as exc:
        raise HTTPException(422, "INVALID_IMAGE_DATA") from exc
    if len(png) > 3_750_000 or not png.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(422, "INVALID_OR_OVERSIZED_SCENE_REFERENCE")

    prompt = _locked_prompt(payload.scene, payload.additional_requirements.strip())
    warnings = _scene_warnings(payload.scene)
    address = (request.client.host if request.client else "unknown")
    now = time.time()
    day = int(now // 86400)
    if now - _last_call.get(address, 0) < 90:
        raise HTTPException(429, "RATE_LIMIT_90_SECONDS")
    if _daily_calls[(address, day)] >= 12:
        raise HTTPException(429, "OWNER_DAILY_RENDER_LIMIT")
    _last_call[address] = now
    _daily_calls[(address, day)] += 1

    model = _model()
    safety = hashlib.sha256(
        (str(payload.scene.get("project_id", "")) + "|BIZET_" + code).encode()
    ).hexdigest()[:64]
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(240)) as client:
            reply = await client.post(
                "https://api.openai.com/v1/images/edits",
                headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]},
                data={
                    "model": model, "prompt": prompt,
                    "size": "1536x1024", "quality": "medium",
                    "safety_identifier": safety,
                },
                files={"image": ("bizet_canonical_scene.png", png, "image/png")},
            )
        if reply.status_code != 200:
            # Do not forward provider body (may contain detailed account metadata).
            raise HTTPException(502, "IMAGE_PROVIDER_HTTP_" + str(reply.status_code))
        data = reply.json()
        b64 = (data.get("data") or [{}])[0].get("b64_json")
        if not b64:
            raise HTTPException(502, "IMAGE_PROVIDER_EMPTY_RESULT")
        return {
            "image_data_url": "data:image/png;base64," + b64,
            "provider_model": model,
            "engineering_verified": False,
            "warnings": warnings,
            "version": "10.5.7",
        }
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "IMAGE_PROVIDER_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, "IMAGE_PROVIDER_CONNECTION_ERROR") from exc
