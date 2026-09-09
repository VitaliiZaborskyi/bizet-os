from fastapi.testclient import TestClient

from app.main import app
from app.project.models import ProjectState
from app.quest.engine import QuestEngine
from app.quest.service import QuestAnswerService


client = TestClient(app)


def test_root_serves_start_experience():
    response = client.get("/")
    assert response.status_code == 200
    assert "BIZET OS — Start Experience" in response.text
    assert "/static/start.js" in response.text


def test_legacy_pilot_is_preserved_separately():
    response = client.get("/legacy")
    assert response.status_code == 200
    assert "TESTABLE PROTOTYPE" in response.text
    assert "/static/app.js" in response.text


def test_start_experience_can_store_all_four_context_answers_before_geometry():
    service = QuestAnswerService()
    project = ProjectState()

    answers = [
        ("SELECT_OBJECT_TYPE", "NEW_BUILD"),
        ("SELECT_PRODUCT_TYPE", "KITCHEN"),
        ("SELECT_COMPLEXITY_CATEGORY", "III"),
        ("SELECT_VISUAL_DIRECTION", "LIGHT"),
    ]

    for action_id, answer in answers:
        project = service.submit_answer(project, action_id, answer).project

    assert project.context.object_type == "NEW_BUILD"
    assert project.context.product_type == "KITCHEN"
    assert project.context.complexity_category == "III"
    assert project.context.visual_direction == "LIGHT"
    assert set(action_id for action_id, _ in answers).issubset(project.quest.completed_action_ids)
    assert QuestEngine().get_next_action(project).next_action.action_id == "ASK_ROOM_WALL_LENGTH"


def test_start_context_answer_can_be_changed_without_new_project():
    service = QuestAnswerService()
    project = service.submit_answer(ProjectState(), "SELECT_OBJECT_TYPE", "NEW_BUILD").project
    internal_id = project.identity.internal_id

    project = service.submit_answer(project, "SELECT_OBJECT_TYPE", "PRIVATE_HOUSE").project

    assert project.identity.internal_id == internal_id
    assert project.context.object_type == "PRIVATE_HOUSE"
