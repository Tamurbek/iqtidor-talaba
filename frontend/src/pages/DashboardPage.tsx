import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import AdminDashboardPage from './AdminDashboardPage'
import CabinetSidebar from '../components/dashboard/CabinetSidebar'
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
import type { Achievement, Application, ExamStatus, MeResponse, StudentTabKey } from '../types/dashboard'
import { extractErrorMessage } from '../types/dashboard'

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
]

export default function DashboardPage() {
  const { currentUser, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

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
    if (!currentUser || isAdmin) return
    loadAchievements()
    loadApplications()
    loadExamStatus()
    loadMe()
  }, [currentUser, isAdmin, loadAchievements, loadApplications, loadExamStatus, loadMe])

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

  // Backend serves the admin dashboard for admin/department-head style roles on this
  // same route (see app/main.py:312-356); mirror that behaviour on the frontend.
  if (isAdmin) {
    return <AdminDashboardPage />
  }

  if (!currentUser) return null

  const achievementsPoints = achievements
    .filter((a) => a.status === 'approved')
    .reduce((sum, a) => sum + a.points, 0)

  return (
    <div className="cabinet-wrapper">
      <div className="cabinet-mobile-bar">
        <button className="cabinet-mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Kabinet menyusi</span>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0b3b70' }}>HEMIS: {currentUser.hemis_id}</span>
      </div>

      <div
        className={`cabinet-sidebar-backdrop${mobileOpen ? ' show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <CabinetSidebar
        user={currentUser}
        isStarosta={me?.is_starosta ?? false}
        activeTab={activeTab}
        achievementsCount={achievements.length}
        applicationsCount={applications.length}
        examPassed={examStatus?.status === 'passed'}
        examTotalScore={examStatus?.total_score}
        mobileOpen={mobileOpen}
        onSwitchTab={switchTab}
        onLogout={handleLogout}
      />

      <main className="cabinet-main">
        {activeTab === 'personal' && (
          <ProfileTab currentUser={currentUser} me={me} loading={meLoading} error={meError} />
        )}
        {activeTab === 'academic' && <AcademicTab user={currentUser} />}
        {activeTab === 'rating' && (
          <RatingTab
            user={currentUser}
            examStatus={examStatus}
            achievementsPoints={achievementsPoints}
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
        {activeTab === 'my-group' && me?.is_starosta && <GroupInfoTab user={currentUser} />}
      </main>
    </div>
  )
}
