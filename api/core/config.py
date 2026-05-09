import os

from pydantic import Field
from pydantic_settings import SettingsConfigDict, BaseSettings


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

    def __init__(self, **values):
        super().__init__(**values)
        if self.env.lower() == "production" and not self.supabase_connection_string:
            raise ValueError("SUPABASE_CONNECTION_STRING must be set in production mode")


settings = Settings()
