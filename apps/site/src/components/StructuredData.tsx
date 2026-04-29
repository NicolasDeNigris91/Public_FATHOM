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
    name: `${args.rawId}: ${args.title}`,
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
    alternateName: 'Fathom, Notas de engenharia de software',
    url: SITE_URL,
    description:
      'Minhas notas de estudo de engenharia de software, organizadas por estágio.',
    inLanguage: 'pt-BR',
    author: {
      '@type': 'Person',
      name: 'Nicolas De Nigris',
      url: 'https://github.com/NicolasDeNigris91',
    },
  };
}

export function buildBookListLd(args: {
  url: string;
  books: Array<{ title: string; author: string; year?: string; url?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: `${SITE_URL}${args.url}`,
    itemListOrder: 'ItemListOrderAscending',
    numberOfItems: args.books.length,
    itemListElement: args.books.map((b, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Book',
        name: b.title,
        author: { '@type': 'Person', name: b.author },
        ...(b.year ? { datePublished: b.year } : {}),
        ...(b.url ? { url: b.url } : {}),
      },
    })),
  };
}
