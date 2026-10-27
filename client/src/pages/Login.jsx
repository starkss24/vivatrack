import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage, fieldErrors } from '../api/http';
import { Button, Card, Field, inputCls } from '../components/ui';
import { homeFor } from '../routes/ProtectedRoute';

const DEMO = [
  ['Admin', 'admin@demo.test'],
  ['TA', 'ta1@demo.test'],
  ['Student', 'student1@demo.test'],
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFields({});
    try {
      const u = await login(form.email, form.password);
      nav(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
      setFields(fieldErrors(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-full grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-xl font-semibold text-white">V</span>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to VivaTrack</h1>
          <p className="mt-1 text-sm text-muted">Viva marks, attendance and TA chat in one place.</p>
        </div>
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email" error={fields.email}>
              <input className={inputCls} type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Password" error={fields.password}>
              <input className={inputCls} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">Sign in</Button>
          </form>
        </Card>
        {import.meta.env.VITE_SHOW_DEMO_HINT === 'true' && (
          <Card className="mt-4 p-4 text-sm">
            <p className="font-medium">Demo accounts</p>
            <p className="mb-2 text-xs text-muted">Seeded data only. Password is the server's SEED_PASSWORD (see README).</p>
            <ul className="space-y-1">
              {DEMO.map(([role, email]) => (
                <li key={email} className="flex justify-between gap-2">
                  <span className="text-muted">{role}</span>
                  <button type="button" className="text-accent hover:underline" onClick={() => setForm({ ...form, email })}>{email}</button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
