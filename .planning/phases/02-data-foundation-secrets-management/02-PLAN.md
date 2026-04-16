---
phase: 01-project-skeleton-core-orchestrator
plan: "02"
type: execute
wave: 1
depends_on: []
files_modified:
  - web/package.json
  - web/components/ui/button.tsx
  - web/components/ui/card.tsx
  - web/components/ui/theme-toggle.tsx
  - web/styles/theme.css
  - web/app/layout.tsx
  - api/agents/orchestrator.py
  - .env.example
autonomous: true
requirements: []

must_haves:
  truths:
    - "Frontend uses shadcn/ui components with modern theming"
    - "Dark and light mode toggle functional and persistent"
    - "Backend starts without GCP credentials in development mode"
    - "Chat interface displays with minimal/pretty/cool theme applied"
  artifacts:
    - path: "web/styles/theme.css"
      provides: "Shadcn CSS variables for dark/light themes"
      min_lines: 20
    - path: "web/components/ui/theme-toggle.tsx"
      provides: "Theme toggle component"
      exports: ["ThemeToggle"]
    - path: "api/agents/orchestrator.py"
      provides: "LLM initialization with mock fallback"
      contains: "ChatVertexAI"
    - path: ".env.example"
      provides: "Example environment variables including GCP fields"
      contains: "GCP_PROJECT_ID"
  key_links:
    - from: "web/app/layout.tsx"
      to: "web/styles/theme.css"
      via: "import '../styles/theme.css'"
      pattern: "import.*theme\.css"
    - from: "web/components/ui/theme-toggle.tsx"
      to: "web/styles/theme.css"
      via: "uses theme variables"
      pattern: "className.*dark"
    - from: "api/agents/orchestrator.py"
      to: ".env.example"
      via: "reads GCP credentials"
      pattern: "process\\.env\\.GCP_"
---

<objective>
Fix UAT gaps: Integrate shadcn/ui for modern UI components, implement theming system with dark/light toggle, apply refined UI using design skills, and fix backend GCP credential initialization issue with lazy loading and mock fallback.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-project-skeleton-core-orchestrator/01-PLAN.md
@.planning/phases/01-project-skeleton-core-orchestrator/01-SUMMARY.md
# Existing implementation context
@api/main.py
@api/agents/orchestrator.py
@web/src/app/page.tsx
@web/src/app/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: UI/UX Overhaul - Integrate shadcn/ui and implement theming</name>
  <files>web/package.json, web/components/ui/button.tsx, web/components/ui/card.tsx, web/components/ui/theme-toggle.tsx, web/styles/theme.css, web/app/layout.tsx</files>
  <action>
    1. Install shadcn/ui dependencies via MCP: run npx shadcn-ui@latest init (or equivalent) to set up shadcn/ui in web/
    2. Add button and card components: npx shadcn-ui@latest add button card
    3. Create theme.css using shadcn variables for dark/light mode theming (based on shadcn docs)
    4. Create theme-toggle.tsx component that toggles between dark and light modes, stores preference in localStorage
    5. Update layout.tsx to import theme.css and use ThemeToggle component
    6. Apply frontend-design and ui-ux-pro-max skills to refine UI: adjust spacing, typography, and component usage for minimal/pretty/cool aesthetic
    7. Ensure all new components are properly exported and typed
  </action>
  <verify>
    <automated>cd web && npm run build --if-present && echo "Frontend build successful"</automated>
  </verify>
  <done>Shadcn/ui components integrated, theme system functional, UI refined with modern aesthetics</done>
</task>

<task type="auto">
  <name>Task 2: Backend Fix - Lazy LLM initialization with mock fallback</name>
  <files>api/agents/orchestrator.py, .env.example</files>
  <action>
    1. Modify api/agents/orchestrator.py to lazy-load ChatVertexAI only when needed
    2. Implement mock fallback that returns a simple response when GCP credentials are missing
    3. Add checks for required GCP environment variables (GCP_PROJECT_ID, etc.)
    4. Update .env.example with all required GCP fields and example values
    5. Ensure orchestrator.chat() works in both mock and real modes
    6. Keep existing tool (code_search) functionality intact
  </action>
  <verify>
    <automated>cd api && python -c "from agents.orchestrator import Orchestrator; print('Orchestrator imports OK')"</automated>
  </verify>
  <done>Backend starts without GCP credentials, uses mock mode, and functions with credentials when provided</done>
</task>

</tasks>

<verification>
- Frontend builds and serves without errors
- Backend starts and responds to health check without GCP credentials
- Theme toggle persists mode across reloads
- Chat interface uses shadcn/ui components
</verification>

<success_criteria>
- Frontend accessible at http://localhost:3000 with modern themed UI
- Backend accessible at http://localhost:8000/ with status online
- Chat endpoint works in both mock and real modes
- Dark/light mode toggle functional
</success_criteria>

<output>
After completion, create .planning/phases/01-project-skeleton-core-orchestrator/02-SUMMARY.md
</output>