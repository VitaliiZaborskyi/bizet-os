"""BIZET OS 10.6.4 owner screenshot package #40-43.
3D core SHA contract is inherited from 10.6.3. This extends, not replaces, browser gate.
"""
from pathlib import Path
import re,shutil,subprocess
import pytest
STATIC=Path(__file__).resolve().parents[1]/"app"/"static"
def js(name):return (STATIC/name).read_text(encoding="utf-8")
def test_40_correct_physical_hinge_one_side_per_real_door():
    s=js("r1063-visual-adapter.js")
    assert "pivot?.userData?.type!=='door'" in s
    assert "pivot.userData.moduleId" in s
    assert "side==='left'?-width/2+22.5:width/2-22.5" in s
    assert "new T.CylinderGeometry(17.5,17.5,11,32)" in s
    assert "front.add(cup)" in s
    assert "front.add(arm)" in s
    assert "root.add(plate)" in s
    assert "levels=count===3?[.13,.5,.87]:[.17,.83]" in s
    assert "r1064-fixed-cabinet-plate" in s
    assert "productionReady:false" in s

def test_41_no_number_points_when_overlay_off():
    s=js("r1064-scene-clean.js")
    assert "if(!showNumbers)" in s
    assert "if(!o.isSprite)return" in s
    assert "sprite.visible=false" in s
    assert "apparent>=9" in s

def test_42_header_is_single_three_column_layout_with_accessible_controls():
    html=js("workspace-r8.html")
    css=js("r1064-header.css")
    script=js("r1064-header.js")
    assert "r1064-header.css?v=106401" in html
    assert "r1064-header.js?v=106401" in html
    assert "grid-template-columns:44px minmax(0,1fr) auto" in css
    for token in ["#backButton","#r1063HelpButton","#baseInfoButton","#settingsButton"]:
        assert token in css
    assert "for(const element of [help,info,more])" in script
    assert "duplicates.forEach" in script

def test_43_led_has_local_finite_distance_and_under_upper_line():
    s=js("r1063-visual-adapter.js")
    assert "new T.SpotLight(" in s
    assert "690,Math.PI/3" in s
    assert "spotlights:localSources" in s
    assert "Math.max(1000,Math.min(3600" not in s
    assert "new T.PointLight(" not in s
    assert "worktop?Number(m.z)-5" in s
    assert "new T.BoxGeometry(...dimensions)" in s
    assert "if(worktop&&bright>.01&&localSources<10)" in s

@pytest.mark.parametrize("name",["r1063-visual-adapter.js","r1064-scene-clean.js","r1064-header.js"])
def test_js_syntax(name):
    node=shutil.which("node")
    if not node:pytest.skip("Node unavailable")
    p=subprocess.run([node,"--check",str(STATIC/name)],capture_output=True,text=True)
    assert p.returncode==0,name+" "+p.stderr
