---
phase: 02-data-foundation-secrets-management
plan: "01"
type: execute
wave: 1
depends_on: ["00"]
files_modified:
  - api/requirements.txt
  - api/core/secrets.py
  - .env.example
files_created:
  - api/core/config.py
autonomous: true
requirements:
  - "Implement GCP Secret Manager integration for API keys"

must_haves:
  truths:
    - "Sensitive credentials are not exposed in plaintext and are loaded dynamically at runtime"
    - "Development environment seamlessly falls back to local .env values without GCP connection"
  artifacts:
    - path: "api/requirements.txt"
      provides: "GCP dependencies"
    - path: "api/core/config.py"
      provides: "Pydantic based secret and config management"
  key_links:
    - "api/core/secrets.py relies on api/core/config.py for all configuration values"
---

<objective>
Establish the project's secure configuration layer using Pydantic Settings with GCP Secret Manager, replacing manual client usage.
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
    `google-cloud-secret-manager==2.27.0`
    `pydantic-settings==2.13.1`
    `python-dotenv>=1.0.0`
  </action>
  <verify>
    <automated>pytest tests/test_secrets.py</automated>
  </verify>
  <done>Configuration dependencies are listed in requirements.txt.</done>
</task>

<task type="auto">
  <name>Task 2: Create Pydantic Configuration with GCP Source</name>
  <files>
    api/core/config.py, .env.example
  </files>
  <action>
    Create `api/core/config.py`.
    Import `BaseSettings`, `PydanticBaseSettingsSource`, `SettingsConfigDict` from `pydantic_settings`.
    Import `secretmanager` from `google.cloud`.
    Create a `GCPSecretSource` class that inherits `PydanticBaseSettingsSource`. In `__call__`, check for `GOOGLE_CLOUD_PROJECT` env var. If present:
    ```python
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/SUPABASE_CONNECTION_STRING/versions/latest"
    try:
        response = client.access_secret_version(request={"name": name})
        val = response.payload.data.decode("UTF-8")
        return {"supabase_connection_string": val}
    except Exception:
        return {}
    ```
    If not present, return `{}`.
    Create `Settings` class inheriting from `BaseSettings` with fields `supabase_connection_string: str` and `google_cloud_project: str | None = None`.
    Implement `@classmethod def settings_customise_sources(...)` to include `GCPSecretSource`.
    Instantiate `settings = Settings()`.
    Append `SUPABASE_CONNECTION_STRING=` and `GOOGLE_CLOUD_PROJECT=` to `.env.example`.
  </action>
  <verify>
    <automated>pytest tests/test_secrets.py</automated>
  </verify>
  <done>Pydantic settings class and GCP custom source are implemented.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor secrets.py</name>
  <files>
    api/core/secrets.py, api/core/config.py
  </files>
  <action>
    Modify `api/core/secrets.py` to become a simple facade over the new Pydantic `settings`.
    Import `settings` from `api.core.config`.
    Keep the `SecretManager` class and `secrets` singleton to avoid breaking other files temporarily, but update `get_secret(secret_id)` to look up values directly from the `settings` object (e.g., mapping `SUPABASE_CONNECTION_STRING` to `settings.supabase_connection_string`).
  </action>
  <verify>
    <automated>pytest tests/test_secrets.py</automated>
  </verify>
  <done>secrets.py now utilizes the central Pydantic configuration.</done>
</task>

</tasks>

<verification>
- `pytest tests/test_secrets.py` passes completely.
</verification>