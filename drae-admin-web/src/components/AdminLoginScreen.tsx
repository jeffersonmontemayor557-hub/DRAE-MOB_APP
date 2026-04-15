import { FormEvent, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
      return;
    }
    const em = email.trim();
    if (!em || !password) {
      setError('Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: em, password });
      if (signErr) {
        setError(signErr.message);
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-auth-shell">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div className="sidebar-brand-icon">CD</div>
          <div>
            <div className="sidebar-brand-name">CDRRMO Dasmariñas</div>
            <div className="sidebar-brand-sub">Staff dashboard sign-in</div>
          </div>
        </div>
        <p className="admin-login-hint">
          Sign in with the email and password for your role. Superadmins can create dashboard logins
          on the <strong>Administrators</strong> page; your account must be in{' '}
          <code>public.app_admins</code> (admin or superadmin).
        </p>
        <form className="admin-login-form" onSubmit={(e) => void onSubmit(e)}>
          <label className="muted-text" htmlFor="admin-login-email">
            Email
          </label>
          <input
            id="admin-login-email"
            className="form-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <label className="muted-text" htmlFor="admin-login-password">
            Password
          </label>
          <input
            id="admin-login-password"
            className="form-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
          {error ? <p className="admin-login-error">{error}</p> : null}
          <button type="submit" className="action-button" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
