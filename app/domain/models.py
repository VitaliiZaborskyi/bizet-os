from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field, model_validator

from .enums import (
    ApplianceType,
    CeilingType,
    ConfidenceSource,
    Configuration,
    ModuleKind,
    ObjectType,
    OpeningSystem,
    ValidationStatus,
    EngineResultType,
    SinkMountType,
    CooktopEnergyType,
    AppliancePlacement,
)


class DimensionValue(BaseModel):
    value_mm: int = Field(gt=0)
    source: ConfidenceSource = ConfidenceSource.USER_ENTERED


class SignedDimensionValue(BaseModel):
    value_mm: int = 0
    source: ConfidenceSource = ConfidenceSource.USER_ENTERED


class WallCondition(BaseModel):
    depth_mm: int = Field(default=0, ge=0)
    deviation_mm: int = Field(default=0, ge=0)
    is_deep_wall: bool = False
    source: ConfidenceSource = ConfidenceSource.USER_ENTERED


class RoomObstacle(BaseModel):
    id: str
    type: Literal["RETURN", "PROJECTION", "COLUMN", "WINDOW", "SILL", "DOOR", "OPENING", "RADIATOR", "SKIRTING", "OTHER"]
    x_mm: int = Field(ge=0)
    width_mm: int = Field(gt=0)
    depth_mm: int = Field(default=0, ge=0)
    height_mm: int = Field(default=0, ge=0)
    bottom_mm: int = Field(default=0, ge=0)
    source: ConfidenceSource = ConfidenceSource.USER_ENTERED
    confirmed: bool = True
    notes: str = ""


class RoomInput(BaseModel):
    wall_length: DimensionValue
    room_height: DimensionValue
    wall_depth: DimensionValue = Field(default_factory=lambda: DimensionValue(value_mm=600))
    left_wall: WallCondition = Field(default_factory=WallCondition)
    right_wall: WallCondition = Field(default_factory=WallCondition)
    horizontal_deviation_mm: int = Field(default=0, ge=0)
    vertical_deviation_mm: int = Field(default=0, ge=0)
    finished_floor: bool = True
    skirting_present: bool = False
    ceiling_type: CeilingType = CeilingType.OPEN_GAP
    ceiling_gap_mm: int = Field(default=100, ge=0)
    obstacles: list[RoomObstacle] = Field(default_factory=list)

    @model_validator(mode="after")
    def obstacle_bounds(self):
        length = self.wall_length.value_mm
        for obstacle in self.obstacles:
            if obstacle.x_mm + obstacle.width_mm > length:
                raise ValueError(f"Obstacle {obstacle.id} extends beyond working wall")
        return self


class CommunicationPoint(BaseModel):
    id: str | None = None
    type: Literal[
        "DRAIN", "WATER", "COOKTOP_POWER", "GAS", "VENT", "APPLIANCE_POWER", "LIGHT_POWER"
    ]
    x_mm: int = Field(ge=0)
    y_mm: int = Field(default=0, ge=0)
    z_mm: int = Field(default=0, ge=0)
    tolerance_radius_mm: int = Field(default=125, ge=0)
    source: ConfidenceSource = ConfidenceSource.USER_ENTERED
    confirmed: bool = True
    notes: str = ""


class ApplianceInput(BaseModel):
    type: ApplianceType
    width_mm: int = Field(gt=0)
    height_mm: int | None = Field(default=None, gt=0)
    depth_mm: int | None = Field(default=None, gt=0)
    side: Literal["LEFT", "RIGHT", "AUTO"] = "AUTO"
    built_in: bool = False
    has_door_closer: bool = False
    doors_count: int | None = Field(default=None, ge=1, le=4)
    has_freezer_section: bool | None = None
    placement: AppliancePlacement = AppliancePlacement.AUTO
    cooktop_energy: CooktopEnergyType = CooktopEnergyType.UNKNOWN
    sink_mount: SinkMountType = SinkMountType.UNKNOWN
    requires_power: bool = False
    power_confirmed: bool = True
    notes: str = ""


class Preferences(BaseModel):
    budget_priority: bool = True
    users_count: int = Field(default=2, ge=1, le=10)
    cutlery_tray: bool = True
    comfort_mode: bool = False
    mezzanine: bool = False


class ProjectInput(BaseModel):
    application_no: str | None = None
    object_type: ObjectType = ObjectType.NEW_BUILD
    configuration: Configuration
    opening_system: OpeningSystem = OpeningSystem.HANDLE
    room: RoomInput
    communications: list[CommunicationPoint] = Field(default_factory=list)
    appliances: list[ApplianceInput] = Field(default_factory=list)
    preferences: Preferences = Field(default_factory=Preferences)

    @model_validator(mode="after")
    def communication_bounds(self):
        length = self.room.wall_length.value_mm
        for point in self.communications:
            if point.x_mm > length:
                raise ValueError(f"Communication {point.type} x={point.x_mm} is outside wall length {length}")
        return self


class RuleTrace(BaseModel):
    rule_id: str
    classification: str
    message: str
    data: dict = Field(default_factory=dict)


class RoomResolved(BaseModel):
    wall_length_mm: int
    room_height_mm: int
    wall_depth_mm: int
    configuration: Configuration
    ceiling_type: CeilingType
    active_wall_sides: list[str]
    obstacles: list[RoomObstacle]
    communications: list[CommunicationPoint]
    warnings: list[str] = Field(default_factory=list)
    human_review: list[str] = Field(default_factory=list)
    rule_trace: list[RuleTrace] = Field(default_factory=list)


class LayoutItem(BaseModel):
    id: str
    label: str
    kind: ModuleKind
    width_mm: int
    x_mm: int
    standard_width: bool = True
    appliance_type: ApplianceType | None = None
    opening: str | None = None
    side: str | None = None
    metadata: dict = Field(default_factory=dict)


class ValidationResult(BaseModel):
    status: ValidationStatus
    warnings: list[str] = Field(default_factory=list)
    human_review: list[str] = Field(default_factory=list)
    stops: list[str] = Field(default_factory=list)
    checks: list[str] = Field(default_factory=list)


class LayoutCandidate(BaseModel):
    candidate_id: str
    items: list[LayoutItem]
    used_length_mm: int
    room_length_mm: int
    residual_mm: int
    score: float
    score_breakdown: dict[str, float]
    applied_rules: list[RuleTrace]
    validation: ValidationResult


class GenerateResponse(BaseModel):
    application_no: str
    rule_set_version: str
    selected: LayoutCandidate | None
    candidates: list[LayoutCandidate]
    global_warnings: list[str] = Field(default_factory=list)
    engine_results: list[EngineResult] = Field(default_factory=list)


class EngineResult(BaseModel):
    rule_id: str
    result_type: EngineResultType
    message: str
    appliance_type: ApplianceType | None = None
    blocking: bool = False
    data: dict = Field(default_factory=dict)


class ApplianceResolvedItem(BaseModel):
    type: ApplianceType
    width_mm: int
    height_mm: int | None = None
    depth_mm: int | None = None
    side: str
    built_in: bool
    required_connections: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class ApplianceResolveResponse(BaseModel):
    appliances: list[ApplianceResolvedItem]
    results: list[EngineResult]
    rule_trace: list[RuleTrace] = Field(default_factory=list)


class CompatibilityResponse(BaseModel):
    results: list[EngineResult]
    hard_rules: list[EngineResult] = Field(default_factory=list)
    stops: list[EngineResult] = Field(default_factory=list)
    human_review: list[EngineResult] = Field(default_factory=list)
    warnings: list[EngineResult] = Field(default_factory=list)
    rule_trace: list[RuleTrace] = Field(default_factory=list)
