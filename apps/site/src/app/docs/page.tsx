import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata = {
  title: 'Docs',
  description: 'Protocolos, decisões, glossário, e meta-docs do framework.',
  alternates: { canonical: '/docs' },
};

interface DocEntry {
  slug: string;
  title: string;
  eyebrow: string;
  category: 'protocol' | 'meta' | 'roadmap' | 'reference';
  highlight?: boolean;
}

const DOCS: DocEntry[] = [
  // Protocol
  { slug: 'mentor', title: 'Mentor Protocol', eyebrow: 'Contrato canônico', category: 'protocol', highlight: true },
  { slug: 'study-protocol', title: 'Study Protocol', eyebrow: 'Disciplina cognitiva', category: 'protocol', highlight: true },
  { slug: 'self-assessment', title: 'Self-Assessment', eyebrow: 'Calibração inicial', category: 'protocol' },
  // Roadmap / archaeology
  { slug: 'release-notes', title: 'Release Notes', eyebrow: 'Versão atual', category: 'roadmap' },
  { slug: 'changelog', title: 'Changelog', eyebrow: 'Histórico append-only', category: 'roadmap' },
  { slug: 'decision-log', title: 'Decision Log', eyebrow: 'Archaeology', category: 'roadmap' },
  { slug: 'sprint-next', title: 'Sprint Next', eyebrow: 'Backlog priorizado', category: 'roadmap' },
  // Reference
  { slug: 'study-plans', title: 'Study Plans', eyebrow: '7 templates de cadência', category: 'reference' },
  { slug: 'capstone-evolution', title: 'Capstone Evolution', eyebrow: 'Logística v0 → v4', category: 'reference' },
  { slug: 'codebase-tours', title: 'Codebase Tours', eyebrow: '20 reading paths', category: 'reference' },
  { slug: 'stack-comparisons', title: 'Stack Comparisons', eyebrow: 'Cross-stack mapping', category: 'reference' },
  { slug: 'reading-list', title: 'Reading List', eyebrow: 'Livros canônicos', category: 'reference' },
  { slug: 'elite-references', title: 'Elite References', eyebrow: 'Repos / blogs / talks', category: 'reference' },
  { slug: 'antipatterns', title: 'Antipatterns', eyebrow: 'O que não fazer', category: 'reference' },
  { slug: 'interview-prep', title: 'Interview Prep', eyebrow: 'Mapping tier-1', category: 'reference' },
  // Meta
  { slug: 'module-template', title: 'Module Template', eyebrow: 'Template oficial', category: 'meta' },
];

const CATEGORIES: { id: DocEntry['category']; label: string; eyebrow: string }[] = [
  { id: 'protocol', label: 'Protocolos', eyebrow: 'Contratos do framework' },
  { id: 'roadmap', label: 'Roadmap & Archaeology', eyebrow: 'Histórico e direção' },
  { id: 'reference', label: 'Referências', eyebrow: 'Materiais de apoio' },
  { id: 'meta', label: 'Meta', eyebrow: 'Sobre o framework em si' },
];

export default function DocsIndex() {
  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Docs' }]} />
        <EyebrowHeading
          eyebrow={`${DOCS.length} Documentos`}
          title="Docs"
          subtitle="Protocolos, decisões, glossário, reading lists. Materiais em torno dos módulos. Source of truth: arquivos .md em framework/00-meta/."
        />

        <div className="mt-16 space-y-16">
          {CATEGORIES.map((cat) => {
            const items = DOCS.filter((d) => d.category === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id}>
                <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-1">
                  {cat.eyebrow}
                </p>
                <h2 className="font-display text-display-md text-pearl tracking-tight mb-2">
                  {cat.label}
                </h2>
                <div className="h-px bg-gold-leaf w-12 mb-8" aria-hidden="true" />

                <ul className="space-y-0">
                  {items.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={`/docs/${doc.slug}`}
                        className="group grid grid-cols-[1fr_auto] md:grid-cols-[200px_1fr_auto] items-center
                                   gap-x-8 py-5 border-b border-mist/40
                                   hover:bg-carbon/40 transition-colors duration-200 px-4 -mx-4"
                      >
                        <span className="hidden md:block font-mono text-caption text-chrome tracking-luxury uppercase">
                          {doc.eyebrow}
                        </span>
                        <span className="font-sans text-body text-pearl group-hover:text-gold-leaf transition-colors duration-200">
                          {doc.title}
                          {doc.highlight && (
                            <span className="ml-3 font-mono text-caption text-racing-green-lit tracking-wide">
                              · core
                            </span>
                          )}
                        </span>
                        <ArrowUpRight
                          size={14}
                          strokeWidth={1}
                          className="text-mist group-hover:text-gold-leaf transition-colors duration-200"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-20 pt-12 border-t border-mist/40">
          <p className="font-mono text-caption text-chrome/70 tracking-wide max-w-2xl">
            Glossary, Library, Module Index, e Progress têm páginas dedicadas:{' '}
            <Link href="/glossary" className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4">
              /glossary
            </Link>
            ,{' '}
            <Link href="/library" className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4">
              /library
            </Link>
            ,{' '}
            <Link href="/index" className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4">
              /index
            </Link>
            ,{' '}
            <Link href="/progress" className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4">
              /progress
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
