import { useState } from 'react'
import client from '../../api/client'
import type { Application } from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  onApplied: (application: Application) => void
}

interface Nomination {
  id: number
  name: string
  tagLabel: string
  tagColor: string
  title: string
  specialties: string[]
  recommended?: boolean
}

const NOMINATIONS: Nomination[] = [
  {
    id: 1,
    name: '“Innovator” nominatsiyasi (Tabiiy fanlar va texnologiya)',
    tagLabel: 'Tabiiy fanlar & Texnologiya',
    tagColor: '#059669',
    title: '“Innovator” nominatsiyasi',
    specialties: ['60710200 — Biotexnologiya', '60530600 — Mexanika va matematik modellashtirish', "60711900 — Barqaror transport"],
  },
  {
    id: 2,
    name: '“Yangi avlod yaratuvchisi” nominatsiyasi (IT va Axborot texnologiyalari)',
    tagLabel: 'Axborot texnologiyalari & IT',
    tagColor: '#0284c7',
    title: '“Yangi avlod yaratuvchisi” nominatsiyasi',
    specialties: ['60610100 — Axborot tizimlari va texnologiyalari', '60610200 — Axborot xavfsizligi', '60610400 — Dasturiy injiniring', "60610500 — Sun'iy intellekt"],
    recommended: true,
  },
  {
    id: 3,
    name: '“Zukko” nominatsiyasi (Aniq fanlar - Amaliy matematika)',
    tagLabel: 'Aniq fanlar',
    tagColor: '#b45309',
    title: '“Zukko” nominatsiyasi',
    specialties: ['60540200 — Amaliy matematika'],
  },
  {
    id: 4,
    name: '“Tamaddun” nominatsiyasi (Psixologiya fanlari)',
    tagLabel: 'Ijtimoiy-gumanitar fanlar',
    tagColor: '#7e22ce',
    title: '“Tamaddun” nominatsiyasi',
    specialties: ['60310300 — Psixologiya'],
  },
  {
    id: 5,
    name: '“Iftixor” nominatsiyasi (Filologiya fanlari)',
    tagLabel: 'Filologiya fanlari',
    tagColor: '#be185d',
    title: '“Iftixor” nominatsiyasi',
    specialties: ["60230100 — Filologiya va tillarni o'qitish"],
  },
  {
    id: 6,
    name: "“E’tirof” nominatsiyasi (Iqtisodiyot va turizm)",
    tagLabel: 'Iqtisodiyot & Turizm',
    tagColor: '#4338ca',
    title: "“E’tirof” nominatsiyasi",
    specialties: ["61010100 — Turizm va mexmondo'stlik", '60410100 — Iqtisodiyot'],
  },
]

export default function ContestsTab({ onApplied }: Props) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const applyForContest = async (nomination: Nomination) => {
    const confirmed = window.confirm(
      `Haqiqatan ham "Iqtidor" tanlovining "${nomination.name}" bo'yicha portfelingiz bilan 1-bosqich saralashiga ariza topshirmoqchimisiz?`
    )
    if (!confirmed) return

    setPendingId(nomination.id)
    setFeedback(null)
    try {
      const { data } = await client.post<Application>('/applications', {
        contest_name: nomination.name,
        contest_id: nomination.id,
      })
      setFeedback({ type: 'success', message: "Arizangiz muvaffaqiyatli qabul qilindi. 15-30 mart kunlari masofaviy test sinovlarida qatnashishingiz mumkin." })
      onApplied(data)
    } catch (err) {
      setFeedback({ type: 'error', message: extractErrorMessage(err, 'Ariza yuborishda xatolik yuz berdi') })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="student-tab-pane" id="student-tab-contests" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ background: '#eff6ff', color: '#0284c7', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Filial Kengashi qarori</span>
              <span style={{ color: '#059669', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#059669' }}></span>
                <span>Har 200 nafar talabaga 1 ta kvota</span>
              </span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="6" r="2"></circle>
                <line x1="12" y1="8" x2="12" y2="14"></line>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <span>"Iqtidor" tanlovi 6 ta rasmiy nominatsiyasi (Nizom 1-ilovasi)</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              Ta'lim yo'nalishingiz mutaxassislik klassifikatoriga mos nominatsiyani tanlang va shaxsiy portfelingiz bilan ariza yuboring.
            </p>
          </div>
          <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: 12, fontSize: 12.5, color: 'var(--text-table-header)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Hujjatlar qabuli: <strong>1-martgacha</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>1-bosqich (masofaviy test): <strong>15&ndash;30-mart</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              <span>2-yakuniy bosqich: <strong>15-maygacha</strong></span>
            </div>
          </div>
        </div>

        {feedback && (
          <div style={{ padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14, fontWeight: 500, background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'success' ? '#059669' : '#dc2626', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
            {feedback.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {NOMINATIONS.map((n) => (
            <div
              key={n.id}
              style={
                n.recommended
                  ? { border: '2px solid #0070f3', borderRadius: 16, padding: 22, background: '#f0f7ff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }
                  : { border: '1px solid var(--border-color)', borderRadius: 16, padding: 22, background: '#fafcff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }
              }
            >
              {n.recommended && (
                <div style={{ position: 'absolute', top: -12, right: 18, background: '#0070f3', color: '#ffffff', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 20, boxShadow: '0 4px 10px rgba(0,112,243,0.3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>Sizning yo'nalishingizga tavsiya etiladi</span>
                </div>
              )}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: `${n.tagColor}1a`, color: n.tagColor, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{n.tagLabel}</span>
                  <span style={{ fontSize: 11, color: n.recommended ? '#0070f3' : '#64748b', fontWeight: n.recommended ? 700 : 600 }}>{n.recommended ? 'Tavsiya etilgan' : 'Kvota mavjud'}</span>
                </div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)', marginTop: 10 }}>{n.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Biriktirilgan mutaxassisliklar:</p>
                <ul style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, paddingLeft: 18, lineHeight: 1.5 }}>
                  {n.specialties.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${n.recommended ? '#bfdbfe' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: n.recommended ? '#0070f3' : '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: n.recommended ? '#0070f3' : '#059669' }}></span>
                  <span>Qabul ochiq</span>
                </span>
                <button
                  onClick={() => applyForContest(n)}
                  disabled={pendingId === n.id}
                  style={
                    n.recommended
                      ? { background: '#0070f3', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: pendingId === n.id ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,112,243,0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: pendingId === n.id ? 0.7 : 1 }
                      : { background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: pendingId === n.id ? 'not-allowed' : 'pointer', opacity: pendingId === n.id ? 0.7 : 1 }
                  }
                >
                  <span>{pendingId === n.id ? 'Yuborilmoqda...' : 'Ariza topshirish'}</span>
                  {n.recommended && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
