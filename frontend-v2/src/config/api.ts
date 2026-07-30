const STORAGE_KEY = 'nexusmind-api-base-url';
const DEFAULT_API_BASE = 'http://127.0.0.1:8000';

export function getApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
  return (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
}

export function setApiBase(url: string): void {
  window.localStorage.setItem(STORAGE_KEY, url.trim());
}

export const API_BASE_STORAGE_KEY = STORAGE_KEY;