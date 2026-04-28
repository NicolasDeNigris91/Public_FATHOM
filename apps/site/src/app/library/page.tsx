import Link from 'next/link';
import { ExternalLink, Lock } from 'lucide-react';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { LIBRARY } from '@/lib/library';
import { STAGES, type StageId } from '@/lib/stages';

export const metadata = { title: 'Library' };

const STAGE_ORDER: StageId[] = ['novice', 'apprentice', 'professional', 'senior', 'staff'];

export default function LibraryPage() {
  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Library' },
          ]}
        />
        <EyebrowHeading
          eyebrow="Curadoria"
          title="Library"
          subtitle="Estante de fontes canônicas, curada por estágio. Não é mirror completo do reading-list — é o subconjunto de máxima carga: livros citados como primários em 2+ módulos ou genre-defining pro estágio. Lista completa em /docs/reading-list."
        />

        <div className="mt-16 mb-20 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-caption text-chrome tracking-wide">
          <span>{LIBRARY.length} livros curados</span>
          <span>·</span>
          <span>{LIBRARY.filter((b) => b.free).length} gratuitos</span>
          <span>·</span>
          <Link
            href="/docs/reading-list"
            className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4"
          >
            Reading list completa
          </Link>
        </div>

        {STAGE_ORDER.map((stageId) => {
          const stageMeta = STAGES.find((s) => s.id === stageId)!;
          const books = LIBRARY.filter((b) => b.stage === stageId);
          if (books.length === 0) return null;

          return (
            <section key={stageId} className="mb-20">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-1">
                    Estágio {String(stageMeta.number).padStart(2, '0')}
                  </p>
                  <h2 className="font-display text-display-md text-pearl tracking-tight">
                    {stageMeta.title}
                  </h2>
                </div>
                <Link
                  href={`/stages/${stageMeta.id}`}
                  className="font-mono text-caption text-chrome tracking-luxury uppercase hover:text-pearl transition-colors duration-200"
                >
                  View Stage →
                </Link>
              </div>
              <div className="h-px bg-gold-leaf w-12 mb-10" aria-hidden="true" />

              <div className="space-y-0">
                {books.map((book) => {
                  const titleNode = (
                    <span className="font-display text-display-md text-pearl group-hover:text-gold-leaf transition-colors duration-200 leading-tight">
                      {book.title}
                    </span>
                  );

                  return (
                    <article
                      key={`${book.stage}-${book.title}`}
                      className="group grid md:grid-cols-[1fr_auto] gap-x-8 gap-y-3 py-6
                                 border-b border-mist/40 hover:bg-carbon/40 transition-colors duration-200
                                 px-4 -mx-4"
                    >
                      <div>
                        <div className="flex items-baseline gap-3 flex-wrap mb-2">
                          {book.url ? (
                            <a
                              href={book.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-baseline gap-2"
                            >
                              {titleNode}
                              <ExternalLink size={14} strokeWidth={1} className="text-mist group-hover:text-gold-leaf transition-colors duration-200 flex-shrink-0 self-center" />
                            </a>
                          ) : (
                            titleNode
                          )}
                          {book.free ? (
                            <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase border border-racing-green-lit/40 px-2 py-0.5">
                              Free
                            </span>
                          ) : (
                            <span className="font-mono text-caption text-chrome/70 tracking-luxury uppercase border border-mist/40 px-2 py-0.5 inline-flex items-center gap-1">
                              <Lock size={10} strokeWidth={1} />
                              Paid
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-caption text-chrome tracking-wide mb-3">
                          {book.author}
                          {book.year ? ` · ${book.year}` : ''}
                        </p>
                        <p className="font-sans text-body text-platinum leading-relaxed max-w-3xl">
                          {book.why}
                        </p>
                      </div>

                      {book.modules && book.modules.length > 0 && (
                        <div className="flex flex-wrap items-start gap-2 md:justify-end md:max-w-[180px]">
                          {book.modules.map((m) => (
                            <Link
                              key={m}
                              href={`/modules/${m.toLowerCase()}`}
                              className="font-mono text-caption tracking-wide text-racing-green-lit
                                         border border-mist/60 px-2 py-0.5
                                         hover:border-gold-leaf hover:text-gold-leaf transition-colors duration-200"
                            >
                              {m.startsWith('CAPSTONE') ? 'Capstone' : m}
                            </Link>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="mt-24 pt-16 border-t border-mist/40">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
            Filosofia
          </p>
          <p className="font-sans text-body-lg text-chrome leading-relaxed max-w-3xl">
            Framework é mapa; livros são território. Cada módulo aponta capítulo
            específico. Você não precisa ler todos do início ao fim — use os
            módulos como bússola.
          </p>
        </div>
      </div>
    </section>
  );
}
