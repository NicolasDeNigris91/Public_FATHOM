import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DOCS, DOC_CATEGORIES } from '@/lib/docs';

export const metadata = {
  title: 'Docs',
  description: 'Protocolos, decisões, glossário, e meta-docs do framework.',
  alternates: { canonical: '/docs' },
};

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
          {DOC_CATEGORIES.map((cat) => {
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
