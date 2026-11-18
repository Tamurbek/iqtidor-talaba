import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useApiResource } from '../hooks/useApiResource'
import { usePaginatedResource } from '../hooks/usePaginatedResource'
import type { ApplicationListResponse } from '../types/dashboard'
import type { DocumentListResponse, NewsListResponse } from '../types/content'
import type {
  AdminAchievementListResponse,
  AdminGiftedApplicationListResponse,
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
import GiftedApplicationsReviewTab from '../components/admin/GiftedApplicationsReviewTab'
import RankingExportTab from '../components/admin/RankingExportTab'
import StarostasTab from '../components/admin/StarostasTab'
import RolesTab from '../components/admin/RolesTab'
import AnnouncementsTab from '../components/admin/AnnouncementsTab'
import NewsTab from '../components/admin/NewsTab'
import UsersTab from '../components/admin/UsersTab'
import DocumentsTab from '../components/admin/DocumentsTab'
import ProfileTab from '../components/admin/ProfileTab'
import SupervisorTab from '../components/dashboard/SupervisorTab'
import TutorTab from '../components/dashboard/TutorTab'
import DevelopmentPlanTab from '../components/dashboard/DevelopmentPlanTab'
import MeetingsTab from '../components/dashboard/MeetingsTab'
import MonitoringTab from '../components/dashboard/MonitoringTab'
import ComplianceTab from '../components/admin/ComplianceTab'
import SemesterReportsTab from '../components/admin/SemesterReportsTab'
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
  'tutor-students',
  'monitoring',
  'gifted-applications',
  'semester-reports',
  'compliance',
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
  'tutor-students': 'Mening talabalarim',
  monitoring: 'Monitoring va hisobot',
  'gifted-applications': 'Saralash arizalari',
  'compliance': "Nazorat va rag'batlantirish",
  'semester-reports': "Semestr hisobotlari",
  'profile-security': 'Mening profilim & Parol',
}

const loadAchievements = (page: number, page_size: number) =>
  client.get<AdminAchievementListResponse>('/achievements/all', { params: { page, page_size } }).then(({ data }) => data)
const loadRanking = (page: number, page_size: number) =>
  client.get<RankingResponse>('/achievements/ranking', { params: { page, page_size } }).then(({ data }) => data)
const loadApplications = (page: number, page_size: number) =>
  client.get<ApplicationListResponse>('/applications/all', { params: { page, page_size } }).then(({ data }) => data)
const loadStarostas = () => client.get<StarostasResponse>('/roles/starostas').then(({ data }) => data.groups)
const loadRoles = () => client.get<RolesResponse>('/roles').then(({ data }) => data.roles)
const loadNews = (page: number, page_size: number) =>
  client.get<NewsListResponse>('/news', { params: { page, page_size } }).then(({ data }) => data)
const loadDocuments = (page: number, page_size: number) =>
  client.get<DocumentListResponse>('/documents', { params: { page, page_size } }).then(({ data }) => data)
const loadGiftedApplications = (page: number, page_size: number) =>
  client.get<AdminGiftedApplicationListResponse>('/gifted-applications/all', { params: { page, page_size } }).then(({ data }) => data)

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
  if (caps.canViewTutorStudents) visibleTabs.add('tutor-students')
  if (caps.canViewMonitoring) visibleTabs.add('monitoring')
  // Nizom 8-modda: saralash komissiyasi a'zosi (rolidan qat'i nazar) arizalarni ko'radi
  const [isCommissionMember, setIsCommissionMember] = useState(false)
  useEffect(() => {
    if (!currentUser) return
    client
      .get<number[]>('/selection-periods/my-commission')
      .then(({ data }) => setIsCommissionMember(data.length > 0))
      .catch(() => setIsCommissionMember(false))
  }, [currentUser])
  if (caps.canReviewGiftedApplications || isCommissionMember) visibleTabs.add('gifted-applications')

  if (caps.canViewSemesterReports) visibleTabs.add('semester-reports')

  if (caps.canViewCompliance) visibleTabs.add('compliance')

  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => {
    const fromHash = tabFromHash()
    return fromHash ?? 'moderation'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const [userSearch, setUserSearch] = useState('')
  const [userSearchDebounced, setUserSearchDebounced] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [userStatusFilter, setUserStatusFilter] = useState('all')

  useEffect(() => {
    const t = window.setTimeout(() => setUserSearchDebounced(userSearch.trim()), 300)
    return () => window.clearTimeout(t)
  }, [userSearch])

  const loadUsers = useCallback(
    (page: number, page_size: number) =>
      client
        .get<UsersListResponse>('/users', {
          params: {
            page,
            page_size,
            q: userSearchDebounced || undefined,
            role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
            is_active: userStatusFilter !== 'all' ? userStatusFilter === 'active' : undefined,
          },
        })
        .then(({ data }) => data),
    [userSearchDebounced, userRoleFilter, userStatusFilter]
  )

  // Joriy rolga tegishli bo'lmagan tab ochilib qolsa (masalan hash orqali),
  // foydalanuvchiga ko'rinadigan birinchi tabga o'tkazamiz.
  useEffect(() => {
    if (!visibleTabs.has(activeTab)) {
      setActiveTab(visibleTabs.values().next().value ?? 'profile-security')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, activeRole])

  const achievements = usePaginatedResource(loadAchievements, (r) => r.achievements, "Yutuqlar ro'yxatini yuklashda xatolik yuz berdi", caps.canVerifyAchievements, 8)
  const ranking = usePaginatedResource(loadRanking, (r) => r.ranking, "Reyting ma'lumotlarini yuklashda xatolik yuz berdi", caps.canViewReports, 10)
  const applications = usePaginatedResource(loadApplications, (r) => r.items, 'Tanlov arizalarini yuklashda xatolik yuz berdi', caps.canReviewContests, 10)
  const starostas = useApiResource(loadStarostas, "Guruh ma'lumotlarini yuklab bo'lmadi", caps.canViewStarostas)
  const roles = useApiResource(loadRoles, "Rollar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageRoles)
  const news = usePaginatedResource(loadNews, (r) => r.items, 'Yangiliklarni yuklashda xatolik yuz berdi', caps.canManageContent, 10)
  const documents = usePaginatedResource(loadDocuments, (r) => r.items, "Hujjatlar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageContent, 10)
  const users = usePaginatedResource(loadUsers, (r) => r.users, "Foydalanuvchilar ro'yxatini yuklashda xatolik yuz berdi", caps.canManageUsers, 10)
  const giftedApplications = usePaginatedResource(loadGiftedApplications, (r) => r.items, 'Saralash arizalarini yuklashda xatolik yuz berdi', caps.canReviewGiftedApplications, 10)

  const usersSetPage = users.setPage
  useEffect(() => {
    usersSetPage(1)
  }, [userSearchDebounced, userRoleFilter, userStatusFilter, usersSetPage])

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

  const pendingCount = achievements.response?.pending_count ?? null
  const approvedCount = achievements.response?.approved_count ?? null

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
            applications: applications.response ? applications.total : null,
            ranking: ranking.response ? ranking.total : null,
            groups: starostas.data?.length ?? null,
            roles: roles.data?.length ?? null,
            news: news.response ? news.total : null,
            documents: documents.response ? documents.total : null,
            users: users.response ? users.total : null,
            giftedApplications: giftedApplications.response ? giftedApplications.total : null,
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
              achievements={achievements.items}
              loading={achievements.loading}
              error={achievements.error}
              pendingCount={pendingCount}
              approvedCount={approvedCount}
              rankingCount={ranking.response ? ranking.total : null}
              page={achievements.page}
              totalPages={achievements.totalPages}
              total={achievements.total}
              pageSize={achievements.pageSize}
              onPageChange={achievements.setPage}
              onAchievementUpdated={(id, patch) =>
                achievements.setResponse((prev) => {
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
              applications={applications.items}
              loading={applications.loading}
              error={applications.error}
              page={applications.page}
              totalPages={applications.totalPages}
              total={applications.total}
              pageSize={applications.pageSize}
              onPageChange={applications.setPage}
              onApplicationUpdated={(app) =>
                applications.setResponse((prev) => (prev ? { ...prev, items: prev.items.map((a) => (a.id === app.id ? app : a)) } : prev))
              }
              showToast={showToast}
            />
          )}
          {activeTab === 'ranking' && (
            <RankingExportTab
              ranking={ranking.items}
              loading={ranking.loading}
              error={ranking.error}
              page={ranking.page}
              totalPages={ranking.totalPages}
              total={ranking.total}
              pageSize={ranking.pageSize}
              onPageChange={ranking.setPage}
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
              news={news.items}
              loading={news.loading}
              error={news.error}
              page={news.page}
              totalPages={news.totalPages}
              total={news.total}
              pageSize={news.pageSize}
              onPageChange={news.setPage}
              onReload={news.reload}
              onNewsDeleted={(id) => news.setResponse((prev) => (prev ? { ...prev, items: prev.items.filter((n) => n.id !== id) } : prev))}
              showToast={showToast}
            />
          )}
          {activeTab === 'add-document' && (
            <DocumentsTab
              documents={documents.items}
              loading={documents.loading}
              error={documents.error}
              page={documents.page}
              totalPages={documents.totalPages}
              total={documents.total}
              pageSize={documents.pageSize}
              onPageChange={documents.setPage}
              onReload={documents.reload}
              onDocumentDeleted={(id) => documents.setResponse((prev) => (prev ? { ...prev, items: prev.items.filter((d) => d.id !== id) } : prev))}
              showToast={showToast}
            />
          )}
          {activeTab === 'users-management' && (
            <UsersTab
              users={users.items}
              roles={roles.data}
              loading={users.loading}
              error={users.error}
              currentUserId={currentUser.id}
              page={users.page}
              totalPages={users.totalPages}
              total={users.total}
              pageSize={users.pageSize}
              onPageChange={users.setPage}
              search={userSearch}
              onSearchChange={setUserSearch}
              roleFilter={userRoleFilter}
              onRoleFilterChange={setUserRoleFilter}
              statusFilter={userStatusFilter}
              onStatusFilterChange={setUserStatusFilter}
              onReload={users.reload}
              showToast={showToast}
            />
          )}
          {activeTab === 'supervisor-requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SupervisorTab user={currentUser} hideSelfRequest />
              <DevelopmentPlanTab user={currentUser} mode="supervisor" />
              <MeetingsTab user={currentUser} mode="supervisor" />
            </div>
          )}
          {activeTab === 'tutor-students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TutorTab user={currentUser} />
              <DevelopmentPlanTab user={currentUser} mode="tutor" />
              <MeetingsTab user={currentUser} mode="tutor" />
            </div>
          )}
          {activeTab === 'monitoring' && <MonitoringTab />}
          {activeTab === 'gifted-applications' && (
            <GiftedApplicationsReviewTab
              applications={giftedApplications.items}
              loading={giftedApplications.loading}
              error={giftedApplications.error}
              page={giftedApplications.page}
              totalPages={giftedApplications.totalPages}
              total={giftedApplications.total}
              pageSize={giftedApplications.pageSize}
              onPageChange={giftedApplications.setPage}
              onApplicationUpdated={(app) =>
                giftedApplications.setResponse((prev) => (prev ? { ...prev, items: prev.items.map((a) => (a.id === app.id ? app : a)) } : prev))
              }
              showToast={showToast}
              canManagePeriods={caps.isDeptHeadLevel}
            />
          )}
          {activeTab === 'semester-reports' && (
            <SemesterReportsTab
              canAuthor={caps.isSemesterReportAuthor}
              isCoordinator={!caps.isDeptHeadLevel && caps.canVerifyAchievements}
              isDeptHead={caps.isDeptHeadLevel}
              showToast={showToast}
            />
          )}
          {activeTab === 'compliance' && (
            <ComplianceTab
              canRecordViolations={caps.isDeptHeadLevel || caps.canVerifyAchievements || (activeRole ?? currentUser?.role) === 'supervisor'}
              isDeptHead={caps.isDeptHeadLevel}
              showToast={showToast}
            />
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
