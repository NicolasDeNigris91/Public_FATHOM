import Link from 'next/link';
import { Check, Circle, Lock, RotateCw, Clock } from 'lucide-react';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { loadProgress, summarize, type GateMark } from '@/lib/progress';
import { STAGES } from '@/lib/stages';

export const metadata = { title: 'Progress' };

function GateIcon({ mark }: { mark: GateMark }) {
  if (mark === 'passed') return <Check size={14} strokeWidth={1.5} className="text-racing-green-lit" />;
  if (mark === 'in_progress') return <Clock size={14} strokeWidth={1.5} className="text-gold-leaf" />;
  if (mark === 'locked') return <Lock size={14} strokeWidth={1} className="text-mist" />;
  if (mark === 'refresh') return <RotateCw size={14} strokeWidth={1.5} className="text-chrome" />;
  return <Circle size={12} strokeWidth={1} className="text-mist" />;
}

export default async function ProgressPage() {
  const snap = await loadProgress();
  if (!snap) {
    return (
      <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
        <div className="max-w-5xl mx-auto">
          <p className="font-sans text-body text-chrome">
            PROGRESS.md não encontrado.
          </p>
        </div>
      </section>
    );
  }

  const totals = summarize(snap.rows);
  const percent = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-6xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Progress' },
          ]}
        />
        <EyebrowHeading
          eyebrow="Estado atual"
          title="Progress"
          subtitle="Dashboard de portões. Atualizado a cada commit no PROGRESS.md do repo. Source of truth: o arquivo Markdown."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 mb-16">
          <Stat label="Estágio ativo" value={snap.activeStage || '—'} />
          <Stat label="Módulo ativo" value={snap.activeModule || '—'} />
          <Stat label="Próximo" value={snap.nextModule || '—'} />
          <Stat label="Atualizado" value={snap.updatedAt || '—'} />
        </div>

        <div className="border border-mist/50 bg-graphite p-8 mb-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-1">
                Conclusão
              </p>
              <p className="font-display text-display-md text-pearl">
                {totals.done} <span className="text-chrome text-base font-mono">/ {totals.total}</span>
              </p>
            </div>
            <p className="font-mono text-caption text-chrome">{percent}%</p>
          </div>
          <div className="h-px bg-mist/40 relative">
            <div
              className="absolute top-0 left-0 h-px bg-gold-leaf"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-6 mt-6 font-mono text-caption text-chrome tracking-wide">
            <span className="flex items-center gap-2"><GateIcon mark="passed" /> {totals.done} done</span>
            <span className="flex items-center gap-2"><GateIcon mark="in_progress" /> {totals.inProgress} ativos</span>
            <span className="flex items-center gap-2"><GateIcon mark="refresh" /> {totals.refresh} refresh</span>
            <span className="flex items-center gap-2"><GateIcon mark="pending" /> {totals.pending} pendentes</span>
          </div>
        </div>

        {STAGES.map((stage) => {
          const stageRows = snap.rows.filter((r) => r.stageNumber === stage.number);
          if (stageRows.length === 0) return null;
          return (
            <div key={stage.id} className="mb-16">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-1">
                    Estágio {String(stage.number).padStart(2, '0')}
                  </p>
                  <h3 className="font-display text-display-md text-pearl">{stage.title}</h3>
                </div>
                <Link
                  href={`/stages/${stage.id}`}
                  className="font-mono text-caption text-chrome tracking-luxury uppercase hover:text-pearl transition-colors duration-200"
                >
                  View Stage →
                </Link>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto_auto_120px] md:grid-cols-[100px_1fr_60px_60px_60px_120px] items-center
                              gap-3 md:gap-6 py-3 border-b border-mist
                              px-4 -mx-4 font-mono text-caption text-chrome tracking-luxury uppercase">
                <span className="hidden md:block">ID</span>
                <span>Módulo</span>
                <span className="text-center">Conc.</span>
                <span className="text-center">Prát.</span>
                <span className="text-center">Conx.</span>
                <span className="text-right">Status</span>
              </div>

              {stageRows.map((row) => {
                const linkId = row.rawId.toLowerCase();
                const isCapstone = row.rawId.startsWith('CAPSTONE');
                return (
                  <div
                    key={row.rawId}
                    className="grid grid-cols-[1fr_auto_auto_auto_120px] md:grid-cols-[100px_1fr_60px_60px_60px_120px] items-center
                               gap-3 md:gap-6 py-4 border-b border-mist/40 px-4 -mx-4
                               hover:bg-carbon/50 transition-colors duration-200 group"
                  >
                    <span className="hidden md:block font-mono text-caption text-racing-green-lit tracking-wide">
                      {row.rawId}
                    </span>
                    <Link
                      href={`/modules/${linkId}`}
                      className="font-sans text-body text-pearl group-hover:text-gold-leaf transition-colors duration-200 truncate"
                    >
                      <span className="md:hidden font-mono text-caption text-racing-green-lit tracking-wide mr-2">
                        {isCapstone ? 'Capstone' : row.rawId}
                      </span>
                      {row.module}
                    </Link>
                    <span className="flex justify-center"><GateIcon mark={row.conceitual} /></span>
                    <span className="flex justify-center"><GateIcon mark={row.pratico} /></span>
                    <span className="flex justify-center"><GateIcon mark={row.conexoes} /></span>
                    <span className={`font-mono text-caption tracking-wide text-right ${
                      row.status === 'DONE' ? 'text-racing-green-lit' : 'text-chrome/70'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-2">{label}</p>
      <p className="font-display text-xl text-pearl">{value}</p>
    </div>
  );
}
