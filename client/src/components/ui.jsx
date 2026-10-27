import { useEffect } from 'react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Spinner({ className = '' }) {
  return <span role="status" aria-label="Loading" className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent', className)} />;
}

export const Skeleton = ({ className = '' }) => <div className={cx('animate-pulse rounded-lg bg-mint-100', className)} />;

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

export function Card({ className = '', children, ...rest }) {
  return <div className={cx('rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)} {...rest}>{children}</div>;
}

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-dark',
    secondary: 'bg-white text-ink border border-line hover:bg-neutral-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-accent hover:bg-mint-50',
  }[variant];
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed', styles, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
      {children}
    </button>
  );
}

const chipTone = {
  done: 'bg-mint-100 text-accent-dark',
  absent: 'bg-amber-50 text-amber-700',
  pending: 'bg-neutral-100 text-neutral-600',
  locked: 'bg-neutral-100 text-neutral-400',
  open: 'bg-mint-100 text-accent-dark',
  under_review: 'bg-amber-50 text-amber-700',
  resolved: 'bg-mint-100 text-accent-dark',
  flag: 'bg-red-50 text-red-700',
  info: 'bg-mint-100 text-accent-dark',
};
const chipLabel = { under_review: 'Under review' };
export function Chip({ tone = 'pending', children }) {
  const text = children ?? chipLabel[tone] ?? tone.replace('_', ' ');
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', chipTone[tone])}>{text}</span>;
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-neutral-50';

export function EmptyState({ title, text, action }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-6 py-8 text-center">
      <p className="font-medium text-red-700">Couldn't load this</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}

// Renders loading / error / empty / success for a useAsync() result.
export function Async({ state, isEmpty, empty, skeleton, children }) {
  if (state.loading && !state.data) return skeleton || <SkeletonRows />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (state.data && isEmpty?.(state.data)) return empty;
  if (!state.data) return null;
  return children(state.data);
}

export function Modal({ title, onClose, children, wide, side }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={cx('fixed inset-0 z-50 flex bg-black/30', side ? 'justify-end' : 'items-center justify-center p-4')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('bg-white shadow-2xl overflow-y-auto', side ? 'h-full w-full max-w-md' : cx('w-full rounded-2xl max-h-[90vh]', wide ? 'max-w-2xl' : 'max-w-md'))}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted hover:bg-neutral-100">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-mint-100 p-1 w-fit max-w-full" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition', value === t.id ? 'bg-white shadow-sm' : 'text-muted hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3" aria-label={`${done} of ${total} done`}>
      <div className="h-2 w-40 overflow-hidden rounded-full bg-mint-100"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
      <span className="text-sm text-muted tabular-nums">{done}/{total}</span>
    </div>
  );
}

export const fmtDateTime = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
