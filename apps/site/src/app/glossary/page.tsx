import { EyebrowHeading } from '@/components/EyebrowHeading';
import { GlossaryClient } from '@/components/GlossaryClient';
import { Breadcrumb } from '@/components/Breadcrumb';
import { loadGlossary } from '@/lib/content';

export const metadata = { title: 'Glossary' };

export default async function GlossaryPage() {
  const { sections, terms } = await loadGlossary();

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Glossary' },
          ]}
        />
        <EyebrowHeading
          eyebrow={`${terms.length} Termos Canônicos`}
          title="Glossary"
          subtitle="Vocabulário técnico do framework. Termos em EN original, definição curta. Use a busca pra desambiguar ou refrescar — não substitui leitura do módulo onde o termo aparece."
        />
        <div className="mt-16">
          <GlossaryClient terms={terms} sections={sections} />
        </div>
      </div>
    </section>
  );
}
