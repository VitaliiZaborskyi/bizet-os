from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from app.project.models import (
    ChangeCommand,
    CommunicationState,
    ApplianceState,
    ProjectState,
    Provenance,
    QuestActionHistoryEntry,
    QuestActionStatus,
    StateSource,
)
from app.project.mutations import MutationError, ProjectMutationService

from .engine import QuestEngine
from .models import QuestAction, QuestActionType, QuestDecision, SkipPolicy


class QuestAnswerError(ValueError):
    pass


class QuestServiceResult:
    def __init__(self, project: ProjectState, decision: QuestDecision) -> None:
        self.project = project
        self.decision = decision


class QuestAnswerService:
    def __init__(self, engine: QuestEngine | None = None, mutation_service: ProjectMutationService | None = None) -> None:
        self.engine = engine or QuestEngine()
        self.mutations = mutation_service or ProjectMutationService()

    def submit_answer(self, project: ProjectState, action_id: str, answer: Any) -> QuestServiceResult:
        definition = self.engine.catalog.get(action_id)
        if definition is None:
            raise QuestAnswerError(f"Unknown quest action: {action_id}")
        action = definition.action
        self._validate_answer(action, answer)
        updated, affected, recalculations = self._apply_answer(project, action, answer)
        if action.action_id == "CONFIRM_SCAN_DIMENSION" and answer is False:
            updated.quest.confirmations[action_id] = False
            decision = self.engine.get_next_action(updated)
            return QuestServiceResult(updated, decision)
        self._complete(updated, action, answer, affected, recalculations)
        decision = self.engine.get_next_action(updated)
        return QuestServiceResult(updated, decision)

    def skip_action(self, project: ProjectState, action_id: str) -> QuestServiceResult:
        action = self._get_action(action_id)
        if action.skip_policy in {SkipPolicy.NOT_SKIPPABLE} or action.blocking:
            raise QuestAnswerError(f"Action cannot be skipped: {action_id}")
        updated = deepcopy(project)
        before = self._status(updated, action_id)
        if action_id not in updated.quest.skipped_action_ids:
            updated.quest.skipped_action_ids.append(action_id)
        if action_id not in updated.quest.skipped_actions:
            updated.quest.skipped_actions.append(action_id)
        if action.skip_policy == SkipPolicy.SKIPPABLE_WITH_WARNING:
            updated.validation.warnings.append({"requirement": action.skip_consequence or action_id, "action_id": action_id})
        self._history(updated, action_id, before, QuestActionStatus.SKIPPED)
        return QuestServiceResult(updated, self.engine.get_next_action(updated))

    def defer_action(self, project: ProjectState, action_id: str) -> QuestServiceResult:
        action = self._get_action(action_id)
        if action.skip_policy != SkipPolicy.DEFERABLE:
            raise QuestAnswerError(f"Action cannot be deferred: {action_id}")
        updated = deepcopy(project)
        before = self._status(updated, action_id)
        if action_id not in updated.quest.deferred_action_ids:
            updated.quest.deferred_action_ids.append(action_id)
        self._history(updated, action_id, before, QuestActionStatus.DEFERRED)
        return QuestServiceResult(updated, self.engine.get_next_action(updated))

    def reopen_action(self, project: ProjectState, action_id: str) -> QuestServiceResult:
        self._get_action(action_id)
        updated = deepcopy(project)
        before = self._status(updated, action_id)
        for values in (updated.quest.completed_action_ids, updated.quest.completed_actions,
                       updated.quest.skipped_action_ids, updated.quest.skipped_actions,
                       updated.quest.deferred_action_ids):
            while action_id in values:
                values.remove(action_id)
        self._history(updated, action_id, before, QuestActionStatus.REOPENED)
        return QuestServiceResult(updated, self.engine.get_next_action(updated))

    def _apply_answer(self, project: ProjectState, action: QuestAction, answer: Any) -> tuple[ProjectState, list[str], list[str]]:
        if action.action_id == "CONFIRM_SCAN_DIMENSION":
            measured = project.room.geometry.wall_length
            if measured is None:
                raise QuestAnswerError("No scan dimension is available for confirmation")
            result = self.mutations.apply(project, ChangeCommand(
                path="room.geometry.wall_length", value=measured.value_mm,
                source=measured.provenance.source, confidence=measured.provenance.confidence,
                confirmed=answer,
            ))
            return result.project, result.affected_dependencies, result.required_recalculations
        paths = {
            "SELECT_OBJECT_TYPE": "context.object_type",
            "SELECT_PRODUCT_TYPE": "context.product_type",
            "SELECT_COMPLEXITY_CATEGORY": "context.complexity_category",
            "SELECT_VISUAL_DIRECTION": "context.visual_direction",
            "ASK_ROOM_WALL_LENGTH": "room.geometry.wall_length",
            "ASK_ROOM_HEIGHT": "room.geometry.room_height",
            "ASK_ROOM_DEPTH": "room.geometry.wall_depth",
        }
        if action.action_id in paths:
            numeric = action.action_type == QuestActionType.ENTER_NUMBER
            result = self.mutations.apply(project, ChangeCommand(
                path=paths[action.action_id], value=int(answer) if numeric else answer,
                source=StateSource.USER_ENTERED if numeric else None,
                confidence=1.0 if numeric else None, confirmed=True if numeric else None,
            ))
            return result.project, result.affected_dependencies, result.required_recalculations
        if action.action_id in {"LOCATE_SEWER", "LOCATE_WATER"}:
            updated = deepcopy(project)
            point = answer if isinstance(answer, dict) else {"coordinates_mm": answer}
            coordinates = point.get("coordinates_mm", point.get("coordinates"))
            if not isinstance(coordinates, (list, tuple)) or len(coordinates) != 3 or not all(isinstance(value, (int, float)) for value in coordinates):
                raise QuestAnswerError("LOCATE_POINT requires three numeric coordinates")
            communication = CommunicationState(
                type="SEWER" if action.action_id == "LOCATE_SEWER" else "WATER",
                coordinates_mm=tuple(int(value) for value in coordinates),
                provenance=Provenance(source=StateSource.USER_ENTERED, confidence=1.0, confirmed=True),
            )
            updated.communications.append(communication)
            return updated, ["communications"], []
        if action.action_id in {"SELECT_REFRIGERATOR", "SELECT_COOKTOP", "SELECT_DISHWASHER"}:
            updated = deepcopy(project)
            appliance_type = {"SELECT_REFRIGERATOR": "REFRIGERATOR", "SELECT_COOKTOP": "COOKTOP", "SELECT_DISHWASHER": "DISHWASHER"}[action.action_id]
            payload = answer if isinstance(answer, dict) else {"type": appliance_type, "configuration": {"selection": answer}}
            updated.appliances.append(ApplianceState(type=payload.get("type", appliance_type), configuration=payload.get("configuration", {}), provenance=Provenance(source=StateSource.USER_ENTERED, confidence=1.0, confirmed=True)))
            return updated, ["appliances"], []
        return deepcopy(project), [], []

    def _get_action(self, action_id: str) -> QuestAction:
        definition = self.engine.catalog.get(action_id)
        if definition is None:
            raise QuestAnswerError(f"Unknown quest action: {action_id}")
        return definition.action

    @staticmethod
    def _validate_answer(action: QuestAction, answer: Any) -> None:
        expected = action.answer_type
        if expected == "number" and (isinstance(answer, bool) or not isinstance(answer, (int, float))):
            raise QuestAnswerError(f"{action.action_id} requires a numeric answer")
        if expected == "option" and action.allowed_answers and answer not in action.allowed_answers:
            raise QuestAnswerError(f"Answer is not allowed for {action.action_id}")
        if expected == "confirmation" and not isinstance(answer, bool):
            raise QuestAnswerError(f"{action.action_id} requires a boolean confirmation")

    @staticmethod
    def _status(project: ProjectState, action_id: str) -> QuestActionStatus | None:
        if action_id in project.quest.completed_action_ids or action_id in project.quest.completed_actions:
            return QuestActionStatus.COMPLETED
        if action_id in project.quest.deferred_action_ids:
            return QuestActionStatus.DEFERRED
        if action_id in project.quest.skipped_action_ids or action_id in project.quest.skipped_actions:
            return QuestActionStatus.SKIPPED
        return None

    @staticmethod
    def _history(project: ProjectState, action_id: str, before: QuestActionStatus | None, after: QuestActionStatus, affected: list[str] | None = None, recalculations: list[str] | None = None) -> None:
        project.quest.action_history.append(QuestActionHistoryEntry(
            action_id=action_id, status_before=before, status_after=after,
            affected_fields=affected or [], triggered_recalculations=recalculations or [],
        ))
        project.quest.updated_at = datetime.now(timezone.utc)

    def _complete(self, project: ProjectState, action: QuestAction, answer: Any, affected: list[str], recalculations: list[str]) -> None:
        before = self._status(project, action.action_id)
        if action.action_id not in project.quest.completed_action_ids:
            project.quest.completed_action_ids.append(action.action_id)
        if action.action_id not in project.quest.completed_actions:
            project.quest.completed_actions.append(action.action_id)
        project.quest.confirmations[action.action_id] = answer
        self._history(project, action.action_id, before, QuestActionStatus.COMPLETED, affected, recalculations)