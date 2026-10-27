import { useState } from 'react';
import { taApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, EmptyState, Tabs, inputCls } from '../../components/ui';
import { ChatProvider } from '../../context/ChatContext';
import Grading from './Grading';
import TaMessages from './TaMessages';

export default function TaPage() {
  const courses = useAsync(() => taApi.courses(), []);
  const [courseId, setCourseId] = useState('');
  const [tab, setTab] = useState('grading');

  return (
    <Async
      state={courses}
      isEmpty={(d) => d.courses.length === 0}
      empty={<EmptyState title="No students assigned yet" text="Management hasn't assigned any students to you. Check back later." />}
    >
      {({ courses: list }) => {
        const active = list.find((c) => c.course._id === courseId) || list[0];
        return (
          <ChatProvider>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{active.course.name}</h1>
                  <p className="text-sm text-muted">{active.course.code} · {active.studentCount} students · session {active.course.currentSession} of {active.course.totalSessions} unlocked</p>
                </div>
                {list.length > 1 && (
                  <select aria-label="Course" className={inputCls + ' !w-auto'} value={active.course._id} onChange={(e) => setCourseId(e.target.value)}>
                    {list.map((c) => <option key={c.course._id} value={c.course._id}>{c.course.name}</option>)}
                  </select>
                )}
              </div>
              <Tabs value={tab} onChange={setTab} tabs={[{ id: 'grading', label: 'Grading' }, { id: 'messages', label: 'Messages' }]} />
              {tab === 'grading' && <Grading key={active.course._id} course={active.course} />}
              {tab === 'messages' && <TaMessages key={active.course._id} course={active.course} />}
            </div>
          </ChatProvider>
        );
      }}
    </Async>
  );
}
