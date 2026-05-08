import { EyebrowHeading } from '@/components/EyebrowHeading';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getAllModules, getMetaDoc, stripFrontmatter } from '@/lib/content';
import { STAGES } from '@/lib/stages';

export const metadata = {
  title: 'Module Index',
  description: 'Mapa global do framework com DAG mermaid + tabela completa de prereqs.',
  alternates: { canonical: '/index' },
};

export default async function IndexPage() {
  const raw = await getMetaDoc('INDEX.md');
  const all = await getAllModules();
  const totalModules = all.filter((m) => !m.rawId.startsWith('CAPSTONE')).length;
  const totalCapstones = all.filter((m) => m.rawId.startsWith('CAPSTONE')).length;

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Index' },
          ]}
        />
        <EyebrowHeading
          eyebrow="Mapa Global"
          title="Module Index"
          subtitle="Tabela completa de módulos com prereqs cross-stage e DAG de dependências. Origem: framework/00-meta/INDEX.md"
        />

        <div className="mt-16 mb-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-mist/40 py-8">
          <Stat label="Estágios" value={`${STAGES.length}`} />
          <Stat label="Módulos" value={`${totalModules}`} />
          <Stat label="Capstones" value={`${totalCapstones}`} />
          <Stat
            label="Total"
            value={`${all.length}`}
            sub="incl. capstones"
          />
        </div>

        <div>
          {raw ? (
            <MarkdownContent source={stripFrontmatter(raw)} />
          ) : (
            <p className="font-sans text-body text-chrome">INDEX.md não encontrado.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-2">{label}</p>
      <p className="font-display text-display-md text-pearl leading-none mb-1">{value}</p>
      {sub && <p className="font-mono text-caption text-fog tracking-wide">{sub}</p>}
    </div>
  );
}
