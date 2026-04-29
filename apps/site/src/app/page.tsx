import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { StageCard } from '@/components/StageCard';
import { EyebrowHeading } from '@/components/EyebrowHeading';
import { StructuredData, buildWebSiteLd } from '@/components/StructuredData';
import { STAGES } from '@/lib/stages';
import { getAllModules, getModuleByRawId } from '@/lib/content';
import { loadProgress } from '@/lib/progress';

export default async function HomePage() {
  const allModules = await getAllModules();
  const moduleCount = allModules.filter((m) => !m.rawId.startsWith('CAPSTONE')).length;

  const snap = await loadProgress();
  const activeRawId = snap?.activeModule.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/)?.[1];
  const activeMod = activeRawId ? await getModuleByRawId(activeRawId) : null;
  const heroActive = activeMod
    ? { id: activeMod.id, rawId: activeMod.rawId, title: activeMod.title }
    : null;

  const progressByStage = new Map<number, { done: number; total: number }>();
  if (snap) {
    for (const row of snap.rows) {
      const cur = progressByStage.get(row.stageNumber) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (row.status === 'DONE') cur.done += 1;
      progressByStage.set(row.stageNumber, cur);
    }
  }

  return (
    <>
      <StructuredData data={buildWebSiteLd()} />
      <Hero totalModules={moduleCount} activeModule={heroActive} />

      <section className="px-8 md:px-16 lg:px-24 py-24 bg-graphite">
        <div className="max-w-7xl mx-auto">
          <EyebrowHeading
            eyebrow="Cinco Estágios"
            title="A trajetória"
            subtitle="Cada estágio resolve um teto diferente. Estudo de longo prazo, com critério de conseguir explicar o interno e provar com código."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            {STAGES.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                progress={progressByStage.get(stage.number)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 md:px-16 lg:px-24 py-24 bg-obsidian">
        <div className="max-w-5xl mx-auto">
          <EyebrowHeading
            eyebrow="Método"
            title="Como o estudo acontece"
          />

          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <Pillar
              n="01"
              title="Teoria Hard"
              body="Densa, com referências primárias, sem padding. Você lê DDIA, OS:TEP, RFCs canônicos — não Medium clickbait."
            />
            <Pillar
              n="02"
              title="Threshold"
              body="Lista do que você deve saber explicar sem consultar. Folha em branco. Sem auto-bondade."
            />
            <Pillar
              n="03"
              title="Desafio de Engenharia"
              body="Implementação não-trivial, hand-rolled, sob restrições. HTTP server from scratch, schema migration, sistema distribuído."
            />
            <Pillar
              n="04"
              title="Três Portões"
              body="Conceitual (5-8 perguntas), Prático (code review profundo), Conexões (integração com módulos anteriores). Falha bem-feita é evidência."
            />
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-8">
            <Link
              href="/docs/study-protocol"
              className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                         px-8 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300"
            >
              Study Protocol
            </Link>
            <Link
              href="/docs/mentor"
              className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                         transition-colors duration-300"
            >
              Mentor Protocol →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-16 lg:px-24 py-24 bg-graphite border-t border-mist/30">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-6">
            Capstone Encadeado
          </p>
          <h2 className="font-display text-display-lg text-pearl tracking-tight mb-6">
            Logística v0 → v4
          </h2>
          <div className="h-px bg-gold-leaf w-24 mx-auto mb-8" />
          <p className="font-sans text-body-lg text-chrome leading-relaxed max-w-3xl mx-auto mb-10">
            HTTP server from scratch (v0) evolui para monolito full-stack (v1), production-ready (v2), distribuído escalável (v3), e specialization showcase (v4). Você sente refactor, migration, redesign na pele.
          </p>
          <Link
            href="/docs/capstone-evolution"
            className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                       transition-colors duration-300 border-b border-mist hover:border-platinum pb-1"
          >
            Capstone Evolution
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-l border-mist pl-8 py-2">
      <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-2">
        {n}
      </p>
      <h3 className="font-display text-display-md text-pearl mb-3">{title}</h3>
      <p className="font-sans text-body text-chrome leading-relaxed">{body}</p>
    </div>
  );
}
