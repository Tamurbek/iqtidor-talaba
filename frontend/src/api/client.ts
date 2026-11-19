import axios from 'axios'
import type { NotificationListResponse } from '../types/notification'
import { BASE_PATH } from '../utils/basePath'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${BASE_PATH}/api/v1`,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('iqtidor_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('iqtidor_access_token')) {
      localStorage.removeItem('iqtidor_access_token')
      localStorage.removeItem('iqtidor_current_user')
      localStorage.removeItem('iqtidor_active_role')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default client

// Nizom 23.6, 23.8-modda: bildirishnoma (notification) chaqiruvlari.
export const getNotifications = (page = 1, pageSize = 10) =>
  client.get<NotificationListResponse>('/notifications', { params: { page, page_size: pageSize } })

export const markNotificationRead = (id: number) =>
  client.patch<{ success: boolean }>(`/notifications/${id}/read`)

export const markAllNotificationsRead = () =>
  client.patch<{ success: boolean }>('/notifications/read-all')
