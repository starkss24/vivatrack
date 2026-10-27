import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { chatApi } from '../../api';
import { errorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Button, ErrorState, Skeleton } from '../ui';
import Composer from './Composer';
import ConnectionBanner from './ConnectionBanner';
import { dayLabel, lastConfirmed, mergeIncoming, mergeMany, newClientId, normalize, timeLabel } from '../../utils/chat';

// A conversation is (course, me, other). `other` = { id, name }. Messages render as plain text
// (React escapes everything, newlines preserved by CSS) — never as HTML.
export default function ChatThread({ courseId, other, readOnly, header, onBack, onActivity, emptyText }) {
  const { user } = useAuth();
  const { onMessage, onConnect } = useChat();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scroller = useRef(null);
  const stick = useRef(true);
  const prependFrom = useRef(null);
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await chatApi.messages({ courseId, withUserId: other.id, limit: 30 });
      stick.current = true;
      setMessages(normalize(d.messages.map((m) => ({ ...m, status: 'sent' }))));
      setHasMore(d.hasMore);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [courseId, other.id]);

  useEffect(() => { setMessages([]); load(); }, [load]);

  // live messages for this conversation
  useEffect(() => onMessage((m) => {
    if (m.course === courseId && (m.student === other.id || m.ta === other.id)) {
      setMessages((l) => mergeIncoming(l, m));
    }
  }), [onMessage, courseId, other.id]);

  // catch-up after any (re)connect: fetch only what is newer than the last confirmed message
  useEffect(() => onConnect(async () => {
    const last = lastConfirmed(messagesRef.current);
    if (loading || error) return;
    try {
      const d = await chatApi.messages({ courseId, withUserId: other.id, ...(last ? { after: last.createdAt } : { limit: 30 }) });
      if (d.messages.length) setMessages((l) => mergeMany(l, d.messages));
    } catch { /* the next reconnect or reload will retry */ }
  }), [onConnect, courseId, other.id, loading, error]);

  // back online -> also try failed sends? No: the user retries explicitly; just re-sync history.
  const { online } = useChat();
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current && !loading) {
      const last = lastConfirmed(messagesRef.current);
      chatApi.messages({ courseId, withUserId: other.id, ...(last ? { after: last.createdAt } : {}) })
        .then((d) => d.messages.length && setMessages((l) => mergeMany(l, d.messages))).catch(() => {});
    }
    wasOnline.current = online;
  }, [online, loading, courseId, other.id]);

  // keep the conversation list (TA inbox) in sync
  const lastSeen = useRef(null);
  useEffect(() => {
    const last = lastConfirmed(messages);
    if (last && last._id !== lastSeen.current) { lastSeen.current = last._id; onActivity?.(last); }
  }, [messages, onActivity]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prependFrom.current !== null) {
      el.scrollTop = el.scrollHeight - prependFrom.current;
      prependFrom.current = null;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const first = messages.find((m) => m._id);
    if (!first) return;
    setLoadingOlder(true);
    try {
      const d = await chatApi.messages({ courseId, withUserId: other.id, before: first._id, limit: 30 });
      prependFrom.current = scroller.current.scrollHeight - scroller.current.scrollTop;
      setMessages((l) => mergeMany(l, d.messages));
      setHasMore(d.hasMore);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoadingOlder(false); }
  };

  // Optimistic send. Retrying reuses the same clientMessageId, so the server can never store it twice.
  const send = useCallback(async (body, clientMessageId = newClientId()) => {
    stick.current = true;
    setMessages((l) => {
      const exists = l.some((m) => m.clientMessageId === clientMessageId);
      const optimistic = { clientMessageId, body, sender: user.id, createdAt: new Date().toISOString(), status: 'sending' };
      return exists ? l.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: 'sending' } : m)) : [...l, optimistic];
    });
    try {
      const d = await chatApi.send({ courseId, toUserId: other.id, body, clientMessageId });
      setMessages((l) => mergeIncoming(l, d.message));
    } catch (e) {
      setMessages((l) => l.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: 'failed', failReason: errorMessage(e) } : m)));
    }
  }, [courseId, other.id, user.id]);

  let prevDay = null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header && (
        <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
          {onBack && <button onClick={onBack} className="md:hidden rounded-full px-2 py-1 text-accent" aria-label="Back to conversations">‹ Back</button>}
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      )}
      <div className="px-3 pt-2"><ConnectionBanner /></div>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-10 w-3/5" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            {hasMore && (
              <div className="mb-3 text-center">
                <Button variant="ghost" loading={loadingOlder} onClick={loadOlder}>Load older messages</Button>
              </div>
            )}
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">{emptyText || 'No messages yet, say hi!'}</p>
            )}
            {messages.map((m) => {
              const day = dayLabel(m.createdAt);
              const showDay = day !== prevDay;
              prevDay = day;
              const mine = m.sender === user.id;
              return (
                <div key={m.clientMessageId}>
                  {showDay && <div className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted">{day}</div>}
                  <div className={`mb-1.5 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <div className={`msg-body rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-accent text-white' : 'bg-mint-50 text-ink border border-line'} ${m.status === 'sending' ? 'opacity-60' : ''} ${m.status === 'failed' ? 'border border-red-300 bg-red-50 text-red-800' : ''}`}>
                        {m.body}
                      </div>
                      <div className={`mt-0.5 px-1 text-[11px] text-muted ${mine ? 'text-right' : ''}`}>
                        {m.status === 'sending' && 'Sending…'}
                        {m.status === 'failed' && (
                          <button className="font-medium text-red-600 hover:underline" onClick={() => send(m.body, m.clientMessageId)}>
                            Failed, tap to retry
                          </button>
                        )}
                        {m.status === 'sent' && timeLabel(m.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      {readOnly ? (
        <p className="border-t border-line bg-neutral-50 px-4 py-3 text-center text-xs text-muted">This conversation is archived because the assignment changed. You can read it but not reply.</p>
      ) : (
        <Composer onSend={(t) => send(t)} disabled={loading || !!error} />
      )}
    </div>
  );
}
