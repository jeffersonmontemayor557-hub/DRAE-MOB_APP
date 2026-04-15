import { type FormEvent, useState } from 'react';
import { completeAdminPasswordChange } from '../services/dashboardService';

type Props = {
  onSuccess: () => void;
};

export function AdminMustChangePasswordPanel({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await completeAdminPasswordChange(password);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update password.');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="admin-auth-shell">
      <div className="admin-login-card">
        <h1 className="admin-access-title" style={{ marginTop: 0 }}>
          Set a new password
        </h1>
        <p className="admin-login-hint">
          Your dashboard account was created with a temporary password. Choose a new one to continue.
        </p>
        <form className="admin-login-form" onSubmit={submit}>
          <label className="muted-text" htmlFor="admin-force-pw">
            New password
          </label>
          <input
            id="admin-force-pw"
            className="form-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
          <label className="muted-text" htmlFor="admin-force-pw2">
            Confirm password
          </label>
          <input
            id="admin-force-pw2"
            className="form-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
          />
          {error ? <p className="admin-login-error">{error}</p> : null}
          <button type="submit" className="action-button" disabled={busy}>
            {busy ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
