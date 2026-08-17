from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r=client.get('/api/health')
    assert r.status_code==200
    assert r.json()['status']=='ok'


def test_index_served():
    r=client.get('/')
    assert r.status_code==200
    assert 'BIZET OS 1.0' in r.text


def test_room_resolve_endpoint():
    payload = {
        "object_type": "NEW_BUILD",
        "configuration": "LEFT_WALL",
        "opening_system": "PUSH",
        "room": {
            "wall_length": {"value_mm": 3000, "source": "USER_ENTERED"},
            "room_height": {"value_mm": 2700, "source": "USER_ENTERED"},
            "wall_depth": {"value_mm": 600, "source": "USER_ENTERED"},
            "left_wall": {"depth_mm": 600, "deviation_mm": 0, "is_deep_wall": True, "source": "USER_ENTERED"},
            "right_wall": {"depth_mm": 0, "deviation_mm": 0, "is_deep_wall": False, "source": "USER_ENTERED"},
            "finished_floor": True,
            "skirting_present": False,
            "ceiling_type": "STRETCH_B",
            "ceiling_gap_mm": 20,
            "obstacles": [{"id":"window-1","type":"WINDOW","x_mm":1800,"width_mm":700,"depth_mm":150,"height_mm":1400,"bottom_mm":900,"source":"USER_CONFIRMED","confirmed":True}]
        },
        "communications": [{"id":"drain-1","type":"DRAIN","x_mm":1100,"z_mm":450,"tolerance_radius_mm":125,"source":"USER_CONFIRMED","confirmed":True}],
        "appliances": [],
        "preferences": {}
    }
    r = client.post('/api/room/resolve', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data['wall_length_mm'] == 3000
    assert data['ceiling_type'] == 'STRETCH_B'
    assert len(data['obstacles']) == 1


def _appliance_payload():
    return {
        "object_type":"NEW_BUILD","configuration":"LEFT_WALL","opening_system":"PUSH",
        "room":{"wall_length":{"value_mm":3000},"room_height":{"value_mm":2700},"ceiling_type":"OPEN_GAP"},
        "communications":[{"type":"APPLIANCE_POWER","x_mm":700,"confirmed":True}],
        "appliances":[{"type":"FRIDGE_BUILTIN","width_mm":600,"built_in":True}],
        "preferences":{}
    }

def test_appliance_resolve_endpoint():
    r=client.post('/api/appliances/resolve',json=_appliance_payload())
    assert r.status_code==200
    assert r.json()['appliances'][0]['metadata']['create_tall_unit'] is True

def test_compatibility_endpoint_has_typed_results():
    payload=_appliance_payload(); payload['appliances'][0]['has_door_closer']=True; payload['opening_system']='GOLA'
    r=client.post('/api/compatibility/evaluate',json=payload)
    assert r.status_code==200
    assert any(x['result_type']=='HUMAN_REVIEW' for x in r.json()['human_review'])
