import type { PaginatedResponse } from './pagination'

// app/models/notification.py / GET /notifications
export interface NotificationItem {
  id: number
  title: string
  body: string | null
  type: string
  is_read: boolean
  related_entity_type: string | null
  related_entity_id: number | null
  created_at: string
}

export interface NotificationListResponse extends PaginatedResponse<NotificationItem> {
  unread_count: number
}
