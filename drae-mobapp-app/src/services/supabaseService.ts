import { PersonalInfo } from '../types/profile';
import { ReadinessState } from '../types/readiness';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';

export type Hotline = {
  id: string;
  label: string;
  phone: string;
};

export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  contact: string;
  latitude: number | null;
  longitude: number | null;
};

export type Advisory = {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
  createdAt: string;
  /** LGU / official source verification (requires DB column is_verified). */
  isVerified: boolean;
};

export type MyIncidentReport = {
  id: string;
  reporterName: string;
  reporterContact: string;
  hazardType: string;
  locationText: string;
  description: string;
  evidenceUrl: string;
  audioUrl: string;
  status: string;
  createdAt: string;
  assignedStaffName: string;
  assignedStaffPhone: string;
};

/** Incident assigned to the logged-in staff member (via staff_members.profile_id). */
export type StaffAssignmentReport = {
  id: string;
  reporterName: string;
  reporterContact: string;
  hazardType: string;
  locationText: string;
  description: string;
  status: string;
  createdAt: string;
};

export const defaultHotlines: Hotline[] = [
  { id: '1', label: 'CDRRMO', phone: '0464810555' },
  { id: '2', label: 'Police (PNP)', phone: '0464160254' },
  { id: '3', label: 'Fire (BFP)', phone: '0464160254' },
  { id: '4', label: 'Ambulance', phone: '09985665555' },
];

export const defaultEvacuationCenters: EvacuationCenter[] = [
  {
    id: '1',
    name: 'Dasmarinas City Gymnasium',
    address: 'Congressional Road, Dasmarinas',
    contact: '046-481-0555',
    latitude: 14.3262,
    longitude: 120.9399,
  },
  {
    id: '2',
    name: 'Paliparan Evacuation Site',
    address: 'Barangay Paliparan III, Dasmarinas',
    contact: '0917-777-5263',
    latitude: 14.2997,
    longitude: 120.9875,
  },
  {
    id: '3',
    name: 'Salawag Covered Court',
    address: 'Barangay Salawag, Dasmarinas',
    contact: '0998-834-5477',
    latitude: 14.3272,
    longitude: 120.9764,
  },
];

export const defaultAdvisories: Advisory[] = [
  {
    id: '1',
    title: 'Moderate Rain Advisory',
    message:
      'Expect light to moderate rain this afternoon. Residents near flood-prone areas should monitor water levels and prepare emergency kits.',
    severity: 'medium',
    source: 'CDRRMO Dasmarinas',
    createdAt: new Date().toISOString(),
    isVerified: true,
  },
  {
    id: '2',
    title: 'Hotline Reminder',
    message:
      'Save emergency hotlines and check your family evacuation plan before severe weather conditions develop.',
    severity: 'low',
    source: 'CDRRMO Dasmarinas',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isVerified: true,
  },
];

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(supabaseConfigError);
  }
  return supabase;
}

export type ProfileWithMeta = {
  id: string;
  profile: PersonalInfo;
  mustChangePassword: boolean;
};

function mapProfileRow(data: {
  id: unknown;
  full_name: string | null;
  address: string | null;
  contact_number: string | null;
  gender: string | null;
  age: number | null;
  email: string | null;
  contact_person: string | null;
  contact_person_number: string | null;
  avatar_url: string | null;
  must_change_password?: boolean | null;
}): ProfileWithMeta {
  return {
    id: String(data.id),
    mustChangePassword: data.must_change_password === true,
    profile: {
      fullName: String(data.full_name ?? ''),
      address: String(data.address ?? ''),
      contactNumber: String(data.contact_number ?? ''),
      gender: String(data.gender ?? ''),
      age: data.age != null ? String(data.age) : '',
      email: String(data.email ?? ''),
      contactPerson: String(data.contact_person ?? ''),
      contactPersonNumber: String(data.contact_person_number ?? ''),
      avatarUrl: String(data.avatar_url ?? ''),
    } satisfies PersonalInfo,
  };
}

export async function getAuthSession() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session ?? null;
}

export async function getAuthUserEmail() {
  const session = await getAuthSession();
  return session?.user.email ?? null;
}

/** User-facing sign-in error text plus common Supabase setup hints. */
export function formatSignInErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : 'Sign in failed.';

  const lower = msg.toLowerCase();
  const lines: string[] = [msg];

  if (lower.includes('email not confirmed')) {
    lines.push(
      '',
      'For local testing: Supabase Dashboard → Authentication → Providers → Email → turn off “Confirm email”, or open the confirmation link from your inbox.',
    );
    return lines.join('\n');
  }

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password')
  ) {
    lines.push(
      '',
      'Common fixes:',
      '• Auth users are not created by schema.sql or dummy_data.sql. Add each user under Dashboard → Authentication → Users → “Add user”, and set the same password you type in the app.',
      '• When adding the user, enable “Auto Confirm User” (or disable “Confirm email” under Providers → Email).',
      '• Reset the password for that user in the Dashboard if needed.',
      '• Check that .env EXPO_PUBLIC_SUPABASE_URL matches this Supabase project.',
    );
  }

  return lines.join('\n');
}

/** Sign-up and password-reset style errors (shared hints with sign-in where useful). */
export function formatSignUpErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : 'Sign up failed.';

  const lower = msg.toLowerCase();
  const lines: string[] = [msg];

  if (lower.includes('rate limit')) {
    lines.push(
      '',
      'Supabase is temporarily limiting sign-ups and auth emails. Wait a few minutes, then try again.',
      'While testing: Authentication → Providers → Email → disable “Confirm email” so fewer messages are sent.',
      'Need many test accounts? Create users under Authentication → Users in the Dashboard, or ask staff to use the admin App logins page instead of signing up repeatedly.',
    );
    return lines.join('\n');
  }

  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists')
  ) {
    lines.push('', 'Try “Log in” instead, or use “Forgot password” in Supabase / reset from the Dashboard.');
    return lines.join('\n');
  }

  if (lower.includes('password') && (lower.includes('short') || lower.includes('least'))) {
    lines.push('', 'Use at least 6 characters for your password.');
    return lines.join('\n');
  }

  if (lower.includes('invalid') && lower.includes('email')) {
    lines.push(
      '',
      'Tip: Use the same email stored on your resident profile (CDRRMO records). Some domains (e.g. made-up @email.com) are rejected—try Gmail or an address your project allows.',
    );
    return lines.join('\n');
  }

  return lines.join('\n');
}

export async function signInWithEmailPassword(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    throw error;
  }
}

/** Creates the Auth user. When email confirmation is off, a session is returned immediately. */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    throw error;
  }
  return { needsEmailConfirmation: !data.session };
}

/**
 * If this Auth user has no profiles.user_id row yet, link the first unlinked profile whose email matches (case-insensitive).
 * Used after self-service sign-up or first log-in (e.g. after confirming email).
 */
export async function tryLinkAuthUserToUnlinkedProfileByEmail(): Promise<
  'linked' | 'skipped_already_linked' | 'no_session' | 'no_match' | 'ambiguous'
> {
  const client = requireSupabase();
  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser();
  if (userErr || !user?.id || !user.email) {
    return 'no_session';
  }

  const existing = await fetchProfileByAuthUserId(user.id);
  if (existing) {
    return 'skipped_already_linked';
  }

  const normalized = user.email.trim().toLowerCase();
  const { data: rows, error } = await client.from('profiles').select('id,email').is('user_id', null);

  if (error) {
    throw error;
  }

  const matches = (rows ?? []).filter((r) => (r.email ?? '').trim().toLowerCase() === normalized);
  if (matches.length === 0) {
    return 'no_match';
  }
  if (matches.length > 1) {
    return 'ambiguous';
  }

  const { error: upErr } = await client
    .from('profiles')
    .update({
      user_id: user.id,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matches[0]!.id);

  if (upErr) {
    throw upErr;
  }
  return 'linked';
}

export async function signOutAuth() {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }
  await supabase.auth.signOut();
}

export async function fetchProfileByAuthUserId(authUserId: string): Promise<ProfileWithMeta | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url,must_change_password',
    )
    .eq('user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapProfileRow(data);
}

export async function saveProfileRemote(
  profile: PersonalInfo,
  existingProfileId: string | null,
) {
  const client = requireSupabase();
  let avatarUrl: string | null = profile.avatarUrl || null;

  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    avatarUrl = await uploadFileToEvidenceBucket(avatarUrl, 'profile-avatars');
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  const authUserId = user?.id ?? null;

  const payload = {
    full_name: profile.fullName,
    address: profile.address,
    contact_number: profile.contactNumber,
    gender: profile.gender,
    age: profile.age ? Number(profile.age) : null,
    email: profile.email,
    contact_person: profile.contactPerson,
    contact_person_number: profile.contactPersonNumber,
    avatar_url: avatarUrl,
  };

  if (existingProfileId) {
    const updatePayload = authUserId ? { ...payload, user_id: authUserId } : payload;
    const { data, error } = await client
      .from('profiles')
      .update(updatePayload)
      .eq('id', existingProfileId)
      .select('id,avatar_url')
      .single();
    if (error) {
      throw error;
    }
    return {
      id: String(data.id),
      avatarUrl: String(data.avatar_url ?? ''),
    };
  }

  const insertPayload = authUserId ? { ...payload, user_id: authUserId } : payload;

  const { data, error } = await client
    .from('profiles')
    .insert(insertPayload)
    .select('id,avatar_url')
    .single();
  if (error) {
    throw error;
  }
  return {
    id: String(data.id),
    avatarUrl: String(data.avatar_url ?? ''),
  };
}

/** Profile row for the current Supabase Auth session (by profiles.user_id). */
export async function fetchLatestProfile(): Promise<ProfileWithMeta | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) {
    return null;
  }

  return fetchProfileByAuthUserId(uid);
}

const MIN_APP_PASSWORD_LEN = 6;

/** Updates Auth password and clears must_change_password on the profile row. */
export async function finalizePasswordChange(profileRecordId: string, newPassword: string) {
  const client = requireSupabase();
  const pwd = newPassword.trim();
  if (pwd.length < MIN_APP_PASSWORD_LEN) {
    throw new Error(`Password must be at least ${MIN_APP_PASSWORD_LEN} characters.`);
  }

  const { error: authErr } = await client.auth.updateUser({ password: pwd });
  if (authErr) {
    throw authErr;
  }

  const { error: dbErr } = await client
    .from('profiles')
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', profileRecordId);

  if (dbErr) {
    throw dbErr;
  }
}

export async function fetchLatestReadiness(profileId: string | null) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  let query = supabase
    .from('household_readiness')
    .select('id,profile_id,score,checked_items,updated_at')
    .order('updated_at', { ascending: false });

  if (profileId) {
    query = query.eq('profile_id', profileId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id),
    profileId: data.profile_id ? String(data.profile_id) : null,
    readiness: {
      checkedIds: Array.isArray(data.checked_items)
        ? data.checked_items.map((item) => String(item))
        : [],
      score: Number(data.score ?? 0),
    } satisfies ReadinessState,
  };
}

export async function saveReadinessRemote(
  readiness: ReadinessState,
  existingReadinessId: string | null,
  profileId: string | null,
) {
  const client = requireSupabase();
  const payload = {
    profile_id: profileId,
    score: readiness.score,
    checked_items: readiness.checkedIds,
    updated_at: new Date().toISOString(),
  };

  if (existingReadinessId) {
    const { data, error } = await client
      .from('household_readiness')
      .update(payload)
      .eq('id', existingReadinessId)
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return String(data.id);
  }

  const { data, error } = await client
    .from('household_readiness')
    .insert(payload)
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return String(data.id);
}

async function uploadReportPhoto(photoUri: string) {
  return uploadFileToEvidenceBucket(photoUri, 'reports');
}

async function uploadReportAudio(audioUri: string) {
  return uploadFileToEvidenceBucket(audioUri, 'audio-reports');
}

async function uploadFileToEvidenceBucket(fileUri: string, folder: string) {
  const client = requireSupabase();
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const extension = fileUri.split('.').pop()?.split('?')[0] || 'bin';
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await client.storage
    .from('incident-evidence')
    .upload(filePath, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: false,
    });
  if (error) {
    throw error;
  }

  const { data } = client.storage.from('incident-evidence').getPublicUrl(filePath);
  return data.publicUrl;
}

type ReportInput = {
  profileId: string | null;
  reporterName: string;
  reporterContact: string;
  hazardType: string;
  locationText: string;
  description: string;
  photoUri: string | null;
  audioUri: string | null;
  /** Optional GPS from device at submit (for dispatch proximity). */
  latitude?: number | null;
  longitude?: number | null;
};

export type SubmitIncidentResult = {
  assignedStaffName?: string;
};

export async function submitIncidentReport(input: ReportInput): Promise<SubmitIncidentResult> {
  const client = requireSupabase();
  let evidenceUrl: string | null = null;
  let audioUrl: string | null = null;

  if (input.photoUri) {
    evidenceUrl = await uploadReportPhoto(input.photoUri);
  }
  if (input.audioUri) {
    audioUrl = await uploadReportAudio(input.audioUri);
  }

  const { data, error } = await client
    .from('incident_reports')
    .insert({
      profile_id: input.profileId,
      reporter_name: input.reporterName || null,
      reporter_contact: input.reporterContact || null,
      hazard_type: input.hazardType,
      location_text: input.locationText || null,
      description: input.description,
      evidence_url: evidenceUrl,
      audio_url: audioUrl,
      latitude:
        input.latitude != null && Number.isFinite(input.latitude) ? input.latitude : null,
      longitude:
        input.longitude != null && Number.isFinite(input.longitude) ? input.longitude : null,
      status: 'submitted',
    })
    .select('id, staff_members(full_name)')
    .single();

  if (error) {
    throw error;
  }

  const embed = data?.staff_members as { full_name?: string } | null | undefined;
  const name = embed?.full_name ? String(embed.full_name) : '';
  return name ? { assignedStaffName: name } : {};
}

type MyReportsFilter = {
  profileId: string | null;
  reporterName: string;
  reporterContact: string;
};

export async function fetchMyIncidentReports(filter: MyReportsFilter) {
  if (!isSupabaseConfigured || !supabase) {
    return [] as MyIncidentReport[];
  }

  const reporterName = filter.reporterName.trim();
  const reporterContact = filter.reporterContact.trim();
  const hasIdentity = Boolean(filter.profileId || reporterName || reporterContact);
  if (!hasIdentity) {
    return [] as MyIncidentReport[];
  }

  let query = supabase
    .from('incident_reports')
    .select(
      'id,reporter_name,reporter_contact,hazard_type,location_text,description,evidence_url,audio_url,status,created_at,profile_id,assigned_staff_id,staff_members(full_name,phone)',
    )
    .order('created_at', { ascending: false });

  if (filter.profileId) {
    query = query.eq('profile_id', filter.profileId);
  } else if (reporterName && reporterContact) {
    query = query
      .eq('reporter_name', reporterName)
      .eq('reporter_contact', reporterContact);
  } else if (reporterName) {
    query = query.eq('reporter_name', reporterName);
  } else {
    query = query.eq('reporter_contact', reporterContact);
  }

  const { data, error } = await query.limit(50);
  if (error || !data) {
    return [] as MyIncidentReport[];
  }

  return data.map((item) => {
    const embed = item.staff_members as { full_name?: string; phone?: string | null } | null | undefined;
    const staffName = embed?.full_name ? String(embed.full_name) : '';
    const staffPhone = embed?.phone ? String(embed.phone) : '';
    return {
      id: String(item.id),
      reporterName: String(item.reporter_name ?? ''),
      reporterContact: String(item.reporter_contact ?? ''),
      hazardType: String(item.hazard_type ?? ''),
      locationText: String(item.location_text ?? ''),
      description: String(item.description ?? ''),
      evidenceUrl: String(item.evidence_url ?? ''),
      audioUrl: String(item.audio_url ?? ''),
      status: String(item.status ?? 'submitted'),
      createdAt: String(item.created_at ?? new Date().toISOString()),
      assignedStaffName: staffName,
      assignedStaffPhone: staffPhone,
    };
  });
}

export async function fetchStaffMemberIdByProfileId(
  profileId: string | null,
): Promise<string | null> {
  if (!profileId || !isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('staff_members')
    .select('id')
    .eq('profile_id', profileId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('fetchStaffMemberIdByProfileId', error);
    return null;
  }
  if (!data?.id) {
    return null;
  }
  return String(data.id);
}

export async function fetchStaffAssignments(staffId: string): Promise<StaffAssignmentReport[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('incident_reports')
    .select(
      'id,reporter_name,reporter_contact,hazard_type,location_text,description,status,created_at',
    )
    .eq('assigned_staff_id', staffId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchStaffAssignments', error);
    return [];
  }

  return (data ?? []).map((item) => ({
    id: String(item.id),
    reporterName: String(item.reporter_name ?? ''),
    reporterContact: String(item.reporter_contact ?? ''),
    hazardType: String(item.hazard_type ?? ''),
    locationText: String(item.location_text ?? ''),
    description: String(item.description ?? ''),
    status: String(item.status ?? 'submitted'),
    createdAt: String(item.created_at),
  }));
}

export async function countStaffOpenAssignments(staffId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from('incident_reports')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_staff_id', staffId)
    .in('status', ['submitted', 'in_progress']);

  if (error) {
    console.error('countStaffOpenAssignments', error);
    return 0;
  }
  return count ?? 0;
}

function isOpenAssignmentStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'submitted' || s === 'in_progress';
}

/** Returns IDs of open (actionable) reports assigned to this staff member. */
export async function fetchStaffOpenAssignmentIds(staffId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('incident_reports')
    .select('id,status')
    .eq('assigned_staff_id', staffId);

  if (error) {
    console.error('fetchStaffOpenAssignmentIds', error);
    return [];
  }

  return (data ?? [])
    .filter((row) => isOpenAssignmentStatus(String(row.status ?? '')))
    .map((row) => String(row.id));
}

export function subscribeToStaffAssignments(staffId: string, onEvent: () => void) {
  if (!isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const client = supabase;
  const channel = client
    .channel(`staff-assign-bell-${staffId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incident_reports',
        filter: `assigned_staff_id=eq.${staffId}`,
      },
      () => {
        onEvent();
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToStaffAssignmentList(
  staffId: string,
  onChange: (reports: StaffAssignmentReport[]) => void,
) {
  if (!isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const client = supabase;
  const channel = client
    .channel(`staff-assign-list-${staffId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incident_reports',
        filter: `assigned_staff_id=eq.${staffId}`,
      },
      async () => {
        const reports = await fetchStaffAssignments(staffId);
        onChange(reports);
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToMyIncidentReports(
  filter: MyReportsFilter,
  onChange: (reports: MyIncidentReport[]) => void,
) {
  if (!isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const reporterName = filter.reporterName.trim();
  const reporterContact = filter.reporterContact.trim();
  const hasIdentity = Boolean(filter.profileId || reporterName || reporterContact);
  if (!hasIdentity) {
    return () => undefined;
  }

  const client = supabase;
  const channelName =
    filter.profileId || `${reporterName || 'reporter'}-${reporterContact || 'contact'}`;
  const channel = client
    .channel(`my-reports-${channelName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incident_reports' },
      async () => {
        const reports = await fetchMyIncidentReports(filter);
        onChange(reports);
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function fetchHotlines() {
  if (!isSupabaseConfigured || !supabase) {
    return defaultHotlines;
  }

  const { data, error } = await supabase
    .from('hotlines')
    .select('id,label,phone,priority')
    .order('priority', { ascending: true });

  if (error) {
    console.error('fetchHotlines', error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id),
    label: String(item.label),
    phone: String(item.phone),
  }));
}

export async function fetchEvacuationCenters() {
  if (!isSupabaseConfigured || !supabase) {
    return defaultEvacuationCenters;
  }

  const { data, error } = await supabase
    .from('evacuation_centers')
    .select('id,name,address,contact,latitude,longitude')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchEvacuationCenters', error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id),
    name: String(item.name),
    address: String(item.address),
    contact: String(item.contact ?? ''),
    latitude: item.latitude == null ? null : Number(item.latitude),
    longitude: item.longitude == null ? null : Number(item.longitude),
  }));
}

export async function fetchActiveAdvisories() {
  if (!isSupabaseConfigured || !supabase) {
    return defaultAdvisories;
  }

  const { data, error } = await supabase
    .from('advisories')
    .select('id,title,message,severity,source,created_at,is_active,is_verified')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchActiveAdvisories', error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  const rows = data.map((item) => ({
    id: String(item.id),
    title: String(item.title),
    message: String(item.message),
    severity: (item.severity as 'low' | 'medium' | 'high') ?? 'low',
    source: String(item.source ?? 'CDRRMO Dasmarinas'),
    createdAt: String(item.created_at),
    isVerified: (item as { is_verified?: boolean }).is_verified !== false,
  }));
  rows.sort((a, b) => {
    if (a.isVerified !== b.isVerified) {
      return a.isVerified ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return rows;
}

export function subscribeToActiveAdvisories(
  onChange: (advisories: Advisory[]) => void,
) {
  if (!isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const client = supabase;

  const channel = client
    .channel('advisories-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'advisories' },
      async () => {
        const advisories = await fetchActiveAdvisories();
        onChange(advisories);
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
