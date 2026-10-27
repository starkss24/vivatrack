import { useState } from 'react';
import { adminApi } from '../../api';
import { errorMessage } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, Chip, EmptyState, Field, Modal, fmtDateTime, inputCls } from '../../components/ui';

function IssueDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const state = useAsync(() => adminApi.issue(id), [id]);
  const [status, setStatus] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (issue) => {
    const body = {};
    if (status && status !== issue.status) body.status = status;
    if (reply.trim()) body.adminReply = reply.trim();
    if (!Object.keys(body).length) { toast.error('Nothing to update'); return; }
    setBusy(true);
    try {
      await adminApi.updateIssue(id, body);
      toast.success('Issue updated');
      setReply(''); setStatus(null);
      state.reload({ silent: true }); onChanged();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal wide title="Issue" onClose={onClose}>
      <Async state={state}>
        {({ issue }) => (
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{issue.subject}</h3><Chip tone={issue.status} /></div>
              <p className="text-xs text-muted">
                From {issue.student?.name} ({issue.student?.rollNo}) · about TA {issue.ta?.name} · {issue.course?.code} · {fmtDateTime(issue.createdAt)}
              </p>
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm">{issue.description}</p>
            {issue.adminReply && (
              <div className="rounded-xl bg-mint-100 p-3 text-sm"><p className="text-xs font-medium text-accent">Latest reply{issue.repliedBy ? ` · ${issue.repliedBy.name}` : ''}</p><p className="mt-1 whitespace-pre-wrap">{issue.adminReply}</p></div>
            )}
            <Field label="Status">
              <select className={inputCls} value={status ?? issue.status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">Open</option><option value="under_review">Under review</option><option value="resolved">Resolved</option>
              </select>
            </Field>
            <Field label="Reply to student" hint={`${reply.length}/2000 · the student sees this`}>
              <textarea className={inputCls} rows={4} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            <div className="flex justify-end"><Button loading={busy} onClick={() => save(issue)}>Save</Button></div>
          </div>
        )}
      </Async>
    </Modal>
  );
}

export default function Issues() {
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);
  const state = useAsync(() => adminApi.issues(status || undefined), [status]);

  return (
    <div className="space-y-3">
      <select aria-label="Filter by status" className={inputCls + ' !w-auto'} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option><option value="open">Open</option><option value="under_review">Under review</option><option value="resolved">Resolved</option>
      </select>
      <Async state={state} isEmpty={(d) => d.issues.length === 0} empty={<EmptyState title="No issues" text="Student reports will appear here." />}>
        {({ issues }) => (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">TA</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Raised</th></tr></thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i._id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-neutral-50" onClick={() => setOpenId(i._id)}>
                    <td className="px-4 py-3 font-medium">{i.subject}</td><td className="px-4 py-3">{i.student?.name}</td><td className="px-4 py-3 text-muted">{i.ta?.name}</td>
                    <td className="px-4 py-3"><Chip tone={i.status} /></td><td className="px-4 py-3 text-muted">{fmtDateTime(i.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Async>
      {openId && <IssueDetail id={openId} onClose={() => setOpenId(null)} onChanged={() => state.reload({ silent: true })} />}
    </div>
  );
}
