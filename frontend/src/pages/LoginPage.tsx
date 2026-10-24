import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Token } from '../types/user'
import '../styles/legacy-css/login.css'

interface EimzoCertificate {
  disk?: string
  path?: string
  name?: string
  alias?: string
  CN?: string
  O?: string
  serialNumber?: string
  validFrom?: string
  validTo?: string
}

type AlertType = 'error' | 'success' | 'warning'

interface ApiErrorDetail {
  msg?: string
}

interface ApiErrorResponse {
  detail?: string | ApiErrorDetail[] | Record<string, unknown>
  message?: string
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: ApiErrorResponse } }
  const data = axiosErr?.response?.data
  if (data) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('\n')
    }
    if (data.detail && typeof data.detail === 'object') return JSON.stringify(data.detail)
    if (data.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

function parseEimzoAlias(cert: Record<string, unknown>): EimzoCertificate {
  if (cert.CN && cert.serialNumber) return cert as EimzoCertificate
  const alias = (cert.alias as string) || ''
  const map: Record<string, string> = {}
  for (const part of alias.split(',')) {
    const idx = part.indexOf('=')
    if (idx !== -1) {
      map[part.substring(0, idx).trim().toLowerCase()] = part.substring(idx + 1).trim()
    }
  }
  return {
    ...cert,
    CN: (map['cn'] || (cert.name as string) || "Noma'lum egasi").toUpperCase(),
    O: map['o'] || 'Jismoniy shaxs',
    serialNumber: map['serialnumber'] || (cert.serialNumber as string) || '',
    validFrom: map['validfrom'] || (cert.validFrom as string) || '',
    validTo: map['validto'] || (cert.validTo as string) || '',
  }
}

async function fetchCertificatesFromAgent(): Promise<EimzoCertificate[]> {
  try {
    const { data } = await client.get<{ status: number; certificates: EimzoCertificate[] }>('/auth/e-imzo/keys')
    if (data && data.status === 1 && data.certificates && data.certificates.length > 0) {
      return data.certificates
    }
  } catch {
    // Server ko'prigi ishlamasa, keyingi usulga o'tish
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try {
          ws?.close()
        } catch {
          // ignore
        }
        reject(new Error('E-IMZO moduli javob bermadi'))
      }
    }, 3000)

    let ws: WebSocket
    try {
      ws = new WebSocket('wss://127.0.0.1:64443/ajax/')
    } catch (e) {
      clearTimeout(timer)
      settled = true
      reject(e)
      return
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ plugin: 'pfx', name: 'list_all_certificates' }))
    }

    ws.onmessage = (event) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        const data = JSON.parse(event.data)
        const rawCerts: Record<string, unknown>[] = data.certificates || []
        const parsed = rawCerts.map((c) => parseEimzoAlias(c))
        ws.close()
        resolve(parsed)
      } catch (e) {
        ws.close()
        reject(e)
      }
    }

    ws.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new Error("E-IMZO agentiga ulanib bo'lmadi"))
      }
    }
  })
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m)
}

const FORGOT_TOTAL_SECONDS = 8

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithToken } = useAuth()

  // Login form state
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null)

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotRemaining, setForgotRemaining] = useState(FORGOT_TOTAL_SECONDS)
  const forgotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [forgotFadeOut, setForgotFadeOut] = useState(false)

  // E-IMZO modal state
  const [eimzoOpen, setEimzoOpen] = useState(false)
  const [eimzoLoading, setEimzoLoading] = useState(false)
  const [eimzoCertificates, setEimzoCertificates] = useState<EimzoCertificate[]>([])
  const [eimzoSelectedIndex, setEimzoSelectedIndex] = useState('')
  const [eimzoHemisId, setEimzoHemisId] = useState('')
  const [eimzoAlert, setEimzoAlert] = useState<{ message: string; type: AlertType } | null>(null)
  const [eimzoSubmitting, setEimzoSubmitting] = useState(false)

  useEffect(() => {
    document.body.classList.add('login-body')
    return () => {
      document.body.classList.remove('login-body')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (forgotTimerRef.current) clearInterval(forgotTimerRef.current)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const loginStr = loginValue.trim()

    if (!loginStr || !password) {
      setAlert({ message: 'Iltimos, HEMIS ID va parolingizni kiriting', type: 'error' })
      return
    }

    setSubmitting(true)
    setAlert(null)

    try {
      const user = await login(loginStr, password, rememberMe)
      setAlert({ message: `Xush kelibsiz, ${user.full_name}! Yo'naltirilmoqda...`, type: 'success' })
      setTimeout(() => {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard')
      }, 800)
    } catch (err) {
      setAlert({ message: extractErrorMessage(err, "Tizimga kirishda xatolik yuz berdi"), type: 'error' })
      setSubmitting(false)
    }
  }

  const openForgotPasswordModal = () => {
    setForgotOpen(true)
    setForgotFadeOut(false)
    setForgotRemaining(FORGOT_TOTAL_SECONDS)

    if (forgotTimerRef.current) clearInterval(forgotTimerRef.current)
    forgotTimerRef.current = setInterval(() => {
      setForgotRemaining((prev) => {
        if (prev <= 1) {
          if (forgotTimerRef.current) clearInterval(forgotTimerRef.current)
          closeForgotPasswordModal()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const closeForgotPasswordModal = () => {
    if (forgotTimerRef.current) clearInterval(forgotTimerRef.current)
    setForgotFadeOut(true)
    setTimeout(() => {
      setForgotOpen(false)
      setForgotFadeOut(false)
    }, 220)
  }

  const openEimzoModal = async () => {
    setEimzoOpen(true)
    setEimzoAlert(null)
    await loadEimzoKeys()
  }

  const closeEimzoModal = () => {
    setEimzoOpen(false)
  }

  const loadEimzoKeys = async () => {
    setEimzoAlert(null)
    setEimzoLoading(true)
    try {
      const certs = await fetchCertificatesFromAgent()
      setEimzoCertificates(certs)
      setEimzoLoading(false)

      if (certs.length === 0) {
        setEimzoAlert({ message: 'Kompyuteringizda yoki USB fleshkada faol E-IMZO kalitlari topilmadi.', type: 'warning' })
        return
      }
      if (certs.length === 1) {
        setEimzoSelectedIndex('0')
      }
    } catch {
      setEimzoLoading(false)
      setEimzoCertificates([])
      setEimzoAlert({
        message:
          "E-IMZO agenti bilan aloqa o'rnatilmadi. Kompyuteringizda E-IMZO dasturi ishga tushirilganligiga ishonch hosil qiling yoki rasmiy e-imzo.uz saytidan E-IMZO agentini yuklab oling. Shuningdek, odatiy HEMIS ID va parolingiz orqali ham to'g'ridan-to'g'ri kirishingiz mumkin.",
        type: 'error',
      })
    }
  }

  const selectedCert = eimzoSelectedIndex !== '' ? eimzoCertificates[parseInt(eimzoSelectedIndex, 10)] : null

  const signAndLoginWithEimzo = async () => {
    setEimzoAlert(null)

    if (eimzoSelectedIndex === '') {
      setEimzoAlert({ message: 'Iltimos, avval E-IMZO kalitingizni tanlang.', type: 'warning' })
      return
    }

    const cert = eimzoCertificates[parseInt(eimzoSelectedIndex, 10)]
    if (!cert) {
      setEimzoAlert({ message: "Tanlangan kalit ma'lumotlari topilmadi.", type: 'error' })
      return
    }

    setEimzoSubmitting(true)

    try {
      const { data: chData } = await client.get<{ status: number; challenge: string }>('/auth/e-imzo/challenge')
      if (!chData.challenge) {
        throw new Error('Xavfsizlik tokenini olishda xatolik yuz berdi')
      }

      const { data: verifyData } = await client.post<Token>('/auth/e-imzo/sign-and-verify', {
        challenge: chData.challenge,
        cert,
        hemis_id: eimzoHemisId.trim() || null,
      })

      setEimzoAlert({ message: `Xush kelibsiz, ${verifyData.user.full_name}! Yo'naltirilmoqda...`, type: 'success' })

      loginWithToken(verifyData.access_token, verifyData.user)

      setTimeout(() => {
        navigate(verifyData.user.role === 'admin' ? '/admin' : '/dashboard')
      }, 800)
    } catch (err) {
      setEimzoAlert({ message: extractErrorMessage(err, "E-IMZO orqali kirish tasdiqlanmadi."), type: 'error' })
      setEimzoSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left brand panel */}
      <div className="login-brand-panel">
        <div className="login-brand-top">
          <img src="/static/images/logo.png" alt="Iqtidorli talabalar" className="login-brand-logo" />
          <div className="login-brand-name">
            Iqtidorli talabalar
            <span>O'zMU Jizzax filiali</span>
          </div>
        </div>

        <div className="login-brand-middle">
          <div className="login-brand-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Xavfsiz tizim</span>
          </div>
          <h1 className="login-brand-title">Iqtidorli talabalar tizimiga xush kelibsiz</h1>
          <p className="login-brand-desc">
            O'zMU Jizzax filiali talaba va xodimlari uchun yagona HEMIS portali. Shaxsiy kabinetingizga kirib,
            o'quv jarayoningiz, yangiliklar va boshqa imkoniyatlardan foydalaning.
          </p>
          <div className="login-brand-features">
            <div className="login-brand-feature">
              <span className="login-brand-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span>HEMIS ID orqali tezkor kirish</span>
            </div>
            <div className="login-brand-feature">
              <span className="login-brand-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <span>E-IMZO orqali xavfsiz autentifikatsiya</span>
            </div>
            <div className="login-brand-feature">
              <span className="login-brand-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </span>
              <span>Ma'lumotlaringiz himoyalangan</span>
            </div>
          </div>
        </div>

        <div className="login-brand-bottom">© {new Date().getFullYear()} O'zMU Jizzax filiali. Barcha huquqlar himoyalangan.</div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-card-container">
          <div className="login-mobile-logo">
            <img src="/static/images/logo.png" alt="Iqtidorli talabalar O'zMU Jizzax filiali" />
          </div>

          {/* Header */}
          <div className="login-header-section">
            <h2 className="login-welcome-title">Tizimga kirish</h2>
            <h3 className="login-welcome-sub">Davom etish uchun hisobingizga kiring</h3>
          </div>

          {/* Alert Box */}
          {alert && (
            <div className={`login-alert alert-${alert.type}`} style={{ display: 'block' }}>
              {alert.message}
            </div>
          )}

          {/* Login Form */}
          <form id="loginForm" onSubmit={handleSubmit}>
        {/* Login / Hemis ID */}
        <div className="form-group">
          <label htmlFor="loginInput" className="form-label">Login</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="loginInput"
              name="login"
              className="form-control-input"
              placeholder="HEMIS ID kiriting"
              required
              autoComplete="username"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
            />
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="passwordInput" className="form-label">Parol</label>
          <div className="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="passwordInput"
              name="password"
              className="form-control-input"
              placeholder="Parolni kiriting"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="btn-toggle-eye"
              id="togglePassword"
              title="Parolni ko'rsatish/yashirish"
              aria-label="Parolni ko'rsatish/yashirish"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember & Forgot */}
        <div className="form-options-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              id="rememberMe"
              name="remember_me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Eslab qol</span>
          </label>
          <a href="javascript:void(0)" onClick={openForgotPasswordModal} className="forgot-password-link">
            Parolni unutdingizmi?
          </a>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn-submit-login" id="submitBtn" disabled={submitting}>
          {submitting ? 'Kirilmoqda...' : 'Tizimga kirish'}
        </button>
      </form>

      {/* Optional E-IMZO Divider and Action */}
      <div className="login-divider">
        <span>yoki</span>
      </div>

      <button type="button" className="btn-eimzo-login" id="btnEimzoLogin" onClick={openEimzoModal}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>E-IMZO orqali kirish</span>
      </button>

      <a href="/" className="back-to-home-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Bosh sahifaga qaytish</span>
      </a>
        </div>
      </div>

      {/* E-IMZO Keys Selection Modal (Clean & Zero-PII compliant) */}
      {eimzoOpen && (
        <div id="eimzoModal" className="eimzo-modal-backdrop" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) closeEimzoModal() }}>
          <div className="eimzo-modal-box">
            <div className="eimzo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="eimzo-badge-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="eimzo-modal-title">E-IMZO orqali kirish</h3>
                  <p className="eimzo-modal-subtitle">Elektron raqamli imzo kalitini tanlang</p>
                </div>
              </div>
              <button type="button" className="eimzo-close-btn" onClick={closeEimzoModal} title="Yopish">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="eimzo-modal-body">
              {/* Status / Alert inside modal */}
              {eimzoAlert && (
                <div id="eimzoAlert" className={`eimzo-alert alert-${eimzoAlert.type}`} style={{ display: 'block' }}>
                  {eimzoAlert.message}
                </div>
              )}

              {/* Loading State */}
              {eimzoLoading && (
                <div id="eimzoLoading" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>
                  <div className="eimzo-spinner"></div>
                  <p style={{ marginTop: 12, fontSize: 14, color: '#475569', fontWeight: 500 }}>
                    E-IMZO moduli bilan aloqa o'rnatilmoqda...
                  </p>
                </div>
              )}

              {/* Keys Selection Form */}
              {!eimzoLoading && (
                <div id="eimzoKeySection" style={{ display: 'block' }}>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ fontSize: 13.5, marginBottom: 6 }}>Elektron kalit (DS):</label>
                    <select
                      id="eimzoKeySelect"
                      className="form-control-input"
                      style={{ fontSize: 13.5, height: 44, cursor: 'pointer' }}
                      value={eimzoSelectedIndex}
                      onChange={(e) => setEimzoSelectedIndex(e.target.value)}
                    >
                      <option value="">
                        {eimzoCertificates.length === 0 ? 'Kalitlar yuklanmoqda...' : '-- E-IMZO kalitingizni tanlang --'}
                      </option>
                      {eimzoCertificates.map((c, i) => {
                        const owner = c.CN || c.name || "Noma'lum egasi"
                        const exp = c.validTo ? ` [Muddati: ${c.validTo.split(' ')[0]}]` : ''
                        return (
                          <option key={i} value={i}>
                            {escapeHtml(owner)}{escapeHtml(exp)}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Selected Key Details Preview */}
                  {selectedCert && (
                    <div id="eimzoKeyDetails" className="eimzo-key-details" style={{ display: 'block' }}>
                      <div className="eimzo-detail-row">
                        <span className="eimzo-detail-label">Egasi:</span>
                        <span className="eimzo-detail-val" id="eimzoDetailOwner">{selectedCert.CN || selectedCert.name || '-'}</span>
                      </div>
                      <div className="eimzo-detail-row">
                        <span className="eimzo-detail-label">Tashkilot:</span>
                        <span className="eimzo-detail-val" id="eimzoDetailOrg">{selectedCert.O || 'Jismoniy shaxs'}</span>
                      </div>
                      <div className="eimzo-detail-row">
                        <span className="eimzo-detail-label">Muddati:</span>
                        <span className="eimzo-detail-val" id="eimzoDetailExpiry">{selectedCert.validTo || '-'}</span>
                      </div>
                    </div>
                  )}

                  {/* E-IMZO Native Password Note (Password entered in E-IMZO desktop application) */}
                  <div style={{ fontSize: 12.5, color: '#64748b', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Kalit paroli E-IMZO rasmiy dasturining o'zida so'raladi</span>
                  </div>

                  {/* Optional HEMIS ID input if user wants to ensure unambiguous match */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" htmlFor="eimzoHemisIdInput" style={{ fontSize: 12.5, color: '#64748b', marginBottom: 4 }}>
                      HEMIS ID (ixtiyoriy, agar kalit nomi bilan qidirishda noaniqlik bo'lsa):
                    </label>
                    <input
                      type="text"
                      id="eimzoHemisIdInput"
                      className="form-control-input"
                      placeholder="Masalan: 382211100012"
                      style={{ fontSize: 13.5, padding: '10px 14px' }}
                      value={eimzoHemisId}
                      onChange={(e) => setEimzoHemisId(e.target.value)}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-submit-login"
                      id="btnEimzoSubmit"
                      onClick={signAndLoginWithEimzo}
                      disabled={eimzoSelectedIndex === '' || eimzoSubmitting}
                      style={{ flex: 1, padding: '12px 18px', fontSize: 14.5 }}
                    >
                      {eimzoSubmitting ? 'Imzolanmoqda (E-IMZO oynasini kuting)...' : 'Kirish'}
                    </button>
                    <button type="button" className="btn-eimzo-refresh" onClick={loadEimzoKeys} title="Kalitlarni qayta yuklash">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parolni tiklash (Forgot Password) Countdown Slider Modal */}
      {forgotOpen && (
        <div
          id="forgotPasswordModal"
          className={`eimzo-modal-backdrop${forgotFadeOut ? ' fade-out' : ''}`}
          style={{ display: 'flex' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeForgotPasswordModal() }}
        >
          <div className="forgot-modal-card">
            {/* Close button */}
            <button type="button" className="forgot-modal-close" onClick={closeForgotPasswordModal} title="Yopish">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Clean Key / Info SVG Icon (No AI icons) */}
            <div className="forgot-modal-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-1.5 1.5L16 7m-1.5 1.5L13 10m-1.5 1.5L10 13m-1.5 1.5L7 16m-1.5 1.5L4 19m-1.5 1.5L1 22"></path>
                <circle cx="15.5" cy="8.5" r="5.5"></circle>
              </svg>
            </div>

            {/* Title & Original Core Message */}
            <h3 className="forgot-modal-title">Parolni tiklash</h3>
            <p className="forgot-modal-desc">
              Parolni tiklash uchun <strong>fakultet dekanati</strong> yoki filial <strong>HEMIS administratori</strong>{' '}
              bilan bog'laning.
            </p>

            <div className="forgot-modal-info-chip">
              <div style={{ fontWeight: 700, color: '#0b3b70', marginBottom: 2 }}>O'zMU Jizzax filiali</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>HEMIS koordinatori va Raqamli ta'lim bo'limi</div>
            </div>

            {/* Countdown Slider & Animated Progress Track */}
            <div className="forgot-countdown-wrapper">
              <div className="forgot-countdown-label">
                <span>Avtomatik yopilish:</span>
                <span id="forgotCountdownNum" className="forgot-countdown-badge">{forgotRemaining} soniya</span>
              </div>
              <div className="forgot-progress-track">
                <div
                  id="forgotProgressBar"
                  className="forgot-progress-fill"
                  style={{
                    transition: `width ${FORGOT_TOTAL_SECONDS}s linear`,
                    width: `${(forgotRemaining / FORGOT_TOTAL_SECONDS) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Actions Button with Timer */}
            <div className="forgot-modal-actions">
              <button
                type="button"
                className="btn-submit-login"
                id="btnForgotClose"
                onClick={closeForgotPasswordModal}
                style={{ padding: '11px 20px', fontSize: 14.5 }}
              >
                Tushunarli (<span id="btnForgotCountdown">{forgotRemaining}s</span>)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
