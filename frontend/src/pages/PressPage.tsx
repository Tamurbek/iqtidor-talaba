export default function PressPage() {
  return (
    <div className="press-page">
      <div className="container">
        <h1 className="page-title">Matbuot xizmati</h1>

        <div className="press-layout-grid">
          {/* Left big poster */}
          <div className="press-big-poster">
            <img src="/static/images/press-main.png" alt="Huquq bilimdonlari umummilliy konstitutsiya imtihoni" />
          </div>

          {/* Right items list */}
          <div className="press-items-list">
            {/* Item 1: Talant Shou */}
            <article className="press-item-card">
              <div className="press-item-thumb">
                <img src="/static/images/press-item-1.png" alt="Talant shou" />
              </div>
              <div className="press-item-info">
                <div className="press-item-date">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg> 6-noyabr, 2024
                </div>
                <h3 className="press-item-title">Talant shou: talabalar o'rtasida iste'dodlar bellashuvi</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                  Kuz-qish mavsumi saralash bosqichida filial iqtidorli talabalari sahna ko'rinishlari,
                  kuy-qo'shiq va raqs mahoratini namoyish etishdi.
                </p>
              </div>
            </article>

            {/* Item 2: Media loyihalar */}
            <article className="press-item-card">
              <div className="press-item-thumb">
                <img src="/static/images/press-item-2.png" alt="Talaba-yoshlar media tanlovi" />
              </div>
              <div className="press-item-info">
                <div className="press-item-date">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg> 13-oktabr, 2024
                </div>
                <h3 className="press-item-title">Talaba-yoshlar hayotiga bog'liq media loyihalar tanlovi</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                  Media sohasida ijod qilayotgan talabalar uchun zamonaviy kontent yaratish bo'yicha amaliy
                  seminar va tanlov o'tkazildi.
                </p>
              </div>
            </article>

            {/* Item 3: Ijodiy startaplar */}
            <article className="press-item-card">
              <div className="press-item-thumb">
                <img src="/static/images/press-item-3.png" alt="Ijodiy startaplar tanlovi" />
              </div>
              <div className="press-item-info">
                <div className="press-item-date">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg> 13-sentabr, 2024
                </div>
                <h3 className="press-item-title">Ijodiy startaplar va innovatsion loyihalar tanlovi</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                  Talabalarning innovatsion g'oyalari va startap loyihalarini moliyalashtirish hamda
                  amaliyotga tatbiq etish imkoniyati.
                </p>
              </div>
            </article>

            {/* Item 4: QVZ */}
            <article className="press-item-card">
              <div className="press-item-thumb">
                <img src="/static/images/press-item-4.png" alt="QVZ Quvnoqlar va zukkolar" />
              </div>
              <div className="press-item-info">
                <div className="press-item-date">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg> 5-sentabr, 2024
                </div>
                <h3 className="press-item-title">QVZ - Quvnoqlar va zukkolar yangi mavsumiga start berildi</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                  Filial fakultetlararo talabalar ligasi o'yinlari uchun arizalar qabuli e'lon qilindi.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}
