import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { AdminUser, MessageResponse, RoleItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }
const boxStyle = (maxWidth: number): React.CSSProperties => ({ background: 'var(--bg-white)', borderRadius: 16, width: '100%', maxWidth, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'popIn 0.25s ease' })
const headerStyle: React.CSSProperties = { padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-light)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, background: 'var(--bg-white)', color: 'var(--text-dark)' }
const cancelBtnStyle: React.CSSProperties = { padding: '10px 16px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-table-header)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const errorBoxStyle: React.CSSProperties = { padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }

// Dekan, kafedra mudiri, tyutor, o'qituvchi va rahbariyat rollari HEMIS lavozimidan avtomatik
// beriladi (HEMIS importi); talabalar ham faqat import orqali qo'shiladi.
const HEMIS_MANAGED_ROLES = ['leadership', 'dean', 'faculty_coordinator', 'department_chair', 'tutor', 'supervisor']

const ROLE_OPTIONS_EDIT: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrator (Super admin)' },
  { value: 'department_head', label: "Iqtidorli bo'lim boshlig'i" },
  { value: 'leadership', label: 'Rahbariyat' },
  { value: 'faculty_coordinator', label: 'Fakultet koordinatori' },
  { value: 'dean', label: 'Fakultet dekani' },
  { value: 'department_chair', label: 'Kafedra mudiri' },
  { value: 'supervisor', label: 'Ilmiy rahbar' },
  { value: 'tutor', label: 'Tyutor' },
  { value: 'starosta', label: 'Guruh sardori' },
  { value: 'jury_expert', label: 'Hakam / Ekspert' },
  { value: 'student', label: 'Talaba' },
]

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

function PasswordInput({ id, value, onChange, placeholder, padding, fontSize, btnPadding }: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  padding: string
  fontSize: number
  btnPadding: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input type={visible ? 'text' : 'password'} id={id} required minLength={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, padding, fontSize }} />
      <button type="button" onClick={() => setVisible((v) => !v)} title={visible ? 'Parolni yashirish' : "Parolni ko'rish"} aria-label={visible ? 'Parolni yashirish' : "Parolni ko'rish"} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: btnPadding, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>
    </div>
  )
}

interface BaseModalProps {
  onClose: () => void
  onSaved: (message: string) => void
}

export function EditUserModal({ user, roles, onClose, onSaved }: BaseModalProps & { user: AdminUser; roles?: RoleItem[] | null }) {
  const [role, setRole] = useState(user.role)
  const roleFromHemis = HEMIS_MANAGED_ROLES.includes(user.role)
  const [extraRoleIds, setExtraRoleIds] = useState<Set<number>>(() => {
    const assignedCodes = new Set((user.assigned_roles || []).map((r) => r.code))
    return new Set((roles || []).filter((r) => assignedCodes.has(r.code)).map((r) => r.id))
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEscape(onClose)

  const toggleExtraRole = (id: number) => {
    setExtraRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitRoles = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let message = 'Rollar saqlandi'
      if (!roleFromHemis && role !== user.role) {
        const { data } = await client.put<MessageResponse>(`/users/${encodeURIComponent(user.id)}`, { role })
        message = data.message || message
      }
      if (roles && roles.length > 0) {
        await client.put(`/users/${encodeURIComponent(user.id)}/roles`, {
          role_ids: Array.from(extraRoleIds),
        })
      }
      onSaved(message)
    } catch (err) {
      setError(extractErrorMessage(err, 'Rolni saqlashda xatolik yuz berdi'))
      setSubmitting(false)
    }
  }

  return (
    <div id="editUserModal" role="dialog" aria-modal="true" aria-labelledby="editUserModalTitle" style={overlayStyle}>
      <div style={boxStyle(480)}>
        <div style={headerStyle}>
          <h3 id="editUserModalTitle" style={titleStyle}>Rolni almashtirish</h3>
          <button type="button" aria-label="Yopish" onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <form onSubmit={submitRoles} style={{ padding: 24 }}>
          {error && <div role="alert" style={errorBoxStyle}>{error}</div>}
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Foydalanuvchi: <strong style={{ color: 'var(--text-heading)' }}>{user.full_name}</strong> (<code>{user.login}</code>)
          </p>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="editRole" style={labelStyle}>Asosiy rol *</label>
            <select id="editRole" value={role} onChange={(e) => setRole(e.target.value)} disabled={roleFromHemis} style={{ ...inputStyle, background: roleFromHemis ? 'var(--bg-light)' : 'var(--bg-white)' }}>
              {ROLE_OPTIONS_EDIT.filter((o) => roleFromHemis || o.value === role || !HEMIS_MANAGED_ROLES.includes(o.value)).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {roleFromHemis && (
              <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Rol HEMIS'dagi lavozimdan avtomatik belgilanadi.</p>
            )}
          </div>
          {roles && roles.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Qo'shimcha rollar (Rolni almashtirish menyusi uchun)</label>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roles.map((r) => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={extraRoleIds.has(r.id)} onChange={() => toggleExtraRole(r.id)} disabled={HEMIS_MANAGED_ROLES.includes(r.code)} />
                    {r.name}{HEMIS_MANAGED_ROLES.includes(r.code) && <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}> (HEMIS)</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Bekor qilish</button>
            <button type="submit" id="btnSubmitEditUser" disabled={submitting} style={{ padding: '10px 18px', border: 'none', background: 'var(--primary-color)', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ResetPasswordModal({ user, onClose, onSaved }: BaseModalProps & { user: AdminUser }) {
  const [newPass, setNewPass] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEscape(onClose)

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await client.post<MessageResponse>(`/users/${encodeURIComponent(user.id)}/reset-password`, { new_password: newPass })
      onSaved(data.message || 'Parol muvaffaqiyatli yangilandi!')
    } catch (err) {
      setError(extractErrorMessage(err, 'Parolni yangilashda xatolik'))
      setSubmitting(false)
    }
  }

  return (
    <div id="resetPasswordModal" role="dialog" aria-modal="true" aria-labelledby="resetPasswordModalTitle" style={overlayStyle}>
      <div style={boxStyle(440)}>
        <div style={headerStyle}>
          <h3 id="resetPasswordModalTitle" style={titleStyle}>Parolni yangilash</h3>
          <button type="button" aria-label="Yopish" onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <form onSubmit={submitResetPassword} style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-table-header)', margin: '0 0 16px' }}>
            Foydalanuvchi: <strong style={{ color: 'var(--text-heading)' }}>{user.full_name}</strong> (<code>{user.login}</code>)
          </p>
          {error && <div role="alert" style={errorBoxStyle}>{error}</div>}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="adminResetNewPass" style={{ ...labelStyle, marginBottom: 6 }}>Yangi parol (kamida 6 ta belgi) *</label>
            <PasswordInput id="adminResetNewPass" value={newPass} onChange={setNewPass} placeholder="Yangi kuchli parol" padding="10px 42px 10px 12px" fontSize={14} btnPadding={6} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Bekor qilish</button>
            <button type="submit" id="btnSubmitResetPass" disabled={submitting} style={{ padding: '10px 18px', border: 'none', background: '#ea580c', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Yangilanmoqda...' : "Parolni o'rnatish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
