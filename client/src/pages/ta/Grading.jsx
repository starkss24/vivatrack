import { useMemo, useState } from 'react';
import { taApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, Card, Chip, EmptyState, ProgressBar, inputCls } from '../../components/ui';
import GradingDrawer from './GradingDrawer';

export default function Grading({ course }) {
  const unlocked = Array.from({ length: course.currentSession }, (_, i) => i + 1);
  const [session, setSession] = useState(course.currentSession || null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const state = useAsync(() => taApi.students(course._id, session || undefined), [course._id, session]);

  const filtered = useMemo(() => {
    if (!state.data) return [];
    const needle = q.trim().toLowerCase();
    return state.data.students.filter((s) =>
      (filter === 'all' || s.status === filter) &&
      (!needle || s.student.name.toLowerCase().includes(needle) || (s.student.rollNo || '').toLowerCase().includes(needle)));
  }, [state.data, q, filter]);

  if (unlocked.length === 0) {
    return <EmptyState title="No sessions unlocked yet" text="Grading opens once the admin advances the course to its first session." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Session" className={inputCls + ' !w-auto'} value={session || ''} onChange={(e) => setSession(Number(e.target.value))}>
          {unlocked.map((n) => <option key={n} value={n}>Session {n}</option>)}
        </select>
        <input type="search" aria-label="Search students" placeholder="Search name or roll no" className={inputCls + ' sm:!w-64'} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by status" className={inputCls + ' !w-auto'} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option><option value="pending">Pending</option><option value="done">Done</option><option value="absent">Absent</option>
        </select>
        {state.data && <div className="sm:ml-auto"><ProgressBar done={state.data.progress.done} total={state.data.progress.total} /></div>}
      </div>

      <Async state={state} isEmpty={(d) => d.students.length === 0} empty={<EmptyState title="No students in this course" />}>
        {(d) => filtered.length === 0 ? (
          <EmptyState title="No students match" text="Try clearing the search or the status filter." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Roll no</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.student.id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-neutral-50" onClick={() => setSelected(s)}>
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">{s.student.name}{s.flag && <span title={s.flag.reason}><Chip tone="flag">⚑ Attention</Chip></span>}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{s.student.rollNo || '—'}</td>
                    <td className="px-4 py-3"><Chip tone={s.status} /></td>
                    <td className="px-4 py-3 tabular-nums">{s.record?.marks ?? '—'}{s.record?.marks != null && `/${d.course.maxMarksPerViva}`}</td>
                    <td className="px-4 py-3 text-right text-accent">{s.record ? 'Edit' : 'Grade'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Async>

      {selected && state.data && (
        <GradingDrawer
          course={state.data.course}
          session={session}
          row={state.data.students.find((s) => s.student.id === selected.student.id) || selected}
          onClose={() => setSelected(null)}
          onChanged={() => state.reload({ silent: true })}
        />
      )}
    </div>
  );
}
