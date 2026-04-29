'use client';

import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props extends HTMLAttributes<HTMLPreElement> {
  rawText: string;
  lang?: string;
}

export function CodeBlock({ rawText, lang, children, ...rest }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível
    }
  }

  return (
    <div className="relative group/codeblock">
      <pre {...rest}>{children}</pre>
      {lang && (
        <span
          className="absolute top-2 left-3 font-mono text-[0.65rem] tracking-luxury uppercase
                     text-mist/70 select-none pointer-events-none"
          aria-hidden="true"
        >
          {lang}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copiado' : 'Copiar código'}
        className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1
                    border font-mono text-[0.65rem] tracking-luxury uppercase
                    transition-colors duration-200
                    opacity-0 group-hover/codeblock:opacity-100 focus-visible:opacity-100
                    ${copied
                      ? 'border-racing-green-lit text-racing-green-lit'
                      : 'border-mist/50 text-chrome hover:border-platinum hover:text-platinum'}`}
      >
        {copied ? (
          <>
            <Check size={10} strokeWidth={1.5} />
            <span>Copiado</span>
          </>
        ) : (
          <>
            <Copy size={10} strokeWidth={1} />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
