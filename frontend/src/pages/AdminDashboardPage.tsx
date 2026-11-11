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
import CabinetTopbar from '../components/dashboard/CabinetTopbar'
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
import SupervisorTab from '../components/dashboard/SupervisorTab'
import { getAdminCapabilities } from '../utils/roles'
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
  'supervisor-requests',
  'profile-security',
]

const TAB_TITLES: Record<AdminTabKey, string> = {
  moderation: 'Moderatsiya (Yutuqlar)',
  'contests-monitoring': 'Tanlov arizalari',
  ranking: 'Talabalar reytingi',
  'starostas-management': 'Guruh sardorlari',
  'roles-management': 'Rollar va Huquqlar',
  'add-announcement': "E'lon / Tanlov qo'shish",
  'add-news': 'Yangiliklar boshqaruvi',
  'add-document': "Me'yoriy hujjatlar",
  'users-management': 'Foydalanuvchilar',
  'supervisor-requests': "Ilmiy rahbarlik so'rovlari",
  'profile-security': 'Mening profilim & Parol',
}

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
  const { currentUser, isLoading, logout, updateCurrentUser, loginWithToken, activeRole, setActiveRole } = useAuth()
  const navigate = useNavigate()

  const caps = getAdminCapabilities(activeRole ?? currentUser?.role)
  const visibleTabs = new Set<AdminTabKey>(['profile-security'])
  if (caps.canVerifyAchievements) visibleTabs.add('moderation')
  if (caps.canReviewContests) visibleTabs.add('contests-monitoring')
  if (caps.canViewReports) visibleTabs.add('ranking')
  if (caps.canViewStarostas) visibleTabs.add('starostas-management')
  if (caps.canManageRoles) visibleTabs.add('roles-management')
  if (caps.canManageContent) {
    visibleTabs.add('add-announcement')
    visibleTabs.add('add-news')
    visibleTabs.add('add-document')
  }
  if (caps.canManageUsers) visibleTabs.add('users-management')
  if (caps.canManageSupervisorRequests) visibleTabs.add('supervisor-requests')

  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => {
    const fromHash = tabFromHash()
    return fromHash ?? 'moderation'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  // Joriy rolga tegishli bo'lmagan tab ochilib qolsa (masalan hash orqali),
  // foydalanuvchiga ko'rinadigan birinchi tabga o'tkazamiz.
  useEffect(() => {
    if (!visibleTabs.has(activeTab)) {
      setActiveTab(visibleTabs.values().next().value ?? 'profile-security')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, activeRole])

  const achievements = useApiResource(loadAchievements, "Yutuqlar ro'yxatini yuklashda xatolik yuz berdi", caps.canVerifyAchievements)
  const ranking = useApiResource(loadRanking, "Reyting ma'lumotlarini yuklashda xatolik yuz berdi", caps.canViewReports)
  const applications = useApiResource(loadApplications, 'Tanlov arizalarini yuklashda xatolik yuz berdi', caps.canReviewContests)
  const starostas = useApiResource(loadStarostas, "Guruh ma'lumotlarini yuklab bo'lmadi", caps.canViewStarostas)
  const roles = useApiResource(loadRoles, "Rollar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageRoles)
  const news = useApiResource(loadNews, 'Yangiliklarni yuklashda xatolik yuz berdi', caps.canManageContent)
  const documents = useApiResource(loadDocuments, "Hujjatlar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageContent)
  const users = useApiResource(loadUsers, "Foydalanuvchilar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageUsers)

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

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
  if (currentUser.role === 'student') return <Navigate to="/dashboard" replace />

  const pendingCount = achievements.data?.pending_count ?? null
  const approvedCount = achievements.data?.approved_count ?? null

  return (
    <>
      <div
        className={`cabinet-sidebar-backdrop${mobileOpen ? ' show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

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
          visibleTabs={visibleTabs}
          mobileOpen={mobileOpen}
          onSwitchTab={handleAdminMenuTab}
          onLogout={handleLogout}
        />

        <div className="cabinet-content">
          <CabinetTopbar
            title={TAB_TITLES[activeTab]}
            userName={currentUser.full_name}
            userRole="Administrator paneli"
            userLogin={currentUser.hemis_id}
            assignedRoles={currentUser.assigned_roles}
            activeRoleCode={activeRole ?? currentUser.role}
            onRoleChange={setActiveRole}
            onMenuClick={() => setMobileOpen((v) => !v)}
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
              onStarostaRevoked={(groupName) =>
                starostas.setData((prev) =>
                  prev
                    ? prev.map((g) => {
                        if (g.group_name !== groupName) return g
                        const students = g.students.map((s) => ({ ...s, is_starosta: false }))
                        return { ...g, students, starosta: null }
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
              roles={roles.data}
              loading={users.loading}
              error={users.error}
              currentUserId={currentUser.id}
              onReload={users.reload}
              showToast={showToast}
            />
          )}
          {activeTab === 'supervisor-requests' && (
            <SupervisorTab user={currentUser} hideSelfRequest />
          )}
          {activeTab === 'profile-security' && (
            <ProfileTab showToast={showToast} onProfileUpdated={updateCurrentUser} onLoginChanged={handleLoginChanged} />
          )}
          </main>
        </div>
      </div>

      <AdminToasts toasts={toasts} onClose={closeToast} />
    </>
  )
}
