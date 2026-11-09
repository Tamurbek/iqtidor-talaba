import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { IncomingSupervisorRequest, SupervisorOption, SupervisorRequestItem } from '../../types/admin'
import type { User } from '../../types/user'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  user: User
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
}

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: 'Javob kutilmoqda', color: '#b45309', bg: '#fffbeb' },
  accepted: { text: 'Qabul qilindi', color: '#059669', bg: '#ecfdf5' },
  rejected: { text: 'Rad etildi', color: '#dc2626', bg: '#fef2f2' },
  cancelled: { text: 'Bekor qilindi', color: '#64748b', bg: '#f8fafc' },
}

export default function SupervisorTab({ user }: Props) {
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([])
  const [myRequests, setMyRequests] = useState<SupervisorRequestItem[]>([])
  const [incoming, setIncoming] = useState<IncomingSupervisorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [decidingId, setDecidingId] = useState<number | null>(null)

  const hasSupervisor = Boolean(user.supervisor_id)
  const hasPendingRequest = myRequests.some((r) => r.status === 'pending')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [supRes, reqRes, incRes] = await Promise.all([
        client.get<SupervisorOption[]>('/users/supervisors/list'),
        client.get<SupervisorRequestItem[]>('/supervisor-requests/mine'),
        client.get<IncomingSupervisorRequest[]>('/supervisor-requests/incoming').catch(() => ({ data: [] })),
      ])
      setSupervisors(Array.isArray(supRes.data) ? supRes.data : [])
      setMyRequests(Array.isArray(reqRes.data) ? reqRes.data : [])
      setIncoming(Array.isArray(incRes.data) ? incRes.data : [])
    } catch (err) {
      setError(extractErrorMessage(err, "Ma'lumotlarni yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>('/supervisor-requests', {
        supervisor_id: parseInt(selectedId, 10),
        research_topic: topic.trim() || null,
      })
      setMessage(data.message || "So'rov yuborildi")
      setSelectedId('')
      setTopic('')
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, "So'rov yuborishda xatolik yuz berdi"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (id: number) => {
    setDecidingId(id)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/supervisor-requests/${id}/accept`)
      setMessage(data.message || 'Qabul qilindi')
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, "So'rovni qabul qilishda xatolik yuz berdi"))
    } finally {
      setDecidingId(null)
    }
  }

  const handleReject = async (id: number) => {
    const reason = window.prompt("Rad etish sababi (ixtiyoriy):") || ''
    setDecidingId(id)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/supervisor-requests/${id}/reject`, { reason: reason.trim() || null })
      setMessage(data.message || 'Rad etildi')
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, "So'rovni rad etishda xatolik yuz berdi"))
    } finally {
      setDecidingId(null)
    }
  }

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {incoming.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#0b3b70' }}>Kiruvchi so'rovlar (ilmiy rahbarlikka)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {incoming.map((r) => (
              <div key={r.id} style={{ border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{r.student_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.faculty} &middot; {r.group_name}</div>
                    {r.research_topic && <div style={{ fontSize: 12.5, color: '#334155', marginTop: 6 }}>Mavzu: {r.research_topic}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={decidingId === r.id}
                      onClick={() => handleAccept(r.id)}
                      style={{ padding: '8px 14px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Qabul qilish
                    </button>
                    <button
                      type="button"
                      disabled={decidingId === r.id}
                      onClick={() => handleReject(r.id)}
                      style={{ padding: '8px 14px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Rad etish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: '#fef2f2', color: '#dc2626' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: '#ecfdf5', color: '#059669' }}>{message}</div>
      )}

      {hasSupervisor ? (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#0b3b70' }}>Sizning ilmiy rahbaringiz</h3>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>{user.supervisor_name}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{user.supervisor_degree} &middot; {user.supervisor_department}</div>
          {user.research_topic && (
            <div style={{ fontSize: 13, color: '#334155', marginTop: 10 }}>
              <strong>Tadqiqot mavzusi:</strong> {user.research_topic}
            </div>
          )}
        </div>
      ) : (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0b3b70' }}>Ilmiy rahbar tanlash</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b' }}>
            Nizom 10-moddasiga muvofiq, ro'yxatdan o'zingiz uchun ilmiy rahbarni tanlab, so'rov yuborasiz.
            So'rov professor-o'qituvchi tomonidan qabul qilingandan so'ng biriktirish amalga oshiriladi.
          </p>
          {hasPendingRequest ? (
            <div style={{ padding: 12, borderRadius: 8, fontSize: 13, background: '#fffbeb', color: '#b45309' }}>
              Sizda hal qilinmagan so'rov mavjud. Javobni kuting yoki avval uni bekor qiling.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5 }}
              >
                <option value="">-- Ilmiy rahbarni tanlang --</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={String(s.id)} disabled={s.is_full}>
                    {s.full_name} ({s.degree || "O'qituvchi"}){s.is_full ? ' — kvota to\'lgan' : s.capacity ? ` — ${s.current_load}/${s.capacity}` : ''}
                  </option>
                ))}
              </select>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="Taklif etilayotgan ilmiy-tadqiqot mavzusi (ixtiyoriy)"
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
              />
              <button
                type="submit"
                disabled={submitting || !selectedId}
                style={{ alignSelf: 'flex-start', padding: '10px 20px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {submitting ? 'Yuborilmoqda...' : "So'rov yuborish"}
              </button>
            </form>
          )}
        </div>
      )}

      {myRequests.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#0b3b70' }}>So'rovlarim tarixi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myRequests.map((r) => {
              const st = statusLabel[r.status] || { text: r.status, color: '#334155', bg: '#f8fafc' }
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{r.supervisor_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.requested_at).toLocaleDateString('uz-UZ')}</div>
                    {r.status === 'rejected' && r.rejection_reason && (
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>Sabab: {r.rejection_reason}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 999 }}>{st.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
