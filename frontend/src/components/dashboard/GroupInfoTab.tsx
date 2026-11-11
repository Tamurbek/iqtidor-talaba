import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type { MyGroupResponse } from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  user: User
}

export default function GroupInfoTab({ user }: Props) {
  const [data, setData] = useState<MyGroupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    client
      .get<MyGroupResponse>('/roles/my-group')
      .then(({ data: res }) => setData(res))
      .catch((err) => setError(extractErrorMessage(err, "Ma'lumotlarni yuklab bo'lmadi")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="student-tab-pane" id="student-tab-my-group" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Guruh sardori</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-heading)' }}>{user.group_name} guruhi</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)', marginTop: 8 }}>Guruhim talabalari faoliyati va monitoringi</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>Guruhdoshlaringizning ilmiy yutuqlari, reyting ballari va "Iqtidor" tanlovidagi ishtiroki</p>
          </div>
          <button onClick={load} style={{ background: 'var(--border-light)', color: 'var(--text-table-header)', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            <span>Yangilash</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }} id="myGroupTable">
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 700 }}>
                <th style={{ padding: '14px 18px' }}>Talaba (F.I.SH.)</th>
                <th style={{ padding: '14px 18px' }}>HEMIS ID</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>O'rtacha GPA</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Tasdiqlangan yutuqlar</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Portfel balli</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Tanlov arizalari</th>
              </tr>
            </thead>
            <tbody id="myGroupTbody">
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Ma'lumotlar yuklanmoqda...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              ) : !data || data.students.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Guruhda talabalar topilmadi</td>
                </tr>
              ) : (
                data.students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', background: s.is_starosta ? '#fffbeb' : undefined }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                        {s.full_name}
                        {s.is_starosta && (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 12, fontSize: 11, marginLeft: 6, fontWeight: 700 }}>Guruh sardori</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>{s.hemis_id}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 700, color: 'var(--text-dark)' }}>{s.avg_gpa.toFixed(2)}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{s.approved_achievements} ta</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 800, color: 'var(--text-heading)' }}>{s.portfolio_points} ball</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                      {s.contests_applied > 0 ? (
                        `${s.contests_applied} ta ariza topshirgan`
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Ariza yo'q</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
