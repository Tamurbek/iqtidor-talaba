import type { User } from '../../types/user'

interface Props {
  user: User
}

export default function AcademicTab({ user }: Props) {
  const hasSupervisor = Boolean(user.supervisor_name)

  return (
    <div className="student-tab-pane" id="student-tab-academic" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, borderBottom: '1px solid var(--border-light)', paddingBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
              <span>Akademik va ta'lim jarayoni ma'lumotlari</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>Talabaning fakultet, yo'nalish, guruh va ta'lim shakli ko'rsatkichlari</p>
          </div>
          <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            O'quv bo'limi
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Fakultet</div>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 16, marginTop: 4 }}>{user.faculty}</div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>O'zMU Jizzax filiali asosiy tarkibiy bo'linmasi</p>
          </div>

          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Ta'lim yo'nalishi / Mutaxassislik</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 16, marginTop: 4 }}>{user.direction}</div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Davlat ta'lim standarti bo'yicha</p>
          </div>

          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Bosqich va Guruh</div>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 16, marginTop: 4 }}>{user.course}-kurs ({user.group_name})</div>
            <p style={{ fontSize: 12, color: 'var(--badge-success-text)', fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--badge-success-text)' }}></span>
              <span>Kunduzgi ta'lim shakli</span>
            </p>
          </div>

          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Ta'lim turi / Moliyalashtirish shakli</div>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 16, marginTop: 4 }}>
              {user.education_type || 'Bakalavr'} <span style={{ opacity: 0.35, margin: '0 4px' }}>|</span> <span style={{ color: 'var(--badge-success-text)' }}>{user.payment_form || 'Davlat granti'}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Byudjet mablag'lari hisobidan</p>
          </div>

          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Joriy o'quv yili &amp; Semestr</div>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 16, marginTop: 4 }}>2024–2025 o'quv yili (Bahorgi semestr)</div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>O'quv rejasiga muvofiq</p>
          </div>

          <div style={{ background: 'var(--bg-light)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Ta'lim tili</div>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 16, marginTop: 4 }}>O'zbek tili</div>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Davlat tilidagi o'quv guruhi</p>
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 20, borderRadius: 14, background: 'var(--badge-success-bg)', border: '1px solid var(--badge-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--badge-success-text)' }}>Akademik qarzdorlik mavjud emas</div>
            <div style={{ fontSize: 12.5, color: 'var(--badge-success-text)', marginTop: 2 }}>Barcha o'quv modullari va kredit-modul (ECTS) talablari muvaffaqiyatli bajarilgan. "Iqtidor" tanloviga to'liq tavsiya etiladi.</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--badge-success-text)', background: 'var(--bg-white)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--badge-success-text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>ECTS 100%</span>
          </span>
        </div>

        {/* Ilmiy rahbar va tadqiqot mavzusi bloki */}
        <div style={{ marginTop: 24, background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-light)', paddingBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Ilmiy rahbar va tadqiqot mavzusi</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>Talabaning ilmiy-tadqiqot faoliyatini muvofiqlashtiruvchi mas'ul professor-o'qituvchi</p>
            </div>
            {hasSupervisor ? (
              <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', border: '1px solid var(--badge-success-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Biriktirilgan</span>
              </span>
            ) : (
              <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', border: '1px solid var(--badge-warning-border)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                Biriktirilmagan
              </span>
            )}
          </div>

          {hasSupervisor ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Ilmiy rahbar (F.I.O.)</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 16, marginTop: 4 }}>{user.supervisor_name}</div>
                  <p style={{ fontSize: 12, color: 'var(--badge-info-text)', fontWeight: 600, marginTop: 2 }}>{user.supervisor_degree || "Professor-o'qituvchi"}</p>
                </div>

                <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Kafedra / Tarkibiy bo'linma</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 15, marginTop: 4 }}>{user.supervisor_department || user.faculty}</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Aloqa: {user.supervisor_phone || 'Filial orqali'}</p>
                </div>
              </div>

              <div style={{ marginTop: 16, background: 'var(--badge-info-bg)', padding: 18, borderRadius: 12, border: '1px solid var(--badge-info-text)' }}>
                <div style={{ color: 'var(--badge-info-text)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tasdiqlangan ilmiy-tadqiqot mavzusi:</div>
                <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: 15, marginTop: 6, lineHeight: 1.5 }}>
                  "{user.research_topic || 'Ilmiy-tadqiqot mavzusi tasdiqlanish arafasida'}"
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: 'var(--bg-light)', border: '1px dashed var(--border-color)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-table-header)' }}>Sizga hali ilmiy rahbar biriktirilmagan</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
                Iqtidorli talabalar bo'limi yoki fakultetingiz mas'ullari tomonidan ilmiy rahbar tayinlanganidan so'ng, uning ma'lumotlari va ilmiy tadqiqot mavzusi ushbu oynada aks etadi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
