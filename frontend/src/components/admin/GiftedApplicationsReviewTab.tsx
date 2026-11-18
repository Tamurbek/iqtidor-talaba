import { useState } from 'react'
import client from '../../api/client'
import type { AdminGiftedApplication } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import Pagination from '../common/Pagination'
import SelectionPeriodsPanel from './SelectionPeriodsPanel'

interface Props {
  applications: AdminGiftedApplication[] | null
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onApplicationUpdated: (app: AdminGiftedApplication) => void
  showToast: ShowToast
  canManagePeriods: boolean
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

export default function GiftedApplicationsReviewTab({ applications, loading, error, page, totalPages, total, pageSize, onPageChange, onApplicationUpdated, showToast, canManagePeriods }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowHighlight, setRowHighlight] = useState<Record<number, string>>({})

  const review = async (id: number, status: 'approved' | 'rejected') => {
    const note =
      status === 'approved'
        ? window.prompt('Komissiya xulosasi (Nizom 14.5-modda):', 'Nizom talablariga muvofiq iqtidorli talaba sifatida saralashga qabul qilindi')
        : window.prompt('Komissiya xulosasi — rad etish sababi:', '')
    if (note === null) return
    if (!note.trim()) {
      showToast('Komissiya xulosasini kiriting', 'error')
      return
    }

    setBusyId(id)
    try {
      const { data } = await client.post<AdminGiftedApplication>(`/gifted-applications/${id}/review`, { status, decision_note: note })
      onApplicationUpdated(data)
      setRowHighlight((prev) => ({ ...prev, [id]: status === 'approved' ? 'var(--badge-success-bg)' : 'var(--badge-danger-bg)' }))
      showToast('Qaror muvaffaqiyatli saqlandi!', 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const list = applications ?? []

  return (
    <div id="tab-content-gifted-applications" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <SelectionPeriodsPanel canManage={canManagePeriods} showToast={showToast} />
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Iqtidorli talaba sifatida saralash arizalari</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Nizom 7.1/9/10-modda: talabalarning dasturga qabul qilinish arizalari</p>
          </div>
          <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Jami {list.length} ta ariza
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 600 }}>
                <th style={thStyle}>Talaba</th>
                <th style={thStyle}>Fakultet / yo'nalish</th>
                <th style={thStyle}>Motivatsiya</th>
                <th style={thStyle}>Holati</th>
                <th style={thStyle}>Ball (qaror paytida)</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Qaror</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} role="alert" style={{ padding: 24, textAlign: 'center', color: 'var(--badge-danger-text)' }}>{error}</td>
                </tr>
              ) : list.length > 0 ? (
                list.map((app) => (
                  <tr key={app.id} id={`row-gifted-app-${app.id}`} style={{ borderBottom: '1px solid var(--border-light)', background: rowHighlight[app.id] }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{app.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>HEMIS ID: {app.hemis_id}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(app.created_at)}</div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-table-header)', fontSize: 13 }}>
                      {app.faculty || '—'} {app.course ? `/ ${app.course}-kurs` : ''}
                      {app.direction && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.direction}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13, color: 'var(--text-dark)', maxWidth: 320 }}>
                      {app.motivation_text || <span style={{ color: 'var(--text-light)' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      {app.status === 'approved' ? (
                        <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Qabul qilindi</span>
                      ) : app.status === 'rejected' ? (
                        <span style={{ background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Rad etilgan</span>
                      ) : (
                        <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Ko'rib chiqilmoqda</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>
                      {app.score_at_review != null ? (
                        <>
                          <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{app.score_at_review} / 100</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.tier_at_review}</div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                      {app.decision_note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{app.decision_note}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {app.status === 'pending' ? (
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button type="button" disabled={busyId === app.id} onClick={() => review(app.id, 'approved')} style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Qabul qilish
                          </button>
                          <button type="button" disabled={busyId === app.id} onClick={() => review(app.id, 'rejected')} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>
                    Hozircha saralashga topshirilgan arizalar mavjud emas.
                  </td>
                </tr>
              )}
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
