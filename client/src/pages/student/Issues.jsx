import { useState } from 'react';
import { studentApi } from '../../api';
import { errorMessage, fieldErrors } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, Chip, EmptyState, Field, fmtDateTime, inputCls } from '../../components/ui';

export default function Issues({ courseId }) {
  const toast = useToast();
  const list = useAsync(() => studentApi.issues(), []);
  const [form, setForm] = useState({ subject: '', description: '' });
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFields({});
    try {
      await studentApi.createIssue({ courseId, ...form });
      toast.success('Issue sent to the administration');
      setForm({ subject: '', description: '' });
      list.reload({ silent: true });
    } catch (err) {
      setFields(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-2 self-start">
        <h2 className="font-semibold">Raise an issue</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Private: only you and the administration can see this. Your TA cannot.</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Subject" error={fields.subject}>
            <input className={inputCls} value={form.subject} maxLength={120} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          </Field>
          <Field label="What happened?" error={fields.description} hint={`${form.description.length}/2000`}>
            <textarea className={inputCls} rows={5} value={form.description} maxLength={2000} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <Button type="submit" loading={busy} disabled={!form.subject.trim() || !form.description.trim()}>Submit issue</Button>
        </form>
      </Card>
      <div className="space-y-3 lg:col-span-3">
        <h2 className="font-semibold">Your issues</h2>
        <Async state={list} isEmpty={(d) => d.issues.length === 0} empty={<EmptyState title="No issues raised" text="Anything you report will be tracked here with its status." />}>
          {({ issues }) => issues.map((i) => (
            <Card key={i._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{i.subject}</p>
                  <p className="text-xs text-muted">{i.course?.name} · {fmtDateTime(i.createdAt)}</p>
                </div>
                <Chip tone={i.status} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{i.description}</p>
              {i.adminReply && (
                <div className="mt-3 rounded-xl bg-mint-100 p-3 text-sm">
                  <p className="text-xs font-medium text-accent">Reply from administration</p>
                  <p className="mt-1 whitespace-pre-wrap">{i.adminReply}</p>
                </div>
              )}
            </Card>
          ))}
        </Async>
      </div>
    </div>
  );
}
