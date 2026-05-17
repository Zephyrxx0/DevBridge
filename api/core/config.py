import os

from pydantic import Field
from pydantic_settings import SettingsConfigDict, BaseSettings

from api.db.session import normalize_sync_url


BIG_MODEL_PORT=8000
FAST_MODEL_PORT=8001
FAST_MODEL_TIMEOUT=30
BIG_MODEL_TIMEOUT=120


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_connection_string: str = Field(default="", validation_alias="SUPABASE_CONNECTION_STRING")
    github_webhook_secret: str | None = Field(default=None, validation_alias="GITHUB_WEBHOOK_SECRET")
    env: str = Field(default="development", validation_alias="ENV")
    embedding_model: str = Field(default="text-embedding-004", validation_alias="EMBEDDING_MODEL")
    google_cloud_project: str | None = Field(default=None, validation_alias="GOOGLE_CLOUD_PROJECT")
    max_context_tokens: int = Field(default=48000, validation_alias="MAX_CONTEXT_TOKENS")
    big_model_port: int = Field(default=BIG_MODEL_PORT, validation_alias="BIG_MODEL_PORT")
    fast_model_port: int = Field(default=FAST_MODEL_PORT, validation_alias="FAST_MODEL_PORT")
    fast_model_timeout: int = Field(default=FAST_MODEL_TIMEOUT, validation_alias="FAST_MODEL_TIMEOUT")
    big_model_timeout: int = Field(default=BIG_MODEL_TIMEOUT, validation_alias="BIG_MODEL_TIMEOUT")
    repo_cache_dir: str = Field(default="/app/repo_cache", validation_alias="REPO_CACHE_DIR")
    reports_dir: str = Field(default="/app/reports", validation_alias="REPORTS_DIR")
    gcs_bucket_name: str | None = Field(default=None, validation_alias="GCS_BUCKET_NAME")
    external_doc_urls: str = Field(default="", validation_alias="EXTERNAL_DOC_URLS")
    internal_auth_token: str | None = Field(default=None, validation_alias="INTERNAL_AUTH_TOKEN")
    report_summary_model: str = Field(default="gemma-4-9b-it", validation_alias="REPORT_SUMMARY_MODEL")
    gemini_api_key: str | None = Field(default=None, validation_alias="GEMINI_API_KEY")

    def __init__(self, **values):
        super().__init__(**values)
        if self.env.lower() == "production" and not self.supabase_connection_string:
            raise ValueError("SUPABASE_CONNECTION_STRING must be set in production mode")

    @property
    def sync_supabase_connection_string(self) -> str:
        if not self.supabase_connection_string:
            return ""
        return normalize_sync_url(self.supabase_connection_string)

    @property
    def external_doc_urls_list(self) -> list[str]:
        raw = self.external_doc_urls.strip()
        if not raw:
            return []
        return [item.strip() for item in raw.split(",") if item.strip()]


settings = Settings()
