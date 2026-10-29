/**
 * query-cache.ts — tiny in-memory cache for repeated Supabase reads.
 *
 * Why this exists: several screens call useFocusEffect(load) and refetch
 * everything every time a tab regains focus. Reference data (employees, shift
 * types, groups, restaurant settings) barely changes during a session, yet
 * bouncing between two tabs re-issued the same queries every time — each a
 * ~100 ms round trip to Supabase, and each one repainting a screen that was
 * already correct.
 *
 * Two behaviours, both deliberately small:
 *
 *  1. TTL cache — a hit inside `ttlMs` resolves from memory, no network.
 *  2. In-flight de-duplication — concurrent callers for the same key share ONE
 *     request. This matters on cold start, where the tab layout and the first
 *     screen commonly ask for the same list in the same tick.
 *
 * Scope is intentionally per-session and per-tab: a plain Map, no persistence.
 * Anything written by the user must call invalidate() so the next read is
 * fresh — see the mutation helpers in db.ts.
 */

import { supabase } from './supabase';

type Entry = { value: unknown; at: number };

const store = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
let generation = 0;

// Restaurant membership is not a cache identity: two accounts in the same
// restaurant may have different course assignments and permissions.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') invalidate();
});

/** Default freshness window. Short enough that stale data is never surprising. */
export const DEFAULT_TTL_MS = 60_000;

/**
 * Run `fetcher` behind the cache.
 * A fresh cached value short-circuits; concurrent callers share one request.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const startedIn = generation;
  const request = fetcher()
    .then((value) => {
      if (generation === startedIn) store.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => { if (inFlight.get(key) === request) inFlight.delete(key); });

  inFlight.set(key, request);
  return request;
}

/**
 * Drop cached entries. Pass a prefix to clear one family of keys
 * (e.g. invalidate('employees:') after editing an employee); pass nothing to
 * clear everything (e.g. on logout, so the next account starts clean).
 */
export function invalidate(prefix?: string): void {
  generation += 1;
  if (!prefix) { store.clear(); inFlight.clear(); return; }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of Array.from(inFlight.keys())) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}
