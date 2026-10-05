import type { Actor } from '../booking';
export function entryDestination(actor: Actor | null) {
  return actor?.role === 'owner' || actor?.role === 'operator' || actor?.role === 'staff' ? '/studio' : '/home';
}
export function safeDestination(value?: string | null) {
  if (!value || !/^\/(?!\/)/.test(value) || /[\\\u0000-\u0020]/.test(value)) return '/enter';
  try { if (new URL(value, 'https://reserve.invalid').origin !== 'https://reserve.invalid') return '/enter'; } catch { return '/enter'; }
  return value;
}
