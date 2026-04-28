'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to server-side error tracking would go here.
    // Keeping silent in client for now; Railway logs catch it server-side.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[fathom] error boundary caught:', error);
    }
  }, [error]);

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24 min-h-[80vh] flex items-center">
      <div className="max-w-3xl mx-auto w-full">
        <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
          Erro · Render falhou
        </p>
        <h1 className="font-display text-display-xl text-pearl tracking-tight leading-none mb-6">
          Algo quebrou
        </h1>
        <div className="h-px bg-gold-leaf w-32 mb-10" />
        <p className="font-sans text-body-lg text-chrome leading-relaxed mb-6 max-w-2xl">
          O servidor ou client falhou ao renderizar essa página. Você pode
          tentar de novo. Se persistir, é bug — me avise via GitHub Issues.
        </p>

        {error.digest && (
          <p className="font-mono text-caption text-chrome/60 tracking-wide mb-12">
            Digest: <span className="text-chrome">{error.digest}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-8 mb-16">
          <button
            type="button"
            onClick={reset}
            className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                       px-8 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum
                       inline-flex items-center gap-2"
          >
            <RotateCw size={14} strokeWidth={1} /> Try Again
          </button>
          <Link
            href="/"
            className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                       transition-colors duration-300"
          >
            Home →
          </Link>
        </div>

        <div className="border-t border-mist/40 pt-10">
          <p className="font-mono text-caption text-chrome/70 tracking-wide">
            Bugs &amp; reports:{' '}
            <a
              href="https://github.com/NicolasDeNigris91/FATHOM/issues"
              target="_blank"
              rel="noreferrer"
              className="text-gold-leaf hover:text-pearl transition-colors underline underline-offset-4"
            >
              github.com/NicolasDeNigris91/FATHOM/issues
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
