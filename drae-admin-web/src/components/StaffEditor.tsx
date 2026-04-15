import { type FormEvent, useEffect, useState } from 'react';
import type { ResidentWithReadiness, StaffInput, StaffMember } from '../types';

const empty: StaffInput = {
  full_name: '',
  role: '',
  phone: '',
  hazard_types: [],
  active: true,
  profile_id: null,
  login_email: '',
};

function staffToInput(s: StaffMember): StaffInput {
  return {
    full_name: s.full_name ?? '',
    role: s.role ?? '',
    phone: s.phone ?? '',
    hazard_types: Array.isArray(s.hazard_types) ? [...s.hazard_types] : [],
    active: s.active !== false,
    profile_id: s.profile_id ?? null,
    login_email: '',
  };
}

function hazardsToString(ht: string[]) {
  return ht.join(', ');
}

function parseHazards(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Props = {
  mode: 'create' | 'edit';
  staff?: StaffMember | null;
  residents: ResidentWithReadiness[];
  saving: boolean;
  onSave: (input: StaffInput) => void;
  onCancel: () => void;
};

export function StaffEditor({
  mode,
  staff,
  residents,
  saving,
  onSave,
  onCancel,
}: Props) {
  const [form, setForm] = useState<StaffInput>(empty);
  const [hazardsText, setHazardsText] = useState('');

  useEffect(() => {
    if (mode === 'edit' && staff) {
      const i = staffToInput(staff);
      setForm(i);
      setHazardsText(hazardsToString(i.hazard_types));
    } else {
      setForm(empty);
      setHazardsText('');
    }
  }, [mode, staff]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      return;
    }
    onSave({ ...form, hazard_types: parseHazards(hazardsText) });
  };

  return (
    <form className="crud-form" onSubmit={submit}>
      <label className="crud-field">
        <span>Full name *</span>
        <input
          className="form-input"
          value={form.full_name}
          onChange={(ev) => setForm((f) => ({ ...f, full_name: ev.target.value }))}
          required
        />
      </label>
      <label className="crud-field">
        <span>Role</span>
        <input
          className="form-input"
          value={form.role}
          onChange={(ev) => setForm((f) => ({ ...f, role: ev.target.value }))}
        />
      </label>
      <label className="crud-field">
        <span>Phone</span>
        <input
          className="form-input"
          value={form.phone}
          onChange={(ev) => setForm((f) => ({ ...f, phone: ev.target.value }))}
          placeholder="e.g. +639171234567 or 09171234567"
        />
      </label>
      <label className="crud-field">
        <span>Hazard types (comma-separated)</span>
        <input
          className="form-input"
          value={hazardsText}
          onChange={(ev) => setHazardsText(ev.target.value)}
          placeholder="Flood, Fire, Earthquake"
        />
      </label>
      <label className="crud-field crud-field--checkbox">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(ev) => setForm((f) => ({ ...f, active: ev.target.checked }))}
        />
        <span>Active (eligible for report assignment)</span>
      </label>
      {mode === 'create' ? (
        <label className="crud-field">
          <span>Mobile login email (optional)</span>
          <input
            className="form-input"
            type="email"
            autoComplete="off"
            value={form.login_email ?? ''}
            onChange={(ev) => setForm((f) => ({ ...f, login_email: ev.target.value }))}
            placeholder="e.g. staff@agency.gov — creates profile + app login"
          />
          <span className="muted-text" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
            If set, a resident-style profile row and mobile account are created; the user must
            complete personal information and change the temporary password in the app. Leave blank
            for roster-only staff with no app login.
          </span>
        </label>
      ) : null}
      <label className="crud-field">
        <span>Linked resident profile (optional)</span>
        <select
          className="status-select"
          style={{ width: '100%' }}
          value={form.profile_id ?? ''}
          onChange={(ev) => {
            const v = ev.target.value;
            setForm((f) => ({
              ...f,
              profile_id: v === '' ? null : v,
            }));
          }}
          disabled={mode === 'create' && Boolean(form.login_email?.trim())}
        >
          <option value="">None</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name || r.id}
            </option>
          ))}
        </select>
      </label>
      <p className="muted-text" style={{ margin: 0, fontSize: 12 }}>
        Only one staff row can link to a given resident. If a profile is already linked elsewhere,
        Supabase will return an error—edit the other staff member first.
        {mode === 'create' && form.login_email?.trim()
          ? ' Linked profile is disabled when creating a mobile login (a new profile is created for that email).'
          : ''}
      </p>
      <div className="crud-actions">
        <button type="button" className="action-button secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="action-button" disabled={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Add staff' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
