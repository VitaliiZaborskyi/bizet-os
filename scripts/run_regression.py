from __future__ import annotations
import json
from pathlib import Path
from app.domain.models import ProjectInput
from app.engine.rules import DecisionEngine
from app.engine.constants import RULE_SET_VERSION

ROOT=Path(__file__).resolve().parents[1]
CASES=ROOT/'test_kitchens'
REPORT=ROOT/'reports'/'REGRESSION_RESULTS.md'
rows=[]
for f in sorted(CASES.glob('K*.json')):
    data=json.loads(f.read_text())
    project=ProjectInput.model_validate(data['project'])
    candidates=DecisionEngine.generate(project)
    selected=candidates[0] if candidates else None
    actual=selected.validation.status.value if selected else 'STOP'
    expected=data['expected']
    details=[]
    if selected:
        details += selected.validation.stops + selected.validation.human_review + selected.validation.warnings
    rows.append((f.name,expected,actual,'PASS' if actual==expected else 'MISMATCH','; '.join(details[:3])))

lines=[f'# BIZET OS 1.0 regression — {RULE_SET_VERSION}','', '| Case | Expected | Actual | Result | Main notes |','|---|---|---|---|---|']
for r in rows:
    lines.append('| '+' | '.join(x.replace('|','/') for x in r)+' |')
lines += ['', f'Passed: {sum(r[3]=="PASS" for r in rows)}/{len(rows)}']
REPORT.write_text('\n'.join(lines))
print(REPORT.read_text())
raise SystemExit(0 if all(r[3]=='PASS' for r in rows) else 2)
