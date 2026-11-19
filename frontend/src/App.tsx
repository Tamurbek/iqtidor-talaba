import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import { RequireAuth } from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import AcademyPage from './pages/AcademyPage'
import PressPage from './pages/PressPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import NewsDetailPage from './pages/NewsDetailPage'
import { BASE_PATH } from './utils/basePath'

export default function App() {
  return (
    <BrowserRouter basename={BASE_PATH || undefined}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/tanlovlar" element={<HomePage />} />
              <Route path="/matbuot-xizmati" element={<PressPage />} />
              <Route path="/talabalar-akademiyasi" element={<AcademyPage />} />
              <Route path="/yangiliklar/:newsId" element={<NewsDetailPage />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminDashboardPage />
                  </RequireAuth>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
