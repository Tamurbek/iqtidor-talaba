import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../types/dashboard'

export interface ApiResource<T> {
  data: T | null
  setData: React.Dispatch<React.SetStateAction<T | null>>
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * `loader` barqaror (modul darajasida yoki useCallback bilan) bo'lishi kerak.
 */
export function useApiResource<T>(loader: () => Promise<T>, fallbackError: string, enabled = true): ApiResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    loader()
      .then((result) => setData(result))
      .catch((err) => setError(extractErrorMessage(err, fallbackError)))
      .finally(() => setLoading(false))
  }, [loader, fallbackError])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  return { data, setData, loading, error, reload }
}
