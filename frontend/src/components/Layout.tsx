import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const DASHBOARD_PATHS = ['/dashboard', '/admin']

export default function Layout() {
  const location = useLocation()
  const isDashboard = DASHBOARD_PATHS.some((path) => location.pathname.startsWith(path))

  return (
    <>
      {!isDashboard && <Header />}
      <main>
        <Outlet />
      </main>
      {!isDashboard && <Footer />}
    </>
  )
}
