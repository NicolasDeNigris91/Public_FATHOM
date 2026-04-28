/**
 * Server-only JSON-LD emitter. Pass a structured-data object,
 * renders it as <script type="application/ld+json">.
 *
 * Schema.org types we use:
 * - BreadcrumbList for navigation hierarchy
 * - TechArticle for module pages
 * - WebSite for landing
 * - CreativeWork / Book for library entries
 */
interface Props {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function StructuredData({ data }: Props) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fathom.nicolaspilegidenigris.dev';

export function buildBreadcrumbLd(items: { name: string; href?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      ...(it.href ? { item: `${SITE_URL}${it.href}` } : {}),
    })),
  };
}

export function buildTechArticleLd(args: {
  title: string;
  rawId: string;
  description?: string;
  url: string;
  prereqs?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: args.title,
    name: `${args.rawId} — ${args.title}`,
    url: `${SITE_URL}${args.url}`,
    description: args.description,
    inLanguage: 'pt-BR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Fathom',
      url: SITE_URL,
    },
    author: {
      '@type': 'Person',
      name: 'Nicolas De Nigris',
      url: 'https://github.com/NicolasDeNigris91',
    },
    keywords: [args.rawId, args.title, ...(args.prereqs ?? [])].join(', '),
  };
}

export function buildWebSiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Fathom',
    alternateName: 'Fathom — Framework de Maestria Full Stack',
    url: SITE_URL,
    description:
      'Trilha mastery-based de Novice a Staff/Principal Software Engineer.',
    inLanguage: 'pt-BR',
    author: {
      '@type': 'Person',
      name: 'Nicolas De Nigris',
      url: 'https://github.com/NicolasDeNigris91',
    },
  };
}
