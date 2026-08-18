from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.project.models import (
    ChangeCommand,
    MeasuredValue,
    ProjectState,
    Provenance,
    StateSource,
)
from app.project.mutations import ProjectMutationService
from app.project.serialization import export_project_state, import_project_state
from app.quest.engine import QuestEngine
from app.quest.mapper import decision_to_client, decision_to_debug
from app.quest.service import QuestAnswerError, QuestAnswerService


client = TestClient(app)


def state_with_context() -> ProjectState:
    project = ProjectState()
    project.context.object_type = "NEW_BUILD"
    project.context.product_type = "KITCHEN"
    return project


def test_empty_state_selects_object_type():
    decision = QuestEngine().get_next_action(ProjectState())
    assert decision.next_action.action_id == "SELECT_OBJECT_TYPE"


def test_object_type_without_product_selects_product_type():
    project = ProjectState()
    project.context.object_type = "NEW_BUILD"
    assert QuestEngine().get_next_action(project).next_action.action_id == "SELECT_PRODUCT_TYPE"


def test_missing_wall_length_is_required():
    project = state_with_context()
    assert QuestEngine().get_next_action(project).next_action.action_id == "ASK_ROOM_WALL_LENGTH"


def test_confirmed_wall_length_has_no_confirmation_action():
    project = state_with_context()
    project.room.geometry.wall_length = MeasuredValue(
        value_mm=3000,
        provenance=Provenance(source=StateSource.USER_CONFIRMED, confidence=1.0, confirmed=True),
    )
    assert "CONFIRM_SCAN_DIMENSION" not in {
        action.action_id for action in QuestEngine().get_next_action(project).candidate_actions
    }


def test_scan_wall_length_can_require_confirmation():
    project = state_with_context()
    project.room.geometry.wall_length = MeasuredValue(
        value_mm=2992,
        provenance=Provenance(source=StateSource.SCAN_DETECTED, confidence=0.76, confirmed=False),
    )
    assert QuestEngine().get_next_action(project).next_action.action_id == "CONFIRM_SCAN_DIMENSION"


def test_blocking_conflict_outranks_noncritical_configuration():
    project = state_with_context()
    project.room.geometry.wall_length = MeasuredValue(
        value_mm=3000,
        provenance=Provenance(source=StateSource.USER_CONFIRMED, confidence=1.0, confirmed=True),
    )
    project.validation.conflicts.append({"code": "CONFLICT", "blocking": True})
    assert QuestEngine().get_next_action(project).next_action.action_id == "RESOLVE_ACTIVE_CONFLICT"


def test_dependency_change_creates_review_without_repeating_completed_action():
    project = state_with_context()
    project.room.geometry.wall_length = MeasuredValue(
        value_mm=3000,
        provenance=Provenance(source=StateSource.USER_CONFIRMED, confidence=1.0, confirmed=True),
    )
    project.quest.completed_action_ids = ["SELECT_OBJECT_TYPE"]
    project.quest.completed_actions = ["SELECT_OBJECT_TYPE"]
    project.furniture.selected_candidate = {"candidate_id": "C1"}
    result = ProjectMutationService().apply(project, ChangeCommand(path="room.geometry.wall_length", value=3200))
    decision = QuestEngine().get_next_action(result.project)
    assert decision.next_action.action_id == "REVIEW_CHANGED_ITEMS"
    assert "SELECT_OBJECT_TYPE" not in [item.action_id for item in decision.candidate_actions]


def test_not_skippable_action_is_rejected():
    with pytest.raises(QuestAnswerError):
        QuestAnswerService().skip_action(ProjectState(), "SELECT_OBJECT_TYPE")


def test_skippable_warning_adds_warning_requirement():
    project = state_with_context()
    result = QuestAnswerService().skip_action(project, "SELECT_COMPLEXITY_CATEGORY")
    assert result.project.validation.warnings
    assert "SELECT_COMPLEXITY_CATEGORY" in result.project.quest.skipped_action_ids


def test_submit_answer_mutates_through_project_mutation_service():
    project = ProjectState()
    result = QuestAnswerService().submit_answer(project, "SELECT_OBJECT_TYPE", "NEW_BUILD")
    assert result.project.context.object_type == "NEW_BUILD"
    assert "SELECT_OBJECT_TYPE" in result.project.quest.completed_action_ids


def test_invalid_answer_type_is_rejected():
    with pytest.raises(QuestAnswerError):
        QuestAnswerService().submit_answer(state_with_context(), "ASK_ROOM_WALL_LENGTH", "wide")


def test_debug_trace_contains_evaluated_and_selected_action():
    decision = QuestEngine().get_next_action(ProjectState(), debug=True)
    assert "SELECT_OBJECT_TYPE" in decision.trace["evaluated_actions"]
    assert decision.trace["selected_action"] == "SELECT_OBJECT_TYPE"


def test_client_mapping_hides_internal_debug_fields():
    decision = QuestEngine().get_next_action(ProjectState(), debug=True)
    client = decision_to_client(decision)
    debug = decision_to_debug(decision)
    assert "priority" not in client["next_action"]
    assert "trace" not in client
    assert "trace" in debug


def test_reopen_completed_action_works():
    project = ProjectState()
    submitted = QuestAnswerService().submit_answer(project, "SELECT_OBJECT_TYPE", "NEW_BUILD")
    reopened = QuestAnswerService().reopen_action(submitted.project, "SELECT_OBJECT_TYPE")
    assert "SELECT_OBJECT_TYPE" not in reopened.project.quest.completed_action_ids
    assert reopened.project.quest.current_action_id == "SELECT_OBJECT_TYPE"


def test_defer_changes_next_action_resolution():
    project = state_with_context()
    result = QuestAnswerService().defer_action(project, "LOCATE_SEWER")
    assert "LOCATE_SEWER" not in [item.action_id for item in result.decision.candidate_actions]
    assert "LOCATE_SEWER" in result.project.quest.deferred_action_ids


def test_serialization_round_trip_preserves_quest_state():
    project = ProjectState()
    submitted = QuestAnswerService().submit_answer(project, "SELECT_OBJECT_TYPE", "NEW_BUILD")
    restored = import_project_state(export_project_state(submitted.project))
    assert restored.quest.model_dump(mode="json") == submitted.project.quest.model_dump(mode="json")


def test_legacy_mutation_regression_is_unchanged():
    project = state_with_context()
    project.room.geometry.wall_length = MeasuredValue(
        value_mm=3000,
        provenance=Provenance(source=StateSource.USER_ENTERED, confidence=1.0, confirmed=True),
    )
    result = ProjectMutationService().apply(project, ChangeCommand(path="room.geometry.wall_length", value=3200))
    assert "furniture.selected_candidate" in result.required_reconfirmations


def test_quest_api_client_and_debug_contracts():
    created = client.post("/api/v1.1/projects", json={})
    assert created.status_code == 200
    project_id = created.json()["identity"]["internal_id"]

    next_action = client.get(f"/api/v1.1/projects/{project_id}/quest/next")
    assert next_action.status_code == 200
    assert next_action.json()["next_action"]["action_id"] == "SELECT_OBJECT_TYPE"
    assert "trace" not in next_action.json()

    answered = client.post(
        f"/api/v1.1/projects/{project_id}/quest/actions/SELECT_OBJECT_TYPE/answer",
        json={"answer": "NEW_BUILD"},
    )
    assert answered.status_code == 200, answered.text
    assert answered.json()["project"]["context"]["object_type"] == "NEW_BUILD"

    debug = client.get(f"/api/v1.1/projects/{project_id}/quest/debug")
    assert debug.status_code == 200
    assert "trace" in debug.json()