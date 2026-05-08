'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { emptyProgress, findUnmetPrereqs, readProgress } from '@/lib/visitor-progress';

interface Props {
  rawId: string;
  prereqs: readonly string[];
  prereqTitles?: Readonly<Record<string, string>>;
}

export function LockedModuleNotice({ rawId, prereqs, prereqTitles }: Props) {
  const [unmet, setUnmet] = useState<string[]>(() => findUnmetPrereqs(prereqs, emptyProgress()));

  useEffect(() => {
    function recompute() {
      setUnmet(findUnmetPrereqs(prereqs, readProgress()));
    }
    recompute();
    window.addEventListener('fathom:progress-change', recompute);
    return () => window.removeEventListener('fathom:progress-change', recompute);
  }, [prereqs]);

  if (unmet.length === 0) return null;

  return (
    <aside
      role="status"
      aria-labelledby={`locked-${rawId}-heading`}
      className="mb-12 border border-mist/40 bg-obsidian/40 px-6 py-5"
    >
      <p
        id={`locked-${rawId}-heading`}
        className="inline-flex items-center gap-2 font-mono text-caption text-chrome tracking-luxury uppercase mb-3"
      >
        <Lock size={12} strokeWidth={1.5} />
        Bloqueado pela trilha sugerida
      </p>
      <p className="font-sans text-body text-chrome leading-relaxed mb-4">
        Você pode ler à vontade — nada está oculto. Mas pra fechar o quiz deste módulo a trilha
        recomenda concluir antes:
      </p>
      <ul className="flex flex-wrap gap-2">
        {unmet.map((id) => (
          <li key={id}>
            <Link
              href={`/modules/${id.toLowerCase()}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-mist/50 text-chrome
                         font-mono text-caption tracking-wide
                         hover:border-gold-leaf hover:text-gold-leaf transition-colors duration-200"
            >
              <span className="text-racing-green-lit">{id}</span>
              {prereqTitles?.[id] && <span>{prereqTitles[id]}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
