---
module: 02-15
title: Search Engines & Information Retrieval — Inverted Index, BM25, Vector Search
stage: plataforma
prereqs: [02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-15 — Search Engines & Information Retrieval

## 1. Problema de Engenharia

Quase todo produto sério tem busca. Listagem de pedidos, catálogo, base de conhecimento, suporte ao cliente, descobrimento de produto. `LIKE '%foo%'` em Postgres não escala — sem índice apropriado, vira full scan; com `pg_trgm` vai um pouco; full-text com `tsvector` vai melhor; mas pra ranking sério, distância de edit, sinônimos, multilingual, faceting, autocomplete, fuzzy match, relevance tuning — você precisa de **search engine dedicado**.

E hoje, busca semântica (vector search via embeddings) entrou no mainstream — não substitui keyword, complementa. RAG (04-10) e busca híbrida BM25+vetor são padrão.

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

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Desenhar inverted index com postings lists e position info.
- Explicar BM25 — papel de `k1`, `b`, e por que TF satura.
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
5. **Hybrid**: combine BM25 (Meilisearch) com vector (pgvector) via RRF — top 50 cada, rerank.
6. **API REST**:
   - `GET /search?q=...&filters=...&hybrid=true` retorna { hits, facets, query_id, latency_ms }.
7. **Relevance harness**:
   - 30 queries rotuladas (relevance 0-3 por hit).
   - CLI `npm run eval` calcula precision@10, MRR, NDCG@10. Roda contra Meilisearch puro, vector puro, híbrido — compara.
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

- **"Introduction to Information Retrieval"** — Manning, Raghavan, Schütze. Gratuito, bíblia.
- **"Relevant Search"** — Doug Turnbull, John Berryman.
- **"Deep Learning for Search"** — Tommaso Teofili.
- **Elasticsearch: The Definitive Guide** — Clinton Gormley.
- **BM25 paper** — Robertson, Zaragoza ("The Probabilistic Relevance Framework").
- **HNSW paper** — Malkov, Yashunin (2018).
- **Lucene docs** — base de Elasticsearch/OpenSearch/Solr.
- **Meilisearch / Typesense / Vespa docs**.
- **pgvector docs**.
- **Sebastian Raschka's "Understanding Encoder And Decoder LLMs"** — embeddings, dense retrieval.
