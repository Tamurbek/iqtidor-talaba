import { useEffect, useRef, useState } from 'react'
import client from '../../api/client'
import type { NewsItem } from '../../types/content'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  news: NewsItem[] | null
  loading: boolean
  error: string | null
  onReload: () => void
  onNewsDeleted: (id: number) => void
  showToast: ShowToast
}

const DEFAULT_IMAGE = '/static/images/news-1.png'
const DEFAULT_CATEGORY = 'Ilm-fan va tadqiqot'

const PRESETS = [
  { url: '/static/images/news-1.png', name: 'IT & Olimpiada', label: '1. IT & Olimpiada' },
  { url: '/static/images/news-2.png', name: 'Ilmiy seminar', label: '2. Ilmiy seminar' },
  { url: '/static/images/news-3.png', name: 'Stipendiya & Yutuq', label: '3. Stipendiya' },
]

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }
const thStyle: React.CSSProperties = { padding: '12px 18px' }
const tdStyle: React.CSSProperties = { padding: '12px 18px' }

export default function NewsTab({ news, loading, error, onReload, onNewsDeleted, showToast }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingStatus, setEditingStatus] = useState<string>('published')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [imageLabel, setImageLabel] = useState('Standart rasm tanlangan')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [busyRowId, setBusyRowId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    }
  }, [filePreview])

  const list = news ?? []
  const publishedCount = list.filter((n) => n.status === 'published').length
  const draftCount = list.filter((n) => n.status === 'draft').length

  const filteredList = list.filter((n) => {
    const q = search.toLowerCase().trim()
    const rowStatus = n.status || 'published'
    return (!q || n.title.toLowerCase().includes(q)) && (statusFilter === 'all' || rowStatus === statusFilter)
  })

  const currentImageSrc = filePreview || imageUrl

  const handleNewsImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast("Faqat rasm formatidagi fayllarni yuklash mumkin!", 'warning')
      return
    }
    setImageFile(file)
    setImageLabel(file.name)
    setFilePreview(URL.createObjectURL(file))
    setActivePreset(null)
  }

  const selectPresetNewsImage = (url: string, name: string) => {
    setImageFile(null)
    setFilePreview(null)
    setImageUrl(url)
    setImageLabel(name + ' tanlandi')
    setActivePreset(url)
  }

  const resetNewsFormToCreate = () => {
    setEditingId(null)
    setEditingStatus('published')
    setTitle('')
    setCategory(DEFAULT_CATEGORY)
    setImageUrl(DEFAULT_IMAGE)
    setContent('')
    setImageFile(null)
    setFilePreview(null)
    setImageLabel('Standart rasm tanlangan')
    setActivePreset(null)
  }

  const startEditNews = (n: NewsItem) => {
    setEditingId(n.id)
    setEditingStatus(n.status || 'published')
    setTitle(n.title)
    setCategory(n.category || DEFAULT_CATEGORY)
    setImageUrl(n.image_url || DEFAULT_IMAGE)
    setContent(n.content)
    setImageFile(null)
    setFilePreview(null)
    setImageLabel('Mavjud rasm tanlangan')
    setActivePreset(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const submitNewsWithStatus = async (status: 'draft' | 'published') => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle) {
      showToast('Yangilik sarlavhasini kiritish majburiy!', 'warning')
      return
    }
    if (!trimmedContent) {
      showToast("Yangilikning to'liq matnini kiritish majburiy!", 'warning')
      return
    }

    setSubmitting(true)
    try {
      let finalImageUrl = imageUrl || DEFAULT_IMAGE
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const { data: up } = await client.post<{ image_url: string }>('/news/upload-image', formData)
        finalImageUrl = up.image_url
      }

      const payload = { title: trimmedTitle, category: category || 'Yangiliklar', content: trimmedContent, image_url: finalImageUrl, status }
      if (editingId !== null) {
        await client.put<NewsItem>(`/news/${editingId}`, payload)
      } else {
        await client.post<NewsItem>('/news', payload)
      }

      const successTxt =
        status === 'published'
          ? editingId !== null
            ? 'Yangilik muvaffaqiyatli tahrirlandi va chop etildi!'
            : 'Yangilik muvaffaqiyatli chop etildi!'
          : 'Yangilik qoralama (draft) sifatida saqlandi!'
      showToast(successTxt, 'success')
      resetNewsFormToCreate()
      onReload()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Yangilikni saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleNewsStatus = async (n: NewsItem) => {
    const currentStatus = n.status || 'published'
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    const actionName = newStatus === 'published' ? 'saytda chop etishni' : "qoralamaga o'tkazishni (saytdan yashirishni)"
    if (!window.confirm(`Haqiqatan ham ushbu maqolani ${actionName} xohlaysizmi?`)) return

    setBusyRowId(n.id)
    try {
      await client.put<NewsItem>(`/news/${n.id}`, { status: newStatus })
      showToast(newStatus === 'published' ? 'Yangilik saytda chop etildi!' : 'Yangilik qoralamaga olindi!', 'success')
      onReload()
    } catch (err) {
      showToast(extractErrorMessage(err, "Holatni o'zgartirishda xatolik"), 'error')
    } finally {
      setBusyRowId(null)
    }
  }

  const deleteNewsItem = async (n: NewsItem) => {
    if (!window.confirm(`'${n.title}' yangiligini o'chirib tashlamoqchimisiz? Ushbu amal ortga qaytarilmaydi.`)) return

    setBusyRowId(n.id)
    try {
      await client.delete(`/news/${n.id}`)
      onNewsDeleted(n.id)
      if (editingId === n.id) resetNewsFormToCreate()
      showToast("Yangilik muvaffaqiyatli o'chirildi", 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, "O'chirishda xatolik yuz berdi"), 'error')
    } finally {
      setBusyRowId(null)
    }
  }

  const isEditing = editingId !== null
  const previewIsDraft = isEditing && editingStatus === 'draft'
  const previewTitle = title || "Filial iqtidorli talabalari xalqaro IT olimpiadasida g'olib bo'ldi"
  const previewCat = category || DEFAULT_CATEGORY
  const rawText = content || "Tadbir tafsilotlari, erishilgan ilmiy natijalar va iqtidorli talabalar haqida to'liq matn..."
  const previewText = rawText.length > 130 ? rawText.substring(0, 130) + '...' : rawText

  return (
    <div id="tab-content-add-news" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Yangiliklar va Matbuot xizmati boshqaruvi</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '3px 0 0' }}>Maqolalarni tahrirlash, rasm biriktirish, qoralama (draft) holatida saqlash yoki saytda darhol chop etish</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: '#eff6ff', color: '#0284c7', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            Jami: <span id="newsTotalCount">{list.length}</span> ta
          </span>
          <span style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            Chop etilgan: {publishedCount} ta
          </span>
          <span style={{ background: 'var(--bg-white)7ed', color: '#ea580c', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            Qoralamalar: {draftCount} ta
          </span>
        </div>
      </div>

      <div className="admin-form-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 26, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }} id="newsFormModeTitle">
                  {isEditing ? `Yangilikni tahrirlash (#${editingId})` : 'Yangi yangilik chop etish'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '2px 0 0' }} id="newsFormModeDesc">
                  {isEditing ? "Maqola matni, toifasi yoki rasmini o'zgartiring va saqlang" : "Bosh sahifa va Matbuot xizmati sahifasida e'lon qilish uchun maqola tayyorlash"}
                </p>
              </div>
            </div>
            {isEditing && (
              <button type="button" id="btnCancelNewsEdit" onClick={resetNewsFormToCreate} style={{ display: 'inline-block', background: 'var(--border-light)', color: 'var(--text-table-header)', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Tahrirlashni bekor qilish
              </button>
            )}
          </div>

          <form id="adminNewsForm" ref={formRef} onSubmit={(e) => e.preventDefault()} style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="newsTitle" style={labelStyle}>Yangilik sarlavhasi *</label>
              <input type="text" id="newsTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Filial iqtidorli talabalari xalqaro IT olimpiadasida g'olib bo'ldi" required style={{ width: '100%', padding: '11px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontWeight: 600 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label htmlFor="newsCategory" style={labelStyle}>Toifasi *</label>
                <select id="newsCategory" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: 'var(--bg-white)' }}>
                  <option value="Ilm-fan va tadqiqot">Ilm-fan va tadqiqot</option>
                  <option value="Iqtidorli talabalar">Iqtidorli talabalar yutuqlari</option>
                  <option value="Tanlovlar va grantlar">Tanlovlar va grantlar</option>
                  <option value="Ma'naviyat va ma'rifat">Ma'naviyat va ma'rifat</option>
                  <option value="Xalqaro hamkorlik">Xalqaro hamkorlik</option>
                </select>
              </div>
              <div>
                <label htmlFor="newsDate" style={labelStyle}>E'lon qilinuvchi sana</label>
                <input type="text" id="newsDate" value="Bugun, 05-oktabr 2026" readOnly style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, background: 'var(--bg-light)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="newsImageFileInput" style={labelStyle}>Yangilik muqova rasmi *</label>
              <input type="file" id="newsImageFileInput" ref={fileInputRef} accept="image/png, image/jpeg, image/webp" onChange={handleNewsImageFileSelect} style={{ display: 'none' }} />

              <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '12px 16px', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'var(--border-color)', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                    <img id="newsThumbPreview" src={currentImageSrc} alt="Rasm" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }} id="newsImageNameLabel">{imageLabel}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WEBP (maks. 5MB)</div>
                  </div>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-white)', border: '1px solid var(--primary-color)', color: 'var(--text-heading)', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Fayl tanlash</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>Tayyor namunalar:</span>
                {PRESETS.map((p) => {
                  const active = activePreset === p.url
                  return (
                    <button
                      key={p.url}
                      type="button"
                      className="news-preset-chip"
                      aria-pressed={active}
                      onClick={() => selectPresetNewsImage(p.url, p.name)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${active ? '#0b3b70' : '#cbd5e1'}`, background: active ? '#eff6ff' : '#ffffff', fontSize: 11.5, cursor: 'pointer', fontWeight: 600, color: active ? '#0b3b70' : '#334155' }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="newsContent" style={labelStyle}>Yangilikning to'liq matni *</label>
              <textarea id="newsContent" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tadbir tafsilotlari, erishilgan ilmiy natijalar va iqtidorli talabalar haqida to'liq matn..." required style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, lineHeight: 1.6, resize: 'vertical' }}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 18, flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }} id="newsActionHint">Saytda darhol e'lon qilish yoki qoralama qilishni tanlang</span>
              <div style={{ display: 'inline-flex', gap: 10 }}>
                <button type="button" id="btnNewsDraft" disabled={submitting} onClick={() => submitNewsWithStatus('draft')} style={{ background: 'var(--bg-white)', color: '#ea580c', border: '1px solid #fdba74', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Qoralama (Draft)</span>
                </button>
                <button type="button" id="btnNewsPublish" disabled={submitting} onClick={() => submitNewsWithStatus('published')} style={{ background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(11, 59, 112, 0.25)', transition: 'all 0.2s' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  <span id="btnPublishText">{isEditing ? "O'zgarishlarni saqlash" : 'Saytda chop etish'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '14px 18px', background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-table-header)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Saytdagi jonli ko'rinishi</span>
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Jonli preview</span>
            </div>
            <div style={{ height: 160, position: 'relative', background: '#072950', overflow: 'hidden' }}>
              <img id="previewNewsImg" src={currentImageSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
              <span style={{ position: 'absolute', bottom: 10, right: 12, background: 'rgba(0,0,0,0.65)', color: '#ffffff', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 }} id="previewCategoryBadge">{previewCat}</span>
              <span style={{ position: 'absolute', top: 10, left: 12, background: previewIsDraft ? '#fff7ed' : '#ecfdf5', color: previewIsDraft ? '#ea580c' : '#059669', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }} id="previewStatusBadge">
                {previewIsDraft ? 'Qoralama (Draft)' : 'Chop etiladi'}
              </span>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginBottom: 6 }}>05-oktabr 2026 | Matbuot xizmati</div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.4, margin: '0 0 8px' }} id="previewNewsTitle">
                {previewTitle}
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }} id="previewNewsText">
                {previewText}
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18 }}>
            <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f2721c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Chop etish va Qoralama tartibi</span>
            </h4>
            <ul style={{ fontSize: 12, color: 'var(--text-table-header)', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li><strong>Qoralama (Draft):</strong> Saytda ko'rinmaydi. Keyinroq tahrirlab, to'ldirib chop etish uchun saqlanadi.</li>
              <li><strong>Saytda chop etish:</strong> Bir zumda saytning Bosh sahifasi va Matbuot xizmatida barcha tashrif buyuruvchilarga ko'rinadi.</li>
              <li><strong>Muqova rasmi:</strong> Maqola mazmuniga mos sifatli rasm (kamida 800x500px) yuklash tavsiya etiladi.</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, marginTop: 24, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Mavjud maqolalar va qoralamalar ro'yxati</h3>
            <span style={{ background: '#eff6ff', color: '#0284c7', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{list.length} ta</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" id="adminNewsSearchInput" aria-label="Yangilik nomi bo'yicha qidiruv" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Yangilik nomi bo'yicha..." style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, width: 200 }} />
            <select id="adminNewsStatusFilter" aria-label="Holat bo'yicha filtr" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'var(--bg-white)' }}>
              <option value="all">Barcha holatlar</option>
              <option value="published">Faqat chop etilganlar</option>
              <option value="draft">Faqat qoralamalar (Draft)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }} id="adminNewsTable">
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 700 }}>
                <th style={thStyle}>Muqova</th>
                <th style={thStyle}>Sarlavha va Toifa</th>
                <th style={thStyle}>Sana</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Holati</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Ko'rishlar</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} role="alert" style={{ padding: 30, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>
                    Hozircha hech qanday yangilik kiritilmagan.
                  </td>
                </tr>
              ) : (
                filteredList.map((n) => {
                  const isDraft = n.status === 'draft'
                  return (
                    <tr key={n.id} id={`news-row-${n.id}`} data-status={n.status || 'published'} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}>
                      <td style={tdStyle}>
                        <img src={n.image_url || DEFAULT_IMAGE} alt={n.title} id={`news-row-img-${n.id}`} style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 320 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }} className="news-item-title" id={`news-row-title-${n.id}`}>{n.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }} id={`news-row-cat-${n.id}`}>{n.category}</div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12.5 }}>{n.published_date}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }} id={`news-status-cell-${n.id}`}>
                        {isDraft ? (
                          <span style={{ background: 'var(--bg-white)7ed', color: '#ea580c', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>Qoralama (Draft)</span>
                          </span>
                        ) : (
                          <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Chop etilgan</span>
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {n.views}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" onClick={() => startEditNews(n)} title="Tahrirlash" style={{ background: 'var(--border-light)', color: 'var(--text-heading)', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Tahrirlash</span>
                          </button>
                          <button type="button" disabled={busyRowId === n.id} onClick={() => toggleNewsStatus(n)} id={`btn-toggle-news-${n.id}`} title="Holatini o'zgartirish" style={{ background: isDraft ? '#0b3b70' : '#ffffff', color: isDraft ? '#ffffff' : '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            {isDraft ? 'Chop etish' : 'Qoralamaga'}
                          </button>
                          <button type="button" disabled={busyRowId === n.id} onClick={() => deleteNewsItem(n)} title="O'chirish" aria-label={`'${n.title}' yangiligini o'chirish`} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
