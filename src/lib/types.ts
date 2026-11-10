export type Role = "candidate" | "employer" | "staff" | "admin";
export type JobStatus = "draft" | "pending_payment" | "pending_review" | "published" | "rejected" | "expired";
export type Sector = "mechanical" | "collision" | "parts_manufacturing" | "business_operations";
export type EmploymentType = "full_time" | "part_time" | "contract" | "apprenticeship" | "co_op" | "seasonal";
export type PayPeriod = "hour" | "year";
export type ApplyMethod = "on_site" | "external";

export interface Profile { id: string; role: Role; full_name: string | null }

export interface Company {
  id: string;
  name: string;
  website: string | null;
  city: string | null;
  province: string | null;
  is_member: boolean;
  member_verified_at?: string | null;
  membership_source?: "manual" | "insightly" | "hubspot";
  membership_checked_at?: string | null;
  membership_note?: string | null;
  insightly_org_id?: string | null;
  membership_lapsed_at?: string | null;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  sector: Sector;
  employment_type: EmploymentType;
  city: string;
  province: string;
  remote_ok: boolean;
  pay_min: number;
  pay_max: number;
  pay_period: PayPeriod;
  description: string;
  requirements: string | null;
  icar_training: string | null;
  uses_ai_screening: boolean;
  is_existing_vacancy: boolean;
  is_featured: boolean;
  career_id?: string | null;
  apply_method: ApplyMethod;
  apply_url: string | null;
  status: JobStatus;
  rejection_reason: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  companies?: Pick<Company, "name" | "is_member"> | null;
}

export interface Application {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  resume_path: string | null;
  status: "submitted" | "reviewed" | "shortlisted" | "declined";
  created_at: string;
}

export interface Career {
  id: string;
  slug: string;
  title: string;
  sector: Sector;
  summary: string;
  description: string;
  tasks: string;
  skills: string;
  training: string;
  education_level: string;
  salary_range: string;
  growth: string;
  search_terms: string;
  sort_order: number;
  is_published: boolean;
  outlook: string;
  day_in_life: string;
  certifications: string;
  red_seal_intro: string;
  red_seal: string;
  red_seal_note: string;
  hs_courses: string;
  provincial_programs: string;
  provincial_programs_note: string;
  education_required: string;
  education_text: string;
  noc_code: string;
}

export type ResourceKind = "organization" | "website" | "program" | "guide";
export type Audience = "students" | "parents" | "both";
export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  kind: ResourceKind;
  audience: Audience;
  sort_order: number;
  is_published: boolean;
}
