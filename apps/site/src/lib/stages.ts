export type StageId = 'novice' | 'apprentice' | 'professional' | 'senior' | 'staff';

export interface StageMeta {
  id: StageId;
  number: number;
  dir: string;
  prefix: string;
  title: string;
  subtitle: string;
  tagline: string;
  moduleCount: number;
}

export const STAGES: StageMeta[] = [
  {
    id: 'novice',
    number: 1,
    dir: '01-novice',
    prefix: 'N',
    title: 'Novice',
    subtitle: 'Fundamentos & Computer Science',
    tagline:
      'CPU, memória, rede, sistemas operacionais, algoritmos, paradigmas. Sem isso, você nunca passa de Pleno superficial.',
    moduleCount: 15,
  },
  {
    id: 'apprentice',
    number: 2,
    dir: '02-apprentice',
    prefix: 'A',
    title: 'Apprentice',
    subtitle: 'Aplicações Full Stack',
    tagline:
      'Construir e operar aplicação full-stack monolítica em produção, defendendo cada escolha técnica em entrevista de Pleno.',
    moduleCount: 19,
  },
  {
    id: 'professional',
    number: 3,
    dir: '03-professional',
    prefix: 'P',
    title: 'Professional',
    subtitle: 'Ecossistema, Testes, Operações',
    tagline:
      'Produção com qualidade de empresa séria — testes confiáveis, deploy seguro, observabilidade real, segurança defensável.',
    moduleCount: 18,
  },
  {
    id: 'senior',
    number: 4,
    dir: '04-senior',
    prefix: 'S',
    title: 'Senior',
    subtitle: 'Arquitetura Distribuída',
    tagline:
      'Desenhar e justificar arquitetura distribuída pra problema novo, prevendo trade-offs, modos de falha, custos operacionais.',
    moduleCount: 16,
  },
  {
    id: 'staff',
    number: 5,
    dir: '05-staff',
    prefix: 'ST',
    title: 'Staff / Principal',
    subtitle: 'Specialization, Influence, Public Output',
    tagline:
      'Multiplicar via influência, especializar em eixo, publicar, mentorar, ler papers, construir from-scratch, falar org.',
    moduleCount: 10,
  },
];

export function getStage(id: string): StageMeta | undefined {
  return STAGES.find((s) => s.id === id);
}
