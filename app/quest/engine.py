from __future__ import annotations

from datetime import datetime, timezone

from app.project.models import ProjectState

from .catalog import QuestCatalog
from .models import QuestAction, QuestDecision


class QuestEngine:
    def __init__(self, catalog: QuestCatalog | None = None) -> None:
        self.catalog = catalog or QuestCatalog()

    def get_next_action(self, project: ProjectState, debug: bool = False) -> QuestDecision:
        evaluated: list[str] = []
        eligible: list[QuestAction] = []
        rejected: list[dict[str, str]] = []
        completed = set(project.quest.completed_action_ids or project.quest.completed_actions)
        deferred = set(project.quest.deferred_action_ids)
        skipped = set(project.quest.skipped_action_ids or project.quest.skipped_actions)
        latest_status: dict[str, str] = {}
        for entry in project.quest.action_history:
            latest_status[entry.action_id] = entry.status_after.value
        reopened = {action_id for action_id, status in latest_status.items() if status == "REOPENED"}
        for definition in self.catalog.definitions():
            action = definition.action
            evaluated.append(action.action_id)
            if action.action_id in reopened:
                eligible.append(action)
                continue
            if action.action_id in completed or action.action_id in skipped or action.action_id in deferred:
                rejected.append({"action_id": action.action_id, "reason": "quest_status"})
                continue
            if definition.condition(project):
                eligible.append(action)
            else:
                rejected.append({"action_id": action.action_id, "reason": definition.action.condition_id})
        eligible.sort(key=lambda item: (-item.priority_score, item.action_id))
        selected = eligible[0] if eligible else None
        reason = self._reason(selected)
        trace = {
            "evaluated_actions": evaluated,
            "eligible_actions": [self._candidate(item) for item in eligible],
            "rejected_actions": rejected,
            "priority_result": [self._candidate(item) for item in eligible],
            "selected_action": selected.action_id if selected else None,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        project.quest.last_decision_trace = trace
        project.quest.current_action_id = selected.action_id if selected else None
        project.quest.current_action = selected.action_id if selected else None
        project.quest.pending_actions = [item.action_id for item in eligible]
        project.quest.reconfirmation_action_ids = [
            item.action_id for item in eligible if item.priority.value == "RECONFIRMATION"
        ]
        project.quest.updated_at = datetime.now(timezone.utc)
        return QuestDecision(selected, reason, tuple(eligible), tuple(project.dependencies.reconfirmation_required), trace if debug else None)

    @staticmethod
    def _candidate(action: QuestAction) -> dict[str, object]:
        return {"action_id": action.action_id, "priority": action.priority.value, "score": action.priority_score}

    @staticmethod
    def _reason(action: QuestAction | None) -> str:
        if action is None:
            return "no eligible quest action"
        reasons = {
            "SELECT_OBJECT_TYPE": "required object type missing",
            "SELECT_PRODUCT_TYPE": "required product type missing",
            "ASK_ROOM_WALL_LENGTH": "required room geometry missing",
            "CONFIRM_SCAN_DIMENSION": "scan dimension requires confirmation",
            "REVIEW_CHANGED_ITEMS": "dependency recalculation requires review",
            "RESOLVE_ACTIVE_CONFLICT": "blocking conflict requires resolution",
        }
        return reasons.get(action.action_id, "highest priority eligible action")