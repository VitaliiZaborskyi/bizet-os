from __future__ import annotations

from typing import Any

from app.project.models import ProjectState, StateSource

from .models import ActionDefinition, QuestAction, QuestActionType, QuestPriority, SkipPolicy


MIN_CONFIDENCE_FOR_AUTO_ACCEPT: float | None = None


def _missing(value: Any) -> bool:
    return value is None or value == ""


def _wall_value(project: ProjectState):
    return project.room.geometry.wall_length


def _has_blocking_conflict(project: ProjectState) -> bool:
    return any(isinstance(item, dict) and item.get("blocking") for item in project.validation.conflicts)


def _scan_requires_confirmation(project: ProjectState) -> bool:
    value = _wall_value(project)
    if value is None or value.provenance.source != StateSource.SCAN_DETECTED:
        return False
    if value.provenance.confirmed:
        return False
    confidence = value.provenance.confidence
    return MIN_CONFIDENCE_FOR_AUTO_ACCEPT is None or confidence is None or confidence < MIN_CONFIDENCE_FOR_AUTO_ACCEPT


def _has_appliance(project: ProjectState, appliance_type: str) -> bool:
    return any(item.type == appliance_type for item in project.appliances)


def _has_communication(project: ProjectState, communication_type: str) -> bool:
    return any(item.type == communication_type for item in project.communications)


def _product_selected(project: ProjectState) -> bool:
       return not _missing(project.context.product_type)


def _definitions() -> list[ActionDefinition]:
    def action(action_id, action_type, priority, title, description, condition, **kwargs):
        return ActionDefinition(
            QuestAction(action_id, action_type, priority, title, description, **kwargs), condition
        )

    return [
        action("SELECT_OBJECT_TYPE", QuestActionType.SELECT_OPTION, QuestPriority.CRITICAL_BLOCKER,
               "object_type.title", "object_type.description", lambda p: _missing(p.context.object_type),
               answer_type="option", skip_policy=SkipPolicy.NOT_SKIPPABLE),
        action("SELECT_PRODUCT_TYPE", QuestActionType.SELECT_OPTION, QuestPriority.REQUIRED_INPUT,
               "product_type.title", "product_type.description",
               lambda p: not _missing(p.context.object_type) and _missing(p.context.product_type),
               answer_type="option", skip_policy=SkipPolicy.NOT_SKIPPABLE,
               priority_score_override=750),
        action("SELECT_COMPLEXITY_CATEGORY", QuestActionType.SELECT_OPTION, QuestPriority.PRIMARY_CONFIGURATION,
               "complexity_category.title", "complexity_category.description",
               lambda p: not _missing(p.context.product_type) and _missing(p.context.complexity_category),
               answer_type="option", skip_policy=SkipPolicy.SKIPPABLE_WITH_WARNING,
               skip_consequence="complexity_category remains unresolved"),
        action("SELECT_VISUAL_DIRECTION", QuestActionType.SELECT_OPTION, QuestPriority.OPTIONAL_REFINEMENT,
               "visual_direction.title", "visual_direction.description",
               lambda p: not _missing(p.context.product_type) and _missing(p.context.visual_direction),
               answer_type="option", skip_policy=SkipPolicy.SKIPPABLE),
        action("ASK_ROOM_WALL_LENGTH", QuestActionType.ENTER_NUMBER, QuestPriority.REQUIRED_INPUT,
               "room.wall_length.title", "room.wall_length.description",
               lambda p: _product_selected(p) and _missing(_wall_value(p)), required_inputs=("room.geometry.wall_length",),
               answer_type="number", skip_policy=SkipPolicy.NOT_SKIPPABLE,
               priority_score_override=730),
        action("ASK_ROOM_HEIGHT", QuestActionType.ENTER_NUMBER, QuestPriority.REQUIRED_INPUT,
               "room.height.title", "room.height.description",
               lambda p: _product_selected(p) and _missing(p.room.geometry.room_height), required_inputs=("room.geometry.room_height",),
               answer_type="number", skip_policy=SkipPolicy.NOT_SKIPPABLE,
               priority_score_override=720),
        action("ASK_ROOM_DEPTH", QuestActionType.ENTER_NUMBER, QuestPriority.REQUIRED_INPUT,
               "room.depth.title", "room.depth.description",
               lambda p: _product_selected(p) and _missing(p.room.geometry.wall_depth), required_inputs=("room.geometry.wall_depth",),
               answer_type="number", skip_policy=SkipPolicy.SKIPPABLE_WITH_WARNING,
               skip_consequence="room depth remains unresolved", priority_score_override=710),
        action("CONFIRM_SCAN_DIMENSION", QuestActionType.CONFIRM_VALUE, QuestPriority.RECONFIRMATION,
               "room.scan_dimension.confirm_title", "room.scan_dimension.confirm_description",
               _scan_requires_confirmation, required_inputs=("room.geometry.wall_length",),
               answer_type="confirmation", requires_confirmation=True, skip_policy=SkipPolicy.NOT_SKIPPABLE),
        action("LOCATE_SEWER", QuestActionType.LOCATE_POINT, QuestPriority.PRIMARY_CONFIGURATION,
               "communication.sewer.title", "communication.sewer.description",
               lambda p: not _has_communication(p, "SEWER"), answer_type="point", skip_policy=SkipPolicy.DEFERABLE),
        action("LOCATE_WATER", QuestActionType.LOCATE_POINT, QuestPriority.PRIMARY_CONFIGURATION,
               "communication.water.title", "communication.water.description",
               lambda p: not _has_communication(p, "WATER"), answer_type="point", skip_policy=SkipPolicy.DEFERABLE),
        action("SELECT_REFRIGERATOR", QuestActionType.SELECT_OBJECT, QuestPriority.OPTIONAL_REFINEMENT,
               "appliance.refrigerator.title", "appliance.refrigerator.description",
               lambda p: not _has_appliance(p, "REFRIGERATOR"), answer_type="object", skip_policy=SkipPolicy.SKIPPABLE),
        action("SELECT_COOKTOP", QuestActionType.SELECT_OBJECT, QuestPriority.OPTIONAL_REFINEMENT,
               "appliance.cooktop.title", "appliance.cooktop.description",
               lambda p: not _has_appliance(p, "COOKTOP"), answer_type="object", skip_policy=SkipPolicy.SKIPPABLE),
        action("SELECT_DISHWASHER", QuestActionType.SELECT_OBJECT, QuestPriority.OPTIONAL_REFINEMENT,
               "appliance.dishwasher.title", "appliance.dishwasher.description",
               lambda p: not _has_appliance(p, "DISHWASHER"), answer_type="object", skip_policy=SkipPolicy.SKIPPABLE),
        action("REVIEW_CHANGED_ITEMS", QuestActionType.REVIEW_CHANGE, QuestPriority.RECONFIRMATION,
               "review.changed_items.title", "review.changed_items.description",
               lambda p: bool(p.dependencies.reconfirmation_required), skip_policy=SkipPolicy.NOT_SKIPPABLE),
        action("RESOLVE_ACTIVE_CONFLICT", QuestActionType.RESOLVE_CONFLICT, QuestPriority.CONFLICT_RESOLUTION,
               "conflict.resolve.title", "conflict.resolve.description", _has_blocking_conflict,
               blocking=True, skip_policy=SkipPolicy.NOT_SKIPPABLE),
        action("REVIEW_RESULT", QuestActionType.REVIEW_RESULT, QuestPriority.REVIEW,
               "result.review.title", "result.review.description",
               lambda p: bool(p.furniture.selected_candidate) and not _has_blocking_conflict(p),
               skip_policy=SkipPolicy.SKIPPABLE),
    ]


class QuestCatalog:
    def __init__(self, definitions: list[ActionDefinition] | None = None) -> None:
        self._definitions = definitions or _definitions()

    def definitions(self) -> tuple[ActionDefinition, ...]:
        return tuple(self._definitions)

    def get(self, action_id: str) -> ActionDefinition | None:
        return next((item for item in self._definitions if item.action.action_id == action_id), None)