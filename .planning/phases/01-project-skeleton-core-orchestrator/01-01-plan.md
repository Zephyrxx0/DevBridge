---
phase: 01-project-skeleton-core-orchestrator
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - api/main.py
  - api/agents/orchestrator.py
  - api/requirements.txt
  - web/package.json
  - web/src/app/page.tsx
  - web/src/app/layout.tsx
  - web/src/app/globals.css
autonomous: true
requirements: []

must_haves:
  truths:
    - "Backend API responds at / and /chat"
    - "Frontend shows chat interface"
    - "Orchestrator can process messages"
  artifacts:
    - path: "api/main.py"
      provides: "FastAPI with / and /chat"
    - path: "api/agents/orchestrator.py"
      provides: "LangGraph ReAct agent"
    - path: "web/src/app/page.tsx"
      provides: "Chat UI"
  key_links:
    - from: "web/src/app/page.tsx"
      to: "http://localhost:8000/chat"
      via: "fetch POST"
---

<objective>
Establish the monorepo structure (Next.js frontend + FastAPI backend) and implement a functional AI Orchestrator with a basic ReAct loop that can respond to chat messages.
</objective>

<context>
@.planning/phases/01-project-skeleton-core-orchestrator/01-CONTEXT.md

## Existing Implementation Summary
- api/main.py — FastAPI app with / and /chat endpoints
- api/agents/orchestrator.py — LangGraph ReAct agent with code_search tool
- web/ — Next.js 15 app with chat UI
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify backend implementation</name>
  <files>api/main.py, api/agents/orchestrator.py, api/requirements.txt</files>
  <read_first>
  - api/main.py
  - api/agents/orchestrator.py
  - api/requirements.txt (check if exists)
  </read_first>
  <action>
Verify the backend is correctly implemented:
1. api/requirements.txt exists with required dependencies (fastapi, uvicorn, langgraph, langchain-google-vertexai, pydantic, python-dotenv)
2. api/main.py has working / GET endpoint returning system status
3. api/main.py has POST /chat endpoint that calls orchestrator.chat()
4. api/agents/orchestrator.py implements Orchestrator class with chat() method using LangGraph create_react_agent
  </action>
  <verify>
    <automated>python -c "from api.main import app; print('Backend imports OK')"</automated>
  </verify>
  <done>Backend responds to GET / with {"status": "online"} and POST /chat returns response</done>
</task>

<task type="auto">
  <name>Task 2: Verify frontend implementation</name>
  <files>web/src/app/page.tsx</files>
  <read_first>
  - web/src/app/page.tsx
  - web/package.json
  </read_first>
  <action>
Verify the frontend is correctly implemented:
1. web/package.json exists (Next.js initialized)
2. web/src/app/page.tsx has chat interface with message state
3. handleSubmit function POSTs to http://localhost:8000/chat
4. UI renders message bubbles with user/assistant roles
  </read_first>
  <verify>
    <automated>cd web && npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Frontend builds without errors, chat UI is functional</done>
</task>

</tasks>

<verification>
- [x] api/requirements.txt exists with dependencies
- [ ] Backend can import (requires GCP credentials)
- [ ] web/build succeeds (requires node_modules fix)
- [ ] / endpoints return status
</verification>

<success_criteria>
Monorepo runs end-to-end:
- Backend at http://localhost:8000 with / and /chat
- Frontend at http://localhost:3000 with chat UI
- Chat flow: UI -> /chat -> Orchestrator -> Response
</success_criteria>

<known_issues>
1. Backend requires GCP Application Default Credentials to initialize ChatVertexAI
2. Next.js 16 Turbopack root needs configuration fix
</known_issues>

<output>
After completion, create `.planning/phases/01-project-skeleton-core-orchestrator/01-SUMMARY.md`
</output>