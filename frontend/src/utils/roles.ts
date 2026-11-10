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
}

/** seed_data.py role_definitions'dagi permissions ro'yxatiga mos keladigan tab huquqlari. */
export function getAdminCapabilities(role: string | undefined | null): AdminCapabilities {
  const deptHead = isDeptHeadLevel(role)
  // achievements.verify / starostas.view: department_head, faculty_coordinator (legacy: coordinator)
  const coordinatorLevel = deptHead || role === 'faculty_coordinator' || role === 'coordinator'
  // contests.review / reports.view: coordinatorLevel + jury_expert
  const reviewerLevel = coordinatorLevel || role === 'jury_expert'

  return {
    isDeptHeadLevel: deptHead,
    canVerifyAchievements: coordinatorLevel,
    canReviewContests: reviewerLevel,
    canViewReports: reviewerLevel,
    canViewStarostas: coordinatorLevel,
    canManageStarostas: deptHead,
    canManageRoles: deptHead,
    canManageUsers: deptHead,
    canManageContent: deptHead,
    canManageSupervisorRequests: role === 'supervisor',
  }
}
