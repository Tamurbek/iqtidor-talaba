import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { IncomingSupervisorRequest, SupervisorOption, SupervisorRequestItem } from '../../types/admin'
import type { User } from '../../types/user'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  user: User
  /** Admin panelidagi professor-o'qituvchi (ilmiy rahbar) ko'rinishida talaba uchun
   * mo'ljallangan "rahbar tanlash" blokini yashirish uchun. */
  hideSelfRequest?: boolean
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

export default function SupervisorTab({ user, hideSelfRequest = false }: Props) {
  const { updateCurrentUser } = useAuth()
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
      // /supervisor-requests/mine faqat talaba/starosta uchun ochiq (get_current_student),
      // shu sababli professor-o'qituvchi (hideSelfRequest) uni chaqirmaydi.
      const [supRes, reqRes, incRes] = await Promise.all([
        hideSelfRequest ? Promise.resolve({ data: [] as SupervisorOption[] }) : client.get<SupervisorOption[]>('/users/supervisors/list'),
        hideSelfRequest ? Promise.resolve({ data: [] as SupervisorRequestItem[] }) : client.get<SupervisorRequestItem[]>('/supervisor-requests/mine'),
        client.get<IncomingSupervisorRequest[]>('/supervisor-requests/incoming').catch(() => ({ data: [] })),
      ])
      const requests = Array.isArray(reqRes.data) ? reqRes.data : []
      setSupervisors(Array.isArray(supRes.data) ? supRes.data : [])
      setMyRequests(requests)
      setIncoming(Array.isArray(incRes.data) ? incRes.data : [])

      // Talabaning so'rovi tasdiqlangan bo'lsa-yu, lekin keshlangan currentUser
      // hali eski (supervisor_id bo'sh) bo'lsa — qayta login talab qilmasdan
      // kartani yangilaymiz (AuthContext.updateCurrentUser localStorage'ni ham yozadi).
      const accepted = requests.find((r) => r.status === 'accepted')
      if (accepted && !user.supervisor_id) {
        updateCurrentUser({
          supervisor_id: accepted.supervisor_id,
          supervisor_name: accepted.supervisor_name,
          supervisor_degree: accepted.supervisor_degree,
          supervisor_department: accepted.supervisor_department,
          research_topic: accepted.research_topic,
        })
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Ma'lumotlarni yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [user.supervisor_id, updateCurrentUser, hideSelfRequest])

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

      {!hideSelfRequest && (hasSupervisor ? (
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {supervisors.map((s) => {
                  const isSelected = selectedId === String(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={s.is_full}
                      onClick={() => setSelectedId(String(s.id))}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 6,
                        padding: '16px 12px',
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: isSelected ? '#ecfdf5' : s.is_full ? '#f8fafc' : '#ffffff',
                        borderRadius: 12,
                        cursor: s.is_full ? 'not-allowed' : 'pointer',
                        opacity: s.is_full ? 0.6 : 1,
                        font: 'inherit',
                      }}
                    >
                      {s.image_url ? (
                        <img
                          src={s.image_url}
                          alt={s.full_name}
                          style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            fontWeight: 700,
                          }}
                        >
                          {s.full_name ? s.full_name[0] : '?'}
                        </div>
                      )}
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{s.full_name}</div>
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{s.degree || "O'qituvchi"}</div>
                      {s.department && <div style={{ fontSize: 11.5, color: '#64748b' }}>{s.department}</div>}
                      <div style={{ fontSize: 11, color: s.is_full ? '#dc2626' : '#94a3b8', marginTop: 2 }}>
                        {s.is_full ? "Kvota to'lgan" : s.capacity ? `${s.current_load}/${s.capacity} talaba` : `${s.current_load} talaba`}
                      </div>
                    </button>
                  )
                })}
              </div>
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
      ))}

      {!hideSelfRequest && myRequests.length > 0 && (
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
