import asyncio
from api.db.session import init_db_pool
from api.routes.repo import list_repository_files
from api.core.config import settings
import os

async def main():
    url = settings.supabase_connection_string or os.environ.get("SUPABASE_CONNECTION_STRING")
    if url:
        url = url.replace("postgresql://", "postgresql+asyncpg://")
        await init_db_pool(url)
    res = await list_repository_files("813710b4-420b-4141-aacd-eaf31b6911c8")
    print(res)

asyncio.run(main())
