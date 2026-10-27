import { useState } from 'react';
import { taApi } from '../../api';
import { errorMessage, fieldErrors } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Chip, Field, Modal, fmtDateTime, inputCls } from '../../components/ui';
import FlagModal from './FlagModal';

const fmtVal = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function GradingDrawer({ course, session, row, onClose, onChanged }) {
  const toast = useToast();
  const rec = row.record;
  const [attendance, setAttendance] = useState(rec?.attendance || 'present');
  const [marks, setMarks] = useState(rec?.marks ?? '');
  const [remarks, setRemarks] = useState(rec?.remarks || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState({});
  const [flagging, setFlagging] = useState(false);
  const [flagBusy, setFlagBusy] = useState(false);

  const audit = useAsync(() => taApi.audit(rec.id), [rec?.id, rec?.updatedAt], { enabled: !!rec });

  const marksNum = marks === '' ? null : Number(marks);
  const clientError =
    attendance === 'present' && (marksNum === null || Number.isNaN(marksNum) ? 'Marks are required' : marksNum < 0 || marksNum > course.maxMarksPerViva ? `Marks must be between 0 and ${course.maxMarksPerViva}` : '');

  const save = async (e) => {
    e.preventDefault();
    if (clientError) { setErr({ marks: clientError }); return; }
    setBusy(true); setErr({});
    try {
      await taApi.saveRecord({
        courseId: course.id, studentId: row.student.id, sessionNumber: session, attendance,
        marks: attendance === 'present' ? marksNum : null, remarks,
      });
      toast.success(rec ? 'Record updated' : 'Record saved');
      onChanged();
      if (!rec) onClose();
    } catch (e2) {
      const f = fieldErrors(e2);
      setErr(Object.keys(f).length ? f : { form: errorMessage(e2) });
      toast.error(errorMessage(e2));
    } finally { setBusy(false); }
  };

  const unflag = async () => {
    setFlagBusy(true);
    try { await taApi.resolveFlag(row.flag.id); toast.success('Flag resolved'); onChanged(); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setFlagBusy(false); }
  };

  return (
    <Modal side title={`${row.student.name} · Session ${session}`} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm text-muted">{row.student.rollNo} · {row.student.email}</p>

        <form onSubmit={save} noValidate className="space-y-4">
          <div role="radiogroup" aria-label="Attendance" className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1 text-sm font-medium">
            {['present', 'absent'].map((a) => (
              <button type="button" key={a} role="radio" aria-checked={attendance === a} onClick={() => { setAttendance(a); setErr({}); }}
                className={`rounded-full py-1.5 capitalize transition ${attendance === a ? 'bg-white shadow-sm' : 'text-muted'}`}>{a}</button>
            ))}
          </div>
          {attendance === 'present' && (
            <Field label={`Marks (out of ${course.maxMarksPerViva})`} error={err.marks}>
              <input className={inputCls} type="number" inputMode="decimal" min={0} max={course.maxMarksPerViva} step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} />
            </Field>
          )}
          <Field label="Remarks" error={err.remarks} hint={`${remarks.length}/500`}>
            <textarea className={inputCls} rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Field>
          {err.form && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err.form}</p>}
          <Button type="submit" loading={busy} className="w-full">{rec ? 'Save changes' : 'Save record'}</Button>
        </form>

        <section className="border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold">Attention flag</h3>
          {row.flag ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm">
              <p className="text-red-800">{row.flag.reason}</p>
              <Button variant="secondary" className="mt-2" loading={flagBusy} onClick={unflag}>Resolve flag</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setFlagging(true)}>⚑ Flag student</Button>
          )}
        </section>

        {rec && (
          <section className="border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-semibold">Edit history</h3>
            <Async state={audit} isEmpty={(d) => d.audit.length === 0} empty={<p className="text-sm text-muted">No history yet.</p>}>
              {({ audit: logs }) => (
                <ul className="space-y-3">
                  {logs.map((l) => (
                    <li key={l._id} className="rounded-xl border border-line p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{l.editedBy?.name || 'Unknown'}</span>
                        <Chip tone={l.action === 'create' ? 'done' : 'info'}>{l.action === 'create' ? 'Created' : 'Updated'}</Chip>
                      </div>
                      <p className="mb-1 text-xs text-muted">{fmtDateTime(l.createdAt)}</p>
                      <ul className="space-y-0.5 text-xs">
                        {l.changes.filter((c) => l.action !== 'create' || c.newValue !== null && c.newValue !== '').map((c) => (
                          <li key={c.field}><span className="font-medium capitalize">{c.field}</span>: {l.action === 'update' && <><s className="text-muted">{fmtVal(c.oldValue)}</s> → </>}{fmtVal(c.newValue)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </section>
        )}
      </div>
      {flagging && <FlagModal courseId={course.id} student={row.student} onClose={() => setFlagging(false)} onDone={() => onChanged()} />}
    </Modal>
  );
}
