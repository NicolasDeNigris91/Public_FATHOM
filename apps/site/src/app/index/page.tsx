import { EyebrowHeading } from '@/components/EyebrowHeading';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getMetaDoc, stripFrontmatter } from '@/lib/content';

export const metadata = {
  title: 'Module Index',
  description: 'Mapa global do framework com DAG mermaid + tabela completa de prereqs.',
  alternates: { canonical: '/index' },
};

export default async function IndexPage() {
  const raw = await getMetaDoc('INDEX.md');
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
        <div className="mt-16">
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
