import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, Code2, FileText } from 'lucide-react';
import {
  getAllModules,
  getModuleByRawId,
  getNeighborModules,
  getDependents,
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
import { StatusBadge } from '@/components/StatusBadge';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';
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
    alternates: {
      canonical: `/modules/${mod.id}`,
    },
    openGraph: {
      title: `${mod.rawId} — ${mod.title}`,
      description: desc,
      type: 'article',
      url: `/modules/${mod.id}`,
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

  // Resolve status of each prereq so the chip can reflect it visually.
  const prereqStatus = await Promise.all(
    mod.prereqs.map(async (p) => {
      const target = await getModuleByRawId(p);
      return { rawId: p, status: target?.frontmatter.status ?? 'pending' };
    }),
  );

  // Modules that gate behind this one — useful pra "destrava: …"
  const dependents = await getDependents(mod.rawId);

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
      <ReadingProgressBar />
      <StructuredData data={[breadcrumbLd, articleLd]} />
      <div className="max-w-4xl xl:max-w-6xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: stage.title, href: `/stages/${stage.id}` },
            { label: mod.rawId },
          ]}
        />

        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
            Estágio {stageNumber} · {mod.rawId}
          </p>
          <StatusBadge status={mod.frontmatter.status} />
        </div>
        <h1 className="font-display text-display-xl text-pearl tracking-tight leading-tight mb-4">
          {mod.title}
        </h1>
        <div className="h-px bg-gold-leaf w-32 mb-8" aria-hidden="true" />

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
            {prereqStatus.map(({ rawId, status }) => {
              const s = (status ?? '').toLowerCase();
              const tone = s.startsWith('done')
                ? 'text-racing-green-lit border-racing-green-lit/40 hover:border-racing-green-lit'
                : s.includes('progress')
                  ? 'text-gold-leaf border-gold-leaf/40 hover:border-gold-leaf'
                  : 'text-chrome border-mist/60 hover:border-platinum hover:text-platinum';
              return (
                <Link
                  key={rawId}
                  href={`/modules/${rawId.toLowerCase()}`}
                  title={`Status: ${status}`}
                  className={`font-mono text-caption tracking-wide px-3 py-1 border transition-colors duration-200 ${tone}`}
                >
                  {rawId}
                </Link>
              );
            })}
          </div>
        )}

        <div className="xl:grid xl:grid-cols-[1fr_16rem] xl:gap-12">
          <div className="min-w-0">
            <MarkdownContent source={mod.content} />

            {dependents.length > 0 && (
              <section
                aria-label="Módulos que dependem deste"
                className="mt-16 pt-12 border-t border-mist/40"
              >
                <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
                  Destrava
                </p>
                <p className="font-sans text-body text-chrome leading-relaxed mb-6 max-w-3xl">
                  {mod.rawId} é prereq dos seguintes módulos:
                </p>
                <ul className="flex flex-wrap gap-2">
                  {dependents.map((d) => (
                    <li key={d.rawId}>
                      <Link
                        href={`/modules/${d.id}`}
                        className="inline-flex items-center gap-2 font-mono text-caption tracking-wide
                                   text-chrome border border-mist/50 px-3 py-1.5
                                   hover:border-gold-leaf hover:text-gold-leaf transition-colors duration-200"
                      >
                        <span className="text-racing-green-lit">{d.rawId}</span>
                        <span className="text-chrome/80">{d.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ModuleNav prev={prev} next={next} />
          </div>
          <TableOfContents items={toc} />
        </div>
      </div>
    </article>
  );
}
