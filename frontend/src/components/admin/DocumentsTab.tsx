import { useRef, useState } from 'react'
import client from '../../api/client'
import type { DocumentItem } from '../../types/content'
import type { DocumentUploadResponse } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import Pagination from '../common/Pagination'

interface Props {
  documents: DocumentItem[] | null
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onReload: () => void
  onDocumentDeleted: (id: number) => void
  showToast: ShowToast
}

const MAX_DOC_SIZE = 15 * 1024 * 1024

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }
const thStyle: React.CSSProperties = { padding: '12px 18px' }
const tdStyle: React.CSSProperties = { padding: '12px 18px' }

export default function DocumentsTab({ documents, loading, error, page, totalPages, total, pageSize, onPageChange, onReload, onDocumentDeleted, showToast }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileLabel, setFileLabel] = useState('Fayl tanlanmagan')
  const [submitting, setSubmitting] = useState(false)
  const [busyRowId, setBusyRowId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const list = documents ?? []
  const isEditing = editingId !== null

  const handleDocFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      showToast('Faqat PDF formatidagi fayllarni yuklash mumkin!', 'warning')
      return
    }
    if (file.size > MAX_DOC_SIZE) {
      showToast("Fayl hajmi 15 MB dan oshmasligi kerak", 'warning')
      return
    }
    setSelectedFile(file)
    setFileLabel(file.name)
  }

  const resetDocFormToCreate = () => {
    setEditingId(null)
    setTitle('')
    setFileUrl('')
    setSelectedFile(null)
    setFileLabel('Fayl tanlanmagan')
  }

  const startEditDoc = (d: DocumentItem) => {
    setEditingId(d.id)
    setTitle(d.title)
    setFileUrl(d.file_url)
    setSelectedFile(null)
    setFileLabel(`Mavjud fayl: ${d.file_url.split('/').pop()} (${d.file_size ?? ''})`)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const submitDocument = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      showToast('Hujjat nomini kiritish majburiy!', 'warning')
      return
    }
    if (!isEditing && !selectedFile) {
      showToast('PDF faylni tanlash majburiy!', 'warning')
      return
    }

    setSubmitting(true)
    try {
      let finalFileUrl = fileUrl
      let finalFileSize: string | null = null
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        const { data: up } = await client.post<DocumentUploadResponse>('/documents/upload-file', formData)
        finalFileUrl = up.file_url
        finalFileSize = up.file_size
      }

      const payload: { title: string; file_url: string; file_size?: string } = { title: trimmedTitle, file_url: finalFileUrl }
      if (finalFileSize) payload.file_size = finalFileSize

      if (editingId !== null) {
        await client.put<DocumentItem>(`/documents/${editingId}`, payload)
      } else {
        await client.post<DocumentItem>('/documents', payload)
      }

      showToast(editingId !== null ? 'Hujjat muvaffaqiyatli tahrirlandi!' : 'Hujjat muvaffaqiyatli yuklandi!', 'success')
      resetDocFormToCreate()
      onReload()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Hujjatni saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteDocItem = async (d: DocumentItem) => {
    if (!window.confirm(`'${d.title}' hujjatini o'chirib tashlamoqchimisiz? Ushbu amal ortga qaytarilmaydi.`)) return

    setBusyRowId(d.id)
    try {
      await client.delete(`/documents/${d.id}`)
      onDocumentDeleted(d.id)
      if (editingId === d.id) resetDocFormToCreate()
      showToast("Hujjat muvaffaqiyatli o'chirildi", 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, "O'chirishda xatolik yuz berdi"), 'error')
    } finally {
      setBusyRowId(null)
    }
  }

  return (
    <div id="tab-content-add-document" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Me'yoriy hujjatlar boshqaruvi</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '3px 0 0' }}>Bosh sahifadagi "Hujjatlar" bo'limi uchun PDF fayllarni yuklash va boshqarish</p>
        </div>
        <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          Jami: <span id="docsTotalCount">{list.length}</span> ta
        </span>
      </div>

      <div className="admin-form-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 26, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }} id="docFormModeTitle">
                  {isEditing ? `Hujjatni tahrirlash (#${editingId})` : 'Yangi hujjat yuklash'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '2px 0 0' }} id="docFormModeDesc">
                  {isEditing ? "Hujjat nomini yoki faylini o'zgartiring va saqlang" : "Bosh sahifada ko'rinadigan me'yoriy hujjat (PDF) qo'shish"}
                </p>
              </div>
            </div>
            {isEditing && (
              <button type="button" id="btnCancelDocEdit" onClick={resetDocFormToCreate} style={{ display: 'inline-block', background: 'var(--border-light)', color: 'var(--text-table-header)', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Tahrirlashni bekor qilish
              </button>
            )}
          </div>

          <form id="adminDocForm" ref={formRef} onSubmit={(e) => e.preventDefault()} style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="docTitle" style={labelStyle}>Hujjat nomi *</label>
              <input type="text" id="docTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Iqtidorli talabalar bilan ishlash to'g'risida Nizom" required style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, fontWeight: 600, background: 'var(--bg-white)', color: 'var(--text-dark)' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="docFileInput" style={labelStyle}>PDF fayl *</label>
              <input type="file" id="docFileInput" ref={fileInputRef} accept="application/pdf" onChange={handleDocFileSelect} style={{ display: 'none' }} />

              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: '12px 16px', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }} id="docFileNameLabel" aria-live="polite">{fileLabel}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Faqat PDF (maks. 15MB)</div>
                  </div>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-white)', border: '1px solid var(--primary-color)', color: 'var(--text-heading)', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Fayl tanlash</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 18 }}>
              <button type="button" id="btnDocSave" disabled={submitting} onClick={submitDocument} style={{ background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(11, 59, 112, 0.25)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span id="btnDocSaveText">{isEditing ? "O'zgarishlarni saqlash" : 'Hujjatni saqlash'}</span>
              </button>
            </div>
          </form>
        </div>

        <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 18 }}>
          <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f2721c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Hujjat yuklash qoidalari</span>
          </h4>
          <ul style={{ fontSize: 12, color: 'var(--text-table-header)', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
            <li>Faqat <strong>PDF</strong> formatidagi fayllar qabul qilinadi, hajmi 15 MB dan oshmasligi kerak.</li>
            <li>Yuklangan hujjat darhol Bosh sahifadagi "Hujjatlar" bo'limida barcha foydalanuvchilarga ko'rinadi.</li>
            <li>Hujjat nomini aniq va qisqa yozish tavsiya etiladi.</li>
          </ul>
        </div>
      </div>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, marginTop: 24, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Mavjud hujjatlar ro'yxati</h3>
          <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{list.length} ta</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }} id="adminDocsTable">
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 700 }}>
                <th style={thStyle}>Hujjat nomi</th>
                <th style={thStyle}>Format / Hajmi</th>
                <th style={thStyle}>Sana</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Yuklab olishlar</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} role="alert" style={{ padding: 30, textAlign: 'center', color: 'var(--badge-danger-text)' }}>{error}</td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>
                    Hozircha hech qanday hujjat yuklanmagan.
                  </td>
                </tr>
              ) : (
                list.map((d) => (
                  <tr key={d.id} id={`doc-row-${d.id}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-heading)' }} id={`doc-row-title-${d.id}`}>{d.title}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12.5 }}>{d.file_format} · {d.file_size}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12.5 }}>{d.published_date}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.download_count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" title="Ko'rish" style={{ background: 'var(--border-light)', color: 'var(--text-heading)', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          <span>Ko'rish</span>
                        </a>
                        <button type="button" onClick={() => startEditDoc(d)} title="Tahrirlash" style={{ background: 'var(--border-light)', color: 'var(--text-heading)', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Tahrirlash</span>
                        </button>
                        <button type="button" disabled={busyRowId === d.id} onClick={() => deleteDocItem(d)} title="O'chirish" aria-label={`'${d.title}' hujjatini o'chirish`} style={{ background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={onPageChange} />
        )}
      </div>
    </div>
  )
}
