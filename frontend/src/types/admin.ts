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
  | 'profile-security'

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
}

// GET /achievements/all
export interface AdminAchievementListResponse {
  success: boolean
  total: number
  pending_count: number
  approved_count: number
  rejected_count: number
  achievements: AdminAchievement[]
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
  ranking: RankingItem[]
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
  students: StarostaStudent[]
}

export interface StarostasResponse {
  groups: StarostaGroup[]
  total_groups: number
  assigned_count: number
  unassigned_count: number
}

// GET /users
export interface AdminUser {
  id: number
  login: string
  full_name: string
  role: string
  role_names: string[]
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
}

// GET /users/supervisors/list
export interface SupervisorOption {
  id: number
  full_name: string
  faculty: string | null
  degree: string | null
  department: string | null
  capacity: number | null
  current_load: number
  is_full: boolean
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
}

// PUT /users/me
export interface UpdateMyProfileResponse {
  success: boolean
  message: string
  user: { id: number; login: string; full_name: string }
  access_token?: string
}

// POST /documents/upload-file
export interface DocumentUploadResponse {
  file_url: string
  file_size: string
  message: string
}
