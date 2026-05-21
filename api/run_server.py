import asyncio
import os
import sys

import uvicorn


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
    reload_enabled = os.getenv("API_RELOAD", "1").strip().lower() not in {"0", "false", "no"}
    uvicorn.run("api.main:app", host=host, port=port, reload=reload_enabled)


if __name__ == "__main__":
    main()
