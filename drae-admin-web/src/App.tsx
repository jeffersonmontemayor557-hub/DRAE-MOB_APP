import { useEffect, useMemo, useState } from 'react';
import './App.css';
import cityLogo from './assets/city-logo.png';
import cdrLogo from './assets/cdr-logo.png';
import { isSupabaseConfigured } from './lib/supabase';
import {
  createAdvisory,
  deleteHotline,
  getAdvisories,
  getDashboardStats,
  getHotlines,
  getReports,
  getResidentsWithReadiness,
  getStaffMembers,
  saveHotline,
  toggleAdvisoryActive,
  updateReportAssignment,
  updateReportStatus,
} from './services/dashboardService';
import type { Advisory, DashboardStats, Hotline, Report, ResidentWithReadiness, StaffMember } from './types';

type Page = 'dashboard' | 'members' | 'reports' | 'advisories' | 'hotlines';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function App() {
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
  });
  const [hotlineForm, setHotlineForm] = useState({
    id: null as string | null,
    label: '',
    phone: '',
    priority: '1',
  });
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, memberRows, reportRows, advisoryRows, hotlineRows, staffRows] =
        await Promise.all([
          getDashboardStats(),
          getResidentsWithReadiness(),
          getReports(),
          getAdvisories(),
          getHotlines(),
          getStaffMembers(),
        ]);
      setStats(statsData);
      setMembers(memberRows);
      setReports(reportRows);
      setAdvisories(advisoryRows);
      setHotlines(hotlineRows);
      setStaffMembers(staffRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const infoRows = useMemo(() => members, [members]);
  const reportRows = useMemo(() => reports, [reports]);
  const advisoryRows = useMemo(() => advisories, [advisories]);
  const hotlineRows = useMemo(() => hotlines, [hotlines]);

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
    setForm({ title: '', message: '', severity: 'low' });
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

    await saveHotline({
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

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <img className="seal" src={cityLogo} alt="City Seal" />
        <button
          className={`nav-btn ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
          title="Dashboard"
        >
          <span>Home</span>
        </button>
        <button
          className={`nav-btn ${page === 'members' ? 'active' : ''}`}
          onClick={() => setPage('members')}
          title="Residents"
        >
          <span>Members</span>
        </button>
        <button
          className={`nav-btn ${page === 'reports' ? 'active' : ''}`}
          onClick={() => setPage('reports')}
        >
          <span>Reports</span>
        </button>
        <button
          className={`nav-btn ${page === 'advisories' ? 'active' : ''}`}
          onClick={() => setPage('advisories')}
        >
          <span>Alerts</span>
        </button>
        <button
          className={`nav-btn ${page === 'hotlines' ? 'active' : ''}`}
          onClick={() => setPage('hotlines')}
        >
          <span>Calls</span>
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-left">
            <img className="logo-small" src={cdrLogo} alt="CDRRMO Logo" />
            <span>CDRRMO - Dasmarinas City</span>
          </div>
          <img className="avatar-logo" src={cityLogo} alt="Profile" />
        </header>

        {page === 'dashboard' ? (
          <section className="panel dashboard-panel">
            <div className="dashboard-header">
              <h2>DASHBOARD</h2>
              <button type="button" className="action-button secondary refresh-btn" onClick={() => loadAll()}>
                Refresh data
              </button>
            </div>
            {!isSupabaseConfigured ? (
              <p className="config-banner">
                Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> so this dashboard reads live data.
              </p>
            ) : null}
            {loading && !stats ? (
              <p>Loading statistics…</p>
            ) : (
              <div className="stat-grid">
                <div className="stat-card stat-card--members">
                  <span className="stat-label">Registered members</span>
                  <span className="stat-value">{stats?.residentCount ?? '—'}</span>
                  <span className="stat-hint">Resident profiles in Supabase</span>
                </div>
                <div className="stat-card stat-card--gobag">
                  <span className="stat-label">Go-bag readiness</span>
                  <span className="stat-value">{stats?.goBagReadyCount ?? '—'}</span>
                  <span className="stat-hint">Households with go-bag checked in preparedness</span>
                </div>
                <div className="stat-card stat-card--emergency">
                  <span className="stat-label">Open emergency reports</span>
                  <span className="stat-value">{stats?.openEmergencyReports ?? '—'}</span>
                  <span className="stat-hint">Submitted or in progress (not resolved)</span>
                </div>
                <div className="stat-card stat-card--staff">
                  <span className="stat-label">Active response staff</span>
                  <span className="stat-value">{stats?.activeStaffCount ?? '—'}</span>
                  <span className="stat-hint">Staff available for auto-assignment</span>
                </div>
                <div className="stat-card stat-card--alerts">
                  <span className="stat-label">Active advisories</span>
                  <span className="stat-value">{stats?.activeAdvisoriesCount ?? '—'}</span>
                  <span className="stat-hint">Posted alerts visible to the mobile app</span>
                </div>
                <div className="stat-card stat-card--hotlines">
                  <span className="stat-label">Emergency hotlines</span>
                  <span className="stat-value">{stats?.hotlineCount ?? '—'}</span>
                  <span className="stat-hint">Numbers published to residents</span>
                </div>
              </div>
            )}
          </section>
        ) : page === 'members' ? (
          <section className="panel">
            <h2>RESIDENCE INFORMATION ({infoRows.length} members)</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>FULL NAME</th>
                    <th>PHOTO</th>
                    <th>ADDRESS</th>
                    <th>CONTACT NUMBER</th>
                    <th>GENDER</th>
                    <th>AGE</th>
                    <th>EMAIL ADDRESS</th>
                    <th>CONTACT PERSON</th>
                    <th>NUMBER OF CONTACT PERSON</th>
                    <th>READINESS %</th>
                    <th>GO BAG</th>
                    <th>READINESS UPDATED</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12}>Loading...</td>
                    </tr>
                  ) : infoRows.length === 0 ? (
                    <tr>
                      <td colSpan={12}>No resident records yet.</td>
                    </tr>
                  ) : (
                    infoRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.full_name || '-'}</td>
                        <td>
                          {row.avatar_url ? (
                            <img className="resident-avatar" src={row.avatar_url} alt={row.full_name} />
                          ) : (
                            <span className="muted-text">No photo</span>
                          )}
                        </td>
                        <td>{row.address || '-'}</td>
                        <td>{row.contact_number || '-'}</td>
                        <td>{row.gender || '-'}</td>
                        <td>{row.age ?? '-'}</td>
                        <td>{row.email || '-'}</td>
                        <td>{row.contact_person || '-'}</td>
                        <td>{row.contact_person_number || '-'}</td>
                        <td>{row.readiness_score != null ? `${row.readiness_score}%` : '—'}</td>
                        <td>
                          <span className={row.go_bag_ready ? 'pill-yes' : 'pill-no'}>
                            {row.go_bag_ready ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          {row.readiness_updated_at ? formatDate(row.readiness_updated_at) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : page === 'reports' ? (
          <section className="panel">
            <h2>DISASTER AND HAZARD REPORTS</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>DATE</th>
                    <th>TYPE OF DISASTER</th>
                    <th>LOCATION</th>
                    <th>REMARKS</th>
                    <th>PHOTO</th>
                    <th>VOICE</th>
                    <th>ASSIGNED TO</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9}>Loading...</td>
                    </tr>
                  ) : reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No report records yet.</td>
                    </tr>
                  ) : (
                    reportRows.map((row) => (
                      <tr key={row.id}>
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
                            {staffMembers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name}
                                {s.role ? ` (${s.role})` : ''}
                              </option>
                            ))}
                          </select>
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
            <h2>CDRRMO ADVISORIES</h2>
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
                <button className="action-button" onClick={handleCreateAdvisory}>
                  Post Advisory
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
                    <span className={`severity-pill severity-${row.severity}`}>
                      {row.severity}
                    </span>
                  </div>
                  <div className="advisory-actions">
                    <span>
                      {row.source} | {formatDate(row.created_at)} |{' '}
                      {row.is_active ? 'active' : 'inactive'}
                    </span>
                    <button
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
        ) : (
          <section className="panel">
            <h2>EMERGENCY HOTLINES</h2>
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
                <button className="action-button" onClick={handleSaveHotline}>
                  {hotlineForm.id ? 'Update Hotline' : 'Save Hotline'}
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>LABEL</th>
                    <th>PHONE</th>
                    <th>PRIORITY</th>
                    <th>ACTIONS</th>
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
                        <td>{row.phone}</td>
                        <td>{row.priority}</td>
                        <td>
                          <button
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
      </main>
    </div>
  );
}

export default App;
