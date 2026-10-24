import { useState } from 'react'
import client from '../../api/client'
import type { AdminAchievement } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  achievements: AdminAchievement[] | null
  loading: boolean
  error: string | null
  pendingCount: number | null
  approvedCount: number | null
  rankingCount: number | null
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
  onAchievementUpdated,
  showToast,
}: Props) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowHighlight, setRowHighlight] = useState<Record<number, string>>({})

  const approveAchievement = async (item: AdminAchievement) => {
    const recPts = item.points || 20
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
      setRowHighlight((prev) => ({ ...prev, [item.id]: '#f0fdf4' }))
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
      setRowHighlight((prev) => ({ ...prev, [item.id]: '#fef2f2' }))
      showToast(data.message || 'Ariza rad etildi.', 'info')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div id="tab-content-moderation" className="tab-pane" style={{ display: 'block' }}>
      <div style={{ background: 'linear-gradient(135deg, #072950 0%, #0b3b70 100%)', borderRadius: 16, padding: '18px 24px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, boxShadow: '0 4px 20px rgba(7, 41, 80, 0.12)', marginBottom: 20 }}>
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
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: 20, fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>
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
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Jami iqtidorli talabalar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0b3b70', marginTop: 6 }}>{rankingCount ?? '—'} nafar</div>
          <p style={{ fontSize: 11.5, color: '#059669', marginTop: 2, fontWeight: 600 }}>Ro'yxatga olingan talabalar</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Kutilayotgan arizalar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ea580c', marginTop: 6 }} id="kpiPendingCount">{pendingCount ?? '—'} ta</div>
          <p style={{ fontSize: 11.5, color: '#ea580c', fontWeight: 600, marginTop: 2 }}>Moderatsiya kutilmoqda</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Tasdiqlangan ishlar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 6 }} id="kpiApprovedCount">{approvedCount ?? '—'} ta</div>
          <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Maqola, patent va diplomlar</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>Faol tanlovlar</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0b3b70', marginTop: 6 }}>5 ta</div>
          <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Stipendiya va ko'rik-tanlov</p>
        </div>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0b3b70' }}>Talabalar tomonidan yuborilgan ilmiy ishlar va sertifikatlar</h3>
          <span style={{ fontSize: 13, color: '#64748b' }}>Tasdiqlash orqali talabaga iqtidor reyting bali beriladi</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={thStyle}>Talaba</th>
                <th style={thStyle}>Fakultet</th>
                <th style={thStyle}>Yutuq turi</th>
                <th style={thStyle}>Hujjat nomi</th>
                <th style={thStyle}>Fayl</th>
                <th style={thStyle}>Holati</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Yuklanmoqda...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              )}
              {!loading && !error && achievements && achievements.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Hozircha yuborilgan ilmiy ishlar mavjud emas.</td>
                </tr>
              )}
              {!loading && !error && achievements?.map((item) => (
                <tr key={item.id} id={`row-ach-${item.id}`} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', background: rowHighlight[item.id] }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.student_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>HEMIS ID: {item.hemis_id}</div>
                  </td>
                  <td style={{ ...tdStyle, color: '#475569', fontSize: 13 }}>{item.faculty}</td>
                  <td style={tdStyle}>
                    <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {item.achievement_type}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#0b3b70' }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.description}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {item.file_url ? (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0b3b70', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>Ko'rish</span>
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Mavjud emas</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {item.status === 'approved' ? (
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Tasdiqlangan (+{item.points} ball)</span>
                      </span>
                    ) : item.status === 'rejected' ? (
                      <div>
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          <span>Rad etilgan</span>
                        </span>
                        {item.rejection_reason && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Sabab: {item.rejection_reason}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ background: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Kutilmoqda</span>
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
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
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Ko'rib chiqilgan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
