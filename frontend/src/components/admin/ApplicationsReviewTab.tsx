import { useState } from 'react'
import client from '../../api/client'
import type { Application } from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  applications: Application[] | null
  loading: boolean
  error: string | null
  onApplicationUpdated: (app: Application) => void
  showToast: ShowToast
}

const thStyle: React.CSSProperties = { padding: '14px 20px' }
const tdStyle: React.CSSProperties = { padding: '14px 20px' }

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

export default function ApplicationsReviewTab({ applications, loading, error, onApplicationUpdated, showToast }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowHighlight, setRowHighlight] = useState<Record<number, string>>({})

  const reviewContestApplication = async (id: number, status: 'approved' | 'rejected') => {
    const note =
      status === 'approved'
        ? window.prompt(
            "Tavsiya etish bo'yicha mas'ul komissiya xulosasini kiriting (ixtiyoriy):",
            'Filial ilmiy kengashi qarori bilan keyingi bosqichga tavsiya etildi'
          )
        : window.prompt(
            'Rad etish sababini kiriting:',
            'Talabaning reyting balli yoki ilmiy ishlari stipendiya talablariga yetarli emas'
          )
    if (note === null) return

    setBusyId(id)
    try {
      const { data } = await client.post<Application>(`/applications/${id}/review`, { status, decision_note: note })
      onApplicationUpdated(data)
      setRowHighlight((prev) => ({ ...prev, [id]: status === 'approved' ? '#f0fdf4' : '#fef2f2' }))
      showToast('Qaror muvaffaqiyatli saqlandi!', 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const list = applications ?? []

  return (
    <div id="tab-content-contests-monitoring" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Stipendiya va tanlovlarga kelib tushgan arizalar</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Prezident, nomdor davlat stipendiyalari va respublika ko'rik-tanlovlari nomzodlari</p>
          </div>
          <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Jami {list.length} ta ariza
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 600 }}>
                <th style={thStyle}>Talaba</th>
                <th style={thStyle}>Fakultet va kurs</th>
                <th style={thStyle}>Tanlov / Stipendiya</th>
                <th style={thStyle}>HEMIS GPA & Faollik</th>
                <th style={thStyle}>Portfel bali</th>
                <th style={thStyle}>Holati</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Komissiya qarori</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              ) : list.length > 0 ? (
                list.map((app) => (
                  <tr key={app.id} id={`row-app-${app.id}`} style={{ borderBottom: '1px solid var(--border-light)', background: rowHighlight[app.id] }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{app.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>HEMIS ID: {app.hemis_id}</div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-table-header)', fontSize: 13 }}>
                      {app.faculty} / {app.course}-kurs
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{app.contest_name}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(app.created_at)}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: '#eff6ff', color: '#0284c7', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>GPA: {app.gpa}</span>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, marginLeft: 4 }}>{app.social_points} ball</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>{app.portfolio_score} ball</span>
                    </td>
                    <td style={tdStyle}>
                      {app.status === 'approved' ? (
                        <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Tavsiya etildi</span>
                        </span>
                      ) : app.status === 'rejected' ? (
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          <span>Rad etilgan</span>
                        </span>
                      ) : (
                        <span style={{ background: 'var(--bg-white)7ed', color: '#ea580c', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>Ko'rib chiqilmoqda</span>
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {app.status === 'pending' ? (
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button type="button" disabled={busyId === app.id} onClick={() => reviewContestApplication(app.id, 'approved')} style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Tavsiya etish
                          </button>
                          <button type="button" disabled={busyId === app.id} onClick={() => reviewContestApplication(app.id, 'rejected')} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Rad etish
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: 12 }}>Ko'rib chiqilgan</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>
                    Hozircha tanlov va stipendiyalarga kelib tushgan arizalar mavjud emas.
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
