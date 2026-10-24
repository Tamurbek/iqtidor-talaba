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

export interface Achievement {
  id: number
  achievement_type: string
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
