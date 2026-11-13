import { useCallback, useEffect, useRef, useState } from 'react'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/client'
import type { NotificationItem } from '../../types/notification'

const POLL_INTERVAL_MS = 60_000

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'hozirgina'
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(hours / 24)
  return `${days} kun oldin`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getNotifications(1, 10)
      setItems(data.items)
      setUnreadCount(data.unread_count)
    } catch {
      // Bildirishnomalar yuklanmasa indikator jim o'tkazib yuboriladi.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleItemClick = async (item: NotificationItem) => {
    if (item.is_read) return
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await markNotificationRead(item.id)
    } catch {
      load()
    }
  }

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      load()
    }
  }

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirishnomalar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-bell-panel">
          <div className="notification-bell-panel-header">
            <span>Bildirishnomalar</span>
            {unreadCount > 0 && (
              <button type="button" className="notification-bell-mark-all" onClick={handleMarkAllRead}>
                Barchasini o'qilgan belgilash
              </button>
            )}
          </div>

          <div className="notification-bell-list">
            {loading && items.length === 0 && (
              <div className="notification-bell-empty">Yuklanmoqda...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="notification-bell-empty">Hozircha bildirishnomalar yo'q</div>
            )}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notification-bell-item${item.is_read ? '' : ' unread'}`}
                onClick={() => handleItemClick(item)}
              >
                <span className="notification-bell-item-title">{item.title}</span>
                {item.body && <span className="notification-bell-item-body">{item.body}</span>}
                <span className="notification-bell-item-time">{formatRelativeTime(item.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
