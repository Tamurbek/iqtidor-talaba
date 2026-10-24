import logging
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger("iqtidorli_redis")

_redis_client: Optional["redis.Redis"] = None


def get_redis() -> "redis.Redis":
    """Lazily-created async Redis client (connection is established on first command)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client
