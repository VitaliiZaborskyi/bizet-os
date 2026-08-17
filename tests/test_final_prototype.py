import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.domain.models import ProjectInput
from app.engine.rules import DecisionEngine

ROOT=Path(__file__).resolve().parents[1]
client=TestClient(app)

def load(name):
    return json.loads((ROOT/'test_kitchens'/name).read_text())

def test_regression_kitchens_match_expected_statuses():
    for f in sorted((ROOT/'test_kitchens').glob('K*.json')):
        d=json.loads(f.read_text())
        p=ProjectInput.model_validate(d['project'])
        candidates=DecisionEngine.generate(p)
        assert candidates[0].validation.status.value == d['expected'], f.name

def test_generate_preserves_application_number_across_recalculation():
    d=load('K01_valid_grid.json')['project']
    d['application_no']='347.11.26'
    r=client.post('/api/generate',json=d)
    assert r.status_code==200
    assert r.json()['application_no']=='347.11.26'

def test_final_validation_exposes_expected_checks():
    p=ProjectInput.model_validate(load('K01_valid_grid.json')['project'])
    v=DecisionEngine.generate(p)[0].validation
    assert any('Length arithmetic' in x for x in v.checks)
    assert 'No horizontal module collisions' in v.checks
    assert 'Dishwasher is directly adjacent to sink' in v.checks
    assert 'All pilot-scope selected appliances are represented in layout' in v.checks

def test_result_screen_contains_three_views_and_module_table():
    html=(ROOT/'app/static/index.html').read_text()
    for ident in ['resultPerspective','resultFront','resultPlan','resultModules','resultApplicationNo','resultStatus']:
        assert f'id="{ident}"' in html
    assert 'BIZET' in html

def test_gap_register_exists_and_names_open_vertical_geometry():
    text=(ROOT/'docs/SPEC_CODE_GAPS.md').read_text()
    assert 'OQ-03/OQ-04' in text
    assert '3D Scan ingestion' in text
