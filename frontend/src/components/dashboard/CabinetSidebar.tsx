import type { User } from '../../types/user'
import type { StudentTabKey } from '../../types/dashboard'
import SidebarBrand from './SidebarBrand'
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse'

interface Props {
  user: User
  isStarosta: boolean
  activeTab: StudentTabKey
  achievementsCount: number
  applicationsCount: number
  examPassed: boolean
  examTotalScore?: number
  mobileOpen: boolean
  onSwitchTab: (tab: StudentTabKey) => void
  onLogout: () => void
}

export default function CabinetSidebar({
  user,
  isStarosta,
  activeTab,
  achievementsCount,
  applicationsCount,
  examPassed,
  examTotalScore,
  mobileOpen,
  onSwitchTab,
  onLogout,
}: Props) {
  const linkClass = (tab: StudentTabKey) => `cabinet-menu-link${activeTab === tab ? ' active' : ''}`
  const [collapsed, setCollapsed] = useSidebarCollapse()

  return (
    <aside className={`cabinet-sidebar${mobileOpen ? ' mobile-open' : ''}${collapsed ? ' collapsed' : ''}`} id="cabinetSidebar">
      <div className="cabinet-sidebar-inner">
        <SidebarBrand collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />

        <div className="cabinet-user-box">
          {user.image_url ? (
            <img src={user.image_url} alt={user.full_name} className="cabinet-user-avatar" />
          ) : (
            <div className="cabinet-user-avatar-placeholder">{user.full_name ? user.full_name[0] : 'T'}</div>
          )}
          <div className="cabinet-user-meta">
            <div className="cabinet-user-name" title={user.full_name}>{user.full_name}</div>
            <div className="cabinet-user-tag">HEMIS: {user.hemis_id}</div>
          </div>
        </div>

        <div className="cabinet-menu-title">Talaba ma'lumotlari</div>
        <ul className="cabinet-menu-list">
          <li>
            <button type="button" className={linkClass('personal')} id="side-link-personal" onClick={() => onSwitchTab('personal')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <span>Shaxsiy ma'lumotlar</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('academic')} id="side-link-academic" onClick={() => onSwitchTab('academic')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </span>
              <span>Akademik ma'lumotlar</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('rating')} id="side-link-rating" onClick={() => onSwitchTab('rating')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </span>
              <span>Reyting va ko'rsatkichlar</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('my-achievements')} id="side-link-my-achievements" onClick={() => onSwitchTab('my-achievements')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </span>
              <span>Mening yutuqlarim</span>
              <span className="cabinet-menu-badge badge-green">{achievementsCount}</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('my-applications')} id="side-link-my-applications" onClick={() => onSwitchTab('my-applications')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </span>
              <span>Topshirgan arizalarim</span>
              <span className="cabinet-menu-badge badge-orange">{applicationsCount}</span>
            </button>
          </li>
          {isStarosta && (
            <li>
              <button type="button" className={linkClass('my-group')} id="side-link-my-group" onClick={() => onSwitchTab('my-group')}>
                <span className="cabinet-menu-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span>Guruhim talabalari</span>
                <span className="cabinet-menu-badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>Guruh sardori</span>
              </button>
            </li>
          )}
        </ul>

        <div className="cabinet-menu-title" style={{ marginTop: 20 }}>"Iqtidor" tanlovi xizmatlari</div>
        <ul className="cabinet-menu-list">
          <li>
            <button type="button" className={linkClass('online-exam')} id="side-link-online-exam" onClick={() => onSwitchTab('online-exam')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <span>1-bosqich: Onlayn test</span>
              {examPassed ? (
                <span className="cabinet-menu-badge badge-green">{examTotalScore} ball</span>
              ) : (
                <span className="cabinet-menu-badge badge-orange">Sinov (40)</span>
              )}
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('contests')} id="side-link-contests" onClick={() => onSwitchTab('contests')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="6" r="2"></circle>
                  <line x1="12" y1="8" x2="12" y2="14"></line>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </span>
              <span>6 ta Nominatsiyaga ariza</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('upload')} id="side-link-upload" onClick={() => onSwitchTab('upload')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              <span>Yutuq / Hujjat yuklash</span>
            </button>
          </li>
          <li>
            <button type="button" className={linkClass('calculator')} id="side-link-calculator" onClick={() => onSwitchTab('calculator')}>
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                  <line x1="8" y1="6" x2="16" y2="6"></line>
                  <line x1="16" y1="14" x2="16" y2="18"></line>
                  <path d="M16 10h.01"></path>
                  <path d="M12 10h.01"></path>
                  <path d="M8 10h.01"></path>
                </svg>
              </span>
              <span>Nizom 100 ball kalkulyatori</span>
            </button>
          </li>
        </ul>

        <div className="cabinet-sidebar-footer">
          <a href="/" className="cabinet-footer-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Bosh sahifaga o'tish</span>
          </a>
          <button type="button" onClick={onLogout} className="cabinet-footer-btn btn-logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
