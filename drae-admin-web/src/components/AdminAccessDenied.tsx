import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Props = {
  email: string | undefined;
};

export function AdminAccessDenied({ email }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="admin-auth-shell">
      <div className="admin-login-card">
        <h1 className="admin-access-title">No dashboard access</h1>
        <p className="admin-login-hint">
          Signed in as <strong>{email ?? '—'}</strong>, but this user is not in{' '}
          <code>public.app_admins</code>. Ask a <strong>superadmin</strong> to add you from{' '}
          <strong>Administrators</strong>, or run the SQL insert in the Supabase SQL Editor.
        </p>
        <button
          type="button"
          className="action-button secondary"
          disabled={busy || !isSupabaseConfigured || !supabase}
          onClick={() => {
            setBusy(true);
            void supabase?.auth.signOut().finally(() => setBusy(false));
          }}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
