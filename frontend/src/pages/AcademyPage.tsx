import { Link } from 'react-router-dom'

export default function AcademyPage() {
  return (
    <div className="container" style={{ padding: '50px 20px 80px' }}>
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 50px' }}>
        <span style={{ color: 'var(--accent-orange)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>
          Ilm-fan va innovatsiyalar
        </span>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#0b3b70', marginTop: '8px' }}>
          Talabalar ilmiy akademiyasi
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', marginTop: '12px', lineHeight: 1.6 }}>
          O'zbekiston Milliy universiteti Jizzax filialida iqtidorli talabalarning ilmiy, texnik va ijodiy
          izlanishlarini birlashtiruvchi hamda ularni qo'llab-quvvatlovchi muhit.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18h8"></path>
              <path d="M3 22h18"></path>
              <path d="M14 22a7 7 0 1 0 0-14h-1"></path>
              <path d="M9 14h2"></path>
              <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"></path>
              <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"></path>
            </svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0b3b70', marginBottom: '10px' }}>Ilmiy to'garaklar</h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Filial kafedralari qoshida tashkil etilgan ilmiy to'garaklar va laboratoriyalarda zamonaviy ilmiy
            mavzularda tadqiqotlar olib borish imkoniyati.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              <circle cx="12" cy="12" r="5"></circle>
            </svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0b3b70', marginBottom: '10px' }}>Startap va Akseleratsiya</h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Talabalar o'z innovatsion g'oyalarini prototip va biznes model darajasiga yetkazishlari uchun
            mentorlik va texnik ko'mak tizimi.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0b3b70', marginBottom: '10px' }}>Olimpiada va Grantlar</h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Respublika va xalqaro fan olimpiadalariga tayyorgarlik ko'rish, xalqaro ta'lim grantlari va
            stipendiyalar tanlovlarida ishtirok etish.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '60px', background: '#f0f7ff', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1px dashed #93c5fd' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0b3b70' }}>Akademiyaga a'zo bo'lishni xohlaysizmi?</h3>
        <p style={{ color: '#475569', fontSize: '15px', margin: '10px 0 20px' }}>
          Tizimga HEMIS profilingiz orqali kiring va a'zolik anketasini to'ldiring.
        </p>
        <Link to="/login" className="btn-hero-login" style={{ display: 'inline-block' }}>
          Tizimga kirish
        </Link>
      </div>
    </div>
  )
}
