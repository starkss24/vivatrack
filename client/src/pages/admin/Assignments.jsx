import { useRef, useState } from 'react';
import { adminApi } from '../../api';
import { errorMessage } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, EmptyState, inputCls } from '../../components/ui';
import CourseSelect from './CourseSelect';

function Section({ courseId }) {
  const toast = useToast();
  const list = useAsync(() => adminApi.assignments(courseId), [courseId]);
  const tas = useAsync(() => adminApi.users('ta'), []);
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState('');

  const upload = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await adminApi.importAssignments(courseId, file);
      setResult(r);
      toast.success(`${r.created} created, ${r.skipped} skipped, ${r.errors.length} errors`);
      setFile(null); if (fileRef.current) fileRef.current.value = '';
      list.reload({ silent: true });
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const reassign = async (a, taId) => {
    setSaving(a._id);
    try { await adminApi.reassign(a._id, taId); toast.success('Reassigned'); list.reload({ silent: true }); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(''); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold">Import assignments (CSV)</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Columns: <code className="rounded bg-neutral-100 px-1">student_email,ta_email</code> · max 1 MB. Bad rows are reported, never block the rest.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={(e) => setFile(e.target.files[0] || null)} className="text-sm" />
          <Button onClick={upload} loading={busy} disabled={!file}>Upload & assign</Button>
        </div>
        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 text-sm">
              <span className="rounded-full bg-mint-100 px-3 py-1 text-accent-dark">{result.created} created</span>
              <span className="rounded-full bg-neutral-100 px-3 py-1">{result.skipped} skipped</span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{result.errors.length} errors</span>
            </div>
            {result.errors.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1 pr-4">Row</th><th className="py-1">Reason</th></tr></thead>
                <tbody>{result.errors.map((e) => <tr key={e.row} className="border-t border-line/60"><td className="py-1.5 pr-4 tabular-nums">{e.row}</td><td className="py-1.5">{e.reason}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <Async state={list} isEmpty={(d) => d.assignments.length === 0} empty={<EmptyState title="No assignments for this course" text="Upload a CSV above to assign students to TAs." />}>
        {({ assignments }) => (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Roll no</th><th className="px-4 py-3">TA</th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a._id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{a.student?.name}</td>
                    <td className="px-4 py-3 text-muted">{a.student?.rollNo || '—'}</td>
                    <td className="px-4 py-3">
                      <select aria-label={`TA for ${a.student?.name}`} className={inputCls + ' !w-auto'} value={a.ta?._id} disabled={saving === a._id || !tas.data} onChange={(e) => reassign(a, e.target.value)}>
                        {(tas.data?.users || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
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

export default function Assignments({ courses }) {
  return <CourseSelect courses={courses}>{(id) => <Section key={id} courseId={id} />}</CourseSelect>;
}
