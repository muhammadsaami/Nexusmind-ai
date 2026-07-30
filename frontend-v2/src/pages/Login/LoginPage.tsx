import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, User } from 'lucide-react';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
    const body =
      mode === 'login'
        ? { email, password }
        : { email, password, name };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || (mode === 'login' ? 'Invalid email or password' : 'Could not create account'));
      }

      const data = await res.json();
      localStorage.setItem('nexusmind_token', data.token);
      localStorage.setItem('nexusmind_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-slate-900/70 p-8 shadow-[0_20px_80px_rgba(2,6,23,0.5)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-semibold">N</div>
          <div>
            <h1 className="text-lg font-semibold text-white">NexusMind AI</h1>
            <p className="text-xs text-slate-400">Enterprise Knowledge Layer</p>
          </div>
        </div>

        <div className="mb-6 flex rounded-xl border border-white/10 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Full name</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
                <User className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Email</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Password</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
              <LockKeyhole className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="mt-1.5 text-xs text-slate-500">At least 6 characters.</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500/90 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>
      </div>
    </div>
  );
}