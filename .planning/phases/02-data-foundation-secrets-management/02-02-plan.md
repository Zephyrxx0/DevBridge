---
phase: 02-data-foundation-secrets-management
plan: "02"
type: execute
wave: 2
depends_on: ["01"]
files_modified:
  - api/requirements.txt
  - api/main.py
files_created:
  - api/db/session.py
autonomous: true
requirements:
  - "Configure Supabase pgvector extension"

must_haves:
  truths:
    - "Application backend safely connects to the vector database infrastructure"
  artifacts:
    - path: "api/db/session.py"
      provides: "Database SQLAlchemy AsyncEngine management"
  key_links:
    - "api/main.py lifespan context manages the AsyncEngine lifecycle defined in api/db/session.py"
---

<objective>
Establish efficient database connection pooling using SQLAlchemy AsyncEngine, managed safely by the FastAPI app lifespan.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/phases/02-data-foundation-secrets-management/02-CONTEXT.md
@.planning/phases/02-data-foundation-secrets-management/02-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Dependencies</name>
  <files>
    api/requirements.txt
  </files>
  <action>
    Append the following lines to `api/requirements.txt`:
    `langchain-postgres==0.0.17`
    `psycopg[binary]==3.3.3`
    `sqlalchemy>=2.0.0`
  </action>
  <verify>
    <automated>pytest tests/test_vector_db.py</automated>
  </verify>
  <done>Database dependencies are listed in requirements.txt.</done>
</task>

<task type="auto">
  <name>Task 2: Setup Database AsyncEngine</name>
  <files>
    api/db/session.py
  </files>
  <action>
    Create `api/db/session.py`.
    Import `create_async_engine` from `sqlalchemy.ext.asyncio`.
    Create a global `engine = None` variable.
    Create `async def init_db_pool(connection_string: str):` that initializes the `engine` using `create_async_engine(connection_string, pool_size=10)`. Make sure to replace `postgresql://` with `postgresql+psycopg://` and append `?sslmode=require` if it's a Supabase connection string.
    Create `async def close_db_pool():` to dispose the engine via `await engine.dispose()`.
    Create `def get_engine():` returning the global engine.
  </action>
  <verify>
    <automated>pytest tests/test_vector_db.py</automated>
  </verify>
  <done>AsyncEngine is created.</done>
</task>

<task type="auto">
  <name>Task 3: FastAPI Lifespan Connection Pooling</name>
  <files>
    api/main.py, api/db/session.py, api/core/config.py
  </files>
  <action>
    Edit `api/main.py` to use a FastAPI `lifespan` context manager.
    Import `asynccontextmanager` from `contextlib`.
    Import `settings` from `api.core.config`.
    Import `init_db_pool` and `close_db_pool` from `api.db.session`.
    Implement:
    ```python
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.supabase_connection_string:
            await init_db_pool(settings.supabase_connection_string)
        yield
        await close_db_pool()
    ```
    Pass `lifespan=lifespan` when creating the `FastAPI` app instance (`app = FastAPI(title="DevBridge API", lifespan=lifespan)`).
  </action>
  <verify>
    <automated>pytest tests/test_vector_db.py</automated>
  </verify>
  <done>FastAPI uses lifespan context for connection pool management.</done>
</task>

</tasks>

<verification>
- `pytest tests/test_vector_db.py` runs without errors.
</verification>