import { withBase } from '../utils/basePath'

export default function Footer() {
  return (
    <footer className="site-footer" id="aloqa">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1: About */}
          <div className="footer-col">
            <h4 className="footer-column-title">Biz haqimizda</h4>
            <img src={withBase('/static/images/logo-footer.png')} alt="O'zMU Jizzax filiali" className="footer-about-logo" />
            <p className="footer-about-text">
              O'zbekiston Milliy universiteti Jizzax filiali iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish va qo'llab-quvvatlash bo'limi.
            </p>
          </div>

          {/* Col 2: Contact */}
          <div className="footer-col">
            <h4 className="footer-column-title">Bog'lanish</h4>
            <ul className="contact-list">
              <li className="contact-item">
                <span className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <span>130100, Jizzax viloyati, Jizzax shahri, Sh.Rashidov shox ko'chasi, 259 uy</span>
              </li>
              <li className="contact-item">
                <span className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </span>
                <span>https://jbnuu.uz rasmiy veb-sayti</span>
              </li>
              <li className="contact-item">
                <span className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <span>info@jbnuu.uz</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Social Media */}
          <div className="footer-col">
            <h4 className="footer-column-title">Ijtimoiy tarmoqlar</h4>
            <ul className="social-list">
              <li className="social-item">
                <a href="https://t.me/jbnuu_uz" target="_blank" rel="noopener" className="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                  </svg>
                  <span>Telegram kanalimiz</span>
                </a>
              </li>
              <li className="social-item">
                <a href="https://instagram.com" target="_blank" rel="noopener" className="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>Instagram sahifamiz</span>
                </a>
              </li>
              <li className="social-item">
                <a href="https://facebook.com" target="_blank" rel="noopener" className="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  <span>Facebook sahifamiz</span>
                </a>
              </li>
              <li className="social-item">
                <a href="https://youtube.com" target="_blank" rel="noopener" className="social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z" />
                  </svg>
                  <span>Youtube kanalimiz</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div>© 2024-2026 O'zMU Jizzax filiali. Barcha huquqlar himoyalangan.</div>
          <div>Iqtidorli talabalarning ilmiy-tadqiqot faoliyatini tashkil etish bo'limi</div>
        </div>
      </div>
    </footer>
  )
}
