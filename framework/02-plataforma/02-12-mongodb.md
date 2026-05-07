---
module: 02-12
title: MongoDB, Document Model, Indexes, Aggregations, Replica Sets
stage: plataforma
prereqs: [02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-12, MongoDB

## 1. Problema de Engenharia

Mongo virou meme, "use Postgres" é o conselho default e correto pra maioria dos casos. Mas Mongo continua relevante: workloads com schema flexível (eventos heterogêneos, ingestão de dados de múltiplas fontes), agregações complexas em coleções grandes, modelos hierárquicos onde JOIN seria custoso. Saber Mongo bem te dá clareza sobre **quando relacional não é o ajuste certo** e como pensar em modelagem orientada a documento sem cair nos antipadrões.

Este módulo é Mongo de fato: storage engine (WiredTiger), modelo BSON, schema de fato implícito, índices (single, compound, text, geo, wildcard), aggregation pipeline, transações multi-documento, replica sets, sharding, e os trade-offs reais com Postgres + jsonb. Não é "Mongo é melhor que SQL", é entender onde encaixa.

---

## 2. Teoria Hard

### 2.1 Modelo de dados: documentos

- Coleção (collection) ≈ tabela.
- Documento ≈ row, mas é BSON (binary JSON-like) com tipos: string, int, double, decimal128, date, ObjectId, array, embedded document, binary, etc.
- Sem schema rígido enforced (até MongoDB 3.6+ ter `$jsonSchema` validators).
- Documentos podem aninhar arrays e documentos. Tamanho máximo: 16 MB por doc.

Document IDs:
- `_id` é PK obrigatório.
- Default: `ObjectId` (12 bytes: timestamp 4B + machine/pid 5B + counter 3B). Quase sortable por tempo.
- Pode usar UUID, string, número.

### 2.2 Schema (de fato)

Mongo permite docs heterogêneos. Em prática, **toda coleção tem schema implícito** que sua app espera. Sem disciplina, vira bagunça.

Validação:
- `db.createCollection('orders', { validator: { $jsonSchema: { ... } } })`.
- Action `error` (default) ou `warn`.
- Validator é checado em insert/update.

Em projeto sério: **sempre defina validator**. Combinado com Mongoose/Zod no app, garante shape.

### 2.3 Storage engine: WiredTiger

Default desde 3.2. B+Tree, compressão por block, MVCC.

- Compactação default: snappy (rápido) ou zstd (mais agressivo). Reduz disk size 60-80% comum.
- Cache de WiredTiger ocupa 50% de RAM total por default. Resto é page cache do OS.
- Operações concorrentes: locks em document level (intent locks na collection).

### 2.4 Indexes

Tipos:
- **Single field**: `{ status: 1 }`.
- **Compound**: `{ tenantId: 1, status: 1, createdAt: -1 }`. Order matters (mesma regra de B-Tree).
- **Multikey**: índice em array, Mongo cria entry por elemento. Cuidado: índice multikey em arrays grandes infla.
- **Text**: full-text. Limitado vs Elasticsearch/Postgres tsvector. Usado pra search simples.
- **2dsphere**: geoespacial.
- **Hashed**: pra sharding por hash key.
- **Wildcard**: `{ "$**": 1 }` indexa todos os fields (cuidado, custoso).
- **Partial**: `{ partialFilterExpression: { status: 'active' } }`.
- **TTL**: `{ expireAfterSeconds: N }` em campo date, Mongo deleta docs após.
- **Unique**: garante unicidade. Em multikey unique, garante que o array não tem entries duplicadas globalmente.

Sempre crie index em background (default em versões modernas, não bloqueia).

### 2.5 Query e projection

```js
db.orders.find(
  { tenantId: t, status: { $in: ['pending', 'paid'] } },
  { _id: 1, total: 1, customerName: 1 }
).sort({ createdAt: -1 }).limit(20);
```

Operators:
- Comparison: `$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$nin`.
- Logical: `$and`, `$or`, `$not`, `$nor`.
- Element: `$exists`, `$type`.
- Array: `$all`, `$elemMatch`, `$size`.
- Evaluation: `$regex`, `$expr`, `$jsonSchema`.

`$expr` permite usar aggregation expressions em queries.

### 2.6 Update operators

- `$set`, `$unset`, `$inc`, `$mul`.
- `$push`, `$pull`, `$addToSet` em arrays.
- `$rename`.
- Posicional: `$` (matched element), `$[]` (todos), `$[<filter>]` (filtered).
- `arrayFilters` define filtros por nome.

```js
db.orders.updateOne(
  { _id, "items.sku": "X" },
  { $set: { "items.$.quantity": 5 } }
);
```

### 2.7 Aggregation pipeline

A feature flagship do Mongo. Sequência de stages que transformam documentos:

```js
db.orders.aggregate([
  { $match: { tenantId: t, createdAt: { $gte: yesterday } } },
  { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } },
  { $sort: { count: -1 } }
]);
```

Stages comuns:
- `$match`: filter (use cedo, antes de transformações pesadas).
- `$project` / `$set` / `$unset`: shape.
- `$group`: agrupamento + accumulators.
- `$sort`, `$limit`, `$skip`.
- `$lookup`: JOIN-like (com outra collection). Custoso.
- `$unwind`: desempacota array em N docs.
- `$facet`: pipelines paralelos no mesmo input.
- `$bucket` / `$bucketAuto`: histogramas.
- `$graphLookup`: traversal recursivo.
- `$merge` / `$out`: persistir resultado.
- `$densify`, `$fill`: time-series helpers.

`$lookup` é JOIN, mas executar em coleções grandes sem índice é desastroso. Em queries críticas, denormalize ou faça JOIN no app.

### 2.8 Modelagem: embed vs reference

Decisão central. Não há "regras" universais; há trade-offs:

**Embed (nested doc)**:
- 1 read traz tudo.
- Atomicidade em update (single doc).
- Bom pra dados que sempre lidos juntos e raramente compartilhados.
- Limite 16 MB/doc.

**Reference**:
- Você guarda `customerId`, faz query separada (ou `$lookup`).
- Bom quando dados independem ou têm cardinalidade alta.

Heurísticas:
- "1 to 1" → embed.
- "1 to few" (< 100) e raro mudar → embed.
- "1 to many" (10k+) → reference.
- "many to many" → reference (ou bucket).
- Se sub-doc é usado por outras entidades → reference.

### 2.9 Transactions

Pre-4.0: atomicidade só no nível de documento.
4.0+: multi-document transactions em replica set.
4.2+: transactions em sharded cluster.

```js
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await orders.updateOne({ _id }, { $set: { status: 'paid' } }, { session });
    await events.insertOne({ orderId: _id, type: 'paid' }, { session });
  });
} finally {
  await session.endSession();
}
```

**Custo**: txns multi-doc são mais lentas (locks, MVCC overhead). Mongo recomenda design que minimize txns multi-doc, embed quando possível.

### 2.10 Replica sets

Cluster de N nós: 1 primary + replicas + (opcional) arbiter.
- Primary aceita writes; replicas aplicam oplog.
- Failover automático: se primary cai, eleição entre replicas (Raft-like).
- `oplog` é capped collection no primary; replicas tail.

Read preference (cliente escolhe):
- `primary` (default).
- `primaryPreferred`.
- `secondary` / `secondaryPreferred`.
- `nearest`.

Write concern:
- `{ w: 1 }`: ack do primary (default em alguns drivers).
- `{ w: 'majority' }`: ack de majority. Mais durável, mais latente.
- `{ j: true }`: journal. Garante durabilidade local antes de ack.
- `{ wtimeout: ms }`: timeout para w concern.

Read concern:
- `local`: padrão.
- `majority`: dados commitados em majority.
- `linearizable`: stronger, mais lento.

Em prod: writes com `majority`, reads default `local` (ou `majority` em workloads onde stale leitura é problema).

### 2.11 Sharding

Mongo faz sharding nativo, ao contrário de Postgres (Postgres precisa de Citus/Foreign Tables).

Componentes:
- `mongos`: router. Cliente conecta nele.
- Config servers: armazenam metadata de chunks.
- Shards: replica sets que armazenam dados.

Shard key: campo (ou compound) que define como docs se distribuem. Decisões:
- **Hashed shard key**: distribuição uniforme, mas range queries cruzam shards.
- **Ranged**: ordem natural, range queries focadas, mas hotspots em valores monotônicos (ObjectId, timestamp).
- **Compound** com hash em parte: equilíbrio.

Escolha errada: re-shard é trabalhoso. Em projetos < 1 TB, não shardar, replica set comum sustenta.

### 2.12 Atlas, Mongo self-hosted, e alternativas

- **Atlas**: managed da MongoDB Inc. Backup, monitoring, search (Atlas Search baseado em Lucene), vector search, time series.
- **Self-hosted**: cluster próprio. Operação não-trivial.
- **DocumentDB** (AWS): API-compatível parcial. Não é Mongo real.
- **CosmosDB** (Azure): API Mongo entre outras. Compat parcial.

Atlas Search e Vector Search agregam features que historicamente exigiam Elasticsearch / pgvector adicionais.

### 2.13 Drivers e ODMs

Node:
- Driver oficial `mongodb` (low-level).
- **Mongoose**: ODM popular. Schemas, validação, middleware. Mais opinado, custo de abstração.
- **Typegoose**: Mongoose com TS decorators.

Em projetos onde tipagem importa: driver direto + Zod, ou Mongoose com `Schema` cuidadosamente tipados, ou wrappers como `mongo-models` ou Drizzle (que adicionou suporte a Mongo). Não ache que ODM substitui domain layer.

### 2.14 Quando Mongo vence Postgres

- Documentos heterogêneos (eventos de múltiplas integrações com schemas distintos).
- Data ingestion massivo onde schema-on-read importa.
- Geo + tempo + flexibilidade num único stack (Atlas).
- Operação simples em múltiplas regiões (replica sets multi-region).
- Leitura primária por document id, sem JOINs frequentes.

### 2.15 Quando Postgres vence

- Relações ricas, integridade referencial.
- ACID multi-row trivial.
- Queries analíticas complexas (window, CTE).
- Workloads OLAP-ish.
- Maior conjunto de extensões (pgvector, postgis, timescale).
- Time já domina SQL.

Para dúvida típica em backend de aplicação CRUD-ish: comece com Postgres. Adicione Mongo só se você bate em uma necessidade clara.

### 2.16 Antipadrões comuns

- Tratar Mongo como Postgres: muitos `$lookup`, normalização excessiva, transações multi-doc onipresentes. Você está usando Mongo errado.
- Esquecer schema validator: drift catastrófico em meses.
- Index em todo lugar: index inflado, write penalizado.
- Documentos crescendo unbound: arrays com 100k entries quebram queries e replication.
- ObjectId como shard key sem hash: hotspot em writes (sempre o último shard).

### 2.17 Backup e operação

- `mongodump` / `mongorestore`: dump lógico. Para datasets pequenos.
- `mongosh` é o shell oficial novo.
- Snapshots de filesystem: pra clusters grandes.
- Atlas faz tudo automated.
- Compactação: `compact` (libera espaço pós-DELETEs); em replica sets, fazer um nó por vez.

### 2.18 Schema design deep — embed vs reference, aggregation pipeline, transaction limits

MongoDB schema = trade-off contínuo. "Embed everything" vence em read-heavy mas explode em update + atinge 16MB doc limit. "Reference everything" vira N+1 disfarçado em NoSQL. Aggregation pipeline tem 30+ stages, mas mal-orquestrado consome RAM brutal. Transactions custam 2-5x latência vs single-doc atomic ops. Esta seção dá decision tree concreto + código produção.

#### Embed vs reference — decision matrix

| Cenário | Embed | Reference |
|---|---|---|
| One-to-few (< 100 children) | ✓ | overkill |
| One-to-many com bound conhecido (< 1000) | ✓ se < 16MB | ✓ se queries variam |
| One-to-many unbounded (logs, comments) | ✗ (16MB limit) | ✓ |
| Many-to-many | ✗ | ✓ (refs ou junction collection) |
| Acessado SEMPRE junto | ✓ | ✗ |
| Acessado independente frequente | ✗ | ✓ |
| Update do child sem ler parent | ✗ | ✓ |
| Atomicity entre child e parent obrigatória | ✓ (single-doc atomic) | requires transaction |

#### Embed pattern — order com items + courier snapshot

```javascript
// orders collection
{
  _id: ObjectId("..."),
  tenantId: UUID("..."),
  status: "in_transit",
  items: [
    { productId: ObjectId("..."), name: "Smartphone X", qty: 2, unitPrice: 1500_00, subtotal: 3000_00 },
    { productId: ObjectId("..."), name: "Capa", qty: 1, unitPrice: 50_00, subtotal: 50_00 }
  ],
  courier: {
    _id: ObjectId("..."),
    name: "João Silva",
    vehicle: "moto",
    phoneSnapshot: "+5511999..."
  },
  total: 3050_00,
  createdAt: ISODate("2026-04-15T..."),
  statusHistory: [
    { status: "pending", at: ISODate("...") },
    { status: "in_transit", at: ISODate("...") }
  ]
}
```

- Reads pra "show order detail" = 1 query, 0 JOINs.
- Snapshot do courier (`name`, `vehicle`) congela o nome NO MOMENTO da assignação — historical accuracy preservada se courier muda nome depois.
- **Pegadinha**: courier mudou phone em prod. App mostrando order antiga vê phone antigo. **Decisão correta**: snapshot de campos imutáveis-no-contexto + ref pra source of truth.

#### Reference pattern — events em collection separate

```javascript
// tracking_pings collection (high-write, unbounded)
{
  _id: ObjectId("..."),
  orderId: ObjectId("..."),
  courierId: ObjectId("..."),
  coords: { type: "Point", coordinates: [-46.633, -23.55] },
  speedKmh: 45.2,
  accuracyM: 8.5,
  ts: ISODate("...")
}

// Index pra lookup por order
db.tracking_pings.createIndex({ orderId: 1, ts: -1 });

// Time-series collection (Mongo 6+, melhor performance pra time data)
db.createCollection('tracking_pings', {
  timeseries: {
    timeField: 'ts',
    metaField: 'meta',  // { courierId, orderId }
    granularity: 'seconds'
  },
  expireAfterSeconds: 90 * 24 * 3600
});
```

- Embed seria error: 1 order = milhares de pings → bate 16MB doc limit em horas.
- Time-series collection: comprime time data internamente; indexes automatic em `meta` campos.

#### Schema versioning — escapar de migration nightmare

```javascript
// Pattern: schemaVersion field + lazy migration
{
  _id: ObjectId("..."),
  schemaVersion: 2,
  name: "Acme Corp",
  // v2: added 'tier' field
  tier: "premium"
}

// Migration in app code
function migrateLojista(doc) {
  if (doc.schemaVersion === 1) {
    doc.tier = doc.legacyPlan === 'pro' ? 'premium' : 'standard';
    doc.schemaVersion = 2;
    db.lojistas.updateOne({ _id: doc._id }, { $set: { tier: doc.tier, schemaVersion: 2 } });
  }
  return doc;
}
```

- Sem `schemaVersion`: 5 anos de prod = 7 estruturas diferentes na mesma collection. Code precisa handle todas.
- Lazy migration: paga custo só em docs lidos. Background batch migration pra cleanup.

#### Aggregation pipeline patterns

```javascript
// Top 10 lojistas por revenue last 30 days, com nome populated
db.orders.aggregate([
  { $match: {
      tenantId: UUID("..."),
      status: "completed",
      createdAt: { $gte: ISODate("...") }
  }},
  { $group: {
      _id: "$lojistaId",
      orderCount: { $sum: 1 },
      totalRevenue: { $sum: "$total" }
  }},
  { $sort: { totalRevenue: -1 }},
  { $limit: 10 },
  { $lookup: {
      from: "lojistas",
      localField: "_id",
      foreignField: "_id",
      as: "lojista",
      pipeline: [
        { $project: { name: 1, tier: 1 }}    // só campos necessários
      ]
  }},
  { $unwind: "$lojista" },
  { $project: {
      lojistaName: "$lojista.name",
      tier: "$lojista.tier",
      orderCount: 1,
      totalRevenue: 1
  }}
]);
```

- **`$match` PRIMEIRO**: aproveita index. Sem index em `tenantId` + `createdAt`, full collection scan.
- **`$lookup` com pipeline**: filtra/projeta no lookup; sem isso, traz docs inteiros.
- **`$project` no fim**: reduz network bytes ao client.

#### Aggregation memory limits

```javascript
db.orders.aggregate([...], {
  allowDiskUse: true,    // pra stages que excedem 100MB RAM (sort, group)
  maxTimeMS: 30000,      // kill após 30s
  hint: { tenantId: 1, createdAt: -1 }   // force index
});
```

- `$sort`/`$group` sem index podem alocar 100MB+ RAM. `allowDiskUse: true` spilla pra disk (lento mas não OOM).
- **Pegadinha em scale**: 100 queries simultâneas com aggregation pesado = 10GB+ RAM consumido. Use materialized views via `$out` pra pre-computar.

#### `$merge` / `$out` — materialized views

```javascript
// Materialized daily revenue per tenant
db.orders.aggregate([
  { $match: { status: "completed" }},
  { $group: {
      _id: { tenant: "$tenantId", day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }}},
      revenue: { $sum: "$total" },
      orderCount: { $sum: 1 }
  }},
  { $merge: {
      into: "daily_revenue",
      on: ["_id"],
      whenMatched: "replace",
      whenNotMatched: "insert"
  }}
]);
```

- Schedule via cron job. Dashboard query lê de `daily_revenue` direto, < 50ms.

#### Transactions — quando vale e quando NÃO

```javascript
// Multi-doc atomic — Mongo 4+
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await db.orders.insertOne({ ... }, { session });
    await db.inventory.updateOne(
      { productId: pid },
      { $inc: { stock: -1 }},
      { session }
    );
  }, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 5000
  });
} finally {
  await session.endSession();
}
```

- **Custo**: 2-5x latência vs single-doc atomic ops.
- **Limites**: max 16MB de modificações em transação; max 1min duração default; lock contention em mesmo doc.
- **Quando vale**: cross-collection invariant (decrement inventory + insert order); read isolation snapshot.
- **Quando NÃO**: 80% dos casos pode ser single-doc atomic via `$set`/`$inc`/`$push` em embedded array. Embed-design correto evita transaction need.

#### Anti-patterns observados

- **Embed unbounded**: comments embedded em post; viral post hits 16MB doc limit. Always cap embed array.
- **Reference quando embed serve**: `{ orderId, productId }` em items array; cada read faz `$lookup` de products; vira aggregation N+1.
- **`$lookup` sem índice no `foreignField`**: full scan da collection lookup. Index obrigatório.
- **Aggregation sem `$match` first**: full collection scan; performance cai 100x em scale.
- **`allowDiskUse: true` como default**: mascara queries mal-projetadas; lentidão silenciosa. Remova; deixe queries quebrar; force optimization.
- **Schema sem `schemaVersion`**: app code com 7 if/else por versão.
- **Transactions pra single-collection update**: overhead inútil. Use single-doc atomic.
- **Snapshot fields sem TTL/refresh strategy**: courier name muda; orders antigas mostram nome antigo OK; mas profile pic url quebra após 6 meses (CDN delete). Document refresh policy.
- **`db.collection.find().sort()` sem index compound**: scan + in-memory sort. Compound index `{ filter: 1, sort: -1 }`.

Cruza com **02-12 §2.10** (replica sets — w='majority' pra durability), **02-12 §2.11** (sharding afeta transaction scope), **02-12 §2.16** (anti-patterns gerais), **02-09** (comparação Postgres pra mesmas decisions), **04-13 §2.12** (CDC de Mongo via change streams).

### 2.19 Aggregation pipeline advanced ($lookup, $graphLookup, $facet, time-series, $merge analytics)

Aggregation pipeline é o motor analytics do Mongo (7+, Atlas 2026). Domine stages avançados: `$lookup` (joins), `$graphLookup` (recursão), `$facet` (multi-pipeline), time-series collections, `$merge` (materialized views). Sem isso, fallback pra app-side joins ou sync pra warehouse — caro e lento.

**Mental model**: pipeline = sequência de stages; documents fluem, transformam-se a cada stage. Stage order é load-bearing: `$match` first reduz input ANTES de operations caras; `$project` reduz fields para minimizar memory; `$sort` aproveita index APENAS se vier antes de stages que transformam (`$group`, `$lookup`). Memory limit: 100MB per stage default; `allowDiskUse: true` permite spill ao disk (10x mais lento). Index usage: APENAS `$match` + `$sort` em stages iniciais.

**`$lookup` deep — equivalente SQL JOIN**:
```js
db.orders.aggregate([
  { $match: { tenantId: 'tenant-123', status: 'delivered' } },  // first: usa index
  { $lookup: {
    from: 'couriers',
    localField: 'courierId',
    foreignField: '_id',
    as: 'courier'
  }},
  { $unwind: '$courier' },  // flatten array (1-to-1 join)
  { $project: { _id: 1, courierName: '$courier.name', deliveredAt: 1 } }
]);
```

**Pipeline-form `$lookup`** (mais poderoso; filtra dentro do JOIN):
```js
{
  $lookup: {
    from: 'couriers',
    let: { cid: '$courierId', tid: '$tenantId' },
    pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ['$_id', '$$cid'] },
        { $eq: ['$tenantId', '$$tid'] },
        { $eq: ['$active', true] }
      ]}}},
      { $project: { name: 1, vehicleType: 1 } }
    ],
    as: 'courier'
  }
}
```

Pegadinha performance: `$lookup` SEM index em `foreignField` = O(N×M) brutal. Index obrigatório.

**`$graphLookup` — recursive traversal**: hierarquias (org chart, comment threads, courier referral chains). Logística — referral chain até 3 níveis:
```js
db.couriers.aggregate([
  { $match: { _id: ObjectId('...') } },
  { $graphLookup: {
    from: 'couriers',
    startWith: '$referredBy',
    connectFromField: 'referredBy',
    connectToField: '_id',
    as: 'referralChain',
    maxDepth: 3,
    depthField: 'depth'
  }}
]);
```

Index em `connectToField` mandatory; sem isso, recursive scan brutal. Max depth 100; recommend `< 5` em prod por perf.

**`$facet` — multi-pipeline single query**: roda múltiplas aggregations em parallel sem repeat input scan. Logística — dashboard cards (counts por status + top 5 couriers + revenue):
```js
db.orders.aggregate([
  { $match: { tenantId: 'tenant-123', createdAt: { $gte: ISODate('2026-05-01') } } },
  { $facet: {
    byStatus: [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ],
    topCouriers: [
      { $match: { status: 'delivered' } },
      { $group: { _id: '$courierId', deliveries: { $sum: 1 } } },
      { $sort: { deliveries: -1 } },
      { $limit: 5 }
    ],
    revenueTotal: [
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$priceCents' } } }
    ]
  }}
]);
```

Cost: input scanned uma vez + N output paths; vs N separate queries 10x faster.

**Time-series collections (Mongo 5.0+, stable 7+)**: native time-series storage com bucket optimization (similar TimescaleDB hypertables). Pattern courier location pings:
```js
db.createCollection('tracking_pings', {
  timeseries: {
    timeField: 'ts',
    metaField: 'metadata',         // grouping key (courierId, tenantId)
    granularity: 'minutes'         // 'seconds' | 'minutes' | 'hours'
  },
  expireAfterSeconds: 86400 * 90   // 90 days retention auto-purge
});

db.tracking_pings.insertMany([
  { ts: new Date(), metadata: { courierId: 'c1', tenantId: 't1' }, lat: 12.34, lng: 56.78 }
]);
```

Storage savings: 10-50x vs regular collection (column-oriented bucketization). Limitations: no UPDATE/DELETE per-document (apenas regen via `$out`); shard key deve incluir metaField.

**`$merge` — output to collection (materialized views)**: precompute analytics; refresh nightly via cron.
```js
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate('2026-05-01'), $lt: ISODate('2026-06-01') } } },
  { $group: {
    _id: { tenantId: '$tenantId', status: '$status' },
    count: { $sum: 1 },
    revenue: { $sum: '$priceCents' }
  }},
  { $merge: {
    into: 'monthly_reports',
    on: '_id',
    whenMatched: 'replace',
    whenNotMatched: 'insert'
  }}
]);
```

Diferença `$out` vs `$merge`: `$merge` upserts (incremental refresh, runs em background); `$out` substitui collection inteira e bloqueia reads no target.

**`$expr` + complex conditional logic** — inline expressions em `$match`/`$project`:
```js
{ $match: {
  $expr: {
    $and: [
      { $gt: [{ $size: '$items' }, 0] },
      { $lt: [{ $subtract: ['$deliveredAt', '$createdAt'] }, 1000 * 60 * 60 * 2] }  // delivered < 2h
    ]
  }
}}
```

Pegadinha: `$expr` não usa indexes pre-4.4 (improved 5+); ainda mais lento que pure index match. Use sparingly.

**Diagnostics + hints**:
- `.explain('executionStats')`: pipeline plan + per-stage timing + index usage.
- `.hint({ field: 1 })`: força specific index quando planner escolhe errado.
- `maxTimeMS: 5000`: kill aggregations slow.
- `allowDiskUse: true`: spill ao disk além do 100MB stage limit.

**Logística applied — analytics dashboard**:
- Real-time dashboard (lojista): `$facet` aggrega orders + couriers + revenue em `< 200ms` via index `(tenantId, createdAt, status)`.
- Materialized views (`monthly_reports`): nightly cron refresh via `$merge`; faster reads em year-over-year analysis.
- Time-series (`tracking_pings`): native time-series collection com 90d retention; 30x storage savings vs regular.
- Recursive courier referral: `$graphLookup` para spam detection (anel circular = fraud signal).

**Anti-patterns observados**:
- `$match` AFTER `$lookup`/`$project`: index não usado; full scan.
- `$lookup` em foreignField sem index: O(N×M) brutal.
- `$graphLookup` sem `maxDepth`: infinite recursion stack overflow.
- `$facet` em pipeline com 100GB input: cada branch scaneia full; redirect via early `$match`.
- Time-series collection com UPDATE expectation: silently fails; redesign para regular collection.
- `$merge` em hot path: write contention; schedule offline cron.
- `allowDiskUse: false` em large pipeline: errors em prod; default `true` em recent drivers.
- `$expr` em vez de native `$match` operators: less indexable.
- Aggregation com 20+ stages: refactor; intermediate `$out` para break pipeline.
- No `maxTimeMS` em hot endpoint aggregation: slow query DoS via crafted input.

Cruza com **02-09** (Postgres, equivalente CTE/window functions), **04-13** (streaming/batch, lakehouse alternativo), **02-15** (search, $search Atlas), **03-13** (analytics DBs alternative), **04-09** (scaling, sharding aggregation considerations).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar embed e reference, com 3 casos pra cada.
- Listar 4 tipos de index além de single field, com caso pra cada.
- Diagnosticar query lenta com `explain('executionStats')`, quais campos olhar.
- Explicar aggregation pipeline com 5 stages e regra "filter early".
- Distinguir read concern e write concern, e dizer quando subir cada.
- Explicar custo de transações multi-doc e como design evita.
- Justificar escolha de shard key com 1 caso de hotspot evitável.
- Detectar antipadrão "Mongo usado como Postgres" em código.
- Citar 3 contextos onde Mongo vence Postgres e 3 onde perde.
- Explicar oplog e papel em replication e CDC.

---

## 4. Desafio de Engenharia

Adicionar **MongoDB pra eventos de Logística**: não substitui Postgres, complementa.

### Especificação

1. **Stack**:
   - MongoDB 7+ (Atlas free tier ou Docker).
   - Driver oficial `mongodb` em Node (Fastify do 02-08).
   - Postgres continua como sistema primário (orders, users, etc.).
2. **Use case**:
   - Eventos heterogêneos de **integrações externas**: Webhook de PagSeguro, scraping de Correios, GPS streaming, mensagens de WhatsApp (mock). Cada um tem shape diferente.
   - Coleção `external_events` armazena tudo. Cada doc tem `source`, `receivedAt`, `tenantId`, `payload` (livre), `processedAt`, `result`.
3. **Schema validator**:
   - `external_events` tem `$jsonSchema` exigindo `source`, `tenantId`, `receivedAt`, `payload`.
   - `payload` pode ser qualquer shape (intencional).
4. **Indexes**:
   - `{ tenantId: 1, source: 1, receivedAt: -1 }`, listagem por tenant + source.
   - TTL: docs vivem 90 dias (`{ receivedAt: 1 }, expireAfterSeconds: 7776000`).
   - Multikey index em `payload.tags` (quando existe).
5. **Endpoints**:
   - `POST /webhooks/:source`, recebe e armazena evento.
   - `GET /events?tenant=X&source=Y&from=&to=`, paginated listing.
   - `GET /events/stats`, aggregation:
     - Por dia, por source: count, taxa de erro.
     - Top 10 tenants por volume.
     - Distribuição de latência receivedAt → processedAt.
6. **Worker de processamento**:
   - Lê eventos `processedAt: null`, processa (lógica fictícia: parse, atualizar order em Postgres se aplicável), marca `processedAt` e `result`.
   - **Atualizar order no Postgres + marcar evento processado no Mongo**: sem 2PC. Aplique outbox-ish: escreve resultado em coleção temp; só após order atualizado em Postgres, seta `processedAt`.
7. **Aggregation real**:
   - Pipeline com `$match` → `$group` → `$facet` → `$project` que produz dashboard com 3 métricas em 1 query.
8. **Replica set**:
   - Configure replica set local (3 nós via docker-compose).
   - Demonstre failover: matar primary, eleição, app continua escrevendo após reconnect.

### Restrições

- Sem Mongoose. Driver oficial direto.
- Sem `$lookup` na aggregation principal, denormalize se precisar (anote a decisão).
- Sem armazenar dados primários (orders, users) no Mongo. Mongo é storage de eventos heterogêneos.

### Threshold

- README documenta:
  - Por que Mongo aqui e não Postgres jsonb (vai além de "schema flexível": justifique).
  - Schema validator + uma tentativa de inserir doc inválido (rejection demonstrada).
  - Aggregation pipeline com `explain` mostrando uso de index.
  - Demonstração de failover + write concern majority.
  - Comparação: mesma agregação implementada em Postgres jsonb vs Mongo aggregation. Resultados, complexidade, performance.

### Stretch

- Time series collection (Mongo 5+) pra GPS streaming.
- Atlas Search pra busca textual em `payload`.
- Change Stream: app reage a inserts em `external_events` em real-time (via Mongo CDC).

---

## 5. Extensões e Conexões

- Liga com **02-09** (Postgres): contraste claro. Mongo não substitui; complementa.
- Liga com **02-10** (ORMs): Mongoose é ODM, mesma classe. Decisões de tipagem similares.
- Liga com **02-11** (Redis): cache-aside funciona igual.
- Liga com **02-14** (real-time): Change Streams pra fan-out reativo.
- Liga com **03-03** (Kubernetes): Mongo Operator (Percona, Bitnami) pra deploy.
- Liga com **03-05** (AWS): Atlas em AWS, ou DocumentDB.
- Liga com **04-01** (distributed systems): replica set é Raft-ish; majority writes mapeiam quorum.
- Liga com **04-03** (event-driven): Change Streams = base de CDC.

---

## 6. Referências

- **MongoDB docs** ([mongodb.com/docs](https://www.mongodb.com/docs/)), leia Data Modeling, Indexes, Aggregation, Replication.
- **"MongoDB: The Definitive Guide"**: Kristina Chodorow.
- **MongoDB University**: courses gratuitos, especialmente M001, M201, M320 (data modeling).
- **DDIA**: capítulos sobre document model e replication.
- **Daniel Coupal, "Building with Patterns"** ([mongodb.com/developer/patterns](https://www.mongodb.com/developer/patterns)), design patterns Mongo.
- **MongoDB blog**: Atlas Search, Time Series, Vector Search.
