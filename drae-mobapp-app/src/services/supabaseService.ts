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
  },
  {
    id: '2',
    title: 'Hotline Reminder',
    message:
      'Save emergency hotlines and check your family evacuation plan before severe weather conditions develop.',
    severity: 'low',
    source: 'CDRRMO Dasmarinas',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(supabaseConfigError);
  }
  return supabase;
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
    const { data, error } = await client
      .from('profiles')
      .update(payload)
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

  const { data, error } = await client
    .from('profiles')
    .insert(payload)
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

export async function fetchLatestProfile() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,address,contact_number,gender,age,email,contact_person,contact_person_number,avatar_url,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id),
    profile: {
      fullName: String(data.full_name ?? ''),
      address: String(data.address ?? ''),
      contactNumber: String(data.contact_number ?? ''),
      gender: String(data.gender ?? ''),
      age: data.age ? String(data.age) : '',
      email: String(data.email ?? ''),
      contactPerson: String(data.contact_person ?? ''),
      contactPersonNumber: String(data.contact_person_number ?? ''),
      avatarUrl: String(data.avatar_url ?? ''),
    } satisfies PersonalInfo,
  };
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
    .select('id,title,message,severity,source,created_at,is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchActiveAdvisories', error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id),
    title: String(item.title),
    message: String(item.message),
    severity: (item.severity as 'low' | 'medium' | 'high') ?? 'low',
    source: String(item.source ?? 'CDRRMO Dasmarinas'),
    createdAt: String(item.created_at),
  }));
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
