import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  deriveState,
  emptyProgress,
  markCompleted,
  markVisited,
  findUnmetPrereqs,
  readProgress,
  resetAll,
  resetModule,
  summarize,
  writeProgress,
} from './visitor-progress';

function memoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  } as Storage;
}

describe('visitor-progress: derivation', () => {
  it('a module with no prereqs is unlocked when never touched', () => {
    expect(deriveState('01-01', [], emptyProgress())).toBe('unlocked');
  });

  it('a module with unmet prereqs is locked', () => {
    expect(deriveState('01-02', ['01-01'], emptyProgress())).toBe('locked');
  });

  it('a module is unlocked once all prereqs are completed', () => {
    const p = markCompleted(emptyProgress(), '01-01');
    expect(deriveState('01-02', ['01-01'], p)).toBe('unlocked');
  });

  it('completed beats locked even if prereqs are missing', () => {
    const p = markCompleted(emptyProgress(), '02-09');
    expect(deriveState('02-09', ['01-15'], p)).toBe('completed');
  });

  it('in_progress is reported when visited but not completed and prereqs are met', () => {
    const a = markCompleted(emptyProgress(), '01-01');
    const b = markVisited(a, '01-02');
    expect(deriveState('01-02', ['01-01'], b)).toBe('in_progress');
  });

  it('prereq matching is case-insensitive', () => {
    const p = markCompleted(emptyProgress(), '01-01');
    expect(deriveState('01-02', ['01-01'], p)).toBe('unlocked');
    expect(deriveState('01-02', ['01-01'], p)).not.toBe('locked');
  });
});

describe('visitor-progress: mutations', () => {
  it('markVisited sets in_progress on first visit', () => {
    const p = markVisited(emptyProgress(), '01-01');
    expect(p.modules['01-01'].state).toBe('in_progress');
    expect(p.modules['01-01'].lastVisitedAt).toBeTypeOf('number');
  });

  it('markVisited preserves completed state', () => {
    const a = markCompleted(emptyProgress(), '01-01');
    const b = markVisited(a, '01-01');
    expect(b.modules['01-01'].state).toBe('completed');
    expect(b.modules['01-01'].quizPassedAt).toBeTypeOf('number');
  });

  it('markCompleted sets quizPassedAt and overwrites in_progress', () => {
    const a = markVisited(emptyProgress(), '01-01');
    const b = markCompleted(a, '01-01');
    expect(b.modules['01-01'].state).toBe('completed');
    expect(b.modules['01-01'].quizPassedAt).toBeTypeOf('number');
  });

  it('resetModule removes the entry', () => {
    const a = markCompleted(emptyProgress(), '01-01');
    const b = resetModule(a, '01-01');
    expect(b.modules['01-01']).toBeUndefined();
  });

  it('resetAll returns empty progress regardless of input', () => {
    expect(resetAll()).toEqual(emptyProgress());
  });
});

describe('visitor-progress: findUnmetPrereqs', () => {
  it('returns empty when all prereqs are completed', () => {
    let p = markCompleted(emptyProgress(), '01-01');
    p = markCompleted(p, '01-02');
    expect(findUnmetPrereqs(['01-01', '01-02'], p)).toEqual([]);
  });

  it('returns the missing ones when some prereqs are not completed', () => {
    const p = markCompleted(emptyProgress(), '01-01');
    expect(findUnmetPrereqs(['01-01', '01-02', '01-03'], p)).toEqual(['01-02', '01-03']);
  });

  it('treats in_progress as unmet (not completed)', () => {
    let p = markCompleted(emptyProgress(), '01-01');
    p = markVisited(p, '01-02');
    expect(findUnmetPrereqs(['01-01', '01-02'], p)).toEqual(['01-02']);
  });
});

describe('visitor-progress: summarize', () => {
  const modules = [
    { rawId: '01-01', prereqs: [] },
    { rawId: '01-02', prereqs: ['01-01'] },
    { rawId: '01-03', prereqs: ['01-02'] },
  ] as const;

  it('reports zeros on empty progress', () => {
    const s = summarize(modules, emptyProgress());
    expect(s).toMatchObject({ total: 3, completed: 0, inProgress: 0, percent: 0 });
  });

  it('counts completed modules correctly', () => {
    let p = markCompleted(emptyProgress(), '01-01');
    p = markCompleted(p, '01-02');
    const s = summarize(modules, p);
    expect(s.completed).toBe(2);
    expect(s.percent).toBe(67);
  });

  it('counts in_progress separately from completed', () => {
    let p = markCompleted(emptyProgress(), '01-01');
    p = markVisited(p, '01-02');
    const s = summarize(modules, p);
    expect(s.completed).toBe(1);
    expect(s.inProgress).toBe(1);
  });
});

describe('visitor-progress: storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: memoryStorage(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readProgress returns empty when storage is empty', () => {
    expect(readProgress()).toEqual(emptyProgress());
  });

  it('writeProgress and readProgress round-trip', () => {
    const p = markCompleted(emptyProgress(), '01-01');
    writeProgress(p);
    expect(readProgress()).toEqual(p);
  });

  it('readProgress recovers from corrupt JSON', () => {
    (window.localStorage as Storage).setItem(STORAGE_KEY, '{not json');
    expect(readProgress()).toEqual(emptyProgress());
  });

  it('readProgress rejects wrong version shape', () => {
    (window.localStorage as Storage).setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, modules: { '01-01': { state: 'completed' } } }),
    );
    expect(readProgress()).toEqual(emptyProgress());
  });

  it('writeProgress dispatches a custom event', () => {
    const spy = window.dispatchEvent as unknown as ReturnType<typeof vi.fn>;
    writeProgress(markCompleted(emptyProgress(), '01-01'));
    expect(spy).toHaveBeenCalled();
  });
});
