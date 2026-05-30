---
phase: 02-data-foundation-secrets-management
plan: "04"
type: execute
wave: 4
depends_on: ["03"]
gap_closure: true
files_modified:
  - api/agents/orchestrator.py
  - api/requirements.txt
  - tests/test_vector_db.py
files_created:
  - tests/test_startup_import.py
autonomous: true
requirements:
  - "Close verification gap: api.main import failure on langgraph.graph"

must_haves:
  truths:
    - "api.main imports successfully on the project-supported Python runtime"
    - "LangGraph dependency/import path is version-compatible and pinned"
    - "A startup smoke test prevents regression of import/runtime wiring"
  artifacts:
    - path: "api/agents/orchestrator.py"
      provides: "LangGraph imports compatible with installed package version"
    - path: "api/requirements.txt"
      provides: "Pinned compatible dependency for orchestrator runtime"
    - path: "tests/test_startup_import.py"
      provides: "Automated startup import smoke test"
  key_links:
    - "tests/test_startup_import.py verifies import path used in api/agents/orchestrator.py"
---

<objective>
Close Phase 02 verification gaps by fixing orchestrator startup import compatibility and adding an automated startup smoke test.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/phases/02-data-foundation-secrets-management/02-VERIFICATION.md
@.planning/phases/02-data-foundation-secrets-management/02-UAT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix LangGraph Import Compatibility</name>
  <files>
    api/agents/orchestrator.py, api/requirements.txt
  </files>
  <action>
    Make `api/agents/orchestrator.py` compatible with the installed `langgraph` package API.
    If import paths changed between versions, update imports and pin `langgraph` in `api/requirements.txt` to the compatible version used by the code.
  </action>
  <verify>
    <automated>py -3.12 -c "from api.main import app; print(app.title)"</automated>
  </verify>
  <done>FastAPI app imports without `ModuleNotFoundError` from orchestrator dependencies.</done>
</task>

<task type="auto">
  <name>Task 2: Add Startup Smoke Test</name>
  <files>
    tests/test_startup_import.py
  </files>
  <action>
    Add a focused test that imports `api.main` and asserts app metadata is available.
    Keep the test lightweight and independent of external network services.
  </action>
  <verify>
    <automated>py -3.12 -m pytest tests/test_startup_import.py -q</automated>
  </verify>
  <done>Startup import compatibility is covered by automated tests.</done>
</task>

<task type="checkpoint">
  <name>Task 3: Complete Pending UAT Items</name>
  <files>
    .planning/phases/02-data-foundation-secrets-management/02-UAT.md
  </files>
  <action>
    Run and document the remaining manual UAT checks in `02-UAT.md`:
    local env fallback, GCP secret priority, and facade compatibility.
    Update results, summary counts, and gaps accordingly.
  </action>
  <verify>
    <human>All pending UAT checks have explicit pass/fail results recorded.</human>
  </verify>
  <done>UAT status is no longer `testing` with pending items.</done>
</task>

</tasks>

<verification>
- `py -3.12 -m pytest tests -q` passes.
- `py -3.12 -c "from api.main import app; print(app.title)"` succeeds.
- `02-UAT.md` pending count is 0.
</verification>
