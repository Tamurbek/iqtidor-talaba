import { useCallback, useEffect, useMemo, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { IncomingSupervisorRequest, IncomingSupervisorRequestListResponse, SupervisorCapacityResponse, SupervisorOption, SupervisorRequestItem } from '../../types/admin'
import type { User } from '../../types/user'
import { extractErrorMessage } from '../../types/dashboard'
import { isDeptHeadLevel } from '../../utils/roles'
import Pagination from '../common/Pagination'
import { withBase } from '../../utils/basePath'

const INCOMING_PAGE_SIZE = 10
const CAPACITY_PAGE_SIZE = 20

interface Props {
  user: User
  /** Admin panelidagi professor-o'qituvchi (ilmiy rahbar) ko'rinishida talaba uchun
   * mo'ljallangan "rahbar tanlash" blokini yashirish uchun. */
  hideSelfRequest?: boolean
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: 'Javob kutilmoqda', color: 'var(--badge-warning-text)', bg: 'var(--badge-warning-bg)' },
  accepted: { text: 'Qabul qilindi', color: 'var(--badge-success-text)', bg: 'var(--badge-success-bg)' },
  rejected: { text: 'Rad etildi', color: 'var(--badge-danger-text)', bg: 'var(--badge-danger-bg)' },
  cancelled: { text: 'Bekor qilindi', color: 'var(--text-muted)', bg: 'var(--bg-light)' },
}

export default function SupervisorTab({ user, hideSelfRequest = false }: Props) {
  const { updateCurrentUser } = useAuth()
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([])
  const [myRequests, setMyRequests] = useState<SupervisorRequestItem[]>([])
  const [incoming, setIncoming] = useState<IncomingSupervisorRequest[]>([])
  const [incomingPage, setIncomingPage] = useState(1)
  const [incomingTotal, setIncomingTotal] = useState(0)
  const [incomingTotalPages, setIncomingTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [capacityDrafts, setCapacityDrafts] = useState<Record<number, string>>({})
  const [savingCapacityId, setSavingCapacityId] = useState<number | null>(null)
  const [capacityPage, setCapacityPage] = useState(1)
  const [capacitySearch, setCapacitySearch] = useState('')

  const hasSupervisor = Boolean(user.supervisor_id)
  const hasPendingRequest = myRequests.some((r) => r.status === 'pending')
  // 10.5-modda: mas'ul bo'lim (department_head/admin) professorlar kvotasini belgilaydi.
  const canManageCapacity = hideSelfRequest && isDeptHeadLevel(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // /supervisor-requests/mine faqat talaba/starosta uchun ochiq (get_current_student),
      // shu sababli professor-o'qituvchi (hideSelfRequest) uni chaqirmaydi.
      const emptyIncoming: IncomingSupervisorRequestListResponse = { items: [], total: 0, page: 1, page_size: INCOMING_PAGE_SIZE, total_pages: 1 }
      const [supRes, reqRes, incRes] = await Promise.all([
        hideSelfRequest && !canManageCapacity ? Promise.resolve({ data: [] as SupervisorOption[] }) : client.get<SupervisorOption[]>('/users/supervisors/list'),
        hideSelfRequest ? Promise.resolve({ data: [] as SupervisorRequestItem[] }) : client.get<SupervisorRequestItem[]>('/supervisor-requests/mine'),
        client
          .get<IncomingSupervisorRequestListResponse>('/supervisor-requests/incoming', { params: { page: incomingPage, page_size: INCOMING_PAGE_SIZE } })
          .catch(() => ({ data: emptyIncoming })),
      ])
      const requests = Array.isArray(reqRes.data) ? reqRes.data : []
      const supervisorList = Array.isArray(supRes.data) ? supRes.data : []
      setSupervisors(supervisorList)
      setCapacityDrafts(Object.fromEntries(supervisorList.map((s) => [s.id, s.capacity != null ? String(s.capacity) : ''])))
      setMyRequests(requests)
      setIncoming(incRes.data.items)
      setIncomingTotal(incRes.data.total)
      setIncomingTotalPages(incRes.data.total_pages)

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
  }, [user.supervisor_id, updateCurrentUser, hideSelfRequest, canManageCapacity, incomingPage])

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

  const handleSaveCapacity = async (supervisorId: number) => {
    const raw = (capacityDrafts[supervisorId] ?? '').trim()
    const capacity = raw === '' ? null : parseInt(raw, 10)
    if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
      setError("Kvota manfiy bo'lmagan butun son bo'lishi kerak")
      return
    }
    setSavingCapacityId(supervisorId)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.patch<SupervisorCapacityResponse>(`/supervisor-requests/capacity/${supervisorId}`, { capacity })
      setMessage(data.message || 'Kvota yangilandi')
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Kvotani yangilashda xatolik yuz berdi'))
    } finally {
      setSavingCapacityId(null)
    }
  }

  const filteredSupervisors = useMemo(() => {
    const q = capacitySearch.trim().toLowerCase()
    if (!q) return supervisors
    return supervisors.filter((s) => [s.full_name, s.department, s.faculty].some((v) => v?.toLowerCase().includes(q)))
  }, [supervisors, capacitySearch])
  const capacityTotalPages = Math.max(1, Math.ceil(filteredSupervisors.length / CAPACITY_PAGE_SIZE))
  const safeCapacityPage = Math.min(capacityPage, capacityTotalPages)
  const pagedSupervisors = filteredSupervisors.slice((safeCapacityPage - 1) * CAPACITY_PAGE_SIZE, safeCapacityPage * CAPACITY_PAGE_SIZE)

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  const isEmpty = hideSelfRequest && incoming.length === 0 && !error

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canManageCapacity && supervisors.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-heading)' }}>Ilmiy rahbarlik kvotasi (10.5-modda)</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Har bir professor-o'qituvchi biriktirilishi mumkin bo'lgan talabalar sonini belgilang. Kvota belgilanmaguncha rahbarga so'rov yuborilmaydi va talaba biriktirilmaydi (10.5-10.6-modda).
          </p>
          <input
            type="search"
            value={capacitySearch}
            onChange={(e) => {
              setCapacitySearch(e.target.value)
              setCapacityPage(1)
            }}
            placeholder="F.I.Sh., kafedra yoki fakultet bo'yicha qidirish..."
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', marginBottom: 12, border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pagedSupervisors.map((s) => (
              <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.department || s.faculty || ''} &middot; Hozirgi yuklama: {s.current_load} talaba
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Kvota
                  <input
                    type="number"
                    min={0}
                    value={capacityDrafts[s.id] ?? ''}
                    onChange={(e) => setCapacityDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Cheklanmagan"
                    style={{ width: 100, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <button
                  type="button"
                  disabled={savingCapacityId === s.id}
                  onClick={() => handleSaveCapacity(s.id)}
                  style={{ padding: '8px 16px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  {savingCapacityId === s.id ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            ))}
            {filteredSupervisors.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Hech narsa topilmadi</div>
            )}
          </div>
          <Pagination page={safeCapacityPage} totalPages={capacityTotalPages} total={filteredSupervisors.length} pageSize={CAPACITY_PAGE_SIZE} onPageChange={setCapacityPage} />
        </div>
      )}

      {isEmpty && (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>
          Hozircha ilmiy rahbarlik so'rovlari mavjud emas
        </div>
      )}

      {incoming.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Kiruvchi so'rovlar (ilmiy rahbarlikka)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {incoming.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{r.student_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.faculty} &middot; {r.group_name}</div>
                    {r.research_topic && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>Mavzu: {r.research_topic}</div>}
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
                      style={{ padding: '8px 14px', border: '1px solid var(--badge-danger-border)', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Rad etish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={incomingPage} totalPages={incomingTotalPages} total={incomingTotal} pageSize={INCOMING_PAGE_SIZE} onPageChange={setIncomingPage} />
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
      )}

      {!hideSelfRequest && (hasSupervisor ? (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--text-heading)' }}>Sizning ilmiy rahbaringiz</h3>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-dark)' }}>{user.supervisor_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user.supervisor_degree} &middot; {user.supervisor_department}</div>
          {user.research_topic && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
              <strong>Tadqiqot mavzusi:</strong> {user.research_topic}
            </div>
          )}
        </div>
      ) : (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-heading)' }}>Ilmiy rahbar tanlash</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Nizom 10-moddasiga muvofiq, ro'yxatdan o'zingiz uchun ilmiy rahbarni tanlab, so'rov yuborasiz.
            So'rov professor-o'qituvchi tomonidan qabul qilingandan so'ng biriktirish amalga oshiriladi.
          </p>
          {hasPendingRequest ? (
            <div style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' }}>
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
                      disabled={s.is_full || s.capacity == null}
                      onClick={() => setSelectedId(String(s.id))}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 6,
                        padding: '16px 12px',
                        border: isSelected ? '2px solid var(--badge-success-text)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--badge-success-bg)' : s.is_full || s.capacity == null ? 'var(--bg-light)' : 'var(--bg-white)',
                        borderRadius: 12,
                        cursor: s.is_full || s.capacity == null ? 'not-allowed' : 'pointer',
                        opacity: s.is_full || s.capacity == null ? 0.6 : 1,
                        font: 'inherit',
                      }}
                    >
                      {s.image_url ? (
                        <img
                          src={withBase(s.image_url)}
                          alt={s.full_name}
                          style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'var(--badge-info-bg)',
                            color: 'var(--badge-info-text)',
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
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.3 }}>{s.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--badge-success-text)', fontWeight: 600 }}>{s.degree || "O'qituvchi"}</div>
                      {s.department && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.department}</div>}
                      <div style={{ fontSize: 11, color: s.is_full || s.capacity == null ? 'var(--badge-danger-text)' : 'var(--text-light)', marginTop: 2 }}>
                        {s.capacity == null ? 'Kvota belgilanmagan' : s.is_full ? "Kvota to'lgan" : `${s.current_load}/${s.capacity} talaba`}
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
                style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
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
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>So'rovlarim tarixi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myRequests.map((r) => {
              const st = statusLabel[r.status] || { text: r.status, color: 'var(--text-secondary)', bg: 'var(--bg-light)' }
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)' }}>{r.supervisor_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.requested_at).toLocaleDateString('uz-UZ')}</div>
                    {r.status === 'rejected' && r.rejection_reason && (
                      <div style={{ fontSize: 12, color: 'var(--badge-danger-text)', marginTop: 2 }}>Sabab: {r.rejection_reason}</div>
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
