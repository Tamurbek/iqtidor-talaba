import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type { Meeting, MeetingWithStudent } from '../../types/dashboard'
import type { PaginatedResponse } from '../../types/pagination'
import { extractErrorMessage } from '../../types/dashboard'
import Pagination from '../common/Pagination'

const PAGE_SIZE = 10

interface MeetingStudentOption {
  id: number
  full_name: string
  hemis_id: string
  group_name: string | null
}

interface Props {
  user: User
  /** Ilmiy rahbar/tyutor kabinetida ko'rinishi uchun (Nizom 20-modda: uchrashuv yozish). */
  mode?: 'student' | 'supervisor' | 'tutor'
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

export default function MeetingsTab({ user, mode = 'student' }: Props) {
  const isStaff = mode === 'supervisor' || mode === 'tutor'

  const [myMeetings, setMyMeetings] = useState<Meeting[]>([])
  const [recordedMeetings, setRecordedMeetings] = useState<MeetingWithStudent[]>([])
  const [students, setStudents] = useState<MeetingStudentOption[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [studentId, setStudentId] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [summary, setSummary] = useState('')
  const [agreedTasks, setAgreedTasks] = useState('')
  const [hasConcern, setHasConcern] = useState(false)
  const [concernNote, setConcernNote] = useState('')
  const [helpAction, setHelpAction] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isStaff) {
        const [listRes, studentsRes] = await Promise.all([
          client.get<PaginatedResponse<MeetingWithStudent>>('/meetings', { params: { page, page_size: PAGE_SIZE } }),
          client.get<MeetingStudentOption[]>('/meetings/my-students'),
        ])
        setRecordedMeetings(listRes.data.items)
        setTotal(listRes.data.total)
        setTotalPages(listRes.data.total_pages)
        setStudents(studentsRes.data)
      } else {
        const { data } = await client.get<Meeting[]>('/meetings/me')
        setMyMeetings(data)
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Ma'lumotlarni yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [isStaff, page])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setStudentId('')
    setMeetingDate('')
    setSummary('')
    setAgreedTasks('')
    setHasConcern(false)
    setConcernNote('')
    setHelpAction('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !meetingDate || !summary.trim()) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await client.post('/meetings', {
        student_id: parseInt(studentId, 10),
        meeting_date: meetingDate,
        summary: summary.trim(),
        agreed_tasks: agreedTasks.trim() || null,
        has_concern: hasConcern,
        concern_note: hasConcern ? concernNote.trim() || null : null,
        help_action: hasConcern ? helpAction.trim() || null : null,
      })
      setMessage('Uchrashuv yozuvi qo\'shildi')
      resetForm()
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, 'Uchrashuv yozishda xatolik yuz berdi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu uchrashuv yozuvini o'chirishni tasdiqlaysizmi?")) return
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      await client.delete(`/meetings/${id}`)
      setMessage("Uchrashuv yozuvi o'chirildi")
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, "Uchrashuvni o'chirishda xatolik yuz berdi"))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  if (isStaff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
        )}
        {message && (
          <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
        )}

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-heading)' }}>Yangi uchrashuv yozish</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Nizom 20-moddasiga muvofiq, talaba bilan oyiga kamida 1 marta uchrashuv o'tkazilishi va yozib qo'yilishi kerak.
          </p>
          {students.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hozircha sizga biriktirilgan talaba yo'q</div>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5 }}
              >
                <option value="">Talabani tanlang</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.hemis_id}, {s.group_name})</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
                style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5 }}
              />
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Muhokama qilingan masalalar"
                required
                style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
              />
              <textarea
                value={agreedTasks}
                onChange={(e) => setAgreedTasks(e.target.value)}
                rows={2}
                placeholder="Kelishilgan vazifalar (ixtiyoriy)"
                style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dark)', cursor: 'pointer' }}>
                <input type="checkbox" checked={hasConcern} onChange={(e) => setHasConcern(e.target.checked)} />
                Talabada qiyinchilik/muammo aniqlandi (Nizom 17.4-modda)
              </label>
              {hasConcern && (
                <>
                  <textarea
                    value={concernNote}
                    onChange={(e) => setConcernNote(e.target.value)}
                    rows={2}
                    placeholder="Qiyinchilik/muammo tavsifi"
                    style={{ padding: '10px 12px', border: '1px solid var(--badge-danger-border)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
                  />
                  <textarea
                    value={helpAction}
                    onChange={(e) => setHelpAction(e.target.value)}
                    rows={2}
                    placeholder="Belgilangan yordam chorasi"
                    style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, resize: 'vertical' }}
                  />
                </>
              )}
              <button
                type="submit"
                disabled={submitting || !studentId || !meetingDate || !summary.trim()}
                style={{ alignSelf: 'flex-start', padding: '10px 20px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {submitting ? 'Saqlanmoqda...' : 'Uchrashuvni saqlash'}
              </button>
            </form>
          )}
        </div>

        {recordedMeetings.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>
            Hozircha uchrashuv yozuvi mavjud emas
          </div>
        ) : (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Uchrashuvlar tarixi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recordedMeetings.map((m) => (
                <div key={m.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{m.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.student_hemis_id} &middot; {m.student_group_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{m.summary}</div>
                      {m.agreed_tasks && (
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}><strong>Vazifalar:</strong> {m.agreed_tasks}</div>
                      )}
                      {m.has_concern && (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', fontSize: 12.5 }}>
                          <div><strong>Qiyinchilik:</strong> {m.concern_note || '—'}</div>
                          {m.help_action && <div style={{ marginTop: 4 }}><strong>Yordam chorasi:</strong> {m.help_action}</div>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{new Date(m.meeting_date).toLocaleDateString('uz-UZ')}</span>
                      {m.created_by === user.id && (
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => handleDelete(m.id)}
                          style={{ padding: '6px 12px', border: '1px solid var(--badge-danger-border)', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                        >
                          O'chirish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
      )}

      {myMeetings.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>
          Hozircha sizning ilmiy rahbaringiz yoki tyutoringiz tomonidan uchrashuv yozuvi kiritilmagan
        </div>
      ) : (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Uchrashuvlar tarixi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myMeetings.map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text-dark)' }}>{m.summary}</div>
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{new Date(m.meeting_date).toLocaleDateString('uz-UZ')}</span>
                </div>
                {m.agreed_tasks && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}><strong>Vazifalar:</strong> {m.agreed_tasks}</div>
                )}
                {m.has_concern && m.help_action && (
                  <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--badge-warning-bg, #fff7ed)', color: 'var(--badge-warning-text, #9a3412)', fontSize: 12.5 }}>
                    <strong>Belgilangan yordam chorasi:</strong> {m.help_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
