# Build 0.6 — First Testable Prototype

Ruleset: `1.0.0-pilot.6`

Implemented:
- Final Validation aggregation and explicit statuses;
- length arithmetic, horizontal collision, appliance presence and dishwasher/sink adjacency checks;
- stable application number per UI project session (`NNN.MM.YY`);
- result screen with perspective/front/plan schematic views;
- module list, warnings/Human Review/STOP reasons;
- browser print/PDF result with BIZET watermark;
- 8 regression kitchen fixtures and automated runner;
- explicit Spec ↔ Code gaps register with no invented furniture rules.

Verification:
- pytest: 37/37 passed;
- regression kitchens: 8/8 expected statuses passed;
- JavaScript syntax: passed;
- Python compile: passed;
- HTTP smoke test: passed.
