import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { RankingItem, SupervisorOption } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  student: RankingItem
  onClose: () => void
  onSaved: (message: string) => void
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, background: 'var(--bg-white)', color: 'var(--text-dark)' }

export default function AssignSupervisorModal({ student, onClose, onSaved }: Props) {
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([])
  const [supervisorId, setSupervisorId] = useState<string>('')
  const [name, setName] = useState(student.supervisor_name || '')
  const [degree, setDegree] = useState(student.supervisor_degree || '')
  const [phone, setPhone] = useState(student.supervisor_phone || '')
  const [dept, setDept] = useState(student.supervisor_department || '')
  const [topic, setTopic] = useState(student.research_topic || '')
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasExistingSupervisor = Boolean(student.supervisor_id || student.supervisor_name)

  useEffect(() => {
    client
      .get<SupervisorOption[]>('/users/supervisors/list')
      .then(({ data }) => setSupervisors(Array.isArray(data) ? data : []))
      .catch(() => setSupervisors([]))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSupervisorSelectChange = (value: string) => {
    if (!value) return
    const sup = supervisors.find((s) => String(s.id) === value)
    if (!sup) return
    setSupervisorId(value)
    setName(sup.full_name || '')
    const supDept = sup.faculty || sup.department || ''
    if (supDept) setDept(supDept)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/users/${student.id}/assign-supervisor`, {
        supervisor_id: supervisorId ? parseInt(supervisorId, 10) : null,
        supervisor_name: name.trim(),
        supervisor_degree: degree.trim() || null,
        supervisor_department: dept.trim() || null,
        supervisor_phone: phone.trim() || null,
        research_topic: topic.trim(),
      })
      onSaved(data.message || 'Ilmiy rahbar va tadqiqot mavzusi muvaffaqiyatli saqlandi!')
    } catch (err) {
      setError(extractErrorMessage(err, 'Ilmiy rahbarni biriktirishda xatolik yuz berdi'))
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm(`${student.full_name} uchun ilmiy rahbar biriktirilishini bekor qilmoqchimisiz?`)) return
    setRemoving(true)
    setError(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/users/${student.id}/assign-supervisor`, {
        supervisor_id: null,
        supervisor_name: '',
        supervisor_degree: null,
        supervisor_department: null,
        supervisor_phone: null,
        research_topic: '',
      })
      onSaved(data.message || 'Ilmiy rahbar biriktirilishi bekor qilindi')
    } catch (err) {
      setError(extractErrorMessage(err, "Ilmiy rahbarni bekor qilishda xatolik yuz berdi"))
      setRemoving(false)
    }
  }

  return (
    <div id="assignSupervisorModal" role="dialog" aria-modal="true" aria-labelledby="assignSupervisorTitle" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-white)', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'popIn 0.25s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <h3 id="assignSupervisorTitle" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Ilmiy rahbar biriktirish</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Talabaga ustoz va tadqiqot mavzusini belgilash</p>
            </div>
          </div>
          <button type="button" aria-label="Yopish" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-light)' }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Talaba:</span>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)', marginTop: 2 }}>{student.full_name}</div>
          </div>

          {error && (
            <div role="alert" style={{ padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
          )}

          <div style={{ marginBottom: 14 }} id="supSelectWrapper">
            <label htmlFor="supSelectDropdown" style={labelStyle}>Kafedra o'qituvchilari ro'yxatidan tanlash</label>
            <select id="supSelectDropdown" value={supervisorId} onChange={(e) => handleSupervisorSelectChange(e.target.value)} style={{ ...inputStyle, padding: '9px 12px', background: 'var(--bg-white)' }}>
              <option value="">-- Ro'yxatdan tanlash (ixtiyoriy) --</option>
              {supervisors.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.full_name} ({s.faculty || s.department || "O'qituvchi"})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="supInputName" style={labelStyle}>Ilmiy rahbar F.I.SH. *</label>
              <input type="text" id="supInputName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: prof. Qosimov Anvar Shokirovich" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="supInputDegree" style={labelStyle}>Ilmiy darajasi / unvoni</label>
              <input type="text" id="supInputDegree" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="PhD, dotsent / DSc, prof" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="supInputPhone" style={labelStyle}>Aloqa telefoni</label>
              <input type="text" id="supInputPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="supInputDept" style={labelStyle}>Kafedrasi</label>
            <input type="text" id="supInputDept" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Dasturiy injiniring kafedrasi" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="supInputTopic" style={labelStyle}>Ilmiy tadqiqot mavzusi *</label>
            <textarea id="supInputTopic" rows={3} required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Masalan: Sun'iy intellekt algoritmlari asosida tibbiy tasvirlarni qayta ishlash..." style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical' }}></textarea>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            {hasExistingSupervisor ? (
              <button type="button" onClick={handleRemove} disabled={removing || submitting} style={{ padding: '10px 16px', border: '1px solid var(--badge-danger-text)', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {removing ? 'Bekor qilinmoqda...' : 'Biriktirishni bekor qilish'}
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-table-header)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Yopish</button>
            <button type="submit" id="btnSubmitAssignSup" disabled={submitting || removing} style={{ padding: '10px 22px', border: 'none', background: '#059669', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {submitting ? (
                'Saqlanmoqda...'
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span>Biriktirish va Saqlash</span>
                </>
              )}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
