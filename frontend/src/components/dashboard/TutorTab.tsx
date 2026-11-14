import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type { TutorStudent, StudentMonitoringItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  user: User
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

/**
 * Nizom 17, 24-modda: tyutorga biriktirilgan talabalar ro'yxati
 * (GET /tutor/students, app/api/tutor.py).
 * 17.1-modda: faollik/uchrashuv kuzatuvi (GET /tutor/monitoring).
 * 17.2-modda: to'garak/tadbir/imkoniyat haqida xabar yuborish (POST /tutor/notify/{id}, /tutor/notify-all).
 */
export default function TutorTab({ user }: Props) {
  const [students, setStudents] = useState<TutorStudent[]>([])
  const [monitoring, setMonitoring] = useState<Record<number, StudentMonitoringItem>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [notifyTargetId, setNotifyTargetId] = useState<number | 'all' | null>(null)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [studentsRes, monitoringRes] = await Promise.all([
        client.get<TutorStudent[]>('/tutor/students'),
        client.get<StudentMonitoringItem[]>('/tutor/monitoring'),
      ])
      setStudents(studentsRes.data)
      const byId: Record<number, StudentMonitoringItem> = {}
      for (const m of monitoringRes.data) byId[m.id] = m
      setMonitoring(byId)
    } catch (err) {
      setError(extractErrorMessage(err, "Talabalar ro'yxatini yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openNotifyForm = (targetId: number | 'all') => {
    setNotifyTargetId(targetId)
    setNotifyTitle('')
    setNotifyBody('')
    setMessage(null)
    setError(null)
  }

  const handleSendNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notifyTargetId || !notifyTitle.trim()) return
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const payload = { title: notifyTitle.trim(), body: notifyBody.trim() || null }
      if (notifyTargetId === 'all') {
        await client.post('/tutor/notify-all', payload)
        setMessage('Barcha biriktirilgan talabalarga xabar yuborildi')
      } else {
        await client.post(`/tutor/notify/${notifyTargetId}`, payload)
        setMessage('Xabar yuborildi')
      }
      setNotifyTargetId(null)
    } catch (err) {
      setError(extractErrorMessage(err, 'Xabar yuborishda xatolik yuz berdi'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-heading)' }}>Biriktirilgan talabalar</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Hurmatli {user.full_name}, tyutor sifatida sizga biriktirilgan talabalar ro'yxati va faollik holati.
            </p>
          </div>
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => openNotifyForm('all')}
              style={{ padding: '8px 16px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Barchasiga xabar yuborish
            </button>
          )}
        </div>

        {notifyTargetId !== null && (
          <form onSubmit={handleSendNotify} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--border-light)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
              {notifyTargetId === 'all'
                ? "To'garak / ilmiy tadbir / imkoniyat haqida barchaga xabar"
                : `Xabar: ${students.find((s) => s.id === notifyTargetId)?.full_name ?? ''}`}
            </div>
            <input
              type="text"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Sarlavha (masalan: Yangi ilmiy to'garak ochildi)"
              required
              style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5 }}
            />
            <textarea
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              rows={2}
              placeholder="Qo'shimcha izoh (ixtiyoriy)"
              style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={sending || !notifyTitle.trim()}
                style={{ padding: '9px 18px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {sending ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
              <button
                type="button"
                onClick={() => setNotifyTargetId(null)}
                style={{ padding: '9px 18px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
              >
                Bekor qilish
              </button>
            </div>
          </form>
        )}

        {students.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 24 }}>
            Hozircha sizga talaba biriktirilmagan
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {students.map((s) => {
              const m = monitoring[s.id]
              return (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{s.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.hemis_id} &middot; {s.faculty} &middot; {s.group_name}
                    </div>
                    {m && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-light)', color: 'var(--text-muted)' }}>
                          Faollik balli: {m.activity_score}
                        </span>
                        {m.meeting_overdue && (
                          <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>
                            Uchrashuv muddati o'tgan
                          </span>
                        )}
                        {m.is_at_risk && !m.meeting_overdue && (
                          <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>
                            Diqqat talab qiladi
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      Biriktirilgan: {new Date(s.assigned_at).toLocaleDateString('uz-UZ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => openNotifyForm(s.id)}
                      style={{ padding: '6px 12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-dark)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                    >
                      Xabar yuborish
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
