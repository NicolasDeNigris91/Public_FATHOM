import { EyebrowHeading } from '@/components/EyebrowHeading';
import { Breadcrumb } from '@/components/Breadcrumb';
import Link from 'next/link';

export const metadata = {
  title: 'About',
  description: 'O que é o Fathom, autoria, status atual.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-3xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'About' },
          ]}
        />
        <EyebrowHeading
          eyebrow="Sobre"
          title="O que é o Fathom"
          subtitle="Trilha pessoal de longo prazo, mastery-based, sem prazos. Construída como artefato vivo, site, repo público, e disciplina diária."
        />

        <div className="mt-16 space-y-8 font-sans text-body-lg text-platinum leading-relaxed">
          <p>
            Fathom é meu caderno pessoal de estudo de engenharia de software. Começa em <Link href="/modules/01-01" className="text-gold-leaf underline underline-offset-4 hover:text-pearl">01-01, Computation Model</Link> e termina no capstone do estágio 5.
          </p>
          <p>
            Cinco estágios. 78 módulos. Cinco capstones encadeados em torno de um único produto (Logística) que evolui de servidor HTTP from scratch até sistema distribuído multi-region em 4 incrementos.
          </p>
          <p>
            Conteúdo é <em>synthesis + curadoria</em> sobre fontes canônicas, DDIA, SICP, OS:TEP, RFCs, papers. Nunca substitui livro; é mapa pra navegar o território.
          </p>
        </div>

        <div className="mt-20 pt-16 border-t border-mist/40">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
            Autoria
          </p>
          <h3 className="font-display text-display-md text-pearl mb-4">Nicolas De Nigris</h3>
          <p className="font-sans text-body text-chrome leading-relaxed mb-8 max-w-2xl">
            Construído solo durante a transição da joalharia de luxo pra software development. Disciplina herdada do craft anterior: precisão, depth, paciência.
          </p>
          <div className="flex flex-wrap gap-6">
            <a
              href="https://github.com/NicolasDeNigris91/FATHOM"
              target="_blank"
              rel="noreferrer"
              className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                         px-8 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300"
            >
              GitHub Repo
            </a>
            <a
              href="https://nicolaspilegidenigris.dev"
              target="_blank"
              rel="noreferrer"
              className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl transition-colors duration-300"
            >
              Portfolio →
            </a>
          </div>
        </div>

        <div className="mt-16 pt-16 border-t border-mist/40">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
            Status
          </p>
          <p className="font-sans text-body text-chrome">
            v1.0 shipping-ready. Modificações futuras são incrementos sobre base estável, registrados em{' '}
            <Link href="/docs/changelog" className="text-gold-leaf underline underline-offset-4 hover:text-pearl">
              CHANGELOG
            </Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
