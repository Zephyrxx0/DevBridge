# Phase 01: Project Skeleton & Core Orchestrator - Plan

**Goal:** Establish the monorepo structure and implement a functional AI Orchestrator with a basic ReAct loop.

## Proposed Changes

### 1. Project Scaffolding
- [ ] Create `api/` directory for the backend.
- [ ] Initialize Next.js in `web/` using `create-next-app`.

### 2. Backend Foundation (FastAPI)
- [ ] Create `api/requirements.txt` with `fastapi`, `uvicorn`, `langgraph`, `langchain-google-vertexai`.
- [ ] Implement `api/main.py` with basic health check and `/chat` endpoint.
- [ ] Implement `api/agents/orchestrator.py` using LangGraph's `create_react_agent`.
- [ ] Mock a `code_search` tool for the agent.

### 3. Frontend Foundation (Next.js)
- [ ] Setup a simple chat window in `web/src/app/page.tsx`.
- [ ] Implement a proxy or environment variable to connect to the FastAPI backend.

## Verification Plan

### Automated Tests
- Check if `api/main.py` is valid python and imports work.
- Run `curl http://localhost:8000/` to verify backend status.
- Run `npm run build` in `web/` to ensure no frontend breaks.

### Manual Verification
- Send a message through the web UI and see if the Orchestrator "thinks" and returns a response.

---

<must_haves>
- [ ] `api/main.py` successfully starts.
- [ ] `web/` frontend is accessible.
- [ ] `/chat` endpoint returns a response from Gemini.
</must_haves>

<tasks>
<task id="01-01" autonomous="true">
<read_first>
- .planning/phases/01-project-skeleton-core-orchestrator/01-CONTEXT.md
</read_first>
<action>
Create the `api/` directory and initialize `api/requirements.txt` with core dependencies.
Implement a generic FastAPI entry point in `api/main.py`.
</action>
<acceptance_criteria>
- `api/requirements.txt` exists and contains `fastapi`.
- `api/main.py` exists and responds to GET `/`.
</acceptance_criteria>
</task>

<task id="01-02" autonomous="true">
<read_first>
- api/main.py
</read_first>
<action>
Implement the LangGraph Orchestrator in `api/agents/orchestrator.py`.
Use `create_react_agent` with a mock tool.
Connect it to a POST `/chat` endpoint in `api/main.py`.
</action>
<acceptance_criteria>
- `api/agents/orchestrator.py` implements a functional graph.
- `api/main.py` has a `/chat` endpoint.
</acceptance_criteria>
</task>

<task id="01-03" autonomous="true">
<read_first>
- d:/Codes/Personal/DevBridge/
</read_first>
<action>
Initialize the Next.js frontend in the `web/` directory using:
`npx create-next-app@latest web --use-npm --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes`
</action>
<acceptance_criteria>
- `web/package.json` exists.
- `web/src/app/page.tsx` exists.
</acceptance_criteria>
</task>

<task id="01-04" autonomous="true">
<read_first>
- web/src/app/page.tsx
</read_first>
<action>
Create a basic chat UI in `web/src/app/page.tsx` that sends queries to `http://localhost:8000/chat`.
</action>
<acceptance_criteria>
- Chat UI allows input and displays responses.
</acceptance_criteria>
</task>
</tasks>
