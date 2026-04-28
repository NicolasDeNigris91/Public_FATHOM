import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ModuleSummary } from '@/lib/content';
import { getStage } from '@/lib/stages';

interface Props {
  prev: ModuleSummary | null;
  next: ModuleSummary | null;
}

export function ModuleNav({ prev, next }: Props) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="Navegação entre módulos"
      className="mt-20 pt-12 border-t border-mist/40 grid gap-6 md:grid-cols-2"
    >
      {prev ? (
        <Link
          href={`/modules/${prev.id}`}
          className="group block border border-mist/50 bg-graphite p-6
                     hover:border-gold-leaf transition-colors duration-300
                     focus-visible:outline-none focus-visible:border-gold-leaf"
        >
          <span className="font-mono text-caption text-chrome tracking-luxury uppercase mb-2 inline-flex items-center gap-2">
            <ArrowLeft size={12} strokeWidth={1} /> Anterior
          </span>
          <p className="font-mono text-caption text-racing-green-lit tracking-wide mb-1">
            {prev.rawId.startsWith('CAPSTONE') ? 'Capstone' : prev.rawId}
            {' · '}
            {getStage(prev.stageId)?.title}
          </p>
          <p className="font-display text-display-md text-pearl group-hover:text-gold-leaf transition-colors duration-200 leading-tight">
            {prev.title}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <Link
          href={`/modules/${next.id}`}
          className="group block border border-mist/50 bg-graphite p-6 md:text-right
                     hover:border-gold-leaf transition-colors duration-300
                     focus-visible:outline-none focus-visible:border-gold-leaf"
        >
          <span className="font-mono text-caption text-chrome tracking-luxury uppercase mb-2 inline-flex items-center gap-2 md:flex-row-reverse">
            Próximo <ArrowRight size={12} strokeWidth={1} />
          </span>
          <p className="font-mono text-caption text-racing-green-lit tracking-wide mb-1">
            {next.rawId.startsWith('CAPSTONE') ? 'Capstone' : next.rawId}
            {' · '}
            {getStage(next.stageId)?.title}
          </p>
          <p className="font-display text-display-md text-pearl group-hover:text-gold-leaf transition-colors duration-200 leading-tight">
            {next.title}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
