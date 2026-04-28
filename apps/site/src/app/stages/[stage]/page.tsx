import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { STAGES, getStage } from '@/lib/stages';
import { getStageModules, getStageReadme, stripFrontmatter } from '@/lib/content';
import { ModuleRow, ModuleRowHeader } from '@/components/ModuleRow';
import { MarkdownContent } from '@/components/MarkdownContent';

export async function generateStaticParams() {
  return STAGES.map((s) => ({ stage: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: stageId } = await params;
  const stage = getStage(stageId);
  return { title: stage ? `${stage.title} — ${stage.subtitle}` : 'Stage' };
}

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage: stageId } = await params;
  const stage = getStage(stageId);
  if (!stage) notFound();

  const modules = await getStageModules(stage);
  const readme = await getStageReadme(stage);
  const number = String(stage.number).padStart(2, '0');

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/stages"
          className="inline-flex items-center gap-2 font-mono text-caption text-chrome
                     tracking-luxury uppercase mb-12 hover:text-pearl transition-colors duration-200"
        >
          <ArrowLeft size={14} strokeWidth={1} /> All Stages
        </Link>

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
        <p className="font-sans text-body-lg text-chrome leading-relaxed max-w-3xl mb-16">
          {stage.tagline}
        </p>

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
