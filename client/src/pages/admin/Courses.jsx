import { useState } from 'react';
import { adminApi } from '../../api';
import { errorMessage, fieldErrors } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { Async, Button, Card, EmptyState, Field, ProgressBar, inputCls } from '../../components/ui';
import { downloadGrades } from './download';

function CourseCard({ course, onChanged }) {
  const toast = useToast();
  const [manual, setManual] = useState(String(course.currentSession));
  const [busy, setBusy] = useState('');

  const setSession = async (value, label) => {
    setBusy(label);
    try {
      const { course: c } = await adminApi.updateCourse(course._id, { currentSession: value });
      toast.success(`${c.name} is now at session ${c.currentSession}`);
      setManual(String(c.currentSession));
      onChanged();
    } catch (e) { toast.error(errorMessage(e)); setManual(String(course.currentSession)); }
    finally { setBusy(''); }
  };

  const exportCsv = async () => {
    setBusy('export');
    try { await downloadGrades(course); toast.success('Grades exported'); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(''); }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{course.name}</h3>
          <p className="text-xs text-muted">{course.code} · {course.totalSessions} sessions · max {course.maxMarksPerViva} marks per viva</p>
        </div>
        <Button variant="secondary" loading={busy === 'export'} onClick={exportCsv}>Export grades CSV</Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="mb-1 text-xs text-muted">Current session</p>
          <ProgressBar done={course.currentSession} total={course.totalSessions} />
        </div>
        <Button loading={busy === 'advance'} disabled={course.currentSession >= course.totalSessions} onClick={() => setSession(course.currentSession + 1, 'advance')}>
          Advance session
        </Button>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); setSession(Number(manual), 'set'); }}>
          <input aria-label="Set session" type="number" min={0} max={course.totalSessions} value={manual} onChange={(e) => setManual(e.target.value)} className={inputCls + ' !w-20'} />
          <Button type="submit" variant="secondary" loading={busy === 'set'} disabled={manual === '' || Number(manual) === course.currentSession}>Set</Button>
        </form>
      </div>
    </Card>
  );
}

export default function Courses({ courses }) {
  const toast = useToast();
  const empty = { name: '', code: '', totalSessions: 6, maxMarksPerViva: 10 };
  const [form, setForm] = useState(empty);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setFields({});
    try {
      await adminApi.createCourse({ ...form, totalSessions: Number(form.totalSessions), maxMarksPerViva: Number(form.maxMarksPerViva) });
      toast.success('Course created');
      setForm(empty);
      courses.reload({ silent: true });
    } catch (err) { setFields(fieldErrors(err)); toast.error(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="self-start p-5">
        <h2 className="mb-4 font-semibold">New course</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Name" error={fields.name}><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
          <Field label="Code" error={fields.code}><input className={inputCls} value={form.code} onChange={set('code')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total sessions" error={fields.totalSessions}><input className={inputCls} type="number" min={1} value={form.totalSessions} onChange={set('totalSessions')} required /></Field>
            <Field label="Max marks / viva" error={fields.maxMarksPerViva}><input className={inputCls} type="number" min={0} value={form.maxMarksPerViva} onChange={set('maxMarksPerViva')} required /></Field>
          </div>
          <Button type="submit" loading={busy} className="w-full">Create course</Button>
        </form>
      </Card>
      <div className="space-y-3 lg:col-span-2">
        <Async state={courses} isEmpty={(d) => d.courses.length === 0} empty={<EmptyState title="No courses yet" text="Create your first course using the form." />}>
          {({ courses: list }) => list.map((c) => <CourseCard key={c._id} course={c} onChanged={() => courses.reload({ silent: true })} />)}
        </Async>
      </div>
    </div>
  );
}
