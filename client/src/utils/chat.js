// Chat list helpers. A message is identified by `clientMessageId` (known immediately, even
// for optimistic messages) and, once saved, by `_id`. Both are used to dedupe.

export const newClientId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`);

const isPending = (m) => m.status === 'sending' || m.status === 'failed';

// confirmed messages sorted by server time, then unsent/failed ones in the order they were typed
export function normalize(list) {
  const confirmed = list.filter((m) => !isPending(m)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || (a._id < b._id ? -1 : 1));
  return [...confirmed, ...list.filter(isPending)];
}

export function mergeIncoming(list, msg) {
  const saved = { ...msg, status: 'sent' };
  const i = list.findIndex((m) => m.clientMessageId === msg.clientMessageId || (m._id && m._id === msg._id));
  if (i >= 0) {
    const copy = list.slice();
    copy[i] = saved;
    return normalize(copy);
  }
  return normalize([...list, saved]);
}

export function mergeMany(list, msgs) {
  return msgs.reduce((acc, m) => mergeIncoming(acc, m), list);
}

export const lastConfirmed = (list) => [...list].reverse().find((m) => !isPending(m));

export function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export const timeLabel = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function listTime(date) {
  const d = new Date(date);
  return d.toDateString() === new Date().toDateString() ? timeLabel(d) : dayLabel(d) === 'Yesterday' ? 'Yesterday' : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
