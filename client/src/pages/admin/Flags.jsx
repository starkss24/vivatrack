import { useState } from 'react';
import { adminApi } from '../../api';
import { errorMessage } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, EmptyState, fmtDateTime, inputCls } from '../../components/ui';
import CourseSelect from './CourseSelect';

function Section({ courseId }) {
  const toast = useToast();
  const [active, setActive] = useState('true');
  const state = useAsync(() => adminApi.flags({ courseId: courseId || undefined, active: active === 'all' ? undefined : active }), [courseId, active]);
  const [busy, setBusy] = useState('');

  const resolve = async (id) => {
    setBusy(id);
    try { await adminApi.resolveFlag(id); toast.success('Flag resolved'); state.reload({ silent: true }); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <select aria-label="Flag state" className={inputCls + ' !w-auto'} value={active} onChange={(e) => setActive(e.target.value)}>
        <option value="true">Active</option><option value="false">Resolved</option><option value="all">All</option>
      </select>
      <Async state={state} isEmpty={(d) => d.flags.length === 0} empty={<EmptyState title="No flags" text="Flagged students will show up here." />}>
        {({ flags }) => (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Flagged by</th><th className="px-4 py-3" /></tr></thead>
              <tbody>
                {flags.map((f) => (
                  <tr key={f._id} className="border-b border-line/60 align-top last:border-0">
                    <td className="px-4 py-3 font-medium">{f.student?.name}<div className="text-xs font-normal text-muted">{f.student?.rollNo}</div></td>
                    <td className="px-4 py-3 text-muted">{f.course?.code}</td>
                    <td className="px-4 py-3">{f.reason}</td>
                    <td className="px-4 py-3 text-muted">{f.flaggedBy?.name}<div className="text-xs">{fmtDateTime(f.createdAt)}</div></td>
                    <td className="px-4 py-3 text-right">
                      {f.isActive ? <Button variant="secondary" loading={busy === f._id} onClick={() => resolve(f._id)}>Resolve</Button> : <span className="text-xs text-muted">Resolved {f.resolvedAt && fmtDateTime(f.resolvedAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Async>
    </div>
  );
}

export default function Flags({ courses }) {
  return <CourseSelect courses={courses} allowAll>{(id) => <Section key={id} courseId={id} />}</CourseSelect>;
}
