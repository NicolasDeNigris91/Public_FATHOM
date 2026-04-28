import { STAGES } from '@/lib/stages';
import { StageCard } from '@/components/StageCard';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';

export const metadata = {
  title: 'Stages',
};

export default function StagesPage() {
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
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </div>
    </section>
  );
}
