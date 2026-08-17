from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from app.domain.enums import ModuleKind
from app.domain.models import LayoutItem, Preferences, RuleTrace
from . import constants as C


@dataclass(frozen=True)
class ModuleSplit:
    variant: str
    widths: tuple[int, ...]
    standard_split: bool
    nonstandard_count: int = 0


@dataclass(frozen=True)
class RequiredFunctionPlan:
    items: tuple[tuple[str, int, ModuleKind, str], ...]
    width_mm: int
    satisfied: bool
    messages: tuple[str, ...] = ()


class ModuleEngine:
    """BIZET v1.0 residual-space module generator.

    Furniture rules implemented here are intentionally limited to the v0.9 spec:
    - required function first (pilot cutlery module),
    - 50 mm digital grid is standard,
    - non-grid widths are allowed, but treated as nonstandard,
    - budget default prefers simple hinged modules,
    - accessories for nonstandard modules are not assumed compatible.
    """

    @staticmethod
    def required_functions(preferences: Preferences, available_width_mm: int) -> RequiredFunctionPlan:
        if not preferences.cutlery_tray:
            return RequiredFunctionPlan(items=(), width_mm=0, satisfied=True)

        width = C.CUTLERY_TRAY_MODULE_WIDTH_PILOT
        if available_width_mm < width:
            return RequiredFunctionPlan(
                items=(),
                width_mm=0,
                satisfied=False,
                messages=(
                    f"Required cutlery-tray function needs pilot width {width} mm, "
                    f"but only {available_width_mm} mm is available.",
                ),
            )
        return RequiredFunctionPlan(
            items=(("cutlery", width, ModuleKind.FUNCTIONAL, "DRAWERS"),),
            width_mm=width,
            satisfied=True,
        )

    @staticmethod
    def _standard_combinations(width: int, max_modules: int = 4) -> list[tuple[int, ...]]:
        """Generate exact 50-grid splits without inventing a preferred-width hard rule.

        OQ-02 is still open, so preferred widths are used only to order search, not to
        forbid other 50-grid widths. Minimum simple module width remains the pilot
        implementation heuristic already present in build 0.3.
        """
        if width <= 0 or width % C.MODULE_GRID_STEP:
            return []

        allowed = list(range(C.MIN_SIMPLE_MODULE_WIDTH, width + 1, C.MODULE_GRID_STEP))
        # Search wider / familiar modules first for budget simplicity; this is an
        # implementation heuristic, not a BIZET hard rule.
        preferred = [w for w in C.PREFERRED_HINGED_WIDTHS if w in allowed]
        ordered = preferred + [w for w in reversed(allowed) if w not in preferred]

        unique: set[tuple[int, ...]] = set()
        result: list[tuple[int, ...]] = []
        for count in range(1, max_modules + 1):
            # bounded DFS to avoid combinatorial explosion
            def dfs(remaining: int, depth: int, acc: list[int]):
                if len(result) >= C.MODULE_MAX_STANDARD_VARIANTS:
                    return
                if depth == 0:
                    if remaining == 0:
                        tup = tuple(acc)
                        canonical = tuple(sorted(tup, reverse=True))
                        if canonical not in unique:
                            unique.add(canonical)
                            result.append(tup)
                    return
                min_needed = C.MIN_SIMPLE_MODULE_WIDTH * depth
                if remaining < min_needed:
                    return
                for w in ordered:
                    if w > remaining:
                        continue
                    after = remaining - w
                    if depth > 1 and after < C.MIN_SIMPLE_MODULE_WIDTH * (depth - 1):
                        continue
                    acc.append(w)
                    dfs(after, depth - 1, acc)
                    acc.pop()
                    if len(result) >= C.MODULE_MAX_STANDARD_VARIANTS:
                        return
            dfs(width, count, [])
            if len(result) >= C.MODULE_MAX_STANDARD_VARIANTS:
                break

        # Add a deliberately balanced exact split when possible; symmetry is a late
        # tie-breaker but should have a candidate to compare against.
        for count in (2, 3):
            if width >= count * C.MIN_SIMPLE_MODULE_WIDTH:
                base = (width // count // C.MODULE_GRID_STEP) * C.MODULE_GRID_STEP
                if base >= C.MIN_SIMPLE_MODULE_WIDTH:
                    parts = [base] * count
                    diff = width - sum(parts)
                    i = 0
                    while diff >= C.MODULE_GRID_STEP:
                        parts[i % count] += C.MODULE_GRID_STEP
                        diff -= C.MODULE_GRID_STEP
                        i += 1
                    if diff == 0 and min(parts) >= C.MIN_SIMPLE_MODULE_WIDTH:
                        canonical = tuple(sorted(parts, reverse=True))
                        if canonical not in unique:
                            unique.add(canonical)
                            result.append(tuple(parts))

        return result[: C.MODULE_MAX_STANDARD_VARIANTS]

    @staticmethod
    def _nonstandard_variants(width: int) -> list[tuple[int, ...]]:
        if width <= 0:
            return []
        variants: list[tuple[int, ...]] = []

        # Simplest budget fallback: one hinged module if physically above pilot min.
        if width >= C.MIN_SIMPLE_MODULE_WIDTH:
            variants.append((width,))

        # For larger spans create a two-module balanced fallback. Nonstandard does not
        # imply forbidden; it only activates accessory compatibility warnings.
        if width >= 2 * C.MIN_SIMPLE_MODULE_WIDTH:
            a = width // 2
            b = width - a
            variants.append((a, b))

        # Try to preserve one standard grid module and push the odd remainder into a
        # second simple hinged module, provided both remain above pilot min.
        for standard in C.PREFERRED_HINGED_WIDTHS:
            other = width - standard
            if standard >= C.MIN_SIMPLE_MODULE_WIDTH and other >= C.MIN_SIMPLE_MODULE_WIDTH:
                pair = (standard, other)
                if pair not in variants and tuple(reversed(pair)) not in variants:
                    variants.append(pair)
                    break
        return variants[: C.MODULE_MAX_NONSTANDARD_VARIANTS]

    @classmethod
    def generate_splits(cls, width: int) -> list[ModuleSplit]:
        if width < 0:
            return []
        if width == 0:
            return [ModuleSplit("exact-zero-residual", (), True, 0)]

        variants: list[ModuleSplit] = []
        for idx, widths in enumerate(cls._standard_combinations(width)):
            variants.append(ModuleSplit(f"grid-{idx+1}", widths, True, 0))

        # If width itself is off-grid, there cannot be an all-standard exact split.
        # If it is on-grid, nonstandard alternatives are still generated only as lower
        # priority comparison candidates for pilot testing, not as recommendations.
        for idx, widths in enumerate(cls._nonstandard_variants(width)):
            nonstd = sum(1 for w in widths if w % C.MODULE_GRID_STEP != 0)
            # Avoid duplicate all-standard alternatives already covered above.
            if nonstd == 0 and variants:
                continue
            variants.append(ModuleSplit(f"nonstandard-{idx+1}", widths, nonstd == 0, nonstd))

        # exact de-duplication preserving order
        seen: set[tuple[int, ...]] = set()
        deduped: list[ModuleSplit] = []
        for v in variants:
            if v.widths in seen:
                continue
            seen.add(v.widths)
            deduped.append(v)
        return deduped[: C.MODULE_MAX_CANDIDATES]

    @staticmethod
    def instantiate_hinged(split: ModuleSplit, start_x: int, candidate_index: int) -> tuple[list[LayoutItem], list[RuleTrace]]:
        items: list[LayoutItem] = []
        traces: list[RuleTrace] = []
        cursor = start_x
        for j, width in enumerate(split.widths):
            standard = width % C.MODULE_GRID_STEP == 0
            items.append(LayoutItem(
                id=f"hinged-{candidate_index}-{j}",
                label=f"Распашной {width}",
                kind=ModuleKind.HINGED,
                width_mm=width,
                x_mm=cursor,
                standard_width=standard,
                opening="HINGED",
                metadata={
                    "functional_role": "WORK_SURFACE_BUFFER",
                    "width_class": "STANDARD_GRID" if standard else "NONSTANDARD_WIDTH",
                    "accessory_compatibility_required": not standard,
                },
            ))
            cursor += width

        traces.append(RuleTrace(
            rule_id="MOD-GRID-01",
            classification="DEFAULT RULE",
            message=f"Residual split generated by Module Engine: {split.variant}",
            data={
                "widths": list(split.widths),
                "grid_step": C.MODULE_GRID_STEP,
                "nonstandard_count": split.nonstandard_count,
            },
        ))
        if split.nonstandard_count:
            traces.append(RuleTrace(
                rule_id="MOD-NONSTANDARD-01",
                classification="WARNING",
                message="Nonstandard width is allowed; accessory compatibility must be checked before detailed design.",
                data={"nonstandard_count": split.nonstandard_count},
            ))
        return items, traces
