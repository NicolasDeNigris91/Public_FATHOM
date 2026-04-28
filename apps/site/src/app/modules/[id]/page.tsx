import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllModules, getModuleByRawId } from '@/lib/content';
import { getStage } from '@/lib/stages';
import { MarkdownContent } from '@/components/MarkdownContent';

export async function generateStaticParams() {
  const all = await getAllModules();
  return all.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await getModuleByRawId(id);
  return { title: mod ? `${mod.rawId} — ${mod.title}` : 'Módulo' };
}

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await getModuleByRawId(id);
  if (!mod) notFound();

  const stage = getStage(mod.stageId)!;
  const stageNumber = String(stage.number).padStart(2, '0');

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/stages/${stage.id}`}
          className="inline-flex items-center gap-2 font-mono text-caption text-chrome
                     tracking-luxury uppercase mb-12 hover:text-pearl transition-colors duration-200"
        >
          <ArrowLeft size={14} strokeWidth={1} /> {stage.title}
        </Link>

        <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3">
          Estágio {stageNumber} · {stage.title} · {mod.rawId}
        </p>
        <h1 className="font-display text-display-xl text-pearl tracking-tight leading-tight mb-4">
          {mod.title}
        </h1>
        <div className="h-px bg-gold-leaf w-32 mb-8" />

        {mod.prereqs.length > 0 && (
          <div className="mb-12 flex flex-wrap items-center gap-3">
            <span className="font-mono text-caption text-chrome tracking-luxury uppercase">
              Prereqs
            </span>
            {mod.prereqs.map((p) => (
              <Link
                key={p}
                href={`/modules/${p.toLowerCase()}`}
                className="font-mono text-caption tracking-wide text-racing-green-lit
                           border border-mist/60 px-3 py-1
                           hover:border-gold-leaf hover:text-gold-leaf transition-colors duration-200"
              >
                {p}
              </Link>
            ))}
          </div>
        )}

        <MarkdownContent source={mod.content} />
      </div>
    </article>
  );
}
