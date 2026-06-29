import { Platform } from 'react-native';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function trackEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
}

// ── GCLID cookie helpers ─────────────────────────────────────────────────────

const GCLID_COOKIE = 'gclid';
const GCLID_DAYS   = 90;

export function saveGclidFromUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get('gclid');
  if (!gclid) return;
  const expires = new Date();
  expires.setDate(expires.getDate() + GCLID_DAYS);
  document.cookie = `${GCLID_COOKIE}=${encodeURIComponent(gclid)};domain=.shiftapp.pl;path=/;expires=${expires.toUTCString()};SameSite=Lax`;
}

export function readGclid(): string | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + GCLID_COOKIE + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
