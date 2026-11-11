import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { StarostaGroup, StarostaStudent } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  groups: StarostaGroup[] | null
  loading: boolean
  error: string | null
  onStarostaAssigned: (groupName: string, studentId: number) => void
  onStarostaRevoked: (groupName: string) => void
  showToast: ShowToast
}

const thStyle: React.CSSProperties = { padding: '14px 20px' }
const tdStyle: React.CSSProperties = { padding: '16px 20px' }

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
)

export default function StarostasTab({ groups, loading, error, onStarostaAssigned, onStarostaRevoked, showToast }: Props) {
  const [pickerGroup, setPickerGroup] = useState<StarostaGroup | null>(null)
  const [justAssigned, setJustAssigned] = useState<Record<string, boolean>>({})
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [revokingGroup, setRevokingGroup] = useState<string | null>(null)

  const list = groups ?? []

  useEffect(() => {
    if (!pickerGroup) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerGroup(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerGroup])

  const openAssignStarostaModal = (group: StarostaGroup) => {
    if (!group.students || group.students.length === 0) {
      showToast(`${group.group_name} guruhida ro'yxatdan o'tgan talabalar topilmadi.`, 'info')
      return
    }
    setPickerGroup(group)
  }

  const executeAssignStarosta = async (groupName: string, student: StarostaStudent) => {
    setAssigningId(student.id)
    try {
      const { data } = await client.post<{ message?: string }>('/roles/starostas/assign', { group_name: groupName, student_id: student.id })
      setPickerGroup(null)
      onStarostaAssigned(groupName, student.id)
      setJustAssigned((prev) => ({ ...prev, [groupName]: true }))
      showToast(data.message || `${student.full_name} guruh sardori etib tayinlandi!`, 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Tayinlashda xatolik yuz berdi'), 'error')
    } finally {
      setAssigningId(null)
    }
  }

  const executeRevokeStarosta = async (group: StarostaGroup) => {
    if (!window.confirm(`${group.group_name} guruhidan ${group.starosta?.full_name ?? ''} sardorligini bekor qilishni tasdiqlaysizmi?`)) {
      return
    }
    setRevokingGroup(group.group_name)
    try {
      const { data } = await client.post<{ message?: string }>('/roles/starostas/revoke', { group_name: group.group_name })
      onStarostaRevoked(group.group_name)
      setJustAssigned((prev) => ({ ...prev, [group.group_name]: false }))
      showToast(data.message || `${group.group_name} guruhi sardorligi bekor qilindi`, 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, 'Bekor qilishda xatolik yuz berdi'), 'error')
    } finally {
      setRevokingGroup(null)
    }
  }

  const currentStarostaId = pickerGroup?.starosta ? pickerGroup.starosta.id : null

  return (
    <div id="tab-content-starostas-management" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>Guruh sardorlari boshqaruvi</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>Iqtidorli bo'lim boshlig'i tomonidan har bir akademik guruhga bitta mas'ul guruh sardorini tayinlash va monitoring qilish</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: '#eff6ff', color: '#0284c7', padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700 }}>
              Jami guruhlar: {list.length} ta
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }} id="starostasTable">
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 700 }}>
                <th style={thStyle}>Guruh</th>
                <th style={thStyle}>Fakultet va yo'nalish</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Kurs</th>
                <th style={thStyle}>Tayinlangan Guruh sardori</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Talabalar soni</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              )}
              {!loading && !error && list.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Hozircha akademik guruhlar mavjud emas.</td>
                </tr>
              )}
              {!loading && !error && list.map((g) => (
                <tr key={g.group_name} id={`group-row-${g.group_name}`} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}>
                  <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--text-heading)', fontSize: 15, whiteSpace: 'nowrap' }}>
                    {g.group_name}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{g.direction}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.faculty}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ background: 'var(--border-light)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {g.course}-kurs
                    </span>
                  </td>
                  <td style={tdStyle} id={`starosta-cell-${g.group_name}`}>
                    {g.starosta ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, border: '1px solid #bfdbfe' }}>
                          <StarIcon />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{g.starosta.full_name}</div>
                          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>
                            {justAssigned[g.group_name] ? 'Guruh sardori etib tayinlandi' : `HEMIS ID: ${g.starosta.hemis_id}`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Tayinlanmagan
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {g.students.length} nafar
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button type="button" onClick={() => openAssignStarostaModal(g)} style={{ background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="8.5" cy="7" r="4"></circle>
                          <line x1="20" y1="8" x2="20" y2="14"></line>
                          <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        <span>{g.starosta ? "Sardorni almashtirish" : "Sardor tayinlash"}</span>
                      </button>
                      {g.starosta && (
                        <button
                          type="button"
                          disabled={revokingGroup === g.group_name}
                          onClick={() => executeRevokeStarosta(g)}
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {revokingGroup === g.group_name ? 'Bekor qilinmoqda...' : 'Bekor qilish'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pickerGroup && (
        <div id="starostaPickerOverlay" role="dialog" aria-modal="true" aria-labelledby="starostaPickerTitle" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-white)', borderRadius: 16, maxWidth: 520, width: '100%', padding: 26, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
              <div>
                <h3 id="starostaPickerTitle" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-heading)' }}>{pickerGroup.group_name} guruhi sardori</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Guruhdan bitta iqtidorli talabani guruh sardori qilib belgilang</p>
              </div>
              <button type="button" onClick={() => setPickerGroup(null)} aria-label="Yopish" title="Yopish" style={{ background: 'none', border: 'none', padding: 4, borderRadius: 6, color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {pickerGroup.students.map((s) => {
                const isCurrent = s.id === currentStarostaId
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: `1px solid ${isCurrent ? '#0b3b70' : '#e2e8f0'}`, borderRadius: 8, marginBottom: 8, background: isCurrent ? '#f0f7ff' : '#ffffff' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{s.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        HEMIS ID: {s.hemis_id}{' '}
                        {isCurrent && (
                          <>
                            | <strong style={{ color: 'var(--text-heading)' }}>Amaldagi guruh sardori</strong>
                          </>
                        )}
                      </div>
                    </div>
                    <button type="button" disabled={assigningId !== null} onClick={() => executeAssignStarosta(pickerGroup.group_name, s)} style={{ background: isCurrent ? '#059669' : '#0b3b70', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {isCurrent ? 'Qayta tasdiqlash' : 'Guruh sardori etib tayinlash'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
