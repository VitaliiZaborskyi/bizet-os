from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.project.models import ProjectState
from app.quest.engine import QuestEngine
from app.quest.service import QuestAnswerService


ROOT = Path(__file__).resolve().parents[1]
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
        ("SELECT_PRODUCT_TYPE", "ZONE_KITCHEN"),
        ("SELECT_COMPLEXITY_CATEGORY", "III"),
        ("SELECT_VISUAL_DIRECTION", "LIGHT"),
    ]

    for action_id, answer in answers:
        project = service.submit_answer(project, action_id, answer).project

    assert project.context.object_type == "NEW_BUILD"
    assert project.context.product_type == "ZONE_KITCHEN"
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


def test_revised_client_copy_uses_zones_and_styling_not_product_labels():
    js = (ROOT / "app/static/start.js").read_text(encoding="utf-8")
    assert "Выберите зону" in js
    assert "ZONE_BEDROOM" in js
    assert "ZONE_WARDROBE" in js
    assert "Какое оформление вам ближе?" in js
    assert "Какое направление вам ближе?" not in js
    assert "Тип объекта" not in js
    assert "kicker: 'Категория'" not in js


def test_settings_menu_exposes_theme_language_account_feedback_and_tutorial():
    html = (ROOT / "app/static/index.html").read_text(encoding="utf-8")
    for ident in [
        "settingsButton", "themeSelect", "languageSelect", "loginButton", "registerButton",
        "feedbackButton", "tutorialButton", "feedbackDialog", "tutorialDialog",
    ]:
        assert f'id="{ident}"' in html


def test_first_question_has_no_visible_back_arrow_and_summary_is_clean():
    html = (ROOT / "app/static/index.html").read_text(encoding="utf-8")
    js = (ROOT / "app/static/start.js").read_text(encoding="utf-8")
    assert 'id="backButton"' in html and "hidden" in html
    assert "$('backButton').hidden = currentStep === 0" in js
    assert "Ваш выбор" in html
    assert "Детали вашего помещения" in html
    assert "handoffNote" not in html
    assert "Можно переходить к помещению" not in html


def test_summary_choices_are_editable_without_restarting_project():
    js = (ROOT / "app/static/start.js").read_text(encoding="utf-8")
    assert "summary-chip" in js
    assert "editSummaryStep" in js
    assert "/reopen" in js
    assert "editingFromSummary" in js


def test_old_stock_visual_uses_secular_historic_facade_reference():
    js = (ROOT / "app/static/start.js").read_text(encoding="utf-8")
    assert "photo-1778222014071-9234e2a36472" in js
