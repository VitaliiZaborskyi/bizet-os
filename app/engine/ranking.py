from __future__ import annotations

from app.domain.enums import ModuleKind, ValidationStatus
from app.domain.models import LayoutCandidate, LayoutItem, ProjectInput, ValidationResult


class RankingEngine:
    """Strict lexicographic ranking: VALIDITY → FUNCTION → BUDGET → EFFICIENT_SPACE → SYMMETRY."""

    VALIDITY_RANK = {
        ValidationStatus.VALID: 4.0,
        ValidationStatus.VALID_WITH_WARNINGS: 3.0,
        ValidationStatus.HUMAN_REVIEW: 2.0,
        ValidationStatus.STOP: 0.0,
    }

    @staticmethod
    def breakdown(
        items: list[LayoutItem],
        validation: ValidationResult,
        project: ProjectInput,
        required_function_satisfied: bool,
        room_length_mm: int,
        used_length_mm: int,
    ) -> dict[str, float]:
        validity = RankingEngine.VALIDITY_RANK[validation.status]
        function = 100.0 if required_function_satisfied else 0.0

        hinged = sum(1 for i in items if i.kind == ModuleKind.HINGED)
        optional_drawers = sum(1 for i in items if i.kind == ModuleKind.DRAWERS)
        nonstandard = sum(1 for i in items if i.kind == ModuleKind.HINGED and not i.standard_width)
        special_accessory_risk = sum(1 for i in items if i.metadata.get("accessory_compatibility_required"))

        # Budget: all generated residual modules are simple hinged by default. We do not
        # invent a price penalty/reward for the number of cabinets because no such BIZET
        # cost rule is fixed yet. Only known complexity signals affect this tier.
        budget = 100.0 - optional_drawers * 8.0 - nonstandard * 8.0 - special_accessory_risk * 4.0
        if not project.preferences.budget_priority:
            budget = 100.0 - nonstandard * 4.0
        if project.preferences.comfort_mode:
            budget += optional_drawers * 8.0

        residual = abs(room_length_mm - used_length_mm)
        efficient_space = max(0.0, 100.0 - residual)

        widths = [
            i.width_mm for i in items
            if i.kind in {ModuleKind.HINGED, ModuleKind.DRAWERS, ModuleKind.FUNCTIONAL}
        ]
        if len(widths) <= 1:
            symmetry = 50.0
        else:
            spread = max(widths) - min(widths)
            symmetry = max(0.0, 100.0 - spread / 5.0)

        return {
            "VALIDITY": validity,
            "FUNCTION": function,
            "BUDGET": budget,
            "EFFICIENT_SPACE": efficient_space,
            "SYMMETRY": symmetry,
        }

    @staticmethod
    def key(candidate: LayoutCandidate) -> tuple[float, float, float, float, float]:
        b = candidate.score_breakdown
        return (
            b.get("VALIDITY", 0.0),
            b.get("FUNCTION", 0.0),
            b.get("BUDGET", 0.0),
            b.get("EFFICIENT_SPACE", 0.0),
            b.get("SYMMETRY", 0.0),
        )

    @staticmethod
    def display_score(breakdown: dict[str, float]) -> float:
        # Only for UI/debug. Sorting never uses this scalar.
        return (
            breakdown["VALIDITY"] * 1_000_000_000
            + breakdown["FUNCTION"] * 1_000_000
            + breakdown["BUDGET"] * 1_000
            + breakdown["EFFICIENT_SPACE"] * 10
            + breakdown["SYMMETRY"]
        )
