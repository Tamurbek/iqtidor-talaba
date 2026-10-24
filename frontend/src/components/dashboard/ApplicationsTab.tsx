import type { Application } from '../../types/dashboard'

interface Props {
  applications: Application[]
  loading: boolean
  error: string | null
  onGoToContests: () => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>Tavsiya etildi</span>
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Rad etilgan</span>
      </span>
    )
  }
  return (
    <span style={{ background: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>Ko'rib chiqilmoqda</span>
    </span>
  )
}

export default function ApplicationsTab({ applications, loading, error, onGoToContests }: Props) {
  return (
    <div className="student-tab-pane" id="student-tab-my-applications" style={{ display: 'block' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0b3b70', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
              <span>Mening topshirgan tanlov va stipendiya arizalarim</span>
            </h3>
            <p style={{ color: '#64748b', fontSize: 13.5, marginTop: 3 }}>Arizalaringizning ekspert komissiyasi tomonidan ko'rib chiqilish holati</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0b3b70', background: '#eff6ff', padding: '6px 14px', borderRadius: 20 }}>Jami {applications.length} ta ariza</span>
            <button onClick={onGoToContests} style={{ background: '#f2721c', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="6" r="2"></circle>
              </svg>
              <span>Nominatsiyalarga o'tish</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 13.5, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '14px 18px' }}>Nominatsiya / Tanlov nomi</th>
                <th style={{ padding: '14px 18px' }}>Topshirilgan sana</th>
                <th style={{ padding: '14px 18px' }}>Portfel bali</th>
                <th style={{ padding: '14px 18px' }}>Komissiya xulosasi</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Ariza holati</th>
              </tr>
            </thead>
            <tbody id="myApplicationsTbody">
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Yuklanmoqda...</td>
                </tr>
              ) : applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0b3b70' }}>{app.contest_name}</td>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: 13 }}>
                      {app.created_at ? new Date(app.created_at).toLocaleDateString('uz-UZ') : ''}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#059669' }}>{app.portfolio_score} ball</td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontSize: 13 }}>
                      {app.decision_note || "1-bosqich saralashida ko'rib chiqilmoqda"}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr id="noAppsRow">
                  <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>
                    Hozircha hech qanday tanlovga ariza yuborilmagan. Chap menyudagi "Nominatsiyalarga ariza" bo'limidan ariza yuborishingiz mumkin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
