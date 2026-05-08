'use client';

import { useEffect, useState } from 'react';
import { emptyProgress, readProgress, summarize } from '@/lib/visitor-progress';

export interface ModuleRef {
  rawId: string;
  prereqs: string[];
}

interface Props {
  modules: ReadonlyArray<ModuleRef>;
  variant?: 'compact' | 'banner';
}

export function OverallProgressMeter({ modules, variant = 'compact' }: Props) {
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

  if (variant === 'banner') {
    return (
      <section
        aria-label="Progresso geral do currículo"
        className="border border-mist/40 px-6 py-5 bg-obsidian/60"
      >
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
            Teu progresso
          </p>
          <p className="font-sans text-body text-chrome">
            <span className="font-display text-display-lg text-pearl">{stats.completed}</span>
            <span className="text-chrome/70"> / {stats.total} módulos</span>
            <span className="ml-3 font-mono text-caption text-gold-leaf tracking-wide">
              {stats.percent}%
            </span>
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={stats.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stats.completed} de ${stats.total} módulos concluídos`}
          className="h-1 bg-mist/20 overflow-hidden"
        >
          <div
            className="h-full bg-gold-leaf transition-[width] duration-500 ease-out"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        {stats.inProgress > 0 && (
          <p className="mt-3 font-mono text-caption text-chrome/80 tracking-wide">
            {stats.inProgress} em andamento · salvo no teu navegador
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="inline-flex items-center gap-3" aria-label="Progresso geral">
      <span className="font-mono text-caption text-chrome tracking-luxury uppercase">
        Teu progresso
      </span>
      <div
        role="progressbar"
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-32 h-1 bg-mist/20"
      >
        <div
          className="h-full bg-gold-leaf transition-[width] duration-500 ease-out"
          style={{ width: `${stats.percent}%` }}
        />
      </div>
      <span className="font-mono text-caption text-gold-leaf tracking-wide tabular-nums">
        {stats.completed}/{stats.total}
      </span>
    </div>
  );
}
