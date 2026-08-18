from __future__ import annotations

from threading import Lock

from .models import ProjectState


class InMemoryProjectRepository:
    def __init__(self) -> None:
        self._items: dict[str, ProjectState] = {}
        self._lock = Lock()

    def create(self, project: ProjectState) -> ProjectState:
        with self._lock:
            self._items[project.identity.internal_id] = project.model_copy(deep=True)
        return project

    def get(self, project_id: str) -> ProjectState | None:
        with self._lock:
            item = self._items.get(project_id)
            return item.model_copy(deep=True) if item else None

    def save(self, project: ProjectState) -> ProjectState:
        with self._lock:
            self._items[project.identity.internal_id] = project.model_copy(deep=True)
        return project


repository = InMemoryProjectRepository()
