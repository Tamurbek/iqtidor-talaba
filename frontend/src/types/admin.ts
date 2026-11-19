import type { PaginatedResponse } from './pagination'

export type AdminTabKey =
  | 'moderation'
  | 'contests-monitoring'
  | 'ranking'
  | 'starostas-management'
  | 'roles-management'
  | 'add-announcement'
  | 'add-news'
  | 'users-management'
  | 'add-document'
  | 'supervisor-requests'
  | 'tutor-students'
  | 'monitoring'
  | 'gifted-applications'
  | 'semester-reports'
  | 'compliance'
  | 'profile-security'

// app/schemas/monitoring.py -> GET /monitoring/students
export interface StudentMonitoringItem {
  id: number
  full_name: string
  hemis_id: string
  faculty?: string | null
  direction?: string | null
  group_name?: string | null
  course?: number | null
  supervisor_id?: number | null
  supervisor_name?: string | null
  last_meeting_date?: string | null
  days_since_last_meeting?: number | null
  meeting_overdue: boolean
  plan_completion_pct?: number | null
  plan_overdue: boolean
  activity_score: number
  is_at_risk: boolean
  gpa?: number | null
  approved_achievements: number
  publications_count: number
  contest_applications: number
  last_data_update?: string | null
  data_stale: boolean
  meetings_in_period?: number | null
  achievements_in_period?: number | null
}

// GET /monitoring/summary
export interface MonitoringSummary {
  total_students: number
  at_risk_count: number
  avg_activity_score: number
  avg_plan_completion_pct: number
  students_without_plan: number
  avg_gpa?: number | null
  total_publications: number
  total_contest_applications: number
  students_with_stale_data: number
  generated_at: string
  period_start?: string | null
  avg_meetings_in_period?: number | null
  students_without_meeting_in_period?: number | null
  achievements_in_period?: number | null
}

// POST /monitoring/notify-at-risk
export interface NotifyAtRiskResponse {
  meeting_overdue_notified: number
  plan_overdue_notified: number
}

export type StudentMonitoringListResponse = PaginatedResponse<StudentMonitoringItem>

export type MonitoringPeriod = 'monthly' | 'semester' | 'annual'

// GET /monitoring/report
export interface MonitoringReportResponse {
  period: MonitoringPeriod
  generated_at: string
  summary: MonitoringSummary
  at_risk_students: StudentMonitoringItem[]
}

// GET /monitoring/reports
export interface StoredMonitoringReport {
  id: number
  period: MonitoringPeriod
  generated_at: string
  summary_json: Record<string, unknown>
  at_risk_count: number
}

export type StoredMonitoringReportListResponse = PaginatedResponse<StoredMonitoringReport>

// StudentAchievement modeli (app/models/achievement.py). Admin uchun barcha yutuqlar ro'yxatini
// qaytaruvchi API endpoint hozircha backendda mavjud emas.
export interface AdminAchievement {
  id: number
  user_id: number
  student_name: string
  hemis_id: string
  faculty?: string | null
  achievement_type: string
  scope?: string | null
  title: string
  description?: string | null
  file_url?: string | null
  points: number
  status: 'pending' | 'approved' | 'rejected' | string
  rejection_reason?: string | null
  created_at: string
  group_name?: string | null
  co_author_count?: number | null
  author_share?: number | null
}

// GET /gifted-applications/all (Nizom 7.1/10-modda)
export interface AdminGiftedApplication {
  id: number
  user_id: number
  student_name: string
  hemis_id: string
  faculty?: string | null
  direction?: string | null
  course?: number | null
  motivation_text?: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  decision_note?: string | null
  reviewed_by_id?: number | null
  reviewed_at?: string | null
  period_id?: number | null
  score_at_review?: number | null
  tier_at_review?: string | null
  created_at: string
  revoked_at?: string | null
  revoke_reason?: string | null
}

export interface AdminGiftedApplicationListResponse {
  items: AdminGiftedApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// GET /achievements/all
export interface AdminAchievementListResponse {
  success: boolean
  total: number
  pending_count: number
  approved_count: number
  rejected_count: number
  achievements: AdminAchievement[]
  page: number
  page_size: number
  total_pages: number
}

// app/services/ranking.py -> compute_ranking()
export interface RankingItem {
  id: number
  rank: number
  full_name: string
  hemis_id: string
  faculty: string
  direction: string
  course: string
  course_num: number
  gpa: number
  gpa_points: number
  exam_score: number
  exam_status: 'passed' | 'failed' | 'topshirmagan' | string
  exam_certificate: string | null
  ach_points: number
  category_points: Record<string, number>
  approved_count: number
  total_score: number
  tier_code: 'yuqori_salohiyat' | 'istiqbolli' | 'tavsiya' | string
  tier_label: string
  supervisor_id: number | null
  supervisor_name: string | null
  supervisor_degree: string | null
  supervisor_department: string | null
  supervisor_phone: string | null
  research_topic: string | null
}

export interface RankingResponse {
  success: boolean
  disclaimer?: string
  ranking: RankingItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// GET /roles
export interface RolePermission {
  id: number
  name: string
  code: string
  module: string
  description?: string | null
}

export interface RoleItem {
  id: number
  name: string
  code: string
  description: string | null
  is_system: boolean
  user_count: number
  permissions: RolePermission[]
}

export interface RolesResponse {
  roles: RoleItem[]
}

// GET /roles/{id}
export interface RoleDetail {
  id: number
  name: string
  code: string
  description: string | null
  is_system: boolean
  user_count: number
  permission_ids: number[]
}

// GET /roles/permissions
export interface PermissionsResponse {
  modules: Record<string, RolePermission[]>
  total: number
}

// GET /roles/starostas
export interface StarostaStudent {
  id: number
  hemis_id: string
  full_name: string
  avg_gpa: number
  social_points: number
  is_starosta: boolean
}

export interface StarostaGroup {
  group_name: string
  faculty: string
  direction: string
  course: number
  starosta: StarostaStudent | null
  tutor?: { id: number; full_name: string } | null
  student_count: number
}

export interface StarostasResponse {
  groups: StarostaGroup[]
  total: number
  page: number
  page_size: number
  total_pages: number
  faculties: string[]
  total_groups: number
  assigned_count: number
  unassigned_count: number
}

// GET /users
// Faqat shu rollar lokal parol bilan kiradi; talaba va xodimlar HEMIS orqali
export const PASSWORD_ROLES = ['admin', 'super_admin', 'jury_expert']

export const needsPassword = (u: Pick<AdminUser, 'role' | 'assigned_roles'>) =>
  PASSWORD_ROLES.includes(u.role) || u.assigned_roles.some((r) => PASSWORD_ROLES.includes(r.code))

export interface AdminUser {
  id: number
  login: string
  full_name: string
  role: string
  role_names: string[]
  assigned_roles: { code: string; name: string }[]
  faculty: string | null
  direction: string | null
  group_name: string | null
  course: number | null
  avg_gpa: number
  is_active: boolean
  created_at: string
}

export interface UsersListResponse {
  success: boolean
  total: number
  users: AdminUser[]
  page: number
  page_size: number
  total_pages: number
}

// GET /users/supervisors/list
export interface SupervisorOption {
  id: number
  full_name: string
  faculty: string | null
  degree: string | null
  department: string | null
  image_url: string | null
  capacity: number | null
  current_load: number
  is_full: boolean
}

// PATCH /supervisor-requests/capacity/{supervisor_id}
export interface SupervisorCapacityResponse {
  success: boolean
  message?: string
  capacity: number | null
}

// GET /supervisor-requests/mine
export interface SupervisorRequestItem {
  id: number
  supervisor_id: number
  supervisor_name: string
  supervisor_degree: string | null
  supervisor_department: string | null
  research_topic: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | string
  rejection_reason: string | null
  requested_at: string
  decided_at: string | null
}

// GET /supervisor-requests/incoming
export interface IncomingSupervisorRequest {
  id: number
  student_id: number
  student_name: string
  hemis_id: string
  faculty: string | null
  direction: string | null
  group_name: string | null
  research_topic: string | null
  requested_at: string
}

export interface IncomingSupervisorRequestListResponse extends PaginatedResponse<IncomingSupervisorRequest> {}

// GET /tutor/students
export interface TutorStudent {
  id: number
  hemis_id: string
  full_name: string
  faculty: string | null
  direction: string | null
  group_name: string | null
  course: number | null
  assigned_at: string
}

export interface MessageResponse {
  success?: boolean
  message?: string
}

// GET /users/me
export interface MyProfile {
  id: number
  login: string
  full_name: string
  role: string
  role_names: string[]
  faculty: string | null
  direction: string | null
  group_name: string | null
  course: number | null
  image_url: string | null
  is_active: boolean
  is_department_head: boolean
  is_starosta: boolean
  has_password?: boolean
}

// PUT /users/me
export interface UpdateMyProfileResponse {
  success: boolean
  message: string
  user: { id: number; login: string; full_name: string }
}

// POST /documents/upload-file
export interface DocumentUploadResponse {
  file_url: string
  file_size: string
  message: string
}
