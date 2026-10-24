import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useApiResource } from '../hooks/useApiResource'
import type { Application } from '../types/dashboard'
import type { DocumentItem, NewsItem } from '../types/content'
import type {
  AdminAchievementListResponse,
  AdminTabKey,
  RankingResponse,
  RolesResponse,
  StarostasResponse,
  UsersListResponse,
} from '../types/admin'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminToasts, { type ToastItem, type ToastType } from '../components/admin/AdminToasts'
import AchievementsApprovalTab from '../components/admin/AchievementsApprovalTab'
import ApplicationsReviewTab from '../components/admin/ApplicationsReviewTab'
import RankingExportTab from '../components/admin/RankingExportTab'
import StarostasTab from '../components/admin/StarostasTab'
import RolesTab from '../components/admin/RolesTab'
import AnnouncementsTab from '../components/admin/AnnouncementsTab'
import NewsTab from '../components/admin/NewsTab'
import UsersTab from '../components/admin/UsersTab'
import DocumentsTab from '../components/admin/DocumentsTab'
import ProfileTab from '../components/admin/ProfileTab'
import '../styles/admin-dashboard.css'

const VALID_TABS: AdminTabKey[] = [
  'moderation',
  'contests-monitoring',
  'ranking',
  'starostas-management',
  'roles-management',
  'add-announcement',
  'add-news',
  'add-document',
  'users-management',
  'profile-security',
]

const loadAchievements = () => client.get<AdminAchievementListResponse>('/achievements/all').then(({ data }) => data)
const loadRanking = () => client.get<RankingResponse>('/achievements/ranking').then(({ data }) => data.ranking)
const loadApplications = () => client.get<Application[]>('/applications/all').then(({ data }) => data)
const loadStarostas = () => client.get<StarostasResponse>('/roles/starostas').then(({ data }) => data.groups)
const loadRoles = () => client.get<RolesResponse>('/roles').then(({ data }) => data.roles)
const loadNews = () => client.get<NewsItem[]>('/news', { params: { limit: 1000 } }).then(({ data }) => data)
const loadDocuments = () => client.get<DocumentItem[]>('/documents').then(({ data }) => data)
const loadUsers = () => client.get<UsersListResponse>('/users', { params: { limit: 1000 } }).then(({ data }) => data.users)

function tabFromHash(): AdminTabKey | null {
  const h = window.location.hash.replace('#', '')
  return VALID_TABS.includes(h as AdminTabKey) ? (h as AdminTabKey) : null
}

export default function AdminDashboardPage() {
  const { currentUser, isLoading, logout, updateCurrentUser, loginWithToken } = useAuth()
  const navigate = useNavigate()
  const isAdmin = currentUser?.role === 'admin'

  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => tabFromHash() ?? 'moderation')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const achievements = useApiResource(loadAchievements, "Yutuqlar ro'yxatini yuklashda xatolik yuz berdi", isAdmin)
  const ranking = useApiResource(loadRanking, "Reyting ma'lumotlarini yuklashda xatolik yuz berdi", isAdmin)
  const applications = useApiResource(loadApplications, 'Tanlov arizalarini yuklashda xatolik yuz berdi', isAdmin)
  const starostas = useApiResource(loadStarostas, "Guruh ma'lumotlarini yuklab bo'lmadi", isAdmin)
  const roles = useApiResource(loadRoles, "Rollar ro'yxatini yuklashda xatolik yuz berdi", isAdmin)
  const news = useApiResource(loadNews, 'Yangiliklarni yuklashda xatolik yuz berdi', isAdmin)
  const documents = useApiResource(loadDocuments, "Hujjatlar ro'yxatini yuklashda xatolik yuz berdi", isAdmin)
  const users = useApiResource(loadUsers, "Foydalanuvchilar ro'yxatini yuklashda xatolik yuz berdi", isAdmin)

  const closeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => closeToast(id), 3500)
  }, [closeToast])

  useEffect(() => {
    const onHashChange = () => {
      const tab = tabFromHash()
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleAdminMenuTab = useCallback((tab: AdminTabKey) => {
    if (window.innerWidth <= 992) setMobileOpen(false)
    setActiveTab(tab)
    history.replaceState(null, '', '#' + tab)
  }, [])

  // Login o'zgarsa, localStorage'dagi Bearer token (sub = eski login) yaroqsiz bo'lib qoladi.
  // Backend javobda yangi access_token qaytaradi — sessiyani uzmasdan uni almashtiramiz.
  const handleLoginChanged = useCallback((accessToken: string | undefined, updatedUser: { login: string; full_name: string }) => {
    if (accessToken && currentUser) {
      loginWithToken(accessToken, { ...currentUser, hemis_id: updatedUser.login, full_name: updatedUser.full_name })
      showToast('Login muvaffaqiyatli yangilandi.', 'success')
      return
    }
    showToast('Login o\'zgartirildi. Iltimos, yangi login bilan qayta kiring.', 'info')
    window.setTimeout(async () => {
      await logout()
      navigate('/login')
    }, 1500)
  }, [showToast, logout, navigate, loginWithToken, currentUser])

  const handleLogout = async () => {
    if (!window.confirm('Haqiqatan ham boshqaruv panelidan chiqishni xohlaysizmi?')) return
    await logout()
    navigate('/login')
  }

  if (isLoading) return null
  if (!currentUser) return <Navigate to="/login?next=/admin" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const pendingCount = achievements.data?.pending_count ?? null
  const approvedCount = achievements.data?.approved_count ?? null

  return (
    <>
      <div className="cabinet-mobile-bar">
        <button type="button" className="cabinet-mobile-toggle" aria-expanded={mobileOpen} aria-controls="adminSidebar" onClick={() => setMobileOpen((v) => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Boshqaruv menyusi</span>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0b3b70' }}>Administrator paneli</span>
      </div>

      <div className="cabinet-wrapper">
        <AdminSidebar
          fullName={currentUser.full_name}
          activeTab={activeTab}
          counts={{
            pending: pendingCount,
            applications: applications.data?.length ?? null,
            ranking: ranking.data?.length ?? null,
            groups: starostas.data?.length ?? null,
            roles: roles.data?.length ?? null,
            news: news.data?.length ?? null,
            documents: documents.data?.length ?? null,
            users: users.data?.length ?? null,
          }}
          mobileOpen={mobileOpen}
          onSwitchTab={handleAdminMenuTab}
          onLogout={handleLogout}
        />

        <main className="cabinet-main" style={{ padding: '20px 28px 60px', minWidth: 0 }}>
          {activeTab === 'moderation' && (
            <AchievementsApprovalTab
              achievements={achievements.data?.achievements ?? null}
              loading={achievements.loading}
              error={achievements.error}
              pendingCount={pendingCount}
              approvedCount={approvedCount}
              rankingCount={ranking.data?.length ?? null}
              onAchievementUpdated={(id, patch) =>
                achievements.setData((prev) => {
                  if (!prev) return prev
                  const updated = prev.achievements.map((a) => (a.id === id ? { ...a, ...patch } : a))
                  return {
                    ...prev,
                    achievements: updated,
                    pending_count: updated.filter((a) => a.status === 'pending').length,
                    approved_count: updated.filter((a) => a.status === 'approved').length,
                    rejected_count: updated.filter((a) => a.status === 'rejected').length,
                  }
                })
              }
              showToast={showToast}
            />
          )}
          {activeTab === 'contests-monitoring' && (
            <ApplicationsReviewTab
              applications={applications.data}
              loading={applications.loading}
              error={applications.error}
              onApplicationUpdated={(app) =>
                applications.setData((prev) => (prev ? prev.map((a) => (a.id === app.id ? app : a)) : prev))
              }
              showToast={showToast}
            />
          )}
          {activeTab === 'ranking' && (
            <RankingExportTab
              ranking={ranking.data}
              loading={ranking.loading}
              error={ranking.error}
              onReload={ranking.reload}
              showToast={showToast}
            />
          )}
          {activeTab === 'starostas-management' && (
            <StarostasTab
              groups={starostas.data}
              loading={starostas.loading}
              error={starostas.error}
              onStarostaAssigned={(groupName, studentId) =>
                starostas.setData((prev) =>
                  prev
                    ? prev.map((g) => {
                        if (g.group_name !== groupName) return g
                        const students = g.students.map((s) => ({ ...s, is_starosta: s.id === studentId }))
                        return { ...g, students, starosta: students.find((s) => s.id === studentId) ?? null }
                      })
                    : prev
                )
              }
              showToast={showToast}
            />
          )}
          {activeTab === 'roles-management' && (
            <RolesTab
              roles={roles.data}
              loading={roles.loading}
              error={roles.error}
              onReload={roles.reload}
              onRoleDeleted={(roleId) => roles.setData((prev) => (prev ? prev.filter((r) => r.id !== roleId) : prev))}
              showToast={showToast}
            />
          )}
          {activeTab === 'add-announcement' && <AnnouncementsTab />}
          {activeTab === 'add-news' && (
            <NewsTab
              news={news.data}
              loading={news.loading}
              error={news.error}
              onReload={news.reload}
              onNewsDeleted={(id) => news.setData((prev) => (prev ? prev.filter((n) => n.id !== id) : prev))}
              showToast={showToast}
            />
          )}
          {activeTab === 'add-document' && (
            <DocumentsTab
              documents={documents.data}
              loading={documents.loading}
              error={documents.error}
              onReload={documents.reload}
              onDocumentDeleted={(id) => documents.setData((prev) => (prev ? prev.filter((d) => d.id !== id) : prev))}
              showToast={showToast}
            />
          )}
          {activeTab === 'users-management' && (
            <UsersTab
              users={users.data}
              loading={users.loading}
              error={users.error}
              currentUserId={currentUser.id}
              onReload={users.reload}
              showToast={showToast}
            />
          )}
          {activeTab === 'profile-security' && (
            <ProfileTab showToast={showToast} onProfileUpdated={updateCurrentUser} onLoginChanged={handleLoginChanged} />
          )}
        </main>
      </div>

      <AdminToasts toasts={toasts} onClose={closeToast} />
    </>
  )
}
