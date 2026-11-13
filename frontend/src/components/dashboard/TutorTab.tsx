import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type { TutorStudent } from '../../types/admin'
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
 */
export default function TutorTab({ user }: Props) {
  const [students, setStudents] = useState<TutorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get<TutorStudent[]>('/tutor/students')
      setStudents(data)
    } catch (err) {
      setError(extractErrorMessage(err, "Talabalar ro'yxatini yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--text-heading)' }}>Biriktirilgan talabalar</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        Hurmatli {user.full_name}, tyutor sifatida sizga biriktirilgan talabalar ro'yxati.
      </p>

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}

      {!error && students.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 24 }}>
          Hozircha sizga talaba biriktirilmagan
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {students.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{s.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {s.hemis_id} &middot; {s.faculty} &middot; {s.group_name}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                Biriktirilgan: {new Date(s.assigned_at).toLocaleDateString('uz-UZ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
