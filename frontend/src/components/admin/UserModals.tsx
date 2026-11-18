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

const ROLE_OPTIONS_ADD: { value: string; label: string }[] = [
  { value: 'faculty_coordinator', label: 'Fakultet koordinatori' },
  { value: 'dean', label: 'Fakultet dekani' },
  { value: 'department_chair', label: 'Kafedra mudiri' },
  { value: 'supervisor', label: 'Ilmiy rahbar (professor-o\'qituvchi)' },
  { value: 'tutor', label: 'Tyutor' },
  { value: 'department_head', label: "Iqtidorli bo'lim boshlig'i" },
  { value: 'admin', label: 'Administrator (Super admin)' },
  { value: 'jury_expert', label: "Hakamlar hay'ati / Ekspert" },
  { value: 'starosta', label: 'Guruh sardori' },
  { value: 'student', label: 'Talaba' },
]

const ROLE_OPTIONS_EDIT: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrator (Super admin)' },
  { value: 'department_head', label: "Iqtidorli bo'lim boshlig'i" },
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

export function AddUserModal({ onClose, onSaved }: BaseModalProps) {
  const [fullName, setFullName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('faculty_coordinator')
  const [faculty, setFaculty] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEscape(onClose)

  const submitAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fullName.trim().length < 3) {
      setError("F.I.SH. kamida 3 ta belgidan iborat bo'lishi kerak")
      return
    }
    if (login.trim().length < 3) {
      setError("Login kamida 3 ta belgidan iborat bo'lishi kerak")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await client.post<MessageResponse>('/users', {
        full_name: fullName.trim(),
        login: login.trim(),
        password,
        role,
        faculty: faculty.trim() || null,
      })
      onSaved(data.message || 'Foydalanuvchi muvaffaqiyatli yaratildi!')
    } catch (err) {
      setError(extractErrorMessage(err, 'Foydalanuvchi yaratishda xatolik yuz berdi'))
      setSubmitting(false)
    }
  }

  return (
    <div id="addUserModal" role="dialog" aria-modal="true" aria-labelledby="addUserModalTitle" style={overlayStyle}>
      <div style={boxStyle(480)}>
        <div style={headerStyle}>
          <h3 id="addUserModalTitle" style={titleStyle}>Yangi foydalanuvchi yaratish</h3>
          <button type="button" aria-label="Yopish" onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <form onSubmit={submitAddUser} style={{ padding: 24 }}>
          {error && <div role="alert" style={errorBoxStyle}>{error}</div>}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="newFullName" style={labelStyle}>F.I.SH. (To'liq ism-familiya) *</label>
            <input type="text" id="newFullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Masalan: Karimova Dilnoza" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="newLogin" style={labelStyle}>Tizimga kirish logini (Username / HEMIS ID) *</label>
            <input type="text" id="newLogin" required value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Masalan: dkarimova yoki 3852011050" style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="newPassword" style={labelStyle}>Boshlang'ich parol (kamida 6 ta belgi) *</label>
            <PasswordInput id="newPassword" value={password} onChange={setPassword} placeholder="Yangi parol" padding="9px 42px 9px 12px" fontSize={13.5} btnPadding={5} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="newRole" style={labelStyle}>Tizimdagi lavozimi / roli *</label>
            <select id="newRole" value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, background: 'var(--bg-white)' }}>
              {ROLE_OPTIONS_ADD.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="newFaculty" style={labelStyle}>Fakultet / Bo'lim (ixtiyoriy)</label>
            <input type="text" id="newFaculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Masalan: Axborot texnologiyalari fakulteti" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Bekor qilish</button>
            <button type="submit" id="btnSubmitAddUser" disabled={submitting} style={{ padding: '10px 18px', border: 'none', background: 'var(--primary-color)', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {submitting ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EditUserModal({ user, roles, onClose, onSaved }: BaseModalProps & { user: AdminUser; roles?: RoleItem[] | null }) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [login, setLogin] = useState(user.login || '')
  const [role, setRole] = useState(user.role)
  const [faculty, setFaculty] = useState(user.faculty || '')
  const [isActive, setIsActive] = useState(user.is_active)
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

  const submitEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await client.put<MessageResponse>(`/users/${encodeURIComponent(user.id)}`, {
        full_name: fullName.trim(),
        login: login.trim(),
        role,
        faculty: faculty.trim() || null,
        is_active: isActive,
      })
      if (roles && roles.length > 0) {
        await client.put(`/users/${encodeURIComponent(user.id)}/roles`, {
          role_ids: Array.from(extraRoleIds),
        })
      }
      onSaved(data.message || 'Muvaffaqiyatli saqlandi!')
    } catch (err) {
      setError(extractErrorMessage(err, 'Tahrirlashda xatolik yuz berdi'))
      setSubmitting(false)
    }
  }

  return (
    <div id="editUserModal" role="dialog" aria-modal="true" aria-labelledby="editUserModalTitle" style={overlayStyle}>
      <div style={boxStyle(480)}>
        <div style={headerStyle}>
          <h3 id="editUserModalTitle" style={titleStyle}>Foydalanuvchini tahrirlash</h3>
          <button type="button" aria-label="Yopish" onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>
        <form onSubmit={submitEditUser} style={{ padding: 24 }}>
          {error && <div role="alert" style={errorBoxStyle}>{error}</div>}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="editFullName" style={labelStyle}>F.I.SH. (To'liq ism-familiya) *</label>
            <input type="text" id="editFullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="editLogin" style={labelStyle}>Tizimga kirish logini *</label>
            <input type="text" id="editLogin" required value={login} onChange={(e) => setLogin(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="editRole" style={labelStyle}>Tizimdagi roli *</label>
            <select id="editRole" value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, background: 'var(--bg-white)' }}>
              {ROLE_OPTIONS_EDIT.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="editFaculty" style={labelStyle}>Fakultet / Bo'lim</label>
            <input type="text" id="editFaculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} style={inputStyle} />
          </div>
          {roles && roles.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Qo'shimcha rollar (Rolni almashtirish menyusi uchun)</label>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roles.map((r) => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={extraRoleIds.has(r.id)} onChange={() => toggleExtraRole(r.id)} />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="editStatus" style={labelStyle}>Akkaunt holati</label>
            <select id="editStatus" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')} style={{ ...inputStyle, background: 'var(--bg-white)' }}>
              <option value="true">Faol</option>
              <option value="false">Nofaol (bloklangan)</option>
            </select>
          </div>
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
