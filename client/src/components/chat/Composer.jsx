import { useState } from 'react';
import { Button } from '../ui';

const MAX = 1000;

export default function Composer({ onSend, disabled, placeholder = 'Write a message…' }) {
  const [text, setText] = useState('');
  const empty = text.trim().length === 0;

  const submit = () => {
    if (empty || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="border-t border-line bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Message"
          value={text}
          maxLength={MAX}
          rows={Math.min(5, Math.max(1, text.split('\n').length))}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-2xl border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-neutral-50"
        />
        <Button onClick={submit} disabled={empty || disabled}>Send</Button>
      </div>
      <div className="mt-1 flex justify-between px-1 text-[11px] text-muted">
        <span>Enter to send · Shift+Enter for a new line</span>
        <span className={text.length >= MAX ? 'text-red-600' : ''}>{text.length}/{MAX}</span>
      </div>
    </div>
  );
}
