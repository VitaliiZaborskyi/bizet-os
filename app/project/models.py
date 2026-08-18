from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, ConfigDict

from .versioning import PROJECT_FORMAT_VERSION, RULE_SET_VERSION


class StateSource(str, Enum):
    SCAN_DETECTED = "SCAN_DETECTED"
    USER_ENTERED = "USER_ENTERED"
    USER_CONFIRMED = "USER_CONFIRMED"
    ESTIMATED = "ESTIMATED"
    SYSTEM_CALCULATED = "SYSTEM_CALCULATED"
    IMPORTED = "IMPORTED"


class Provenance(BaseModel):
    source: StateSource
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    confirmed: bool = False
    note: str | None = None


class MeasuredValue(BaseModel):
    value_mm: int | None = None
    provenance: Provenance


class IdentityState(BaseModel):
    internal_id: str = Field(default_factory=lambda: str(uuid4()))
    order_no: str | None = None
    project_format_version: str = PROJECT_FORMAT_VERSION
    rule_set_version: str = RULE_SET_VERSION
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def application_no(self) -> str | None:
        """Compatibility alias; new client/domain terminology is order_no."""
        return self.order_no


class ContextState(BaseModel):
    object_type: str | None = None
    product_type: str | None = None
    complexity_category: str | None = None
    visual_direction: str | None = None


class WallState(BaseModel):
    depth: MeasuredValue | None = None
    deviation: MeasuredValue | None = None
    is_deep_wall: bool | None = None


class RoomGeometryState(BaseModel):
    wall_length: MeasuredValue | None = None
    room_height: MeasuredValue | None = None
    wall_depth: MeasuredValue | None = None
    horizontal_deviation: MeasuredValue | None = None
    vertical_deviation: MeasuredValue | None = None


class RoomState(BaseModel):
    geometry: RoomGeometryState = Field(default_factory=RoomGeometryState)
    walls: dict[str, WallState] = Field(default_factory=dict)
    ceiling: dict[str, Any] = Field(default_factory=dict)
    obstacles: list[dict[str, Any]] = Field(default_factory=list)
    architectural_elements: list[dict[str, Any]] = Field(default_factory=list)
    finish_state: dict[str, Any] = Field(default_factory=dict)
    configuration: str | None = None


class CommunicationState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: str
    coordinates_mm: tuple[int, int, int] | None = None
    tolerance_radius_mm: int | None = None
    provenance: Provenance
    confirmation_state: Literal["UNCONFIRMED", "CONFIRMED", "SKIPPED"] = "UNCONFIRMED"
    notes: str | None = None


class ApplianceState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: str
    installation_type: str | None = None
    dimensions_mm: dict[str, int] = Field(default_factory=dict)
    configuration: dict[str, Any] = Field(default_factory=dict)
    required_connections: list[str] = Field(default_factory=list)
    provenance: Provenance | None = None


class FurnitureState(BaseModel):
    modules: list[dict[str, Any]] = Field(default_factory=list)
    fillers: list[dict[str, Any]] = Field(default_factory=list)
    tall_units: list[dict[str, Any]] = Field(default_factory=list)
    upper_units: list[dict[str, Any]] = Field(default_factory=list)
    layout_candidates: list[dict[str, Any]] = Field(default_factory=list)
    selected_candidate: dict[str, Any] | None = None


class MaterialsState(BaseModel):
    global_selections: dict[str, Any] = Field(default_factory=dict)
    worktop: dict[str, Any] | None = None
    hardware: dict[str, Any] = Field(default_factory=dict)
    catalog_refs: list[dict[str, Any]] = Field(default_factory=list)


class PreferencesState(BaseModel):
    budget: dict[str, Any] = Field(default_factory=dict)
    users: int | None = None
    opening_preferences: dict[str, Any] = Field(default_factory=dict)
    visual_preferences: dict[str, Any] = Field(default_factory=dict)


class PricingState(BaseModel):
    current_value: float | None = None
    currency: str | None = None
    source: str | None = None
    timestamp: datetime | None = None
    catalog_version: str | None = None
    calculation_trace: list[dict[str, Any]] = Field(default_factory=list)


class SceneState(BaseModel):
    camera: dict[str, Any] = Field(default_factory=dict)
    visual_settings: dict[str, Any] = Field(default_factory=dict)
    selected_object: str | None = None


class QuestActionStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    CURRENT = "CURRENT"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    DEFERRED = "DEFERRED"
    REOPENED = "REOPENED"


class QuestActionHistoryEntry(BaseModel):
    action_id: str
    status_before: QuestActionStatus | None = None
    status_after: QuestActionStatus
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    answer_reference: str | None = None
    affected_fields: list[str] = Field(default_factory=list)
    triggered_recalculations: list[str] = Field(default_factory=list)


class QuestState(BaseModel):
    completed_actions: list[str] = Field(default_factory=list)
    pending_actions: list[str] = Field(default_factory=list)
    current_action: str | None = None
    skipped_actions: list[str] = Field(default_factory=list)
    confirmations: dict[str, Any] = Field(default_factory=dict)
    current_action_id: str | None = None
    completed_action_ids: list[str] = Field(default_factory=list)
    skipped_action_ids: list[str] = Field(default_factory=list)
    deferred_action_ids: list[str] = Field(default_factory=list)
    reconfirmation_action_ids: list[str] = Field(default_factory=list)
    action_history: list[QuestActionHistoryEntry] = Field(default_factory=list)
    last_decision_trace: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ValidationState(BaseModel):
    warnings: list[dict[str, Any] | str] = Field(default_factory=list)
    conflicts: list[dict[str, Any] | str] = Field(default_factory=list)
    internal_stops: list[dict[str, Any] | str] = Field(default_factory=list)
    human_review_flags: list[dict[str, Any] | str] = Field(default_factory=list)
    client_messages: list[dict[str, Any]] = Field(default_factory=list)


class TraceState(BaseModel):
    applied_rules: list[dict[str, Any]] = Field(default_factory=list)
    significant_changes: list[dict[str, Any]] = Field(default_factory=list)


class DependencyState(BaseModel):
    stale_paths: list[str] = Field(default_factory=list)
    recalculation_required: list[str] = Field(default_factory=list)
    reconfirmation_required: list[str] = Field(default_factory=list)


class ProjectState(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    identity: IdentityState = Field(default_factory=IdentityState)
    context: ContextState = Field(default_factory=ContextState)
    room: RoomState = Field(default_factory=RoomState)
    communications: list[CommunicationState] = Field(default_factory=list)
    appliances: list[ApplianceState] = Field(default_factory=list)
    furniture: FurnitureState = Field(default_factory=FurnitureState)
    materials: MaterialsState = Field(default_factory=MaterialsState)
    preferences: PreferencesState = Field(default_factory=PreferencesState)
    pricing: PricingState = Field(default_factory=PricingState)
    scene: SceneState = Field(default_factory=SceneState)
    quest: QuestState = Field(default_factory=QuestState)
    validation: ValidationState = Field(default_factory=ValidationState)
    trace: TraceState = Field(default_factory=TraceState)
    dependencies: DependencyState = Field(default_factory=DependencyState)


class ChangeCommand(BaseModel):
    path: str
    value: Any
    source: StateSource | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    confirmed: bool | None = None
    reason: str | None = None


class MutationResult(BaseModel):
    project: ProjectState
    affected_dependencies: list[str] = Field(default_factory=list)
    invalidated_values: list[str] = Field(default_factory=list)
    required_recalculations: list[str] = Field(default_factory=list)
    required_reconfirmations: list[str] = Field(default_factory=list)
    change_trace: dict[str, Any]
