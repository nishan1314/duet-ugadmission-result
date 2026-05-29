export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'super_admin'
  created_at: string
}

export interface SiteSettings {
  site_title: string
  site_description: string
  admission_year: string
  result_published: boolean
  show_announcement: boolean
  announcement_text: string
  maintenance_mode: boolean
  maintenance_message: string
}

export interface SearchLog {
  id: string
  applicant_id: string
  found: boolean
  department?: string
  searched_at: string
}

export interface VisitorLog {
  id: string
  visit_date: string
  visitor_hash: string
  page: string
  created_at: string
}
