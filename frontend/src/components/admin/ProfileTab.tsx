import { useState } from 'react'
import client from '../../api/client'
import { useApiResource } from '../../hooks/useApiResource'
import type { MessageResponse, MyProfile, UpdateMyProfileResponse } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  showToast: ShowToast
  onProfileUpdated: (patch: { full_name: string; hemis_id: string }) => void
  onLoginChanged: (accessToken: string | undefined, updatedUser: { login: string; full_name: string }) => void
}

type PasswordField = 'current' | 'new' | 'confirm'

const loadMyProfile = () => client.get<MyProfile>('/users/me').then(({ data }) => data)

const cardStyle: React.CSSProperties = { background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 26, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, background: 'var(--bg-white)', color: 'var(--text-dark)' }
const passInputStyle: React.CSSProperties = { ...inputStyle, padding: '10px 44px 10px 14px' }
const eyeBtnStyle: React.CSSProperties = { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  )
}

interface ProfileInfoFormProps {
  profile: MyProfile
  showToast: ShowToast
  onSaved: (user: UpdateMyProfileResponse['user'], loginChanged: boolean, accessToken?: string) => void
}

function ProfileInfoForm({ profile, showToast, onSaved }: ProfileInfoFormProps) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [login, setLogin] = useState(profile.login)
  const [savingProfile, setSavingProfile] = useState(false)

  const handleUpdateMyProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload = { full_name: fullName.trim(), login: login.trim() }
    if (!payload.full_name || !payload.login) {
      showToast("F.I.SH. va loginni kiritish majburiy!", 'warning')
      return
    }

    setSavingProfile(true)
    try {
      const { data: res } = await client.put<UpdateMyProfileResponse>('/users/me', payload)
      showToast(res.message || 'Profil muvaffaqiyatli saqlandi!', 'success')
      onSaved(res.user, res.user.login !== profile.login, res.access_token)
    } catch (err) {
      showToast(extractErrorMessage(err, 'Profilni saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <form onSubmit={handleUpdateMyProfile}>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="myProfileFullName" style={labelStyle}>
          F.I.SH. (To'liq ism-familiya)
        </label>
        <input type="text" id="myProfileFullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="myProfileLogin" style={labelStyle}>
          Tizimga kirish logini (HEMIS ID / Username)
        </label>
        <input type="text" id="myProfileLogin" value={login} onChange={(e) => setLogin(e.target.value)} required aria-describedby="myProfileLoginHint" style={{ ...inputStyle, fontFamily: 'monospace' }} />
        <p id="myProfileLoginHint" style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '5px 0 0' }}>
          Loginni o'zgartirsangiz, keyingi kirishlarda yangi login bilan kirasiz.
        </p>
      </div>

      <div style={{ marginBottom: 22 }}>
        <label htmlFor="myProfileRoles" style={labelStyle}>
          Tizimdagi lavozim / huquq
        </label>
        <input type="text" id="myProfileRoles" value={profile.role_names.join(', ')} disabled style={{ ...inputStyle, border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-muted)' }} />
      </div>

      <button type="submit" id="btnSaveProfile" disabled={savingProfile} style={{ width: '100%', background: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        {savingProfile ? 'Saqlanmoqda...' : "Ma'lumotlarni saqlash"}
      </button>
    </form>
  )
}

export default function ProfileTab({ showToast, onProfileUpdated, onLoginChanged }: Props) {
  const profile = useApiResource(loadMyProfile, "Profil ma'lumotlarini yuklashda xatolik yuz berdi")

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ current: false, new: false, confirm: false })

  const data = profile.data

  const toggleVisibility = (field: PasswordField) => setVisible((v) => ({ ...v, [field]: !v[field] }))

  const handleChangeMyPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('Yangi parol va tasdiqlash mos kelmadi', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const { data: res } = await client.post<MessageResponse>('/users/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      showToast(res.message || 'Parolingiz muvaffaqiyatli yangilandi!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(extractErrorMessage(err, "Parolni o'zgartirishda xatolik yuz berdi"), 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const passwordFields: { field: PasswordField; id: string; label: string; placeholder: string; value: string; setValue: (v: string) => void; minLength?: number; autoComplete: string }[] = [
    { field: 'current', id: 'myCurrentPassword', label: 'Joriy parol', placeholder: 'Eski parolingizni kiriting', value: currentPassword, setValue: setCurrentPassword, autoComplete: 'current-password' },
    { field: 'new', id: 'myNewPassword', label: 'Yangi parol (kamida 6 ta belgi)', placeholder: 'Yangi kuchli parol', value: newPassword, setValue: setNewPassword, minLength: 6, autoComplete: 'new-password' },
    { field: 'confirm', id: 'myConfirmPassword', label: 'Yangi parolni tasdiqlash', placeholder: 'Yangi parolni takrorlang', value: confirmPassword, setValue: setConfirmPassword, minLength: 6, autoComplete: 'new-password' },
  ]

  return (
    <div id="tab-content-profile-security" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-color)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
              {data?.full_name.slice(0, 1) ?? ''}
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Shaxsiy profil ma'lumotlari</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>F.I.SH. va tizimga kirish loginini tahrirlash</p>
            </div>
          </div>

          {profile.loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-light)', margin: 0 }}>Yuklanmoqda...</p>
          ) : profile.error ? (
            <p role="alert" style={{ fontSize: 13, color: 'var(--badge-danger-text)', margin: 0 }}>{profile.error}</p>
          ) : data ? (
            <ProfileInfoForm
              profile={data}
              showToast={showToast}
              onSaved={(user, loginChanged, accessToken) => {
                profile.setData((prev) => (prev ? { ...prev, full_name: user.full_name, login: user.login } : prev))
                onProfileUpdated({ full_name: user.full_name, hemis_id: user.login })
                if (loginChanged) onLoginChanged(accessToken, { login: user.login, full_name: user.full_name })
              }}
            />
          ) : null}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Xavfsizlik va Parol</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>Akkaunt parolini xavfsiz yangilash</p>
            </div>
          </div>

          <form onSubmit={handleChangeMyPassword}>
            {passwordFields.map((f, i) => {
              const isVisible = visible[f.field]
              const toggleTitle = isVisible ? 'Parolni yashirish' : "Parolni ko'rish"
              return (
                <div key={f.id} style={{ marginBottom: i === passwordFields.length - 1 ? 22 : 16 }}>
                  <label htmlFor={f.id} style={labelStyle}>
                    {f.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={isVisible ? 'text' : 'password'}
                      id={f.id}
                      value={f.value}
                      onChange={(e) => f.setValue(e.target.value)}
                      placeholder={f.placeholder}
                      required
                      minLength={f.minLength}
                      autoComplete={f.autoComplete}
                      style={passInputStyle}
                    />
                    <button type="button" onClick={() => toggleVisibility(f.field)} title={toggleTitle} aria-label={toggleTitle} aria-pressed={isVisible} aria-controls={f.id} style={eyeBtnStyle}>
                      <EyeIcon visible={isVisible} />
                    </button>
                  </div>
                </div>
              )
            })}

            <button type="submit" id="btnChangePassword" disabled={changingPassword} style={{ width: '100%', background: '#ea580c', color: '#ffffff', border: 'none', padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {changingPassword ? 'Yangilanmoqda...' : 'Parolni yangilash'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
