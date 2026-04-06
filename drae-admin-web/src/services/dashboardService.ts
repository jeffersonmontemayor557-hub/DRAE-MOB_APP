import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Advisory,
  DashboardStats,
  Hotline,
  Report,
  Resident,
  ResidentWithReadiness,
  StaffMember,
} from '../types';

const fallbackResidents: Resident[] = [
  {
    id: '1',
    full_name: 'Juan Dela Cruz',
    address: 'Paliparan III, Dasmarinas',
    contact_number: '09171234567',
    gender: 'Male',
    age: 30,
    email: 'juan.delacruz@email.com',
    contact_person: 'Maria Dela Cruz',
    contact_person_number: '09181234567',
  },
  {
    id: '2',
    full_name: 'Ana Santos',
    address: 'Salawag, Dasmarinas',
    contact_number: '09172345678',
    gender: 'Female',
    age: 27,
    email: 'ana.santos@email.com',
    contact_person: 'Leo Santos',
    contact_person_number: '09182345678',
  },
  {
    id: '3',
    full_name: 'Mark Reyes',
    address: 'Langkaan II, Dasmarinas',
    contact_number: '09173456789',
    gender: 'Male',
    age: 35,
    email: 'mark.reyes@email.com',
    contact_person: 'Lina Reyes',
    contact_person_number: '09183456789',
  },
  {
    id: '4',
    full_name: 'Joy Mendoza',
    address: 'Dasmarinas Bayan, Cavite',
    contact_number: '09174567890',
    gender: 'Female',
    age: 24,
    email: 'joy.mendoza@email.com',
    contact_person: 'Paolo Mendoza',
    contact_person_number: '09184567890',
  },
  {
    id: '5',
    full_name: 'Neil Garcia',
    address: 'San Agustin II, Dasmarinas',
    contact_number: '09175678901',
    gender: 'Male',
    age: 41,
    email: 'neil.garcia@email.com',
    contact_person: 'Rica Garcia',
    contact_person_number: '09185678901',
    avatar_url: 'https://api.dicebear.com/9.x/initials/png?seed=Neil%20Garcia',
  },
];

const fallbackStaff: StaffMember[] = [
  {
    id: 'f1111111-1111-1111-1111-111111111111',
    full_name: 'Maria L. Santos',
    phone: '09170001111',
    role: 'CDRRMO Field Responder',
  },
  {
    id: 'f2222222-2222-2222-2222-222222222222',
    full_name: 'Jose R. Ramos',
    phone: '09170002222',
    role: 'Fire & Rescue Liaison',
  },
  {
    id: 'f3333333-3333-3333-3333-333333333333',
    full_name: 'Ana K. Cruz',
    phone: '09170003333',
    role: 'Operations Coordinator',
  },
  {
    id: 'f4444444-4444-4444-4444-444444444444',
    full_name: 'Leo P. Mendoza',
    phone: '09170004444',
    role: 'General Response Pool',
  },
];

const fallbackReports: Report[] = [
  {
    id: '1',
    reporter_name: 'Juan Dela Cruz',
    created_at: '2026-03-17T08:20:00Z',
    hazard_type: 'Flood',
    location_text: 'Paliparan III main road',
    description: 'Waist-deep flood and stranded commuters.',
    status: 'submitted',
    evidence_url: null,
    audio_url: null,
    assigned_staff_id: 'f1111111-1111-1111-1111-111111111111',
    staff_members: { full_name: 'Maria L. Santos', phone: '09170001111', role: 'CDRRMO Field Responder' },
  },
  {
    id: '2',
    reporter_name: 'Ana Santos',
    created_at: '2026-03-17T09:05:00Z',
    hazard_type: 'Fire',
    location_text: 'Salawag market',
    description: 'Small fire from electrical post.',
    status: 'in_progress',
    evidence_url: null,
    audio_url: null,
    assigned_staff_id: 'f2222222-2222-2222-2222-222222222222',
    staff_members: { full_name: 'Jose R. Ramos', phone: '09170002222', role: 'Fire & Rescue Liaison' },
  },
  {
    id: '3',
    reporter_name: 'Mark Reyes',
    created_at: '2026-03-17T10:45:00Z',
    hazard_type: 'Landslide',
    location_text: 'Langkaan hillside area',
    description: 'Soil movement near homes.',
    status: 'submitted',
    evidence_url: null,
    audio_url: null,
    assigned_staff_id: 'f1111111-1111-1111-1111-111111111111',
    staff_members: { full_name: 'Maria L. Santos', phone: '09170001111', role: 'CDRRMO Field Responder' },
  },
  {
    id: '4',
    reporter_name: 'Joy Mendoza',
    created_at: '2026-03-17T11:10:00Z',
    hazard_type: 'Earthquake',
    location_text: 'Dasmarinas Bayan',
    description: 'Falling debris from old structure.',
    status: 'resolved',
    evidence_url: null,
    audio_url: null,
    assigned_staff_id: 'f2222222-2222-2222-2222-222222222222',
    staff_members: { full_name: 'Jose R. Ramos', phone: '09170002222', role: 'Fire & Rescue Liaison' },
  },
  {
    id: '5',
    reporter_name: 'Neil Garcia',
    created_at: '2026-03-17T12:30:00Z',
    hazard_type: 'Others',
    location_text: 'San Agustin II',
    description: 'Blocked drainage and rising water.',
    status: 'submitted',
    evidence_url: null,
    audio_url: null,
    assigned_staff_id: 'f3333333-3333-3333-3333-333333333333',
    staff_members: { full_name: 'Ana K. Cruz', phone: '09170003333', role: 'Operations Coordinator' },
  },
];

const fallbackAdvisories: Advisory[] = [
  {
    id: '1',
    title: 'Moderate Rain Advisory',
    message:
      'Expect moderate rain this afternoon. Residents near flood-prone areas should prepare for possible evacuation.',
    severity: 'medium',
    source: 'CDRRMO Dasmarinas',
    is_active: true,
    created_at: '2026-03-17T13:30:00Z',
  },
  {
    id: '2',
    title: 'Hotline Verification Notice',
    message: 'Use only official CDRRMO hotlines and verified advisories.',
    severity: 'low',
    source: 'CDRRMO Dasmarinas',
    is_active: true,
    created_at: '2026-03-17T14:00:00Z',
  },
];

const fallbackHotlines: Hotline[] = [
  { id: '1', label: 'CDRRMO', phone: '0464810555', priority: 1 },
  { id: '2', label: 'Police (PNP)', phone: '0464160254', priority: 2 },
  { id: '3', label: 'Fire (BFP)', phone: '0464160254', priority: 3 },
  { id: '4', label: 'Ambulance', phone: '09985665555', priority: 4 },
  { id: '5', label: 'Rescue 300 Base Radio', phone: '0464814400', priority: 5 },
];

export async function getResidents(): Promise<Resident[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackResidents;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getResidents', error);
    return [];
  }
  return (data ?? []) as Resident[];
}

/** Residents with latest household_readiness (go-bag / score) for admin tables. */
export async function getResidentsWithReadiness(): Promise<ResidentWithReadiness[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackResidents.map((r, i) => ({
      ...r,
      readiness_score: [83, 67, 50, 33, 17][i] ?? null,
      go_bag_ready: i !== 4,
      readiness_updated_at: null,
    }));
  }

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select(
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url,created_at',
    )
    .order('created_at', { ascending: false });

  if (pErr) {
    console.error('getResidentsWithReadiness profiles', pErr);
    return [];
  }

  const { data: readinessRows, error: rErr } = await supabase
    .from('household_readiness')
    .select('profile_id,score,checked_items,updated_at');

  if (rErr) {
    console.error('getResidentsWithReadiness readiness', rErr);
  }

  const byProfile = new Map<
    string,
    { score: number; checked_items: string[]; updated_at: string }
  >();
  for (const row of readinessRows ?? []) {
    const pid = row.profile_id as string | null;
    if (!pid) {
      continue;
    }
    const checked = Array.isArray(row.checked_items)
      ? row.checked_items.map((x) => String(x))
      : [];
    const prev = byProfile.get(pid);
    const ts = String(row.updated_at ?? '');
    if (!prev || ts > String(prev.updated_at ?? '')) {
      byProfile.set(pid, {
        score: Number(row.score ?? 0),
        checked_items: checked,
        updated_at: ts,
      });
    }
  }

  return (profiles ?? []).map((p) => {
    const hr = byProfile.get(p.id);
    const checked = hr?.checked_items ?? [];
    return {
      ...(p as Resident),
      readiness_score: hr ? hr.score : null,
      go_bag_ready: checked.includes('go_bag'),
      readiness_updated_at: hr?.updated_at ?? null,
    };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      residentCount: fallbackResidents.length,
      goBagReadyCount: 4,
      openEmergencyReports: fallbackReports.filter(
        (r) => r.status === 'submitted' || r.status === 'in_progress',
      ).length,
      activeStaffCount: fallbackStaff.length,
      activeAdvisoriesCount: fallbackAdvisories.filter((a) => a.is_active).length,
      hotlineCount: fallbackHotlines.length,
    };
  }

  const [
    { count: residentCount, error: e1 },
    { data: readinessData, error: e2 },
    { count: openEmergencyReports, error: e3 },
    { count: activeStaffCount, error: e4 },
    { count: activeAdvisoriesCount, error: e5 },
    { count: hotlineCount, error: e6 },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('household_readiness').select('checked_items'),
    supabase
      .from('incident_reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['submitted', 'in_progress']),
    supabase.from('staff_members').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('advisories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('hotlines').select('id', { count: 'exact', head: true }),
  ]);

  [e1, e2, e3, e4, e5, e6].forEach((err, i) => {
    if (err) {
      console.error('getDashboardStats query', i, err);
    }
  });

  const goBagReadyCount = (readinessData ?? []).filter(
    (r) => Array.isArray(r.checked_items) && r.checked_items.includes('go_bag'),
  ).length;

  return {
    residentCount: residentCount ?? 0,
    goBagReadyCount,
    openEmergencyReports: openEmergencyReports ?? 0,
    activeStaffCount: activeStaffCount ?? 0,
    activeAdvisoriesCount: activeAdvisoriesCount ?? 0,
    hotlineCount: hotlineCount ?? 0,
  };
}

export async function getStaffMembers(): Promise<StaffMember[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackStaff;
  }

  const { data, error } = await supabase
    .from('staff_members')
    .select('id,full_name,phone,role')
    .eq('active', true)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('getStaffMembers', error);
    return [];
  }
  return (data ?? []) as StaffMember[];
}

export async function getReports(): Promise<Report[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackReports;
  }

  const { data, error } = await supabase
    .from('incident_reports')
    .select(
      'id,reporter_name,created_at,hazard_type,location_text,description,status,evidence_url,audio_url,assigned_staff_id,staff_members(full_name,phone,role)',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getReports', error);
    return [];
  }
  return (data ?? []) as unknown as Report[];
}

export async function getHotlines(): Promise<Hotline[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackHotlines;
  }

  const { data, error } = await supabase
    .from('hotlines')
    .select('id,label,phone,priority')
    .order('priority', { ascending: true });

  if (error) {
    console.error('getHotlines', error);
    return [];
  }
  return (data ?? []) as Hotline[];
}

type HotlineInput = {
  label: string;
  phone: string;
  priority: number;
};

export async function saveHotline(input: HotlineInput, id?: string | null) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const query = id
    ? supabase.from('hotlines').update(input).eq('id', id)
    : supabase.from('hotlines').insert(input);
  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function deleteHotline(id: string) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase.from('hotlines').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function updateReportStatus(reportId: string, status: string) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('incident_reports')
    .update({ status })
    .eq('id', reportId);

  if (error) {
    throw error;
  }
}

export async function updateReportAssignment(reportId: string, staffId: string | null) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('incident_reports')
    .update({ assigned_staff_id: staffId })
    .eq('id', reportId);

  if (error) {
    throw error;
  }
}

export async function getAdvisories(): Promise<Advisory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackAdvisories;
  }

  const { data, error } = await supabase
    .from('advisories')
    .select('id,title,message,severity,source,is_active,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAdvisories', error);
    return [];
  }
  return (data ?? []) as Advisory[];
}

type AdvisoryInput = {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
};

export async function createAdvisory(input: AdvisoryInput) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase.from('advisories').insert({
    title: input.title,
    message: input.message,
    severity: input.severity,
    source: 'CDRRMO Dasmarinas',
    is_active: true,
  });

  if (error) {
    throw error;
  }
}

export async function toggleAdvisoryActive(id: string, isActive: boolean) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('advisories')
    .update({ is_active: !isActive })
    .eq('id', id);

  if (error) {
    throw error;
  }
}
