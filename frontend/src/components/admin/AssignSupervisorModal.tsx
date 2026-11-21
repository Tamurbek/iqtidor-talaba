import { useEffect, useMemo, useState } from 'react'
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

function unavailableReason(s: SupervisorOption, currentId: number | null | undefined): string | null {
  if (s.id === currentId) return null
  if (s.capacity === null) return 'Kvota belgilanmagan'
  if (s.is_full) return "Kvota to'lgan"
  return null
}

export default function AssignSupervisorModal({ student, onClose, onSaved }: Props) {
  const [supervisors, setSupervisors] = useState<SupervisorOption[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(student.supervisor_id ?? null)
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState(student.research_topic || '')
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasExistingSupervisor = Boolean(student.supervisor_id || student.supervisor_name)

  useEffect(() => {
    client
      .get<SupervisorOption[]>('/users/supervisors/list')
      .then(({ data }) => setSupervisors(Array.isArray(data) ? data : []))
      .catch((err) => {
        setSupervisors([])
        setError(extractErrorMessage(err, "O'qituvchilar ro'yxatini yuklab bo'lmadi"))
      })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = supervisors ?? []
    if (!q) return list
    return list.filter((s) =>
      [s.full_name, s.faculty, s.department, s.degree].some((v) => v && v.toLowerCase().includes(q))
    )
  }, [supervisors, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) {
      setError("Ro'yxatdan o'qituvchini tanlang")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/users/${student.id}/assign-supervisor`, {
        supervisor_id: selectedId,
        research_topic: topic.trim(),
      })
      onSaved(data.message || 'Ilmiy rahbar muvaffaqiyatli biriktirildi!')
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
      <div style={{ background: 'var(--bg-white)', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'popIn 0.25s ease' }}>
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
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{student.full_name}</p>
            </div>
          </div>
          <button type="button" aria-label="Yopish" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-light)' }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          {error && (
            <div role="alert" style={{ padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
          )}

          <label htmlFor="supSearch" style={labelStyle}>O'qituvchilar ro'yxati</label>
          <input id="supSearch" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="F.I.SH., fakultet yoki kafedra bo'yicha qidirish..." style={{ ...inputStyle, marginBottom: 10 }} />

          <div role="radiogroup" aria-label="O'qituvchilar" style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflowY: 'auto', minHeight: 160, maxHeight: 340, marginBottom: 14 }}>
            {supervisors === null && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>}
            {supervisors !== null && filtered.length === 0 && (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>O'qituvchi topilmadi</div>
            )}
            {filtered.map((s) => {
              const reason = unavailableReason(s, student.supervisor_id)
              const selected = selectedId === s.id
              return (
                <label
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: reason ? 'not-allowed' : 'pointer',
                    opacity: reason ? 0.55 : 1,
                    background: selected ? 'var(--badge-success-bg)' : 'transparent',
                  }}
                >
                  <input type="radio" name="supervisor" value={s.id} checked={selected} disabled={!!reason} onChange={() => setSelectedId(s.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-heading)' }}>
                      {s.full_name}
                      {s.id === student.supervisor_id && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: 'var(--badge-success-text)' }}>(joriy)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {[s.degree, s.department || s.faculty].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {s.current_load} / {s.capacity ?? '—'}
                    </div>
                    {reason && <div style={{ color: 'var(--badge-danger-text)' }}>{reason}</div>}
                  </div>
                </label>
              )
            })}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="supInputTopic" style={labelStyle}>Ilmiy tadqiqot mavzusi</label>
            <textarea id="supInputTopic" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ixtiyoriy" style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical' }}></textarea>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            {hasExistingSupervisor ? (
              <button type="button" onClick={handleRemove} disabled={removing || submitting} style={{ padding: '10px 16px', border: '1px solid var(--badge-danger-text)', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {removing ? 'Bekor qilinmoqda...' : 'Biriktirishni bekor qilish'}
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-table-header)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Yopish</button>
              <button type="submit" id="btnSubmitAssignSup" disabled={submitting || removing || !selectedId} style={{ padding: '10px 22px', border: 'none', background: '#059669', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedId ? 'pointer' : 'not-allowed', opacity: selectedId ? 1 : 0.6 }}>
                {submitting ? 'Saqlanmoqda...' : 'Biriktirish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
