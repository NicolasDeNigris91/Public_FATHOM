'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'fathom:visited';
const MAX_ENTRIES = 50;

/**
 * Records the rawId of a module visit in localStorage.
 * Persistence is single-device, single-browser; no server roundtrip.
 *
 * Used by /now or future "Recently visited" widget. Keeping it scoped
 * here lets us drop the feature without touching server code.
 */
export function VisitTracker({ rawId }: { rawId: string }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: { id: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      // Remove existing entry for this id so the new one moves to top.
      const filtered = list.filter((e) => e.id !== rawId);
      filtered.unshift({ id: rawId, ts: Date.now() });
      const truncated = filtered.slice(0, MAX_ENTRIES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
    } catch {
      // localStorage may be disabled (private browsing, quotas) — fail silent.
    }
  }, [rawId]);

  return null;
}

export function readVisitedClient(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: { id: string; ts: number }[] = JSON.parse(raw);
    return list.map((e) => e.id);
  } catch {
    return [];
  }
}
