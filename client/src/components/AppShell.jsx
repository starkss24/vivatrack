import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from './ui';

const roleLabel = { student: 'Student', ta: 'TA', admin: 'Admin' };

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-white">V</span>
            VivaTrack
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline font-medium truncate max-w-[14rem]">{user.name}</span>
            <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-medium text-accent">{roleLabel[user.role]}</span>
            <Button variant="secondary" onClick={() => logout().catch(() => toast.error('Could not log out'))}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
