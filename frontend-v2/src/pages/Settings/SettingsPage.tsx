import { useRef, useState } from 'react';
import { CheckCircle2, Globe2, Palette, Save, ServerCog, ShieldCheck, Sparkles, Camera, LoaderCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { getApiBase, setApiBase } from '../../config/api';
import { getStoredUser, getAvatarUrl, getInitials, updateStoredAvatar } from '../../utils/user';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBase());
  const [saved, setSaved] = useState(false);

  const [user, setUser] = useState(getStoredUser());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUrl = getAvatarUrl(user);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('nexusmind_token');

    try {
      const res = await fetch(`${getApiBase()}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload photo.');
      const data = await res.json();
      updateStoredAvatar(data.avatar_url);
      setUser(getStoredUser());
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    setApiBase(apiBaseUrl);
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 900);
  };

  const handleThemeChange = (value: string) => {
    if (value !== theme) {
      toggleTheme();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your workspace experience and integrations" />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.3)] backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Profile</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Update your photo and personal details.</p>

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-cyan-500/15 text-xl font-semibold text-cyan-300"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{getInitials(user.name)}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <LoaderCircle className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{user.email || user.username}</p>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="mt-2 text-sm font-medium text-cyan-300 hover:underline disabled:opacity-60"
                >
                  Change photo
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {avatarError && (
              <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {avatarError}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.3)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Preferences</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage the client-side experience without changing backend logic.</p>
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                Enterprise ready
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Globe2 className="h-4 w-4 text-cyan-300" />
                  API Base URL
                </div>
                <input
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="https://your-api.example.com"
                />
                <p className="text-xs text-[var(--text-tertiary)]">Saving this updates the API endpoint used across the whole app (page will reload).</p>
              </label>

              <label className="block space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Palette className="h-4 w-4 text-violet-300" />
                  Theme selector
                </div>
                <select
                  value={theme}
                  onChange={(event) => handleThemeChange(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-violet-400/50"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
                <p className="text-xs text-[var(--text-tertiary)]">Choose a visual mode for the workspace shell and cards.</p>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Local preferences</p>
                  <p className="text-sm text-[var(--text-secondary)]">Updates are stored in your browser for this workspace.</p>
                </div>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>

              {saved ? (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved. Reloading...
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.3)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <ServerCog className="h-5 w-5 text-cyan-300" />
              <h3 className="text-lg font-semibold">Workspace information</h3>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3">
                <span className="text-[var(--text-secondary)]">Workspace</span>
                <span className="font-medium text-[var(--text-primary)]">NexusMind AI</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3">
                <span className="text-[var(--text-secondary)]">Region</span>
                <span className="font-medium text-[var(--text-primary)]">US East 2</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3">
                <span className="text-[var(--text-secondary)]">Model</span>
                <span className="font-medium text-[var(--text-primary)]">GPT-style RAG Copilot</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3">
                <span className="text-[var(--text-secondary)]">State</span>
                <span className="font-medium text-emerald-300">Operational</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.3)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Sparkles className="h-5 w-5 text-violet-300" />
              <h3 className="text-lg font-semibold">About NexusMind</h3>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              NexusMind is a premium AI workspace for retrieval-augmented workflows, designed to help teams explore documents, query knowledge, and monitor response quality with confidence.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Secure by design</p>
                  <p className="text-sm text-[var(--text-secondary)]">Built for enterprise-style operational clarity.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">RAG-first experience</p>
                  <p className="text-sm text-[var(--text-secondary)]">Connects retrieval, documents, analytics, and chat in one surface.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}