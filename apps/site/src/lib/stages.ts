export type StageId = 'fundamentos' | 'plataforma' | 'producao' | 'sistemas' | 'amplitude';

export interface StageMeta {
  id: StageId;
  number: number;
  dir: string;
  title: string;
  subtitle: string;
  tagline: string;
  moduleCount: number;
}

export const STAGES: StageMeta[] = [
  {
    id: 'fundamentos',
    number: 1,
    dir: '01-fundamentos',
    title: 'Estágio 1 — Fundamentos',
    subtitle: 'Computer Science',
    tagline:
      'CPU, memória, rede, sistemas operacionais, algoritmos, paradigmas.',
    moduleCount: 15,
  },
  {
    id: 'plataforma',
    number: 2,
    dir: '02-plataforma',
    title: 'Estágio 2 — Plataforma',
    subtitle: 'Aplicações Full Stack',
    tagline:
      'Construir e operar aplicação full-stack monolítica em produção.',
    moduleCount: 19,
  },
  {
    id: 'producao',
    number: 3,
    dir: '03-producao',
    title: 'Estágio 3 — Produção',
    subtitle: 'Ecossistema, Testes, Operações',
    tagline:
      'Testes confiáveis, deploy seguro, observabilidade, segurança defensável.',
    moduleCount: 18,
  },
  {
    id: 'sistemas',
    number: 4,
    dir: '04-sistemas',
    title: 'Estágio 4 — Sistemas',
    subtitle: 'Arquitetura Distribuída',
    tagline:
      'Arquitetura distribuída, trade-offs, modos de falha, custos operacionais.',
    moduleCount: 16,
  },
  {
    id: 'amplitude',
    number: 5,
    dir: '05-amplitude',
    title: 'Estágio 5 — Amplitude',
    subtitle: 'Specialization, Influence, Public Output',
    tagline:
      'Especializar, publicar, mentorar, ler papers, construir from-scratch.',
    moduleCount: 10,
  },
];

export function getStage(id: string): StageMeta | undefined {
  return STAGES.find((s) => s.id === id);
}
