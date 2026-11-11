import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import client from '../api/client'
import type { NewsItem } from '../types/content'

export default function NewsDetailPage() {
  const { newsId } = useParams<{ newsId: string }>()
  const [news, setNews] = useState<NewsItem | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setNews(null)
    setNotFound(false)
    client
      .get<NewsItem>(`/news/${newsId}`)
      .then((res) => setNews(res.data))
      .catch(() => setNotFound(true))
  }, [newsId])

  if (notFound) {
    return (
      <div className="container" style={{ padding: '40px 20px 80px', maxWidth: 900 }}>
        <p>Yangilik topilmadi</p>
      </div>
    )
  }

  if (!news) {
    return null
  }

  return (
    <div className="container" style={{ padding: '40px 20px 80px', maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/#yangiliklar" style={{ color: 'var(--text-muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Barcha yangiliklarga qaytish</span>
        </a>
      </div>

      <article style={{ background: 'var(--bg-white)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: 36 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {news.category}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {news.published_date}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {news.views} marta o'qildi
          </span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.35, marginBottom: 24 }}>
          {news.title}
        </h1>

        {news.image_url && (
          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 28, maxHeight: 480 }}>
            <img src={news.image_url} alt={news.title} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {news.content}
        </div>
      </article>
    </div>
  )
}
