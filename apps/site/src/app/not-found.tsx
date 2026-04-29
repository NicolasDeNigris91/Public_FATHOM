import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = { title: 'Not Found' };

export default function NotFound() {
  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24 min-h-[80vh] flex items-center">
      <div className="max-w-3xl mx-auto w-full">
        <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
          404 · Not Found
        </p>
        <h1 className="font-display text-display-xl text-pearl tracking-tight leading-none mb-6">
          Caminho não existe
        </h1>
        <div className="h-px bg-gold-leaf w-32 mb-10" />
        <p className="font-sans text-body-lg text-chrome leading-relaxed mb-12 max-w-2xl">
          Essa rota não corresponde a nenhum módulo, estágio ou doc. Pode ser
          link antigo, typo, ou módulo que ainda não existe (framework é vivo).
        </p>

        <div className="flex flex-wrap items-center gap-8 mb-16">
          <Link
            href="/"
            className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                       px-8 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            Home
          </Link>
          <Link
            href="/stages"
            className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                       transition-colors duration-300 inline-flex items-center gap-2"
          >
            Browse Stages <ArrowRight size={14} strokeWidth={1} />
          </Link>
        </div>

        <div className="border-t border-mist/40 pt-10">
          <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-4">
            Atalhos rápidos
          </p>
          <ul className="space-y-2 font-sans text-body">
            <li>
              <Link href="/modules/n01" className="text-platinum hover:text-gold-leaf transition-colors">
                N01 — Computation Model
              </Link>
            </li>
            <li>
              <Link href="/progress" className="text-platinum hover:text-gold-leaf transition-colors">
                Progress dashboard
              </Link>
            </li>
            <li>
              <Link href="/index" className="text-platinum hover:text-gold-leaf transition-colors">
                Module index + DAG
              </Link>
            </li>
            <li>
              <Link href="/docs/mentor" className="text-platinum hover:text-gold-leaf transition-colors">
                Mentor Protocol
              </Link>
            </li>
          </ul>
          <p className="font-mono text-caption text-chrome/70 tracking-wide mt-6">
            Dica: <kbd className="kbd">⌘K</kbd> abre command palette com fuzzy search.
          </p>
        </div>
      </div>
    </section>
  );
}
