import type { PaginatedResponse } from './pagination'

export interface MeResponse {
  id: number
  login: string
  full_name: string
  role: string
  role_names?: string[]
  faculty?: string | null
  direction?: string | null
  group_name?: string | null
  course?: number | null
  image_url?: string | null
  is_active: boolean
  is_department_head: boolean
  is_starosta: boolean
}

// Nizom IV bo'lim, 13-modda jadvali: 8 ta "Ilmiy-ijodiy yutuqlar" indikatori (jami maks. 40 ball)
export const ACHIEVEMENT_CATEGORIES: Record<string, { label: string; maxPoints: number; perItem: number | null }> = {
  manaviy_marifiy: { label: "Ma'naviy-ma'rifiy tadbir va jamoat ishi", maxPoints: 4, perItem: 0.5 },
  innovatsion_loyiha: { label: 'Ilmiy-innovatsion tanlov/loyihadagi ishtirok', maxPoints: 8, perItem: null },
  intellektual_oyin: { label: "Intellektual o'yin / bilimlar tanlovi", maxPoints: 5, perItem: 1 },
  scopus_wos: { label: 'Scopus / Web of Science bazasidagi maqola', maxPoints: 8, perItem: 4 },
  oak_maqola: { label: "OAK ro'yxatidagi jurnal maqolasi", maxPoints: 4, perItem: 4 },
  konferensiya: { label: 'Mahalliy/xalqaro konferensiya maqola yoki tezisi', maxPoints: 2, perItem: 1 },
  patent: { label: 'Ixtiro, patent va mualliflik loyihasi (DGU)', maxPoints: 5, perItem: 5 },
  boshqa: { label: 'Boshqa tasdiqlangan yutuq (stipendiya, diplom, sertifikat)', maxPoints: 4, perItem: 2 },
}

export const INNOVATION_TYPE_CODE = 'innovatsion_loyiha'

export const ACHIEVEMENT_SCOPES: Record<string, { label: string; maxPoints: number; perItem: number }> = {
  filial: { label: 'Filial miqyosida', maxPoints: 2, perItem: 2 },
  respublika_xalqaro: { label: 'Respublika / xalqaro miqyosda', maxPoints: 8, perItem: 8 },
}

export function getAchievementCategoryLabel(code: string): string {
  return ACHIEVEMENT_CATEGORIES[code]?.label ?? code
}

export interface Achievement {
  id: number
  achievement_type: string
  scope?: string | null
  title: string
  description?: string | null
  file_url?: string | null
  points: number
  status: 'pending' | 'approved' | 'rejected' | string
  rejection_reason?: string | null
  created_at: string
}

export interface Application {
  id: number
  user_id: number
  student_name: string
  hemis_id: string
  faculty?: string | null
  direction?: string | null
  course?: number | null
  contest_id?: number | null
  contest_name: string
  portfolio_score: number
  gpa: number
  social_points: number
  nomination?: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  decision_note?: string | null
  created_at: string
}

export interface ApplicationListResponse extends PaginatedResponse<Application> {}

// GET /gifted-applications/my (Nizom 7.1/10-modda)
export interface GiftedApplication {
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
}

// Nizom 8, 14.5-modda: saralash davri (GET /selection-periods)
export interface CommissionMember {
  id: number
  full_name: string
  role?: string | null
}

export interface SelectionPeriod {
  id: number
  title: string
  academic_year: string
  order_number?: string | null
  start_date: string
  end_date: string
  quota?: number | null
  commission_member_ids: number[]
  commission_members: CommissionMember[]
  is_open: boolean
  applications_count: number
  approved_count: number
  created_at?: string | null
}

export interface ExamStatus {
  has_taken: boolean
  message?: string
  id?: number
  iq_score?: number
  history_score?: number
  lang_score?: number
  total_score?: number
  percentage?: number
  status?: 'passed' | 'failed' | string
  certificate_number?: string
  created_at?: string
}

export interface ExamQuestion {
  id: string
  section: 'iq' | 'history' | 'lang'
  points: number
  question: string
  options: string[]
}

export interface ExamQuestionsResponse {
  already_passed: boolean
  duration_minutes: number
  started_at: string | null
  remaining_seconds: number
  total_questions: number
  max_score: number
  sections: {
    iq: ExamQuestion[]
    history: ExamQuestion[]
    lang: ExamQuestion[]
  }
  result: { total_score: number; certificate_number: string } | null
}

export interface ExamStartResponse {
  started_at: string
  duration_seconds: number
  remaining_seconds: number
}

export interface ExamSubmitResponse {
  success: boolean
  status: 'passed' | 'failed' | string
  iq_score: number
  history_score: number
  lang_score: number
  total_score: number
  percentage: number
  certificate_number: string
  correct_answers: number
  total_questions: number
  message: string
}

export interface GroupStudent {
  id: number
  hemis_id: string
  full_name: string
  avg_gpa: number
  social_points: number
  approved_achievements: number
  portfolio_points: number
  contests_applied: number
  is_starosta: boolean
}

export interface MyGroupResponse {
  group_name: string
  faculty?: string | null
  direction?: string | null
  course?: number | null
  total_students: number
  students: GroupStudent[]
}

export type StudentTabKey =
  | 'personal'
  | 'academic'
  | 'rating'
  | 'my-achievements'
  | 'my-applications'
  | 'my-group'
  | 'online-exam'
  | 'contests'
  | 'upload'
  | 'calculator'
  | 'supervisor'
  | 'development-plan'
  | 'meetings'
  | 'gifted-application'

// app/schemas/development_plan.py
export interface DevelopmentTask {
  title: string
  deadline?: string | null
  status: string
  result_note?: string | null
}

// GET /development-plans/me, GET /development-plans/{student_id}
export interface DevelopmentPlan {
  id: number
  student_id: number
  supervisor_id: number
  goal: string
  tasks: DevelopmentTask[]
  start_date?: string | null
  end_date?: string | null
  status: 'draft' | 'active' | 'completed' | string
  student_agreed_at?: string | null
  tutor_agreed_at?: string | null
  created_at: string
  updated_at?: string | null
}

// GET /development-plans (rahbar uchun, talaba ma'lumotlari bilan)
export interface DevelopmentPlanWithStudent extends DevelopmentPlan {
  student_name: string
  student_hemis_id?: string | null
  student_group_name?: string | null
}

// app/schemas/meeting.py -> GET /meetings/me, GET /meetings/{student_id}
export interface Meeting {
  id: number
  student_id: number
  supervisor_id?: number | null
  tutor_id?: number | null
  meeting_date: string
  summary: string
  agreed_tasks?: string | null
  has_concern?: boolean
  concern_note?: string | null
  help_action?: string | null
  created_by?: number | null
  created_at: string
}

// GET /meetings (rahbar/tyutor uchun, talaba ma'lumotlari bilan)
export interface MeetingWithStudent extends Meeting {
  student_name: string
  student_hemis_id?: string | null
  student_group_name?: string | null
}

// app/services/ranking.py -> compute_achievement_points() bilan bir xil mantiq:
// faqat hujjat biriktirilgan va tasdiqlangan yutuqlar, har bir indikator o'z cap'i bilan.
export function computeAchievementBreakdown(achievements: Achievement[]): { total: number; byCategory: Record<string, number> } {
  const approvedWithDoc = achievements.filter((a) => a.status === 'approved' && a.file_url)

  const rawByCategory: Record<string, number> = {}
  const innovationByScope: Record<string, number> = { filial: 0, respublika_xalqaro: 0 }

  for (const a of approvedWithDoc) {
    if (a.achievement_type === INNOVATION_TYPE_CODE) {
      const scope = a.scope && ACHIEVEMENT_SCOPES[a.scope] ? a.scope : 'filial'
      innovationByScope[scope] += a.points
    } else if (ACHIEVEMENT_CATEGORIES[a.achievement_type]) {
      rawByCategory[a.achievement_type] = (rawByCategory[a.achievement_type] || 0) + a.points
    }
  }

  const byCategory: Record<string, number> = {}
  for (const [code, meta] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
    if (code === INNOVATION_TYPE_CODE) continue
    byCategory[code] = Math.round(Math.min(meta.maxPoints, rawByCategory[code] || 0) * 10) / 10
  }

  let innovationTotal = 0
  for (const [scopeCode, scopeMeta] of Object.entries(ACHIEVEMENT_SCOPES)) {
    innovationTotal += Math.min(scopeMeta.maxPoints, innovationByScope[scopeCode] || 0)
  }
  byCategory[INNOVATION_TYPE_CODE] = Math.round(Math.min(ACHIEVEMENT_CATEGORIES[INNOVATION_TYPE_CODE].maxPoints, innovationTotal) * 10) / 10

  const total = Math.round(Math.min(40, Object.values(byCategory).reduce((sum, v) => sum + v, 0)) * 10) / 10
  return { total, byCategory }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { detail?: unknown; message?: string } } }
  const data = axiosErr?.response?.data
  if (data) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg || JSON.stringify(d)))
        .join('\n')
    }
    if (data.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}
