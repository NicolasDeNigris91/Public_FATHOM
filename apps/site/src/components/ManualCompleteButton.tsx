'use client';

import { useEffect, useState } from 'react';
import { Check, RotateCw } from 'lucide-react';
import {
  deriveState,
  emptyProgress,
  markCompleted,
  readProgress,
  resetModule,
  writeProgress,
} from '@/lib/visitor-progress';

interface Props {
  rawId: string;
  prereqs: readonly string[];
  /** When true, this is the only completion path; otherwise it's an alternative to the quiz. */
  primary?: boolean;
}

export function ManualCompleteButton({ rawId, prereqs, primary = false }: Props) {
  const initial = deriveState(rawId, prereqs, emptyProgress());
  const [completed, setCompleted] = useState(initial === 'completed');
  const [locked, setLocked] = useState(initial === 'locked');

  useEffect(() => {
    function recompute() {
      const p = readProgress();
      const state = deriveState(rawId, prereqs, p);
      setCompleted(state === 'completed');
      setLocked(state === 'locked');
    }
    recompute();
    window.addEventListener('fathom:progress-change', recompute);
    return () => window.removeEventListener('fathom:progress-change', recompute);
  }, [rawId, prereqs]);

  function handleComplete() {
    writeProgress(markCompleted(readProgress(), rawId));
  }

  function handleReset() {
    writeProgress(resetModule(readProgress(), rawId));
  }

  if (locked && !completed) {
    return null;
  }

  if (completed) {
    return (
      <div className="inline-flex items-center gap-3 flex-wrap" aria-live="polite">
        <span className="inline-flex items-center gap-2 px-4 py-2 border border-racing-green-lit/60 text-racing-green-lit
                         font-mono text-caption tracking-luxury uppercase">
          <Check size={12} strokeWidth={1.5} />
          Módulo concluído
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 border border-mist/50 text-chrome
                     font-mono text-caption tracking-luxury uppercase
                     hover:border-platinum hover:text-platinum transition-colors duration-200"
        >
          <RotateCw size={12} strokeWidth={1.5} />
          Refazer
        </button>
      </div>
    );
  }

  const label = primary ? 'Marcar como concluído' : 'Já sei isso, marcar concluído';
  const tone = primary
    ? 'border-gold-leaf text-gold-leaf hover:bg-gold-leaf hover:text-obsidian'
    : 'border-mist/60 text-chrome hover:border-platinum hover:text-platinum';

  return (
    <button
      type="button"
      onClick={handleComplete}
      className={`inline-flex items-center gap-2 px-5 py-3 border ${tone}
                  font-mono text-caption tracking-luxury uppercase transition-colors duration-200
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum`}
    >
      <Check size={12} strokeWidth={1.5} />
      {label}
    </button>
  );
}
