import { STAGES } from '@/lib/stages';
import { StageCard } from '@/components/StageCard';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import { loadProgress } from '@/lib/progress';

export const metadata = {
  title: 'Stages',
  description: 'Os 5 estágios do Fathom — Novice, Apprentice, Professional, Senior, Staff/Principal.',
  alternates: { canonical: '/stages' },
};

export default async function StagesPage() {
  const snap = await loadProgress();
  const progressByStage = new Map<number, { done: number; total: number }>();
  if (snap) {
    for (const row of snap.rows) {
      const cur = progressByStage.get(row.stageNumber) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (row.status === 'DONE') cur.done += 1;
      progressByStage.set(row.stageNumber, cur);
    }
  }

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Stages' },
          ]}
        />
        <EyebrowHeading
          eyebrow="Mapa do Framework"
          title="Os cinco estágios"
          subtitle="Cada estágio cobre um nível de abstração distinto. A ordem importa — prereqs entre estágios são reais e bloqueantes."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {STAGES.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              progress={progressByStage.get(stage.number)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
