from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.project.dependencies import DependencyRule, default_dependency_engine
from app.project.legacy_adapter import project_state_to_legacy_input
from app.project.messages import engine_result_to_client_message
from app.project.models import (
    ApplianceState,
    ChangeCommand,
    CommunicationState,
    ContextState,
    IdentityState,
    MaterialsState,
    MeasuredValue,
    ProjectState,
    Provenance,
    StateSource,
    WallState,
)
from app.project.mutations import ProjectMutationService
from app.project.serialization import export_project_state, import_project_state
from app.project.versioning import PROJECT_FORMAT_VERSION, RULE_SET_VERSION, migrate
from app.domain.models import EngineResult
from app.domain.enums import EngineResultType

client = TestClient(app)


def measured(value: int, source=StateSource.USER_ENTERED, confidence=0.95, confirmed=True):
    return MeasuredValue(
        value_mm=value,
        provenance=Provenance(source=source, confidence=confidence, confirmed=confirmed),
    )


def make_project() -> ProjectState:
    p = ProjectState(
        identity=IdentityState(order_no="347.11.26"),
        context=ContextState(
            object_type="NEW_BUILD",
            product_type="KITCHEN",
            complexity_category="III",
            visual_direction="LIGHT",
        ),
    )
    p.room.geometry.wall_length = measured(3000)
    p.room.geometry.room_height = measured(2700)
    p.room.geometry.wall_depth = measured(600, source=StateSource.ESTIMATED, confidence=0.4, confirmed=False)
    p.room.configuration = "LEFT_WALL"
    p.room.walls["LEFT"] = WallState(depth=measured(600), deviation=measured(0), is_deep_wall=True)
    p.room.walls["RIGHT"] = WallState(depth=measured(0), deviation=measured(0), is_deep_wall=False)
    p.room.ceiling = {"type": "OPEN_GAP", "gap_mm": 100}
    p.room.finish_state = {"finished_floor": True, "skirting_present": False}
    p.preferences.opening_preferences = {"system": "PUSH", "cutlery_tray": True}
    p.preferences.budget = {"priority": True}
    p.preferences.users = 2
    p.materials = MaterialsState(global_selections={"carcass": "CAT_III_PLACEHOLDER"})
    p.appliances.append(ApplianceState(
        type="FRIDGE_BUILTIN",
        installation_type="BUILT_IN",
        dimensions_mm={"width": 600},
        configuration={"built_in": True, "side": "LEFT"},
        provenance=Provenance(source=StateSource.USER_CONFIRMED, confidence=1.0, confirmed=True),
    ))
    p.furniture.layout_candidates = [{"candidate_id": "C1"}]
    p.furniture.selected_candidate = {"candidate_id": "C1"}
    return p


def test_project_state_creation_and_versions():
    p = make_project()
    assert p.identity.project_format_version == PROJECT_FORMAT_VERSION
    assert p.identity.rule_set_version == RULE_SET_VERSION
    assert p.identity.order_no == "347.11.26"
    assert p.identity.application_no == "347.11.26"


def test_source_confidence_is_domain_data():
    p = make_project()
    assert p.room.geometry.wall_depth.provenance.source == StateSource.ESTIMATED
    assert p.room.geometry.wall_depth.provenance.confidence == 0.4
    assert p.appliances[0].provenance.source == StateSource.USER_CONFIRMED


def test_serialization_round_trip():
    p = make_project()
    raw = export_project_state(p)
    restored = import_project_state(raw)
    assert restored.model_dump(mode="json") == p.model_dump(mode="json")
    parsed = json.loads(raw)
    assert parsed["identity"]["project_format_version"] == PROJECT_FORMAT_VERSION


def test_migration_interface_mock_path():
    raw = make_project().model_dump(mode="json")
    raw["identity"]["project_format_version"] = "1.1.0-alpha"
    migrated = migrate(raw, "1.1.0-alpha", PROJECT_FORMAT_VERSION)
    assert migrated["identity"]["project_format_version"] == PROJECT_FORMAT_VERSION


def test_dependency_registry_can_be_extended():
    engine = default_dependency_engine()
    engine.register(DependencyRule(source="context.complexity_category", targets=["materials"], recalculate=["materials"]))
    impact = engine.resolve("context.complexity_category")
    assert "materials" in impact["affected"]


def test_wall_length_change_invalidates_layout_but_preserves_unrelated_choices():
    p = make_project()
    result = ProjectMutationService().apply(
        p,
        ChangeCommand(
            path="room.geometry.wall_length",
            value=3200,
            source=StateSource.USER_ENTERED,
            confidence=1.0,
            confirmed=True,
            reason="client corrected measurement",
        ),
    )
    updated = result.project
    assert updated.room.geometry.wall_length.value_mm == 3200
    assert "furniture.layout_candidates" in updated.dependencies.stale_paths
    assert "furniture.selected_candidate" in result.required_reconfirmations
    assert updated.furniture.selected_candidate is None

    # Unrelated customer choices survive.
    assert updated.context.visual_direction == "LIGHT"
    assert updated.context.complexity_category == "III"
    assert updated.appliances[0].type == "FRIDGE_BUILTIN"
    assert updated.materials.global_selections["carcass"] == "CAT_III_PLACEHOLDER"

    # Original instance is not mutated.
    assert p.room.geometry.wall_length.value_mm == 3000
    assert p.furniture.selected_candidate == {"candidate_id": "C1"}


def test_mutation_trace_records_change_and_affected_nodes():
    p = make_project()
    result = ProjectMutationService().apply(p, ChangeCommand(path="room.geometry.wall_length", value=3150))
    trace = result.change_trace
    assert trace["path"] == "room.geometry.wall_length"
    assert trace["old_value"]["value_mm"] == 3000
    assert trace["new_value"]["value_mm"] == 3150
    assert "furniture.layout_candidates" in trace["affected"]
    assert result.project.trace.significant_changes[-1]["path"] == "room.geometry.wall_length"


def test_project_state_to_legacy_engine_adapter():
    p = make_project()
    legacy = project_state_to_legacy_input(p)
    assert legacy.application_no == "347.11.26"
    assert legacy.room.wall_length.value_mm == 3000
    assert legacy.room.room_height.value_mm == 2700
    assert legacy.configuration.value == "LEFT_WALL"
    assert legacy.appliances[0].type.value == "FRIDGE_BUILTIN"
    assert legacy.appliances[0].width_mm == 600


def test_client_debug_mapping_hides_stop_term_as_category():
    internal = EngineResult(
        rule_id="X-1",
        result_type=EngineResultType.STOP,
        message="Missing required connection",
        blocking=True,
    )
    client_msg = engine_result_to_client_message(internal)
    assert client_msg["category"] == "ACTION_REQUIRED"
    assert "STOP" not in client_msg.values()
    assert client_msg["can_continue"] is False


def test_v11_api_create_read_patch_state():
    create = client.post("/api/v1.1/projects", json={"project": make_project().model_dump(mode="json")})
    assert create.status_code == 200, create.text
    project = create.json()
    project_id = project["identity"]["internal_id"]
    assert project["identity"]["order_no"] == "347.11.26"

    read = client.get(f"/api/v1.1/projects/{project_id}")
    assert read.status_code == 200
    assert read.json()["context"]["product_type"] == "KITCHEN"

    patch = client.patch(
        f"/api/v1.1/projects/{project_id}",
        json={
            "path": "room.geometry.wall_length",
            "value": 3200,
            "source": "USER_CONFIRMED",
            "confidence": 1.0,
            "confirmed": True,
        },
    )
    assert patch.status_code == 200, patch.text
    data = patch.json()
    assert data["project"]["room"]["geometry"]["wall_length"]["value_mm"] == 3200
    assert "furniture.layout_candidates" in data["affected_dependencies"]

    state = client.get(f"/api/v1.1/projects/{project_id}/state")
    assert state.status_code == 200
    assert state.json()["room"]["geometry"]["wall_length"]["value_mm"] == 3200


def test_v11_api_create_generates_order_no_when_missing():
    create = client.post("/api/v1.1/projects", json={})
    assert create.status_code == 200
    assert create.json()["identity"]["order_no"]


def test_v11_recalculate_uses_legacy_engine_when_minimum_state_available():
    create = client.post("/api/v1.1/projects", json={"project": make_project().model_dump(mode="json")})
    pid = create.json()["identity"]["internal_id"]
    r = client.post(f"/api/v1.1/projects/{pid}/recalculate")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["legacy_engine_error"] is None
    assert data["legacy_engine_candidate_count"] is not None
    assert data["legacy_engine_candidate_count"] >= 1


def test_v11_recalculate_reports_missing_state_without_inventing_values():
    create = client.post("/api/v1.1/projects", json={})
    pid = create.json()["identity"]["internal_id"]
    r = client.post(f"/api/v1.1/projects/{pid}/recalculate")
    assert r.status_code == 200
    assert "wall_length" in r.json()["legacy_engine_error"]
