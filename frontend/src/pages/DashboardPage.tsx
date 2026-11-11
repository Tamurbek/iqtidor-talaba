import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import AdminDashboardPage from './AdminDashboardPage'
import CabinetSidebar from '../components/dashboard/CabinetSidebar'
import CabinetTopbar from '../components/dashboard/CabinetTopbar'
import ProfileTab from '../components/dashboard/ProfileTab'
import AcademicTab from '../components/dashboard/AcademicTab'
import RatingTab from '../components/dashboard/RatingTab'
import AchievementsTab from '../components/dashboard/AchievementsTab'
import ApplicationsTab from '../components/dashboard/ApplicationsTab'
import UploadTab from '../components/dashboard/UploadTab'
import ContestsTab from '../components/dashboard/ContestsTab'
import CalculatorTab from '../components/dashboard/CalculatorTab'
import ExamTab from '../components/dashboard/ExamTab'
import GroupInfoTab from '../components/dashboard/GroupInfoTab'
import SupervisorTab from '../components/dashboard/SupervisorTab'
import type { Achievement, Application, ExamStatus, MeResponse, StudentTabKey } from '../types/dashboard'
import { extractErrorMessage } from '../types/dashboard'
import { isStaffRole } from '../utils/roles'

const VALID_TABS: StudentTabKey[] = [
  'personal',
  'academic',
  'rating',
  'my-achievements',
  'my-applications',
  'my-group',
  'online-exam',
  'contests',
  'upload',
  'calculator',
  'supervisor',
]

const TAB_TITLES: Record<StudentTabKey, string> = {
  personal: "Shaxsiy ma'lumotlar",
  academic: "Akademik ma'lumotlar",
  rating: "Reyting va ko'rsatkichlar",
  'my-achievements': 'Mening yutuqlarim',
  'my-applications': 'Topshirgan arizalarim',
  'my-group': 'Guruhim talabalari',
  'online-exam': '1-bosqich: Onlayn test',
  contests: '6 ta Nominatsiyaga ariza',
  upload: 'Yutuq / Hujjat yuklash',
  calculator: 'Nizom 100 ball kalkulyatori',
  supervisor: 'Ilmiy rahbar',
}

export default function DashboardPage() {
  const { currentUser, logout, activeRole, setActiveRole } = useAuth()
  const navigate = useNavigate()
  const isStaff = isStaffRole(activeRole ?? currentUser?.role)

  const [activeTab, setActiveTab] = useState<StudentTabKey>('personal')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achievementsLoading, setAchievementsLoading] = useState(true)
  const [achievementsError, setAchievementsError] = useState<string | null>(null)

  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  const [examStatus, setExamStatus] = useState<ExamStatus | null>(null)
  const [examStatusLoading, setExamStatusLoading] = useState(true)

  const [me, setMe] = useState<MeResponse | null>(null)
  const [meLoading, setMeLoading] = useState(true)
  const [meError, setMeError] = useState<string | null>(null)

  const loadAchievements = useCallback(() => {
    setAchievementsLoading(true)
    setAchievementsError(null)
    client
      .get<{ success: boolean; achievements: Achievement[] }>('/achievements/my')
      .then(({ data }) => setAchievements(data.achievements))
      .catch((err) => setAchievementsError(extractErrorMessage(err, "Yutuqlarni yuklashda xatolik yuz berdi")))
      .finally(() => setAchievementsLoading(false))
  }, [])

  const loadApplications = useCallback(() => {
    setApplicationsLoading(true)
    setApplicationsError(null)
    client
      .get<Application[]>('/applications/my')
      .then(({ data }) => setApplications(data))
      .catch((err) => setApplicationsError(extractErrorMessage(err, 'Arizalarni yuklashda xatolik yuz berdi')))
      .finally(() => setApplicationsLoading(false))
  }, [])

  const loadExamStatus = useCallback(() => {
    setExamStatusLoading(true)
    client
      .get<ExamStatus>('/exam/status')
      .then(({ data }) => setExamStatus(data))
      .catch(() => setExamStatus(null))
      .finally(() => setExamStatusLoading(false))
  }, [])

  const loadMe = useCallback(() => {
    setMeLoading(true)
    setMeError(null)
    client
      .get<MeResponse>('/users/me')
      .then(({ data }) => setMe(data))
      .catch((err) => setMeError(extractErrorMessage(err, "Profil ma'lumotlarini yuklashda xatolik yuz berdi")))
      .finally(() => setMeLoading(false))
  }, [])

  useEffect(() => {
    if (!currentUser || isStaff) return
    loadAchievements()
    loadApplications()
    loadExamStatus()
    loadMe()
  }, [currentUser, isStaff, loadAchievements, loadApplications, loadExamStatus, loadMe])

  useEffect(() => {
    if (window.location.hash) {
      const h = window.location.hash.replace('#', '')
      if (VALID_TABS.includes(h as StudentTabKey)) {
        setActiveTab(h as StudentTabKey)
      }
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const switchTab = useCallback((tab: StudentTabKey) => {
    setActiveTab(tab)
    setMobileOpen(false)
    history.pushState(null, '', '#' + tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLogout = async () => {
    const confirmed = window.confirm('Haqiqatan ham shaxsiy kabinetdan chiqishni xohlaysizmi?')
    if (!confirmed) return
    await logout()
    navigate('/login')
  }

  // Talaba/starosta bo'lmagan barcha rollar (admin, department_head, coordinator,
  // faculty_coordinator, jury_expert, tutor, supervisor) boshqaruv paneliga yo'naltiriladi;
  // u yerda har bir rolga mos tablar getAdminCapabilities() orqali filtrlanadi.
  if (isStaff) {
    return <AdminDashboardPage />
  }

  if (!currentUser) return null

  // Admin/super_admin "Starosta" rolini tanlab ko'rib chiqsa ham (haqiqiy DB
  // bayrog'idan qat'iy nazar) starosta ko'rinishi (guruh boshqaruvi tabi) ochilsin.
  const isStarostaView = activeRole === 'starosta' || (me?.is_starosta ?? false)

  return (
    <div className="cabinet-wrapper">
      <div
        className={`cabinet-sidebar-backdrop${mobileOpen ? ' show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <CabinetSidebar
        user={currentUser}
        isStarosta={isStarostaView}
        activeTab={activeTab}
        achievementsCount={achievements.length}
        applicationsCount={applications.length}
        examPassed={examStatus?.status === 'passed'}
        examTotalScore={examStatus?.total_score}
        mobileOpen={mobileOpen}
        onSwitchTab={switchTab}
        onLogout={handleLogout}
      />

      <div className="cabinet-content">
        <CabinetTopbar
          title={TAB_TITLES[activeTab]}
          userName={currentUser.full_name}
          userRole={`HEMIS: ${currentUser.hemis_id}`}
          avatarUrl={currentUser.image_url}
          assignedRoles={currentUser.assigned_roles}
          activeRoleCode={activeRole ?? currentUser.role}
          onRoleChange={setActiveRole}
          onMenuClick={() => setMobileOpen((v) => !v)}
          onLogout={handleLogout}
        />

        <main className="cabinet-main">
        {activeTab === 'personal' && (
          <ProfileTab currentUser={currentUser} me={me} loading={meLoading} error={meError} />
        )}
        {activeTab === 'academic' && <AcademicTab user={currentUser} />}
        {activeTab === 'supervisor' && <SupervisorTab user={currentUser} />}
        {activeTab === 'rating' && (
          <RatingTab
            user={currentUser}
            examStatus={examStatus}
            achievements={achievements}
            onGoToCalculator={() => switchTab('calculator')}
          />
        )}
        {activeTab === 'my-achievements' && (
          <AchievementsTab
            achievements={achievements}
            loading={achievementsLoading}
            error={achievementsError}
            onGoToUpload={() => switchTab('upload')}
          />
        )}
        {activeTab === 'my-applications' && (
          <ApplicationsTab
            applications={applications}
            loading={applicationsLoading}
            error={applicationsError}
            onGoToContests={() => switchTab('contests')}
          />
        )}
        {activeTab === 'upload' && (
          <UploadTab onUploaded={(ach) => setAchievements((prev) => [ach, ...prev])} />
        )}
        {activeTab === 'contests' && (
          <ContestsTab onApplied={(app) => setApplications((prev) => [app, ...prev])} />
        )}
        {activeTab === 'calculator' && <CalculatorTab user={currentUser} />}
        {activeTab === 'online-exam' && (
          <ExamTab
            user={currentUser}
            examStatus={examStatus}
            examStatusLoading={examStatusLoading}
            onExamSubmitted={(result) =>
              setExamStatus({
                has_taken: true,
                status: result.status,
                iq_score: result.iq_score,
                history_score: result.history_score,
                lang_score: result.lang_score,
                total_score: result.total_score,
                percentage: result.percentage,
                certificate_number: result.certificate_number,
              })
            }
          />
        )}
        {activeTab === 'my-group' && isStarostaView && <GroupInfoTab user={currentUser} />}
        </main>
      </div>
    </div>
  )
}
