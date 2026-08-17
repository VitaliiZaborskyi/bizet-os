# BIZET OS 1.0 — Prototype Build 0.2 / Room Engine

Первый локально запускаемый web-прототип BIZET OS с отдельным Rule/Decision Engine и полноценным ручным `Room Engine`.

## Что реализовано

- FastAPI backend и изолированный Python Rule/Decision Engine.
- Три конфигурации прямой кухни: `LEFT_WALL`, `RIGHT_WALL`, `BETWEEN_WALLS`.
- Manual Room Input: длина, высота, глубина рабочей зоны, глубина боковых стен, кривизна, горизонтальное/вертикальное отклонение.
- Ceiling: `STRETCH_A`, `STRETCH_B`, `GYPSUM`, `OPEN_GAP`.
- Finish state: финишный пол, плинтус.
- Obstacles: заплечник, выступ/короб, колонна, окно, подоконник, дверь, проём, радиатор, плинтус, другое.
- Communications: канализация, вода, питание варочной, газ, вентиляция, питание техники, подсветка.
- Для критических данных хранится source/confidence: `SCAN_DETECTED`, `USER_ENTERED`, `USER_CONFIRMED`, `ESTIMATED`.
- У коммуникаций: X/Z, tolerance radius, confirmed flag.
- `/api/room/resolve` нормализует помещение и выдаёт rule trace, warnings и Human Review.
- Existing Decision Engine получает Room Engine trace/warnings и продолжает строить модульную конфигурацию.
- Live SVG показывает помещение, стены, препятствия, коммуникации и кухонный skeleton.

## Почему пока не Three.js

Спецификация v0.9 оставляет открытыми OQ-03/OQ-04 — точную вертикальную систему нижнего ряда. Поэтому Build 0.2 не придумывает производственно-точную 3D-высоту. SVG используется как честный геометрический skeleton. После фиксации вертикальных констант UI можно заменить на Three.js без изменения Rule Engine.

## Запуск

Python 3.11+.

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Открыть: `http://127.0.0.1:8000`

API docs: `http://127.0.0.1:8000/docs`

## Тесты

```bash
pytest -q
```

## Основные файлы

- `app/engine/room.py` — Room Engine.
- `app/engine/rules.py` — furniture Decision/Rule Engine.
- `app/domain/models.py` — domain models.
- `app/static/` — минимальный UI.
- `tests/` — unit/API tests.


## Build 0.4 — Appliance + Compatibility Engine

- `POST /api/appliances/resolve` — нормализация выбранной техники и требуемых подключений.
- `POST /api/compatibility/evaluate` — структурированные результаты `HARD_RULE`, `STOP`, `HUMAN_REVIEW`, warnings.
- Мебельные правила находятся в `app/engine/appliances.py` и `app/engine/compatibility.py`, отдельно от UI.
- Проверяется только логика, явно зафиксированная в спецификации v0.9.


## Build 0.4 — Module Engine

- Generates multiple exact residual-layout candidates when geometry permits.
- Uses the 50 mm BIZET digital grid as standard.
- Allows nonstandard simple hinged residual modules with explicit accessory compatibility warning.
- Reserves required functional modules before distributing residual space.
- Budget default keeps residual modules hinged.
- Ranks candidates strictly by `VALIDITY → FUNCTION → BUDGET → EFFICIENT_SPACE → SYMMETRY`.
- UI exposes candidate alternatives and score breakdown for pilot debugging.

Run tests:
```bash
PYTHONPATH=. pytest -q
```

## Build 0.5 — Live Skeleton

UI now includes an automatically updating schematic kitchen visualizer with three modes: Perspective (2.5D), Front and Plan. It renders room geometry, active walls, obstacles, communications, modules, appliances, fillers and width dimensions from the server-generated layout candidates.

The visualizer is presentation-only. Furniture decisions remain in the Python Rule/Decision Engine. Lower/tall display heights are intentionally schematic until OQ-03/OQ-04 are resolved.

## Build 0.6 — First Testable Prototype

Build 0.6 closes the first prototype loop: Room → Appliance → Compatibility → Module → Final Validation → Result.

- validation statuses: `VALID`, `VALID_WITH_WARNINGS`, `HUMAN_REVIEW`, `STOP`;
- stable application number during UI recalculation, format `NNN.MM.YY`;
- result screen with perspective/front/plan schematic views;
- module table and explicit validation notes;
- browser Print/PDF output with BIZET watermark;
- 8 regression kitchen fixtures in `test_kitchens/`;
- regression runner: `PYTHONPATH=. python scripts/run_regression.py`;
- spec/code gap register: `docs/SPEC_CODE_GAPS.md`.

The prototype deliberately does not invent the unresolved vertical lower-row geometry (OQ-03/OQ-04) and does not pretend the schematic envelope is production geometry.
