export type Resident = {
  id: string;
  full_name: string;
  address: string;
  contact_number: string;
  gender: string;
  age: number | null;
  email: string;
  contact_person: string;
  contact_person_number: string;
  avatar_url?: string | null;
  /** Set when the profile is linked to Supabase Auth (mobile login). */
  user_id?: string | null;
};

/** Optional preparedness row joined from household_readiness (one row per profile in typical use). */
export type ResidentWithReadiness = Resident & {
  readiness_score: number | null;
  go_bag_ready: boolean;
  readiness_updated_at: string | null;
};

export type StaffMember = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string | null;
  hazard_types?: string[];
  active?: boolean;
  profile_id?: string | null;
};

/** Payload for creating or updating a resident profile (no id / user_id). */
export type ResidentInput = {
  full_name: string;
  address: string;
  contact_number: string;
  gender: string;
  age: number | null;
  email: string;
  contact_person: string;
  contact_person_number: string;
  avatar_url: string | null;
};

/** Payload for creating or updating a staff row. */
export type StaffInput = {
  full_name: string;
  role: string;
  phone: string;
  hazard_types: string[];
  active: boolean;
  profile_id: string | null;
  /** When creating staff: if set, creates a linked profile + mobile login (temporary password shown). */
  login_email?: string;
};

export type Report = {
  id: string;
  reporter_name: string;
  created_at: string;
  hazard_type: string;
  location_text: string;
  description: string;
  status: string;
  evidence_url?: string | null;
  audio_url?: string | null;
  assigned_staff_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  staff_members?: {
    full_name: string;
    phone?: string | null;
    role?: string | null;
  } | null;
};

export type Advisory = {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
  is_verified?: boolean;
  is_active: boolean;
  created_at: string;
};

export type Hotline = {
  id: string;
  label: string;
  phone: string;
  priority: number;
};

export type DashboardStats = {
  residentCount: number;
  goBagReadyCount: number;
  openEmergencyReports: number;
  activeStaffCount: number;
  activeAdvisoriesCount: number;
  hotlineCount: number;
};
