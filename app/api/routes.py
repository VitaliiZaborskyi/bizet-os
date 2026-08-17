from fastapi import APIRouter

from app.domain.models import ApplianceResolveResponse, CompatibilityResponse, GenerateResponse, ProjectInput, RoomResolved
from app.engine.application_no import next_application_no
from app.engine.constants import RULE_SET_VERSION
from app.engine.room import RoomEngine
from app.engine.rules import DecisionEngine
from app.engine.appliances import ApplianceResolver
from app.engine.compatibility import CompatibilityEngine

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok", "rule_set_version": RULE_SET_VERSION}


@router.post("/room/resolve", response_model=RoomResolved)
def resolve_room(project: ProjectInput):
    return RoomEngine.resolve(project)


@router.post("/appliances/resolve", response_model=ApplianceResolveResponse)
def resolve_appliances(project: ProjectInput):
    return ApplianceResolver.resolve(project)


@router.post("/compatibility/evaluate", response_model=CompatibilityResponse)
def evaluate_compatibility(project: ProjectInput):
    return CompatibilityEngine.evaluate(project)


@router.post("/generate", response_model=GenerateResponse)
def generate(project: ProjectInput):
    candidates = DecisionEngine.generate(project)
    selected = candidates[0] if candidates else None
    room = RoomEngine.resolve(project)
    compatibility = CompatibilityEngine.evaluate(project)
    return GenerateResponse(
        application_no=project.application_no or next_application_no(),
        rule_set_version=RULE_SET_VERSION,
        selected=selected,
        candidates=candidates,
        global_warnings=room.warnings + room.human_review,
        engine_results=compatibility.results,
    )
