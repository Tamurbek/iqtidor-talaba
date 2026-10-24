export interface User {
  id: number
  hemis_id: string
  full_name: string
  role: string
  faculty?: string | null
  direction?: string | null
  group_name?: string | null
  course?: number | null
  image_url?: string | null
  education_type?: string | null
  payment_form?: string | null
  avg_gpa?: number | null
  social_points?: number | null
  scholarship_name?: string | null
  supervisor_id?: number | null
  supervisor_name?: string | null
  supervisor_degree?: string | null
  supervisor_department?: string | null
  supervisor_phone?: string | null
  research_topic?: string | null
  is_active: boolean
  created_at: string
  eimzo_serial?: string | null
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}
