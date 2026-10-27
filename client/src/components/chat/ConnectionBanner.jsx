import { useChat } from '../../context/ChatContext';

export default function ConnectionBanner() {
  const { status, online } = useChat();
  if (!online) return <div role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">You're offline. Messages will send once you're back online.</div>;
  if (status === 'connected') return null;
  return (
    <div role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
      {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'} You can still send messages.
    </div>
  );
}
