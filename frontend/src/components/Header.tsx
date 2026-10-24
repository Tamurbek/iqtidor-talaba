import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ACTIVE_PAGE_BY_PATH: Record<string, string> = {
  '/': 'about',
  '/tanlovlar': 'contests',
  '/talabalar-akademiyasi': 'academy',
  '/matbuot-xizmati': 'press',
}

export default function Header() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activePage = ACTIVE_PAGE_BY_PATH[location.pathname]

  const handleGlobalLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand-logo" title="O'zMU Jizzax Filiali - Iqtidorli talabalar">
          <img src="/static/images/logo.png" alt="Iqtidorli talabalar O'zMU Jizzax filiali" />
        </Link>

        <nav>
          <ul className="nav-menu">
            <li><a href="/#haqida" id="nav-about" className={`nav-link ${activePage === 'about' ? 'active' : ''}`}>Iqtidorli talabalar</a></li>
            <li><Link to="/talabalar-akademiyasi" id="nav-academy" className={`nav-link ${activePage === 'academy' ? 'active' : ''}`}>Talabalar akademiyasi</Link></li>
            <li><a href="/#elonlar" id="nav-contests" className={`nav-link ${activePage === 'contests' ? 'active' : ''}`}>Tanlovlar</a></li>
            <li><Link to="/matbuot-xizmati" id="nav-press" className={`nav-link ${activePage === 'press' ? 'active' : ''}`}>Matbuot xizmati</Link></li>
          </ul>
        </nav>

        <div className="header-actions">
          {currentUser ? (
            <div className="header-user-profile">
              <Link to={currentUser.role === 'admin' ? '/admin' : '/dashboard'} className="btn-header-cabinet" id="headerCabinetBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{currentUser.role === 'admin' ? 'Boshqaruv paneli' : 'Shaxsiy kabinet'}</span>
              </Link>
              <a href="javascript:void(0)" onClick={handleGlobalLogout} className="btn-header-logout" title="Tizimdan chiqish" id="headerLogoutBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </a>
            </div>
          ) : (
            <Link to="/login" className="btn-header-login" id="headerLoginBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span>Tizimga kirish</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
