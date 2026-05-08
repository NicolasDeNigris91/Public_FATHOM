export type VisitorState = 'completed' | 'in_progress' | 'unlocked' | 'locked';

export interface VisitorModuleEntry {
  state: Exclude<VisitorState, 'locked' | 'unlocked'>;
  quizPassedAt?: number;
  lastVisitedAt?: number;
}

export interface VisitorProgress {
  version: 1;
  modules: Record<string, VisitorModuleEntry>;
}

export const STORAGE_KEY = 'fathom:visitor-progress:v1';

export function emptyProgress(): VisitorProgress {
  return { version: 1, modules: {} };
}

export function readProgress(): VisitorProgress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<VisitorProgress>;
    if (parsed && parsed.version === 1 && parsed.modules && typeof parsed.modules === 'object') {
      return { version: 1, modules: parsed.modules };
    }
    return emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function writeProgress(progress: VisitorProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('fathom:progress-change'));
  } catch {
    // quota exceeded, private mode, etc.
  }
}

export function markVisited(progress: VisitorProgress, rawId: string): VisitorProgress {
  const id = rawId.toLowerCase();
  const existing = progress.modules[id];
  if (existing?.state === 'completed') {
    return {
      ...progress,
      modules: {
        ...progress.modules,
        [id]: { ...existing, lastVisitedAt: Date.now() },
      },
    };
  }
  return {
    ...progress,
    modules: {
      ...progress.modules,
      [id]: {
        state: 'in_progress',
        lastVisitedAt: Date.now(),
        ...(existing?.quizPassedAt !== undefined ? { quizPassedAt: existing.quizPassedAt } : {}),
      },
    },
  };
}

export function markCompleted(progress: VisitorProgress, rawId: string): VisitorProgress {
  const id = rawId.toLowerCase();
  return {
    ...progress,
    modules: {
      ...progress.modules,
      [id]: {
        state: 'completed',
        quizPassedAt: Date.now(),
        lastVisitedAt: progress.modules[id]?.lastVisitedAt ?? Date.now(),
      },
    },
  };
}

export function resetModule(progress: VisitorProgress, rawId: string): VisitorProgress {
  const id = rawId.toLowerCase();
  const next = { ...progress.modules };
  delete next[id];
  return { ...progress, modules: next };
}

export function resetAll(): VisitorProgress {
  return emptyProgress();
}

export function findUnmetPrereqs(
  prereqs: readonly string[],
  progress: VisitorProgress,
): string[] {
  return prereqs.filter((p) => progress.modules[p.toLowerCase()]?.state !== 'completed');
}

export function deriveState(
  rawId: string,
  prereqs: readonly string[],
  progress: VisitorProgress,
): VisitorState {
  const id = rawId.toLowerCase();
  const entry = progress.modules[id];
  if (entry?.state === 'completed') return 'completed';

  const lockedByPrereq = prereqs.some((p) => {
    const dep = progress.modules[p.toLowerCase()];
    return dep?.state !== 'completed';
  });
  if (lockedByPrereq) return 'locked';

  if (entry?.state === 'in_progress') return 'in_progress';
  return 'unlocked';
}

export interface OverallProgress {
  total: number;
  completed: number;
  inProgress: number;
  percent: number;
}

export function summarize(
  modules: ReadonlyArray<{ rawId: string; prereqs: readonly string[] }>,
  progress: VisitorProgress,
): OverallProgress {
  let completed = 0;
  let inProgress = 0;
  for (const m of modules) {
    const state = deriveState(m.rawId, m.prereqs, progress);
    if (state === 'completed') completed += 1;
    else if (state === 'in_progress') inProgress += 1;
  }
  const total = modules.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, percent };
}
