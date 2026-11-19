import { useState } from 'react'
import client from '../../api/client'
import { needsPassword } from '../../types/admin'
import type { AdminUser, MessageResponse, RoleItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import { EditUserModal, ResetPasswordModal } from './UserModals'
import HemisSyncButton from './HemisSyncButton'
import Pagination from '../common/Pagination'

interface Props {
  users: AdminUser[] | null
  roles?: RoleItem[] | null
  loading: boolean
  error: string | null
  currentUserId: number
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  search: string
  onSearchChange: (value: string) => void
  roleFilter: string
  onRoleFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  onReload: () => void
  showToast: ShowToast
}

const thStyle: React.CSSProperties = { padding: '14px 20px' }
const tdStyle: React.CSSProperties = { padding: '14px 20px' }
const filterSelectStyle: React.CSSProperties = { padding: '9px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-white)', outline: 'none', cursor: 'pointer' }
const roleBadge = (bg: string, color: string, fontWeight = 700): React.CSSProperties => ({ background: bg, color, padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight })

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'admin':
      return <span style={roleBadge('var(--badge-purple-bg)', 'var(--badge-purple-text)')}>Super Administrator</span>
    case 'leadership':
      return <span style={roleBadge('var(--badge-purple-bg)', 'var(--badge-purple-text)')}>Rahbariyat</span>
    case 'department_head':
      return <span style={roleBadge('#e0e7ff', '#4338ca')}>Bo'lim boshlig'i</span>
    case 'coordinator':
    case 'faculty_coordinator':
      return <span style={roleBadge('var(--badge-info-bg)', 'var(--badge-info-text)')}>Fakultet koordinatori</span>
    case 'dean':
      return <span style={roleBadge('var(--badge-info-bg)', 'var(--badge-info-text)')}>Fakultet dekani</span>
    case 'department_chair':
      return <span style={roleBadge('var(--badge-info-bg)', 'var(--badge-info-text)')}>Kafedra mudiri</span>
    case 'supervisor':
      return <span style={roleBadge('#e0e7ff', '#4338ca')}>Ilmiy rahbar</span>
    case 'tutor':
      return <span style={roleBadge('#e0e7ff', '#4338ca')}>Tyutor</span>
    case 'starosta':
      return <span style={roleBadge('var(--badge-warning-bg)', 'var(--badge-warning-text)')}>Guruh sardori</span>
    case 'jury_expert':
      return <span style={roleBadge('var(--badge-purple-bg)', 'var(--badge-purple-text)')}>Hakam / Ekspert</span>
    case 'student':
      return <span style={roleBadge('var(--badge-success-bg)', 'var(--badge-success-text)', 600)}>Talaba</span>
    default:
      return <span style={roleBadge('var(--bg-light)', 'var(--text-secondary)', 600)}>{role}</span>
  }
}

type ModalState =
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | null

export default function UsersTab({
  users,
  roles,
  loading,
  error,
  currentUserId,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onReload,
  showToast,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const filtered = users ?? []

  const handleSaved = (message: string, reload = true) => {
    setModal(null)
    showToast(message, 'success')
    if (reload) onReload()
  }

  const toggleUserStatus = async (u: AdminUser) => {
    setBusyId(u.id)
    try {
      const { data } = await client.put<MessageResponse>(`/users/${encodeURIComponent(u.id)}`, { is_active: !u.is_active })
      showToast(data.message || 'Holat yangilandi', 'success')
      onReload()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Amalni bajarishda xatolik yuz berdi'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div id="tab-content-users-management" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Tizim foydalanuvchilari boshqaruvi</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Adminlar, fakultet koordinatorlari, bo'lim boshliqlari, hakamlar va talabalar ro'yxati
            </p>
          </div>
          <HemisSyncButton showToast={showToast} onFinished={onReload} />
        </div>

        <div style={{ padding: '16px 26px', background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input type="text" id="userSearchInput" aria-label="Foydalanuvchilarni qidirish" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="F.I.SH. yoki login (HEMIS ID) bo'yicha qidiruv..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 14px 9px 36px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: 11 }} aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select id="userRoleFilter" aria-label="Rol bo'yicha filtr" value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)} style={filterSelectStyle}>
              <option value="all">Barcha rollar</option>
              <option value="admin">Administrator (Super admin)</option>
              <option value="department_head">Iqtidorli bo'lim boshlig'i</option>
              <option value="coordinator">Fakultet koordinatori</option>
              <option value="starosta">Guruh sardori</option>
              <option value="jury_expert">Hakam / Ekspert</option>
              <option value="student">Talaba</option>
            </select>

            <select id="userStatusFilter" aria-label="Holat bo'yicha filtr" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} style={filterSelectStyle}>
              <option value="all">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table id="adminUsersTable" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-table-header)', fontWeight: 600 }}>
                <th style={thStyle}>Foydalanuvchi</th>
                <th style={thStyle}>Login / HEMIS ID</th>
                <th style={thStyle}>Tizimdagi roli</th>
                <th style={thStyle}>Fakultet / Bo'lim</th>
                <th style={thStyle}>Holati</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Amallar</th>
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
                  <td colSpan={6} role="alert" style={{ padding: 24, textAlign: 'center', color: 'var(--badge-danger-text)' }}>{error}</td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Foydalanuvchilar topilmadi.</td>
                </tr>
              )}
              {!loading && !error && filtered.map((u) => (
                <tr key={u.id} className="user-row" data-role={u.role} data-status={u.is_active ? 'active' : 'inactive'} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }} className="user-name">{u.full_name}</div>
                    {u.id === currentUserId && (
                      <span style={{ fontSize: 11, color: 'var(--badge-info-text)', fontWeight: 600 }}>(Sizning profilingiz)</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-table-header)' }} className="user-login">
                    {u.login}
                  </td>
                  <td style={tdStyle}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 13 }}>
                    {u.faculty || "Ko'rsatilmagan"}
                    {u.group_name && (
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-light)' }}>Guruh: {u.group_name}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {u.is_active ? (
                      <span style={roleBadge('var(--badge-success-bg)', 'var(--badge-success-text)')}>Faol</span>
                    ) : (
                      <span style={roleBadge('var(--badge-danger-bg)', 'var(--badge-danger-text)')}>Nofaol</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <button type="button" className="btn-edit-user" onClick={() => setModal({ kind: 'edit', user: u })} style={{ background: 'var(--border-light)', color: 'var(--text-dark)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Rolni almashtirish">
                        Rol
                      </button>
                      {needsPassword(u) && (
                      <button type="button" className="btn-reset-user-pass" onClick={() => setModal({ kind: 'reset', user: u })} style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', border: '1px solid var(--badge-warning-border)', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Parolni yangilash">
                        Parol
                      </button>
                      )}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={u.is_active}
                        aria-label={u.is_active ? 'Faol — nofaol qilish' : 'Nofaol — faollashtirish'}
                        title={u.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
                        className="btn-toggle-user-status"
                        disabled={busyId === u.id || u.id === currentUserId}
                        onClick={() => toggleUserStatus(u)}
                        style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, border: 'none', padding: 0, background: u.is_active ? 'var(--badge-success-text)' : 'var(--border-color)', cursor: busyId === u.id || u.id === currentUserId ? 'not-allowed' : 'pointer', opacity: u.id === currentUserId ? 0.5 : 1, transition: 'background 0.15s', flexShrink: 0 }}
                      >
                        <span style={{ position: 'absolute', top: 3, left: u.is_active ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                      </button>
                    </div>
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

      {modal?.kind === 'edit' && <EditUserModal user={modal.user} roles={roles} onClose={() => setModal(null)} onSaved={(m) => handleSaved(m)} />}
      {modal?.kind === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onSaved={(m) => handleSaved(m, false)} />}
    </div>
  )
}
