import { notFound } from 'next/navigation';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getMetaDoc, getRootDoc, stripFrontmatter } from '@/lib/content';

interface DocConfig {
  slug: string;
  title: string;
  eyebrow: string;
  source: 'root' | 'meta';
  file: string;
}

const DOCS: DocConfig[] = [
  // Root protocol docs
  { slug: 'mentor', title: 'Mentor Protocol', eyebrow: 'Contrato canônico', source: 'root', file: 'MENTOR' },
  { slug: 'study-protocol', title: 'Study Protocol', eyebrow: 'Disciplina cognitiva', source: 'root', file: 'STUDY-PROTOCOL' },
  // Meta docs
  { slug: 'release-notes', title: 'Release Notes', eyebrow: 'Versão atual', source: 'meta', file: 'RELEASE-NOTES.md' },
  { slug: 'changelog', title: 'Changelog', eyebrow: 'Histórico', source: 'meta', file: 'CHANGELOG.md' },
  { slug: 'decision-log', title: 'Decision Log', eyebrow: 'Archaeology', source: 'meta', file: 'DECISION-LOG.md' },
  { slug: 'sprint-next', title: 'Sprint Next', eyebrow: 'Backlog priorizado', source: 'meta', file: 'SPRINT-NEXT.md' },
  { slug: 'study-plans', title: 'Study Plans', eyebrow: 'Templates de cadência', source: 'meta', file: 'STUDY-PLANS.md' },
  { slug: 'self-assessment', title: 'Self-Assessment', eyebrow: 'Calibração inicial', source: 'meta', file: 'SELF-ASSESSMENT.md' },
  { slug: 'glossary', title: 'Glossary', eyebrow: 'Termos canônicos', source: 'meta', file: 'GLOSSARY.md' },
  { slug: 'capstone-evolution', title: 'Capstone Evolution', eyebrow: 'Logística v0 → v4', source: 'meta', file: 'CAPSTONE-EVOLUTION.md' },
  { slug: 'codebase-tours', title: 'Codebase Tours', eyebrow: '20 reading paths', source: 'meta', file: 'CODEBASE-TOURS.md' },
  { slug: 'stack-comparisons', title: 'Stack Comparisons', eyebrow: 'Cross-stack mapping', source: 'meta', file: 'STACK-COMPARISONS.md' },
  { slug: 'module-template', title: 'Module Template', eyebrow: 'Template oficial', source: 'meta', file: 'MODULE-TEMPLATE.md' },
  { slug: 'reading-list', title: 'Reading List', eyebrow: 'Livros canônicos', source: 'meta', file: 'reading-list.md' },
  { slug: 'elite-references', title: 'Elite References', eyebrow: 'Repos, blogs, talks', source: 'meta', file: 'elite-references.md' },
  { slug: 'antipatterns', title: 'Antipatterns', eyebrow: 'O que não fazer', source: 'meta', file: 'ANTIPATTERNS.md' },
  { slug: 'interview-prep', title: 'Interview Prep', eyebrow: 'Mapping tier-1', source: 'meta', file: 'INTERVIEW-PREP.md' },
];

export async function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) return { title: 'Doc' };
  return {
    title: doc.title,
    description: doc.eyebrow,
    alternates: { canonical: `/docs/${doc.slug}` },
    openGraph: {
      title: `${doc.title} — Fathom`,
      description: doc.eyebrow,
      url: `/docs/${doc.slug}`,
    },
  };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) notFound();

  const raw =
    doc.source === 'root'
      ? await getRootDoc(doc.file as 'MENTOR' | 'STUDY-PROTOCOL' | 'README' | 'PROGRESS')
      : await getMetaDoc(doc.file);

  if (!raw) notFound();

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs' },
            { label: doc.title },
          ]}
        />
        <EyebrowHeading eyebrow={doc.eyebrow} title={doc.title} />
        <div className="mt-16">
          <MarkdownContent source={stripFrontmatter(raw)} />
        </div>
      </div>
    </article>
  );
}
