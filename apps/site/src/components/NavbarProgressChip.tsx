'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { emptyProgress, readProgress, summarize } from '@/lib/visitor-progress';
import type { ModuleRef } from './OverallProgressMeter';

interface Props {
  modules: ReadonlyArray<ModuleRef>;
}

export function NavbarProgressChip({ modules }: Props) {
  const [stats, setStats] = useState(() => summarize(modules, emptyProgress()));

  useEffect(() => {
    function recompute() {
      setStats(summarize(modules, readProgress()));
    }
    recompute();
    window.addEventListener('fathom:progress-change', recompute);
    window.addEventListener('storage', recompute);
    return () => {
      window.removeEventListener('fathom:progress-change', recompute);
      window.removeEventListener('storage', recompute);
    };
  }, [modules]);

  if (stats.completed === 0) return null;

  return (
    <Link
      href="/progress"
      aria-label={`Progresso: ${stats.completed} de ${stats.total} módulos`}
      className="hidden md:inline-flex items-center gap-3 px-3 py-2 border border-mist/40
                 hover:border-gold-leaf transition-colors duration-200
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
    >
      <div
        role="progressbar"
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-16 h-px bg-mist/30"
      >
        <div className="h-full bg-gold-leaf" style={{ width: `${stats.percent}%` }} />
      </div>
      <span className="font-mono text-caption text-chrome tabular-nums">
        {stats.completed}/{stats.total}
      </span>
    </Link>
  );
}
