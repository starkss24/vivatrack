import { studentApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, Card, Chip } from '../../components/ui';

const Stat = ({ label, value, sub }) => (
  <Card className="p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {sub && <p className="text-xs text-muted">{sub}</p>}
  </Card>
);

export default function Dashboard({ courseId }) {
  const state = useAsync(() => studentApi.dashboard(courseId), [courseId]);
  return (
    <Async state={state}>
      {(d) => {
        const locked = Array.from({ length: Math.max(0, d.course.totalSessions - d.course.currentSession) }, (_, i) => d.course.currentSession + i + 1);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total marks" value={`${d.totalMarks}/${d.maxPossible}`} sub="across unlocked sessions" />
              <Stat label="Attendance" value={`${d.attendancePercent}%`} />
              <Stat label="Pending vivas" value={d.pendingSessions.length} sub={d.pendingSessions.length ? `Sessions ${d.pendingSessions.join(', ')}` : 'All caught up'} />
              <Stat label="Course progress" value={`${d.course.currentSession}/${d.course.totalSessions}`} sub="sessions unlocked" />
            </div>
            {d.course.currentSession === 0 && (
              <p className="rounded-xl bg-mint-100 px-4 py-3 text-sm text-accent-dark">No sessions are unlocked yet. Vivas will appear here as the course progresses.</p>
            )}
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-4 py-3">Session</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Remarks</th></tr>
                </thead>
                <tbody>
                  {d.sessions.map((s) => (
                    <tr key={s.sessionNumber} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3 font-medium">Session {s.sessionNumber}</td>
                      <td className="px-4 py-3"><Chip tone={s.status} /></td>
                      <td className="px-4 py-3 tabular-nums">{s.marks === null ? '—' : `${s.marks}/${d.course.maxMarksPerViva}`}</td>
                      <td className="px-4 py-3 text-muted">{s.remarks || '—'}</td>
                    </tr>
                  ))}
                  {locked.map((n) => (
                    <tr key={n} className="border-b border-line/60 text-neutral-400 last:border-0">
                      <td className="px-4 py-3">Session {n}</td>
                      <td className="px-4 py-3"><Chip tone="locked">Not unlocked yet</Chip></td>
                      <td className="px-4 py-3">—</td><td className="px-4 py-3">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      }}
    </Async>
  );
}
