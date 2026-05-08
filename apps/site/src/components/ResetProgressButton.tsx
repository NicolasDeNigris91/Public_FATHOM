'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { readProgress, resetAll, writeProgress } from '@/lib/visitor-progress';

export function ResetProgressButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    function recompute() {
      const p = readProgress();
      const c = Object.values(p.modules).filter((m) => m.state === 'completed').length;
      setCompletedCount(c);
    }
    recompute();
    window.addEventListener('fathom:progress-change', recompute);
    return () => window.removeEventListener('fathom:progress-change', recompute);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function handleConfirm() {
    writeProgress(resetAll());
    setOpen(false);
  }

  if (completedCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 border border-mist/50 text-chrome
                    font-mono text-caption tracking-luxury uppercase
                    hover:border-rose-500/60 hover:text-rose-300 transition-colors duration-200
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum
                    ${className ?? ''}`}
      >
        <Trash2 size={12} strokeWidth={1.5} />
        Resetar progresso
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-progress-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-obsidian/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md border border-mist/50 bg-obsidian p-8">
            <div className="flex items-start justify-between gap-6 mb-4">
              <h2
                id="reset-progress-title"
                className="font-display text-display-md text-pearl tracking-tight"
              >
                Resetar progresso?
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-chrome hover:text-pearl transition-colors duration-200"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-sans text-body text-chrome leading-relaxed mb-8">
              Isso vai apagar os {completedCount} {completedCount === 1 ? 'módulo concluído' : 'módulos concluídos'} e
              qualquer módulo em andamento — só do teu navegador. O conteúdo continua igual.
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2 border border-mist/50 text-chrome
                           font-mono text-caption tracking-luxury uppercase
                           hover:border-platinum hover:text-platinum transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className="px-5 py-2 border border-rose-500/60 text-rose-300
                           font-mono text-caption tracking-luxury uppercase
                           hover:bg-rose-500/10 transition-colors duration-200"
              >
                Sim, resetar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
