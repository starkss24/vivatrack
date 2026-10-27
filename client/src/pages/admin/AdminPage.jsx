import { useState } from 'react';
import { adminApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Tabs } from '../../components/ui';
import Courses from './Courses';
import Users from './Users';
import Assignments from './Assignments';
import Pending from './Pending';
import Flags from './Flags';
import Issues from './Issues';

const TABS = [
  { id: 'courses', label: 'Courses' },
  { id: 'users', label: 'Users' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'pending', label: 'Pending report' },
  { id: 'flags', label: 'Flags' },
  { id: 'issues', label: 'Issues' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('courses');
  const courses = useAsync(() => adminApi.courses(), []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'courses' && <Courses courses={courses} />}
      {tab === 'users' && <Users />}
      {tab === 'assignments' && <Assignments courses={courses} />}
      {tab === 'pending' && <Pending courses={courses} />}
      {tab === 'flags' && <Flags courses={courses} />}
      {tab === 'issues' && <Issues />}
    </div>
  );
}
