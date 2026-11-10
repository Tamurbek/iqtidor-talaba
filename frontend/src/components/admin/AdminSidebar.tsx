import { Link } from 'react-router-dom'
import type { AdminTabKey } from '../../types/admin'
import SidebarBrand from '../dashboard/SidebarBrand'
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse'

export interface AdminSidebarCounts {
  pending: number | null
  applications: number | null
  ranking: number | null
  groups: number | null
  roles: number | null
  news: number | null
  documents: number | null
  users: number | null
}

interface Props {
  fullName: string
  activeTab: AdminTabKey
  counts: AdminSidebarCounts
  visibleTabs: Set<AdminTabKey>
  mobileOpen: boolean
  onSwitchTab: (tab: AdminTabKey) => void
  onLogout: () => void
}

const fmt = (n: number | null) => (n === null ? '—' : n)

export default function AdminSidebar({ activeTab, counts, visibleTabs, mobileOpen, onSwitchTab, onLogout }: Props) {
  const linkClass = (tab: AdminTabKey) => `cabinet-menu-link${activeTab === tab ? ' active' : ''}`
  const [collapsed, setCollapsed] = useSidebarCollapse()

  return (
    <aside className={`cabinet-sidebar${mobileOpen ? ' mobile-open' : ''}${collapsed ? ' collapsed' : ''}`} id="adminSidebar">
      <div className="cabinet-sidebar-inner">
        <SidebarBrand collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />

        <div className="cabinet-menu-title">Boshqaruv bo'limlari</div>
        <ul className="cabinet-menu-list">
          {visibleTabs.has('moderation') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('moderation')} className={linkClass('moderation')} id="admin-side-moderation">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </span>
              <span>Moderatsiya (Yutuqlar)</span>
              <span className="cabinet-menu-badge badge-orange" id="sidePendingBadge">{fmt(counts.pending)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('contests-monitoring') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('contests-monitoring')} className={linkClass('contests-monitoring')} id="admin-side-contests">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </span>
              <span>Tanlov arizalari</span>
              <span className="cabinet-menu-badge">{fmt(counts.applications)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('ranking') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('ranking')} className={linkClass('ranking')} id="admin-side-ranking">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <span>Talabalar reytingi</span>
              <span className="cabinet-menu-badge badge-green">{fmt(counts.ranking)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('starostas-management') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('starostas-management')} className={linkClass('starostas-management')} id="admin-side-starostas">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <polyline points="16 11 18 13 22 9"></polyline>
                </svg>
              </span>
              <span>Guruh sardorlari</span>
              <span className="cabinet-menu-badge badge-blue">{fmt(counts.groups)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('roles-management') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('roles-management')} className={linkClass('roles-management')} id="admin-side-roles">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <span>Rollar va Huquqlar</span>
              <span className="cabinet-menu-badge">{fmt(counts.roles)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('add-announcement') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('add-announcement')} className={linkClass('add-announcement')} id="admin-side-announcement">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </span>
              <span>E'lon / Tanlov qo'shish</span>
            </button>
          </li>
          )}
          {visibleTabs.has('add-news') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('add-news')} className={linkClass('add-news')} id="admin-side-news">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </span>
              <span>Yangiliklar boshqaruvi</span>
              <span className="cabinet-menu-badge" style={{ background: '#f1f5f9', color: '#475569' }} id="sideNewsBadge">{fmt(counts.news)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('add-document') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('add-document')} className={linkClass('add-document')} id="admin-side-documents">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </span>
              <span>Me'yoriy hujjatlar</span>
              <span className="cabinet-menu-badge" style={{ background: '#f1f5f9', color: '#475569' }} id="sideDocsBadge">{fmt(counts.documents)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('users-management') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('users-management')} className={linkClass('users-management')} id="admin-side-users">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </span>
              <span>Foydalanuvchilar</span>
              <span className="cabinet-menu-badge badge-blue" id="sideUsersBadge">{fmt(counts.users)}</span>
            </button>
          </li>
          )}
          {visibleTabs.has('supervisor-requests') && (
          <li>
            <button type="button" onClick={() => onSwitchTab('supervisor-requests')} className={linkClass('supervisor-requests')} id="admin-side-supervisor-requests">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <span>Ilmiy rahbarlik so'rovlari</span>
            </button>
          </li>
          )}
          <li>
            <button type="button" onClick={() => onSwitchTab('profile-security')} className={linkClass('profile-security')} id="admin-side-profile">
              <span className="cabinet-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <span>Mening profilim &amp; Parol</span>
            </button>
          </li>
        </ul>

        <div className="cabinet-sidebar-footer">
          <Link to="/" className="cabinet-footer-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Bosh sahifaga o'tish</span>
          </Link>
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
