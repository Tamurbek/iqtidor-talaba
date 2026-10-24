import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sidebar_collapsed'

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return [collapsed, setCollapsed] as const
}
