import { useState } from 'react';
import { studentApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, EmptyState, Tabs, inputCls } from '../../components/ui';
import { ChatProvider } from '../../context/ChatContext';
import Dashboard from './Dashboard';
import StudentChat from './StudentChat';
import Issues from './Issues';

export default function StudentPage() {
  const courses = useAsync(() => studentApi.courses(), []);
  const [courseId, setCourseId] = useState('');
  const [tab, setTab] = useState('dashboard');

  return (
    <Async
      state={courses}
      isEmpty={(d) => d.courses.length === 0}
      empty={<EmptyState title="You're not enrolled in any course yet" text="Once management assigns you a TA for a course, it will show up here." />}
    >
      {({ courses: list }) => {
        const active = list.find((c) => c.course._id === courseId) || list[0];
        return (
          <ChatProvider>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{active.course.name}</h1>
                  <p className="text-sm text-muted">{active.course.code} · TA: {active.ta?.name || '—'}</p>
                </div>
                {list.length > 1 && (
                  <select aria-label="Course" className={inputCls + ' !w-auto'} value={active.course._id} onChange={(e) => setCourseId(e.target.value)}>
                    {list.map((c) => <option key={c.course._id} value={c.course._id}>{c.course.name}</option>)}
                  </select>
                )}
              </div>
              <Tabs value={tab} onChange={setTab} tabs={[{ id: 'dashboard', label: 'Dashboard' }, { id: 'chat', label: 'Chat' }, { id: 'issues', label: 'Raise an issue' }]} />
              {tab === 'dashboard' && <Dashboard key={active.course._id} courseId={active.course._id} />}
              {tab === 'chat' && <StudentChat key={active.course._id} courseId={active.course._id} />}
              {tab === 'issues' && <Issues key={active.course._id} courseId={active.course._id} />}
            </div>
          </ChatProvider>
        );
      }}
    </Async>
  );
}
