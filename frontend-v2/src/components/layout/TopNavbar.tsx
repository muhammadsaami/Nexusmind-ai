import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MoonStar, Sun, Search, FileText, LayoutGrid, MessageSquare, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getApiBase } from '../../config/api';
import { getStoredUser, getAvatarUrl, getInitials } from '../../utils/user';

const API_BASE = getApiBase();

type PageResult = { kind: 'page'; label: string; href: string };
type DocResult = { kind: 'document'; label: string; href: string };
type SearchResult = PageResult | DocResult;

type NotificationItem = {
  id: string;
  icon: 'chat' | 'guard';
  title: string;
  subtitle: string;
  href: string;
};

const pages: PageResult[] = [
  { kind: 'page', label: 'Dashboard', href: '/' },
  { kind: 'page', label: 'AI Chat', href: '/chat' },
  { kind: 'page', label: 'Documents', href: '/documents' },
  { kind: 'page', label: 'Retrieval', href: '/retrieval' },
  { kind: 'page', label: 'Analytics', href: '/analytics' },
  { kind: 'page', label: 'Guardrails', href: '/guardrails' },
  { kind: 'page', label: 'Settings', href: '/settings' },
];

export default function TopNavbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [documents, setDocuments] = useState<DocResult[]>([]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [seenCount, setSeenCount] = useState(0);

  const user = getStoredUser();
  const avatarUrl = getAvatarUrl(user);

  useEffect(() => {
    fetch(`${API_BASE}/documents`)
      .then((res) => res.json())
      .then((data: Array<{ name: string; id: number }>) => {
        setDocuments(data.map((doc) => ({ kind: 'document', label: doc.name, href: '/documents' })));
      })
      .catch(() => setDocuments([]));
  }, []);

  useEffect(() => {
    const fetchNotifications = () => {
      Promise.all([
        fetch(`${API_BASE}/retrieval/history`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/guardrails/logs`).then((r) => r.json()).catch(() => []),
      ]).then(([history, guardrails]) => {
        const chatItems: NotificationItem[] = (history ?? []).slice(0, 5).map((h: any, i: number) => ({
          id: `chat-${i}-${h.question}`,
          icon: 'chat',
          title: 'New question answered',
          subtitle: h.question,
          href: '/chat',
        }));
        const guardItems: NotificationItem[] = (guardrails ?? []).slice(-5).reverse().map((g: any, i: number) => ({
          id: `guard-${i}-${g.timestamp}`,
          icon: 'guard',
          title: 'PII masking event logged',
          subtitle: g.question,
          href: '/guardrails',
        }));
        setNotifications([...chatItems, ...guardItems].slice(0, 8));
      });
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const term = query.trim().toLowerCase();
  const results: SearchResult[] = term
    ? [
        ...pages.filter((p) => p.label.toLowerCase().includes(term)),
        ...documents.filter((d) => d.label.toLowerCase().includes(term)),
      ].slice(0, 8)
    : [];

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setQuery('');
    setIsSearchOpen(false);
  };

  const unreadCount = Math.max(0, notifications.length - seenCount);

  const handleBellClick = () => {
    setIsNotifOpen((prev) => !prev);
    if (!isNotifOpen) setSeenCount(notifications.length);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 backdrop-blur-xl lg:left-[280px] lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Workspace overview</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">NexusMind Control Center</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div ref={searchRef} className="relative hidden md:block">
            <label className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-40 bg-transparent outline-none placeholder:text-[var(--text-tertiary)] lg:w-56"
                placeholder="Search workspace"
                aria-label="Search workspace"
              />
            </label>

            {isSearchOpen && term && (
              <div className="absolute left-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] shadow-[0_20px_60px_rgba(2,6,23,0.3)]">
                {results.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">No matches found.</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto py-2">
                    {results.map((result, i) => (
                      <li key={`${result.kind}-${result.label}-${i}`}>
                        <button
                          onClick={() => handleSelect(result)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-soft)]"
                        >
                          {result.kind === 'page' ? (
                            <LayoutGrid className="h-4 w-4 shrink-0 text-cyan-300" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-violet-300" />
                          )}
                          <span className="truncate">{result.label}</span>
                          <span className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)]">
                            {result.kind === 'page' ? 'Page' : 'Document'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div ref={notifRef} className="relative">
            <button
              onClick={handleBellClick}
              className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] shadow-[0_20px_60px_rgba(2,6,23,0.3)]">
                <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">No notifications yet.</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-2">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => { navigate(n.href); setIsNotifOpen(false); }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--bg-soft)]"
                        >
                          {n.icon === 'chat' ? (
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                          ) : (
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                            <p className="truncate text-xs text-[var(--text-secondary)]">{n.subtitle}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)]"
            aria-label="Theme toggle"
          >
            {theme === 'dark' ? <MoonStar className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}