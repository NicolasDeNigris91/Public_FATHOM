import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Code2, FileText } from 'lucide-react';
import {
  getAllModules,
  getModuleByRawId,
  getNeighborModules,
  readingMetadata,
} from '@/lib/content';
import { getStage } from '@/lib/stages';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ModuleNav } from '@/components/ModuleNav';

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
  const { prev, next } = await getNeighborModules(mod.rawId);
  const meta = readingMetadata(mod.content);

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

        <div className="mb-12 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-caption text-chrome tracking-wide">
          <span className="inline-flex items-center gap-2">
            <Clock size={12} strokeWidth={1} />
            <span>~{meta.minutes} min read</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText size={12} strokeWidth={1} />
            <span>{meta.words.toLocaleString('pt-BR')} palavras</span>
          </span>
          {meta.codeBlocks > 0 && (
            <span className="inline-flex items-center gap-2">
              <Code2 size={12} strokeWidth={1} />
              <span>{meta.codeBlocks} code blocks</span>
            </span>
          )}
        </div>

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
        <ModuleNav prev={prev} next={next} />
      </div>
    </article>
  );
}
