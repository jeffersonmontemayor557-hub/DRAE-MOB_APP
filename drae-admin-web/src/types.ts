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
