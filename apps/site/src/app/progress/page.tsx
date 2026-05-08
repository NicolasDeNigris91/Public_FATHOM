import Link from 'next/link';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { OverallProgressMeter } from '@/components/OverallProgressMeter';
import { ResetProgressButton } from '@/components/ResetProgressButton';
import { VisitorStatusIcon } from '@/components/VisitorStatusIcon';
import { STAGES } from '@/lib/stages';
import { getStageModules } from '@/lib/content';

export const metadata = {
  title: 'Progress',
  description: 'Teu progresso pelos módulos do Fathom — salvo no teu navegador.',
  alternates: { canonical: '/progress' },
};

export default async function ProgressPage() {
  const stages = await Promise.all(
    STAGES.map(async (stage) => ({
      stage,
      modules: await getStageModules(stage),
    })),
  );

  const allRefs = stages.flatMap(({ modules }) =>
    modules.map((m) => ({ rawId: m.rawId, prereqs: m.prereqs })),
  );

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-6xl mx-auto">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Progress' }]} />
        <EyebrowHeading
          eyebrow="Teu caminho"
          title="Progress"
          subtitle="Marcado conforme você passa o quiz de cada módulo. Salvo apenas no teu navegador, sem login. Limpe a qualquer momento."
        />

        <div className="mt-16 mb-12">
          <OverallProgressMeter modules={allRefs} variant="banner" />
        </div>

        <div className="mb-20">
          <ResetProgressButton />
        </div>

        {stages.map(({ stage, modules }) => {
          if (modules.length === 0) return null;
          const refs = modules.map((m) => ({ rawId: m.rawId, prereqs: m.prereqs }));
          return (
            <div key={stage.id} className="mb-16">
              <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
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
                  Ver Estágio →
                </Link>
              </div>

              <div className="mb-6 max-w-xl">
                <OverallProgressMeter modules={refs} variant="compact" />
              </div>

              <div
                className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px] items-center
                           gap-4 md:gap-8 py-3 border-b border-mist px-4 -mx-4
                           font-mono text-caption text-chrome tracking-luxury uppercase"
              >
                <span>ID</span>
                <span>Módulo</span>
                <span className="hidden md:block text-right">Prereqs</span>
                <span className="text-right">Estado</span>
              </div>

              {modules.map((m) => {
                const isCapstone = m.rawId.startsWith('CAPSTONE');
                return (
                  <div
                    key={m.fileName}
                    className="group grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px] items-center
                               gap-4 md:gap-8 py-4 border-b border-mist/40
                               hover:bg-carbon/50 transition-colors duration-200 px-4 -mx-4"
                  >
                    <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
                      {isCapstone ? 'Capstone' : m.rawId}
                    </span>
                    <Link
                      href={`/modules/${m.id}`}
                      className="font-sans text-body text-pearl group-hover:text-gold-leaf transition-colors duration-200 truncate"
                    >
                      {m.title}
                    </Link>
                    <span className="flex justify-center"><GateIcon mark={row.conceitual} /></span>
                    <span className="flex justify-center"><GateIcon mark={row.pratico} /></span>
                    <span className="flex justify-center"><GateIcon mark={row.conexoes} /></span>
                    <span className={`font-mono text-caption tracking-wide text-right ${
                      row.status === 'DONE' ? 'text-racing-green-lit' : 'text-fog'
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
