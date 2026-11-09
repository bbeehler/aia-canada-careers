export type Role = "candidate" | "employer" | "admin";
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
