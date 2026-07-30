import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BrainCircuit,
  FileText,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NavItem } from '../../types';
import { getStoredUser, getAvatarUrl, getInitials } from '../../utils/user';

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutGrid },
  { label: 'AI Chat', href: '/chat', icon: BrainCircuit },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Retrieval', href: '/retrieval', icon: Search },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Guardrails', href: '/guardrails', icon: ShieldAlert },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavItemRow({ item }: { item: NavItem }) {
  const Icon = item.icon as LucideIcon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]',
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const avatarUrl = getAvatarUrl(user);

  const handleLogout = async () => {
    const token = localStorage.getItem('nexusmind_token');
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('nexusmind_token');
    localStorage.removeItem('nexusmind_user');
    navigate('/login');
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 hidden w-[280px] flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:flex"
      aria-label="Primary sidebar navigation"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-400/20">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">NexusMind AI</p>
          <p className="text-xs text-[var(--text-secondary)]">Enterprise Knowledge Layer</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => (
          <NavItemRow key={item.href} item={item} />
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Workspace</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Northwind AI Ops</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{user.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}