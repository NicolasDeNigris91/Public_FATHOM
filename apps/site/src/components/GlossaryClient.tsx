'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import type { GlossaryTerm } from '@/lib/content';

interface Props {
  terms: GlossaryTerm[];
  sections: string[];
}

/**
 * Splits text into parts with the matched query wrapped in <mark>.
 * Case-insensitive. Handles regex special chars by escaping the query.
 */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Split with capture group → odd indices are matches.
  const parts = text.split(new RegExp(`(${escaped})`, 'i'));
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={idx}
        className="bg-gold-leaf/20 text-pearl rounded-[1px] px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

export function GlossaryClient({ terms, sections }: Props) {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return terms.filter((t) => {
      if (activeSection && t.section !== activeSection) return false;
      if (!normalized) return true;
      const haystack = `${t.term} ${t.expansion ?? ''} ${t.definition}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [terms, normalized, activeSection]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const list = map.get(t.section) ?? [];
      list.push(t);
      map.set(t.section, list);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center gap-3 border border-mist/60 bg-graphite px-4 py-3 mb-6
                      focus-within:border-gold-leaf transition-colors duration-200">
        <Search size={16} strokeWidth={1} className="text-chrome flex-shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar termo ou definição…"
          className="flex-1 bg-transparent outline-none border-none
                     font-sans text-body text-pearl placeholder:text-mist"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            className="text-chrome hover:text-pearl transition-colors duration-200"
          >
            <X size={14} strokeWidth={1} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-12">
        <button
          type="button"
          onClick={() => setActiveSection(null)}
          aria-pressed={activeSection === null}
          className={`font-mono text-caption tracking-luxury uppercase px-3 py-1.5
                      border transition-colors duration-200
                      ${activeSection === null
                        ? 'border-gold-leaf text-pearl'
                        : 'border-mist/60 text-chrome hover:border-platinum hover:text-platinum'}`}
        >
          Todas
        </button>
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s === activeSection ? null : s)}
            aria-pressed={s === activeSection}
            className={`font-mono text-caption tracking-luxury uppercase px-3 py-1.5
                        border transition-colors duration-200
                        ${s === activeSection
                          ? 'border-gold-leaf text-pearl'
                          : 'border-mist/60 text-chrome hover:border-platinum hover:text-platinum'}`}
          >
            {s.split(/\s+/)[0]}
          </button>
        ))}
      </div>

      <div className="font-mono text-caption text-chrome tracking-wide mb-8">
        {filtered.length} de {terms.length} termos
        {activeSection ? ` · ${activeSection}` : ''}
      </div>

      {filtered.length === 0 ? (
        <p className="font-sans text-body text-chrome italic py-12 text-center">
          Nenhum termo bate com "{query}"{activeSection ? ` em ${activeSection}` : ''}.
        </p>
      ) : (
        [...grouped.entries()].map(([section, items]) => (
          <section key={section} className="mb-16">
            <h2 className="font-display text-display-md text-pearl mb-2">{section}</h2>
            <div className="h-px bg-gold-leaf w-12 mb-8" aria-hidden="true" />
            <dl className="space-y-6">
              {items.map((t) => (
                <div
                  key={`${t.section}-${t.term}`}
                  className="group grid md:grid-cols-[220px_1fr] gap-x-8 gap-y-2 py-4
                             border-b border-mist/30 hover:bg-carbon/40 transition-colors duration-200
                             px-4 -mx-4"
                >
                  <dt>
                    <span className="font-display text-xl text-pearl group-hover:text-gold-leaf transition-colors duration-200">
                      {highlight(t.term, normalized)}
                    </span>
                    {t.expansion && (
                      <span className="block font-mono text-caption text-racing-green-lit tracking-wide mt-1">
                        {highlight(t.expansion, normalized)}
                      </span>
                    )}
                  </dt>
                  <dd className="font-sans text-body text-platinum leading-relaxed">
                    {highlight(t.definition, normalized)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}
    </div>
  );
}
