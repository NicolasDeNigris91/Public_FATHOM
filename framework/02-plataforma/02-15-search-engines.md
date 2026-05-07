---
module: 02-15
title: Search Engines & Information Retrieval, Inverted Index, BM25, Vector Search
stage: plataforma
prereqs: [02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-15, Search Engines & Information Retrieval

## 1. Problema de Engenharia

Quase todo produto sério tem busca. Listagem de pedidos, catálogo, base de conhecimento, suporte ao cliente, descobrimento de produto. `LIKE '%foo%'` em Postgres não escala, sem índice apropriado, vira full scan; com `pg_trgm` vai um pouco; full-text com `tsvector` vai melhor; mas pra ranking sério, distância de edit, sinônimos, multilingual, faceting, autocomplete, fuzzy match, relevance tuning, você precisa de **search engine dedicado**.

E hoje, busca semântica (vector search via embeddings) entrou no mainstream, não substitui keyword, complementa. RAG (04-10) e busca híbrida BM25+vetor são padrão.

Este módulo é **information retrieval por dentro**: o que é inverted index, como tokenizer afeta tudo, o que é TF-IDF, BM25, vector embeddings, ANN search (HNSW), e como Elasticsearch/OpenSearch/Meilisearch/Typesense funcionam por baixo. Plus quando NÃO usar search engine (Postgres FTS basta) e quando obrigatório.

---

## 2. Teoria Hard

### 2.1 Inverted index

Estrutura central. Para cada **term** (palavra), lista de documentos que contêm:

```
"pedido" → [doc1, doc7, doc42]
"entrega" → [doc7, doc99]
```

Versão real armazena também posições (para phrase queries), term frequency (para ranking), e document length.

Build: tokenize, normalize, indexa cada term → docID. Search: pega query, tokenize do mesmo jeito, intersecta postings lists. Postings comprimidas (variable-byte, FOR delta encoding) economizam disco. Skip lists aceleram intersect.

### 2.2 Tokenization e analisadores

Pipeline de análise transforma texto em terms:
- **Char filter**: HTML strip, mapping (à → a).
- **Tokenizer**: split em palavras. Standard (Unicode), whitespace, keyword (sem split), edge_ngram (autocomplete).
- **Token filter**: lowercase, stop words remover, **stemming** (corre, correndo, corri → corr), synonyms, ASCII folding.

Linguagem importa. **Stemmer** pra português ≠ inglês (Snowball, RSLP). Multi-language: index por idioma ou usar field por idioma.

Edge case: stemmer agressivo perde precisão. Exemplo "universal" e "universidade" colapsam. Stemmer brasileiro RSLP é agressivo; Snowball é conservador.

### 2.3 Ranking: TF-IDF

Termo frequente no doc + raro no corpus = relevante. Score:
- **TF (term frequency)**: quantas vezes term aparece no doc.
- **IDF (inverse document frequency)**: `log(N / df_t)`, N = total docs, df_t = docs com o term.
- **TF-IDF** = produto.

Ingênuo, mas conceitualmente claro.

### 2.4 BM25 (Best Match 25)

Refinamento de TF-IDF (Robertson/Spärck Jones, 1994). Default em Elasticsearch e maioria dos engines. Fórmula:

```
score(q, d) = Σ_t IDF(t) * (TF(t,d) * (k1+1)) / (TF(t,d) + k1 * (1 - b + b * |d|/avgdl))
```

- `k1` (geralmente 1.2): controla saturation de TF (term repetido 100x não vale 100x mais).
- `b` (geralmente 0.75): normaliza por document length (docs curtos não vencem por densidade).
- `avgdl`: tamanho médio dos docs.

Tunar `k1`/`b` por corpus às vezes ajuda. Maioria usa default.

### 2.5 Vector embeddings e similarity

LLMs (e modelos menores tipo all-MiniLM, multilingual-e5) transformam texto em vetor (384-1536 dims). **Similar texto → vetores próximos**. Distância: cosine, dot product, L2.

Use case: busca semântica ("preciso de comida pra cachorro pequeno" casa com "ração para cães raça pequena" mesmo sem palavra comum).

Limitações: vetores capturam semântica geral, perdem nuance específica (números, IDs). Híbrido vence.

### 2.6 ANN: vizinhos próximos aproximados

Brute-force O(N) é proibitivo a milhões. **ANN** (Approximate Nearest Neighbor) tradeia recall por velocidade.

Algoritmos:
- **HNSW** (Hierarchical Navigable Small World): grafos em camadas, busca log(N). Default em maioria dos vector DBs (FAISS, pgvector, Qdrant, Milvus).
- **IVF** (Inverted File Index): clustering + busca em clusters relevantes.
- **PQ** (Product Quantization): comprime vetores. Combina com IVF.

Trade-off: build cost, memória, recall@k, latência.

### 2.7 Híbrido: BM25 + vector

Estado da arte. Estratégias:
- **RRF** (Reciprocal Rank Fusion): `score = Σ 1/(k + rank_i)` por sistema. Simples, bom default.
- **Linear combination**: `α * BM25 + (1-α) * cosine`. Ajustar α por dataset.
- **Cross-encoder rerank**: pega top-50 do híbrido, rodar modelo mais caro por par (query, doc) pra reordenar top-10.

Elasticsearch 8+, OpenSearch, Vespa, Weaviate suportam híbrido nativamente.

**Exemplo concreto em Postgres** (BM25 via `tsvector` + ANN via `pgvector` + RRF + cross-encoder rerank):

```sql
-- Schema
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE products (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description,'')), 'B')
  ) STORED,
  embedding vector(1024)  -- Cohere embed-v3 dim
);
CREATE INDEX ON products USING GIN (tsv);
CREATE INDEX ON products USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

```sql
-- RRF híbrido em CTE
WITH bm25 AS (
  SELECT id, ts_rank_cd(tsv, query) AS score, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, query) DESC) AS rank
  FROM products, plainto_tsquery('portuguese', $1) query
  WHERE tsv @@ query
  ORDER BY score DESC LIMIT 50
),
vec AS (
  SELECT id, 1 - (embedding <=> $2::vector) AS score, ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rank
  FROM products
  ORDER BY embedding <=> $2::vector LIMIT 50
)
SELECT p.id, p.title, p.description,
       COALESCE(1.0/(60 + b.rank), 0) + COALESCE(1.0/(60 + v.rank), 0) AS rrf_score
FROM products p
LEFT JOIN bm25 b USING (id)
LEFT JOIN vec  v USING (id)
WHERE b.id IS NOT NULL OR v.id IS NOT NULL
ORDER BY rrf_score DESC LIMIT 50;
```

`k = 60` é o constante padrão de RRF (Cormack et al, 2009); raramente vale tunar.

```typescript
// Cross-encoder rerank — Cohere Rerank API
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function search(query: string) {
  const queryEmbedding = await embed(query);                       // text-embedding-3 ou Cohere embed
  const candidates = await db.query(HYBRID_SQL, [query, queryEmbedding]);    // top 50

  // Rerank com cross-encoder (model = rerank-multilingual-v3.0)
  const reranked = await cohere.rerank({
    model: 'rerank-multilingual-v3.0',
    query,
    documents: candidates.map(c => `${c.title}. ${c.description}`),
    topN: 10,                                                       // pega top 10 final
    returnDocuments: false
  });

  return reranked.results.map(r => ({
    ...candidates[r.index],
    relevance_score: r.relevanceScore                              // 0-1, calibrado
  }));
}
```

**Custo e latência reais 2026** pra híbrido + rerank:
- BM25 + vector hybrid SQL: 10-30ms p99 em ~1M docs (HNSW + GIN bem indexado).
- Cohere Rerank top-50→10: 100-300ms (cross-encoder é caro, multilingual).
- Custo Cohere Rerank: ~$2/1k searches em 2026.

**Quando vale rerank**: relevância importa muito (e-commerce conversion, support tickets); top-1-3 é o que usuário vê. Quando NÃO vale: search interno onde top-20 são todos "good enough" (autocomplete, filter assist).

**Alternativa local**: cross-encoder via `sentence-transformers` em GPU (`mxbai-rerank-base`, `bge-reranker-v2-m3`). 0 custo por query mas precisa GPU; ~$50-100/mês em RunPod spot pra throughput de SaaS médio.

### 2.8 Postgres como search engine

`tsvector` + GIN index é viável até dezenas de milhões de docs com queries simples. Tem stemming via dicionários (`portuguese`, `english`). Sem facet builtin, sem rerank, sem fuzzy.

**`pg_trgm`** dá fuzzy via trigram similarity. **`pgvector`** dá ANN (HNSW desde 0.5).

Quando Postgres basta: busca em texto simples, < 10M docs, sem multi-language complicado, sem facets aninhados, sem ranking sofisticado. Quando não basta: catálogo grande com facets/agregações, autocomplete fuzzy, relevância tunada por boosting, suggesters.

### 2.9 Elasticsearch / OpenSearch

ES (Elastic) é o engine dominante. OpenSearch é fork open-source da AWS após mudança de licença em 2021.

Architecture: cluster de nodes, **shards** (cada index dividido), **replicas** (read scaling + HA). Queries via REST/JSON DSL.

Recursos chave:
- Query DSL: bool (must/should/must_not/filter), term, match, multi_match.
- **Filter context** (yes/no, cacheable) vs **query context** (score, não cacheable).
- Aggregations: terms, date_histogram, nested, percentiles, cardinality (HLL).
- Suggesters: completion (autocomplete), term, phrase.
- Function scores e boosting.
- Highlighting.

Custos: cluster ES não é barato. Em apps pequenos, overkill.

### 2.10 Meilisearch e Typesense

Alternativas focadas em DX e instant search:
- **Meilisearch**: Rust, single-binary, typo tolerance excelente, sub-50ms latency. Bom pra ecommerce/conteúdo.
- **Typesense**: C++, similar, vector search nativo.

Trade-off vs ES: menos flexível em aggregations e ranking custom, mas muito mais simples. Cabe num container.

### 2.11 Vespa

Open-source da Yahoo. Combina indexing + serving + ML inference. Usado em scale (Yahoo, Spotify). Mais complexo, mas state-of-art em ranking ML-driven.

### 2.12 Indexing pipelines

Onde indexar? Patterns:
- **Dual write** (DB + ES): app escreve nos dois. Risco de divergência.
- **CDC** (Change Data Capture): Postgres logical replication / Debezium / outbox table → Kafka → indexer. Mais robusto, conecta com 04-03.
- **Reindex on demand**: ok pra catálogo pequeno; lento pra grande.

Reindex completo: ES suporta `_reindex`, alias swap (zero-downtime: cria index novo, popula, troca alias).

### 2.13 Relevance tuning

Métricas:
- **Precision@k**: dos top-k, quantos relevantes.
- **Recall@k**: dos relevantes, quantos no top-k.
- **MRR** (Mean Reciprocal Rank): `1/rank` do primeiro relevante.
- **NDCG** (Normalized Discounted Cumulative Gain): graded relevance, decaimento logarítmico.

Tunar com **judgments** (humanos rotulam relevância) ou **click models** (cliques implicam relevância). Não tune relevância só com intuição.

### 2.14 Autocomplete

Tipos:
- **Edge n-gram** (ES completion suggester ou tokenizer). "edita" prefixos.
- **Search-as-you-type** field type (ES).
- **Trie / FST** (Lucene usa Finite State Transducer).

Latência alvo < 100ms; precisa cache + debounce no client.

### 2.15 Multilingual

Estratégias:
- **Multi-field**: `title.pt`, `title.en`, indexar com analisadores diferentes. Query field do idioma.
- **Multi-index**: índice por idioma. Roteia queries por idioma do user.
- **Language-detection**: detecta idioma do doc no ingest.
- **Multilingual embeddings** (e5-multilingual): vetor único, query em qualquer idioma. Limpo pra híbrido.

### 2.16 Faceting e filtros

Facets agregam contagens por categoria (`category`, `brand`, `price_range`). ES `terms agg`. Importante pra UX de catálogo.

Filtros usam filter context (cacheable, sem score). Query: `match name + filter price_range + filter in_stock`.

### 2.17 Ingestion: text extraction

PDFs, Office docs precisam extract antes de indexar. Tools: Apache Tika, Unstructured. Pre-process: cleanup, dedupe, chunking (pra embeddings).

Chunking pra RAG: tamanho 200-800 tokens, overlap 10-20%, respeita boundaries (parágrafo, sentença). Métricas dependem disso.

### 2.18 Relevance tuning operacional — synonyms, boosting, learning-to-rank, NDCG@10

§2.13 introduz relevance tuning como conceito. §2.18 entra em **operacionalização**: como medir objetivamente, melhorar deliberadamente, e evitar os 4 modos de regressão silenciosa — synonym overshooting, boost virando spam, BM25 override sem dataset, learning-to-rank treinado em dataset enviesado.

#### Foundation: medir antes de tunar — métricas offline

- **NDCG@10** (Normalized Discounted Cumulative Gain): mede ranking quality, não só recall. `1.0` = perfeito; `>0.7` = bom em search comercial.
- **MRR** (Mean Reciprocal Rank): focado em first relevant result. `1.0` = sempre top-1. Útil em known-item search (navegacional).
- **MAP@K**: precision em K rankings ponderado por posição.
- **Recall@K**: % de relevantes encontrados em top-K. Útil pra avaliar candidate generation (hybrid retrieval) separado de rerank (precision).

Stack típico: recall@100 mede retrieval; NDCG@10 mede ranking final pós-rerank.

#### Golden dataset construction (o blocker em 80% dos times)

- 100-500 query/relevant_docs pairs anotadas por humano.
- **Source**: query log real (top queries por volume, head + middle) + sintetizadas pra cobrir intent edge cases (longtail, typos, queries multilíngues).
- **Anotação**: 0/1 binário (mais simples) ou graded 0-3 (mais informativo, NDCG bate certo). Graded paga em discriminação de "perfeito vs bom o suficiente".
- Re-anotar a cada 6 meses; intent muda com produto, catálogo, sazonalidade.
- **Tooling**: Argilla (open source, replaces Doccano), Label Studio, Prodigy.

#### Code — measuring NDCG@10 offline

```typescript
type Judgment = { query: string; doc_id: string; relevance: number };  // 0-3

function dcg(scores: number[]): number {
  return scores.reduce((acc, s, i) => acc + (Math.pow(2, s) - 1) / Math.log2(i + 2), 0);
}

function ndcgAtK(judgments: Judgment[], rankedDocIds: string[], k = 10): number {
  const judgMap = new Map(judgments.map(j => [j.doc_id, j.relevance]));
  const actual = rankedDocIds.slice(0, k).map(id => judgMap.get(id) ?? 0);
  const ideal = [...judgMap.values()].sort((a, b) => b - a).slice(0, k);
  const idealDcg = dcg(ideal);
  return idealDcg === 0 ? 0 : dcg(actual) / idealDcg;
}

async function evalSearchPipeline(judgments: Judgment[]): Promise<number> {
  const queries = [...new Set(judgments.map(j => j.query))];
  const ndcgs = await Promise.all(queries.map(async q => {
    const ranked = await searchPipeline(q, { topK: 10 });
    const qJudg = judgments.filter(j => j.query === q);
    return ndcgAtK(qJudg, ranked.map(r => r.id));
  }));
  return ndcgs.reduce((a, b) => a + b, 0) / ndcgs.length;
}
```

Roda em CI antes de mergear mudança em pipeline; se NDCG cai > 2pp, block merge. Stratifica por bucket de query frequency (head/middle/longtail) pra detectar regressão concentrada.

#### Synonyms — armadilha do overshooting

Sem synonyms: query "celular" não acha "smartphone". Recall ruim. Synonyms agressivo: "celular" expande pra `["smartphone", "telefone", "iphone", "android"...]` — top-10 vira lista genérica, precision morre.

**Padrão**: 2-tier synonyms.

- **Bidirectional** (true synonyms): `(celular, smartphone)` — equivalência semântica plena.
- **One-way** (hyponymy): `iphone => iphone, smartphone, celular` — query "iphone" inclui ancestors, mas query "celular" NÃO traz todos iphones.

Elasticsearch / OpenSearch:

```json
{
  "settings": {
    "analysis": {
      "filter": {
        "synonym_graph": {
          "type": "synonym_graph",
          "synonyms": [
            "celular, smartphone",
            "iphone => iphone, smartphone, celular",
            "geladeira, refrigerador"
          ]
        }
      },
      "analyzer": {
        "search_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "synonym_graph", "asciifolding"]
        }
      }
    }
  }
}
```

**Pegadinha**: synonyms só no `search_analyzer`, NÃO no `index_analyzer` — senão perde precision em phrase matching e infla index size.

#### Boosting — quando ajuda e quando vira spam

- **Field boost**: `title^3 description^1` — title vale 3x.
- **Function score**: boost por popularidade, recência, business signal:

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "_all": "celular" } },
      "functions": [
        { "field_value_factor": { "field": "ctr_30d", "factor": 1.5, "modifier": "log1p" } },
        { "gauss": { "created_at": { "origin": "now", "scale": "30d", "decay": 0.5 } } }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}
```

- **Anti-pattern**: boost > 5x em qualquer field. Top-10 vira "qualquer doc com query no title", ignorando relevance textual real. Cap em 2-3x.
- **Anti-pattern**: boost recency sem decay — todo doc novo top, conteúdo evergreen invisível.

#### Learning-to-Rank (LTR) — quando vale e quando não

**Quando vale**: tem clickstream (>100k events/mês), business signals (purchase, dwell time), e baseline BM25/hybrid já saturou (NDCG plateau em iterações sucessivas).

**Quando NÃO vale**: dataset frio, equipe < 5 ML eng, modelo vira black box sem ownership, ou produto muda fast (model staleness).

**Pipeline padrão** (Elasticsearch LTR plugin / OpenSearch LTR / Vespa native):

1. **Train**: LightGBM com `(query, doc, features) → graded_relevance`. Features: BM25 score, field length, freshness, popularity, embedding similarity.
2. **Deploy**: model como rescorer no top-100 BM25 hits (não em todo corpus — latency).
3. **Online eval**: A/B test com guardrails (zero-result rate, latency p99).

**Top features 2026** (por contribuição típica): query-doc embedding cosine, query-title BM25, click-through rate por query slot, dwell time per query, bid (em commercial search).

#### Code — feature extraction Elasticsearch

```json
POST _ltr/_featureset/logistica_features
{
  "featureset": {
    "features": [
      {
        "name": "title_bm25",
        "params": ["keywords"],
        "template": { "match": { "title": "{{keywords}}" } }
      },
      {
        "name": "popularity_log",
        "template": { "function_score": { "field_value_factor": { "field": "popularity", "modifier": "log1p" } } }
      },
      {
        "name": "freshness_decay",
        "template": { "gauss": { "created_at": { "origin": "now", "scale": "30d" } } }
      }
    ]
  }
}
```

#### Online eval com A/B test

- Split traffic 50/50 entre baseline e candidate ranker. Run 7-14 dias.
- **Métricas primárias**: CTR top-3, conversion rate (purchase/signup downstream).
- **Guardrails**: latency p99 (não pode degradar > 10%), zero-result rate (não aumentar), revenue per query.
- **Significância**: t-test ou Mann-Whitney U; mínimo 10k queries por arm pra detectar lift de 2pp com poder estatístico decente.

#### Anti-patterns observados

- **Synonym aplicado bidirectional sem cuidado**: `(carro, veículo)` mas query "carro" trazendo motos via "veículo". Use one-way pra hierarquia.
- **Boost por popularidade sem freshness penalty**: top-10 dominado por items velhos com muita view; novo conteúdo invisível, feedback loop negativo.
- **LTR sem golden dataset offline**: deploy direto em A/B sem saber se modelo melhora ranking — A/B detecta degradação só após perda de revenue.
- **Embedding search sem rerank**: top-100 vector hits incluem semantically similar mas exatamente errado (query "iphone 15" trazendo "iphone 14" no top-3). Cross-encoder rerank fix.
- **Esquecer query understanding**: "celular barato" → boost por low price. "celular pra fotografia" → boost por camera spec. Intent detection (LLM zero-shot ou classificador) muda boost dinamicamente.
- **NDCG melhora offline mas degrada online**: dataset enviesado pra queries comuns; longtail piora. Sempre stratificar eval por query frequency bucket.

Cruza com **02-15 §2.7** (hybrid search foundation), **02-15 §2.13** (relevance tuning intro), **04-10 §2.8** (vector DBs como recall layer), **04-10 §2.11** (evals pattern aplicável a search ranking).

---

### 2.19 LLM-augmented search 2026 (semantic + keyword fusion, query understanding, conversational refinement)

Hybrid (BM25 + dense vectors) cobre 80-90% relevance. LLM-augmented fecha o gap residual: query understanding, expansion, rerank, conversational refinement. Padrão 2026 em e-commerce, knowledge bases, support search.

#### Por que LLM-augmented (e quando NÃO usar)

- **Pure vector search** falha em exact match (`ERROR_CODE_42`, SKU `XPTO-9931`) e em rare proper nouns (entity raros não vistos no corpus de embedding).
- **Pure BM25** falha em synonyms semânticos (`car` vs `automobile`), conceptual queries (`tênis confortável pra correr longa distância`).
- **Hybrid (§2.18)** resolve maior parte. LLM-augmented pega os 5-10% que sobram: intent ambíguo, multi-turn, filter extraction.
- **Quando NÃO usar**: strict-match domains (lookup por SKU, error code, pedido por ID). LLM expansion degrada precision; cost extra desnecessário.

#### Query understanding (LLM como parser estruturado)

Logística capstone — lojista digita "pedidos atrasados acima de R$200 nos últimos 7 dias". Parse para schema validado via Zod + OpenAI structured outputs (Aug 2024+):

```ts
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const OrdersQuerySchema = z.object({
  intent: z.enum(['list_orders', 'aggregate', 'navigate']),
  filters: z.object({
    status: z.array(z.enum(['placed', 'late', 'delivered', 'cancelled'])).optional(),
    min_value_cents: z.number().int().nonnegative().optional(),
    max_value_cents: z.number().int().nonnegative().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
  }),
  sort: z.enum(['created_at_desc', 'value_desc', 'eta_asc']).optional(),
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT_PT_BR },
    { role: 'user', content: query },
  ],
  response_format: zodResponseFormat(OrdersQuerySchema, 'orders_query'),
  temperature: 0,
});

const parsed = OrdersQuerySchema.safeParse(JSON.parse(completion.choices[0].message.content!));
if (!parsed.success) throw new SearchParseError(parsed.error);
// parsed.data.filters: { status: ['late'], min_value_cents: 20000, date_from: '2026-04-29T00:00:00Z' }
```

Traduz para SQL/ES. Latency budget: gpt-4o-mini 200-500ms p50; cache por `hash(query_text)` corta 70% das chamadas.

#### Hybrid retrieval + LLM rerank (cruza com 04-10 §2.21 RAG)

Pipeline canônico em 3 estágios:

1. **Recall**: hybrid search (pgvector 0.7+ HNSW + tsvector BM25 + RRF fusion) retorna top-50.
2. **Rerank**: Cohere Rerank v3.5 ou cross-encoder local (`bge-reranker-large`) reordena top-50 → top-10. Latência ~200ms para 50 docs.
3. **Synthesize** (opcional, RAG): LLM gera resumo/answer dos top-3 com citations.

Numbers 2026 (Logística interno, 200 golden queries): hybrid alone 71% Recall@10; + rerank 84%; + query understanding 92%. Cap top-50 no rerank — top-100 cross-encoder estoura 500ms.

```sql
-- Stage 1: hybrid recall com RRF (pgvector 0.7+ + tsvector)
WITH dense AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rk
  FROM products WHERE tenant_id = $2 LIMIT 100
),
sparse AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, plainto_tsquery('portuguese', $3)) DESC) AS rk
  FROM products WHERE tenant_id = $2 AND tsv @@ plainto_tsquery('portuguese', $3) LIMIT 100
)
SELECT id, COALESCE(1.0/(60+d.rk), 0) + COALESCE(1.0/(60+s.rk), 0) AS score
FROM dense d FULL OUTER JOIN sparse s USING (id)
ORDER BY score DESC LIMIT 50;
```

#### Query expansion (use seletivo)

Para "tênis de corrida confortável", LLM gera `["tênis running", "tênis amortecido", "running shoes corrida longa"]`; cada variante busca + dedup + RRF merge. Útil em e-commerce long-tail; **proibido** em strict-match (SKU, ERROR_CODE) — recall drop por matches espúrios.

#### Conversational refinement (multi-turn)

Estado mínimo: `{previous_filters, current_results_ids, turn_count}` em Redis stream por session-id, TTL 1h, cap últimos 10 turns. Turno N+1 reusa filters do turno N e merge incremental. UI mostra "interpreted as: late orders > R$200 nos últimos 7 dias" — usuário confirma/edita os filters extraídos. Reduz hallucination de filter wrong.

#### Stack 2026

- **Vector DB**: pgvector 0.7+ HNSW (default Logística, cobre 04-10 §2.21); Qdrant standalone para >50M vectors; Pinecone managed; Weaviate; Milvus.
- **Embedding**: OpenAI `text-embedding-3-small` ($0.02/1M tokens, 1536-dim); Cohere embed-v3 multilingual; bge-m3 open-source (1024-dim, multilingual); Voyage 3 (state-of-art, custo maior).
- **Rerank**: Cohere Rerank v3.5 ($2/1k searches, ~200ms); bge-reranker-large self-hosted; ms-marco MiniLM L-6 cross-encoder.
- **LLM parser**: gpt-4o-mini ($0.15/1M input, $0.60/1M output); Claude Haiku 4.5 ($0.80/1M, melhor instruction following PT-BR); Gemini Flash; Llama 3.3 70B em vLLM self-hosted.

#### Caching (decisivo pra cost)

- **Query understanding cache**: `hash(query_text + locale)` → parsed_filters JSON; TTL 1h; Redis.
- **Embedding cache**: `hash(query_text + model_id)` → vector; TTL 7d.
- **Result cache**: `hash(filters + sort + tenant_id)` → page; TTL 5min.
- **Conversation cache**: Redis stream por session-id, max 10 turns, TTL 1h.
- Numbers Logística: 80% queries são repetições típicas ("pedidos atrasados hoje", "vendas semana"); cache hit rate 70%; cost reduction 5-10x.

#### Eval discipline (cruza com 04-10 §2.21 RAGAS)

- **Golden dataset**: 200-500 tuplas `(query, expected_filters, expected_top_k_ids)` curadas por domain experts. Refresh trimestral.
- **Métricas**: filter extraction accuracy (precision + recall por field type), Recall@10, NDCG@10, end-to-end satisfaction (LLM-as-judge + human spot-check 10% amostra).
- **CI gate**: drop > 2pp em qualquer métrica bloqueia merge. Prompt change passa pelo mesmo gate que code change.

#### Logística applied stack

- **Stage 1**: hybrid Postgres pgvector + tsvector + RRF.
- **Stage 2**: query understanding gpt-4o-mini → structured filters → SQL parametrizada.
- **Stage 3**: rerank top-50 via Cohere Rerank v3.5.
- **Stage 4** (premium tier): conversational refinement com chat UI; show interpreted filters.
- **Custo real**: 50k queries/dia × ($0.001 LLM + $0.001 rerank) × 0.30 cache miss rate ≈ $30/dia ≈ $900/mês; com 70% cache hit, efetivo ~$300/mês.

#### Anti-patterns observados

- LLM query understanding sem `safeParse` Zod — JSON malformado quebra pipeline silenciosamente em prod.
- Sem cache em query understanding — cost 10x desnecessário, hot path lento.
- LLM rerank sem latency budget — cross-encoder 500ms+ pra top-100; cap top-50 hard.
- Embedding model swap sem re-index do corpus inteiro — vetores incompatíveis dimensionalmente, recall colapsa silencioso.
- Query expansion em strict-match domains (SKU, ERROR_CODE) — precision drop, falsos positivos.
- Sem golden dataset — regression em prompt change invisível até user reclamar.
- LLM-as-judge sem human spot-check — judge bias amplificado, métrica sobe sem ganho real.
- Conversational session sem TTL — Redis bloat, usuários deixam abas abertas dias.
- Vector dimensions diferentes entre models sem migration plan — pgvector/Qdrant aceita silently broken.
- LLM call sync no hot path — UI bloqueia 500ms; use streaming + skeleton UI; fallback pra hybrid puro se LLM timeout > 800ms.

Cruza com **04-10 §2.21** (RAG architectures, embedding pipelines, RAGAS), **02-09** (Postgres pgvector + tsvector foundation), **03-07** (LLM observability, traces de prompt + response), **04-04** (resilience, fallback pra hybrid puro quando LLM degradado), **04-09** (scaling, embedding pipeline cost @ scale).

---

### 2.20 Vector search production deep 2026 — pgvector 0.8, Qdrant 1.12, Pinecone serverless, hybrid RRF, rerankers, MMR, Matryoshka

Vector-only search é demo. Production em 2026 é **stack composto**: dense retrieval (HNSW) + sparse retrieval (BM25) fundido via RRF, rerank cross-encoder no top-50-100, MMR pra diversidade, embedding versionado com migration A/B, dimensão truncada via Matryoshka pra cortar custo. §2.5/§2.6/§2.7 cobriram fundação; aqui é o nível operacional: tuning de índice, latência p99, custo por 1M queries, drift de modelo.

#### Index types — comparison real 2026

| Tipo       | Recall@10 | Latency p99 (10M vec) | Memory     | Build time | Update    | Quando usar                          |
|------------|-----------|------------------------|------------|------------|-----------|--------------------------------------|
| Flat exact | 1.00      | 200-2000ms             | 4×N×D bytes| instant    | instant   | <100k vectors, exact required        |
| IVFFlat    | 0.85-0.92 | 20-80ms                | ~1.0× flat | minutos    | rápido    | corpus estático médio (1-10M)        |
| IVFPQ      | 0.75-0.88 | 10-30ms                | 0.05-0.2×  | minutos    | rápido    | budget-constrained, recall tolerante |
| **HNSW**   | 0.95-0.99 | 5-20ms                 | 1.5-2× flat| horas      | médio     | **default produção 2026**            |
| ScaNN      | 0.93-0.98 | 3-15ms                 | 0.3-0.5×   | horas      | lento     | Google scale, read-heavy             |

HNSW vence em 90% dos casos: recall alto, latência baixa, update online. Custo: memória + build time.

#### HNSW tuning — knobs que importam

Três parâmetros, três trade-offs:

- **`M`** (graph degree, conexões por nó): 8-64. Default seguro: **16-32**. M=4 é toy; M=64 explode memória sem ganho de recall em datasets <100M.
- **`ef_construction`** (candidatos durante build): 64-512. Default: **200**. Maior = build mais lento, recall melhor permanente. One-time cost.
- **`ef_search`** (candidatos durante query): 40-500. **Knob runtime** que troca latência por recall. Comece em 100; ajuste pra hit recall@10 ≥ 0.95.

```sql
-- pgvector 0.8 (Q1 2026): HNSW + halfvec (16-bit float, 50% memory) + sparsevec
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products ADD COLUMN embedding halfvec(1024);  -- voyage-3 truncado via MRL

CREATE INDEX products_embedding_hnsw
  ON products
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 32, ef_construction = 200);

-- query time: ajusta ef_search por sessão
SET LOCAL hnsw.ef_search = 100;

SELECT id, name, 1 - (embedding <=> $1::halfvec) AS score
FROM products
WHERE tenant_id = $2 AND active = true
ORDER BY embedding <=> $1::halfvec
LIMIT 50;
```

```python
# Qdrant 1.12 — collection com HNSW config explícito
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, HnswConfigDiff

client = QdrantClient(url="https://qdrant.internal", api_key=os.environ["QDRANT_KEY"])

client.create_collection(
    collection_name="orders_semantic",
    vectors_config=VectorParams(
        size=1024,
        distance=Distance.COSINE,
        on_disk=True,  # offload pra reduzir RAM
    ),
    hnsw_config=HnswConfigDiff(m=32, ef_construct=200, full_scan_threshold=10_000),
)
```

```python
# Pinecone serverless (GA 2024) — pay-per-query, sem ops
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key=os.environ["PINECONE_KEY"])
pc.create_index(
    name="orders-semantic",
    dimension=1024,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)
# custo: $0.33/M write units + $0.55/M read units; sem cluster pra gerenciar
```

#### Hybrid search — RRF (Reciprocal Rank Fusion)

Dense (semantic) e sparse (BM25) cobrem buracos diferentes: dense pega sinônimo/intent, sparse pega termo raro/SKU/ERROR_CODE. Fusão via **RRF** é o padrão 2026 — sem normalização de score, robusto a escalas distintas:

```
RRF(d) = Σ 1 / (k + rank_i(d))
```

`k=60` é o default empírico (paper Cormack 2009). k baixo (k=1) vira top-rank winner-takes-all; k alto suaviza demais.

```sql
-- pgvector + tsvector fundidos via RRF (k=60)
WITH dense AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::halfvec) AS rank
  FROM products
  WHERE tenant_id = $2
  ORDER BY embedding <=> $1::halfvec
  LIMIT 100
),
sparse AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_vec, query) DESC) AS rank
  FROM products, plainto_tsquery('portuguese', $3) query
  WHERE tenant_id = $2 AND search_vec @@ query
  ORDER BY ts_rank_cd(search_vec, query) DESC
  LIMIT 100
)
SELECT
  COALESCE(d.id, s.id) AS id,
  COALESCE(1.0 / (60 + d.rank), 0) + COALESCE(1.0 / (60 + s.rank), 0) AS rrf_score
FROM dense d
FULL OUTER JOIN sparse s USING (id)
ORDER BY rrf_score DESC
LIMIT 50;
```

#### Rerankers 2026 — quando cada um

Bi-encoder (embedding) é rápido mas grosseiro; **cross-encoder reranker** olha (query, doc) juntos e dá score calibrado. Aplique **só no top-50-100** — rerank em top-1000 é latency suicide (cada chamada ~50-200ms pra 50 docs).

| Reranker            | Latência (50 docs) | Custo / 1k searches | Quando                            |
|---------------------|--------------------|----------------------|-----------------------------------|
| Cohere Rerank 3.5   | 80-150ms           | ~$2.00              | default produção, multilíngue PT  |
| Voyage rerank-2     | 60-120ms           | ~$0.50              | budget, qualidade similar         |
| Jina reranker v2    | 70-130ms           | self-host           | data residency strict             |
| BGE-reranker-v2-m3  | 100-300ms (GPU)    | self-host GPU       | volume alto, control total        |

```python
# Cohere Rerank 3.5
import cohere
co = cohere.Client(os.environ["COHERE_KEY"])

result = co.rerank(
    model="rerank-3.5",
    query=user_query,
    documents=[d.text for d in candidates[:50]],
    top_n=10,
)
reranked = [candidates[r.index] for r in result.results]
```

```python
# Voyage rerank-2
import voyageai
vo = voyageai.Client(api_key=os.environ["VOYAGE_KEY"])

result = vo.rerank(
    query=user_query,
    documents=[d.text for d in candidates[:50]],
    model="rerank-2",
    top_k=10,
)
```

#### MMR (Maximal Marginal Relevance) — diversidade contra near-duplicates

Top-10 com 8 variantes do mesmo produto é UX ruim. MMR reordena pra balancear relevância vs diversidade:

```
MMR = argmax_d∈R [ λ · sim(d, q) − (1−λ) · max_{d'∈S} sim(d, d') ]
```

`λ=0.7` típico (70% relevância, 30% diversidade). Quando usar: catálogos com muitas variantes (cor/tamanho), notícias (mesma matéria de fontes diferentes), evitar echo chamber em recommendation.

```python
def mmr(query_vec, doc_vecs, docs, top_k=10, lambda_=0.7):
    selected, selected_idx = [], set()
    while len(selected) < top_k and len(selected) < len(docs):
        best_score, best_i = -1e9, -1
        for i, dv in enumerate(doc_vecs):
            if i in selected_idx:
                continue
            relevance = cosine(query_vec, dv)
            redundancy = max((cosine(dv, doc_vecs[j]) for j in selected_idx), default=0)
            score = lambda_ * relevance - (1 - lambda_) * redundancy
            if score > best_score:
                best_score, best_i = score, i
        selected.append(docs[best_i]); selected_idx.add(best_i)
    return selected
```

#### Embedding drift — model migration sem outage

Trocar `text-embedding-3-small` por `voyage-3` invalida 100% do índice (vetores não são comparáveis entre modelos, dimensões e geometrias diferentes). Estratégia produção:

1. **Versionar coluna**: `embedding_v1 vector(1536)`, `embedding_v2 halfvec(1024)`. Mantenha ambas durante migração.
2. **Backfill assíncrono**: worker re-embeda corpus inteiro com modelo novo; throttle pra não saturar API.
3. **A/B index**: 5% do tráfego consulta v2, mede recall@10, NDCG@10, click-through. 24-72h shadow.
4. **Cutover atômico**: feature flag por tenant; rollback em <60s se métrica degrada.
5. **Drop coluna velha** só após 14 dias de baseline estável.

Nunca faça swap in-place sem reindex — pgvector/Qdrant aceitam dimensões erradas silently se schema permite, recall colapsa pra ~0.

#### Matryoshka MRL — truncate dim sem perder recall

**Matryoshka Representation Learning**: o modelo é treinado pra que os primeiros N dims já carreguem a maior parte da informação. OpenAI `text-embedding-3-large` (3072 dims), Voyage `voyage-3` (1024), Nomic `nomic-embed-v1.5` suportam. Truncate 3072 → 256 mantém **~95% do recall** com **12x menos memória** e ~2x mais throughput de query.

```python
import numpy as np

def truncate_mrl(embedding: np.ndarray, target_dim: int = 256) -> np.ndarray:
    truncated = embedding[:target_dim]
    return truncated / np.linalg.norm(truncated)  # re-normalize obrigatório
```

Combine com `halfvec` (16-bit) no pgvector: 3072 fp32 (12 KB) → 256 fp16 (512 bytes) = **24x reduction**. Em catálogo de 50M produtos: 600 GB → 25 GB, RAM-friendly.

#### Decision matrix — pgvector vs Qdrant vs Pinecone

| Critério            | pgvector 0.8                     | Qdrant 1.12                      | Pinecone serverless              |
|---------------------|----------------------------------|----------------------------------|----------------------------------|
| Custo (10M vec)     | $0 extra (Postgres existente)    | $200-500/mês (cluster)           | $50-300/mês (pay-per-query)      |
| Ops                 | mesmo Postgres (zero novo)       | cluster próprio ou Qdrant Cloud  | zero (managed)                   |
| Filtros relacionais | nativos (JOIN, WHERE)            | payload filters (limitado)       | metadata filters (limitado)      |
| Scale ceiling       | 10-50M vectors confortável       | 100M-1B+                         | ilimitado                        |
| Multi-tenant        | RLS + partial index              | collections por tenant           | namespaces                       |
| Hybrid native       | sim (tsvector + RRF SQL)         | sim (sparse + dense BM25)        | sim (hybrid endpoint)            |
| Quando              | <50M vec, Postgres já em prod    | scale + control, on-prem         | spike-y workload, sem time DBA   |

Default 2026 pra Logística-scale (10-50M orders): **pgvector**. Cresce pra 100M+ ou exige sub-10ms p99 global: **Qdrant** ou **Pinecone**.

#### Logística applied stack — semantic order search

- **Corpus**: 30M orders, embedding `voyage-3` truncado MRL → 512 dims, halfvec.
- **Index**: pgvector HNSW (M=32, ef_construction=200), partial index por `tenant_id`.
- **Retrieval**: dense top-100 + tsvector BM25 top-100 → RRF k=60 → top-50.
- **Rerank**: Cohere Rerank 3.5 no top-50 → top-10.
- **MMR**: λ=0.6 pra evitar 5 orders do mesmo cliente dominando topo.
- **Latência total p99**: ~180ms (HNSW 15ms + tsvector 20ms + RRF 5ms + rerank 130ms + MMR 10ms).
- **Custo**: 100k searches/dia × $0.002 rerank × 0.4 cache miss ≈ $80/dia ≈ $2.4k/mês; cache hit 70% → efetivo ~$700/mês.
- **Drift watch**: NDCG@10 em golden set (500 queries) rodado nightly; alerta se cai >3%.

#### Anti-patterns observados

- **HNSW M=4 default em 100M+ vectors** — recall <0.85; M=16-32 é mínimo viável.
- **`ef_search` baixo em prod** (ex: 40) — recall <0.90 silencioso; ajuste pra hit recall@10 ≥ 0.95 em golden set.
- **Rerank em top-1000** — latency explode (rerank é O(n) cross-encoder); cap em **top-25-100**.
- **Cosine vs dot product mismatch** sem normalize — vetores não-normalizados em índice cosine: scores corretos, ranking errado silencioso.
- **Embedding model swap sem reindex completo** — vetores incomparáveis, recall colapsa pra ~0; sempre A/B com index paralelo.
- **Ignorando MRL em 2026** — `text-embedding-3-large` 3072 dims full em catálogo grande = 3-12x storage waste evitável.
- **RRF k=1 ou k=∞** — k=1 vira top-rank winner-takes-all; k>500 achata fusion. Default k=60.
- **BM25 ausente em "hybrid"** — só dense perde recall em SKU/ERROR_CODE/nomes próprios; rare-term holes.
- **Sem golden dataset versionado** — toda mudança (modelo, ef_search, rerank) precisa NDCG@10 / recall@10 antes/depois; sem isso, voar cego.
- **Reranker no hot path sem timeout/fallback** — Cohere fora do ar = search inteira morre; cap 250ms, fallback pra ranking RRF puro.

Cruza com **§2.5 / §2.6 / §2.7** (vector embeddings, ANN, hybrid intro), **§2.19** (LLM-augmented search, query understanding), **02-09 §2.18** (pgvector como Postgres extension, partial indexes), **04-10 §2.8 / §2.21** (RAG retrieval foundation, RAG architectures + RAGAS), **03-07** (search observability, ranker A/B, NDCG tracking), **04-09** (scaling embedding pipeline, batch backfill cost).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Desenhar inverted index com postings lists e position info.
- Explicar BM25, papel de `k1`, `b`, e por que TF satura.
- Diferenciar tokenizer e token filter; mostrar exemplo de stemmer português afetando recall vs precisão.
- Explicar HNSW conceitualmente (grafos em camadas, busca log).
- Justificar híbrido BM25+vector via RRF.
- Distinguir Postgres FTS suficiente vs ES obrigatório com 3 critérios concretos.
- Explicar zero-downtime reindex em ES via alias swap.
- Diferenciar precision@k, recall@k, NDCG.
- Justificar filter context vs query context (cacheabilidade).
- Explicar CDC pipeline para indexação contínua.

---

## 4. Desafio de Engenharia

Estender a Logística com **busca de pedidos full-text + híbrida** usando Meilisearch (ou OpenSearch) + pgvector pra semantic.

### Especificação

1. **Setup**: Meilisearch (Docker) + Postgres com pgvector (já no 02-09).
2. **Indexação**:
   - CDC simulado: trigger Postgres em `orders` insere em `outbox_orders_indexer`. Worker Node consome e envia pra Meilisearch.
   - Schema indexável: `id`, `tenant_id`, `customer_name`, `items[]`, `delivery_address`, `status`, `created_at`, `notes`.
3. **Queries suportadas**:
   - Texto livre com typo tolerance ("pedido jose siva 5pm" encontra "José Silva, 17h").
   - Filtros: status, tenant, date range.
   - Facets: counts por status e cidade.
   - Highlight de matches.
4. **Semantic search**:
   - Embedding (OpenAI text-embedding-3-small ou Cohere embed-multilingual) pra `notes` + `items`. Persiste vetor em pgvector.
   - Query semantic: "entregas atrasadas para cliente reclamando" via vector search.
5. **Hybrid**: combine BM25 (Meilisearch) com vector (pgvector) via RRF, top 50 cada, rerank.
6. **API REST**:
   - `GET /search?q=...&filters=...&hybrid=true` retorna { hits, facets, query_id, latency_ms }.
7. **Relevance harness**:
   - 30 queries rotuladas (relevance 0-3 por hit).
   - CLI `npm run eval` calcula precision@10, MRR, NDCG@10. Roda contra Meilisearch puro, vector puro, híbrido, compara.
8. **Reindex zero-downtime**:
   - Cria index `orders_v2`, popula, troca alias. Demonstre.

### Restrições

- Tokenizer pt-BR configurado.
- Atualizações via outbox + worker (não dual write síncrono).
- Latência p95 < 200ms em 100k orders.

### Threshold

- Suite de 30 queries reportada com métricas.
- Híbrido vence ambos individuais em NDCG@10.
- Reindex demonstrado sem downtime.

### Stretch

- **Cross-encoder rerank** com modelo pequeno (ms-marco-MiniLM) em top-50.
- **Autocomplete** em endereço com prefix index (tokenizer edge_ngram).
- **Relevance dashboard** mostrando query latency, click-through (simulado), top zero-result queries.
- **A/B framework**: dois ranking variants, log impressões e clicks, calcular CTR.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): inverted index, FST, B-Tree.
- Liga com **01-05** (algorithms): graph search (HNSW), priority queues.
- Liga com **02-09** (Postgres): pgvector, FTS, comparação clara.
- Liga com **02-11** (Redis): cache de top queries.
- Liga com **02-14** (real-time): updates de busca em tempo real.
- Liga com **03-07** (observability): query latency p95, zero-result rate.
- Liga com **03-09** (frontend perf): autocomplete debounce, pagination.
- Liga com **04-03** (event-driven): CDC + outbox.
- Liga com **04-10** (AI/LLM): RAG é busca + LLM.

---

## 6. Referências

- **"Introduction to Information Retrieval"**: Manning, Raghavan, Schütze. Gratuito, bíblia.
- **"Relevant Search"**: Doug Turnbull, John Berryman.
- **"Deep Learning for Search"**: Tommaso Teofili.
- **Elasticsearch: The Definitive Guide**: Clinton Gormley.
- **BM25 paper**: Robertson, Zaragoza ("The Probabilistic Relevance Framework").
- **HNSW paper**: Malkov, Yashunin (2018).
- **Lucene docs**: base de Elasticsearch/OpenSearch/Solr.
- **Meilisearch / Typesense / Vespa docs**.
- **pgvector docs**.
- **Sebastian Raschka's "Understanding Encoder And Decoder LLMs"**: embeddings, dense retrieval.
