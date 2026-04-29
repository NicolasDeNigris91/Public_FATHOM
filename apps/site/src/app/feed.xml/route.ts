import { NextResponse } from 'next/server';
import { getAllModules } from '@/lib/content';
import { getStage } from '@/lib/stages';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fathom.nicolaspilegidenigris.dev';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * RSS 2.0 feed pra módulos com status `done`. Atualiza a cada build.
 * Subscribers veem novos módulos done conforme PROGRESS.md avança.
 *
 * Quando 0 módulos done, feed sai vazio mas válido (passa em
 * validators).
 */
export async function GET() {
  const all = await getAllModules();
  const done = all.filter((m) => {
    const s = (m.frontmatter.status ?? '').toLowerCase();
    return s.startsWith('done');
  });

  const now = new Date().toUTCString();
  const items = done
    .map((m) => {
      const stage = getStage(m.stageId);
      const stageLabel = stage ? stage.title : '';
      const link = `${SITE_URL}/modules/${m.id}`;
      return `    <item>
      <title>${escapeXml(`${m.rawId} — ${m.title}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <category>${escapeXml(stageLabel)}</category>
      <description>${escapeXml(`Módulo ${m.rawId} concluído. Estágio: ${stageLabel}.`)}</description>
      <pubDate>${now}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fathom — Módulos concluídos</title>
    <link>${escapeXml(SITE_URL)}</link>
    <atom:link href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>Trilha mastery-based de Novice a Staff/Principal. Módulos com status done.</description>
    <language>pt-BR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Fathom site</generator>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
