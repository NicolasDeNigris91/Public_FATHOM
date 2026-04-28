import type { MetadataRoute } from 'next';
import { STAGES } from '@/lib/stages';
import { getAllModules } from '@/lib/content';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fathom.nicolaspilegidenigris.dev';

const DOC_SLUGS = [
  'mentor',
  'study-protocol',
  'release-notes',
  'changelog',
  'decision-log',
  'sprint-next',
  'study-plans',
  'self-assessment',
  'glossary',
  'capstone-evolution',
  'codebase-tours',
  'stack-comparisons',
  'module-template',
  'reading-list',
  'elite-references',
  'antipatterns',
  'interview-prep',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const all = await getAllModules();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/stages`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/progress`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/index`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const stagePages: MetadataRoute.Sitemap = STAGES.map((s) => ({
    url: `${SITE_URL}/stages/${s.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const modulePages: MetadataRoute.Sitemap = all.map((m) => ({
    url: `${SITE_URL}/modules/${m.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const docPages: MetadataRoute.Sitemap = DOC_SLUGS.map((slug) => ({
    url: `${SITE_URL}/docs/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticPages, ...stagePages, ...modulePages, ...docPages];
}
