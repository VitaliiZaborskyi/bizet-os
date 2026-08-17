from copy import deepcopy

from app.domain.enums import ModuleKind, ValidationStatus
from app.domain.models import LayoutCandidate, LayoutItem, ValidationResult
from app.engine.module_engine import ModuleEngine
from app.engine.ranking import RankingEngine
from app.engine.rules import DecisionEngine
from tests.test_engine import base_project


def test_50_grid_width_generates_multiple_standard_candidates():
    splits = ModuleEngine.generate_splits(1200)
    standard = [s for s in splits if s.standard_split and all(w % 50 == 0 for w in s.widths)]
    assert len(standard) >= 2
    assert all(sum(s.widths) == 1200 for s in standard)


def test_off_grid_width_allows_nonstandard_without_calling_it_error():
    splits = ModuleEngine.generate_splits(1032)
    assert splits
    assert all(sum(s.widths) == 1032 for s in splits)
    assert any(s.nonstandard_count > 0 for s in splits)


def test_required_cutlery_function_is_reserved_before_hinged_residual():
    p = base_project()
    c = DecisionEngine.generate(p)[0]
    cutlery = next(i for i in c.items if i.metadata.get("required_function") == "CUTLERY_TRAY")
    hinged = [i for i in c.items if i.kind == ModuleKind.HINGED]
    assert cutlery.width_mm == 400
    assert all(cutlery.x_mm < i.x_mm for i in hinged)


def test_all_residual_modules_are_budget_default_hinged():
    p = base_project()
    # 3768 yields a large residual after the fixed 18 mm filler and pilot appliances.
    p.room.wall_length.value_mm = 3768
    cs = DecisionEngine.generate(p)
    assert len(cs) >= 2
    for c in cs:
        generated = [i for i in c.items if i.id.startswith("hinged-")]
        assert generated
        assert all(i.kind == ModuleKind.HINGED and i.opening == "HINGED" for i in generated)


def test_lexicographic_validity_beats_budget_and_symmetry():
    base_items = [LayoutItem(id="x", label="x", kind=ModuleKind.HINGED, width_mm=600, x_mm=0)]
    good = LayoutCandidate(
        candidate_id="good", items=base_items, used_length_mm=600, room_length_mm=600,
        residual_mm=0, score=0, score_breakdown={
            "VALIDITY": 4, "FUNCTION": 100, "BUDGET": 1, "EFFICIENT_SPACE": 1, "SYMMETRY": 1,
        }, applied_rules=[], validation=ValidationResult(status=ValidationStatus.VALID),
    )
    bad = LayoutCandidate(
        candidate_id="bad", items=base_items, used_length_mm=600, room_length_mm=600,
        residual_mm=0, score=0, score_breakdown={
            "VALIDITY": 3, "FUNCTION": 100, "BUDGET": 9999, "EFFICIENT_SPACE": 9999, "SYMMETRY": 9999,
        }, applied_rules=[], validation=ValidationResult(status=ValidationStatus.VALID_WITH_WARNINGS),
    )
    assert RankingEngine.key(good) > RankingEngine.key(bad)


def test_ranked_candidates_follow_declared_tier_order():
    p = base_project()
    p.room.wall_length.value_mm = 3768
    cs = DecisionEngine.generate(p)
    keys = [RankingEngine.key(c) for c in cs]
    assert keys == sorted(keys, reverse=True)
