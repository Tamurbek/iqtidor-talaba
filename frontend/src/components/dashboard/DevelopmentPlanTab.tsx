import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type { DevelopmentPlan, DevelopmentPlanWithStudent, DevelopmentTask } from '../../types/dashboard'
import type { PaginatedResponse } from '../../types/pagination'
import { extractErrorMessage } from '../../types/dashboard'
import Pagination from '../common/Pagination'

const PAGE_SIZE = 10

interface Props {
  user: User
  /** Ilmiy rahbar/professor kabinetida ko'rinishi uchun (Nizom 16.1-16.4-modda: tasdiqlash/o'zgartirish). */
  mode?: 'student' | 'supervisor'
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  draft: { text: 'Loyiha (tasdiqlanmagan)', color: 'var(--badge-warning-text)', bg: 'var(--badge-warning-bg)' },
  active: { text: 'Faol', color: 'var(--badge-success-text)', bg: 'var(--badge-success-bg)' },
  completed: { text: 'Yakunlangan', color: 'var(--text-muted)', bg: 'var(--bg-light)' },
}

function emptyTask(): DevelopmentTask {
  return { title: '', deadline: '', status: 'pending', result_note: '' }
}

export default function DevelopmentPlanTab({ user, mode = 'student' }: Props) {
  const [plans, setPlans] = useState<DevelopmentPlan[]>([])
  const [supervisedPlans, setSupervisedPlans] = useState<DevelopmentPlanWithStudent[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tasks, setTasks] = useState<DevelopmentTask[]>([emptyTask()])

  const isSupervisor = mode === 'supervisor'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isSupervisor) {
        const { data } = await client.get<PaginatedResponse<DevelopmentPlanWithStudent>>('/development-plans', {
          params: { page, page_size: PAGE_SIZE },
        })
        setSupervisedPlans(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      } else {
        const { data } = await client.get<DevelopmentPlan[]>('/development-plans/me')
        setPlans(data)
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Ma'lumotlarni yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [isSupervisor, page])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setGoal('')
    setStartDate('')
    setEndDate('')
    setTasks([emptyTask()])
  }

  const handleTaskChange = (index: number, field: keyof DevelopmentTask, value: string) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)))
  }

  const addTaskRow = () => setTasks((prev) => [...prev, emptyTask()])
  const removeTaskRow = (index: number) => setTasks((prev) => prev.filter((_, i) => i !== index))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await client.post('/development-plans', {
        goal: goal.trim(),
        tasks: tasks.filter((t) => t.title.trim()).map((t) => ({ ...t, deadline: t.deadline || null })),
        start_date: startDate || null,
        end_date: endDate || null,
      })
      setMessage('Reja yaratildi va ilmiy rahbaringizga yuborildi')
      resetForm()
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Reja yaratishda xatolik yuz berdi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (planId: number, status: string) => {
    setEditingId(planId)
    setError(null)
    setMessage(null)
    try {
      await client.patch(`/development-plans/${planId}`, { status })
      setMessage('Reja holati yangilandi')
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Rejani yangilashda xatolik yuz berdi'))
    } finally {
      setEditingId(null)
    }
  }

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  if (isSupervisor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
        )}
        {message && (
          <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
        )}
        {supervisedPlans.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>
            Hozircha talabalaringizdan individual rivojlanish rejasi kelib tushmagan
          </div>
        ) : (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Talabalarning individual rivojlanish rejalari</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {supervisedPlans.map((p) => {
                const st = statusLabel[p.status] || { text: p.status, color: 'var(--text-secondary)', bg: 'var(--bg-light)' }
                return (
                  <div key={p.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{p.student_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.student_hemis_id} &middot; {p.student_group_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}><strong>Maqsad:</strong> {p.goal}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>{st.text}</span>
                    </div>
                    {p.tasks.length > 0 && (
                      <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {p.tasks.map((t, i) => (
                          <li key={i}>{t.title}{t.deadline ? ` — ${new Date(t.deadline).toLocaleDateString('uz-UZ')}` : ''}</li>
                        ))}
                      </ul>
                    )}
                    {p.status !== 'completed' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {p.status === 'draft' && (
                          <button
                            type="button"
                            disabled={editingId === p.id}
                            onClick={() => handleStatusChange(p.id, 'active')}
                            style={{ padding: '7px 14px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Tasdiqlash
                          </button>
                        )}
                        {p.status === 'active' && (
                          <button
                            type="button"
                            disabled={editingId === p.id}
                            onClick={() => handleStatusChange(p.id, 'completed')}
                            style={{ padding: '7px 14px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-dark)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Yakunlangan deb belgilash
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    )
  }

  const hasOpenPlan = plans.some((p) => p.status === 'draft' || p.status === 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
      )}

      {!user.supervisor_id ? (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-heading)' }}>Individual rivojlanish rejasi</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Reja tuzish uchun avval sizga ilmiy rahbar biriktirilishi kerak (Nizom 10-modda).
          </p>
        </div>
      ) : hasOpenPlan ? null : (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-heading)' }}>Yangi reja tuzish</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Nizom 7.3, 16.2, 23.4-moddasiga muvofiq, ilmiy rahbaringiz bilan birgalikda individual rivojlanish rejasi tuzing.
          </p>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="Rejaning maqsadi"
              required
              style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Boshlanish sanasi
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Tugash sanasi
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8 }} />
              </label>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8 }}>Vazifalar</div>
              {tasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={t.title}
                    onChange={(e) => handleTaskChange(i, 'title', e.target.value)}
                    placeholder="Vazifa nomi"
                    style={{ flex: '1 1 200px', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
                  />
                  <input
                    type="date"
                    value={t.deadline || ''}
                    onChange={(e) => handleTaskChange(i, 'deadline', e.target.value)}
                    style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
                  />
                  {tasks.length > 1 && (
                    <button type="button" onClick={() => removeTaskRow(i)} style={{ padding: '8px 12px', border: '1px solid var(--badge-danger-border)', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                      O'chirish
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTaskRow} style={{ padding: '6px 12px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}>
                + Vazifa qo'shish
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || !goal.trim()}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {submitting ? 'Yuborilmoqda...' : 'Rejani yuborish'}
            </button>
          </form>
        </div>
      )}

      {plans.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Rejalarim tarixi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map((p) => {
              const st = statusLabel[p.status] || { text: p.status, color: 'var(--text-secondary)', bg: 'var(--bg-light)' }
              return (
                <div key={p.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13.5, color: 'var(--text-dark)' }}><strong>Maqsad:</strong> {p.goal}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>{st.text}</span>
                  </div>
                  {p.tasks.length > 0 && (
                    <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {p.tasks.map((t, i) => (
                        <li key={i}>{t.title}{t.deadline ? ` — ${new Date(t.deadline).toLocaleDateString('uz-UZ')}` : ''}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                    Yaratilgan: {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
