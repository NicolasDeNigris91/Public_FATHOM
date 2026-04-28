import type { StageId } from './stages';

export interface Book {
  title: string;
  author: string;
  year?: string;
  url?: string;
  free?: boolean;
  why: string;
  modules?: string[];
  stage: StageId | 'meta';
}

/**
 * Top books per stage. NOT a full mirror of framework/00-meta/reading-list.md;
 * curated subset of the most-load-bearing references per stage. The full
 * reading-list lives in /docs/reading-list and stays the authoritative source.
 *
 * Criteria: cited as primary in 2+ modules OR genre-defining for the stage.
 */
export const LIBRARY: Book[] = [
  // === Novice ===
  {
    stage: 'novice',
    title: 'Computer Systems: A Programmer\'s Perspective',
    author: 'Bryant & O\'Hallaron',
    year: '2015 (3rd ed)',
    why: 'CS:APP. Bíblia de como o computador realmente funciona. Capítulos 1-9 essenciais.',
    modules: ['N01', 'N02', 'N14'],
  },
  {
    stage: 'novice',
    title: 'Operating Systems: Three Easy Pieces',
    author: 'Remzi & Andrea Arpaci-Dusseau',
    free: true,
    url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
    why: 'OS:TEP. Único livro de OS genuinamente legível. Virtualization, concurrency, persistence.',
    modules: ['N02', 'N11'],
  },
  {
    stage: 'novice',
    title: 'Structure and Interpretation of Computer Programs',
    author: 'Abelson & Sussman',
    free: true,
    url: 'https://web.mit.edu/6.001/6.037/sicp.pdf',
    why: 'SICP. Se você só ler 1 livro de CS na vida, leia este. Abstração, recursão, interpretadores.',
    modules: ['N06', 'N13'],
  },
  {
    stage: 'novice',
    title: 'Crafting Interpreters',
    author: 'Robert Nystrom',
    free: true,
    url: 'https://craftinginterpreters.com/',
    why: 'Você implementa 2 interpreters do zero. Parsing, runtime, paradigmas.',
    modules: ['N13'],
  },
  {
    stage: 'novice',
    title: 'You Don\'t Know JS Yet',
    author: 'Kyle Simpson',
    free: true,
    url: 'https://github.com/getify/You-Dont-Know-JS',
    year: '2nd ed',
    why: '6 volumes. Volumes 1, 2, 4 obrigatórios pra fundamentos JS.',
    modules: ['N07'],
  },
  {
    stage: 'novice',
    title: 'The Art of Multiprocessor Programming',
    author: 'Herlihy & Shavit',
    why: 'Bíblia de concorrência. Memory models, lock-free, transactional memory.',
    modules: ['N11'],
  },
  {
    stage: 'novice',
    title: 'Cryptography Engineering',
    author: 'Ferguson, Schneier, Kohno',
    why: 'Referência prática de cripto aplicada. Hash, MAC, AEAD, PKI, side-channels.',
    modules: ['N12'],
  },
  {
    stage: 'novice',
    title: 'Mathematics for Machine Learning',
    author: 'Deisenroth, Faisal, Ong',
    free: true,
    url: 'https://mml-book.com/',
    why: 'Linear algebra, calculus, probability, optimization no nível certo pra eng.',
    modules: ['N15'],
  },

  // === Apprentice ===
  {
    stage: 'apprentice',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    year: '2017 (1st ed)',
    why: 'DDIA. Replicação, consistency, batch/stream, evolution. Leitura cumulativa pelos estágios 2-4.',
    modules: ['A09', 'S01', 'S02', 'S09', 'S13'],
  },
  {
    stage: 'apprentice',
    title: 'PostgreSQL Internals',
    author: 'Egor Rogov',
    free: true,
    url: 'https://postgrespro.com/community/books/internals',
    why: 'Como Postgres funciona por dentro: MVCC, vacuum, WAL, buffer manager.',
    modules: ['A09'],
  },
  {
    stage: 'apprentice',
    title: 'Database Internals',
    author: 'Alex Petrov',
    year: '2019',
    why: 'B-Tree, LSM-Tree, distributed DBs em paralelo. Complementa DDIA com mais profundidade de storage.',
    modules: ['A09', 'A12', 'A16'],
  },
  {
    stage: 'apprentice',
    title: 'Web Application Hacker\'s Handbook',
    author: 'Stuttard & Pinto',
    why: 'Atacar pra defender. Auth, session, injection, business logic flaws.',
    modules: ['A13', 'P08'],
  },
  {
    stage: 'apprentice',
    title: 'Introduction to Information Retrieval',
    author: 'Manning, Raghavan, Schütze',
    free: true,
    url: 'https://nlp.stanford.edu/IR-book/',
    why: 'BM25, inverted index, scoring. Base de search engines.',
    modules: ['A15'],
  },

  // === Professional ===
  {
    stage: 'professional',
    title: 'Site Reliability Engineering',
    author: 'Google (Beyer et al)',
    free: true,
    url: 'https://sre.google/sre-book/table-of-contents/',
    why: 'SLI/SLO/SLA, error budgets, postmortems. Define vocabulário moderno de ops.',
    modules: ['P07', 'P15'],
  },
  {
    stage: 'professional',
    title: 'Systems Performance',
    author: 'Brendan Gregg',
    year: '2020 (2nd ed)',
    why: 'Bíblia de performance. USE method, flamegraphs, eBPF.',
    modules: ['N14', 'P10'],
  },
  {
    stage: 'professional',
    title: 'High Performance Browser Networking',
    author: 'Ilya Grigorik',
    free: true,
    url: 'https://hpbn.co/',
    why: 'TCP, TLS, HTTP/2/3, WebRTC. Leitura sequencial recomendada.',
    modules: ['N03', 'P09'],
  },
  {
    stage: 'professional',
    title: 'Kubernetes Up & Running',
    author: 'Burns, Beda, Hightower',
    why: 'Pragmatic. Pods, services, deployments, operators.',
    modules: ['P03'],
  },
  {
    stage: 'professional',
    title: 'Programming Rust',
    author: 'Blandy & Orendorff',
    year: '2021 (2nd ed)',
    why: 'Ownership, borrowing, traits. Foundation pra ST07/ST08 também.',
    modules: ['P11'],
  },

  // === Senior ===
  {
    stage: 'senior',
    title: 'Designing Distributed Systems',
    author: 'Brendan Burns',
    free: true,
    url: 'https://azure.microsoft.com/en-us/resources/designing-distributed-systems/',
    why: 'Patterns canônicos: sidecar, ambassador, leader election, scatter/gather.',
    modules: ['S01', 'S04'],
  },
  {
    stage: 'senior',
    title: 'Domain-Driven Design',
    author: 'Eric Evans',
    year: '2003',
    why: 'O livro azul. Bounded contexts, ubiquitous language, aggregates.',
    modules: ['S06', 'S07'],
  },
  {
    stage: 'senior',
    title: 'Building Event-Driven Microservices',
    author: 'Adam Bellemare',
    why: 'Kafka centric. Schema registry, change data capture, event sourcing.',
    modules: ['S02', 'S03', 'S13'],
  },
  {
    stage: 'senior',
    title: 'Specifying Systems',
    author: 'Leslie Lamport',
    free: true,
    url: 'https://lamport.azurewebsites.net/tla/book.html',
    why: 'TLA+ pelo autor. Spec formal de algoritmos concorrentes/distribuídos.',
    modules: ['S14'],
  },
  {
    stage: 'senior',
    title: 'Release It!',
    author: 'Michael Nygard',
    year: '2018 (2nd ed)',
    why: 'Padrões de estabilidade: bulkhead, circuit breaker, timeout, steady state.',
    modules: ['S04', 'P15'],
  },

  // === Staff ===
  {
    stage: 'staff',
    title: 'The Staff Engineer\'s Path',
    author: 'Tanya Reilly',
    year: '2022',
    why: 'Definitivo. Big picture thinking, project execution, levelling up others.',
    modules: ['ST03', 'ST06'],
  },
  {
    stage: 'staff',
    title: 'Staff Engineer',
    author: 'Will Larson',
    year: '2021',
    why: 'Archetypes (tech lead, architect, solver, right hand). Promo cases reais.',
    modules: ['ST03'],
  },
  {
    stage: 'staff',
    title: 'An Elegant Puzzle',
    author: 'Will Larson',
    year: '2019',
    why: 'Engineering management adjacente ao Staff IC. Org design, technical debt.',
    modules: ['ST03'],
  },
  {
    stage: 'staff',
    title: 'Resilient Management',
    author: 'Lara Hogan',
    year: '2019',
    why: 'Comunicação, feedback, mentoria. Mesmo em IC track.',
    modules: ['ST06'],
  },
  {
    stage: 'staff',
    title: 'The Pragmatic Engineer',
    author: 'Gergely Orosz',
    url: 'https://newsletter.pragmaticengineer.com/',
    why: 'Newsletter. Calibration de mercado, big tech vs scale-ups, comp data.',
    modules: ['ST05', 'CAPSTONE-staff'],
  },
];

export const STAGE_BOOK_COUNT: Record<StageId, number> = {
  novice: LIBRARY.filter((b) => b.stage === 'novice').length,
  apprentice: LIBRARY.filter((b) => b.stage === 'apprentice').length,
  professional: LIBRARY.filter((b) => b.stage === 'professional').length,
  senior: LIBRARY.filter((b) => b.stage === 'senior').length,
  staff: LIBRARY.filter((b) => b.stage === 'staff').length,
};
