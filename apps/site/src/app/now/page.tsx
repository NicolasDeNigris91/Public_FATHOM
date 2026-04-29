import Link from 'next/link';
import { ArrowRight, BookOpen, Activity, Compass } from 'lucide-react';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { loadProgress, summarize } from '@/lib/progress';
import { getModuleByRawId, getAllModules } from '@/lib/content';
import { STAGES } from '@/lib/stages';

export const metadata = {
  title: 'Now',
  description:
    'Em que estou trabalhando agora, estágio ativo, módulo ativo, próximo passo. /now convention.',
  alternates: { canonical: '/now' },
};

export default async function NowPage() {
  const snap = await loadProgress();
  const all = await getAllModules();
  const totals = snap ? summarize(snap.rows) : null;

  const nextRawId = snap?.nextModule.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/)?.[1];
  const nextMod = nextRawId ? await getModuleByRawId(nextRawId) : null;
  const activeRawId = snap?.activeModule.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/)?.[1];
  const activeMod = activeRawId ? await getModuleByRawId(activeRawId) : null;

  const stage = activeMod
    ? STAGES.find((s) => s.id === activeMod.stageId)
    : nextMod
      ? STAGES.find((s) => s.id === nextMod.stageId)
      : STAGES[0];

  const percent =
    totals && totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Now' },
          ]}
        />
        <EyebrowHeading
          eyebrow={`Atualizado em ${snap?.updatedAt ?? 'TBD'}`}
          title="Now"
          subtitle="O que estou estudando neste momento. Página viva, lê PROGRESS.md a cada build. Inspirado no /now convention de nownownow.com."
        />

        <div className="mt-16 mb-16 grid gap-6 md:grid-cols-2">
          <div className="border border-mist/50 bg-graphite p-8">
            <div className="flex items-center gap-3 mb-4">
              <Compass size={14} strokeWidth={1} className="text-racing-green-lit" />
              <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
                Estágio ativo
              </span>
            </div>
            <p className="font-display text-display-md text-pearl mb-2">
              {stage?.title ?? '-'}
            </p>
            <p className="font-sans text-body text-chrome leading-relaxed">
              {stage?.subtitle ?? ''}
            </p>
            {stage && (
              <Link
                href={`/stages/${stage.id}`}
                className="inline-flex items-center gap-2 mt-6 font-mono text-caption tracking-luxury uppercase
                           text-chrome hover:text-pearl transition-colors duration-200"
              >
                View Stage <ArrowRight size={12} strokeWidth={1} />
              </Link>
            )}
          </div>

          <div className="border border-mist/50 bg-graphite p-8">
            <div className="flex items-center gap-3 mb-4">
              <Activity size={14} strokeWidth={1} className="text-gold-leaf" />
              <span className="font-mono text-caption text-gold-leaf tracking-luxury uppercase">
                Conclusão geral
              </span>
            </div>
            <p className="font-display text-display-md text-pearl mb-2">
              {totals?.done ?? 0}{' '}
              <span className="text-chrome text-base font-mono">
                / {totals?.total ?? 0}
              </span>
            </p>
            <p className="font-mono text-caption text-chrome tracking-wide mb-4">
              {percent}% · {totals?.inProgress ?? 0} ativos · {totals?.refresh ?? 0} refresh
            </p>
            <div className="h-px bg-mist/40 relative">
              <div
                className="absolute top-0 left-0 h-px bg-gold-leaf transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 mt-6 font-mono text-caption tracking-luxury uppercase
                         text-chrome hover:text-pearl transition-colors duration-200"
            >
              Full dashboard <ArrowRight size={12} strokeWidth={1} />
            </Link>
          </div>
        </div>

        {!activeMod && !nextMod && (
          <div className="mb-16 border border-mist/50 bg-graphite p-10">
            <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3">
              Calibrando
            </p>
            <h3 className="font-display text-display-md text-pearl mb-4">
              Antes de começar, calibre
            </h3>
            <p className="font-sans text-body text-chrome leading-relaxed mb-8 max-w-2xl">
              PROGRESS.md ainda está vazio. Caminho sugerido: passar pelo
              Self-Assessment, escolher um plano, e abrir 01-01.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link
                href="/docs/self-assessment"
                className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                           px-6 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300"
              >
                Self-Assessment
              </Link>
              <Link
                href="/docs/study-plans"
                className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                           transition-colors duration-300"
              >
                Study Plans →
              </Link>
              <Link
                href="/modules/01-01"
                className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                           transition-colors duration-300"
              >
                01-01: Computation Model →
              </Link>
            </div>
          </div>
        )}

        {(activeMod || nextMod) && (
          <div className="mb-16">
            <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
              {activeMod ? 'Estudando agora' : 'Próximo na fila'}
            </p>

            <Link
              href={`/modules/${(activeMod ?? nextMod)!.id}`}
              className="group block border border-mist/50 bg-graphite p-10 mb-6
                         hover:border-gold-leaf transition-colors duration-300
                         focus-visible:outline-none focus-visible:border-gold-leaf"
            >
              <div className="flex items-center gap-3 mb-4">
                <BookOpen size={14} strokeWidth={1} className="text-mist group-hover:text-gold-leaf transition-colors duration-200" />
                <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
                  {(activeMod ?? nextMod)!.rawId}
                </span>
              </div>
              <h3 className="font-display text-display-lg text-pearl tracking-tight leading-tight mb-4 group-hover:text-gold-leaf transition-colors duration-300">
                {(activeMod ?? nextMod)!.title}
              </h3>
              {(activeMod ?? nextMod)!.prereqs.length > 0 && (
                <p className="font-mono text-caption text-chrome tracking-wide">
                  Prereqs: {(activeMod ?? nextMod)!.prereqs.join(', ')}
                </p>
              )}
            </Link>

            {activeMod && nextMod && nextMod.id !== activeMod.id && (
              <Link
                href={`/modules/${nextMod.id}`}
                className="group inline-flex items-center justify-between gap-3 w-full border border-mist/40 px-6 py-4
                           hover:border-platinum transition-colors duration-200"
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-caption text-chrome tracking-luxury uppercase">
                    Próximo
                  </span>
                  <span className="font-mono text-caption text-racing-green-lit tracking-wide">
                    {nextMod.rawId}
                  </span>
                  <span className="font-sans text-body text-platinum group-hover:text-gold-leaf transition-colors duration-200">
                    {nextMod.title}
                  </span>
                </span>
                <ArrowRight size={14} strokeWidth={1} className="text-mist group-hover:text-gold-leaf transition-colors duration-200" />
              </Link>
            )}
          </div>
        )}

        {snap && snap.rows.length > 0 && (
          <div className="border-t border-mist/40 pt-16 mb-16">
            <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-8">
              Por estágio
            </p>
            <div className="space-y-4">
              {STAGES.map((s) => {
                const rows = snap.rows.filter((r) => r.stageNumber === s.number);
                const done = rows.filter((r) => r.status === 'DONE').length;
                const total = rows.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={s.id} className="grid grid-cols-[140px_1fr_60px] items-center gap-4">
                    <span className="font-mono text-caption text-chrome tracking-luxury uppercase truncate">
                      {s.title}
                    </span>
                    <div className="h-px bg-mist/40 relative">
                      <div
                        className="absolute top-0 left-0 h-px bg-gold-leaf transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-caption text-chrome tracking-wide text-right">
                      {done}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-mist/40 pt-16 grid gap-8 md:grid-cols-3 font-mono text-caption text-chrome tracking-wide">
          <div>
            <p className="text-racing-green-lit tracking-luxury uppercase mb-2">
              Total módulos
            </p>
            <p className="font-display text-xl text-pearl">{all.length}</p>
          </div>
          <div>
            <p className="text-racing-green-lit tracking-luxury uppercase mb-2">
              Estágios
            </p>
            <p className="font-display text-xl text-pearl">{STAGES.length}</p>
          </div>
          <div>
            <p className="text-racing-green-lit tracking-luxury uppercase mb-2">
              Última atualização
            </p>
            <p className="font-display text-xl text-pearl">{snap?.updatedAt ?? '-'}</p>
          </div>
        </div>

        <div className="mt-20 pt-12 border-t border-mist/40">
          <p className="font-mono text-caption text-chrome/70 tracking-wide leading-relaxed max-w-2xl">
            Esta página segue o{' '}
            <a
              href="https://nownownow.com/about"
              target="_blank"
              rel="noreferrer"
              className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4"
            >
              /now convention
            </a>
            : um snapshot honesto de prioridades atuais, sem cosmetic. Quando o
            módulo ativo mudar, esta página muda. Source of truth:{' '}
            <Link
              href="/progress"
              className="text-gold-leaf hover:text-pearl transition-colors duration-200 underline underline-offset-4"
            >
              PROGRESS.md
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
