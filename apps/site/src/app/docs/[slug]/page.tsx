import { notFound } from 'next/navigation';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';
import { getMetaDoc, getRootDoc, stripFrontmatter } from '@/lib/content';
import { DOCS, getDocBySlug } from '@/lib/docs';

export async function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
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
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const raw =
    doc.source === 'root'
      ? await getRootDoc(doc.file as 'MENTOR' | 'STUDY-PROTOCOL' | 'README' | 'PROGRESS')
      : await getMetaDoc(doc.file);

  if (!raw) notFound();

  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <ReadingProgressBar />
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
