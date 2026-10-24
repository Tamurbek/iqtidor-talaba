import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function SidebarBrand({ collapsed, onToggleCollapse }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="sidebar-brand-row">
      {!collapsed && (
        <Link to="/" className="sidebar-brand-logo" title="O'zMU Jizzax Filiali - Iqtidorli talabalar">
          <img src="/static/images/logo.png" alt="Iqtidorli talabalar O'zMU Jizzax filiali" />
        </Link>
      )}

      <div className="sidebar-brand-actions">
        <button
          type="button"
          className="sidebar-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? "Yorug' rejim" : "Qorong'i rejim"}
          aria-label="Mavzuni almashtirish"
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"}
          aria-label="Menyuni yig'ish/yoyish"
          aria-expanded={!collapsed}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  )
}
