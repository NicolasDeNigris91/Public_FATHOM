'use client';

import { useEffect, useState } from 'react';
import { Check, Lock, Clock, Circle, BookOpen } from 'lucide-react';
import { deriveState, emptyProgress, readProgress, type VisitorState } from '@/lib/visitor-progress';

interface Props {
  rawId: string;
  prereqs: readonly string[];
  className?: string;
}

const CONFIG: Record<VisitorState, { label: string; tone: string; icon: typeof Check }> = {
  completed: {
    label: 'Concluído',
    tone: 'text-racing-green-lit border-racing-green-lit/50',
    icon: Check,
  },
  in_progress: {
    label: 'Em andamento',
    tone: 'text-gold-leaf border-gold-leaf/50',
    icon: Clock,
  },
  unlocked: {
    label: 'Desbloqueado',
    tone: 'text-platinum border-platinum/50',
    icon: BookOpen,
  },
  locked: {
    label: 'Bloqueado',
    tone: 'text-chrome/60 border-mist/30',
    icon: Lock,
  },
};

export function VisitorStatusBadge({ rawId, prereqs, className }: Props) {
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

  const cfg = CONFIG[state];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 border
                  font-mono text-caption tracking-luxury uppercase
                  ${cfg.tone} ${className ?? ''}`}
    >
      <Icon size={11} strokeWidth={1.5} />
      <span>{cfg.label}</span>
    </span>
  );
}
