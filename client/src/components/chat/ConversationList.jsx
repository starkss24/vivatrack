import { listTime } from '../../utils/chat';
import { Chip, EmptyState, ErrorState, SkeletonRows } from '../ui';

export default function ConversationList({ state, selectedId, onSelect, search, onSearch }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-3">
        <input
          type="search"
          aria-label="Search students"
          placeholder="Search by name or roll no"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-full border border-line bg-neutral-50 px-4 py-2 text-sm outline-none focus:border-accent focus:bg-white"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.loading && !state.data ? (
          <div className="p-3"><SkeletonRows rows={5} /></div>
        ) : state.error ? (
          <div className="p-3"><ErrorState message={state.error} onRetry={state.reload} /></div>
        ) : state.data.length === 0 ? (
          <div className="p-3">
            <EmptyState title={search ? 'No matches' : 'No mentees yet'} text={search ? 'Try a different name or roll number.' : 'Students assigned to you will appear here.'} />
          </div>
        ) : (
          <ul>
            {state.data.map((c) => (
              <li key={c.with.id + c.course.id}>
                <button
                  onClick={() => onSelect(c)}
                  className={`flex w-full flex-col gap-0.5 border-b border-line/60 px-4 py-3 text-left transition hover:bg-neutral-50 ${selectedId === c.with.id ? 'bg-mint-100/60' : ''}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span className="truncate">{c.with.name}</span>
                      {c.flag && <span title={c.flag.reason}><Chip tone="flag">Attention</Chip></span>}
                      {c.readOnly && <Chip tone="pending">Archived</Chip>}
                    </span>
                    {c.lastMessage && <span className="shrink-0 text-xs text-muted">{listTime(c.lastMessage.createdAt)}</span>}
                  </span>
                  <span className="truncate text-sm text-muted">
                    {c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.body}` : <em>{c.with.rollNo || 'No messages yet'}</em>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
