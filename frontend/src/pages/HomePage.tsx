import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import client from '../api/client'
import type { NewsItem, Announcement, DocumentItem } from '../types/content'

export default function HomePage() {
  const location = useLocation()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])

  useEffect(() => {
    client
      .get<NewsItem[]>('/news', { params: { status: 'published', limit: 3 } })
      .then((res) => setNewsItems(res.data.slice(0, 3)))
      .catch(() => setNewsItems([]))

    client
      .get<Announcement[]>('/announcements')
      .then((res) => setAnnouncements(res.data.slice(0, 5)))
      .catch(() => setAnnouncements([]))

    client
      .get<DocumentItem[]>('/documents')
      .then((res) => setDocuments(res.data.slice(0, 5)))
      .catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    if (location.pathname !== '/tanlovlar') return
    const section = document.getElementById('elonlar')
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.pathname, announcements])

  return (
    <>
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-text-content">
            <h1 className="hero-title">Yoshlar – xalqimizning asosiy tayanchi va suyanchi</h1>
            <p className="hero-quote">
              Yangi O'zbekistonning nafasi, sur'ati va shiddatini avvalo aziz o'g'il-qizlarimizning azmu
              shijoati, dadil fikr va takliflarida, erishayotgan dastlabki yutuqlarida ko'raman
            </p>
            <span className="hero-author">Shavkat Mirziyoyev</span>
            <div>
              <Link to="/login" className="btn-hero-login">
                <span>Kirish</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-shape-decorator"></div>
            <div className="hero-image-wrapper">
              <img src="/static/images/hero-students.png" alt="O'zMU Jizzax filiali iqtidorli yoshlari" />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section" id="haqida">
        <div className="container">
          <div className="about-content">
            <h2 className="about-title">
              Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi haqida umumiy ma'lumot
            </h2>
            <p className="about-desc">
              O'zbekiston Milliy universiteti Jizzax filiali iqtidorli talabalarning ilmiy-tadqiqot
              faoliyatini tashkil etish bo'limining asosiy vazifalari, funksiyalari, huquq va majburiyatlarini,
              shuningdek, uning faoliyatini tashkil etish tartibini belgilaydi.
            </p>
            <Link to="/talabalar-akademiyasi" className="btn-outline-more">
              <span>Batafsil</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* "IQTIDOR" TANLOVI RASMIY SECTION (NIZOM ASOSIDA) */}
      <section
        className="iqtidor-showcase-section"
        style={{
          padding: '60px 0',
          background: 'linear-gradient(180deg, #f8fafc 0%, #edf4fc 100%)',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div className="container">
          <div
            style={{
              background: 'linear-gradient(135deg, #072950 0%, #0b3b70 100%)',
              borderRadius: '24px',
              padding: '40px',
              color: '#ffffff',
              boxShadow: '0 16px 40px rgba(7, 41, 80, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '30px',
            }}
          >
            <div style={{ maxWidth: '680px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '16px',
                }}
              >
                <span>Filial Kengashi bayonnomasi bilan ma'qullangan</span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.25, marginBottom: '14px' }}>
                Mirzo Ulug'bek nomidagi O'zMU Jizzax filiali talabalari uchun{' '}
                <span style={{ color: '#34d399' }}>&ldquo;IQTIDOR&rdquo;</span> tanlovi
              </h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '22px' }}>
                Bakalavriat ta'lim yo'nalishlarida tahsil olayotgan iqtidorli talabalarni rag'batlantirish
                maqsadida 6 ta nominatsiya bo'yicha har o'quv yilida bir marotaba o'tkaziladi. G'oliblar
                bazaviy stipendiyaning <strong>10 baravarigacha</strong> moddiy rag'bat hamda rasmiy{' '}
                <strong>&ldquo;IQTIDORLI TALABA&rdquo; ko'krak nishoni</strong> bilan taqdirlanadi.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <Link
                  to="/dashboard#contests"
                  style={{
                    background: '#0070f3',
                    color: '#ffffff',
                    padding: '12px 28px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 112, 243, 0.35)',
                  }}
                >
                  <span>Tanlovga ariza berish</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <a
                  href="/static/docs/Iqtidor_tanlovi_nizomi.docx"
                  download
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '12px 22px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Nizomni yuklab olish (.docx)</span>
                </a>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                background: 'rgba(255,255,255,0.08)',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.15)',
                minWidth: '260px',
              }}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}
              >
                <img
                  src="/static/images/nizom_image1.png"
                  alt="Iqtidorli talaba ko'krak nishoni"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>&ldquo;IQTIDORLI TALABA&rdquo;</div>
              <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                Rasmiy ko'krak nishoni
              </div>
              <div
                style={{
                  marginTop: '14px',
                  fontSize: '11.5px',
                  color: '#cbd5e1',
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                  paddingTop: '10px',
                }}
              >
                Muddat: Har yili 1-martgacha qabul
              </div>
            </div>
          </div>

          {/* 6 ta Nominatsiyaning xulosasi */}
          <div
            style={{
              marginTop: '36px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;Innovator&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Tabiiy fanlar va texnologiya</div>
            </div>
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;Yangi avlod yaratuvchisi&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Axborot texnologiyalari va IT</div>
            </div>
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#fdf4ff',
                  color: '#a21caf',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;Zukko&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Aniq fanlar (Matematika)</div>
            </div>
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#fff7ed',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;Tamaddun&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Psixologiya fanlari</div>
            </div>
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;Iftixor&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Filologiya fanlari</div>
            </div>
            <div
              style={{
                background: '#ffffff',
                padding: '20px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <div style={{ fontWeight: 800, color: '#0b3b70', fontSize: '14px' }}>&ldquo;E'tirof&rdquo;</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Iqtisodiyot va turizm</div>
            </div>
          </div>
        </div>
      </section>

      {/* DOCUMENTS (HUJJATLAR) SECTION */}
      <section className="documents-section" id="hujjatlar">
        <div className="container">
          <h3 className="section-title-simple">Hujjatlar</h3>

          <div className="documents-list">
            {documents.map((doc) => (
              <div className="document-item-row" key={doc.id}>
                <div className="doc-left">
                  <span className="pdf-icon-badge">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    PDF
                  </span>
                  <span className="doc-title">{doc.title}</span>
                </div>
                <div className="doc-right">
                  <span className="doc-date">{doc.published_date}</span>
                  <a href={doc.file_url} download className="doc-download-btn" title="Yuklab olish">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST NEWS (SO'NGGI YANGILIKLAR) SECTION */}
      <section className="news-section" id="yangiliklar">
        <div className="container">
          <div className="section-header-row">
            <div className="section-header-title">
              <div className="title-bar-orange"></div>
              <h2 className="section-heading">So'nggi yangiliklar</h2>
            </div>
            <Link to="/matbuot-xizmati" className="section-all-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>Barcha yangiliklar</span>
            </Link>
          </div>

          <div className="news-grid-custom">
            {/* Big left card */}
            {newsItems.length > 0 && (
              <div className="news-card-big">
                <img src={newsItems[0].image_url ?? ''} alt={newsItems[0].title} className="news-big-img" />
                <div className="news-big-overlay">
                  <span className="news-badge-date">{newsItems[0].published_date}</span>
                  <h3 className="news-big-title">{newsItems[0].title}</h3>
                  <Link to={`/yangiliklar/${newsItems[0].id}`} className="btn-card-more">
                    Batafsil
                  </Link>
                </div>
              </div>
            )}

            {/* Right column cards: 2 smaller news */}
            <div className="news-right-column">
              {newsItems.length > 1 && (
                <div className="news-card-horizontal">
                  <img src={newsItems[1].image_url ?? ''} alt={newsItems[1].title} />
                  <div className="news-horiz-overlay">
                    <span className="news-badge-date">{newsItems[1].published_date}</span>
                    <h4 className="news-horiz-title">{newsItems[1].title}</h4>
                    <div>
                      <Link to={`/yangiliklar/${newsItems[1].id}`} className="btn-card-more">
                        Batafsil
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {newsItems.length > 2 && (
                <div className="news-card-horizontal">
                  <img src={newsItems[2].image_url ?? ''} alt={newsItems[2].title} />
                  <div className="news-horiz-overlay">
                    <span className="news-badge-date">{newsItems[2].published_date}</span>
                    <h4 className="news-horiz-title">{newsItems[2].title}</h4>
                    <div>
                      <Link to={`/yangiliklar/${newsItems[2].id}`} className="btn-card-more">
                        Batafsil
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENTS (E'LONLAR) SECTION */}
      <section className="announcements-section" id="elonlar">
        <div className="container">
          <div className="section-header-row">
            <h2 className="section-heading" style={{ color: '#0070f3' }}>E'lonlar</h2>
          </div>

          <div className="announcements-grid-layout">
            {/* Main announcement card (Big left) */}
            {announcements.length > 0 && (
              <div className="main-announce-card">
                <img src={announcements[0].image_url ?? ''} alt={announcements[0].title} />
                <div className="main-announce-body">
                  <h3 className="main-announce-title">{announcements[0].title}</h3>
                </div>
              </div>
            )}

            {/* 4 smaller announcement cards (Right grid) */}
            <div className="sub-announcements-grid">
              {announcements.slice(1, 5).map((item) => (
                <div className="sub-announce-card" key={item.id}>
                  <img src={item.image_url ?? ''} alt={item.title} />
                  <div className="sub-announce-body">
                    <h4 className="sub-announce-title">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="announcements-footer-link">
            <Link to="/matbuot-xizmati" className="btn-all-announcements">
              <span>Barcha e'lonlar</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
