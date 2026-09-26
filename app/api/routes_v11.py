from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime, timezone
import re

from app.engine.application_no import next_order_no
from app.engine.rules import DecisionEngine
from app.project.legacy_adapter import LegacyAdapterError, project_state_to_legacy_input
from app.project.models import ChangeCommand, MutationResult, ProjectState
from app.project.mutations import ProjectMutationService
from app.project.repository import repository
from app.quest.engine import QuestEngine
from app.quest.mapper import decision_to_client, decision_to_debug
from app.quest.service import QuestAnswerError, QuestAnswerService
from app.services.room_import import analyze_room_file
from app.services.mail import build_proposal_email, send_with_resend, resend_configured, MailProviderNotConfigured, MailDeliveryError

router = APIRouter(prefix="/api/v1.1")
mutation_service = ProjectMutationService()
quest_engine = QuestEngine()
quest_service = QuestAnswerService(engine=quest_engine, mutation_service=mutation_service)


class CreateProjectRequest(BaseModel):
    project: ProjectState | None = None


class RecalculateResponse(BaseModel):
    project: ProjectState
    recalculated: list[str] = Field(default_factory=list)
    legacy_engine_candidate_count: int | None = None
    legacy_engine_status: str | None = None
    legacy_engine_error: str | None = None


@router.post("/projects", response_model=ProjectState)
def create_project(payload: CreateProjectRequest | None = None):
    project = payload.project if payload and payload.project else ProjectState()
    # R10.2: stage A is only a session. Permanent order number is assigned at Point B.
    repository.create(project)
    return project


class ActivateOrderRequest(BaseModel):
    country_code: str | None = None
    city_code: str | None = None


class SetOrderStageRequest(BaseModel):
    stage: Literal["B", "C"]


@router.post("/projects/{project_id}/activate-order", response_model=ProjectState)
def activate_order(project_id: str, payload: ActivateOrderRequest | None = None):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.identity.order_no:
        country = (payload.country_code if payload else None) or project.context.country_code or "XX"
        city = (payload.city_code if payload else None) or project.context.city_code or "XXX"
        project.identity.order_no = next_order_no(country, city)
        project.identity.order_country_code = country.upper()
        project.identity.order_city_code = city.upper()
        project.identity.order_assigned_at = datetime.now(timezone.utc)
    if project.identity.order_stage == "A":
        project.identity.order_stage = "B"
    repository.save(project)
    return project


@router.post("/projects/{project_id}/order-stage", response_model=ProjectState)
def set_order_stage(project_id: str, payload: SetOrderStageRequest):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.identity.order_no:
        raise HTTPException(status_code=409, detail="Order number is assigned only at Point B")
    if payload.stage == "C":
        project.identity.order_stage = "C"
        project.identity.sold_at = datetime.now(timezone.utc)
    elif project.identity.order_stage != "C":
        project.identity.order_stage = "B"
    repository.save(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectState)
def get_project(project_id: str):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/projects/{project_id}/state", response_model=ProjectState)
def get_project_state(project_id: str):
    return get_project(project_id)


@router.patch("/projects/{project_id}", response_model=MutationResult)
def patch_project(project_id: str, command: ChangeCommand):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        result = mutation_service.apply(project, command)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    repository.save(result.project)
    return result


class SendProposalRequest(BaseModel):
    recipient: str
    price: str
    manufacturer: str
    configuration: str
    runs: str = ""
    features: list[str] = Field(default_factory=list)


@router.get("/mail/status")
def mail_status():
    return {"provider": "RESEND", "configured": resend_configured()}


@router.post("/projects/{project_id}/proposal/send")
def send_project_proposal(project_id: str, payload: SendProposalRequest):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    recipient = payload.recipient.strip()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", recipient):
        raise HTTPException(status_code=422, detail="A valid e-mail is required")
    if not project.identity.order_no:
        raise HTTPException(status_code=409, detail="Activate Point B before sending a proposal")

    order_ref = project.identity.display_reference
    body = build_proposal_email(order_ref, payload.model_dump())
    try:
        message_id = send_with_resend(
            recipient,
            f"BIZET OS · Commercial Proposal · {order_ref}",
            body,
        )
    except MailProviderNotConfigured as exc:
        project.commerce.proposal_delivery_status = "NOT_CONFIGURED"
        project.commerce.proposal_provider = "RESEND"
        repository.save(project)
        raise HTTPException(status_code=503, detail="MAIL_PROVIDER_NOT_CONFIGURED") from exc
    except MailDeliveryError as exc:
        project.commerce.proposal_status = "FAILED"
        project.commerce.proposal_delivery_status = "FAILED"
        project.commerce.proposal_provider = "RESEND"
        repository.save(project)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    project.commerce.contact = recipient
    project.commerce.proposal_status = "SENT"
    project.commerce.proposal_delivery_status = "SENT"
    project.commerce.proposal_provider = "RESEND"
    project.commerce.proposal_message_id = message_id
    project.commerce.proposal_recipient = recipient
    project.commerce.proposal_sent_at = datetime.now(timezone.utc)
    repository.save(project)
    return {
        "status": "SENT",
        "provider": "RESEND",
        "message_id": message_id,
        "recipient": recipient,
        "sent_at": project.commerce.proposal_sent_at,
        "order_ref": order_ref,
    }


class RoomImportCalibrateRequest(BaseModel):
    known_dimension_mm: int = Field(ge=300, le=30000)


def _room_import_state(project: ProjectState) -> dict:
    value = project.scene.visual_settings.get("room_import")
    return dict(value) if isinstance(value, dict) else {}


@router.post("/projects/{project_id}/room-import/analyze")
async def analyze_room_import(project_id: str, file: UploadFile = File(...)):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Empty file")
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File is larger than 15 MB")
    try:
        analysis = analyze_room_file(raw, file.filename or "upload", file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not analyze room file: {exc}") from exc

    state = {
        "source": "FILE",
        "file_name": file.filename or "upload",
        "file_type": analysis.file_type,
        "mime_type": file.content_type or "",
        "file_size": len(raw),
        "target_model": "ROOM_MODEL",
        "status": "ANALYZED_SCALE_REQUIRED",
        "analysis": analysis.as_dict(),
        "message": "Geometry candidate detected. Confirm one known real dimension to calibrate scale.",
    }
    project.scene.visual_settings["room_import"] = state
    repository.save(project)
    return {"room_import": state}


@router.post("/projects/{project_id}/room-import/calibrate")
def calibrate_room_import(project_id: str, payload: RoomImportCalibrateRequest):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    state = _room_import_state(project)
    analysis = state.get("analysis") if isinstance(state.get("analysis"), dict) else {}
    bbox = analysis.get("bbox_norm") or []
    width_px = float(analysis.get("width_px") or 0)
    height_px = float(analysis.get("height_px") or 0)
    if len(bbox) != 4 or width_px <= 0 or height_px <= 0:
        raise HTTPException(status_code=409, detail="Analyze a PDF or photo before calibration")
    bw_px = max(1.0, float(bbox[2]) * width_px)
    bh_px = max(1.0, float(bbox[3]) * height_px)
    length_mm = int(payload.known_dimension_mm)
    depth_mm = int(round(length_mm * bh_px / bw_px))
    depth_mm = max(600, min(30000, depth_mm))
    confidence = max(0.2, min(0.95, float(analysis.get("confidence") or 0.4)))

    result = mutation_service.apply(project, ChangeCommand(
        path="room.geometry.wall_length", value=length_mm, source="IMPORTED",
        confidence=confidence, confirmed=False, reason="R10.3.2 room import calibrated known dimension",
    ))
    project = result.project
    result = mutation_service.apply(project, ChangeCommand(
        path="room.geometry.wall_depth", value=depth_mm, source="IMPORTED",
        confidence=max(0.15, confidence - 0.1), confirmed=False, reason="R10.3.2 room import derived depth from detected geometry",
    ))
    project = result.project

    x0, y0, bw, bh = map(float, bbox)
    contour = analysis.get("contour_norm") or [[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh]]
    polygon_mm = []
    for point in contour:
        px, py = float(point[0]), float(point[1])
        local_x = (px - x0) / max(bw, 1e-9)
        local_y = (py - y0) / max(bh, 1e-9)
        polygon_mm.append([int(round(local_x * length_mm)), int(round(local_y * depth_mm))])
    if len(polygon_mm) < 3:
        polygon_mm = [[0, 0], [length_mm, 0], [length_mm, depth_mm], [0, depth_mm]]

    walls = []
    labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for i, start in enumerate(polygon_mm):
        end = polygon_mm[(i + 1) % len(polygon_mm)]
        walls.append({
            "label": labels[i] if i < len(labels) else f"W{i+1}",
            "start_mm": start,
            "end_mm": end,
            "length_mm": int(round(((end[0]-start[0])**2 + (end[1]-start[1])**2) ** 0.5)),
        })

    state.update({
        "known_dimension_mm": length_mm,
        "calibration_reference": "DETECTED_ENVELOPE_PRIMARY_SPAN",
        "status": "ROOM_MODEL_PREVIEW_READY",
        "requires_user_confirmation": True,
        "canonical_room_model": {
            "polygon_mm": polygon_mm,
            "walls": walls,
            "bounding_size_mm": {"length": length_mm, "depth": depth_mm},
            "source": "IMPORTED",
            "confidence": confidence,
        },
        "message": f"Room Model preview: {length_mm} × {depth_mm} mm. Confirm before production use.",
    })
    project.scene.visual_settings["room_import"] = state
    repository.save(project)
    return {"project": project, "room_import": state}


@router.post("/projects/{project_id}/room-import/confirm", response_model=ProjectState)
def confirm_room_import(project_id: str):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    state = _room_import_state(project)
    if state.get("status") != "ROOM_MODEL_PREVIEW_READY":
        raise HTTPException(status_code=409, detail="Calibrate room import before confirmation")
    for attr in ("wall_length", "wall_depth"):
        measured = getattr(project.room.geometry, attr)
        if measured:
            measured.provenance.confirmed = True
            measured.provenance.source = "USER_CONFIRMED"
    state["status"] = "ROOM_MODEL_CONFIRMED"
    state["requires_user_confirmation"] = False
    state["message"] = "Imported Room Model confirmed by user."
    project.scene.visual_settings["room_import"] = state
    repository.save(project)
    return project


@router.post("/projects/{project_id}/recalculate", response_model=RecalculateResponse)
def recalculate_project(project_id: str):
    project = repository.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    recalculated = list(project.dependencies.recalculation_required)
    candidate_count = None
    status = None
    error = None
    try:
        legacy = project_state_to_legacy_input(project)
        candidates = DecisionEngine.generate(legacy)
        candidate_count = len(candidates)
        if candidates:
            status = candidates[0].validation.status.value
            project.furniture.layout_candidates = [c.model_dump(mode="json") for c in candidates]
            project.furniture.selected_candidate = candidates[0].model_dump(mode="json")
            project.dependencies.stale_paths = [p for p in project.dependencies.stale_paths if not p.startswith("furniture")]
            project.dependencies.recalculation_required = [p for p in project.dependencies.recalculation_required if p not in {"room", "furniture.layout_candidates", "validation"}]
            project.dependencies.reconfirmation_required = [p for p in project.dependencies.reconfirmation_required if p != "furniture.selected_candidate"]
    except LegacyAdapterError as exc:
        error = str(exc)

    repository.save(project)
    return RecalculateResponse(
        project=project,
        recalculated=recalculated,
        legacy_engine_candidate_count=candidate_count,
        legacy_engine_status=status,
        legacy_engine_error=error,
    )


class QuestAnswerRequest(BaseModel):
    answer: object


@router.get("/projects/{project_id}/quest/next")
def get_next_quest_action(project_id: str):
    project = get_project(project_id)
    return decision_to_client(quest_engine.get_next_action(project))


@router.get("/projects/{project_id}/quest/state")
def get_quest_state(project_id: str):
    return get_project(project_id).quest


@router.get("/projects/{project_id}/quest/debug")
def get_quest_debug(project_id: str):
    project = get_project(project_id)
    return decision_to_debug(quest_engine.get_next_action(project, debug=True))


@router.post("/projects/{project_id}/quest/actions/{action_id}/answer")
def answer_quest_action(project_id: str, action_id: str, payload: QuestAnswerRequest):
    project = get_project(project_id)
    try:
        result = quest_service.submit_answer(project, action_id, payload.answer)
    except (QuestAnswerError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    repository.save(result.project)
    return {"project": result.project, "decision": decision_to_client(result.decision)}


@router.post("/projects/{project_id}/quest/actions/{action_id}/skip")
def skip_quest_action(project_id: str, action_id: str):
    project = get_project(project_id)
    try:
        result = quest_service.skip_action(project, action_id)
    except QuestAnswerError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    repository.save(result.project)
    return {"project": result.project, "decision": decision_to_client(result.decision)}


@router.post("/projects/{project_id}/quest/actions/{action_id}/defer")
def defer_quest_action(project_id: str, action_id: str):
    project = get_project(project_id)
    try:
        result = quest_service.defer_action(project, action_id)
    except QuestAnswerError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    repository.save(result.project)
    return {"project": result.project, "decision": decision_to_client(result.decision)}


@router.post("/projects/{project_id}/quest/actions/{action_id}/reopen")
def reopen_quest_action(project_id: str, action_id: str):
    project = get_project(project_id)
    try:
        result = quest_service.reopen_action(project, action_id)
    except QuestAnswerError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    repository.save(result.project)
    return {"project": result.project, "decision": decision_to_client(result.decision)}
