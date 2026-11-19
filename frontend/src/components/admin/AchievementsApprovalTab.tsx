import { useState } from 'react'
import client from '../../api/client'
import type { AdminAchievement } from '../../types/admin'
import { ACHIEVEMENT_SCOPES, extractErrorMessage, getAchievementCategoryLabel } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import Pagination from '../common/Pagination'
import { withBase } from '../../utils/basePath'

interface Props {
  achievements: AdminAchievement[] | null
  loading: boolean
  error: string | null
  pendingCount: number | null
  approvedCount: number | null
  rankingCount: number | null
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onAchievementUpdated: (id: number, patch: Partial<AdminAchievement>) => void
  showToast: ShowToast
}

const thStyle: React.CSSProperties = { padding: '14px 20px' }
const tdStyle: React.CSSProperties = { padding: '14px 20px' }

export default function AchievementsApprovalTab({
  achievements,
  loading,
  error,
  pendingCount,
  approvedCount,
  rankingCount,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onAchievementUpdated,
  showToast,
}: Props) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowHighlight, setRowHighlight] = useState<Record<number, string>>({})

  const approveAchievement = async (item: AdminAchievement) => {
    const recPts = item.points || 1
    const input = window.prompt(
      `${item.student_name} uchun tasdiqlanadigan reyting balini kiriting:\nReyting bali (tavsiya etilgan: ${recPts})`,
      recPts.toString()
    )
    if (input === null || isNaN(parseFloat(input))) return
    const points = parseFloat(input)

    setBusyId(item.id)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/achievements/${item.id}/approve`, { points })
      onAchievementUpdated(item.id, { status: 'approved', points, rejection_reason: null })
      setRowHighlight((prev) => ({ ...prev, [item.id]: 'var(--badge-success-bg)' }))
      showToast(data.message || `Ariza tasdiqlandi va talabaga +${points} ball qo'shildi!`, 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const rejectAchievement = async (item: AdminAchievement) => {
    const reason = window.prompt(
      'Rad etish sababini kiriting (ushbu izoh talaba kabinetida aks etadi):',
      "Hujjat talablariga yoki nizomga to'liq mos kelmaydi"
    )
    if (reason === null || !reason.trim()) return

    setBusyId(item.id)
    try {
      const { data } = await client.post<{ success: boolean; message?: string }>(`/achievements/${item.id}/reject`, { reason: reason.trim() })
      onAchievementUpdated(item.id, { status: 'rejected', rejection_reason: reason.trim() })
      setRowHighlight((prev) => ({ ...prev, [item.id]: 'var(--badge-danger-bg)' }))
      showToast(data.message || 'Ariza rad etildi.', 'info')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div id="tab-content-moderation" className="tab-pane" style={{ display: 'block' }}>
      <div style={{ background: 'linear-gradient(135deg, #072950 0%, var(--primary-color) 100%)', borderRadius: 16, padding: '18px 24px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, boxShadow: '0 4px 20px rgba(7, 41, 80, 0.12)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', margin: 0 }}>Iqtidorli talabalar boshqaruv paneli</h2>
              <span style={{ background: '#f2721c', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                Administrator
              </span>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: 20, fontSize: 11, color: 'var(--border-color)', fontWeight: 600 }}>
                Bo'lim boshlig'i
              </span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 12.5, margin: '3px 0 0' }}>
              Talabalar ilmiy faoliyati, tanlov arizalari va 1-bosqich sinov imtihonlari monitoringi
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '6px 14px', borderRadius: 20, fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>Boshqaruv seansi faol</span>
          </div>
        </div>
      </div>

      <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>Jami iqtidorli talabalar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-heading)', marginTop: 6 }}>{rankingCount ?? '—'} nafar</div>
          <p style={{ fontSize: 11.5, color: 'var(--badge-success-text)', marginTop: 2, fontWeight: 600 }}>Ro'yxatga olingan talabalar</p>
        </div>

        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>Kutilayotgan arizalar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--badge-warning-text)', marginTop: 6 }} id="kpiPendingCount">{pendingCount ?? '—'} ta</div>
          <p style={{ fontSize: 11.5, color: 'var(--badge-warning-text)', fontWeight: 600, marginTop: 2 }}>Moderatsiya kutilmoqda</p>
        </div>

        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>Tasdiqlangan ishlar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--badge-success-text)', marginTop: 6 }} id="kpiApprovedCount">{approvedCount ?? '—'} ta</div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Maqola, patent va diplomlar</p>
        </div>

        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>Faol tanlovlar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-heading)', marginTop: 6 }}>5 ta</div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Stipendiya va ko'rik-tanlov</p>
        </div>
      </div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Talabalar tomonidan yuborilgan ilmiy ishlar va sertifikatlar</h3>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tasdiqlash orqali talabaga iqtidor reyting bali beriladi</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 600 }}>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Talaba</th>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Fakultet</th>
                <th style={{ ...thStyle, minWidth: 170 }}>Yutuq turi</th>
                <th style={{ ...thStyle, minWidth: 280 }}>Hujjat nomi</th>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Fayl</th>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Holati</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} role="alert" style={{ padding: 24, textAlign: 'center', color: 'var(--badge-danger-text)' }}>{error}</td>
                </tr>
              )}
              {!loading && !error && achievements && achievements.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Hozircha yuborilgan ilmiy ishlar mavjud emas.</td>
                </tr>
              )}
              {!loading && !error && achievements?.map((item) => (
                <tr key={item.id} id={`row-ach-${item.id}`} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s', background: rowHighlight[item.id] }}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.student_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>HEMIS ID: {item.hemis_id}</div>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-table-header)', fontSize: 13, whiteSpace: 'nowrap' }}>{item.faculty}</td>
                  <td style={{ ...tdStyle, minWidth: 170, maxWidth: 220 }}>
                    <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'normal', overflowWrap: 'break-word', display: 'inline-block' }}>
                      {getAchievementCategoryLabel(item.achievement_type)}
                    </span>
                    {item.scope && ACHIEVEMENT_SCOPES[item.scope] && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ACHIEVEMENT_SCOPES[item.scope].label}</div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>
                    )}
                    {item.co_author_count != null && item.co_author_count > 1 && (
                      <div style={{ fontSize: 12, color: 'var(--badge-info-text)', marginTop: 4 }}>
                        Hammualliflik: {item.co_author_count} muallif, talaba hissasi {item.author_share}% (Nizom 14.3)
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {item.file_url ? (
                      <a href={withBase(item.file_url)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-heading)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>Ko'rish</span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Mavjud emas</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {item.status === 'approved' ? (
                      <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Tasdiqlangan (+{item.points} ball)</span>
                      </span>
                    ) : item.status === 'rejected' ? (
                      <div>
                        <span style={{ background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          <span>Rad etilgan</span>
                        </span>
                        {item.rejection_reason && (
                          <div style={{ fontSize: 11, color: 'var(--badge-danger-text)', marginTop: 3 }}>Sabab: {item.rejection_reason}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Kutilmoqda</span>
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {item.status === 'pending' ? (
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button type="button" disabled={busyId === item.id} onClick={() => approveAchievement(item)} style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Tasdiqlash
                        </button>
                        <button type="button" disabled={busyId === item.id} onClick={() => rejectAchievement(item)} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Rad etish
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Ko'rib chiqilgan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={onPageChange} />
        )}
      </div>
    </div>
  )
}
