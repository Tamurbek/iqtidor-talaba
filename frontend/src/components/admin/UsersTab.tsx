import { useState } from 'react'
import client from '../../api/client'
import type { AdminUser, MessageResponse, RoleItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import { AddUserModal, EditUserModal, ResetPasswordModal } from './UserModals'

interface Props {
  users: AdminUser[] | null
  roles?: RoleItem[] | null
  loading: boolean
  error: string | null
  currentUserId: number
  onReload: () => void
  showToast: ShowToast
}

const thStyle: React.CSSProperties = { padding: '14px 20px' }
const tdStyle: React.CSSProperties = { padding: '14px 20px' }
const filterSelectStyle: React.CSSProperties = { padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-white)', outline: 'none', cursor: 'pointer' }
const roleBadge = (bg: string, color: string, fontWeight = 700): React.CSSProperties => ({ background: bg, color, padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight })

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'admin':
      return <span style={roleBadge('#f3e8ff', '#7e22ce')}>Super Administrator</span>
    case 'department_head':
      return <span style={roleBadge('#e0e7ff', '#4338ca')}>Bo'lim boshlig'i</span>
    case 'coordinator':
      return <span style={roleBadge('#e0f2fe', '#0369a1')}>Fakultet koordinatori</span>
    case 'starosta':
      return <span style={roleBadge('#fef3c7', '#b45309')}>Guruh sardori</span>
    case 'jury_expert':
      return <span style={roleBadge('#fae8ff', '#a21caf')}>Hakam / Ekspert</span>
    default:
      return <span style={roleBadge('#ecfdf5', '#047857', 600)}>Talaba</span>
  }
}

type ModalState =
  | { kind: 'add' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | null

export default function UsersTab({ users, roles, loading, error, currentUserId, onReload, showToast }: Props) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState<ModalState>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const list = users ?? []
  const q = search.toLowerCase().trim()
  const filtered = list.filter((u) => {
    const matchesSearch = !q || u.full_name.toLowerCase().includes(q) || u.login.toLowerCase().includes(q)
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const status = u.is_active ? 'active' : 'inactive'
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleSaved = (message: string, reload = true) => {
    setModal(null)
    showToast(message, 'success')
    if (reload) onReload()
  }

  const toggleUserStatus = async (u: AdminUser) => {
    const actionText = u.is_active ? 'bloklash' : 'faollashtirish'
    if (!window.confirm(`'${u.full_name}' akkauntini ${actionText}ni xohlaysizmi?`)) return

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

  const deleteUserPermanently = async (u: AdminUser) => {
    if (!window.confirm(`'${u.full_name}' akkauntini tizimdan butunlay o'chirib tashlashni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return

    setBusyId(u.id)
    try {
      const { data } = await client.delete<MessageResponse>(`/users/${encodeURIComponent(u.id)}`, { params: { permanent: true } })
      showToast(data.message || "Foydalanuvchi o'chirildi", 'success')
      onReload()
    } catch (err) {
      showToast(extractErrorMessage(err, "Foydalanuvchini o'chirishda xatolik"), 'error')
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
          <button type="button" onClick={() => setModal({ kind: 'add' })} style={{ background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(11,59,112,0.25)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Yangi foydalanuvchi qo'shish</span>
          </button>
        </div>

        <div style={{ padding: '16px 26px', background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input type="text" id="userSearchInput" aria-label="Foydalanuvchilarni qidirish" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="F.I.SH. yoki login (HEMIS ID) bo'yicha qidiruv..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 14px 9px 36px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: 11 }} aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select id="userRoleFilter" aria-label="Rol bo'yicha filtr" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={filterSelectStyle}>
              <option value="all">Barcha rollar</option>
              <option value="admin">Administrator (Super admin)</option>
              <option value="department_head">Iqtidorli bo'lim boshlig'i</option>
              <option value="coordinator">Fakultet koordinatori</option>
              <option value="starosta">Guruh sardori</option>
              <option value="jury_expert">Hakam / Ekspert</option>
              <option value="student">Talaba</option>
            </select>

            <select id="userStatusFilter" aria-label="Holat bo'yicha filtr" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterSelectStyle}>
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
                  <td colSpan={6} role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
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
                      <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>(Sizning profilingiz)</span>
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
                      <span style={roleBadge('#ecfdf5', '#059669')}>Faol</span>
                    ) : (
                      <span style={roleBadge('#fef2f2', '#dc2626')}>Nofaol</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <button type="button" className="btn-edit-user" onClick={() => setModal({ kind: 'edit', user: u })} style={{ background: 'var(--border-light)', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Ma'lumotlarni tahrirlash">
                        Tahrirlash
                      </button>
                      <button type="button" className="btn-reset-user-pass" onClick={() => setModal({ kind: 'reset', user: u })} style={{ background: 'var(--bg-white)7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Parolni yangilash">
                        Parol
                      </button>
                      {u.id !== currentUserId && (
                        <>
                          <button
                            type="button"
                            className="btn-toggle-user-status"
                            disabled={busyId === u.id}
                            onClick={() => toggleUserStatus(u)}
                            style={{ background: u.is_active ? '#fef2f2' : '#ecfdf5', color: u.is_active ? '#dc2626' : '#059669', border: `1px solid ${u.is_active ? '#fecaca' : '#a7f3d0'}`, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            title={u.is_active ? 'Akkauntni bloklash' : 'Akkauntni faollashtirish'}
                          >
                            {u.is_active ? 'Bloklash' : 'Faollashtirish'}
                          </button>
                          <button type="button" className="btn-delete-user" disabled={busyId === u.id} onClick={() => deleteUserPermanently(u)} style={{ background: 'var(--bg-white)1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Tizimdan butunlay o'chirish">
                            O'chirish
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.kind === 'add' && <AddUserModal onClose={() => setModal(null)} onSaved={(m) => handleSaved(m)} />}
      {modal?.kind === 'edit' && <EditUserModal user={modal.user} roles={roles} onClose={() => setModal(null)} onSaved={(m) => handleSaved(m)} />}
      {modal?.kind === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onSaved={(m) => handleSaved(m, false)} />}
    </div>
  )
}
