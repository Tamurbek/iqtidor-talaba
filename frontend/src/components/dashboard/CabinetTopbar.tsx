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
  const canSwitchRole = !!onRoleChange && (assignedRoles?.length ?? 0) > 1

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
            className={`cabinet-topbar-user role-switcher-trigger${canSwitchRole ? ' is-clickable' : ''}`}
            onClick={() => canSwitchRole && setMenuOpen((v) => !v)}
            disabled={!canSwitchRole}
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
            {canSwitchRole && (
              <svg className="role-switcher-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </button>

          {canSwitchRole && menuOpen && (
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

              <div className="role-switcher-section-title">Rolni almashtirish</div>
              <ul className="role-switcher-list">
                {assignedRoles!.map((r) => (
                  <li key={r.code}>
                    <button
                      type="button"
                      className={`role-switcher-item${r.code === activeRoleCode ? ' active' : ''}`}
                      onClick={() => {
                        onRoleChange!(r.code)
                        setMenuOpen(false)
                      }}
                    >
                      <span>{r.name}</span>
                      {r.code === activeRoleCode && <span className="role-switcher-badge">Faol</span>}
                    </button>
                  </li>
                ))}
              </ul>
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
