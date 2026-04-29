/**
 * Single source of truth for the meta-docs catalog.
 * Drives /docs (index page), /docs/[slug] (renderer), and CommandPalette
 * search entries. Adding a new doc requires editing only this file.
 */

export type DocCategory = 'protocol' | 'roadmap' | 'reference' | 'meta';
export type DocSource = 'root' | 'meta';

export interface DocEntry {
  slug: string;
  title: string;
  eyebrow: string;
  category: DocCategory;
  source: DocSource;
  /** filename relative to source root (no leading path) */
  file: string;
  /** show "core" tag in /docs index */
  highlight?: boolean;
}

export const DOCS: DocEntry[] = [
  // Protocol (root .md files)
  {
    slug: 'mentor',
    title: 'Mentor Protocol',
    eyebrow: 'Contrato canônico',
    category: 'protocol',
    source: 'root',
    file: 'MENTOR',
    highlight: true,
  },
  {
    slug: 'study-protocol',
    title: 'Study Protocol',
    eyebrow: 'Disciplina cognitiva',
    category: 'protocol',
    source: 'root',
    file: 'STUDY-PROTOCOL',
    highlight: true,
  },
  {
    slug: 'self-assessment',
    title: 'Self-Assessment',
    eyebrow: 'Calibração inicial',
    category: 'protocol',
    source: 'meta',
    file: 'SELF-ASSESSMENT.md',
  },

  // Roadmap / archaeology
  {
    slug: 'release-notes',
    title: 'Release Notes',
    eyebrow: 'Versão atual',
    category: 'roadmap',
    source: 'meta',
    file: 'RELEASE-NOTES.md',
  },
  {
    slug: 'changelog',
    title: 'Changelog',
    eyebrow: 'Histórico append-only',
    category: 'roadmap',
    source: 'meta',
    file: 'CHANGELOG.md',
  },
  {
    slug: 'decision-log',
    title: 'Decision Log',
    eyebrow: 'Archaeology',
    category: 'roadmap',
    source: 'meta',
    file: 'DECISION-LOG.md',
  },
  {
    slug: 'sprint-next',
    title: 'Sprint Next',
    eyebrow: 'Backlog priorizado',
    category: 'roadmap',
    source: 'meta',
    file: 'SPRINT-NEXT.md',
  },

  // Reference
  {
    slug: 'study-plans',
    title: 'Study Plans',
    eyebrow: '7 templates de cadência',
    category: 'reference',
    source: 'meta',
    file: 'STUDY-PLANS.md',
  },
  {
    slug: 'capstone-evolution',
    title: 'Capstone Evolution',
    eyebrow: 'Logística v0 → v4',
    category: 'reference',
    source: 'meta',
    file: 'CAPSTONE-EVOLUTION.md',
  },
  {
    slug: 'codebase-tours',
    title: 'Codebase Tours',
    eyebrow: '20 reading paths',
    category: 'reference',
    source: 'meta',
    file: 'CODEBASE-TOURS.md',
  },
  {
    slug: 'stack-comparisons',
    title: 'Stack Comparisons',
    eyebrow: 'Cross-stack mapping',
    category: 'reference',
    source: 'meta',
    file: 'STACK-COMPARISONS.md',
  },
  {
    slug: 'reading-list',
    title: 'Reading List',
    eyebrow: 'Livros canônicos',
    category: 'reference',
    source: 'meta',
    file: 'reading-list.md',
  },
  {
    slug: 'elite-references',
    title: 'Elite References',
    eyebrow: 'Repos / blogs / talks',
    category: 'reference',
    source: 'meta',
    file: 'elite-references.md',
  },
  {
    slug: 'antipatterns',
    title: 'Antipatterns',
    eyebrow: 'O que não fazer',
    category: 'reference',
    source: 'meta',
    file: 'ANTIPATTERNS.md',
  },
  {
    slug: 'interview-prep',
    title: 'Interview Prep',
    eyebrow: 'Mapping tier-1',
    category: 'reference',
    source: 'meta',
    file: 'INTERVIEW-PREP.md',
  },

  // Meta
  {
    slug: 'module-template',
    title: 'Module Template',
    eyebrow: 'Template oficial',
    category: 'meta',
    source: 'meta',
    file: 'MODULE-TEMPLATE.md',
  },
];

export const DOC_CATEGORIES: { id: DocCategory; label: string; eyebrow: string }[] = [
  { id: 'protocol', label: 'Protocolos', eyebrow: 'Contratos do framework' },
  { id: 'roadmap', label: 'Roadmap & Archaeology', eyebrow: 'Histórico e direção' },
  { id: 'reference', label: 'Referências', eyebrow: 'Materiais de apoio' },
  { id: 'meta', label: 'Meta', eyebrow: 'Sobre o framework em si' },
];

export function getDocBySlug(slug: string): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}
