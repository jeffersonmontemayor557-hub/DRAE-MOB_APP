import { type FormEvent, useEffect, useState } from 'react';
import type { ResidentInput, ResidentWithReadiness } from '../types';

const PH_MOBILE_PLACEHOLDER = 'e.g. +639171234567 or 09171234567';

const empty: ResidentInput = {
  full_name: '',
  address: '',
  contact_number: '',
  gender: '',
  age: null,
  email: '',
  contact_person: '',
  contact_person_number: '',
  avatar_url: null,
};

function rowToInput(r: ResidentWithReadiness): ResidentInput {
  return {
    full_name: r.full_name ?? '',
    address: r.address ?? '',
    contact_number: r.contact_number ?? '',
    gender: r.gender ?? '',
    age: r.age,
    email: r.email ?? '',
    contact_person: r.contact_person ?? '',
    contact_person_number: r.contact_person_number ?? '',
    avatar_url: r.avatar_url ?? null,
  };
}

type Props = {
  mode: 'create' | 'edit';
  resident?: ResidentWithReadiness | null;
  hasAuthLink: boolean;
  saving: boolean;
  onSave: (input: ResidentInput) => void;
  onClearAuthLink?: () => void;
  onCancel: () => void;
};

export function ResidentEditor({
  mode,
  resident,
  hasAuthLink,
  saving,
  onSave,
  onClearAuthLink,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ResidentInput>(empty);

  useEffect(() => {
    if (mode === 'edit' && resident) {
      setForm(rowToInput(resident));
    } else {
      setForm(empty);
    }
  }, [mode, resident]);

  const update = (key: keyof ResidentInput, value: string) => {
    if (key === 'age') {
      const t = value.trim();
      if (t === '') {
        setForm((f) => ({ ...f, age: null }));
        return;
      }
      const n = Number.parseInt(t, 10);
      setForm((f) => ({ ...f, age: Number.isFinite(n) ? n : null }));
      return;
    }
    if (key === 'avatar_url') {
      setForm((f) => ({ ...f, avatar_url: value.trim() || null }));
      return;
    }
    setForm((f) => ({ ...f, [key]: value } as ResidentInput));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      return;
    }
    onSave(form);
  };

  return (
    <form className="crud-form" onSubmit={submit}>
      <label className="crud-field">
        <span>Full name *</span>
        <input
          className="form-input"
          value={form.full_name}
          onChange={(ev) => update('full_name', ev.target.value)}
          required
        />
      </label>
      <label className="crud-field">
        <span>Address</span>
        <input className="form-input" value={form.address} onChange={(ev) => update('address', ev.target.value)} />
      </label>
      <div className="crud-field-row">
        <label className="crud-field">
          <span>Contact number</span>
          <input
            className="form-input"
            value={form.contact_number}
            onChange={(ev) => update('contact_number', ev.target.value)}
            placeholder={PH_MOBILE_PLACEHOLDER}
          />
        </label>
        <label className="crud-field">
          <span>Age</span>
          <input
            className="form-input"
            inputMode="numeric"
            value={form.age == null ? '' : String(form.age)}
            onChange={(ev) => update('age', ev.target.value)}
          />
        </label>
      </div>
      <label className="crud-field">
        <span>Gender</span>
        <input className="form-input" value={form.gender} onChange={(ev) => update('gender', ev.target.value)} />
      </label>
      <label className="crud-field">
        <span>Email (profile display)</span>
        <input
          className="form-input"
          type="email"
          value={form.email}
          onChange={(ev) => update('email', ev.target.value)}
        />
      </label>
      <label className="crud-field">
        <span>Contact person</span>
        <input
          className="form-input"
          value={form.contact_person}
          onChange={(ev) => update('contact_person', ev.target.value)}
        />
      </label>
      <label className="crud-field">
        <span>Contact person number</span>
        <input
          className="form-input"
          value={form.contact_person_number}
          onChange={(ev) => update('contact_person_number', ev.target.value)}
          placeholder={PH_MOBILE_PLACEHOLDER}
        />
      </label>
      <label className="crud-field">
        <span>Avatar URL</span>
        <input
          className="form-input"
          value={form.avatar_url ?? ''}
          onChange={(ev) => update('avatar_url', ev.target.value)}
          placeholder="https://…"
        />
      </label>
      {mode === 'edit' && hasAuthLink && onClearAuthLink ? (
        <div className="crud-auth-strip">
          <span>This profile has a mobile app login linked.</span>
          <button type="button" className="action-button secondary" onClick={onClearAuthLink}>
            Remove app login link
          </button>
        </div>
      ) : null}
      <div className="crud-actions">
        <button type="button" className="action-button secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="action-button" disabled={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create resident' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
