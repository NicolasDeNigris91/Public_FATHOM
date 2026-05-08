'use client';

import { useEffect, useState } from 'react';
import { Check, Lock, Clock, BookOpen } from 'lucide-react';
import { deriveState, emptyProgress, readProgress, type VisitorState } from '@/lib/visitor-progress';

interface Props {
  rawId: string;
  prereqs: readonly string[];
  size?: number;
}

const TONE: Record<VisitorState, string> = {
  completed: 'text-racing-green-lit',
  in_progress: 'text-gold-leaf',
  unlocked: 'text-platinum',
  locked: 'text-mist',
};

export function VisitorStatusIcon({ rawId, prereqs, size = 14 }: Props) {
  const [state, setState] = useState<VisitorState>(() =>
    deriveState(rawId, prereqs, emptyProgress()),
  );

  useEffect(() => {
    function recompute() {
      setState(deriveState(rawId, prereqs, readProgress()));
    }
    recompute();
    window.addEventListener('fathom:progress-change', recompute);
    window.addEventListener('storage', recompute);
    return () => {
      window.removeEventListener('fathom:progress-change', recompute);
      window.removeEventListener('storage', recompute);
    };
  }, [rawId, prereqs]);

  const tone = TONE[state];
  const label = labelOf(state);

  if (state === 'completed') {
    return <Check size={size} strokeWidth={1.5} className={tone} aria-label={label} role="img" />;
  }
  if (state === 'in_progress') {
    return <Clock size={size} strokeWidth={1.5} className={tone} aria-label={label} role="img" />;
  }
  if (state === 'locked') {
    return <Lock size={size} strokeWidth={1} className={tone} aria-label={label} role="img" />;
  }
  return <BookOpen size={size} strokeWidth={1.5} className={tone} aria-label={label} role="img" />;
}

function labelOf(state: VisitorState): string {
  switch (state) {
    case 'completed':
      return 'Concluído';
    case 'in_progress':
      return 'Em andamento';
    case 'locked':
      return 'Bloqueado';
    case 'unlocked':
      return 'Desbloqueado';
  }
}
