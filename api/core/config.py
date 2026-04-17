import os
from typing import Any

from google.cloud import secretmanager
from pydantic import Field
from pydantic.fields import FieldInfo
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)


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
            GCPSecretSource(settings_cls),
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()
