---
module: 02-16
title: Graph Databases — Property Graph, Cypher, Path Queries, Graph Algorithms
stage: plataforma
prereqs: [01-04, 02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-16 — Graph Databases

## 1. Problema de Engenharia

Algumas queries são natural-mente **caminhos em grafos**: amigos de amigos, recomendação por co-purchase, fraud rings, dependências entre serviços, conhecimento corporativo, roteamento (Logística!). SQL pode resolver — `JOIN`s recursivos, CTEs — mas vira ilegível e lento à medida que profundidade cresce.

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

Encontra caminhos de 1 a 5 hops. Sem profundidade, pode explodir — sempre limite.

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
- Versão B: `(:Order)-[:CONTAINS {qty: 3}]->(:Product)`. Quantity vira property da edge — natural pra muitos:muitos com atributos.

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
- Sem cargar todo grafo em memória do app — queries vão ao DB.
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

- **"Graph Databases" (2nd ed.)** — Robinson, Webber, Eifrem (O'Reilly, gratuito).
- **"Graph Algorithms"** — Mark Needham, Amy Hodler.
- **Neo4j docs** + Cypher manual.
- **Memgraph docs** (open source, in-memory).
- **OpenCypher spec** ([opencypher.org](https://opencypher.org/)).
- **GQL standard** — ISO/IEC 39075:2024.
- **"Designing Data-Intensive Applications"** — Kleppmann, capítulo 2 (data models).
- **Apache AGE docs** — Cypher sobre Postgres.
- **"Networks, Crowds, and Markets"** — Easley, Kleinberg. Teoria de redes.
- **Google Zanzibar paper** — permission graph at scale.
