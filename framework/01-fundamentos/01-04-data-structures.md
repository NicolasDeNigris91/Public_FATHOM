---
module: 01-04
title: Estruturas de Dados, Arrays, Listas, Hash Tables, Trees, Heaps, Graphs
stage: fundamentos
prereqs: [01-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-04, Estruturas de Dados

## 1. Problema de Engenharia

Estrutura de dados é como você **organiza** dados na memória pra otimizar **as operações que você vai fazer mais**. Escolher errado significa código N vezes mais lento do que o necessário, ou usando N vezes mais memória, ou ambos.

Exemplos onde desconhecimento custa caro:
- Você usa `Array.includes()` num array de 100k items pra verificar duplicatas, O(n) por verificação, O(n²) total. Com `Set`, vira O(1) e O(n).
- Você quer "top 10 mais frequentes", implementa com `sort()` ordenando 1M items (O(n log n)) quando um **min-heap** de tamanho 10 resolve em O(n log 10).
- Você usa `Array.shift()` pra implementar fila e a aplicação fica lenta, `shift` é O(n) (desloca todos elementos). Use linked list (deque) ou índice circular.
- Você consulta hierarquia de organização recursivamente no banco, sem índice de adjacência ou closure table. **Trees** mal modeladas viram pesadelo de SQL.

E quando você for estudar Postgres (02-09), B-Trees são índice. Quando estudar Redis (02-11), Skip Lists são sorted sets. Quando estudar Kafka (04-02), particionamento usa hashing consistente. **Estruturas de dados estão em todo lugar do stack moderno.**

---

## 2. Teoria Hard

### 2.1 Análise, Big-O e o que ela esconde

**Big-O** mede crescimento assintótico. `O(n)` significa "tempo cresce proporcional a n quando n é grande".

Hierarquia comum:
- `O(1)`, constante (hash lookup)
- `O(log n)`, logarítmico (busca binária, B-Tree)
- `O(n)`, linear
- `O(n log n)`, quase linear (sorting comparativo)
- `O(n²)`, quadrático (nested loops)
- `O(2ⁿ)`, `O(n!)`, exponencial (sem solução pra n grande)

**Big-O esconde:**
- **Constantes**: O(n) com constante 1000 perde pra O(n²) com constante 1 quando n é pequeno.
- **Cache locality**: array O(n²) cache-friendly pode bater linked list O(n log n) hostil.
- **Custo de operações**: alocar memória é caro; comparar strings é caro; etc.

**Amortizado vs pior caso:** dynamic array `push` é O(1) **amortizado** (média), mas O(n) no pior caso (quando precisa realocar). Hash table insert é O(1) amortizado, O(n) no rehash.

### 2.2 Array (contíguo)

**Layout:** sequência contígua de células do mesmo tipo na memória.

| Operação | Complexidade |
|----------|--------------|
| Acesso por índice | O(1) |
| Append (com capacidade) | O(1) amortizado |
| Append (cheio, realoca) | O(n), copia todos |
| Insert no meio | O(n), desloca |
| Delete no meio | O(n), desloca |
| Busca linear | O(n) |
| Busca binária (ordenado) | O(log n) |

**Em JS:** `Array` é heterogêneo (pode misturar tipos), com otimizações do V8 quando consistente. **TypedArray** (`Float64Array`, `Uint8Array`, etc) é homogêneo, contíguo, próximo a array C.

**Cache locality:** array é o **rei** disso. Iteração linear ativa prefetcher.

**Capacity vs length:** dynamic array (vector em C++) tem capacidade interna ≥ length. Cresce dobrando (geometric growth) pra manter append O(1) amortizado.

### 2.3 Linked list

**Layout:** nós alocados separadamente, ligados por ponteiros.

```
[1|*]→[2|*]→[3|*]→[4|null]
```

| Operação | Complexidade |
|----------|--------------|
| Acesso por índice | O(n) |
| Insert no início | O(1) |
| Insert no fim (com tail) | O(1) |
| Insert/delete no meio (com ref) | O(1) |
| Busca | O(n) |

**Cache locality:** **horrível**. Cada `next` é potencialmente cache miss. Em prática, linked list pode ser **10-50x mais lento** que array contíguo pra iteração, mesmo Big-O igual.

**Quando usar:** raramente. Casos legítimos:
- Inserções/deletes frequentes em meio com referências persistentes.
- Estruturas com tamanho desconhecido e crescimento incremental, **sem iteração frequente**.
- Cabeças de lista usadas para implementar deques/queues O(1).

**Doubly linked list:** nó tem `prev` e `next`. Permite insert/delete em O(1) com ref bidirecional. Usado em LRU caches.

### 2.4 Hash table (dictionary, map)

**Idéia:** computar um **hash** da chave que mapeia para um **slot** no array interno.

```
hash("foo") % 8 = 3 → slot 3 = [("foo", value)]
```

**Colisões** acontecem (dois keys hashearem pro mesmo slot). Resolução:
- **Separate chaining**: cada slot é uma linked list. Insert: prepend. Lookup: percorrer.
- **Open addressing**: se slot ocupado, procurar próximo livre. Variantes:
  - **Linear probing**: próximo, próximo+1, próximo+2... Cache-friendly. Sofre "clustering".
  - **Quadratic probing**: próximo+1, próximo+4, próximo+9...
  - **Robin Hood**: ao colidir, "rouba" slot de quem tem menor distância, equaliza distâncias.

**Load factor (α):** elementos / slots. Acima de ~0.7, performance degrada → **rehash** (cresce a tabela, redistribui).

**Complexidade média:** O(1) insert/lookup/delete.
**Pior caso:** O(n) se hash function ruim (todos no mesmo slot) ou ataque DoS por colisão deliberada.

**Em JS:**
- `Object` é hash-like, mas com behaviors especiais (prototype chain, string keys only).
- `Map` é hash table proper. Aceita qualquer key (incluindo objects). **Use `Map` quando key é dinâmica.**
- `Set` é hash set.

**No V8:** `Object` com **shape estável** vira hidden class (otimizado, virtually struct). Adicionar/remover propriedades em runtime quebra otimização.

#### Hash function: cryptographic vs distribution

Confusão comum: usar SHA-256 em hash table (lento, ~500 MB/s) ou MurmurHash em senha (sem pre-image resistance).

- **Distribution hashes** (MurmurHash3, xxHash, SipHash, FNV): foco em **uniformidade + velocidade** (1-10 GB/s). Sem garantia criptográfica. Default em hash tables, sharding, Bloom filters.
- **Cryptographic hashes** (SHA-256, BLAKE3): foco em **collision/pre-image resistance**. Mais lentos (50-500 MB/s). Use em integrity, signatures, content addressing (Git, IPFS) — ver 01-12.
- **SipHash** é meio-termo: rápido o suficiente pra hash table + resiste a hash-flooding DoS. Rust `HashMap` e Python `dict` usam por default.

#### Consistent hashing (sharding distribuído)

Hash table convencional usa `hash(key) % N`. Quando N muda (adicionar/remover shard), **quase todas as chaves remapeiam** — invalidação cache massiva, redistribuição catastrófica.

**Consistent hashing** (Karger et al, 1997): mapeia chaves e nós no mesmo **hash ring** circular `[0, 2³²)`. Chave vai pro próximo nó horário. Adicionar/remover nó remapeia apenas `K/N` das chaves.

```
ring: [0 ... 2^32)
nodes A, B, C → posições determinísticas no ring
key → hash(key) → primeiro node em sentido horário
```

**Virtual nodes**: cada nó físico ocupa M posições (M=128 típico) pra reduzir variância de carga (sem virtual nodes, distribuição é Poisson, hot spots aparecem).

**Onde aparece**:
- Memcached client-side (Ketama).
- Redis Cluster (16384 hash slots, variante).
- DynamoDB, Cassandra (partitioning).
- CDN edge selection.
- Discord guild routing.

**Limitação**: load skew quando keys têm distribuição não-uniforme (1 tenant gigante). Mitigação: **rendezvous hashing** (HRW) ou **jump consistent hash** (Lamping & Veach, 2014, Google). Pré-requisito mental pra 04-09 (scaling) e 02-11 (Redis Cluster).

### 2.5 Trees, visão geral

Estrutura hierárquica: nó com filhos.

**Terminologia:**
- **Root**: topo
- **Leaf**: sem filhos
- **Height**: caminho mais longo da root até leaf
- **Depth/level**: distância da root
- **Balanced**: heights de subárvores diferem por no máximo 1 (definições variam)

#### Binary Search Tree (BST)

Cada nó tem `left` (menor) e `right` (maior).

| Operação | Médio | Pior caso |
|----------|-------|-----------|
| Insert | O(log n) | O(n) (degenera em lista) |
| Search | O(log n) | O(n) |

Pior caso: insert em ordem (1, 2, 3, 4, 5...) cria lista. Por isso usamos **BSTs balanceadas**.

#### AVL Tree

BST auto-balanceada. Cada insert/delete pode disparar **rotação** pra manter `|height(left) - height(right)| ≤ 1`. Garante O(log n) pior caso. Strict balance → mais rotações que outros.

#### Red-Black Tree

BST balanceada com regras de cor (cada nó é vermelho ou preto). Menos estrita que AVL, menos rotações em escrita, ligeiramente mais profunda. **Usada em**: Linux kernel CFS scheduler, Java `TreeMap`, C++ `std::map`.

#### B-Tree e B+ Tree

**Generalização** de BST: cada nó tem **muitos** filhos (centenas). Otimizada pra **storage em disco/cache**: cada nó cabe numa **page** (4-8 KB). Reduz altura → reduz número de I/Os.

```
        [10 | 20 | 30]
       /     |    |    \
   [...]  [11..19] [21..29] [31..]
```

Operações: insert/search/delete em O(log n), mas com **base muito alta** (ex: B-Tree de ordem 100 com 1M elementos tem altura ~3, só 3 page reads).

**B+ Tree** (variação): só leaves armazenam dados; internos só keys de roteamento. Leaves linkadas em lista pra range scans.

**Usadas em**: Postgres índices (B-Tree), MySQL InnoDB, file systems (ext4, NTFS, ZFS), key-value stores.

#### Trie (prefix tree)

Tree onde cada nó representa um caractere. Caminhos = strings. Bom pra autocomplete, dicionários.

```
     root
    /  |  \
   a   b   c
   |   |   |
   p   a   a
   |   |   |
   e   r   r ...
```

### 2.6 Heap (priority queue)

**Binary heap**: árvore quase-completa com **heap property**:
- **Min-heap**: pai ≤ filhos
- **Max-heap**: pai ≥ filhos

**Implementação:** array. Para nó no índice `i`:
- Filho esquerdo: `2i+1`
- Filho direito: `2i+2`
- Pai: `(i-1)/2`

| Operação | Complexidade |
|----------|--------------|
| Peek (top) | O(1) |
| Insert (push) | O(log n) |
| Extract (pop) | O(log n) |
| Build from array | O(n) |

**Uso clássico:** Dijkstra (priority by distância), top-K, scheduling (run queue do CFS interno).

### 2.7 Graphs

Conjunto de nós (vértices) e arestas. Pode ser **dirigido** ou não, **ponderado** ou não.

**Representações:**
- **Adjacency list**: `vertices: { A: [B, C], B: [D], ... }`. Espaço O(V + E). Bom pra grafos esparsos.
- **Adjacency matrix**: matrix V×V. Espaço O(V²). Bom pra grafos densos ou queries "tem aresta entre A e B?".
- **Edge list**: lista de tuplas `[(A,B), (B,C), ...]`. Compacta, ruim pra queries.

Algoritmos clássicos vivem aqui (BFS, DFS, Dijkstra, A*), ver [01-05](01-05-algorithms.md).

**Em produção web:** grafos sociais (Facebook, LinkedIn), grafo de routing (Google Maps, sistema de logística!), grafo de dependências (npm), grafo de conhecimento (Google).

### 2.8 Estruturas avançadas (mencionar pra reconhecer)

- **Skip list**: linked list multi-nível probabilística. O(log n). Usada em Redis sorted sets.
- **Bloom filter**: probabilístico, "definitely not in set" ou "probably in set". Espaço minúsculo. Usado em Cassandra, Redis (BF.* commands), Chrome safe browsing.
- **HyperLogLog**: cardinalidade aproximada com erro <2% e memória O(1). Redis `PFCOUNT`.
- **Quadtree / Octree**: índices espaciais (mapas 2D/3D, bin packing).
- **R-Tree**: índice espacial pra consultas de bounding boxes (PostGIS).
- **LSM-Tree (Log-Structured Merge)**: write-optimized. Usado em RocksDB, Cassandra, ScyllaDB. **Importante** pra DBs modernas.
- **Merkle tree**: hash de hashes. Usada em Git, Ethereum, BitTorrent.

### 2.9 B-Tree variants (deep dive)

- **B-Tree clássico**: keys e values em todos nodes (internal + leaf). Range scan exige in-order traversal completo.
- **B+Tree**: keys em internal, values só em leaf. Leaves linkados (linked list duplo). Range scan = walk leaves. Postgres, MySQL InnoDB, SQLite usam B+Tree-like.
- **B*-Tree**: B+Tree com fill factor mínimo 2/3 (vs 1/2). Menos splits, menos espaço wasted. Visto em IBM DB2, Symbian.
- **B-link Tree** (Lehman-Yao): cada node tem pointer pra "right sibling". Permite **concurrent reads sem lock** durante splits, readers que entrem em node antigo seguem o link. Postgres usa B-link em índices.
- **Fractal Tree** (TokuDB): adiciona buffers em internal nodes. Writes batched, melhor pra HDD. Substituído por LSM em maioria dos workloads.

Trade-off de fan-out: B-Tree com page de 8KB e key 16 bytes tem fan-out ~500. Árvore com 1B keys precisa só ~4 níveis (log_500(10^9) ≈ 3.4). Cada lookup = 4 page reads. Por isso indices crescem devagar em altura.

### 2.10 Persistent (immutable) data structures

Estruturas funcionais onde "modificar" cria nova versão sem destruir antiga. Estrutura compartilha sub-árvores via path copying.

- **HAMT** (Hash Array Mapped Trie): base de Clojure maps, Scala maps, Immer. 32-way branching = baixa profundidade. O(log32 n) effectively constante.
- **RRB-Tree** (Relaxed Radix Balanced Tree): vector persistente com concat O(log n). Clojure vectors.
- **Finger Tree**: deque persistente com O(1) amortized push/pop em ambas pontas.
- **Zipper**: técnica pra navegar e atualizar estrutura imutável sem rewrite total.

Quando importam:
- Functional programming (FP languages, Redux, Immer).
- Time-travel debugging (Redux DevTools).
- Concurrent reads sem lock (immutable = safe).
- Snapshots cheap (database MVCC, undo/redo).

Custo: alocação de novo nodes a cada mutation. GC pressure. Em hot paths, mutável vence.

### 2.11 Cache-oblivious e cache-aware

Algoritmos cache-aware **conhecem** tamanho da cache; cache-oblivious são ótimos sob qualquer hierarchy de cache (L1, L2, L3, DRAM).

- **van Emde Boas layout**: B-Tree recursivamente subdividida pra ser cache-friendly em todos níveis.
- **Funnel sort**: cache-oblivious sorting.
- **Blocked algorithms**: matriz multiply em tiles que cabem em L1.

Conexão com 01-14 (CPU microarch): cache miss custa 100-300 ciclos. Layout matters.

### 2.12 Skip list (deep)

Probabilística. Cada node tem N levels com probabilidade p^N (típico p=0.5). Average O(log n) operations.

```
L4: [1]→[10]
L3: [1]→[5]→[10]→[15]
L2: [1]→[3]→[5]→[7]→[10]→[15]→[20]
L1: [1]→[2]→[3]→[4]→[5]→[6]→[7]→[8]→[10]→...
```

Search desce levels: começa em L4, avança até overshoot, desce. Insert sorteia level máximo.

Vantagens vs B-Tree: implementação simples (~50 linhas), sem rebalanço explicit, lock-free variants existem.
Desvantagens: pior cache locality que B-Tree, overhead per node maior.

Uso: Redis sorted set (ZSET), LevelDB MemTable, Cassandra MemTable, RocksDB MemTable.

### 2.13 HAMT (Hash Array Mapped Trie), concreto

Estrutura: trie com fan-out 32, indexed por bits do hash da key.
- Cada node tem bitmap (32 bits) + array compacto.
- Bit i set = key cujo hash[bits 0-4] = i existe.
- Array tem só entradas presentes (compacto, não 32 slots).
- Path-copy em update.

Result: insert/get/delete O(log32 n) ≈ O(1) (max depth ~6 pra 32B keys).

Implementations:
- Clojure `PersistentHashMap`.
- Scala `immutable.HashMap`.
- Erlang/Elixir `Map` (BEAM internal HAMT).
- Immer.js (JS).
- `im` crate (Rust).

### 2.14 LSM-Tree internals

Log-Structured Merge Tree é o oposto de B-Tree: write-optimized.

Components:
- **MemTable**: sorted in-memory (skip list ou red-black tree). Inserts vão aqui.
- **WAL**: persisted log (durability).
- **SSTable** (Sorted String Table): immutable on-disk file, sorted.
- **Compaction**: merge SSTables menores em maiores periodicamente.

Levels:
- Level 0: MemTable + recent flushes.
- Level N: maiores, mergeados.

Trade-off:
- Writes: O(1) amortized (append).
- Reads: pior caso O(N levels) (check MemTable → L0 → L1 → ...).
- Bloom filters por SSTable mitigam reads (skip files que definitely don't have key).

Used em: RocksDB (default em CockroachDB, TiKV, etcd 3+), Cassandra, ScyllaDB, LevelDB, HBase.

vs B-Tree (Postgres):
- LSM: writes 5-10x faster, reads slightly slower.
- B-Tree: balanced; updates in-place (= write amplification em SSDs).

### 2.15 Bloom filter math

`m` bits, `k` hash functions, `n` elements inserted. False positive rate:

```
FPR ≈ (1 - e^(-kn/m))^k
```

Optimal k pra m, n: `k = (m/n) * ln(2)`.

Exemplo: 10M elements, FPR target 1%. Necessário m ≈ 9.6 * n = ~96M bits = ~12MB. k ≈ 7.

Counting Bloom Filter: bytes em vez de bits. Permite delete (decrement counter). 4-8x mais espaço.

Cuckoo Filter: alternativa moderna, suporta delete, lower FPR mesma memória, usa cuckoo hashing.

Uso: Cassandra (key existence), CDN (negative cache), Chrome safe browsing, Bitcoin SPV clients (limitado a 2018).

### 2.16 Adjacency list vs matrix vs CSR

Pra grafo G(V, E):
- **Adjacency list**: array de listas. `adj[u] = [v, w, ...]`. Memory O(V+E). Iteration por vizinhos O(deg(v)).
- **Adjacency matrix**: matriz |V|×|V|. `m[u][v] = 1` se edge. Memory O(V²). Lookup O(1). Bom em grafo denso.
- **CSR (Compressed Sparse Row)**: dois arrays: `indices` (vizinhos concat) + `indptr` (offsets). Memory O(V+E), cache-friendly. Padrão em libs científicas (SciPy sparse, GraphBLAS).

Pra grafos dispersos (E << V²): list ou CSR. Pra densos (E ≈ V²): matrix. Pra graph algorithms heavy (PageRank em GPU): CSR + GPU primitives.

### 2.17 Trie e variantes

Trie (prefix tree): cada node representa caractere; path = prefix.
- Lookup O(|key|), independent de N.
- Boa pra autocomplete, dictionary, IP routing (radix tree).

Variantes:
- **Compressed trie / Radix tree** (Patricia): merge nodes únicos. Linux kernel routing table, etcd MVCC.
- **Suffix tree / Suffix array**: indexa todos suffixes. Bioinformatics, full-text search.
- **DAWG (Directed Acyclic Word Graph)**: trie minimizada compartilhando suffixes. Spell check.
- **FST (Finite State Transducer)**: maps key → value com compressão massiva. Lucene.

Memory: trie naive é heavy (1 node per char per word). Compressed e FST mitigam.

### 2.18 Disjoint Set Union (Union-Find)

Estrutura de equivalence classes.
- `find(x)`: representante da classe.
- `union(x, y)`: une duas classes.

Otimizações:
- **Path compression**: durante find, achata a árvore.
- **Union by rank/size**: une menor ao maior.

Com ambas: amortized O(α(n)) ≈ O(1) per operation (α = inverse Ackermann).

Uso: Kruskal MST, connected components, image segmentation, percolation.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Dar Big-O de todas operações principais (acesso, insert, delete, search) pra: array, linked list, hash table, BST balanceada, B-Tree, heap.
- [ ] Explicar por que linked list pode ser **mais lenta** que array em iteração mesmo tendo mesma Big-O.
- [ ] Distinguir **separate chaining** vs **open addressing** em hash tables, com pelo menos 2 trade-offs.
- [ ] Desenhar passo-a-passo um insert em **B-Tree** que causa split de nó.
- [ ] Implementar mentalmente um **min-heap** usando array (índices 2i+1, 2i+2).
- [ ] Dar **contraexemplo**: caso onde array é pior que linked list.
- [ ] Explicar **load factor** e por que rehashing existe.
- [ ] Diferença entre **B-Tree** e **B+Tree** e por que Postgres/MySQL preferem B+Tree.
- [ ] Casos de uso reais de Skip List, Bloom Filter e Merkle Tree.
- [ ] Explicar **adjacency list** vs **matrix** e quando usar cada.
- [ ] Diferenciar B-Tree, B+Tree, B-link Tree; por que Postgres escolhe B-link.
- [ ] Calcular memória de Bloom filter dado FPR target e n.
- [ ] Justificar HAMT (32-way) vs binary trie em uso prático.
- [ ] Explicar por que LSM-Tree vence B-Tree em writes; trade-off em reads.
- [ ] Diferenciar adjacency list, matrix, CSR; quando usar cada.
- [ ] Aplicar Union-Find com path compression em problema de connected components.

---

## 4. Desafio de Engenharia

**Implementar uma `LRUCache` thread-unsafe em TypeScript do zero.**

### Especificação

`class LRUCache<K, V>` com:
- `constructor(capacity: number)`
- `get(key: K): V | undefined`, O(1). Marca como recém-usado.
- `set(key: K, value: V): void`, O(1). Se cheio, remove o least-recently-used.
- `has(key: K): boolean`, O(1).
- `size: number`, getter.
- `clear(): void`
- Iterável (`Symbol.iterator`) percorrendo do mais recente ao menos.

### Restrições

- **Não use** `Map` do JS (que tem ordering garantido), você implementa o ordering.
- Use **doubly linked list** + **hash map** internos. Esse é o padrão de LRU O(1).
- Sem libs externas.
- Suite de testes:
  - Operações básicas
  - Eviction quando cheio
  - Atualização de valor não muda ordem (ou muda, sua decisão, documente)
  - 1 milhão de operações em <2s no seu hardware
  - Property-based test (gerar sequências aleatórias de get/set, verificar invariantes: size ≤ capacity, key recém-acessada nunca é a próxima a ser evicted).

### Threshold

- Todos testes passam.
- Você consegue **explicar passo a passo** o que acontece em `get('foo')` quando `foo` está no meio da lista, quais ponteiros são atualizados.
- Documenta no README:
  - Por que doubly linked list (e não singly)?
  - Por que `Map` interno (e não objeto plain)?
  - Como sua impl se comporta em uma chamada concorrente (não é thread-safe; o que aconteceria?).

### Stretch goals

- **TTL por entrada** (`set(key, value, ttlMs)`).
- **Métricas internas** (hits, misses, hit ratio).
- **LFU variant** (least-frequently-used), diferente algoritmo, mais complexo.

---

## 5. Extensões e Conexões

- **Conecta com [01-01, Computation Model](01-01-computation-model.md):** layout (contíguo vs não) determina cache behavior.
- **Conecta com [01-05, Algorithms](01-05-algorithms.md):** algoritmos operam sobre estruturas. Dijkstra usa heap, BFS usa queue, DFS usa stack.
- **Conecta com [01-07, JavaScript Deep](01-07-javascript-deep.md):** `Map`, `Set`, `WeakMap`, `WeakRef`, hidden classes.
- **Conecta com [02-09, Postgres Deep](../02-plataforma/02-09-postgres-deep.md):** índices B-Tree, GIN (inverted index), GiST (generalized search tree), BRIN. Hash join, merge join.
- **Conecta com [02-11, Redis](../02-plataforma/02-11-redis.md):** sorted sets via skip list, sets via hash table, lists via quicklist (linked list de listas), streams via radix tree.
- **Conecta com [02-12, MongoDB](../02-plataforma/02-12-mongodb.md):** índices B-Tree.
- **Conecta com [01-09, Git Internals](01-09-git-internals.md):** Merkle DAG, packfiles indexados.
- **Conecta com [04-03, Event-Driven Patterns](../04-sistemas/04-03-event-driven-patterns.md):** event store é frequentemente append-log + index estruturado.
- **Conecta com [04-11, Web3](../04-sistemas/04-11-web3.md):** Merkle trees em blockchains, Patricia tries em Ethereum.

### Ferramentas satélites

- **[VisuAlgo](https://visualgo.net/en)**: visualização interativa de várias estruturas.
- **[USFCA Visualizations](https://www.cs.usfca.edu/~galles/visualization/Algorithms.html)**.
- **Anki**: crie deck "data structures Big-O" e revise diariamente.

---

## 6. Referências de Elite

### Livros canônicos
- **Introduction to Algorithms** (CLRS, 4th ed), Capítulos 10-22 (estruturas).
- **Algorithms** (Sedgewick & Wayne, 4th ed), alternativa mais didática.
- **The Algorithm Design Manual** (Skiena), pragmatismo + war stories.
- **Database Internals** (Alex Petrov), capítulos sobre B-Tree, LSM, esp. relevantes.

### Repos
- **[Redis source](https://github.com/redis/redis)**: `src/dict.c` (hash table), `src/t_zset.c` (skip list), `src/quicklist.c`, `src/intset.c`.
- **[V8 hidden classes](https://v8.dev/blog/hidden-classes)**.
- **[Postgres B-Tree code](https://github.com/postgres/postgres/tree/master/src/backend/access/nbtree)**.

### Artigos
- **["Adversarial collision attacks on hash table"](https://www.bayswater.eu/2024/02/04/the-cost-of-using-hash-tables.html)**.
- **["Robin Hood Hashing should be your default Hash Table implementation"](https://www.sebastiansylvan.com/post/robin-hood-hashing-should-be-your-default-hash-table-implementation/)**.
- **["B-Trees vs LSM-Trees"](https://www.scylladb.com/2018/07/31/scylla-and-the-rocksdb-iterator/)**.

### Talks
- **["Algorithms with Predictions"](https://www.youtube.com/watch?v=MdcLiB_J7zg)**: frontier de estruturas com ML.
- **["Designing the Mental Model of a B-Tree"](https://www.youtube.com/results?search_query=B-Tree+mental+model)**.

### Comunidade
- **[type-challenges](https://github.com/type-challenges/type-challenges)**: desafios TS com algoritmos.
- **[Leetcode](https://leetcode.com/)**: pra exercitar (use as discussões, não só "passei nos testes").

---

**Encerramento:** após 01-04, escolha de estrutura deixa de ser intuição e vira raciocínio. Você nunca mais vai usar `Array.shift` pra implementar fila.
