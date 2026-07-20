// apps/web/app/hooks/usePlayHistory.ts
'use client';

import { useCallback, useMemo, useState } from 'react';

type Mode = 'p' | 't' | 'r';
export type PlayEntry = { trackId: string; mode: Mode; playedAt: number };

const BASE_KEY = 'listening_play_history';
const LEGACY_KEY = 'listening_play_history_session';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const hasWindow = () => typeof window !== 'undefined';

function loadAndMergeFromStorage(storageKey: string): PlayEntry[] {
  if (!hasWindow()) return [];
  const local = safeParse<PlayEntry[]>(window.localStorage.getItem(storageKey), []);
  const legacy = safeParse<PlayEntry[]>(window.sessionStorage.getItem(LEGACY_KEY), []);
  if (legacy.length === 0) return local;

  const exists = new Set(local.map(e => `${e.trackId}|${e.mode}|${e.playedAt}`));
  const add = legacy.filter(e => !exists.has(`${e.trackId}|${e.mode}|${e.playedAt}`));
  const merged = [...local, ...add].sort((a, b) => a.playedAt - b.playedAt);

  window.sessionStorage.removeItem(LEGACY_KEY);
  window.localStorage.setItem(storageKey, JSON.stringify(merged));
  return merged;
}

export function usePlayHistory(sessionId: string | undefined) {
  const storageKey = useMemo(
    () => (sessionId ? `${BASE_KEY}::${sessionId}` : BASE_KEY),
    [sessionId]
  );
  const [history, setHistory] = useState<PlayEntry[]>(() => loadAndMergeFromStorage(storageKey));

  const addPlay = useCallback((entry: Omit<PlayEntry, 'playedAt'>) => {
    if (!hasWindow()) return;
    const newEntry: PlayEntry = { ...entry, playedAt: Date.now() };
    setHistory(prev => {
      const next = [...prev, newEntry];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const getLastPlay = useCallback((trackId: string) => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].trackId === trackId) return history[i];
    }
    return undefined;
  }, [history]);

  const clearHistory = useCallback(() => {
    if (!hasWindow()) return;
    window.localStorage.removeItem(storageKey);
    setHistory([]);
  }, [storageKey]);

  const ready = true;
  return { history, addPlay, getLastPlay, clearHistory, ready };
}
