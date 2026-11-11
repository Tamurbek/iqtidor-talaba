import { useEffect, useRef, useState } from 'react'
import type { RoleAssignment } from '../../types/user'

interface Props {
  title: string
  userName: string
  userRole?: string
  userLogin?: string
  avatarUrl?: string | null
  assignedRoles?: RoleAssignment[]
  activeRoleCode?: string | null
  onRoleChange?: (roleCode: string) => void
  onMenuClick: () => void
  onLogout: () => void
}

export default function CabinetTopbar({
  title,
  userName,
  userRole,
  userLogin,
  avatarUrl,
  assignedRoles,
  activeRoleCode,
  onRoleChange,
  onMenuClick,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hasMultipleRoles = (assignedRoles?.length ?? 0) > 1
  const canSwitchRole = !!onRoleChange && hasMultipleRoles

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  const activeRole = assignedRoles?.find((r) => r.code === activeRoleCode)

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
        <div className="role-switcher" ref={wrapperRef}>
          <button
            type="button"
            className="cabinet-topbar-user role-switcher-trigger"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="cabinet-topbar-avatar" />
            ) : (
              <div className="cabinet-topbar-avatar-placeholder">{userName ? userName[0] : 'T'}</div>
            )}
            <div className="cabinet-topbar-user-meta">
              <span className="cabinet-topbar-user-name" title={userName}>{userName}</span>
              {(activeRole?.name ?? userRole) && (
                <span className="cabinet-topbar-user-role">{activeRole?.name ?? userRole}</span>
              )}
            </div>
            <svg className="role-switcher-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {menuOpen && (
            <div className="role-switcher-panel">
              <div className="role-switcher-panel-header">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="cabinet-topbar-avatar" />
                ) : (
                  <div className="cabinet-topbar-avatar-placeholder">{userName ? userName[0] : 'T'}</div>
                )}
                <div>
                  <div className="role-switcher-panel-name">{userName}</div>
                  {userLogin && <div className="role-switcher-panel-login">{userLogin}</div>}
                </div>
              </div>

              <div className="role-switcher-section-title">Joriy rol</div>
              <div className="role-switcher-item active role-switcher-current">
                <span className="role-switcher-item-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <span className="role-switcher-item-text">
                  <span className="role-switcher-item-name">{activeRole?.name ?? userRole ?? 'Foydalanuvchi'}</span>
                  <span className="role-switcher-item-status">Faol</span>
                </span>
              </div>

              {canSwitchRole && (
                <>
                  <div className="role-switcher-section-title role-switcher-section-title-spaced">Rolni almashtirish</div>
                  <ul className="role-switcher-list">
                    {assignedRoles!.map((r) => {
                  const isActive = r.code === activeRoleCode
                  return (
                    <li key={r.code}>
                      <button
                        type="button"
                        className={`role-switcher-item${isActive ? ' active' : ''}`}
                        onClick={() => {
                          onRoleChange!(r.code)
                          setMenuOpen(false)
                        }}
                      >
                        <span className="role-switcher-item-icon" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </span>
                        <span className="role-switcher-item-text">
                          <span className="role-switcher-item-name">{r.name}</span>
                          {isActive && <span className="role-switcher-item-status">Faol</span>}
                        </span>
                        {isActive && <span className="role-switcher-item-dot" aria-hidden="true" />}
                      </button>
                    </li>
                  )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
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
