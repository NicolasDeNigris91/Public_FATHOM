'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  source: string;
}

export function MermaidDiagram({ source }: Props) {
  const id = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            background: '#0A0A0A',
            primaryColor: '#1A1A1A',
            primaryTextColor: '#F5F5F0',
            primaryBorderColor: '#3A3A3A',
            lineColor: '#3A3A3A',
            tertiaryColor: '#111111',
            secondaryColor: '#0B3D2E',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          },
          flowchart: {
            curve: 'basis',
            padding: 20,
          },
        });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, source);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Render error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <div className="my-6 border border-mist/60 bg-graphite p-4">
        <p className="font-mono text-caption text-chrome tracking-wide uppercase mb-2">
          Mermaid render failed
        </p>
        <pre className="font-mono text-caption text-chrome whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="font-mono text-caption text-chrome cursor-pointer">Source</summary>
          <pre className="font-mono text-caption text-chrome mt-2 whitespace-pre-wrap">{source}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 border border-mist/40 bg-graphite p-8 flex items-center justify-center">
        <span className="font-mono text-caption text-chrome tracking-luxury uppercase animate-pulse">
          Rendering diagram…
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 border border-mist/40 bg-graphite p-6 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
