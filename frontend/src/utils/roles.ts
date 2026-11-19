// Frontend oynasi uchun rol -> huquq xaritasi.
// Backenddagi RBAC manbasi: app/services/seed_data.py (seed_roles_and_permissions)
// va app/api/deps.py (get_current_admin / has_permission).

const STUDENT_LIKE_ROLES = new Set(['student', 'starosta'])

/** Talaba emas, "xodim" turidagi rol (admin, koordinator, hakam, tyutor, ilmiy rahbar va h.k.) */
export function isStaffRole(role: string | undefined | null): boolean {
  return !!role && !STUDENT_LIKE_ROLES.has(role)
}

/** app/api/deps.py:get_current_admin bilan bir xil: admin / super_admin / department_head */
export function isDeptHeadLevel(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'department_head'
}

export interface AdminCapabilities {
  isDeptHeadLevel: boolean
  canVerifyAchievements: boolean
  canReviewContests: boolean
  canViewReports: boolean
  canViewStarostas: boolean
  canManageStarostas: boolean
  canManageRoles: boolean
  canManageUsers: boolean
  canManageContent: boolean
  canManageSupervisorRequests: boolean
  canViewTutorStudents: boolean
  canViewMonitoring: boolean
  canReviewGiftedApplications: boolean
  canViewSemesterReports: boolean
  isSemesterReportAuthor: boolean
  canViewCompliance: boolean
}

/** seed_data.py role_definitions'dagi permissions ro'yxatiga mos keladigan tab huquqlari. */
export function getAdminCapabilities(role: string | undefined | null): AdminCapabilities {
  const deptHead = isDeptHeadLevel(role)
  // achievements.verify / starostas.view: department_head, faculty_coordinator (legacy: coordinator)
  // Nizom 24, 34: fakultet/kafedra mas'ullari (koordinator, dekan, kafedra mudiri)
  const facultyStaff = role === 'faculty_coordinator' || role === 'coordinator' || role === 'dean' || role === 'department_chair'
  const coordinatorLevel = deptHead || facultyStaff
  // contests.review / gifted_applications.review kafedra mudiriga berilmaydi (seed_data.py)
  const facultyReviewer = deptHead || (facultyStaff && role !== 'department_chair')
  // contests.review / reports.view: coordinatorLevel + jury_expert
  const reviewerLevel = facultyReviewer || role === 'jury_expert'
  // Rahbariyat (direktor, prorektor): butun universitet bo'yicha faqat ko'rish (seed_data.py: leadership)
  const leadership = role === 'leadership'

  return {
    isDeptHeadLevel: deptHead,
    canVerifyAchievements: coordinatorLevel,
    canReviewContests: reviewerLevel,
    canViewReports: coordinatorLevel || role === 'jury_expert' || leadership,
    canViewStarostas: coordinatorLevel || leadership,
    canManageStarostas: deptHead,
    canManageRoles: deptHead,
    canManageUsers: deptHead,
    canManageContent: deptHead,
    canManageSupervisorRequests: deptHead || role === 'supervisor',
    canViewTutorStudents: deptHead || role === 'tutor',
    // app/api/deps.py:get_current_admin bilan bir xil: backend ham faqat shu darajani qo'yadi
    canViewMonitoring: deptHead,
    // gifted_applications.review: department_head, faculty_coordinator (seed_data.py)
    canReviewGiftedApplications: facultyReviewer,
    // Nizom 7.8, 16.5, 33, 36: rag'batlantirish taklifi va qoidabuzarlik qayd etish (xodimlar)
    canViewCompliance: isStaffRole(role),
    isSemesterReportAuthor: role === 'supervisor' || role === 'tutor' || role === 'teacher',
    canViewSemesterReports: coordinatorLevel || role === 'supervisor' || role === 'tutor' || role === 'teacher',
  }
}
