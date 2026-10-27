import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, taApi } from '../../api';
import { errorMessage } from '../../api/http';
import { useAsync } from '../../hooks/useAsync';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Chip } from '../../components/ui';
import ChatThread from '../../components/chat/ChatThread';
import ConversationList from '../../components/chat/ConversationList';
import FlagModal from './FlagModal';

export default function TaMessages({ course }) {
  const toast = useToast();
  const { onMessage } = useChat();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const [flagging, setFlagging] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const convs = useAsync(() => chatApi.conversations({ courseId: course._id, q: debounced || undefined }), [course._id, debounced]);
  const { setData, reload } = convs;

  // move a conversation to the top and refresh its preview when a *newer* message touches it
  const dataRef = useRef(null);
  dataRef.current = convs.data;
  const touch = useCallback((m) => {
    const list = dataRef.current?.conversations;
    if (!list) return;
    const idx = list.findIndex((c) => c.with.id === m.student && c.course.id === m.course);
    if (idx < 0) { reload({ silent: true }); return; }
    const prev = list[idx].lastMessage;
    if (prev && new Date(prev.createdAt) >= new Date(m.createdAt)) return;
    const updated = { ...list[idx], lastMessage: { body: m.body.slice(0, 120), createdAt: m.createdAt, mine: m.sender === m.ta } };
    setData({ conversations: [updated, ...list.filter((_, i) => i !== idx)] });
  }, [setData, reload]);

  useEffect(() => onMessage((m) => { if (m.course === course._id) touch(m); }), [onMessage, touch, course._id]);

  const list = convs.data ? { ...convs, data: convs.data.conversations } : convs;
  const current = convs.data?.conversations.find((c) => c.with.id === selected);

  const setFlag = (flag) => setData((d) => ({ conversations: d.conversations.map((c) => (c.with.id === selected ? { ...c, flag } : c)) }));
  const unflag = async () => {
    try { await taApi.resolveFlag(current.flag.id); setFlag(null); toast.success('Flag resolved'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Card className="grid h-[72vh] min-h-[460px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
      <div className={`${selected ? 'hidden md:block' : ''} min-h-0 border-r border-line`}>
        <ConversationList state={list} selectedId={selected} onSelect={(c) => setSelected(c.with.id)} search={search} onSearch={setSearch} />
      </div>
      <div className={`${selected ? '' : 'hidden md:grid'} min-h-0 place-items-center`}>
        {current ? (
          <ChatThread
            key={current.with.id}
            courseId={course._id}
            other={current.with}
            readOnly={current.readOnly}
            onBack={() => setSelected(null)}
            onActivity={touch}
            emptyText={`No messages yet. Say hi to ${current.with.name}.`}
            header={
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{current.with.name}{current.flag && <Chip tone="flag">Attention needed</Chip>}</p>
                  <p className="truncate text-xs text-muted">{current.with.rollNo || 'No roll no'}{current.flag ? ` · ${current.flag.reason}` : ''}</p>
                </div>
                {!current.readOnly && (current.flag
                  ? <Button variant="secondary" onClick={unflag}>Unflag</Button>
                  : <Button variant="secondary" onClick={() => setFlagging(true)}>⚑ Flag</Button>)}
              </div>
            }
          />
        ) : (
          <p className="p-8 text-center text-sm text-muted">Select a student to open the conversation.</p>
        )}
      </div>
      {flagging && current && (
        <FlagModal courseId={course._id} student={{ id: current.with.id, name: current.with.name }} onClose={() => setFlagging(false)} onDone={setFlag} />
      )}
    </Card>
  );
}
