from __future__ import annotations

from typing import Any

from .models import QuestAction, QuestDecision


def action_to_client(action: QuestAction | None) -> dict[str, Any] | None:
    if action is None:
        return None
    return {
        "action_id": action.action_id,
        "action_type": action.action_type.value,
        "title_key": action.title_key,
        "description_key": action.description_key,
        "required_inputs": list(action.required_inputs),
        "visual_target": action.visual_target,
        "target_entity_id": action.target_entity_id,
        "target_zone": action.target_zone,
        "answer_type": action.answer_type,
        "allowed_answers": list(action.allowed_answers),
        "can_skip": action.skip_policy.value != "NOT_SKIPPABLE" and not action.blocking,
        "skip_policy": action.skip_policy.value,
        "requires_confirmation": action.requires_confirmation,
    }


def decision_to_client(decision: QuestDecision) -> dict[str, Any]:
    return {
        "next_action": action_to_client(decision.next_action),
        "reason": decision.reason,
        "blocked_by": list(decision.blocked_by),
    }


def decision_to_debug(decision: QuestDecision) -> dict[str, Any]:
    return {
        "selected_action": action_to_client(decision.next_action),
        "candidate_actions": [
            {**(action_to_client(action) or {}), "priority": action.priority.value, "priority_score": action.priority_score}
            for action in decision.candidate_actions
        ],
        "reason": decision.reason,
        "blocked_by": list(decision.blocked_by),
        "trace": decision.trace or {},
    }