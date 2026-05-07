'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, ArrowRight, BookOpen, Layers, Activity, FileText, Home } from 'lucide-react';

export interface PaletteEntry {
  type: 'home' | 'stage' | 'module' | 'doc' | 'progress' | 'index';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  rawId?: string;
}

interface Props {
  entries: PaletteEntry[];
}

const ICONS: Record<PaletteEntry['type'], React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  home: Home,
  stage: Layers,
  module: BookOpen,
  progress: Activity,
  index: Layers,
  doc: FileText,
};

const TYPE_LABEL: Record<PaletteEntry['type'], string> = {
  home: 'Home',
  stage: 'Stage',
  module: 'Module',
  doc: 'Doc',
  progress: 'Progress',
  index: 'Index',
};

export function CommandPalette({ entries }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-3 sm:px-4 backdrop-blur-md bg-obsidian/85"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-graphite border border-mist/60 shadow-card-hover"
      >
        <Command label="Fathom Search" shouldFilter>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-mist/40">
            <Search size={16} strokeWidth={1} className="text-chrome flex-shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar módulo, estágio, doc…"
              className="flex-1 bg-transparent outline-none border-none
                         font-sans text-body text-pearl placeholder:text-mist
                         focus:ring-0"
              // Command palette is opened on demand (Cmd/Ctrl+K); the
              // user explicitly asks for the search input, so autoFocus
              // is the expected behavior, not a surprise focus change.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <kbd className="font-mono text-caption text-mist tracking-wide border border-mist/60 px-2 py-0.5">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="px-5 py-8 text-center font-mono text-caption text-chrome tracking-luxury uppercase">
              No results
            </Command.Empty>

            {(['home', 'stage', 'progress', 'index', 'module', 'doc'] as PaletteEntry['type'][]).map((type) => {
              const group = entries.filter((e) => e.type === type);
              if (group.length === 0) return null;
              return (
                <Command.Group
                  key={type}
                  heading={TYPE_LABEL[type]}
                  className="[&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-2
                             [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-caption
                             [&_[cmdk-group-heading]]:text-racing-green-lit
                             [&_[cmdk-group-heading]]:tracking-luxury [&_[cmdk-group-heading]]:uppercase"
                >
                  {group.map((entry) => {
                    const Icon = ICONS[entry.type];
                    return (
                      <Command.Item
                        key={`${entry.type}-${entry.id}`}
                        value={`${entry.rawId ?? ''} ${entry.title} ${entry.subtitle ?? ''}`}
                        onSelect={() => go(entry.href)}
                        className="group flex items-center gap-3 px-5 py-3 cursor-pointer
                                   data-[selected=true]:bg-carbon
                                   transition-colors duration-150"
                      >
                        <Icon size={14} strokeWidth={1} className="text-mist group-data-[selected=true]:text-gold-leaf flex-shrink-0" />
                        {entry.rawId && (
                          <span className="font-mono text-caption text-racing-green-lit tracking-wide w-12 flex-shrink-0">
                            {entry.rawId}
                          </span>
                        )}
                        <span className="font-sans text-body text-platinum group-data-[selected=true]:text-pearl truncate flex-1">
                          {entry.title}
                        </span>
                        {entry.subtitle && (
                          <span className="hidden md:inline font-mono text-caption text-chrome tracking-wide truncate max-w-[180px]">
                            {entry.subtitle}
                          </span>
                        )}
                        <ArrowRight size={14} strokeWidth={1} className="text-mist group-data-[selected=true]:text-gold-leaf flex-shrink-0" />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>

          <div className="flex items-center justify-between px-5 py-3 border-t border-mist/40 font-mono text-caption text-mist tracking-wide">
            <span>{entries.length} entries</span>
            <span className="flex items-center gap-3">
              <kbd className="border border-mist/60 px-2 py-0.5">↑↓</kbd> navigate
              <kbd className="border border-mist/60 px-2 py-0.5">↵</kbd> open
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
