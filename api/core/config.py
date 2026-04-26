import os
import warnings
from typing import Any

from google.cloud import secretmanager
from pydantic import Field
from pydantic.fields import FieldInfo
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)


def _log_startup_config() -> None:
    """Log which config is in use at startup."""
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT_ID")
    source = "GOOGLE_CLOUD_PROJECT" if os.environ.get("GOOGLE_CLOUD_PROJECT") else "GCP_PROJECT_ID (deprecated)"
    print(f"[CONFIG] Using project: {project or 'NOT SET'} (source: {source})")


# Log startup config immediately when module is loaded
_log_startup_config()


def _check_deprecated_project_id() -> None:
    """Check for deprecated GCP_PROJECT_ID and emit warning."""
    if os.environ.get("GCP_PROJECT_ID") and not os.environ.get("GOOGLE_CLOUD_PROJECT"):
        warnings.warn(
            "GCP_PROJECT_ID is deprecated. Use GOOGLE_CLOUD_PROJECT instead.",
            DeprecationWarning,
            stacklevel=2
        )


_check_deprecated_project_id()


# Single source of truth for project ID - prefer GOOGLE_CLOUD_PROJECT over deprecated GCP_PROJECT_ID
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT_ID") or None


class GCPSecretSource(PydanticBaseSettingsSource):
    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        # Required by abstract base class; this source resolves all fields in __call__.
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")

        if not project_id:
            return {}

        try:
            client = secretmanager.SecretManagerServiceClient()
        except Exception:
            return {}

        name = f"projects/{project_id}/secrets/SUPABASE_CONNECTION_STRING/versions/latest"
        try:
            response = client.access_secret_version(request={"name": name})
            val = response.payload.data.decode("UTF-8")
            return {
                "supabase_connection_string": val,
                "google_cloud_project": project_id,
            }
        except Exception:
            return {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_connection_string: str = Field(default="", validation_alias="SUPABASE_CONNECTION_STRING")
    google_cloud_project: str | None = Field(default=None, validation_alias="GOOGLE_CLOUD_PROJECT")
    github_webhook_secret: str | None = Field(default=None, validation_alias="GITHUB_WEBHOOK_SECRET")
    env: str = Field(default="development", validation_alias="ENV")

    def __init__(self, **values):
        super().__init__(**values)

        # T-05-04: Reject empty project identity in production mode
        if self.env.lower() == "production" and not self.google_cloud_project:
            raise ValueError("GOOGLE_CLOUD_PROJECT must be set in production mode")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
            GCPSecretSource(settings_cls),
        )


settings = Settings()
