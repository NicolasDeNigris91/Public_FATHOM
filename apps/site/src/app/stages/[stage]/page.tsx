import { notFound } from 'next/navigation';
import { STAGES, getStage } from '@/lib/stages';
import { getStageModules, getStageReadme, stripFrontmatter } from '@/lib/content';
import { ModuleRow, ModuleRowHeader } from '@/components/ModuleRow';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Breadcrumb } from '@/components/Breadcrumb';
import { StructuredData, buildBreadcrumbLd } from '@/components/StructuredData';
import { loadProgress } from '@/lib/progress';

export async function generateStaticParams() {
  return STAGES.map((s) => ({ stage: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: stageId } = await params;
  const stage = getStage(stageId);
  if (!stage) return { title: 'Stage' };
  return {
    title: `${stage.title}, ${stage.subtitle}`,
    description: stage.tagline,
    alternates: { canonical: `/stages/${stage.id}` },
    openGraph: {
      title: `${stage.title}, Estágio ${String(stage.number).padStart(2, '0')}`,
      description: stage.tagline,
      url: `/stages/${stage.id}`,
    },
  };
}

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: stageId } = await params;
  const stage = getStage(stageId);
  if (!stage) notFound();

  const modules = await getStageModules(stage);
  const readme = await getStageReadme(stage);
  const number = String(stage.number).padStart(2, '0');

  const snap = await loadProgress();
  const stageRows = snap?.rows.filter((r) => r.stageNumber === stage.number) ?? [];
  const done = stageRows.filter((r) => r.status === 'DONE').length;
  const total = stageRows.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : null;

  const breadcrumbLd = buildBreadcrumbLd([
    { name: 'Home', href: '/' },
    { name: 'Stages', href: '/stages' },
    { name: stage.title },
  ]);

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <StructuredData data={breadcrumbLd} />
      <div className="max-w-5xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Stages', href: '/stages' },
            { label: stage.title },
          ]}
        />

        <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3">
          Estágio {number}
        </p>
        <h1 className="font-display text-display-xl text-pearl tracking-tight leading-none mb-2">
          {stage.title}
        </h1>
        <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-6">
          {stage.subtitle}
        </p>
        <div className="h-px bg-gold-leaf w-32 mb-10" />
        <p className="font-sans text-body-lg text-chrome leading-relaxed max-w-3xl mb-10">
          {stage.tagline}
        </p>

        {percent !== null && (
          <div className="mb-16 max-w-md">
            <div className="flex items-end justify-between mb-2">
              <span className="font-mono text-caption text-chrome tracking-luxury uppercase">
                Progresso
              </span>
              <span className="font-mono text-caption text-chrome tracking-wide">
                {done}/{total} · {percent}%
              </span>
            </div>
            <div className="h-px bg-mist/40 relative">
              <div
                className="absolute top-0 left-0 h-px bg-gold-leaf transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-20">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
            Módulos · {modules.length}
          </p>
          <ModuleRowHeader />
          <div className="space-y-0">
            {modules.map((m) => (
              <ModuleRow key={m.fileName} module={m} />
            ))}
          </div>
        </div>

        {readme && (
          <div className="border-t border-mist/40 pt-16 mt-16">
            <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
              README do Estágio
            </p>
            <MarkdownContent source={stripFrontmatter(readme)} />
          </div>
        )}
      </div>
    </article>
  );
}
