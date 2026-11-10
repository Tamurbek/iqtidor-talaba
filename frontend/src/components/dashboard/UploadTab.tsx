import { useRef, useState, type FormEvent } from 'react'
import client from '../../api/client'
import type { Achievement } from '../../types/dashboard'
import { ACHIEVEMENT_SCOPES, INNOVATION_TYPE_CODE, extractErrorMessage } from '../../types/dashboard'

interface Props {
  onUploaded: (achievement: Achievement) => void
}

const ACHIEVEMENT_TYPES = [
  { value: 'scopus_wos', label: '“Scopus” va “Web of Science” bazasidagi maqola [+4 ball / maks. 8 ball]' },
  { value: 'oak_maqola', label: 'OAK ro\'yxatidagi jurnalda chop etilgan maqola [maks. 4 ball]' },
  { value: 'patent', label: 'Ixtiro, patent hamda mualliflik loyihasi (DGU guvohnomasi) [maks. 5 ball]' },
  { value: INNOVATION_TYPE_CODE, label: 'Ilmiy-innovatsion tanlov/loyihadagi ishtirok [filial: maks. 2, respublika/xalqaro: maks. 8 ball]' },
  { value: 'intellektual_oyin', label: "Intellektual o'yinlar (Zakovat) va bilimlar tanlovi [+1 ball / maks. 5 ball]" },
  { value: 'manaviy_marifiy', label: "Ma'naviy-ma'rifiy tadbir va jamoat ishi [+0.5 ball / maks. 4 ball]" },
  { value: 'konferensiya', label: 'Mahalliy va xalqaro konferensiya maqolasi hamda tezisi [maks. 2 ball]' },
  { value: 'boshqa', label: "Boshqa tasdiqlangan yutuq (stipendiya, diplom, sertifikat) [maks. 4 ball]" },
]

interface UploadResponse {
  success: boolean
  message: string
  achievement: Achievement
}

export default function UploadTab({ onUploaded }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [achType, setAchType] = useState(ACHIEVEMENT_TYPES[0].value)
  const [scope, setScope] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setFeedback({ type: 'error', message: 'Iltimos, tasdiqlovchi hujjat faylini tanlang.' })
      return
    }
    if (achType === INNOVATION_TYPE_CODE && !scope) {
      setFeedback({ type: 'error', message: "Ilmiy-innovatsion tanlov uchun miqyosni (filial yoki respublika/xalqaro) tanlang." })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    const formData = new FormData()
    formData.append('achievement_type', achType)
    if (achType === INNOVATION_TYPE_CODE) formData.append('scope', scope)
    formData.append('title', title)
    if (description) formData.append('description', description)
    formData.append('file', file)

    try {
      const { data } = await client.post<UploadResponse>('/achievements/upload', formData)
      setFeedback({ type: 'success', message: data.message || "Yutuq muvaffaqiyatli yuklandi va Nizom mezonlari bo'yicha tekshiruvga yuborildi!" })
      onUploaded(data.achievement)
      formRef.current?.reset()
      setTitle('')
      setDescription('')
      setFile(null)
      setAchType(ACHIEVEMENT_TYPES[0].value)
      setScope('')
    } catch (err) {
      setFeedback({ type: 'error', message: extractErrorMessage(err, 'Yuklashda xatolik yuz berdi') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="student-tab-pane" id="student-tab-upload" style={{ display: 'block' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32, maxWidth: 820, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0b3b70', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Yutuq yoki ilmiy ish hujjatini yuklash</span>
          </h3>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Nizomning 13-moddasidagi 10 ta baholash indikatoriga muvofiq tegishli toifani tanlang va tasdiqlovchi faylni biriktiring.
          </p>
        </div>

        {feedback && (
          <div
            id="uploadFeedback"
            style={{
              display: 'block',
              padding: 14,
              borderRadius: 10,
              fontSize: 14,
              marginBottom: 20,
              fontWeight: 500,
              background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: feedback.type === 'success' ? '#059669' : '#dc2626',
              border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        <form id="achievementUploadForm" ref={formRef} onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="achType" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
              Nizom bo'yicha yutuq toifasi (Indikator)
            </label>
            <select
              id="achType"
              name="achievement_type"
              required
              value={achType}
              onChange={(e) => setAchType(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#ffffff' }}
            >
              {ACHIEVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>* Hammualliflikdagi ishlar mualliflar soniga nisbatan proporsional hisoblanadi.</p>
          </div>

          {achType === INNOVATION_TYPE_CODE && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="achScope" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                Tanlov/loyiha miqyosi
              </label>
              <select
                id="achScope"
                name="scope"
                required
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#ffffff' }}
              >
                <option value="" disabled>Miqyosni tanlang...</option>
                {Object.entries(ACHIEVEMENT_SCOPES).map(([code, meta]) => (
                  <option key={code} value={code}>{meta.label} [maks. {meta.maxPoints} ball]</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="achTitle" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Hujjat nomi / Maqola sarlavhasi</label>
            <input
              type="text"
              id="achTitle"
              name="title"
              placeholder="Masalan: Scopus jurnalida e'lon qilingan ilmiy maqola sarlavhasi..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="achDesc" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Mualliflar soni, DOI havolasi yoki jurnal ma'lumoti (ixtiyoriy)</label>
            <input
              type="text"
              id="achDesc"
              name="description"
              placeholder="Masalan: Mualliflar soni: 1 (yakka mualliflik), DOI: 10.1016/j... yoki jurnal nomi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="achFile" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Tasdiqlovchi fayl (PDF, PNG, JPG - max 15MB)</label>
            <input
              type="file"
              id="achFile"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ width: '100%', fontSize: 14, padding: 8, border: '1px dashed #94a3b8', borderRadius: 8, background: '#f8fafc', color: '#0f172a' }}
            />
          </div>

          <button
            type="submit"
            id="btnUpload"
            disabled={submitting}
            style={{ background: '#0b3b70', color: '#ffffff', border: 'none', padding: '13px 32px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(11, 59, 112, 0.25)', opacity: submitting ? 0.7 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span id="btnUploadText">{submitting ? 'Yuklanmoqda...' : 'Yuklash va tekshiruvga yuborish'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
