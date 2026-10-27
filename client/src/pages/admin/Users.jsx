import { useState } from 'react';
import { adminApi } from '../../api';
import { errorMessage, fieldErrors } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, Chip, EmptyState, Field, inputCls } from '../../components/ui';

export default function Users() {
  const toast = useToast();
  const [role, setRole] = useState('');
  const users = useAsync(() => adminApi.users(role || undefined), [role]);
  const empty = { name: '', email: '', role: 'student', rollNo: '', password: '' };
  const [form, setForm] = useState(empty);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setFields({});
    try {
      await adminApi.createUser({ ...form, rollNo: form.role === 'student' ? form.rollNo || undefined : undefined });
      toast.success('User created');
      setForm(empty);
      users.reload({ silent: true });
    } catch (err) { setFields(fieldErrors(err)); toast.error(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="self-start p-5">
        <h2 className="mb-4 font-semibold">Create user</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Full name" error={fields.name}><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
          <Field label="Email" error={fields.email}><input className={inputCls} type="email" value={form.email} onChange={set('email')} required /></Field>
          <Field label="Role" error={fields.role}>
            <select className={inputCls} value={form.role} onChange={set('role')}><option value="student">Student</option><option value="ta">TA</option><option value="admin">Admin</option></select>
          </Field>
          {form.role === 'student' && <Field label="Roll no" error={fields.rollNo}><input className={inputCls} value={form.rollNo} onChange={set('rollNo')} /></Field>}
          <Field label="Temporary password" error={fields.password} hint="At least 8 characters">
            <input className={inputCls} type="text" autoComplete="off" value={form.password} onChange={set('password')} required />
          </Field>
          <Button type="submit" loading={busy} className="w-full">Create user</Button>
        </form>
      </Card>
      <div className="space-y-3 lg:col-span-2">
        <select aria-label="Filter by role" className={inputCls + ' !w-auto'} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option><option value="student">Students</option><option value="ta">TAs</option><option value="admin">Admins</option>
        </select>
        <Async state={users} isEmpty={(d) => d.users.length === 0} empty={<EmptyState title="No users found" />}>
          {({ users: list }) => (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roll no</th><th className="px-4 py-3">Role</th></tr></thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3 text-muted">{u.rollNo || '—'}</td><td className="px-4 py-3"><Chip tone="info">{u.role}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </Async>
      </div>
    </div>
  );
}
