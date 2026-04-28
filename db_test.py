import os
import asyncio
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    supabase_connection_string: str = ""

async def main():
    s = Settings()
    url = s.supabase_connection_string or os.environ.get("SUPABASE_CONNECTION_STRING")
    if not url:
        print("NO URL")
        return
    url = url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM repositories;"))
        print("TOTAL REPOS:", res.scalar())
        res = await conn.execute(text("SELECT id, name FROM repositories;"))
        for row in res.fetchall():
            print("REPO:", row[0], row[1])

asyncio.run(main())
