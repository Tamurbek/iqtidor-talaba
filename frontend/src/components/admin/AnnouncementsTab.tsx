import { useState } from 'react'
import client from '../../api/client'
import type { Announcement } from '../../types/content'
import { extractErrorMessage } from '../../types/dashboard'

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, background: 'var(--bg-white)', color: 'var(--text-dark)' }

const DEFAULT_CATEGORY = 'Davlat stipendiyasi'

export default function AnnouncementsTab() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [deadline, setDeadline] = useState('')
  const [prize, setPrize] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleNewContest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)
    try {
      await client.post<Announcement>('/announcements', {
        title,
        category,
        deadline,
        prize,
        description: desc,
      })
      setMsg({ type: 'success', text: "Yangi tanlov e'loni muvaffaqiyatli saqlandi va saytda aks etdi!" })
      setTitle('')
      setCategory(DEFAULT_CATEGORY)
      setDeadline('')
      setPrize('')
      setDesc('')
    } catch (err) {
      setMsg({ type: 'error', text: extractErrorMessage(err, 'Saqlashda xatolik') })
    } finally {
      setSubmitting(false)
    }
  }

  const previewTitle = title || "Yil talabasi - 2026 respublika ko'rik-tanlovi"
  const previewCat = category || DEFAULT_CATEGORY
  const previewDeadline = deadline || '30.11.2026'
  const previewPrize = prize || "30 000 000 so'm"
  const rawText = desc || "Tanlov shartlari va tavsifi bu yerda ko'rinadi..."
  const previewText = rawText.length > 110 ? rawText.substring(0, 110) + '...' : rawText

  return (
    <div id="tab-content-add-announcement" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div className="admin-form-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Yangi tanlov yoki stipendiya e'loni</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>Bosh sahifadagi E'lonlar va Shaxsiy kabinetdagi tanlovlar bo'limiga qo'shish</p>
            </div>
          </div>

          {msg && (
            <div id="contestMsg" role={msg.type === 'error' ? 'alert' : 'status'} style={{ display: 'block', padding: 12, borderRadius: 8, margin: '16px 0', fontSize: 13, background: msg.type === 'success' ? 'var(--badge-success-bg)' : 'var(--badge-danger-bg)', color: msg.type === 'success' ? 'var(--badge-success-text)' : 'var(--badge-danger-text)' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleNewContest} style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="contestTitle" style={labelStyle}>Tanlov sarlavhasi *</label>
              <input type="text" id="contestTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Yil talabasi - 2026 respublika ko'rik-tanlovi" required style={{ ...inputStyle, fontWeight: 600 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label htmlFor="contestCategory" style={labelStyle}>Toifasi *</label>
                <select id="contestCategory" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, fontSize: 13.5, fontWeight: 600, background: 'var(--bg-white)' }}>
                  <option value="Davlat stipendiyasi">Davlat stipendiyasi</option>
                  <option value="Respublika tanlovi">Respublika tanlovi</option>
                  <option value="Xalqaro grant">Xalqaro grant</option>
                  <option value="Filial ichki tanlovi">Filial ichki tanlovi</option>
                </select>
              </div>
              <div>
                <label htmlFor="contestDeadline" style={labelStyle}>Ariza topshirish muddati *</label>
                <input type="text" id="contestDeadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Masalan: 30.11.2026" required style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="contestPrize" style={labelStyle}>Sovrin jamg'armasi yoki rag'batlantirish</label>
              <input type="text" id="contestPrize" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Masalan: Bazaviy stipendiyaning 10 baravari yoki maxsus diplom" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label htmlFor="contestDesc" style={labelStyle}>Batafsil shartlar va mezonlar</label>
              <textarea id="contestDesc" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Tanlov ishtirokchilariga qo'yiladigan talablar, zaruriy ilmiy ishlar va bosqichlar haqida..." style={{ ...inputStyle, lineHeight: 1.6, resize: 'vertical' }}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 18 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Talabalar kabinetida darhol aks etadi</span>
              <button type="submit" id="btnContestSubmit" disabled={submitting} style={{ background: '#f2721c', color: '#ffffff', border: 'none', padding: '12px 30px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(242, 114, 28, 0.25)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <span>E'lonni saytga joylash</span>
              </button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }} id="previewContestCatBadge">{previewCat}</span>
              <span style={{ fontSize: 11.5, color: 'var(--badge-warning-text)', fontWeight: 700 }} id="previewContestDeadline">Muddati: {previewDeadline}</span>
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.4, margin: '0 0 10px' }} id="previewContestTitle">
              {previewTitle}
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px' }} id="previewContestText">
              {previewText}
            </p>
            <div style={{ background: 'var(--bg-light)', border: '1px dashed var(--border-color)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sovrin:</span>
              <strong style={{ fontSize: 13, color: 'var(--badge-success-text)' }} id="previewContestPrize">{previewPrize}</strong>
            </div>
          </div>

          <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 10px' }}>Nizom talablari:</h4>
            <ul style={{ fontSize: 12.5, color: 'var(--text-table-header)', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li>Stipendiya va tanlov arizalari talabalar tomonidan shaxsiy kabinet orqali topshiriladi.</li>
              <li>Ariza topshirish uchun 1-bosqich imtihonidan kamida 24 ball to'plangan bo'lishi shart.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
