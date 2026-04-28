import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import Link from 'next/link';
import { Children, isValidElement, type ComponentProps, type ReactElement } from 'react';
import { MermaidDiagram } from './MermaidDiagram';

interface Props {
  source: string;
}

function rewriteHref(href: string | undefined): string | undefined {
  if (!href) return href;
  if (/^(https?:|mailto:|#|tel:)/.test(href)) return href;

  let target = href.replace(/\\/g, '/');

  // Strip leading framework/ — site routes don't carry that prefix
  target = target.replace(/^\.?\/?framework\//, '');

  // Strip leading ../ pairs (we render from a flat /modules namespace)
  target = target.replace(/^(\.\.\/)+/, '');

  // Module link: 01-novice/N01-computation-model.md → /modules/n01
  const modMatch = target.match(/^(\d{2}-[a-z]+)\/([A-Z]+\d+|CAPSTONE-[a-z]+)[^\/]*\.md(#.*)?$/);
  if (modMatch) {
    const id = modMatch[2].toLowerCase();
    return `/modules/${id}${modMatch[3] ?? ''}`;
  }

  // Stage README: 01-novice/README.md → /stages/novice
  const stageMatch = target.match(/^(\d{2})-([a-z]+)\/README\.md(#.*)?$/);
  if (stageMatch) {
    return `/stages/${stageMatch[2]}${stageMatch[3] ?? ''}`;
  }

  // 00-meta docs → /docs/{lowercase-name}
  const metaMatch = target.match(/^00-meta\/([A-Za-z0-9-_]+)\.md(#.*)?$/);
  if (metaMatch) {
    return `/docs/${metaMatch[1].toLowerCase()}${metaMatch[2] ?? ''}`;
  }

  // Root docs: README.md, MENTOR.md, STUDY-PROTOCOL.md, PROGRESS.md
  const rootMatch = target.match(/^(README|MENTOR|STUDY-PROTOCOL|PROGRESS)\.md(#.*)?$/);
  if (rootMatch) {
    const slug = rootMatch[1].toLowerCase();
    if (slug === 'readme') return `/${rootMatch[2] ?? ''}`;
    if (slug === 'progress') return `/progress${rootMatch[2] ?? ''}`;
    return `/docs/${slug}${rootMatch[2] ?? ''}`;
  }

  return target;
}

export function MarkdownContent({ source }: Props) {
  return (
    <div className="prose-fathom max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a({ href, children, ...rest }: ComponentProps<'a'>) {
            const rewritten = rewriteHref(href);
            if (rewritten && rewritten.startsWith('/')) {
              return (
                <Link href={rewritten} {...(rest as Record<string, unknown>)}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={rewritten}
                target={rewritten?.startsWith('http') ? '_blank' : undefined}
                rel={rewritten?.startsWith('http') ? 'noreferrer' : undefined}
                {...rest}
              >
                {children}
              </a>
            );
          },
          pre({ children, ...rest }: ComponentProps<'pre'>) {
            const child = Children.toArray(children).find(isValidElement) as
              | ReactElement<{ className?: string; children?: unknown }>
              | undefined;
            const lang = child?.props?.className?.match(/language-([\w-]+)/)?.[1];
            if (lang === 'mermaid') {
              const source = String(child?.props?.children ?? '').trim();
              return <MermaidDiagram source={source} />;
            }
            return <pre {...rest}>{children}</pre>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
