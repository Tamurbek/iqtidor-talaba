import type { PaginatedResponse } from './pagination'

export interface NewsItem {
  id: number
  title: string
  slug?: string | null
  summary?: string | null
  content: string
  image_url?: string | null
  published_date: string
  category?: string | null
  status?: string | null
  is_featured?: boolean | null
  views: number
}

export interface Announcement {
  id: number
  title: string
  description?: string | null
  category?: string | null
  image_url?: string | null
  deadline?: string | null
  prize?: string | null
  is_active?: boolean | null
  is_main?: boolean | null
}

export interface DocumentItem {
  id: number
  title: string
  file_url: string
  file_format?: string | null
  file_size?: string | null
  published_date?: string | null
  download_count: number
}

export interface NewsListResponse extends PaginatedResponse<NewsItem> {}
export interface DocumentListResponse extends PaginatedResponse<DocumentItem> {}
