import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../types/dashboard'

interface PageMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaginatedResource<T, R> {
  items: T[] | null
  response: R | null
  total: number
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  loading: boolean
  error: string | null
  reload: () => void
  setResponse: React.Dispatch<React.SetStateAction<R | null>>
}

/**
 * `loader` barqaror (useCallback bilan, `page`/`pageSize`ni argument sifatida qabul qiladi) bo'lishi kerak.
 * `selectItems` javobdan ro'yxat maydonini chiqarib oladi (masalan `r => r.items` yoki `r => r.achievements`).
 */
export function usePaginatedResource<T, R extends PageMeta>(
  loader: (page: number, pageSize: number) => Promise<R>,
  selectItems: (response: R) => T[],
  fallbackError: string,
  enabled = true,
  pageSize = 10
): PaginatedResource<T, R> {
  const [page, setPage] = useState(1)
  const [response, setResponse] = useState<R | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    loader(page, pageSize)
      .then((result) => setResponse(result))
      .catch((err) => setError(extractErrorMessage(err, fallbackError)))
      .finally(() => setLoading(false))
  }, [loader, fallbackError, page, pageSize])

  useEffect(() => {
    if (enabled) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page, pageSize, loader])

  useEffect(() => {
    if (response && page > response.total_pages) setPage(response.total_pages)
  }, [response, page])

  return {
    items: response ? selectItems(response) : null,
    response,
    total: response?.total ?? 0,
    page,
    pageSize,
    totalPages: response?.total_pages ?? 1,
    setPage,
    loading,
    error,
    reload,
    setResponse,
  }
}
