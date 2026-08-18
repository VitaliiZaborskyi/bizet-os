from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.engine.application_no import next_order_no
from app.engine.rules import DecisionEngine
from app.project.legacy_adapter import LegacyAdapterError, project_state_to_legacy_input
from app.project.models import ChangeCommand, MutationResult, ProjectState
from app.project.mutations import ProjectMutationService
from app.project.repository import repository
from app.quest.engine import QuestEngine
from app.quest.mapper import decision_to_client, decision_to_debug
from app.quest.service import QuestAnswerError, QuestAnswerService

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
    if not project.identity.order_no:
        project.identity.order_no = next_order_no()
    repository.create(project)
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
