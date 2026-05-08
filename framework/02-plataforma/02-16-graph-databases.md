---
module: 02-16
title: Graph Databases, Property Graph, Cypher, Path Queries, Graph Algorithms
stage: plataforma
prereqs: [01-04, 02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual cenário é o ponto mais forte para graph database dedicado em vez de Postgres + JOIN?"
    options:
      - "CRUD simples 1-N com 1-2 hops"
      - "Multi-hop traversal (4+ hops), pathfinding e pattern matching, onde adjacency direta vence JOINs cúbicos"
      - "Análises OLAP em colunas com window functions"
      - "Time series com retention longa"
    correct: 1
    explanation: "Native graph storage usa adjacency direta (index-free adjacency), tornando deep traversals O(N) em hops. Postgres com recursive CTE bate na parede em 4+ hops. Em rasos (1-2), JOIN com índice é igual ou melhor."
  - q: "Por que `MATCH (n)-[*]->(m)` (variable length sem cap) é um anti-pattern crítico?"
    options:
      - "Porque a sintaxe está deprecated em GQL"
      - "Porque em grafos densos causa explosão combinatória, query roda por horas e pode OOM; sempre use cap explícito como `[*1..5]`"
      - "Porque retorna apenas paths simples e perde ciclos"
      - "Porque o Neo4j não tem suporte para asterisco unbounded"
    correct: 1
    explanation: "Sem upper bound, em grafo conectado o engine explora todas as combinações possíveis até qualquer profundidade. Em hub com fan-out alto vira combinatorial blowup, lock e OOM. Sempre use `[*1..5]` ou similar."
  - q: "Qual a vantagem matadora de Apache AGE (graph extension do Postgres) sobre Neo4j standalone em SaaS multi-tenant?"
    options:
      - "AGE tem mais algoritmos prontos que Neo4j GDS"
      - "AGE roda dentro do Postgres, então JOIN entre graph e tabelas relacionais ocorre na mesma transação e Postgres RLS aplica para tenant isolation; sem novo DB pra operar"
      - "AGE é mais rápido em deep traversals"
      - "AGE elimina a necessidade de Cypher"
    correct: 1
    explanation: "AGE permite JOIN entre Cypher MATCH e tabelas SQL na mesma query/transação, e herda Row-Level Security do Postgres para isolar tenants. Em B2B com 100+ tenants, ROI operacional é brutal vs Neo4j multi-database."
  - q: "Em PageRank, para que serve o damping factor (~0.85)?"
    options:
      - "Define o número máximo de iterações"
      - "Modela a probabilidade do random walker continuar seguindo links; (1 - damping) é a probabilidade de pular para um nó aleatório, evitando spider traps e dead ends"
      - "Controla a normalização final dos scores"
      - "Define o threshold de convergência entre iterações"
    correct: 1
    explanation: "Damping (~0.85) é a probabilidade do random walker seguir um outlink; 0.15 é restart aleatório. Sem isso, o walker fica preso em ciclos (spider traps) ou termina em sinks. Tunar por domínio em casos específicos."
  - q: "Por que GraphRAG sem entity disambiguation produz respostas incorretas?"
    options:
      - "Porque o algoritmo de community detection requer IDs únicos"
      - "Porque entidades distintas com mesmo nome (ex: dois 'João Silva') colapsam em um único node, misturando contextos e relações de pessoas diferentes"
      - "Porque GraphRAG não suporta strings"
      - "Porque LLM precisa de IDs em formato UUID v4"
    correct: 1
    explanation: "Em GraphRAG, o LLM extrai entidades de chunks e cria nodes. Sem deterministic IDs + embedding similarity threshold, 'João Silva (lojista)' e 'João Silva (courier)' viram um node único, contaminando relações e gerando respostas erradas."
---

# 02-16, Graph Databases

## 1. Problema de Engenharia

Algumas queries são natural-mente **caminhos em grafos**: amigos de amigos, recomendação por co-purchase, fraud rings, dependências entre serviços, conhecimento corporativo, roteamento (Logística!). SQL pode resolver, `JOIN`s recursivos, CTEs, mas vira ilegível e lento à medida que profundidade cresce.

Graph databases (Neo4j, Memgraph, ArangoDB, JanusGraph, AWS Neptune) tratam **relacionamento como cidadão de primeira classe**. Queries declarativas (Cypher, Gremlin, SPARQL) expressam "encontre caminho de A pra B com restrições" diretamente. Indexação de adjacency e algoritmos builtin (PageRank, betweenness, shortest path) executam em milissegundos onde SQL recursivo demora segundos.

Este módulo é **graph DB por dentro**: property graph model, native vs non-native graph (storage), Cypher (mais comum), traversal patterns, graph algorithms (BFS/DFS/Dijkstra/A\*/PageRank/community detection), e quando NÃO usar graph DB (relacionamento simples cabe em SQL com índice; profundidade rasa não justifica nova stack).

---

## 2. Teoria Hard

### 2.1 Modelos: property graph vs RDF

- **Property graph**: nodes e edges, ambos com properties (key-value) e labels/types. Modelo dominante (Neo4j, Memgraph, TigerGraph).
- **RDF triple store**: `(subject, predicate, object)`. Web semântica, ontologias, SPARQL. Dataset abertos (DBpedia, Wikidata).

Property graph é mais conveniente pra apps; RDF brilha em integração de fontes heterogêneas e raciocínio formal.

### 2.2 Storage: native vs non-native

**Native graph storage** (Neo4j, Memgraph): adjacency direta, pointer hopping. Traversal é cache-friendly.
**Non-native** (graph layer sobre KV ou doc DB): traversal traduz em scans. Mais flexível em deployment, mas pode ter custo de hop.

Native shines em **deep traversals** (4+ hops). Non-native ok pra rasos.

### 2.3 Cypher: query language declarativa

Cypher (Neo4j) e openCypher (Memgraph, AWS Neptune adoption) usam ASCII art:

```
MATCH (u:User {id: $userId})-[:FRIEND]->(f)-[:FRIEND]->(fof)
WHERE NOT (u)-[:FRIEND]->(fof) AND u <> fof
RETURN fof.name, count(*) as common_friends
ORDER BY common_friends DESC
LIMIT 10
```

Sintaxe lê como o pattern: nodes em parênteses, relationships em colchetes com setas. `MATCH`, `WHERE`, `RETURN`, `OPTIONAL MATCH`, `WITH` (encadeia subqueries), `MERGE` (upsert).

### 2.4 Pattern matching: variable-length paths

Cypher suporta `*N..M` em relationships:

```
MATCH path = (a:Stop)-[:NEXT*1..5]->(b:Stop)
WHERE a.id = $start AND b.id = $end
RETURN path, length(path) ORDER BY length(path) LIMIT 1
```

Encontra caminhos de 1 a 5 hops. Sem profundidade, pode explodir, sempre limite.

### 2.5 Indexes em graph

Neo4j tem **label/property index** (B-Tree style) pra encontrar **start nodes**. Traversal subsequente é por adjacency, não índice.

Indexes textuais (full-text via Lucene), spatial (point), composite. Constraint unique disponível.

### 2.6 Graph algorithms

Bibliotecas de graph DBs (Neo4j GDS, Memgraph MAGE) entregam algoritmos:
- **Shortest path**: Dijkstra (peso ≥ 0), A\* (heurística), Bellman-Ford (pesos negativos).
- **All-pairs shortest path** (Floyd-Warshall): O(V³), só pra grafos pequenos.
- **PageRank**: importância via random walk. Power iteration.
- **Community detection**: Louvain, Label Propagation. Cluster comunidades densas.
- **Centrality**: betweenness, closeness, eigenvector.
- **Connected components**: weakly/strongly connected.
- **Link prediction**: common neighbors, Jaccard, Adamic-Adar.

Estes são algoritmos clássicos (01-05) com implementações otimizadas pra graph storage.

### 2.7 Modelagem: o que vira node, o que vira edge

Regra: **substantivos com identidade** = nodes. **Verbos/relacionamentos** = edges. Properties em ambos.

Mas *granularidade* importa. Caso clássico: order com items.
- Versão A: `(:Order)-[:CONTAINS]->(:Item)`. Se `Item` é compartilhado (mesmo SKU em vários orders), bom.
- Versão B: `(:Order)-[:CONTAINS {qty: 3}]->(:Product)`. Quantity vira property da edge, natural pra muitos:muitos com atributos.

Anti-pattern: tudo node. Edges com properties são poderosos, use.

### 2.8 Consistency e transações

Neo4j ACID, transações multi-statement. Cluster mode usa **Raft** pra core (writes), read replicas. Em deploys grandes, sharding (Neo4j Fabric) divide por subdomínio mas adiciona complexidade.

Memgraph: in-memory, persistência via WAL+snapshots; transações ACID.

### 2.9 Quando NÃO usar graph DB

- Profundidade rasa (1-2 hops): JOIN em SQL com índice é igual ou mais rápido, sem nova stack.
- Workload OLTP simples (CRUD com 1-N relacionamento): Postgres + FK basta.
- Big data analytics não-graph: Spark/dbt não é caso.
- Time-series: graph DB não substitui Timescale/Clickhouse.

Regra: se você está escrevendo CTEs recursivos e queries com 4+ joins explorando relacionamentos, considere graph. Se não, fique em SQL.

### 2.10 Graph + Postgres: opção híbrida

Postgres com `ltree` (labels hierárquicas), `WITH RECURSIVE` (CTEs), e hand-rolled adjacency lists resolvem grafos médios. Extension **Apache AGE** roda Cypher sobre Postgres.

Trade-off: stack única, sem precisar de Neo4j. Mas perde algoritmos otimizados nativos.

### 2.11 GraphQL ≠ Graph database

Confusão comum. GraphQL é **API query language** (04-05), executada por resolvers que falam com qualquer storage (incluindo SQL). Graph DB é **storage**. GraphQL pode usar graph DB ou não.

### 2.12 Casos de uso reais

- **Logística (capstone!)**: shortest path, capacidade de courier, dependências de delivery.
- **Recomendação**: collaborative filtering via co-occurrence em grafo.
- **Fraud detection**: ring de contas suspeitas (ciclos curtos).
- **Knowledge graphs**: enriquecimento de busca.
- **Permission systems**: RBAC complexo (Google Zanzibar usa graph backing).
- **Social networks**: friend-of-friend, mutual connections.

### 2.13 Performance

Hop count é principal cost driver. Latency cresce ~ linear com profundidade (em native), exponencial com fan-out (sem filtro).

Optimization patterns:
- **Filter early**: WHERE em nodes antes de expandir.
- **Limit em variable-length**: `*1..5`, não `*`.
- **Pre-compute**: communities, PageRank caro → recompute em batch.
- **Materialized views**: Neo4j 5+ tem.
- **Read replicas** pra read-heavy.

### 2.14 Operação

Backups: hot backup com snapshot + replication. Neo4j Aura (managed). Sizing: dataset cabe em RAM idealmente; warm cache crítico.

Migration: import via `LOAD CSV`, `apoc.periodic.iterate`. Batch sizes 10k-50k.

Monitoring: Bolt protocol metrics, slow query log, page cache hit ratio.

### 2.15 GQL: o futuro padrão

ISO/IEC 39075:2024 (GQL) é primeiro standard internacional pra graph query language. Cypher é base. Adoção por Neo4j, AWS Neptune, TigerGraph. Vale acompanhar.

### 2.16 Cypher patterns aplicados — multi-hop, recommendation, fraud, when graph beats SQL

Graph DB perde 90% das vezes pra Postgres + JOIN. Mas em 10% dos casos (multi-hop traversal, recommendation, fraud detection com cycles, knowledge graph), Postgres com 6-level JOIN explode em latência cubica enquanto Neo4j responde em 50ms. Esta seção entrega: 5 padrões Cypher production-ready, decisão "graph vs SQL" com benchmarks reais, integração híbrida (Postgres source + Neo4j projeção), tooling 2026.

#### 2.16.1 Quando graph DB ganha — 4 cenários canônicos

| Cenário | Por que graph vence |
|---|---|
| **Multi-hop traversal** (4+ hops) | SQL: N JOINs cubic; Neo4j: index-free adjacency O(N) |
| **Pathfinding** (shortest path, all paths) | SQL: recursive CTE complexa; Neo4j: shortestPath nativo |
| **Pattern matching** (subgraphs, motifs) | SQL: vira janela de UNION ALL gigante; Cypher: declarativo |
| **Variable depth** ("amigos de amigos com filtro") | SQL: recursive CTE com depth dinâmica = pesadelo; Cypher: `*1..5` |

#### 2.16.2 Pattern 1 — Multi-hop friend recommendation (Logística: couriers que conhecem couriers)

```cypher
MATCH (me:Courier {id: $courierId})-[:WORKED_WITH*2..3]-(suggestion:Courier)
WHERE NOT (me)-[:WORKED_WITH]-(suggestion)
  AND suggestion.id <> me.id
  AND suggestion.active = true
WITH suggestion, count(*) AS strength
ORDER BY strength DESC
LIMIT 10
RETURN suggestion.id, suggestion.name, strength;
```

SQL equivalente requer 2-3 self-joins + DISTINCT + window function. Em 1M couriers com avg 50 collaborations, Postgres p99 ~3s; Neo4j ~80ms.

#### 2.16.3 Pattern 2 — Fraud detection via cycle (kickback ring)

```cypher
// Detecta ciclo de pagamentos suspeito (lojista -> courier -> lojista) em janela
MATCH (l1:Lojista)-[t1:PAID]->(c:Courier)-[t2:PAID]->(l2:Lojista)
WHERE t1.amount > 10000 AND t2.amount > 10000
  AND t1.timestamp < t2.timestamp
  AND duration.between(t1.timestamp, t2.timestamp).hours < 24
  AND l1.id <> l2.id
RETURN l1, c, l2, t1.amount, t2.amount;
```

SQL: 3-way JOIN com timestamp diff + duration aggregation + nondiagonal filter. Cypher é literal o pattern. Estende fácil pra N-hop: `(l1)-[*1..6]->(l_back)` detecta cycles longos.

#### 2.16.4 Pattern 3 — Shortest path (rota indireta)

```cypher
MATCH (origin:Hub {city: 'São Paulo'}), (dest:Hub {city: 'Recife'})
CALL apoc.algo.dijkstra(origin, dest, 'CONNECTS', 'distance_km')
YIELD path, weight
RETURN [n IN nodes(path) | n.city] AS route, weight AS totalKm;
```

APOC plugin: Dijkstra, A*, all shortest paths. 50ms em grafo de 1M nodes.

#### 2.16.5 Pattern 4 — Variable-depth recommendation com filter

```cypher
// Customers que compraram products parecidos a um specific
MATCH (target:Product {id: $productId})<-[:BOUGHT]-(buyer:Customer)-[:BOUGHT]->(rec:Product)
WHERE rec.id <> target.id
  AND rec.category = target.category
  AND NOT (target)<-[:SIMILAR_TO]-(rec)
WITH rec, count(DISTINCT buyer) AS coBuyers
WHERE coBuyers >= 5
RETURN rec.id, rec.name, coBuyers
ORDER BY coBuyers DESC
LIMIT 20;
```

#### 2.16.6 Pattern 5 — Subgraph extraction pra ML feature engineering

```cypher
MATCH (c:Customer {id: $customerId})
CALL apoc.path.subgraphAll(c, {
  relationshipFilter: 'BOUGHT|RATED|REVIEWED',
  maxLevel: 2
})
YIELD nodes, relationships
RETURN nodes, relationships;
```

Output vira input pra GNN (Graph Neural Network) ou export pra feature store.

#### 2.16.7 Decisão — graph dedicado vs Postgres extensions

| Approach | Bom em | Limita em |
|---|---|---|
| **Neo4j / Memgraph (dedicated)** | Multi-hop, complex traversal, OLTP graph | OLTP relacional misto; ops separate |
| **Postgres + recursive CTE** | < 4 hops, < 1M nodes | Latency cresce cubic; código complexo |
| **Postgres + Apache AGE** (graph extension) | Graph + relational mesma DB | Newer; performance vs Neo4j ainda atrás |
| **Postgres + ltree** | Hierarchies (single tree) | Não generalist graph |

#### 2.16.8 Padrão híbrido recomendado em produção

```
Postgres (source of truth OLTP)
     |
     v  CDC (Debezium)
Kafka
     |
     v  Consumer
Neo4j (graph projection: subset relevante)
     ^
     |  Read-only graph queries
App
```

- Postgres permanece source: customers, orders, products como tables normais.
- Neo4j armazena APENAS edges + minimal node metadata necessário pra traversal (bought, rated, friend, etc.).
- Queries OLTP normais -> Postgres. Queries graph (recommendation, fraud, multi-hop) -> Neo4j.
- Logística: 2-week setup vs 3-month pra full Neo4j migration; menor risco.

#### 2.16.9 Schema design no graph

- **Node properties**: minimal — id + 2-5 attrs queried em traversal.
- **Edge properties**: timestamps, weights, confidence scores.
- **Index obrigatório**: `CREATE INDEX FOR (c:Customer) ON (c.id);`
- **Constraint pra dedup**: `CREATE CONSTRAINT FOR (c:Customer) REQUIRE c.id IS UNIQUE;`

#### 2.16.10 Performance — quando lento

- **Cartesian explosion**: `MATCH (a), (b)` sem WHERE relacionando = NxM. Sempre conecte com edge.
- **Variable depth sem limite**: `*1..` (unbounded) explode. Sempre cap: `*1..5`.
- **Sem index em property filter**: `WHERE n.email = $x` sem index = full node scan.
- **WITH desnecessário**: query planner às vezes prefere sem WITH; benchmark.
- **Query cache**: Neo4j cache plans; queries parametrizadas (`$param`) cacheiam; literal values cada vez planejam de novo.

#### 2.16.11 Tooling 2026 comparison

| Tool | Modelo | Forte | Custo |
|---|---|---|---|
| **Neo4j 5.x** | Cypher; market leader | Maturity; ecosystem; APOC plugins | Community grátis; Enterprise paga |
| **Memgraph** | Cypher-compatible, in-memory | 100x faster pra streaming graph | Community grátis; Enterprise paga |
| **Apache AGE** (Postgres extension) | OpenCypher dialect | Graph + relational mesmo DB | Free, Postgres ecosystem |
| **TigerGraph** | GSQL (própria); enterprise | Massive scale (10B+ edges) | Enterprise paga |
| **Amazon Neptune** | Cypher + Gremlin + SPARQL | AWS managed | Pay per hour |
| **Dgraph** | GraphQL native + DQL | API-friendly; horizontal scale | Open source + cloud |

#### 2.16.12 Anti-patterns observados

- **Migrar tudo pra graph "porque é cool"**: 90% das queries são CRUD relacionais; graph é overhead.
- **Variable depth sem cap**: `*` (unbounded) num grafo denso = query roda por horas, OOM.
- **Sem index em node label + property**: full scan; latência cresce com data.
- **Edge sem direction quando importa**: `(a)-[:KNOWS]-(b)` undirected; pode bater 2x na traversal.
- **Nodes "obesos"**: 50 properties por node; serialization domina latency.
- **Substituir Postgres por Neo4j**: Neo4j ACID single-cluster; replication mais frágil que Postgres + Patroni.
- **Sem batch pra inserts massivos**: 1 INSERT por API call = throughput < 100/s; use `UNWIND` + batched arrays.
- **`OPTIONAL MATCH` em loop sem WITH**: pode explodir cartesian.
- **`MATCH (n)-[*]->(m)` sem upper bound em depth**: combinatorial explosion em grafos densos, query nunca termina, lock + OOM. Sempre `[*1..5]` ou similar com cap explícito por workload.
- **`DETACH DELETE` em produção sem WHERE específico**: Neo4j/Memgraph não tem confirm interativo; `MATCH (n) DETACH DELETE n` dropa o grafo inteiro silent. Use transaction com `LIMIT` + dry-run `RETURN count(*)` antes; backup snapshot obrigatório.

Cruza com **02-16 §2.10** (Postgres híbrido — pattern recomendado), **02-16 §2.12** (casos de uso reais), **04-13 §2.12** (CDC alimenta Neo4j projection), **04-10 §2.x** (GNN consome subgraph extraction), **02-09 §2.7.1** (JSONB indexing pra grafos pequenos no Postgres).

### 2.17 Graph algorithms applied (PageRank, community detection, shortest path, fraud rings)

Cypher pattern matching resolve traversal e subgrafo. Mas problemas reais — "quem é influente?", "quais clusters existem?", "qual rota alternativa?", "tem fraud ring?" — exigem algoritmos clássicos rodando em escala. SQL com recursive CTE bate na parede em ~3 hops ou ~100k nodes. Graph algorithms (Neo4j GDS, Memgraph MAGE) escalam a milhões de nodes com implementações otimizadas. Esta seção entrega: stack 2026, 6 famílias de algoritmos com Cypher production-ready, pattern Logística end-to-end, GraphRAG (LLM + graph), anti-patterns.

#### 2.17.1 Tooling 2026

| Tool | Modelo | Forte | Limita |
|---|---|---|---|
| **Neo4j GDS 2.10+** | 60+ algoritmos embedded em Neo4j 5.x | Maturity, named graph projections, ecossistema | Enterprise paga pra cluster mode |
| **Memgraph MAGE 2024+** | Open-source GDS alternative | Performance competitiva, in-memory streaming | Ecosystem menor que Neo4j |
| **Apache AGE** (Postgres) | Cypher dialect + algoritmos básicos | Stack única (Postgres) | Imaturo; faltam Louvain, GDS-grade |
| **NetworkX** (Python) | In-memory; análise/research | Rápido pra prototipagem | < 100k nodes; não-distribuído |
| **GraphFrames** (Spark) | Distributed batch | Bilhões de nodes; PageRank/CC at scale | Latência de batch; não OLTP |
| **TigerGraph** | GSQL; massive parallel | 10B+ edges; enterprise | Custo; curva GSQL |

Default Logística: **Neo4j 5.x + GDS 2.10+** (managed Aura ou self-host).

#### 2.17.2 PageRank — node importance

Iterativo: importância de um node = soma da importância de inbound neighbors / out-degree. Damping factor 0.85 default (random restart probability 0.15). Use cases: link analysis, identificar lojistas/couriers influentes, recommendation seeds.

```cypher
// Projetar named graph (uma vez; reuse em multiple algoritmos)
CALL gds.graph.project(
  'lojista-graph',
  'Lojista',
  { REFERRED: { orientation: 'NATURAL' } }
);

CALL gds.pageRank.stream('lojista-graph', {
  maxIterations: 20,
  dampingFactor: 0.85
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS lojista, score
ORDER BY score DESC
LIMIT 10;
```

**Variants**: Personalized PageRank (start de seed nodes específicos — ideal pra "similar a este customer"); Article Rank (variant pra grafos esparsos onde PageRank original distorce).

#### 2.17.3 Community detection — clusters

- **Louvain**: hierarchical, modularity-based; default popular.
- **Label Propagation**: mais rápido; qualidade inferior.
- **Leiden**: melhoria sobre Louvain; melhor qualidade, ligeiramente mais lento.

Use cases: customer segmentation, fraud rings (clusters densos suspeitos), social groups.

```cypher
CALL gds.louvain.stream('courier-collab-graph', {
  relationshipWeightProperty: 'shared_routes_count'
})
YIELD nodeId, communityId
RETURN communityId, COUNT(*) AS size, COLLECT(gds.util.asNode(nodeId).name) AS members
ORDER BY size DESC;
```

Pré-validate: se o grafo tem modularidade fraca (sem clusters claros), Louvain devolve lixo. Eyeball amostra antes de confiar.

#### 2.17.4 Shortest path — Dijkstra + Yen's k-shortest

Dijkstra: weighted shortest path, single source → single target. Yen's k: top-K rotas alternativas (route planning, fallback).

```cypher
MATCH (start:Address {id: 'pickup-123'}), (end:Address {id: 'dropoff-456'})
CALL gds.shortestPath.yens.stream('road-network', {
  sourceNode: start,
  targetNode: end,
  k: 3,
  relationshipWeightProperty: 'distance_km'
})
YIELD path, totalCost
RETURN path, totalCost
ORDER BY totalCost
LIMIT 3;
```

BFS (unweighted) devolve hops, não km — só use quando distance não importa.

#### 2.17.5 Fraud detection — cycle finding

Closed cycles em payment/referral networks indicam kickback ou fraud rings. Algoritmo: BFS com depth limit ou graph pattern matching direto.

```cypher
// 3-cycle de referrals (lojista A -> B -> C -> A)
MATCH (a:Lojista)-[:REFERRED]->(b:Lojista)-[:REFERRED]->(c:Lojista)-[:REFERRED]->(a)
WHERE a.id < b.id AND b.id < c.id  // dedup permutações
RETURN a.name, b.name, c.name;
```

Avançado: combine com payment flow + time-window (`duration.between(...).hours < 24`) e amount thresholds → "money laundering" patterns. Sempre cap `maxDepth`; cycle detection sem limite explode combinatorialmente.

#### 2.17.6 Centrality measures

- **Betweenness centrality**: nodes em muitos shortest paths (bridges; remoção quebra a network).
- **Closeness centrality**: distância média curta a todos os outros (hubs).
- **Eigenvector centrality**: importância em função da importância dos vizinhos (precursor do PageRank).

Logística: betweenness identifica couriers/hubs críticos — remoção colapsa entregas. Output alimenta capacity planning e SLA risk scoring.

#### 2.17.7 Link prediction — recommendation

- **Common Neighbors**: dois nodes com vizinhos compartilhados tendem a conectar.
- **Adamic-Adar**: ponderado por inverso do log do degree (vizinhos raros pesam mais).

```cypher
// Sugerir colaborações entre couriers que cobrem áreas em comum mas nunca trabalharam juntos
MATCH (c1:Courier)-[:COMPLETED_DELIVERY]->(area:Area)<-[:COMPLETED_DELIVERY]-(c2:Courier)
WHERE c1 <> c2 AND NOT EXISTS((c1)-[:COLLABORATED_WITH]-(c2))
WITH c1, c2, COUNT(DISTINCT area) AS commonAreas
WHERE commonAreas >= 5
RETURN c1.name, c2.name, commonAreas
ORDER BY commonAreas DESC
LIMIT 20;
```

Sempre eval com ground-truth (held-out edges); sem isso, não há como saber se as recomendações servem.

#### 2.17.8 GraphRAG — graph-augmented LLM retrieval (2024+)

Pattern: extrair entidades + relações do corpus → graph; em query time, extrair entidades da pergunta → traverse graph → enriquecer contexto pro LLM. Microsoft GraphRAG (open-source 2024) é referência.

Use case Logística: KB queries que precisam de relacionamentos entre entidades — "Quais couriers trabalharam em orders do tenant X com valor > $1k no último mês e tiveram complaint?". Vector search puro perde estrutura; GraphRAG traz a sub-rede relevante.

Watchout: entity disambiguation. Múltiplos "João Silva" colapsados em um node = respostas incorretas. Resolva com deterministic IDs + embedding similarity threshold.

#### 2.17.9 Logística applied stack

- **Neo4j 5.x + GDS 2.10+**.
- **Recommendation engine**: PageRank (top lojistas) + Common Neighbors (courier suggestions).
- **Fraud detection**: nightly cron → cycle detection (3-6 hop) + Louvain communities; flag clusters densos pra review humano.
- **Route optimization**: Yen's k-shortest paths pra rotas alternativas em real-time fallback.
- **GraphRAG** (experimental 2026): KB enriquecida com entity graph; A/B vs vector-only.
- **Cost real**: Neo4j Aura ~$200/mês (8GB RAM, 100GB storage); self-host Railway ~$100/mês (16GB Postgres-class node).

Algoritmos pesados (PageRank full graph, Louvain) rodam em batch noturno; resultados materializados em property dos nodes (`:Lojista {pagerank: 0.0042}`) consumidos em hot path com index lookup.

#### 2.17.10 Anti-patterns observados

- Recursive CTE em Postgres pra > 4 hops + 1M+ nodes (lento; migrar pra graph DB).
- PageRank sem tuning de damping factor (0.85 default; ajuste por domínio).
- Louvain em grafo com modularidade fraca (sem clusters claros; output é lixo).
- Shortest path unweighted quando distance importa (BFS dá nodes, não km).
- Cycle detection sem depth limit (combinatorial explosion; cap `maxDepth`).
- GDS algorithm em produção sem named graph projection (re-projeta a cada call; caro).
- Centrality em grafo com 1B+ nodes em-memory (use distributed: GraphFrames Spark).
- Link prediction sem ground-truth eval (impossível medir qualidade).
- GraphRAG sem entity disambiguation ("João Silva" colapsado em um node).
- Real-time graph algorithms em hot path (cache results; refresh em cron noturno).

Cruza com **02-16 §2.16** (Cypher patterns base), **02-09** (Postgres recursive CTE alternative), **04-10** (GraphRAG + LLM context), **04-13** (graph como data source pra ML / GNN), **04-09** (scaling pra billion-node distributed).

---

### 2.18 Graph DB landscape 2026 — Neo4j 5 + Memgraph + AGE + GQL ISO standard

#### Vendor landscape 2026

Mercado consolidado em poucas opções viáveis. Decisão por workload, não por hype.

- **Neo4j 5** (LTS 5.x active 2024-2026, default em enterprise). Property graph native, Cypher, graph algorithms via GDS library, cluster via Causal Cluster, federated query via Fabric. Community edition limitada a 4 cores; Enterprise paywall pra produção séria.
- **Memgraph 3.x** (in-memory, C++, Cypher-compatible; current GA 3.8 Fev 2026). Streaming-first via Kafka/Pulsar nativo, MAGE algorithms library (PageRank, Louvain, betweenness). Real-time graph analytics sub-100ms em 1B+ edges in-RAM.
- **Apache AGE 1.5** (Postgres extension, Q1 2024 com PG16 support; 1.6 atual em 2026). Hybrid graph + relational, openCypher subset sobre Postgres. JOIN entre graph e tabela relacional na mesma transaction. Trade-off: query planner fraco vs Neo4j; sem PageRank built-in.
- **TigerGraph 4** (distributed, GSQL próprio). Petabyte-scale, parallel processing nativo. Curva de aprendizado de GSQL afasta times sem dedicação.
- **Amazon Neptune** (managed AWS, suporta Property Graph + RDF). Lock-in AWS forte; útil pra times AWS-native sem capacity de operar Neo4j cluster.
- **JanusGraph** (open-source, distribuído sobre Cassandra/HBase/BerkeleyDB). Flexibilidade de storage backend, mas ops pesada.

Decision matrix:

| Workload | Escolha |
|----------|---------|
| OLTP graph (recommendations, fraud, social) | Neo4j 5 |
| Streaming + real-time analytics | Memgraph 3.x |
| "Graph features sem novo DB" (Postgres já existe) | Apache AGE |
| AWS-native managed | Neptune |
| Petabyte-scale, time dedicado | TigerGraph |
| Knowledge graph + RDF + reasoning | Neptune RDF / GraphDB / Stardog |

#### GQL ISO standard (ISO/IEC 39075:2024)

Publicado Abril 2024. Primeira **ISO graph query language standard**. Baseado em Cypher (Neo4j contribuiu material substancial). Objetivo: encerrar fragmentação SPARQL/Cypher/Gremlin/GSQL.

Adoption 2026:

- **Neo4j 5.13+**: GQL parcial (path patterns, novas keywords). Cypher continua suportado em paralelo.
- **Memgraph**: openCypher-compatible, GQL roadmap pra 2.x.
- **Apache AGE**: openCypher subset, GQL longe.

Migration path Cypher → GQL é majoritariamente syntax-compat. Novas semantics relevantes: `MATCH ... PATH` com path mode (`WALK`, `TRAIL`, `ACYCLIC`, `SIMPLE`) explícito, evitando ambiguidade de cycle handling.

```cypher
-- GQL path mode explícito
MATCH p = ANY SHORTEST (a:Courier)-[:DELIVERS*1..5]->(b:Region)
WHERE a.id = $courierId
RETURN p
```

#### Apache AGE deep

Install + setup por session:

```sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

SELECT create_graph('logistics');
```

Query (Cypher embedded em SQL):

```sql
SELECT * FROM cypher('logistics', $$
  MATCH (c:Courier)-[:ASSIGNED]->(o:Order)-[:IN]->(r:Region)
  WHERE r.code = 'SP-CENTRO'
  RETURN c.name, count(o) AS orders
$$) AS (name agtype, orders agtype);
```

JOIN graph + relational (vantagem matadora vs Neo4j standalone):

```sql
SELECT g.name, o.total_brl, o.created_at
FROM cypher('logistics', $$
  MATCH (c:Courier {id: 'CR-007'})-[:ASSIGNED]->(o:Order)
  RETURN o.id AS order_id, c.name AS name
$$) AS g(order_id agtype, name agtype)
JOIN orders o ON o.id = (g.order_id::text)::int;
```

Pros: connection Postgres existing, transaction unified, ops sem novo DB. Cons: planner não otimizado pra deep traversal, graph algorithms ausentes, agtype casting verbose. Adopters reais: Bitnine (criador), uso interno em telecom + finance.

#### Memgraph 3.x

In-memory native, C++, Cypher + MAGE library (PageRank, community detection Louvain, betweenness, similarity). Streaming integration nativa: stream Kafka topic vira evento graph sem ETL.

```cypher
CREATE KAFKA STREAM order_events
  TOPICS 'orders.created'
  TRANSFORM kafka_transform.order_to_graph
  BOOTSTRAP_SERVERS 'kafka:9092';
START STREAM order_events;
```

Use case canônico: real-time fraud detection (sub-100ms graph query em 1B+ edges in-memory). Custo: RAM-bound. Planejar **1.5-2x dataset size em RAM** (overhead de índices, snapshots, WAL). Dataset 100GB exige máquina 200GB RAM mínimo.

#### Property graph vs RDF (2026 angle)

| Eixo | Property Graph | RDF Triple Store |
|------|----------------|------------------|
| Modelo | nodes/edges com properties | (subject, predicate, object) triples |
| Schema | flexible, label-based | ontology-driven (OWL, RDFS) |
| Query | Cypher / GQL | SPARQL |
| Sweet spot | OLTP, app data | knowledge graphs, reasoning, federation |
| Vendors 2026 | Neo4j, Memgraph, AGE | GraphDB, Stardog, Neptune RDF |

2026: **GraphRAG pra LLMs adopta property graph** (pragmatic) mais que RDF (semantic web ideology). Wikidata mantém RDF; Microsoft GraphRAG, Neo4j GenAI, LlamaIndex KG default em property graph.

#### GraphRAG patterns 2026

Microsoft GraphRAG (paper arXiv 2404.16130, Abr 2024) reporta substantial improvements em comprehensiveness e diversity sobre vector RAG puro pra "global questions":

1. LLM extrai entities + relationships de chunks de documento.
2. Constrói property graph; aplica community detection (Leiden algorithm).
3. LLM gera summary por community (hierarchical).
4. Query: vector search escolhe community summaries relevantes; graph traversal expande context; LLM responde.

Stack típico 2026: Neo4j 5 + LangChain `GraphCypherQAChain` ou Neo4j GenAI integrations (vector index nativo desde 5.11, HNSW). Cross-ref: ver **04-10** (RAG patterns) e **04-13** (graph como input pra GNN).

#### Performance tuning 2026

- **Index-free adjacency** vence em deep traversal (5+ hops). Postgres recursive CTE bate em 1-2 hops com índices certos. Benchmark per-workload, não por dogma.
- **Neo4j**: `dbms.memory.pagecache.size` ≈ dataset size; heap separado pra query (Xmx 16-32GB típico).
- **Memgraph**: tudo em RAM; storage mode `IN_MEMORY_ANALYTICAL` desliga MVCC pra batch queries (5-10x faster, sem isolation).
- **Sharding**: Neo4j Fabric (federated query, manual shard key); Neptune cluster auto-shard; TigerGraph distributed nativo.
- **Indexes**: criar em property usado em `MATCH (:Label {prop: $val})`. Sem index, full label scan.

#### Migration playbook

Não migrar preventively. Graph DB é overhead operacional real (cluster, backup, monitoring, query language nova pro time). Sequência:

1. **Postgres recursive CTE** até latência > 100ms em 4+ hops ou query ilegível.
2. **Apache AGE** se Postgres já é stack — mantém ops, adiciona Cypher onde dói.
3. **Neo4j / Memgraph standalone** quando workload graph-dominant (>30% das queries são path/traversal) ou algorithms (PageRank, community) viram requisito.

#### Tooling 2026

- **Neo4j Bloom**: visual exploration pra business users, perspective-based.
- **Memgraph Lab**: query IDE, visualização, profiling.
- **AGE Viewer**: visualização básica, ainda imatura.
- **GraphFrames** (Spark): batch analytics em billion-edge graphs (PageRank distribuído).
- **NetworkX** (Python): in-memory pra graphs <1M edges, prototyping e research.

#### Graph visualization + multi-tenant graph isolation 2026

**Visualization stack 2026:**

- **Neo4j Bloom 2.x** — visual exploration pra business users (não-devs), não-código, salvar perspectives. Bundle Enterprise; standalone $$ ($16k/yr min Enterprise).
- **Memgraph Lab 3.x** — gratuito, open source, SR-friendly, integração nativa Memgraph + MAGE algorithms.
- **AGE Viewer** (Apache, gratuito) — Postgres extension AGE; query Cypher via web UI, render graph result inline.
- **Cytoscape.js 3.30+** — biblioteca JS production-ready embeddable em SPA, force-directed layouts (cola + fcose + euler engines), max usable ~10-20k nodes em browser sem WebGL.
- **Sigma.js v3** — WebGL-based, escala pra 50k+ nodes em browser sem janks, chained com Graphology library pra data manipulation.
- **vis-network** — DEPRECATED em 2026 (último release 2023, sem maintenance); migrar pra Cytoscape ou Sigma.
- **GraphML / GEXF / JSON Graph Format** — interchange formats pra import/export Gephi (desktop visualization para datasets > 1M edges).

**Multi-tenant isolation patterns em graph DB:**

Neo4j single-DB multi-tenant é arriscado (cross-tenant leak via Cypher injection ou query mal escrita). **Patterns 2026:**

1. **DB-per-tenant** (Neo4j 4.x+ Multi-Database) — total isolation, mas overhead operacional alto em > 1k tenants; cada DB tem own page cache.
2. **Label-based isolation** — todo node tem label `:Tenant_<id>`; queries forçam `MATCH (n:Tenant_acme) ...`; risco de query developer esquecer label.
3. **Property-based + Cypher rewriting** — middleware de query parse Cypher AST e injeta `WHERE n.tenantId = $tid` em todo MATCH (analog a row-level security em SQL). Open-source: `cypher-rewriter` (community).
4. **Apache AGE + Postgres RLS** — AGE roda em Postgres, então Postgres Row-Level Security policies aplicam. **Vantagem ENORME pra multi-tenancy** sobre Neo4j standalone.
5. **Memgraph multi-database** (Enterprise) — similar a Neo4j; gratuito Community não tem.

```cypher
// Anti-pattern: missing tenant filter (cross-tenant leak risk)
MATCH (u:User)-[:ORDERED]->(o:Order) RETURN u, o;

// Correct: tenant-scoped
MATCH (u:User {tenantId: $tid})-[:ORDERED]->(o:Order {tenantId: $tid}) RETURN u, o;
```

```sql
-- AGE + Postgres RLS combo
CREATE POLICY tenant_isolation ON ag_label.user
  USING ((properties->>'tenantId')::uuid = current_setting('app.tenant_id')::uuid);
```

**Real impact:** SaaS B2B com graph dataset por tenant deveria escolher AGE + RLS antes de Neo4j multi-DB; ROI operacional brutal em > 100 tenants.

#### Logística applied

Rotas multi-stop com restrições (vehicle capacity, time windows): **Memgraph in-memory** pra pathfinding + replay de eventos via Kafka stream. Knowledge graph "couriers ↔ regions ↔ orders" em **Apache AGE** (mantém Postgres já existente, JOIN direto com tabela `orders` sem ETL). GraphRAG sobre tickets de suporte ("by similar issue") via **Neo4j 5 + LangChain** com vector index nativo.

#### Cruza com

**02-16 §2.16** (Cypher patterns), **02-16 §2.17** (graph algorithms applied), **../02-09** (Postgres + recursive CTE alternative), **../../04-llms-ai/04-10** (GraphRAG context pra LLMs), **../../04-llms-ai/04-13** (graph como input pra GNN/streaming).

#### 10 anti-patterns

1. **AGE sem `LOAD 'age'` em cada session** — query falha com `function ag_catalog.cypher(...) does not exist`. Carregar via `session_preload_libraries` ou no início de cada connection.
2. **Neo4j Community em produção com > 4 cores** — license restringe core count, processo cap silencioso ou recusa boot. Enterprise license obrigatória pra prod séria.
3. **Memgraph dataset > RAM disponível** — sem swap policy, OOM crash em peak. Capacity plan 1.5-2x dataset size; alertar em 70% RAM.
4. **Cypher `MATCH` sem index em property filtrada** — full label scan, latência cresce linear com nodes. `CREATE INDEX FOR (n:Order) ON (n.status)`.
5. **Variable-length path sem upper bound** (`-[*]->`) — explosão combinatória, query nunca retorna. Sempre `[*1..5]` ou similar.
6. **AGE assumindo planner Postgres é graph-aware** — não é. Queries com 4+ hops degradam. Pra deep traversal ir pra Neo4j ou Memgraph.
7. **GraphRAG sem community summaries cacheados** — re-extrair entities/relationships por query custa $$$ em LLM tokens. Build offline, refresh incremental.
8. **RDF onde property graph resolve** — adotar SPARQL + ontology porque "é mais correto" sem requisito de reasoning é overengineering. App OLTP padrão é property graph.
9. **Mistura Cypher dialects sem awareness** — Neo4j Cypher tem features (`CALL { ... }` subqueries, `EXISTS` patterns) que Memgraph/AGE não suportam. Portabilidade quebra silenciosamente.
10. **Migrar Postgres → Neo4j sem benchmark** — hops rasos (1-2) com índice certo Postgres compete. Migrar "porque grafo" sem profiling vira regret operacional em 6 meses.

Fontes inline: ISO/IEC 39075:2024 (GQL standard, 12 Abr 2024); Microsoft GraphRAG paper (arXiv 2404.16130, Abr 2024); Neo4j docs 5.x; Apache AGE docs 1.5/1.6; Memgraph docs 3.x; openCypher spec.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar property graph e RDF; dar caso pra cada.
- Explicar native graph storage e por que vence em deep traversal.
- Escrever Cypher pra: friend-of-friend, shortest path entre dois nós, top-N PageRank.
- Justificar quando graph DB é overkill (profundidade rasa).
- Listar 4 graph algorithms e caso de uso.
- Diferenciar GraphQL e graph DB.
- Explicar hop count como cost driver.
- Modelar order/items decidindo o que vira node vs edge property.
- Explicar AGE como opção híbrida e seu trade-off.
- Diferenciar Cypher de Gremlin (declarativo vs imperativo).

---

## 4. Desafio de Engenharia

Estender a Logística com **roteamento de entregas via graph DB**.

### Especificação

1. **Setup**: Neo4j (Docker) ou Memgraph community.
2. **Schema**:
   - `(:Stop {id, address, lat, lng, type: 'pickup'|'dropoff'|'hub'})`.
   - `(:Courier {id, vehicle_type, capacity_kg})`.
   - `(:Order {id, weight_kg, deadline, status})`.
   - `(s1)-[:ROAD {distance_km, avg_minutes, traffic_factor}]->(s2)`.
   - `(:Order)-[:PICKUP_AT]->(:Stop)`, `(:Order)-[:DROPOFF_AT]->(:Stop)`.
   - `(:Courier)-[:CARRIES]->(:Order)`.
3. **Seed**:
   - 200 stops na cidade (lat/lng reais ou simulados).
   - 600 ROAD edges com distância e tempo.
   - 50 couriers, 500 orders ativos.
4. **Queries via Cypher**:
   - Shortest path entre dois stops (Dijkstra com weight = avg_minutes * traffic_factor).
   - Top 10 stops mais centrais (betweenness centrality, GDS).
   - Couriers within 5km de uma origem.
   - Detection de stops "isolados" (sem ROAD nos últimos X edges).
5. **Algoritmo de assignment**:
   - Batch script: para cada ordem nova, encontre courier viável (capacity ok, dentro de raio do pickup) com menor extra time considerando rota atual. Atualiza grafo.
6. **API**:
   - `POST /assign` (atribui melhor courier).
   - `GET /route/:courier_id` retorna sequência de stops com tempo previsto.
7. **Comparação com SQL**:
   - Mesma query (shortest path 4 hops) em Postgres com `WITH RECURSIVE`. Compare latência e legibilidade. Documente em `comparison.md`.
8. **Visualização**:
   - Render mapa com Leaflet mostrando rota de um courier (frontend simples).

### Restrições

- Cypher escrito à mão (sem ORM gráfico).
- Sem cargar todo grafo em memória do app, queries vão ao DB.
- Tests cobrem: caminho mais curto correto, fallback se grafo desconectado, capacity respeitada.

### Threshold

- Shortest path 4-hop em < 50ms p95 em dataset acima.
- Assignment processa 500 orders em < 30s.
- `comparison.md` mostra Postgres recursive ≥ 5x mais lento e mais verboso.

### Stretch

- **A\*** custom usando heurística de distância haversine.
- **Time windows**: cada delivery tem janela; respeitar.
- **Multi-pickup**: um courier coleta 3 pedidos antes de descarregar.
- **PageRank** em stops pra identificar hubs e pré-posicionar couriers.
- **Memgraph Lab** ou **Bloom** pra explorar visualmente.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): adjacency list/matrix.
- Liga com **01-05** (algorithms): Dijkstra, A\*, BFS, PageRank, community detection.
- Liga com **02-09** (Postgres): comparação direta com `WITH RECURSIVE` + AGE.
- Liga com **02-15** (search): híbrido graph + full-text (busca contextual).
- Liga com **03-10** (backend perf): hop count = profile target.
- Liga com **04-05** (API design): GraphQL ≠ Graph DB; diferenciação útil.
- Liga com **04-06** (DDD): aggregates podem virar nodes; modelagem mais expressiva.
- Liga com **CAPSTONE-plataforma** e **CAPSTONE-sistemas**: roteamento real.

---

## 6. Referências

- **"Graph Databases" (2nd ed.)**: Robinson, Webber, Eifrem (O'Reilly, gratuito).
- **"Graph Algorithms"**: Mark Needham, Amy Hodler.
- **Neo4j docs** + Cypher manual.
- **Memgraph docs** (open source, in-memory).
- **OpenCypher spec** ([opencypher.org](https://opencypher.org/)).
- **GQL standard**: ISO/IEC 39075:2024.
- **"Designing Data-Intensive Applications"**: Kleppmann, capítulo 2 (data models).
- **Apache AGE docs**: Cypher sobre Postgres.
- **"Networks, Crowds, and Markets"**: Easley, Kleinberg. Teoria de redes.
- **Google Zanzibar paper**: permission graph at scale.
