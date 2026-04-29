'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'fathom:visited';
const MAX_ENTRIES = 50;

export function VisitTracker({ rawId }: { rawId: string }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: { id: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((e) => e.id !== rawId);
      filtered.unshift({ id: rawId, ts: Date.now() });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
    } catch {
      // localStorage indisponível (private mode, quota)
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
