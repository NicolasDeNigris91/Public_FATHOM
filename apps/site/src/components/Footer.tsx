import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-mist/40 py-16 px-8 md:px-16 lg:px-24 mt-24">
      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3">
            Fathom · {new Date().getFullYear()}
          </p>
          <p className="font-display text-display-md text-pearl mb-2">Mastery não tem prazo.</p>
          <p className="font-sans text-body text-chrome">
            Tem prática.
          </p>
        </div>

        <div>
          <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-4">
            Read
          </p>
          <ul className="space-y-2 font-sans text-body text-chrome">
            <li><Link href="/" className="hover:text-pearl transition-colors duration-200">Overview</Link></li>
            <li><Link href="/stages" className="hover:text-pearl transition-colors duration-200">Stages</Link></li>
            <li><Link href="/progress" className="hover:text-pearl transition-colors duration-200">Progress</Link></li>
            <li><Link href="/index" className="hover:text-pearl transition-colors duration-200">Module Index + DAG</Link></li>
            <li><Link href="/library" className="hover:text-pearl transition-colors duration-200">Library (curated)</Link></li>
            <li><Link href="/glossary" className="hover:text-pearl transition-colors duration-200">Glossary</Link></li>
            <li><Link href="/docs/study-protocol" className="hover:text-pearl transition-colors duration-200">Study Protocol</Link></li>
            <li><Link href="/docs/mentor" className="hover:text-pearl transition-colors duration-200">Mentor Protocol</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-caption text-chrome tracking-luxury uppercase mb-4">
            Author
          </p>
          <p className="font-sans text-body text-platinum mb-1">Nicolas De Nigris</p>
          <p className="font-sans text-caption text-chrome mb-4">
            São Paulo · {new Date().getFullYear()}
          </p>
          <div className="flex gap-6">
            <a
              href="https://github.com/NicolasDeNigris91/FATHOM"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-caption tracking-luxury uppercase text-chrome hover:text-gold-leaf transition-colors duration-200"
            >
              GitHub
            </a>
            <a
              href="https://nicolaspilegidenigris.dev"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-caption tracking-luxury uppercase text-chrome hover:text-gold-leaf transition-colors duration-200"
            >
              Portfolio
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
