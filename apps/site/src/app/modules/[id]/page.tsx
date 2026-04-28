import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, Code2, FileText } from 'lucide-react';
import {
  getAllModules,
  getModuleByRawId,
  getNeighborModules,
  readingMetadata,
} from '@/lib/content';
import { getStage } from '@/lib/stages';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ModuleNav } from '@/components/ModuleNav';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  StructuredData,
  buildBreadcrumbLd,
  buildTechArticleLd,
} from '@/components/StructuredData';
import { TableOfContents } from '@/components/TableOfContents';
import { extractToc } from '@/lib/toc';

export async function generateStaticParams() {
  const all = await getAllModules();
  return all.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await getModuleByRawId(id);
  if (!mod) return { title: 'Módulo' };

  // Pull a brief description from the first non-trivial paragraph after frontmatter
  const desc = mod.content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 80 && !s.startsWith('|') && !s.startsWith('-'))
    ?.slice(0, 160);

  return {
    title: `${mod.rawId} — ${mod.title}`,
    description: desc ?? `Módulo ${mod.rawId} do Fathom — ${mod.title}.`,
    keywords: [mod.rawId, mod.title, ...(mod.prereqs ?? [])],
    openGraph: {
      title: `${mod.rawId} — ${mod.title}`,
      description: desc,
    },
  };
}

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await getModuleByRawId(id);
  if (!mod) notFound();

  const stage = getStage(mod.stageId)!;
  const stageNumber = String(stage.number).padStart(2, '0');
  const { prev, next } = await getNeighborModules(mod.rawId);
  const meta = readingMetadata(mod.content);
  const toc = extractToc(mod.content);

  // Quick description from first non-trivial paragraph (mirrors generateMetadata).
  const desc = mod.content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 80 && !s.startsWith('|') && !s.startsWith('-'))
    ?.slice(0, 160);

  const breadcrumbLd = buildBreadcrumbLd([
    { name: 'Home', href: '/' },
    { name: stage.title, href: `/stages/${stage.id}` },
    { name: mod.rawId },
  ]);

  const articleLd = buildTechArticleLd({
    title: mod.title,
    rawId: mod.rawId,
    description: desc,
    url: `/modules/${mod.id}`,
    prereqs: mod.prereqs,
  });

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <StructuredData data={[breadcrumbLd, articleLd]} />
      <div className="max-w-4xl xl:max-w-6xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: stage.title, href: `/stages/${stage.id}` },
            { label: mod.rawId },
          ]}
        />

        <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3">
          Estágio {stageNumber} · {mod.rawId}
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

        <div className="xl:grid xl:grid-cols-[1fr_16rem] xl:gap-12">
          <div className="min-w-0">
            <MarkdownContent source={mod.content} />
            <ModuleNav prev={prev} next={next} />
          </div>
          <TableOfContents items={toc} />
        </div>
      </div>
    </article>
  );
}
