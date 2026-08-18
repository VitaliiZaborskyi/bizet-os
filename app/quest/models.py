from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable

from app.project.models import ProjectState


class QuestActionType(str, Enum):
    SELECT_OPTION = "SELECT_OPTION"
    ENTER_NUMBER = "ENTER_NUMBER"
    ENTER_TEXT = "ENTER_TEXT"
    CONFIRM_VALUE = "CONFIRM_VALUE"
    LOCATE_POINT = "LOCATE_POINT"
    SELECT_OBJECT = "SELECT_OBJECT"
    SELECT_MULTIPLE = "SELECT_MULTIPLE"
    REVIEW_CHANGE = "REVIEW_CHANGE"
    RESOLVE_CONFLICT = "RESOLVE_CONFLICT"
    UPLOAD_INPUT = "UPLOAD_INPUT"
    REVIEW_RESULT = "REVIEW_RESULT"
    SYSTEM_WAIT = "SYSTEM_WAIT"
    INFO = "INFO"


class QuestPriority(str, Enum):
    CRITICAL_BLOCKER = "CRITICAL_BLOCKER"
    REQUIRED_INPUT = "REQUIRED_INPUT"
    RECONFIRMATION = "RECONFIRMATION"
    CONFLICT_RESOLUTION = "CONFLICT_RESOLUTION"
    PRIMARY_CONFIGURATION = "PRIMARY_CONFIGURATION"
    OPTIONAL_REFINEMENT = "OPTIONAL_REFINEMENT"
    REVIEW = "REVIEW"
    INFO = "INFO"


PRIORITY_SCORES = {
    QuestPriority.CRITICAL_BLOCKER: 1000,
    QuestPriority.CONFLICT_RESOLUTION: 900,
    QuestPriority.RECONFIRMATION: 800,
    QuestPriority.REQUIRED_INPUT: 700,
    QuestPriority.PRIMARY_CONFIGURATION: 500,
    QuestPriority.OPTIONAL_REFINEMENT: 300,
    QuestPriority.REVIEW: 200,
    QuestPriority.INFO: 100,
}


class SkipPolicy(str, Enum):
    NOT_SKIPPABLE = "NOT_SKIPPABLE"
    SKIPPABLE = "SKIPPABLE"
    SKIPPABLE_WITH_WARNING = "SKIPPABLE_WITH_WARNING"
    DEFERABLE = "DEFERABLE"


@dataclass(frozen=True)
class QuestAction:
    action_id: str
    action_type: QuestActionType
    priority: QuestPriority
    title_key: str
    description_key: str
    required_inputs: tuple[str, ...] = ()
    dependencies: tuple[str, ...] = ()
    condition_id: str = "always"
    completion_condition: str = "action_completed"
    visual_target: dict[str, Any] | None = None
    target_entity_id: str | None = None
    target_zone: str | None = None
    answer_type: str | None = None
    allowed_answers: tuple[Any, ...] = ()
    skip_policy: SkipPolicy = SkipPolicy.NOT_SKIPPABLE
    skip_consequence: str | None = None
    requires_confirmation: bool = False
    blocking: bool = False
    source_requirement: str | None = None
    confidence_requirement: float | None = None
    metadata: dict[str, Any] | None = None
    priority_score_override: int | None = None
    status: str = "AVAILABLE"

    @property
    def priority_score(self) -> int:
        return self.priority_score_override or PRIORITY_SCORES[self.priority]


@dataclass(frozen=True)
class ActionDefinition:
    action: QuestAction
    condition: Callable[[ProjectState], bool]


@dataclass(frozen=True)
class QuestDecision:
    next_action: QuestAction | None
    reason: str
    candidate_actions: tuple[QuestAction, ...] = ()
    blocked_by: tuple[str, ...] = ()
    trace: dict[str, Any] | None = None