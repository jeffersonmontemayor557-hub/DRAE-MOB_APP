import { createEphemeralAuthClient, isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  defaultHotlinePoster,
  parseHotlinePosterConfig,
  type HotlinePosterConfig,
} from '../lib/hotlinePosterConfig';
import type {
  Advisory,
  DashboardStats,
  Hotline,
  Report,
  Resident,
  ResidentInput,
  ResidentWithReadiness,
  StaffInput,
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
    hazard_types: ['Flood', 'Landslide'],
    active: true,
    profile_id: null,
  },
  {
    id: 'f2222222-2222-2222-2222-222222222222',
    full_name: 'Jose R. Ramos',
    phone: '09170002222',
    role: 'Fire & Rescue Liaison',
    hazard_types: ['Fire', 'Earthquake'],
    active: true,
    profile_id: null,
  },
  {
    id: 'f3333333-3333-3333-3333-333333333333',
    full_name: 'Ana K. Cruz',
    phone: '09170003333',
    role: 'Operations Coordinator',
    hazard_types: ['Others', 'Tropical Cyclone'],
    active: true,
    profile_id: null,
  },
  {
    id: 'f4444444-4444-4444-4444-444444444444',
    full_name: 'Leo P. Mendoza',
    phone: '09170004444',
    role: 'General Response Pool',
    hazard_types: [],
    active: true,
    profile_id: null,
  },
];

const fallbackReports: Report[] = [
  {
    id: '1',
    reporter_name: 'Juan Dela Cruz',
    created_at: '2026-03-17T08:20:00Z',
    hazard_type: 'Flood',
    location_text: 'Paliparan III main road',
    latitude: 14.2997,
    longitude: 120.9875,
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
    latitude: 14.3272,
    longitude: 120.9764,
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
    latitude: 14.3457,
    longitude: 120.9447,
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
    latitude: 14.3298,
    longitude: 120.9371,
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
    latitude: 14.3185,
    longitude: 120.9288,
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
    is_verified: true,
    is_active: true,
    created_at: '2026-03-17T13:30:00Z',
  },
  {
    id: '2',
    title: 'Hotline Verification Notice',
    message: 'Use only official CDRRMO hotlines and verified advisories.',
    severity: 'low',
    source: 'CDRRMO Dasmarinas',
    is_verified: true,
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
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url,user_id',
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
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url,created_at,user_id',
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

function mapStaffRow(row: Record<string, unknown>): StaffMember {
  const ht = row.hazard_types;
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    phone: row.phone != null ? String(row.phone) : null,
    role: row.role != null ? String(row.role) : null,
    hazard_types: Array.isArray(ht) ? ht.map((x) => String(x)) : [],
    active: row.active !== false,
    profile_id: row.profile_id != null ? String(row.profile_id) : null,
  };
}

/** All staff (active and inactive) for admin CRUD; filter by active in the UI where needed. */
export async function getStaffMembers(): Promise<StaffMember[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackStaff;
  }

  const { data, error } = await supabase
    .from('staff_members')
    .select('id,full_name,phone,role,hazard_types,active,profile_id')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('getStaffMembers', error);
    return [];
  }
  return (data ?? []).map((row) => mapStaffRow(row as Record<string, unknown>));
}

export async function createResident(input: ResidentInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      full_name: input.full_name.trim() || null,
      address: input.address.trim() || null,
      contact_number: input.contact_number.trim() || null,
      gender: input.gender.trim() || null,
      age: input.age,
      email: input.email.trim() || null,
      contact_person: input.contact_person.trim() || null,
      contact_person_number: input.contact_person_number.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
      must_complete_profile: false,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }
  return String(data.id);
}

export async function updateResident(id: string, input: ResidentInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name.trim() || null,
      address: input.address.trim() || null,
      contact_number: input.contact_number.trim() || null,
      gender: input.gender.trim() || null,
      age: input.age,
      email: input.email.trim() || null,
      contact_person: input.contact_person.trim() || null,
      contact_person_number: input.contact_person_number.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
      must_complete_profile: false,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function deleteResident(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

/** Clears Supabase Auth link only (does not delete the auth.users row). */
export async function clearResidentAuthLink(profileId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase.from('profiles').update({ user_id: null }).eq('id', profileId);
  if (error) {
    throw error;
  }
}

export async function createStaffMember(input: StaffInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const name = input.full_name.trim();
  if (!name) {
    throw new Error('Staff name is required.');
  }
  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      full_name: name,
      role: input.role.trim() || null,
      phone: input.phone.trim() || null,
      hazard_types: input.hazard_types,
      active: input.active,
      profile_id: input.profile_id || null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }
  return String(data.id);
}

export async function updateStaffMember(id: string, input: StaffInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const name = input.full_name.trim();
  if (!name) {
    throw new Error('Staff name is required.');
  }
  const { error } = await supabase
    .from('staff_members')
    .update({
      full_name: name,
      role: input.role.trim() || null,
      phone: input.phone.trim() || null,
      hazard_types: input.hazard_types,
      active: input.active,
      profile_id: input.profile_id || null,
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function deleteStaffMember(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase.from('staff_members').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function getReports(): Promise<Report[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackReports;
  }

  const { data, error } = await supabase
    .from('incident_reports')
    .select(
      'id,reporter_name,created_at,hazard_type,location_text,latitude,longitude,description,status,evidence_url,audio_url,assigned_staff_id,staff_members(full_name,phone,role)',
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

export async function getHotlinePosterConfig(): Promise<HotlinePosterConfig> {
  if (!isSupabaseConfigured || !supabase) {
    return defaultHotlinePoster;
  }

  const { data, error } = await supabase
    .from('hotline_poster_config')
    .select('config')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('getHotlinePosterConfig', error);
    return defaultHotlinePoster;
  }

  return parseHotlinePosterConfig(data?.config) ?? defaultHotlinePoster;
}

export async function saveHotlinePosterConfig(config: HotlinePosterConfig) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const footer = config.footer.filter((r) => r.label.trim() && r.value.trim());
  const cleaned: HotlinePosterConfig = { ...config, footer };

  const parsed = parseHotlinePosterConfig(cleaned);
  if (!parsed) {
    throw new Error('Invalid poster configuration. Check all required fields and footer rows.');
  }

  const { error } = await supabase.from('hotline_poster_config').upsert(
    {
      id: 1,
      config: parsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

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
    .select('id,title,message,severity,source,is_verified,is_active,created_at')
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
  /** When false, mobile app shows unverified / drill styling (no checkmark). */
  isVerified: boolean;
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
    is_verified: input.isVerified,
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

export type CreateMobileAppLoginResult =
  | { ok: true; temporaryPassword: string }
  | { ok: false; message: string };

/** Strong one-time password for admin-created accounts (avoids ambiguous glyphs). */
function generateTemporaryPassword(length = 20): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@%^&*-_';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Readable placeholder name from an email local part (before @). */
function displayNameFromEmail(email: string): string {
  const local = (email.split('@')[0] ?? 'user').trim();
  const spaced = local.replace(/[._-]+/g, ' ').trim();
  if (!spaced) {
    return 'New user';
  }
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

const MIN_DASHBOARD_PASSWORD_LEN = 6;

type ProfilesEmailRow = { id: string; user_id: string | null };

/** Resolves profiles with exact email (caller passes normalized). */
async function loadProfilesByEmail(
  normalizedEmail: string,
): Promise<{ rows: ProfilesEmailRow[]; error: string | null }> {
  if (!supabase) {
    return { rows: [], error: 'Supabase is not configured.' };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_id')
    .eq('email', normalizedEmail);
  if (error) {
    return { rows: [], error: error.message };
  }
  return {
    rows: (data ?? []).map((r) => ({
      id: String((r as { id: unknown }).id),
      user_id: (r as { user_id: string | null }).user_id ?? null,
    })),
    error: null,
  };
}

export type QuickProvisionResult =
  | { ok: true; temporaryPassword: string; profileId: string }
  | { ok: false; message: string };

/**
 * Creates a resident profile (minimal), Auth login, and links profile.user_id.
 * Reuses an existing unlinked profile row with the same email when present.
 */
export async function createResidentWithEmailOnlyLogin(email: string): Promise<QuickProvisionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const normalized = normalizeLoginEmail(email);
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: 'Enter a valid email.' };
  }

  const { rows, error: loadErr } = await loadProfilesByEmail(normalized);
  if (loadErr) {
    return { ok: false, message: loadErr };
  }
  const withLogin = rows.filter((r) => r.user_id != null);
  if (withLogin.length > 0) {
    return {
      ok: false,
      message: 'A resident profile with this email already has a mobile login.',
    };
  }
  const unlinked = rows.filter((r) => r.user_id == null);
  if (unlinked.length > 1) {
    return {
      ok: false,
      message: 'Multiple resident rows share this email without a login. Merge or fix them first.',
    };
  }

  const ephemeral = createEphemeralAuthClient();
  if (!ephemeral) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  const now = new Date().toISOString();
  let profileId: string;

  if (unlinked.length === 1) {
    profileId = unlinked[0]!.id;
  } else {
    const label = `${displayNameFromEmail(normalized)} (household)`;
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({
        full_name: label,
        email: normalized,
        must_complete_profile: true,
        updated_at: now,
      })
      .select('id')
      .single();
    if (insErr) {
      return { ok: false, message: insErr.message };
    }
    profileId = String(inserted!.id);
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: signData, error: signErr } = await ephemeral.auth.signUp({
    email: normalized,
    password: temporaryPassword,
  });

  if (signErr) {
    if (unlinked.length === 0) {
      await supabase.from('profiles').delete().eq('id', profileId);
    }
    return { ok: false, message: formatSignUpErrorForAdmin(signErr.message) };
  }

  const userId = signData.user?.id;
  if (!userId) {
    return {
      ok: false,
      message:
        'No user id returned. In Supabase: Authentication → Providers → Email — disable “Confirm email” for local testing, then try again.',
    };
  }

  const linkPayload =
    unlinked.length === 1
      ? { user_id: userId, must_change_password: true, updated_at: now }
      : {
          user_id: userId,
          must_change_password: true,
          must_complete_profile: true,
          updated_at: now,
        };

  const { error: upErr } = await supabase.from('profiles').update(linkPayload).eq('id', profileId);

  if (upErr) {
    return {
      ok: false,
      message: `Auth user was created but linking failed: ${upErr.message}. Link manually in SQL or remove the Auth user in the Dashboard.`,
    };
  }

  return { ok: true, temporaryPassword, profileId };
}

/**
 * Creates a backing profile + Auth login + staff row (mobile app as staff).
 * Requires that no profile row with this email exists yet.
 */
export async function createStaffWithMobileLogin(
  input: StaffInput & { login_email: string },
): Promise<QuickProvisionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const normalized = normalizeLoginEmail(input.login_email);
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: 'Enter a valid login email.' };
  }

  const { rows, error: loadErr } = await loadProfilesByEmail(normalized);
  if (loadErr) {
    return { ok: false, message: loadErr };
  }
  if (rows.length > 0) {
    return {
      ok: false,
      message:
        'A profile with this email already exists. Use another login email or link an existing resident profile.',
    };
  }

  const ephemeral = createEphemeralAuthClient();
  if (!ephemeral) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  const now = new Date().toISOString();
  const name = input.full_name.trim() || displayNameFromEmail(normalized);
  const { data: inserted, error: insErr } = await supabase
    .from('profiles')
    .insert({
      full_name: name,
      email: normalized,
      contact_number: input.phone.trim() || null,
      must_complete_profile: true,
      updated_at: now,
    })
    .select('id')
    .single();
  if (insErr) {
    return { ok: false, message: insErr.message };
  }
  const profileId = String(inserted!.id);

  const temporaryPassword = generateTemporaryPassword();
  const { data: signData, error: signErr } = await ephemeral.auth.signUp({
    email: normalized,
    password: temporaryPassword,
  });

  if (signErr) {
    await supabase.from('profiles').delete().eq('id', profileId);
    return { ok: false, message: formatSignUpErrorForAdmin(signErr.message) };
  }

  const userId = signData.user?.id;
  if (!userId) {
    await supabase.from('profiles').delete().eq('id', profileId);
    return {
      ok: false,
      message:
        'No user id returned. In Supabase: Authentication → Providers → Email — disable “Confirm email” for local testing, then try again.',
    };
  }

  const { error: upErr } = await supabase
    .from('profiles')
    .update({
      user_id: userId,
      must_change_password: true,
      must_complete_profile: true,
      updated_at: now,
    })
    .eq('id', profileId);

  if (upErr) {
    return {
      ok: false,
      message: `Auth user was created but linking failed: ${upErr.message}.`,
    };
  }

  const { error: stErr } = await supabase.from('staff_members').insert({
    full_name: name,
    role: input.role.trim() || null,
    phone: input.phone.trim() || null,
    hazard_types: input.hazard_types,
    active: input.active,
    profile_id: profileId,
  });

  if (stErr) {
    return {
      ok: false,
      message: `Login created but staff row failed: ${stErr.message}. You can add the staff row manually and link profile ${profileId}.`,
    };
  }

  return { ok: true, temporaryPassword, profileId };
}

/**
 * Quick staff invite by email only (placeholder name/role). Prefer {@link createStaffWithMobileLogin} from the form.
 */
export async function createStaffWithEmailOnlyLogin(email: string): Promise<QuickProvisionResult> {
  const normalized = normalizeLoginEmail(email);
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, message: 'Enter a valid email.' };
  }
  return createStaffWithMobileLogin({
    full_name: `${displayNameFromEmail(normalized)} (staff)`,
    role: 'Response staff',
    phone: '',
    hazard_types: [],
    active: true,
    profile_id: null,
    login_email: normalized,
  });
}

function formatSignUpErrorForAdmin(raw: string): string {
  const m = raw.trim();
  const lower = m.toLowerCase();
  const lines: string[] = [m];

  if (lower.includes('rate limit')) {
    lines.push(
      '',
      'Supabase is temporarily limiting sign-ups and auth emails. Wait a few minutes, then try again.',
      'While testing: Authentication → Providers → Email → disable “Confirm email” so fewer messages are sent.',
      'Need many test accounts? Use Authentication → Users → Add user, then link the resident (Users page or Members), or clear profiles.user_id on the member and add by email again.',
    );
    return lines.join('\n');
  }

  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists')
  ) {
    lines.push(
      '',
      'That email already has an Auth account. Remove or reuse it in the Dashboard, or use a different login email.',
    );
    return lines.join('\n');
  }

  if (lower.includes('invalid') && lower.includes('email')) {
    lines.push(
      '',
      'Tip: The login email does not need to match the resident’s profile email in the table. Fictional domains in seed data (e.g. @email.com) are often rejected by Auth. Use a normal address (e.g. yourname@gmail.com) or a domain you control.',
    );
    return lines.join('\n');
  }

  return m;
}

/**
 * Links an existing profile row to a new Auth user (signUp + profiles.user_id).
 * The admin UI uses {@link createResidentWithEmailOnlyLogin} instead (email only, no profile picker).
 */
export async function createMobileAppLogin(params: {
  email: string;
  profileId: string;
}): Promise<CreateMobileAppLoginResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  const ephemeral = createEphemeralAuthClient();
  if (!ephemeral) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  const email = params.email.trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      message: 'Enter a valid login email.',
    };
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: existing, error: existingErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', params.profileId)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, message: existingErr.message };
  }

  if (existing?.user_id) {
    return {
      ok: false,
      message:
        'This resident already has a mobile login. To replace it, clear profiles.user_id in the SQL editor first.',
    };
  }

  const { data, error } = await ephemeral.auth.signUp({
    email,
    password: temporaryPassword,
  });

  if (error) {
    return { ok: false, message: formatSignUpErrorForAdmin(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      message:
        'No user id returned. In Supabase: Authentication → Providers → Email — disable “Confirm email” for local testing, then try again.',
    };
  }

  const { error: upError } = await supabase
    .from('profiles')
    .update({ user_id: userId, must_change_password: true })
    .eq('id', params.profileId);

  if (upError) {
    return {
      ok: false,
      message: `Account was created but linking failed: ${upError.message}. Link manually: update public.profiles set user_id = '${userId}' where id = '${params.profileId}';`,
    };
  }

  return { ok: true, temporaryPassword };
}

export type AppAdminDashboardRole = 'superadmin' | 'admin';

export type AppAdminRow = {
  userId: string;
  email: string;
  role: AppAdminDashboardRole;
  createdAt: string;
};

export type MyAdminAccess = {
  role: AppAdminDashboardRole;
  mustChangePassword: boolean;
};

export async function fetchMyAdminAccess(): Promise<MyAdminAccess | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    return null;
  }
  const { data, error } = await supabase
    .from('app_admins')
    .select('role,must_change_password')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !data?.role) {
    return null;
  }
  const r = String(data.role);
  if (r !== 'superadmin' && r !== 'admin') {
    return null;
  }
  return {
    role: r,
    mustChangePassword: (data as { must_change_password?: boolean }).must_change_password === true,
  };
}

/** Updates Supabase Auth password and clears app_admins.must_change_password for the signed-in dashboard user. */
export async function completeAdminPasswordChange(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const pwd = newPassword.trim();
  if (pwd.length < MIN_DASHBOARD_PASSWORD_LEN) {
    throw new Error(`Password must be at least ${MIN_DASHBOARD_PASSWORD_LEN} characters.`);
  }
  const { error: authErr } = await supabase.auth.updateUser({ password: pwd });
  if (authErr) {
    throw new Error(formatSupabaseCallError(authErr));
  }
  const { error: rpcErr } = await supabase.rpc('app_admin_clear_must_change_password');
  if (rpcErr) {
    throw new Error(formatSupabaseCallError(rpcErr));
  }
}

export async function superadminListAppAdmins(): Promise<AppAdminRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  const { data, error } = await supabase.rpc('superadmin_list_app_admins');
  if (error) {
    throw error;
  }
  return (data ?? []).map(
    (row: { user_id: string; email: string; role: string; created_at: string }) => ({
      userId: String(row.user_id),
      email: String(row.email ?? ''),
      role: (row.role === 'superadmin' ? 'superadmin' : 'admin') as AppAdminDashboardRole,
      createdAt: String(row.created_at ?? ''),
    }),
  );
}

/** Postgrest / Auth errors from @supabase/supabase-js are plain objects, not always `instanceof Error`. */
function formatSupabaseCallError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (!err || typeof err !== 'object') {
    return 'Request failed.';
  }
  const e = err as { message?: string; details?: string; hint?: string };
  const line = [e.message, e.details, e.hint].filter(Boolean).join(' — ');
  return line || 'Request failed.';
}

export type SuperadminAddAdminResult = {
  /** Present when a new Auth user was created via anon signUp (copy for the new admin). */
  temporaryPassword?: string;
};

function isMissingAuthUserRpcMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('no auth user with that email') ||
    m.includes('create the user under authentication') ||
    m.includes('invite or add user')
  );
}

/**
 * Grants dashboard access. If the email is not in Auth yet, creates it the same way as resident
 * “Create login” (ephemeral anon signUp + temp password) — no Supabase Dashboard step.
 */
export async function superadminAddAdminByEmail(
  email: string,
  role: AppAdminDashboardRole,
): Promise<SuperadminAddAdminResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Enter a valid email.');
  }

  const runRpc = async (pMustChangePassword: boolean) =>
    supabase.rpc('superadmin_add_admin_by_email', {
      p_email: normalized,
      p_role: role,
      p_must_change_password: pMustChangePassword,
    });

  let { error } = await runRpc(false);
  if (!error) {
    return {};
  }

  const firstMsg = formatSupabaseCallError(error);
  if (!isMissingAuthUserRpcMessage(firstMsg)) {
    throw new Error(firstMsg);
  }

  const ephemeral = createEphemeralAuthClient();
  if (!ephemeral) {
    throw new Error('Supabase is not configured.');
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data, error: signErr } = await ephemeral.auth.signUp({
    email: normalized,
    password: temporaryPassword,
  });

  if (signErr) {
    const sm = signErr.message.toLowerCase();
    if (
      sm.includes('already registered') ||
      sm.includes('already been registered') ||
      sm.includes('user already exists')
    ) {
      ({ error } = await runRpc(false));
      if (!error) {
        return {};
      }
      throw new Error(formatSupabaseCallError(error));
    }
    throw new Error(formatSignUpErrorForAdmin(signErr.message));
  }

  if (!data.user?.id) {
    throw new Error(
      'No user id returned. In Supabase: Authentication → Providers → Email — disable “Confirm email” for local testing, then try again.',
    );
  }

  ({ error } = await runRpc(true));
  if (!error) {
    return { temporaryPassword };
  }
  throw new Error(formatSupabaseCallError(error));
}

export async function superadminRemoveAdmin(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase.rpc('superadmin_remove_admin', { p_user_id: userId });
  if (error) {
    throw new Error(formatSupabaseCallError(error));
  }
}
