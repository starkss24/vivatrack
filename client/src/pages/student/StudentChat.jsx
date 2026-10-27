import { useState } from 'react';
import { chatApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Async, Card, EmptyState, inputCls } from '../../components/ui';
import ChatThread from '../../components/chat/ChatThread';

export default function StudentChat({ courseId }) {
  const state = useAsync(() => chatApi.conversations({ courseId }), [courseId]);
  const [pick, setPick] = useState('');

  return (
    <Async state={state} isEmpty={(d) => d.conversations.length === 0} empty={<EmptyState title="No TA assigned" text="You can chat once you've been assigned a TA for this course." />}>
      {({ conversations }) => {
        const conv = conversations.find((c) => c.with.id === pick) || conversations.find((c) => !c.readOnly) || conversations[0];
        return (
          <Card className="h-[70vh] min-h-[420px] overflow-hidden">
            <ChatThread
              key={conv.with.id}
              courseId={courseId}
              other={conv.with}
              readOnly={conv.readOnly}
              emptyText="No messages yet, say hi to your TA 👋"
              header={
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{conv.with.name}</p>
                    <p className="text-xs text-muted">{conv.readOnly ? 'Previous TA (read only)' : 'Your TA'}</p>
                  </div>
                  {conversations.length > 1 && (
                    <select aria-label="Conversation" className={inputCls + ' !w-auto'} value={conv.with.id} onChange={(e) => setPick(e.target.value)}>
                      {conversations.map((c) => <option key={c.with.id} value={c.with.id}>{c.with.name}{c.readOnly ? ' (archived)' : ''}</option>)}
                    </select>
                  )}
                </div>
              }
            />
          </Card>
        );
      }}
    </Async>
  );
}
