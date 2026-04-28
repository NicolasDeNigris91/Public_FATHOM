'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: 'Navegação',
    items: [
      { keys: ['⌘', 'K'], description: 'Abrir command palette' },
      { keys: ['Ctrl', 'K'], description: 'Abrir command palette (Win/Linux)' },
      { keys: ['?'], description: 'Mostrar / esconder esta ajuda' },
      { keys: ['Esc'], description: 'Fechar overlay aberto' },
    ],
  },
  {
    section: 'Sites canônicos',
    items: [
      { keys: ['g', 'h'], description: 'Ir pra Home' },
      { keys: ['g', 's'], description: 'Stages' },
      { keys: ['g', 'p'], description: 'Progress' },
      { keys: ['g', 'n'], description: 'Now' },
      { keys: ['g', 'l'], description: 'Library' },
    ],
  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | null = null;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in form fields
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setPending(null);
        return;
      }
      // "g" prefix navigation: g+letter shortcut to common pages
      if (pending === 'g') {
        const map: Record<string, string> = {
          h: '/',
          s: '/stages',
          p: '/progress',
          n: '/now',
          l: '/library',
        };
        const target = map[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          window.location.href = target;
        }
        setPending(null);
        if (timer !== null) window.clearTimeout(timer);
        return;
      }
      if (e.key === 'g') {
        setPending('g');
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => setPending(null), 1500);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [pending]);

  if (!open) {
    return pending === 'g' ? (
      <div
        aria-live="polite"
        className="fixed bottom-6 left-6 z-40 font-mono text-caption text-pearl
                   border border-mist/60 bg-graphite/95 backdrop-blur-md px-4 py-2
                   tracking-luxury uppercase"
      >
        g · aguardando segunda tecla…
      </div>
    ) : null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos de teclado"
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 backdrop-blur-md bg-obsidian/85"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-graphite border border-mist/60 shadow-card-hover
                   p-6 sm:p-8"
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-2">
              Atalhos
            </p>
            <h2 className="font-display text-display-md text-pearl">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="text-chrome hover:text-pearl transition-colors duration-200"
          >
            <X size={18} strokeWidth={1} />
          </button>
        </div>

        <div className="space-y-8">
          {SHORTCUTS.map((group) => (
            <section key={group.section}>
              <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-3">
                {group.section}
              </p>
              <ul className="space-y-2">
                {group.items.map((s, idx) => (
                  <li
                    key={`${group.section}-${idx}`}
                    className="flex items-center justify-between py-2 border-b border-mist/30"
                  >
                    <span className="font-sans text-body text-platinum">{s.description}</span>
                    <span className="flex items-center gap-1.5">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="font-mono text-caption text-chrome border border-mist/60
                                     bg-carbon px-2 py-0.5"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="font-mono text-caption text-chrome/70 tracking-wide mt-8">
          Pressione <kbd className="border border-mist/60 px-1.5 py-0.5">?</kbd> a qualquer momento pra reabrir.
        </p>
      </div>
    </div>
  );
}
