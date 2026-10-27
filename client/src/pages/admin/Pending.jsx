import { adminApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, Card, Chip, EmptyState } from '../../components/ui';
import CourseSelect from './CourseSelect';

function Section({ courseId }) {
  const state = useAsync(() => adminApi.pending(courseId), [courseId]);
  return (
    <Async state={state} isEmpty={(d) => d.tas.length === 0} empty={<EmptyState title="No assignments yet" text="Assign students to TAs to see the pending report." />}>
      {(d) => (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {d.totalPending === 0 ? 'Every unlocked viva has been recorded. 🎉' : `${d.totalPending} viva${d.totalPending === 1 ? '' : 's'} pending across sessions 1–${d.course.currentSession}.`}
          </p>
          {d.tas.map((g) => (
            <Card key={g.ta.id}>
              <details open={g.pendingCount > 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
                  <span className="font-semibold">{g.ta.name}</span>
                  <Chip tone={g.pendingCount ? 'pending' : 'done'}>{g.pendingCount ? `${g.pendingCount} pending` : 'All done'}</Chip>
                </summary>
                <ul className="divide-y divide-line/60 border-t border-line">
                  {g.students.map((s) => (
                    <li key={s.student.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span><span className="font-medium">{s.student.name}</span> <span className="text-muted">{s.student.rollNo}</span></span>
                      {s.pendingSessions.length ? <span className="flex gap-1">{s.pendingSessions.map((n) => <Chip key={n} tone="pending">S{n}</Chip>)}</span> : <Chip tone="done">Complete</Chip>}
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          ))}
        </div>
      )}
    </Async>
  );
}

export default function Pending({ courses }) {
  return <CourseSelect courses={courses}>{(id) => <Section key={id} courseId={id} />}</CourseSelect>;
}
