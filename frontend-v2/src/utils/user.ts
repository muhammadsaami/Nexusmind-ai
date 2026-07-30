import { getApiBase } from '../config/api';

export type StoredUser = {
  id?: string;
  name: string;
  email?: string;
  username?: string;
  role: string;
  avatar_url?: string | null;
};

export function getStoredUser(): StoredUser {
  const raw = localStorage.getItem('nexusmind_user');
  const parsed = raw ? JSON.parse(raw) : null;
  return {
    id: parsed?.id,
    name: parsed?.name || parsed?.username || 'Guest',
    email: parsed?.email,
    username: parsed?.username,
    role: parsed?.role || 'Viewer',
    avatar_url: parsed?.avatar_url || null,
  };
}

export function getAvatarUrl(user: StoredUser): string | null {
  if (!user.avatar_url) return null;
  return `${getApiBase()}${user.avatar_url}`;
}

export function updateStoredAvatar(avatarUrl: string): void {
  const raw = localStorage.getItem('nexusmind_user');
  const parsed = raw ? JSON.parse(raw) : {};
  parsed.avatar_url = avatarUrl;
  localStorage.setItem('nexusmind_user', JSON.stringify(parsed));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}