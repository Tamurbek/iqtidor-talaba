interface Props {
  title: string
  userName: string
  userRole?: string
  avatarUrl?: string | null
  onMenuClick: () => void
  onLogout: () => void
}

export default function CabinetTopbar({ title, userName, userRole, avatarUrl, onMenuClick, onLogout }: Props) {
  return (
    <header className="cabinet-topbar">
      <div className="cabinet-topbar-left">
        <button
          type="button"
          className="cabinet-topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Menyuni ochish"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 className="cabinet-topbar-title" title={title}>{title}</h1>
      </div>

      <div className="cabinet-topbar-right">
        <div className="cabinet-topbar-user">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="cabinet-topbar-avatar" />
          ) : (
            <div className="cabinet-topbar-avatar-placeholder">{userName ? userName[0] : 'T'}</div>
          )}
          <div className="cabinet-topbar-user-meta">
            <span className="cabinet-topbar-user-name" title={userName}>{userName}</span>
            {userRole && <span className="cabinet-topbar-user-role">{userRole}</span>}
          </div>
        </div>

        <button
          type="button"
          className="cabinet-topbar-logout"
          onClick={onLogout}
          title="Tizimdan chiqish"
          aria-label="Tizimdan chiqish"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>
  )
}
