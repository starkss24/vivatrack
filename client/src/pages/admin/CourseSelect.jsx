import { useEffect, useState } from 'react';
import { Async, EmptyState, inputCls } from '../../components/ui';

// Wraps a section that needs a selected course. `courses` is a useAsync() state.
export default function CourseSelect({ courses, children, allowAll }) {
  const [id, setId] = useState('');
  const list = courses.data?.courses || [];
  useEffect(() => { if (!allowAll && !id && list.length) setId(list[0]._id); }, [list, id, allowAll]);

  return (
    <Async state={courses} isEmpty={(d) => d.courses.length === 0} empty={<EmptyState title="No courses yet" text="Create a course on the Courses tab first." />}>
      {() => (
        <div className="space-y-4">
          <select aria-label="Course" className={inputCls + ' !w-auto'} value={id} onChange={(e) => setId(e.target.value)}>
            {allowAll && <option value="">All courses</option>}
            {list.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
          </select>
          {(id || allowAll) && children(id, list.find((c) => c._id === id))}
        </div>
      )}
    </Async>
  );
}
