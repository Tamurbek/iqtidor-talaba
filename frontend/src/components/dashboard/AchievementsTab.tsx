import type { Achievement } from '../../types/dashboard'
import { getAchievementCategoryLabel } from '../../types/dashboard'
import { withBase } from '../../utils/basePath'

interface Props {
  achievements: Achievement[]
  loading: boolean
  error: string | null
  onGoToUpload: () => void
}

function StatusBadge({ item }: { item: Achievement }) {
  if (item.status === 'approved') {
    return (
      <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>Tasdiqlangan</span>
      </span>
    )
  }
  if (item.status === 'rejected') {
    return (
      <div>
        <span style={{ background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span>Rad etilgan</span>
        </span>
        {item.rejection_reason && (
          <div style={{ fontSize: 11, color: 'var(--badge-danger-text)', marginTop: 3 }}>Sabab: {item.rejection_reason}</div>
        )}
      </div>
    )
  }
  return (
    <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>Ko'rib chiqilmoqda</span>
    </span>
  )
}

export default function AchievementsTab({ achievements, loading, error, onGoToUpload }: Props) {
  return (
    <div className="student-tab-pane" id="student-tab-my-achievements" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>Mening topshirgan yutuqlarim va tekshiruv holati</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>Moderator tomonidan tasdiqlangan ilmiy maqola, sertifikat va diplomlaringiz</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--badge-success-text)', background: 'var(--badge-success-bg)', padding: '6px 14px', borderRadius: 20 }}>Jami {achievements.length} ta qayd</span>
            <button onClick={onGoToUpload} style={{ background: '#0070f3', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Yangi yutuq yuklash</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 10, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', border: '1px solid var(--badge-danger-border)', fontSize: 13.5, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 600 }}>
                <th style={{ padding: '14px 18px' }}>Yutuq turi (Nizom mezoni)</th>
                <th style={{ padding: '14px 18px' }}>Hujjat sarlavhasi</th>
                <th style={{ padding: '14px 18px' }}>Fayl</th>
                <th style={{ padding: '14px 18px' }}>Berilgan ball</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Tekshiruv holati</th>
              </tr>
            </thead>
            <tbody id="studentAchievementsTbody">
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              ) : achievements.length > 0 ? (
                achievements.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {getAchievementCategoryLabel(item.achievement_type)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.title}</div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.file_url ? (
                        <a href={withBase(item.file_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-heading)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          <span>Ko'rish</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Mavjud emas</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.status === 'approved' ? (
                        <span style={{ fontWeight: 700, color: 'var(--badge-success-text)' }}>+{item.points} ball</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: 13 }}>(kutilmoqda)</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <StatusBadge item={item} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr id="noAchRow">
                  <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-light)' }}>
                    Hozircha ilmiy ish yoki sertifikat yuklamagansiz. Chap menyudagi "Yutuq yuklash" bo'limi orqali yangi hujjat topshiring.
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
