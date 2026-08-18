from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field


@dataclass
class DependencyRule:
    source: str
    targets: list[str]
    recalculate: list[str] = field(default_factory=list)
    reconfirm: list[str] = field(default_factory=list)


class DependencyEngine:
    """Small explicit dependency registry for Build 1.1-A.

    It models invalidation/recalculation; it does not invent furniture rules.
    """

    def __init__(self) -> None:
        self._rules: dict[str, list[DependencyRule]] = defaultdict(list)

    def register(self, rule: DependencyRule) -> None:
        self._rules[rule.source].append(rule)

    def resolve(self, changed_path: str) -> dict[str, list[str]]:
        affected: list[str] = []
        recalc: list[str] = []
        reconfirm: list[str] = []
        seen: set[str] = set()
        queue = deque([changed_path])

        while queue:
            node = queue.popleft()
            for source, rules in self._rules.items():
                if not self._matches(node, source):
                    continue
                for rule in rules:
                    for target in rule.targets:
                        if target not in seen:
                            seen.add(target)
                            affected.append(target)
                            queue.append(target)
                    recalc.extend(x for x in rule.recalculate if x not in recalc)
                    reconfirm.extend(x for x in rule.reconfirm if x not in reconfirm)
        return {"affected": affected, "recalculate": recalc, "reconfirm": reconfirm}

    @staticmethod
    def _matches(changed: str, registered: str) -> bool:
        return changed == registered or changed.startswith(registered + ".") or registered.startswith(changed + ".")


def default_dependency_engine() -> DependencyEngine:
    engine = DependencyEngine()
    engine.register(DependencyRule(
        source="room.geometry.wall_length",
        targets=["furniture.layout_candidates", "furniture.selected_candidate", "validation", "pricing.current_value"],
        recalculate=["room", "furniture.layout_candidates", "validation", "pricing.current_value"],
        reconfirm=["furniture.selected_candidate"],
    ))
    engine.register(DependencyRule(
        source="room.configuration",
        targets=["furniture.layout_candidates", "furniture.selected_candidate", "validation"],
        recalculate=["furniture.layout_candidates", "validation"],
        reconfirm=["furniture.selected_candidate"],
    ))
    engine.register(DependencyRule(
        source="communications",
        targets=["furniture.layout_candidates", "validation"],
        recalculate=["furniture.layout_candidates", "validation"],
    ))
    engine.register(DependencyRule(
        source="appliances",
        targets=["furniture.layout_candidates", "furniture.selected_candidate", "validation", "pricing.current_value"],
        recalculate=["furniture.layout_candidates", "validation", "pricing.current_value"],
        reconfirm=["furniture.selected_candidate"],
    ))
    engine.register(DependencyRule(
        source="materials",
        targets=["validation", "pricing.current_value"],
        recalculate=["validation", "pricing.current_value"],
    ))
    return engine
