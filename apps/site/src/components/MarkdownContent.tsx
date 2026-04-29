import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import Link from 'next/link';
import { Children, isValidElement, type ReactElement } from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { CodeBlock } from './CodeBlock';

interface Props {
  source: string;
}

function rewriteHref(href: string | undefined): string | undefined {
  if (!href) return href;
  if (/^(https?:|mailto:|#|tel:)/.test(href)) return href;

  let target = href.replace(/\\/g, '/');

  target = target.replace(/^\.?\/?framework\//, '');
  target = target.replace(/^(\.\.\/)+/, '');

  const modMatch = target.match(/^(\d{2}-[a-z]+)\/(\d{2}-\d{2}|CAPSTONE-[a-z]+)[^\/]*\.md(#.*)?$/);
  if (modMatch) {
    const id = modMatch[2].toLowerCase();
    return `/modules/${id}${modMatch[3] ?? ''}`;
  }

  const stageMatch = target.match(/^(\d{2})-([a-z]+)\/README\.md(#.*)?$/);
  if (stageMatch) {
    return `/stages/${stageMatch[2]}${stageMatch[3] ?? ''}`;
  }

  const metaMatch = target.match(/^00-meta\/([A-Za-z0-9-_]+)\.md(#.*)?$/);
  if (metaMatch) {
    return `/docs/${metaMatch[1].toLowerCase()}${metaMatch[2] ?? ''}`;
  }

  const rootMatch = target.match(/^(README|MENTOR|STUDY-PROTOCOL|PROGRESS)\.md(#.*)?$/);
  if (rootMatch) {
    const slug = rootMatch[1].toLowerCase();
    if (slug === 'readme') return `/${rootMatch[2] ?? ''}`;
    if (slug === 'progress') return `/progress${rootMatch[2] ?? ''}`;
    return `/docs/${slug}${rootMatch[2] ?? ''}`;
  }

  return target;
}

const components: Components = {
  a({ node: _node, href, children, className }) {
    const rewritten = rewriteHref(typeof href === 'string' ? href : undefined);
    if (rewritten && rewritten.startsWith('/')) {
      return (
        <Link href={rewritten} className={className}>
          {children}
        </Link>
      );
    }
    const isExternal = !!rewritten && /^https?:/.test(rewritten);
    return (
      <a
        href={rewritten}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
        className={className}
      >
        {children}
      </a>
    );
  },
  pre({ node: _node, children, ...rest }) {
    const child = Children.toArray(children).find(isValidElement) as
      | ReactElement<{ className?: string; children?: unknown }>
      | undefined;
    const lang = child?.props?.className?.match(/language-([\w-]+)/)?.[1];
    if (lang === 'mermaid') {
      const mermaidSource = String(child?.props?.children ?? '').trim();
      return <MermaidDiagram source={mermaidSource} />;
    }
    const rawText = String(child?.props?.children ?? '').replace(/\n$/, '');
    return (
      <CodeBlock rawText={rawText} lang={lang} {...rest}>
        {children}
      </CodeBlock>
    );
  },
};

export function MarkdownContent({ source }: Props) {
  return (
    <div className="prose-fathom max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
