import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { AdminAccessDenied } from './components/AdminAccessDenied';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { AdminMustChangePasswordPanel } from './components/AdminMustChangePasswordPanel';
import { AppModal } from './components/AppModal';
import { HotlinePosterEditor } from './components/HotlinePosterEditor';
import { ResidentEditor } from './components/ResidentEditor';
import { ResidentProfileView } from './components/ResidentProfileView';
import { StaffEditor } from './components/StaffEditor';
import { defaultHotlinePoster, type HotlinePosterConfig } from './lib/hotlinePosterConfig';
import { formatDate } from './lib/formatDate';
import { formatPhilippineMobileDisplay } from './lib/phoneFormat';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  clearResidentAuthLink,
  createAdvisory,
  createResident,
  createResidentWithEmailOnlyLogin,
  createStaffMember,
  createStaffWithMobileLogin,
  createStaffWithEmailOnlyLogin,
  deleteHotline,
  deleteResident,
  deleteStaffMember,
  getAdvisories,
  getDashboardStats,
  getHotlines,
  getHotlinePosterConfig,
  getReports,
  getResidentsWithReadiness,
  getStaffMembers,
  saveHotline,
  saveHotlinePosterConfig,
  toggleAdvisoryActive,
  updateReportAssignment,
  updateReportStatus,
  updateResident,
  updateStaffMember,
  fetchMyAdminAccess,
  superadminAddAdminByEmail,
  superadminListAppAdmins,
  superadminRemoveAdmin,
  type AppAdminDashboardRole,
  type AppAdminRow,
  type MyAdminAccess,
} from './services/dashboardService';
import type {
  Advisory,
  DashboardStats,
  Hotline,
  Report,
  ResidentInput,
  ResidentWithReadiness,
  StaffInput,
  StaffMember,
} from './types';

type Page =
  | 'dashboard'
  | 'members'
  | 'staff'
  | 'reports'
  | 'advisories'
  | 'hotlines'
  | 'users'
  | 'admin_users';

type HazardSeverityLevel = 'high' | 'medium' | 'low';

function initialsFromEmail(email: string | undefined): string {
  if (!email?.trim()) {
    return 'AD';
  }
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return local.slice(0, 2).toUpperCase();
}

function hazardSeverityFromType(hazard: string): HazardSeverityLevel {
  const x = (hazard || '').toLowerCase();
  if (/(flood|fire|landslide|earthquake|lindol|baha|sunog|cyclone|typhoon|bagyo)/.test(x)) {
    return 'high';
  }
  if (/(medical|accident|injury|crash|rescue)/.test(x)) {
    return 'medium';
  }
  return 'low';
}

function reportUrgencyScore(row: Report): number {
  const sev = hazardSeverityFromType(row.hazard_type || '');
  const sevN = sev === 'high' ? 3 : sev === 'medium' ? 2 : 1;
  const st = row.status || 'submitted';
  if (st === 'resolved') {
    return sevN;
  }
  const base = st === 'submitted' ? 100 : 55;
  return base + sevN * 10;
}

function reportPriorityLabel(row: Report): 'High' | 'Medium' | 'Low' {
  const st = row.status || 'submitted';
  if (st === 'resolved') {
    return 'Low';
  }
  const sev = hazardSeverityFromType(row.hazard_type || '');
  if (st === 'submitted' && sev === 'high') {
    return 'High';
  }
  if (sev === 'high') {
    return 'High';
  }
  if (sev === 'medium' || st === 'submitted') {
    return 'Medium';
  }
  return 'Low';
}

function isCriticalReportRow(row: Report): boolean {
  const st = row.status || 'submitted';
  return (
    (st === 'submitted' || st === 'in_progress') && hazardSeverityFromType(row.hazard_type || '') === 'high'
  );
}

/** Straight-line distance from this point (city / ops reference, Dasmariñas). */
const REPORT_OPS_CENTER = { lat: 14.327, lng: 120.937 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function reportDistanceKmFromOps(row: Report): number | null {
  const lat = row.latitude;
  const lng = row.longitude;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return haversineKm(REPORT_OPS_CENTER, { lat, lng });
}

function formatProximityLabel(km: number | null): string {
  if (km == null) {
    return '—';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

function csvEscapeCell(value: string): string {
  const s = value.replace(/\r\n/g, '\n');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatShortDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '';
  return (a + b).toUpperCase() || '?';
}

type AvatarKind = 'flood' | 'earthquake' | 'fire' | 'critical';

function hazardAvatarKind(hazard: string): AvatarKind {
  const h = hazard.toLowerCase();
  if (h.includes('flood')) {
    return 'flood';
  }
  if (h.includes('earthquake')) {
    return 'earthquake';
  }
  if (h.includes('fire')) {
    return 'fire';
  }
  return 'critical';
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === 'in_progress') {
    return 'In Progress';
  }
  if (s === 'resolved') {
    return 'Resolved';
  }
  return 'Submitted';
}

function statusPillClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'in_progress') {
    return 'pill-status pill-status--progress';
  }
  if (s === 'resolved') {
    return 'pill-status pill-status--resolved';
  }
  return 'pill-status pill-status--submitted';
}

function pageTitle(page: Page) {
  switch (page) {
    case 'dashboard':
      return 'Dashboard';
    case 'members':
      return 'Members';
    case 'staff':
      return 'Response staff';
    case 'reports':
      return 'Reports';
    case 'advisories':
      return 'Alerts';
    case 'hotlines':
      return 'Hotlines';
    case 'users':
      return 'Users';
    case 'admin_users':
      return 'Administrators';
    default:
      return '';
  }
}

function IconStaffNav({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m14 2v-1a4 4 0 00-4-4h-1m4 9v2M23 13h-4"
        stroke={c}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMobile({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6.5" y="3.5" width="11" height="17" rx="2.5" stroke={c} strokeWidth="1.75" />
      <path d="M10 18.5h4" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconDashboard({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMembers({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 10-4-4 4 4 0 004 4m-6 8v-1a4 4 0 014-4h2a4 4 0 014 4v1M8 11a3 3 0 10-3-3 3 3 0 003 3m-4 3v-1a3 3 0 013-3"
        stroke={c}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconReports({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12h6M9 16h6M7 4h7l2 2v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22a2.5 2.5 0 002.45-2H9.55A2.5 2.5 0 0012 22zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPhone({ active }: { active?: boolean }) {
  const c = active ? '#1a7a4a' : '#374151';
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h3l1.5 4-2 1.5a12 12 0 006 6L15 14.5l4 1.5v3a2 2 0 01-2.2 2A17 17 0 016.5 6.2 2 2 0 016.5 4z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsersStat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11a3 3 0 10-3-3 3 3 0 003 3m-4 8v-1a4 4 0 014-4h2a4 4 0 014 4v1M5 11a2 2 0 10-2-2 2 2 0 002 2m-1 3v-1a3 3 0 013-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBagStat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 8V6a4 4 0 018 0v2M5 10h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V10zm2 2v4h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAlertStat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.3 4.8L2.5 18a1 1 0 00.9 1.5h17.2a1 1 0 00.9-1.5L13.7 4.8a1 1 0 00-1.8 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStaffStat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11a3 3 0 100-6 3 3 0 000 6m-6 8v-1a5 5 0 015-5h2a5 5 0 015 5v1M18 8a2 2 0 11-4 0M6 8a2 2 0 11-4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMegaphoneStat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11v6a1 1 0 001 1h2v-8H5a1 1 0 00-1 1zm2 3h10l4 3V5l-4 3H6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShieldAdmin({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 4v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.65}
      />
    </svg>
  );
}

function DashboardApp({ session }: { session: Session }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<ResidentWithReadiness[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'low' as 'low' | 'medium' | 'high',
    isVerified: true,
  });
  const [hotlineForm, setHotlineForm] = useState({
    id: null as string | null,
    label: '',
    phone: '',
    priority: '1',
  });
  const [hotlinePosterConfig, setHotlinePosterConfig] = useState<HotlinePosterConfig>(defaultHotlinePoster);
  const [hotlinePosterSaving, setHotlinePosterSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersInviteEmail, setUsersInviteEmail] = useState('');
  const [usersInviteBusy, setUsersInviteBusy] = useState(false);
  const [usersInviteMessage, setUsersInviteMessage] = useState<string | null>(null);
  const [usersInviteLastTempPassword, setUsersInviteLastTempPassword] = useState<string | null>(null);
  const [residentModal, setResidentModal] = useState<
    null | { mode: 'create' } | { mode: 'edit'; row: ResidentWithReadiness }
  >(null);
  const [staffModal, setStaffModal] = useState<null | { mode: 'create' } | { mode: 'edit'; row: StaffMember }>(
    null,
  );
  const [memberInviteEmail, setMemberInviteEmail] = useState('');
  const [memberInviteBusy, setMemberInviteBusy] = useState(false);
  const [memberInviteMessage, setMemberInviteMessage] = useState<string | null>(null);
  const [memberInviteLastTempPassword, setMemberInviteLastTempPassword] = useState<string | null>(null);
  const [staffInviteEmail, setStaffInviteEmail] = useState('');
  const [staffInviteBusy, setStaffInviteBusy] = useState(false);
  const [staffInviteMessage, setStaffInviteMessage] = useState<string | null>(null);
  const [staffInviteLastTempPassword, setStaffInviteLastTempPassword] = useState<string | null>(null);
  const [residentFormBusy, setResidentFormBusy] = useState(false);
  const [staffFormBusy, setStaffFormBusy] = useState(false);
  /** Read-only profile panel (replaces in-table accordion). */
  const [residentViewModal, setResidentViewModal] = useState<ResidentWithReadiness | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterGoBag, setMemberFilterGoBag] = useState<'all' | 'yes' | 'no'>('all');
  const [memberFilterApp, setMemberFilterApp] = useState<'all' | 'yes' | 'no'>('all');
  const [reportFilterOpenOnly, setReportFilterOpenOnly] = useState(false);
  const [reportFilterHighSeverity, setReportFilterHighSeverity] = useState(false);
  const [myAdminAccess, setMyAdminAccess] = useState<MyAdminAccess | null>(null);
  const myAdminRole = myAdminAccess?.role ?? null;
  const [adminList, setAdminList] = useState<AppAdminRow[]>([]);
  const [adminInviteEmail, setAdminInviteEmail] = useState('');
  const [adminInviteRole, setAdminInviteRole] = useState<AppAdminDashboardRole>('admin');
  const [adminUsersBusy, setAdminUsersBusy] = useState(false);
  const [adminUsersMessage, setAdminUsersMessage] = useState<string | null>(null);
  /** Shown only when a brand-new Auth user was created for this admin (one-time). */
  const [adminInviteLastTempPassword, setAdminInviteLastTempPassword] = useState<string | null>(null);
  const [adminRoleResolved, setAdminRoleResolved] = useState(false);

  const refreshMyAdminAccess = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    setMyAdminAccess(await fetchMyAdminAccess());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAdminRoleResolved(false);
    void (async () => {
      const r = await fetchMyAdminAccess();
      if (!cancelled) {
        setMyAdminAccess(r);
        setAdminRoleResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  const refreshAdminList = useCallback(async () => {
    if (!isSupabaseConfigured || myAdminRole !== 'superadmin') {
      return;
    }
    try {
      setAdminList(await superadminListAppAdmins());
    } catch (err) {
      console.error(err);
      setAdminList([]);
    }
  }, [myAdminRole]);

  useEffect(() => {
    if (myAdminRole === 'superadmin') {
      void refreshAdminList();
    }
  }, [myAdminRole, refreshAdminList]);

  useEffect(() => {
    if (page === 'admin_users' && myAdminRole === 'superadmin') {
      void refreshAdminList();
    }
  }, [page, myAdminRole, refreshAdminList]);

  useEffect(() => {
    if (page === 'admin_users' && myAdminRole != null && myAdminRole !== 'superadmin') {
      setPage('dashboard');
    }
  }, [page, myAdminRole]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, memberRows, reportRows, advisoryRows, hotlineRows, staffRows, posterCfg] =
        await Promise.all([
          getDashboardStats(),
          getResidentsWithReadiness(),
          getReports(),
          getAdvisories(),
          getHotlines(),
          getStaffMembers(),
          getHotlinePosterConfig(),
        ]);
      setStats(statsData);
      setMembers(memberRows);
      setReports(reportRows);
      setAdvisories(advisoryRows);
      setHotlines(hotlineRows);
      setStaffMembers(staffRows);
      setHotlinePosterConfig(posterCfg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminRoleResolved || myAdminRole === null) {
      return;
    }
    void loadAll();
  }, [adminRoleResolved, myAdminRole, loadAll]);

  const superadminSlotFilled = useMemo(
    () => adminList.some((r) => r.role === 'superadmin'),
    [adminList],
  );

  useEffect(() => {
    if (superadminSlotFilled && adminInviteRole === 'superadmin') {
      setAdminInviteRole('admin');
    }
  }, [superadminSlotFilled, adminInviteRole]);

  const infoRows = useMemo(() => members, [members]);
  const memberFilteredRows = useMemo(() => {
    let list = members;
    const q = memberSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const name = (r.full_name || '').toLowerCase();
        const phone = (r.contact_number || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const addr = (r.address || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || addr.includes(q);
      });
    }
    if (memberFilterGoBag === 'yes') {
      list = list.filter((r) => r.go_bag_ready);
    } else if (memberFilterGoBag === 'no') {
      list = list.filter((r) => !r.go_bag_ready);
    }
    if (memberFilterApp === 'yes') {
      list = list.filter((r) => Boolean(r.user_id));
    } else if (memberFilterApp === 'no') {
      list = list.filter((r) => !r.user_id);
    }
    return list;
  }, [members, memberSearchQuery, memberFilterGoBag, memberFilterApp]);

  const reportRows = useMemo(() => {
    const next = [...reports];
    next.sort((a, b) => {
      const primary = reportUrgencyScore(b) - reportUrgencyScore(a);
      if (primary !== 0) {
        return primary;
      }
      const da = reportDistanceKmFromOps(a);
      const db = reportDistanceKmFromOps(b);
      if (da == null && db == null) {
        return 0;
      }
      if (da == null) {
        return 1;
      }
      if (db == null) {
        return -1;
      }
      return da - db;
    });
    return next;
  }, [reports]);

  const reportTableRows = useMemo(() => {
    let list = reportRows;
    if (reportFilterOpenOnly) {
      list = list.filter((r) => r.status === 'submitted' || r.status === 'in_progress');
    }
    if (reportFilterHighSeverity) {
      list = list.filter((r) => hazardSeverityFromType(r.hazard_type || '') === 'high');
    }
    return list;
  }, [reportRows, reportFilterOpenOnly, reportFilterHighSeverity]);

  const handleExportReportsCsv = useCallback(() => {
    const rows = reportTableRows;
    if (rows.length === 0) {
      return;
    }
    const headers = [
      'priority',
      'severity',
      'proximity_km',
      'reporter_name',
      'created_at',
      'hazard_type',
      'location_text',
      'description',
      'evidence_url',
      'audio_url',
      'assigned_staff',
      'status',
      'latitude',
      'longitude',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
      const km = reportDistanceKmFromOps(row);
      const proximity = km == null ? '' : km.toFixed(2);
      const cells = [
        reportPriorityLabel(row),
        hazardSeverityFromType(row.hazard_type || ''),
        proximity,
        row.reporter_name ?? '',
        row.created_at ?? '',
        row.hazard_type ?? '',
        row.location_text ?? '',
        row.description ?? '',
        row.evidence_url ?? '',
        row.audio_url ?? '',
        row.staff_members?.full_name ?? '',
        row.status ?? '',
        row.latitude != null ? String(row.latitude) : '',
        row.longitude != null ? String(row.longitude) : '',
      ].map((c) => csvEscapeCell(String(c)));
      lines.push(cells.join(','));
    }
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drae-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [reportTableRows]);

  const advisoryRows = useMemo(() => advisories, [advisories]);
  const hotlineRows = useMemo(() => hotlines, [hotlines]);

  const staffForAssignment = useMemo(
    () => staffMembers.filter((s) => s.active !== false),
    [staffMembers],
  );

  const openReportBadge = useMemo(
    () => reportRows.filter((r) => r.status === 'submitted' || r.status === 'in_progress').length,
    [reportRows],
  );

  const recentReports = useMemo(() => {
    const sorted = [...reportRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted.slice(0, 5);
  }, [reportRows]);

  const goBagRate = useMemo(() => {
    if (!stats || stats.residentCount <= 0) {
      return 0;
    }
    return Math.round((stats.goBagReadyCount / stats.residentCount) * 100);
  }, [stats]);

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  const handleStatusChange = async (reportId: string, status: string) => {
    await updateReportStatus(reportId, status);
    setReports((prev) =>
      prev.map((report) => (report.id === reportId ? { ...report, status } : report)),
    );
    setStats(await getDashboardStats());
  };

  const handleAssignmentChange = async (reportId: string, staffId: string) => {
    const nextId = staffId === '' ? null : staffId;
    await updateReportAssignment(reportId, nextId);
    const rows = await getReports();
    setReports(rows);
    setStats(await getDashboardStats());
  };

  const handleCreateAdvisory = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return;
    }
    await createAdvisory(form);
    const rows = await getAdvisories();
    setAdvisories(rows);
    setStats(await getDashboardStats());
    setForm({ title: '', message: '', severity: 'low', isVerified: true });
  };

  const handleToggleAdvisory = async (id: string, isActive: boolean) => {
    await toggleAdvisoryActive(id, isActive);
    const rows = await getAdvisories();
    setAdvisories(rows);
    setStats(await getDashboardStats());
  };

  const handleSaveHotline = async () => {
    if (!hotlineForm.label.trim() || !hotlineForm.phone.trim()) {
      return;
    }

    await saveHotline(
      {
        label: hotlineForm.label.trim(),
        phone: hotlineForm.phone.trim(),
        priority: Number(hotlineForm.priority) || 1,
      },
      hotlineForm.id,
    );
    const rows = await getHotlines();
    setHotlines(rows);
    setStats(await getDashboardStats());
    setHotlineForm({ id: null, label: '', phone: '', priority: '1' });
  };

  const handleDeleteHotline = async (id: string) => {
    await deleteHotline(id);
    const rows = await getHotlines();
    setHotlines(rows);
    setStats(await getDashboardStats());
  };

  const handleSaveHotlinePoster = async () => {
    try {
      setHotlinePosterSaving(true);
      await saveHotlinePosterConfig(hotlinePosterConfig);
      setStats(await getDashboardStats());
      window.alert('Hotline poster saved. Residents will see it under Guides → Emergency Hotlines after refresh.');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save poster.');
    } finally {
      setHotlinePosterSaving(false);
    }
  };

  const handleSaveResident = async (input: ResidentInput) => {
    if (!isSupabaseConfigured) {
      window.alert('Configure Supabase in .env first.');
      return;
    }
    setResidentFormBusy(true);
    try {
      if (residentModal?.mode === 'create') {
        await createResident(input);
      } else if (residentModal?.mode === 'edit') {
        await updateResident(residentModal.row.id, input);
      }
      setResidentModal(null);
      await loadAll();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save resident.');
    } finally {
      setResidentFormBusy(false);
    }
  };

  const handleDeleteResident = async (row: ResidentWithReadiness) => {
    if (!isSupabaseConfigured) {
      return;
    }
    const label = row.full_name || row.id;
    if (
      !window.confirm(
        `Delete resident “${label}”? Incident history stays, but profile links on reports and readiness may be cleared.`,
      )
    ) {
      return;
    }
    try {
      await deleteResident(row.id);
      await loadAll();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete resident.');
    }
  };

  const handleClearResidentAuth = async () => {
    if (residentModal?.mode !== 'edit') {
      return;
    }
    if (!window.confirm('Remove the mobile app login link from this profile?')) {
      return;
    }
    setResidentFormBusy(true);
    try {
      await clearResidentAuthLink(residentModal.row.id);
      setResidentModal(null);
      await loadAll();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove link.');
    } finally {
      setResidentFormBusy(false);
    }
  };

  const handleSaveStaff = async (input: StaffInput) => {
    if (!isSupabaseConfigured) {
      window.alert('Configure Supabase in .env first.');
      return;
    }
    setStaffFormBusy(true);
    try {
      if (staffModal?.mode === 'create' && input.login_email?.trim()) {
        const r = await createStaffWithMobileLogin({
          ...input,
          profile_id: null,
          login_email: input.login_email.trim().toLowerCase(),
        });
        if (!r.ok) {
          window.alert(r.message);
          return;
        }
        window.alert(
          `Staff member and mobile login were created.\n\nTemporary password (give this to the user securely):\n${r.temporaryPassword}`,
        );
      } else if (staffModal?.mode === 'create') {
        await createStaffMember(input);
      } else if (staffModal?.mode === 'edit') {
        await updateStaffMember(staffModal.row.id, input);
      }
      setStaffModal(null);
      await loadAll();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save staff.');
    } finally {
      setStaffFormBusy(false);
    }
  };

  const handleDeleteStaff = async (row: StaffMember) => {
    if (!isSupabaseConfigured) {
      return;
    }
    const label = row.full_name || row.id;
    if (!window.confirm(`Delete staff “${label}”? Assigned reports will become unassigned.`)) {
      return;
    }
    try {
      await deleteStaffMember(row.id);
      await loadAll();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete staff.');
    }
  };

  if (!adminRoleResolved) {
    return (
      <div className="admin-auth-shell">
        <p className="muted-text">Checking dashboard access…</p>
      </div>
    );
  }

  if (myAdminRole === null) {
    return <AdminAccessDenied email={session.user.email} />;
  }

  if (myAdminAccess?.mustChangePassword) {
    return (
      <AdminMustChangePasswordPanel
        onSuccess={() => {
          void refreshMyAdminAccess();
        }}
      />
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="dash-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">CD</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">CDRRMO</span>
            <span className="sidebar-brand-sub">Dasmarinas City</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            <span className="nav-item-icon">
              <IconDashboard active={page === 'dashboard'} />
            </span>
            <span className="nav-item-label">Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'members' ? 'active' : ''}`}
            onClick={() => setPage('members')}
          >
            <span className="nav-item-icon">
              <IconMembers active={page === 'members'} />
            </span>
            <span className="nav-item-label">Members</span>
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'staff' ? 'active' : ''}`}
            onClick={() => setPage('staff')}
          >
            <span className="nav-item-icon">
              <IconStaffNav active={page === 'staff'} />
            </span>
            <span className="nav-item-label">Staff</span>
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'reports' ? 'active' : ''}`}
            onClick={() => setPage('reports')}
          >
            <span className="nav-item-icon">
              <IconReports active={page === 'reports'} />
            </span>
            <span className="nav-item-label">Reports</span>
            {openReportBadge > 0 ? <span className="nav-badge">{openReportBadge}</span> : null}
          </button>

          <div className="nav-section-label">Manage</div>
          <button
            type="button"
            className={`nav-item ${page === 'advisories' ? 'active' : ''}`}
            onClick={() => setPage('advisories')}
          >
            <span className="nav-item-icon">
              <IconBell active={page === 'advisories'} />
            </span>
            <span className="nav-item-label">Alerts</span>
          </button>
          <button
            type="button"
            className={`nav-item ${page === 'hotlines' ? 'active' : ''}`}
            onClick={() => setPage('hotlines')}
          >
            <span className="nav-item-icon">
              <IconPhone active={page === 'hotlines'} />
            </span>
            <span className="nav-item-label">Hotlines</span>
          </button>
          {myAdminRole === 'superadmin' ? (
            <button
              type="button"
              className={`nav-item ${page === 'admin_users' ? 'active' : ''}`}
              onClick={() => setPage('admin_users')}
            >
              <span className="nav-item-icon">
                <IconShieldAdmin active={page === 'admin_users'} />
              </span>
              <span className="nav-item-label">Administrators</span>
            </button>
          ) : null}
          <button
            type="button"
            className={`nav-item ${page === 'users' ? 'active' : ''}`}
            onClick={() => setPage('users')}
          >
            <span className="nav-item-icon">
              <IconMobile active={page === 'users'} />
            </span>
            <span className="nav-item-label">Users</span>
          </button>
        </nav>

        <div className="sidebar-profile">
          <div className="sidebar-profile-row">
            <div className="sidebar-profile-avatar">{initialsFromEmail(session.user.email)}</div>
            <div className="sidebar-profile-text">
              <span className="sidebar-profile-name" title={session.user.email ?? ''}>
                {session.user.email ?? 'Signed in'}
              </span>
              <span
                className={
                  myAdminRole === 'superadmin'
                    ? 'sidebar-profile-role sidebar-profile-role--super'
                    : 'sidebar-profile-role'
                }
              >
                {myAdminRole === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-sign-out"
            onClick={() => void supabase?.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-main-inner">
          <header className="dash-topbar">
            <div>
              <h1 className="dash-topbar-title">{pageTitle(page)}</h1>
              {page === 'dashboard' ? <p className="dash-topbar-date">{todayStr}</p> : null}
            </div>
            <div className="dash-topbar-actions">
              <span
                className={
                  myAdminRole === 'superadmin' ? 'dash-role-pill dash-role-pill--super' : 'dash-role-pill'
                }
              >
                {myAdminRole === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
              <button type="button" className="btn-refresh" onClick={() => loadAll()}>
                ↻ Refresh data
              </button>
            </div>
          </header>

          {page === 'dashboard' ? (
            <section className="panel dashboard-panel">
              {!isSupabaseConfigured ? (
                <p className="config-banner">
                  Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
                  <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> so this dashboard reads live data.
                </p>
              ) : null}
              {loading && !stats ? (
                <p className="muted-text">Loading statistics…</p>
              ) : (
                <>
                  <div className="stat-rows">
                    <div className="stat-row stat-row--3">
                      <button
                        type="button"
                        className="stat-card-v2"
                        onClick={() => setPage('members')}
                        aria-label="Open members: registered resident profiles"
                      >
                        <div className="stat-card-v2-top">
                          <div className="stat-card-v2-icon stat-card-v2-icon--green">
                            <IconUsersStat />
                          </div>
                          <span className="pill-trend pill-trend--green">＋2 this week</span>
                        </div>
                        <div className="stat-card-v2-value">{stats?.residentCount ?? '—'}</div>
                        <div className="stat-card-v2-label">Registered Members</div>
                        <div className="stat-card-v2-desc">Resident profiles in the system</div>
                      </button>
                      <button
                        type="button"
                        className="stat-card-v2"
                        onClick={() => setPage('members')}
                        aria-label="Open members: go-bag readiness"
                      >
                        <div className="stat-card-v2-top">
                          <div className="stat-card-v2-icon stat-card-v2-icon--blue">
                            <IconBagStat />
                          </div>
                          <span className="pill-trend pill-trend--green">{goBagRate}% rate</span>
                        </div>
                        <div className="stat-card-v2-value">{stats?.goBagReadyCount ?? '—'}</div>
                        <div className="stat-card-v2-label">Go-Bag Readiness</div>
                        <div className="stat-card-v2-desc">Households with go-bag checked</div>
                      </button>
                      <button
                        type="button"
                        className="stat-card-v2"
                        onClick={() => setPage('reports')}
                        aria-label="Open reports: open emergency reports"
                      >
                        <div className="stat-card-v2-top">
                          <div className="stat-card-v2-icon stat-card-v2-icon--red">
                            <IconAlertStat />
                          </div>
                          <span className="pill-trend pill-trend--red">Needs action</span>
                        </div>
                        <div className="stat-card-v2-value">{stats?.openEmergencyReports ?? '—'}</div>
                        <div className="stat-card-v2-label">Open Emergency Reports</div>
                        <div className="stat-card-v2-desc">Submitted or in progress</div>
                      </button>
                    </div>
                    <div className="stat-row stat-row--2">
                      <button
                        type="button"
                        className="stat-card-v2"
                        onClick={() => setPage('staff')}
                        aria-label="Open staff: active response staff"
                      >
                        <div className="stat-card-v2-top">
                          <div className="stat-card-v2-icon stat-card-v2-icon--green">
                            <IconStaffStat />
                          </div>
                          <span className="pill-trend pill-trend--green">Available</span>
                        </div>
                        <div className="stat-card-v2-value">{stats?.activeStaffCount ?? '—'}</div>
                        <div className="stat-card-v2-label">Active Response Staff</div>
                        <div className="stat-card-v2-desc">Staff available for assignment</div>
                      </button>
                      <button
                        type="button"
                        className="stat-card-v2"
                        onClick={() => setPage('advisories')}
                        aria-label="Open advisories active in the mobile app"
                      >
                        <div className="stat-card-v2-top">
                          <div className="stat-card-v2-icon stat-card-v2-icon--amber">
                            <IconMegaphoneStat />
                          </div>
                          <span className="pill-trend pill-trend--amber">Live now</span>
                        </div>
                        <div className="stat-card-v2-value">{stats?.activeAdvisoriesCount ?? '—'}</div>
                        <div className="stat-card-v2-label">Active Advisories</div>
                        <div className="stat-card-v2-desc">Visible in the mobile app</div>
                      </button>
                    </div>
                  </div>

                  <h3 className="recent-section-label">Recent Emergency Reports</h3>
                  <div className="recent-card">
                    {recentReports.length === 0 ? (
                      <p className="muted-text" style={{ margin: 0 }}>
                        No report records yet.
                      </p>
                    ) : (
                      recentReports.map((row) => {
                        const av = hazardAvatarKind(row.hazard_type);
                        const avClass =
                          av === 'flood'
                            ? 'recent-avatar recent-avatar--flood'
                            : av === 'earthquake'
                              ? 'recent-avatar recent-avatar--earthquake'
                              : av === 'fire'
                                ? 'recent-avatar recent-avatar--fire'
                                : 'recent-avatar recent-avatar--critical';
                        const sub = `${row.location_text || '—'} · ${row.description || '—'} · ${formatShortDate(row.created_at)}`;
                        return (
                          <div className="recent-row" key={row.id}>
                            <div className={avClass}>{initialsFromName(row.reporter_name)}</div>
                            <div className="recent-body">
                              <p className="recent-title">
                                {row.reporter_name} · {row.hazard_type || '—'}
                              </p>
                              <p className="recent-sub">{sub}</p>
                            </div>
                            <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </section>
          ) : page === 'members' ? (
            <section className="panel">
              <div className="panel-toolbar panel-toolbar--members">
                <div>
                  <h2 style={{ margin: 0 }}>Residence information ({infoRows.length} members)</h2>
                  <p className="members-page-hint muted-text">
                    Add a household the same way as <strong>Administrators</strong>: enter an email, submit, copy the
                    one-time password. The resident signs in on the mobile app and sets a new password. Use{' '}
                    <strong>Edit</strong> to complete profile details. If email confirmation is on in Supabase, turn
                    it off for testing or confirm the user first.
                  </p>
                  {infoRows.length > 0 ? (
                    <p className="members-filter-summary muted-text">
                      Showing <strong>{memberFilteredRows.length}</strong> of {infoRows.length}
                      {memberFilteredRows.length !== infoRows.length ||
                      memberSearchQuery.trim() ||
                      memberFilterGoBag !== 'all' ||
                      memberFilterApp !== 'all'
                        ? ' (filters active)'
                        : ''}
                      .
                    </p>
                  ) : null}
                </div>
              </div>
              {!isSupabaseConfigured ? (
                <p className="config-banner">Configure Supabase in <code>.env</code> first.</p>
              ) : (
                <div className="advisory-form" style={{ marginTop: 16, maxWidth: 520 }}>
                  <label className="muted-text" htmlFor="member-invite-email">
                    Email (mobile app login)
                  </label>
                  <input
                    id="member-invite-email"
                    className="form-input"
                    type="email"
                    autoComplete="off"
                    placeholder="name@example.com"
                    value={memberInviteEmail}
                    onChange={(e) => setMemberInviteEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="action-button"
                    style={{ marginTop: 12 }}
                    disabled={memberInviteBusy || !memberInviteEmail.trim()}
                    onClick={() => {
                      setMemberInviteMessage(null);
                      setMemberInviteLastTempPassword(null);
                      setMemberInviteBusy(true);
                      void (async () => {
                        try {
                          const r = await createResidentWithEmailOnlyLogin(memberInviteEmail);
                          if (r.ok) {
                            setMemberInviteEmail('');
                            setMemberInviteLastTempPassword(r.temporaryPassword);
                            setMemberInviteMessage(
                              'Resident saved. Copy the password below now—it is not stored. They sign in on the mobile app, then choose a new password.',
                            );
                            await loadAll();
                          } else {
                            setMemberInviteMessage(r.message);
                          }
                        } finally {
                          setMemberInviteBusy(false);
                        }
                      })();
                    }}
                  >
                    {memberInviteBusy ? 'Saving…' : 'Add resident & mobile login'}
                  </button>
                  {memberInviteLastTempPassword ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(15, 23, 42, 0.06)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <div className="muted-text" style={{ fontSize: 12, marginBottom: 8 }}>
                        Temporary password (copy now — not stored)
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <code
                          style={{
                            flex: '1 1 200px',
                            fontSize: 14,
                            wordBreak: 'break-all',
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid rgba(15, 23, 42, 0.1)',
                          }}
                        >
                          {memberInviteLastTempPassword}
                        </code>
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => {
                            void navigator.clipboard.writeText(memberInviteLastTempPassword);
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {memberInviteMessage ? (
                    <p
                      className="muted-text"
                      style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {memberInviteMessage}
                    </p>
                  ) : null}
                  <p className="muted-text" style={{ marginTop: 14, marginBottom: 0, fontSize: 13 }}>
                    <button
                      type="button"
                      className="action-button secondary"
                      style={{ marginTop: 4 }}
                      onClick={() => setResidentModal({ mode: 'create' })}
                    >
                      Household record only (no app login)
                    </button>{' '}
                    — optional; the <strong>Users</strong> page uses the same email + temporary password flow.
                  </p>
                </div>
              )}
              {!loading && infoRows.length > 0 ? (
                <div className="members-filter-bar">
                  <input
                    type="search"
                    className="form-input members-filter-search"
                    placeholder="Search name, phone, email, address…"
                    value={memberSearchQuery}
                    onChange={(event) => setMemberSearchQuery(event.target.value)}
                    aria-label="Filter members by text"
                  />
                  <select
                    className="status-select members-filter-select"
                    value={memberFilterGoBag}
                    onChange={(event) =>
                      setMemberFilterGoBag(event.target.value as 'all' | 'yes' | 'no')
                    }
                    aria-label="Filter by go-bag readiness"
                  >
                    <option value="all">Go-bag: all</option>
                    <option value="yes">Go-bag: ready</option>
                    <option value="no">Go-bag: not ready</option>
                  </select>
                  <select
                    className="status-select members-filter-select"
                    value={memberFilterApp}
                    onChange={(event) =>
                      setMemberFilterApp(event.target.value as 'all' | 'yes' | 'no')
                    }
                    aria-label="Filter by mobile app login"
                  >
                    <option value="all">App login: all</option>
                    <option value="yes">App login: yes</option>
                    <option value="no">App login: no</option>
                  </select>
                  {(memberSearchQuery.trim() ||
                    memberFilterGoBag !== 'all' ||
                    memberFilterApp !== 'all') && (
                    <button
                      type="button"
                      className="action-button secondary members-filter-clear"
                      onClick={() => {
                        setMemberSearchQuery('');
                        setMemberFilterGoBag('all');
                        setMemberFilterApp('all');
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : null}
              <div className="table-wrap table-wrap--members">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Readiness</th>
                      <th>Go-bag</th>
                      <th>App login</th>
                      <th>View</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8}>Loading...</td>
                      </tr>
                    ) : infoRows.length === 0 ? (
                      <tr>
                        <td colSpan={8}>No resident records yet.</td>
                      </tr>
                    ) : memberFilteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          No members match the current filters. Try clearing search or filters.
                        </td>
                      </tr>
                    ) : (
                      memberFilteredRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {row.avatar_url ? (
                              <img
                                className="resident-avatar"
                                src={row.avatar_url}
                                alt={row.full_name ? `Photo of ${row.full_name}` : 'Resident photo'}
                              />
                            ) : (
                              <span className="muted-text">—</span>
                            )}
                          </td>
                          <td>
                            <span className="resident-name-cell">{row.full_name || '—'}</span>
                          </td>
                          <td>
                            {row.contact_number
                              ? formatPhilippineMobileDisplay(row.contact_number)
                              : '—'}
                          </td>
                          <td>{row.readiness_score != null ? `${row.readiness_score}%` : '—'}</td>
                          <td>
                            <span className={row.go_bag_ready ? 'pill-yes' : 'pill-no'}>
                              {row.go_bag_ready ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={row.user_id ? 'pill-yes' : 'pill-no'}>
                              {row.user_id ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="action-button secondary table-action-btn"
                              onClick={() => setResidentViewModal(row)}
                            >
                              View
                            </button>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="action-button secondary table-action-btn"
                                onClick={() => setResidentModal({ mode: 'edit', row })}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action-button danger table-action-btn"
                                onClick={() => void handleDeleteResident(row)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'staff' ? (
            <section className="panel">
              <div className="panel-toolbar">
                <h2 style={{ margin: 0 }}>Response staff ({staffMembers.length})</h2>
              </div>
              <p className="muted-text" style={{ maxWidth: 720, lineHeight: 1.55 }}>
                Same flow as <strong>Administrators</strong>: enter an email to create a staff roster entry, profile,
                and mobile login with a one-time password (email must not already exist on a profile). Staff are
                included in report assignment when <strong>Active</strong> is on. Use the button below for roster-only
                or linking a resident profile.
              </p>
              {!isSupabaseConfigured ? (
                <p className="config-banner">Configure Supabase in <code>.env</code> first.</p>
              ) : (
                <div className="advisory-form" style={{ marginTop: 16, maxWidth: 520 }}>
                  <label className="muted-text" htmlFor="staff-invite-email">
                    Email (mobile app login)
                  </label>
                  <input
                    id="staff-invite-email"
                    className="form-input"
                    type="email"
                    autoComplete="off"
                    placeholder="name@example.com"
                    value={staffInviteEmail}
                    onChange={(e) => setStaffInviteEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="action-button"
                    style={{ marginTop: 12 }}
                    disabled={staffInviteBusy || !staffInviteEmail.trim()}
                    onClick={() => {
                      setStaffInviteMessage(null);
                      setStaffInviteLastTempPassword(null);
                      setStaffInviteBusy(true);
                      void (async () => {
                        try {
                          const r = await createStaffWithEmailOnlyLogin(staffInviteEmail);
                          if (r.ok) {
                            setStaffInviteEmail('');
                            setStaffInviteLastTempPassword(r.temporaryPassword);
                            setStaffInviteMessage(
                              'Staff saved. Copy the password below now—it is not stored. They sign in on the mobile app, then choose a new password.',
                            );
                            await loadAll();
                          } else {
                            setStaffInviteMessage(r.message);
                          }
                        } finally {
                          setStaffInviteBusy(false);
                        }
                      })();
                    }}
                  >
                    {staffInviteBusy ? 'Saving…' : 'Add staff & mobile login'}
                  </button>
                  {staffInviteLastTempPassword ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(15, 23, 42, 0.06)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <div className="muted-text" style={{ fontSize: 12, marginBottom: 8 }}>
                        Temporary password (copy now — not stored)
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <code
                          style={{
                            flex: '1 1 200px',
                            fontSize: 14,
                            wordBreak: 'break-all',
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid rgba(15, 23, 42, 0.1)',
                          }}
                        >
                          {staffInviteLastTempPassword}
                        </code>
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => {
                            void navigator.clipboard.writeText(staffInviteLastTempPassword);
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {staffInviteMessage ? (
                    <p
                      className="muted-text"
                      style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {staffInviteMessage}
                    </p>
                  ) : null}
                  <p className="muted-text" style={{ marginTop: 14, marginBottom: 0, fontSize: 13 }}>
                    <button
                      type="button"
                      className="action-button secondary"
                      style={{ marginTop: 4 }}
                      onClick={() => setStaffModal({ mode: 'create' })}
                    >
                      Roster form (link resident, hazards, etc.)
                    </button>
                  </p>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Hazard types</th>
                      <th>Active</th>
                      <th>Linked resident</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7}>Loading...</td>
                      </tr>
                    ) : staffMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No staff records yet.</td>
                      </tr>
                    ) : (
                      staffMembers.map((s) => {
                        const linked =
                          s.profile_id != null
                            ? members.find((m) => m.id === s.profile_id)?.full_name || s.profile_id
                            : '—';
                        const hz = (s.hazard_types ?? []).join(', ') || '—';
                        return (
                          <tr key={s.id}>
                            <td>{s.full_name}</td>
                            <td>{s.role || '—'}</td>
                            <td>{s.phone ? formatPhilippineMobileDisplay(s.phone) : '—'}</td>
                            <td style={{ maxWidth: 220 }}>{hz}</td>
                            <td>
                              <span className={s.active !== false ? 'pill-yes' : 'pill-no'}>
                                {s.active !== false ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td>{linked}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="action-button secondary table-action-btn"
                                  onClick={() => setStaffModal({ mode: 'edit', row: s })}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="action-button danger table-action-btn"
                                  onClick={() => void handleDeleteStaff(s)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'reports' ? (
            <section className="panel">
              <div className="reports-panel-head">
                <h2 style={{ margin: 0 }}>Disaster and hazard reports</h2>
                {!loading && reportRows.length > 0 ? (
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={handleExportReportsCsv}
                    disabled={reportTableRows.length === 0}
                  >
                    Export CSV ({reportTableRows.length})
                  </button>
                ) : null}
              </div>
              {!loading && reportRows.length > 0 ? (
                <div className="reports-filter-row">
                  <div className="report-filter-chips" role="group" aria-label="Filter reports">
                    <button
                      type="button"
                      className={`filter-chip ${reportFilterOpenOnly ? 'filter-chip--active' : ''}`}
                      onClick={() => setReportFilterOpenOnly((v) => !v)}
                    >
                      Open only
                    </button>
                    <button
                      type="button"
                      className={`filter-chip ${reportFilterHighSeverity ? 'filter-chip--active' : ''}`}
                      onClick={() => setReportFilterHighSeverity((v) => !v)}
                    >
                      High severity
                    </button>
                  </div>
                  <p className="reports-filter-meta muted-text">
                    Showing <strong>{reportTableRows.length}</strong> of {reportRows.length}
                    {reportFilterOpenOnly || reportFilterHighSeverity ? ' (filtered)' : ''}.
                  </p>
                </div>
              ) : null}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Severity</th>
                      <th>Proximity</th>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Remarks</th>
                      <th>Photo</th>
                      <th>Voice</th>
                      <th>Assigned to</th>
                      <th>Quick</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={13}>Loading...</td>
                      </tr>
                    ) : reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={13}>No report records yet.</td>
                      </tr>
                    ) : reportTableRows.length === 0 ? (
                      <tr>
                        <td colSpan={13}>
                          No reports match the current filters. Turn off &quot;Open only&quot; or &quot;High
                          severity&quot; to see more rows.
                        </td>
                      </tr>
                    ) : (
                      reportTableRows.map((row) => (
                        <tr key={row.id} className={isCriticalReportRow(row) ? 'report-row-critical' : undefined}>
                          <td>
                            <span
                              className={`priority-pill priority-${reportPriorityLabel(row).toLowerCase()}`}
                            >
                              {reportPriorityLabel(row)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`hazard-severity-label hazard-severity-${hazardSeverityFromType(row.hazard_type || '')}`}
                            >
                              {hazardSeverityFromType(row.hazard_type || '').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className="muted-text"
                              title="Straight-line distance from Dasmariñas reference point. Filled when the mobile app sends GPS on submit."
                            >
                              {formatProximityLabel(reportDistanceKmFromOps(row))}
                            </span>
                          </td>
                          <td>{row.reporter_name || '-'}</td>
                          <td>{formatDate(row.created_at)}</td>
                          <td>{row.hazard_type || '-'}</td>
                          <td>{row.location_text || '-'}</td>
                          <td>{row.description || '-'}</td>
                          <td>
                            {row.evidence_url ? (
                              <a href={row.evidence_url} target="_blank" rel="noreferrer">
                                <img
                                  className="report-evidence-thumb"
                                  src={row.evidence_url}
                                  alt={`Evidence for ${row.hazard_type}`}
                                />
                              </a>
                            ) : (
                              <span className="muted-text">No photo</span>
                            )}
                          </td>
                          <td>
                            {row.audio_url ? (
                              <audio className="report-audio" controls src={row.audio_url} />
                            ) : (
                              <span className="muted-text">No audio</span>
                            )}
                          </td>
                          <td>
                            <select
                              className="status-select assign-select"
                              value={row.assigned_staff_id ?? ''}
                              onChange={(event) =>
                                handleAssignmentChange(row.id, event.target.value)
                              }
                              title={row.staff_members?.full_name ?? 'Assign responder'}
                            >
                              <option value="">Unassigned</option>
                              {staffForAssignment.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name}
                                  {s.role ? ` (${s.role})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="report-quick-actions">
                              <button
                                type="button"
                                className="action-button secondary table-action-btn"
                                disabled={row.status === 'in_progress' || row.status === 'resolved'}
                                onClick={() => void handleStatusChange(row.id, 'in_progress')}
                              >
                                Dispatch
                              </button>
                              <button
                                type="button"
                                className="action-button secondary table-action-btn"
                                disabled={row.status === 'resolved'}
                                onClick={() => void handleStatusChange(row.id, 'resolved')}
                              >
                                Resolve
                              </button>
                            </div>
                          </td>
                          <td>
                            <select
                              className="status-select"
                              value={row.status || 'submitted'}
                              onChange={(event) =>
                                handleStatusChange(row.id, event.target.value)
                              }
                            >
                              <option value="submitted">submitted</option>
                              <option value="in_progress">in_progress</option>
                              <option value="resolved">resolved</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'advisories' ? (
            <section className="panel">
              <h2>CDRRMO advisories</h2>
              <div className="advisory-form">
                <input
                  className="form-input"
                  placeholder="Advisory title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="form-textarea"
                  placeholder="Advisory message"
                  value={form.message}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                />
                <label className="advisory-verify-field">
                  <input
                    type="checkbox"
                    checked={form.isVerified}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isVerified: event.target.checked }))
                    }
                  />
                  <span>
                    <strong>Verified CDRRMO post</strong> — shows the official checkmark in the mobile app.
                    Uncheck for <strong>drills</strong>, exercises, or drafts that should appear as unverified.
                  </span>
                </label>
                <div className="form-row">
                  <select
                    className="status-select"
                    value={form.severity}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        severity: event.target.value as 'low' | 'medium' | 'high',
                      }))
                    }
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                  <button type="button" className="action-button" onClick={handleCreateAdvisory}>
                    Post advisory
                  </button>
                </div>
              </div>

              <div className="advisory-list">
                {loading ? <p>Loading...</p> : null}
                {advisoryRows.map((row) => (
                  <div className="advisory-item" key={row.id}>
                    <div className="advisory-item-header">
                      <div>
                        <strong>{row.title}</strong>
                        <p>{row.message}</p>
                      </div>
                      <div className="advisory-item-badges">
                        <span
                          className={
                            row.is_verified !== false
                              ? 'advisory-trust-pill advisory-trust-pill--verified'
                              : 'advisory-trust-pill advisory-trust-pill--unverified'
                          }
                        >
                          {row.is_verified !== false ? 'Verified' : 'Drill / unverified'}
                        </span>
                        <span className={`severity-pill severity-${row.severity}`}>
                          {row.severity}
                        </span>
                      </div>
                    </div>
                    <div className="advisory-actions">
                      <span>
                        {row.source} | {formatDate(row.created_at)} |{' '}
                        {row.is_active ? 'active' : 'inactive'}
                      </span>
                      <button
                        type="button"
                        className="action-button secondary"
                        onClick={() => handleToggleAdvisory(row.id, row.is_active)}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : page === 'admin_users' ? (
            <section className="panel">
              <h2>Administrators</h2>
              <p className="muted-text" style={{ maxWidth: 720, lineHeight: 1.55 }}>
                Superadmins add or remove dashboard access. A <strong>temporary password appears only
                on this page</strong> when the email had <strong>no</strong> Supabase Auth user yet—the
                password is created once and is <strong>not stored</strong>. If the email already existed
                under Authentication → Users, you only see “Saved.” and they use (or reset) their
                existing password. Regular <strong>admins</strong> cannot open this screen. At least one
                superadmin must remain. Roles in the table are read-only—pick the role when adding someone
                (only one superadmin is intended).
              </p>
              {!isSupabaseConfigured ? (
                <p className="config-banner">Configure Supabase in <code>.env</code> first.</p>
              ) : myAdminRole !== 'superadmin' ? (
                <p className="config-banner">Only superadmins can manage this list.</p>
              ) : (
                <>
                  <div className="advisory-form" style={{ marginTop: 16, maxWidth: 520 }}>
                    <label className="muted-text" htmlFor="admin-invite-email">
                      Email (dashboard login)
                    </label>
                    <input
                      id="admin-invite-email"
                      className="form-input"
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      value={adminInviteEmail}
                      onChange={(e) => setAdminInviteEmail(e.target.value)}
                    />
                    <label className="muted-text" htmlFor="admin-invite-role" style={{ marginTop: 10 }}>
                      Role
                    </label>
                    <select
                      id="admin-invite-role"
                      className="status-select"
                      style={{ width: '100%', marginTop: 6 }}
                      value={adminInviteRole}
                      onChange={(e) =>
                        setAdminInviteRole(e.target.value as AppAdminDashboardRole)
                      }
                    >
                      <option value="admin">Admin (full dashboard, cannot add admins)</option>
                      {!superadminSlotFilled ? (
                        <option value="superadmin">Superadmin (can add or remove admins)</option>
                      ) : null}
                    </select>
                    <button
                      type="button"
                      className="action-button"
                      style={{ marginTop: 12 }}
                      disabled={adminUsersBusy || !adminInviteEmail.trim()}
                      onClick={() => {
                        setAdminUsersMessage(null);
                        setAdminInviteLastTempPassword(null);
                        setAdminUsersBusy(true);
                        void (async () => {
                          try {
                            const addResult = await superadminAddAdminByEmail(
                              adminInviteEmail,
                              adminInviteRole,
                            );
                            setAdminInviteEmail('');
                            if (addResult.temporaryPassword) {
                              setAdminInviteLastTempPassword(addResult.temporaryPassword);
                              setAdminUsersMessage(
                                'Administrator saved. Copy the password in the box below now—it is not saved anywhere. They sign in here, then choose a new password before the dashboard unlocks.',
                              );
                            } else {
                              setAdminInviteLastTempPassword(null);
                              setAdminUsersMessage(
                                'Saved. No temporary password was shown because this email already had a Supabase Auth account. They sign in with that password, or you reset it under Supabase → Authentication → Users.',
                              );
                            }
                            await refreshAdminList();
                            await refreshMyAdminAccess();
                          } catch (err) {
                            setAdminInviteLastTempPassword(null);
                            setAdminUsersMessage(
                              err instanceof Error
                                ? err.message
                                : typeof err === 'object' &&
                                    err &&
                                    'message' in err &&
                                    typeof (err as { message: unknown }).message === 'string'
                                  ? (err as { message: string }).message
                                  : 'Could not add administrator.',
                            );
                          } finally {
                            setAdminUsersBusy(false);
                          }
                        })();
                      }}
                    >
                      {adminUsersBusy ? 'Saving…' : 'Add or update administrator'}
                    </button>
                    {adminInviteLastTempPassword ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: 'rgba(15, 23, 42, 0.06)',
                          border: '1px solid rgba(15, 23, 42, 0.12)',
                        }}
                      >
                        <div className="muted-text" style={{ fontSize: 12, marginBottom: 8 }}>
                          Temporary password (copy now — not stored)
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <code
                            style={{
                              flex: '1 1 200px',
                              fontSize: 14,
                              wordBreak: 'break-all',
                              padding: '8px 10px',
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid rgba(15, 23, 42, 0.1)',
                            }}
                          >
                            {adminInviteLastTempPassword}
                          </code>
                          <button
                            type="button"
                            className="action-button secondary"
                            onClick={() => {
                              void navigator.clipboard.writeText(adminInviteLastTempPassword);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {adminUsersMessage ? (
                      <p
                        className="muted-text"
                        style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {adminUsersMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="table-wrap" style={{ marginTop: 24 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Added</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminList.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No rows (or still loading).</td>
                          </tr>
                        ) : (
                          adminList.map((row) => (
                            <tr key={row.userId}>
                              <td>{row.email}</td>
                              <td>
                                <span
                                  className={
                                    row.role === 'superadmin'
                                      ? 'dash-role-pill dash-role-pill--super'
                                      : 'dash-role-pill'
                                  }
                                  style={{ display: 'inline-block' }}
                                >
                                  {row.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                                </span>
                              </td>
                              <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                              <td>
                                <button
                                  type="button"
                                  className="action-button danger"
                                  disabled={adminUsersBusy}
                                  onClick={() => {
                                    if (
                                      !window.confirm(
                                        `Remove dashboard access for ${row.email}?`,
                                      )
                                    ) {
                                      return;
                                    }
                                    setAdminUsersBusy(true);
                                    void (async () => {
                                      try {
                                        await superadminRemoveAdmin(row.userId);
                                        await refreshAdminList();
                                        await refreshMyAdminAccess();
                                      } catch (err) {
                                        alert(
                                          err instanceof Error
                                            ? err.message
                                            : 'Could not remove.',
                                        );
                                      } finally {
                                        setAdminUsersBusy(false);
                                      }
                                    })();
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : page === 'users' ? (
            <section className="panel">
              <h2>Users</h2>
              <p className="muted-text" style={{ maxWidth: 720, lineHeight: 1.55 }}>
                Same flow as <strong>Administrators</strong> and <strong>Members</strong>: one email creates a
                household profile, Supabase Auth account, and a one-time temporary password (not stored after this
                page). They sign in on the <strong>mobile app</strong> and choose a new password. For testing,
                disable “Confirm email” under Supabase → Authentication → Providers → Email so users are not stuck
                on “Waiting for verification”.
              </p>
              {!isSupabaseConfigured ? (
                <p className="config-banner">Configure Supabase in <code>.env</code> first.</p>
              ) : (
                <div className="advisory-form" style={{ marginTop: 16, maxWidth: 520 }}>
                  <label className="muted-text" htmlFor="users-invite-email">
                    Email (mobile app login)
                  </label>
                  <input
                    id="users-invite-email"
                    className="form-input"
                    type="email"
                    autoComplete="off"
                    placeholder="name@example.com"
                    value={usersInviteEmail}
                    onChange={(e) => setUsersInviteEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className="action-button"
                    style={{ marginTop: 12 }}
                    disabled={usersInviteBusy || !usersInviteEmail.trim()}
                    onClick={() => {
                      setUsersInviteMessage(null);
                      setUsersInviteLastTempPassword(null);
                      setUsersInviteBusy(true);
                      void (async () => {
                        try {
                          const r = await createResidentWithEmailOnlyLogin(usersInviteEmail);
                          if (r.ok) {
                            setUsersInviteEmail('');
                            setUsersInviteLastTempPassword(r.temporaryPassword);
                            setUsersInviteMessage(
                              'User saved. Copy the password below now—it is not stored. They sign in on the mobile app, then choose a new password.',
                            );
                            await loadAll();
                          } else {
                            setUsersInviteMessage(r.message);
                          }
                        } finally {
                          setUsersInviteBusy(false);
                        }
                      })();
                    }}
                  >
                    {usersInviteBusy ? 'Saving…' : 'Add user & mobile login'}
                  </button>
                  {usersInviteLastTempPassword ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(15, 23, 42, 0.06)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <div className="muted-text" style={{ fontSize: 12, marginBottom: 8 }}>
                        Temporary password (copy now — not stored)
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <code
                          style={{
                            flex: '1 1 200px',
                            fontSize: 14,
                            wordBreak: 'break-all',
                            padding: '8px 10px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid rgba(15, 23, 42, 0.1)',
                          }}
                        >
                          {usersInviteLastTempPassword}
                        </code>
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => {
                            void navigator.clipboard.writeText(usersInviteLastTempPassword);
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {usersInviteMessage ? (
                    <p
                      className="muted-text"
                      style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {usersInviteMessage}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          ) : (
            <section className="panel">
              <h2>Emergency hotlines</h2>
              <p className="muted-text" style={{ marginTop: 0 }}>
                <strong>Guides poster</strong> — full two-column layout shown in the mobile app (Guides → Emergency
                Hotlines). Edit sections and lines below, then save.
              </p>
              <HotlinePosterEditor
                value={hotlinePosterConfig}
                onChange={setHotlinePosterConfig}
                disabled={hotlinePosterSaving || loading}
              />
              <div style={{ marginTop: 16, marginBottom: 24 }}>
                <button
                  type="button"
                  className="action-button"
                  disabled={hotlinePosterSaving || loading}
                  onClick={() => void handleSaveHotlinePoster()}
                >
                  {hotlinePosterSaving ? 'Saving poster…' : 'Save hotline poster'}
                </button>
              </div>

              <h3 style={{ marginBottom: 8 }}>Quick dial list (Emergency tab)</h3>
              <p className="muted-text" style={{ marginTop: 0 }}>
                Extra numbers here are merged into the Emergency tab dial picker. Label does not need to be unique.
              </p>
              <div className="advisory-form">
                <div className="form-row hotline-grid">
                  <input
                    className="form-input"
                    placeholder="Office label"
                    value={hotlineForm.label}
                    onChange={(event) =>
                      setHotlineForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                  />
                  <input
                    className="form-input"
                    placeholder="Contact number"
                    value={hotlineForm.phone}
                    onChange={(event) =>
                      setHotlineForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                  <input
                    className="form-input"
                    placeholder="Priority"
                    value={hotlineForm.priority}
                    onChange={(event) =>
                      setHotlineForm((prev) => ({ ...prev, priority: event.target.value }))
                    }
                  />
                  <button type="button" className="action-button" onClick={handleSaveHotline}>
                    {hotlineForm.id ? 'Update hotline' : 'Save hotline'}
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Phone</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4}>Loading...</td>
                      </tr>
                    ) : hotlineRows.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No hotlines yet.</td>
                      </tr>
                    ) : (
                      hotlineRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.label}</td>
                          <td>{formatPhilippineMobileDisplay(row.phone)}</td>
                          <td>{row.priority}</td>
                          <td>
                            <button
                              type="button"
                              className="action-button secondary"
                              onClick={() =>
                                setHotlineForm({
                                  id: row.id,
                                  label: row.label,
                                  phone: row.phone,
                                  priority: String(row.priority),
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-button danger"
                              onClick={() => handleDeleteHotline(row.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {residentViewModal ? (
        <AppModal
          title="Resident profile"
          size="wide"
          onClose={() => setResidentViewModal(null)}
        >
          <ResidentProfileView
            resident={residentViewModal}
            onClose={() => setResidentViewModal(null)}
            onEdit={() => {
              const r = residentViewModal;
              setResidentViewModal(null);
              setResidentModal({ mode: 'edit', row: r });
            }}
          />
        </AppModal>
      ) : null}
      {residentModal ? (
        <AppModal
          title={residentModal.mode === 'create' ? 'Add resident' : 'Edit resident'}
          onClose={() => {
            if (!residentFormBusy) {
              setResidentModal(null);
            }
          }}
        >
          <ResidentEditor
            mode={residentModal.mode}
            resident={residentModal.mode === 'edit' ? residentModal.row : null}
            hasAuthLink={residentModal.mode === 'edit' && Boolean(residentModal.row.user_id)}
            saving={residentFormBusy}
            onSave={(input) => void handleSaveResident(input)}
            onClearAuthLink={
              residentModal.mode === 'edit' && residentModal.row.user_id
                ? () => void handleClearResidentAuth()
                : undefined
            }
            onCancel={() => {
              if (!residentFormBusy) {
                setResidentModal(null);
              }
            }}
          />
        </AppModal>
      ) : null}
      {staffModal ? (
        <AppModal
          title={staffModal.mode === 'create' ? 'Add staff' : 'Edit staff'}
          onClose={() => {
            if (!staffFormBusy) {
              setStaffModal(null);
            }
          }}
        >
          <StaffEditor
            mode={staffModal.mode}
            staff={staffModal.mode === 'edit' ? staffModal.row : null}
            residents={members}
            saving={staffFormBusy}
            onSave={(input) => void handleSaveStaff(input)}
            onCancel={() => {
              if (!staffFormBusy) {
                setStaffModal(null);
              }
            }}
          />
        </AppModal>
      ) : null}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-login-card">
          <p className="config-banner" style={{ margin: 0 }}>
            Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in{' '}
            <code>.env</code>, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="admin-auth-shell">
        <p className="muted-text">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <AdminLoginScreen />;
  }

  return <DashboardApp session={session} />;
}
