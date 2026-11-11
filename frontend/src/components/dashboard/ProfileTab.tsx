import type { User } from '../../types/user'
import type { MeResponse } from '../../types/dashboard'

interface Props {
  currentUser: User
  me: MeResponse | null
  loading: boolean
  error: string | null
}

export default function ProfileTab({ currentUser, me, loading, error }: Props) {
  const fullName = me?.full_name ?? currentUser.full_name
  const hemisId = me?.login ?? currentUser.hemis_id
  const isStarosta = me?.is_starosta ?? false
  const groupName = me?.group_name ?? currentUser.group_name

  return (
    <div className="student-tab-pane" id="student-tab-personal" style={{ display: 'block' }}>
      {/* Profile Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e5ba3 100%)', borderRadius: 20, padding: 32, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, boxShadow: '0 10px 30px rgba(11, 59, 112, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {currentUser.image_url ? (
            <img src={currentUser.image_url} alt={fullName} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }} />
          ) : (
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--bg-white)', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(255,255,255,0.4)', fontSize: 32, fontWeight: 800 }}>
              {fullName ? fullName[0] : 'T'}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                HEMIS ID: {hemisId}
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.3)', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>HEMIS Tasdiqlangan</span>
              </span>
              {isStarosta && (
                <span style={{ background: 'rgba(245, 158, 11, 0.35)', color: '#fef3c7', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>Guruh sardori ({groupName})</span>
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{fullName}</h2>
            <p style={{ color: '#cbd5e1', fontSize: 14, marginTop: 4 }}>
              Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti Jizzax filiali talabasi
            </p>
          </div>
        </div>

        <div>
          <span style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#ffffff', padding: '8px 18px', borderRadius: 12, fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>2025-2026 o'quv yili</span>
          </span>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', border: '1px solid var(--badge-danger-border)', fontSize: 13.5 }}>{error}</div>
      )}

      {/* Shaxsiy anketasi kartasi */}
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, marginTop: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, borderBottom: '1px solid var(--border-light)', paddingBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Shaxsiy ma'lumotlar kartasi</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>HEMIS axborot tizimi orqali tasdiqlangan talaba shaxsiy hisobi</p>
          </div>
          <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            Shaxsiy profil
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-light)', fontSize: 13.5 }}>Yuklanmoqda...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>To'liq familiyasi, ismi va sharifi</div>
              <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 15, marginTop: 4 }}>{fullName}</div>
            </div>

            <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>HEMIS ID raqami</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 15, marginTop: 4 }}>{hemisId}</div>
            </div>

            <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Talaba elektron pochtasi</div>
              <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 15, marginTop: 4 }}>{hemisId}@jbnuu.uz</div>
            </div>

            <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Doimiy yashash manzili</div>
              <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 15, marginTop: 4 }}>Jizzax viloyati, O'zbekiston</div>
            </div>

            <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Tizimdagi roli / Holati</div>
              <div style={{ fontWeight: 700, color: 'var(--badge-success-text)', fontSize: 15, marginTop: 4 }}>Faol talaba (HEMIS Verified)</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'var(--badge-purple-bg)', border: '1px solid var(--badge-purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--badge-purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--badge-purple-text)', fontSize: 13.5 }}>Xavfsiz Zero-PII autentifikatsiya</div>
              <div style={{ fontSize: 12, color: 'var(--badge-purple-text)' }}>Talabaning shaxsiy ma'lumotlari OTM ichki HEMIS tizimi xavfsizlik standartlariga muvofiq himoyalangan.</div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--badge-purple-text)', background: 'var(--bg-white)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--badge-purple-border)' }}>Himoyalangan</span>
        </div>
      </div>
    </div>
  )
}
