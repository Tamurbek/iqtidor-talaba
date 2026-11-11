from typing import Tuple, TypeVar

from fastapi import Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

T = TypeVar("T")


class PageParams:
    """Shared `page`/`page_size` query params, injected via FastAPI `Depends`."""

    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    ):
        self.page = page
        self.page_size = page_size


def total_pages(total: int, page_size: int) -> int:
    return max(1, (total + page_size - 1) // page_size)


async def paginate_query(db: AsyncSession, query: Select, page: int, page_size: int) -> Tuple[list, int]:
    """Runs a COUNT query and a paginated SELECT for the given query, returns (rows, total)."""
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = (await db.execute(count_query)).scalar_one()

    paged_query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paged_query)
    return result, total


def paginate_sequence(items: list[T], page: int, page_size: int) -> Tuple[list[T], int]:
    """Paginates an already-fetched in-memory list (e.g. computed ranking)."""
    total = len(items)
    start = (page - 1) * page_size
    return items[start:start + page_size], total
