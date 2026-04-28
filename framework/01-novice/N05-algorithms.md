---
module: N05
title: Algoritmos — Big-O, Sorting, Searching, DP, Graph, Strings
stage: novice
prereqs: [N04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# N05 — Algoritmos

## 1. Problema de Engenharia

Algoritmos são **as receitas** de como resolver problemas computacionais. Linguagem, framework, banco — todos rodam algoritmos por baixo. Decisões arquiteturais frequentemente são, no fundo, **decisões algorítmicas**:

- Postgres escolhe entre `nested loop join`, `hash join`, `merge join` baseado em estatísticas — você precisa entender os 3 pra ler `EXPLAIN`.
- Sistema de logística (capstone) precisa **encontrar caminho mais curto** (Dijkstra/A*), **otimizar rota** (TSP/VRP — NP-hard, heurísticas), **balancear carga** entre veículos.
- Anti-cheat em jogos usa **string matching** (KMP, Rabin-Karp) pra detectar padrões em logs.
- Compressão (gzip, brotli) usa **LZ77/LZ78** + **Huffman**.
- Search engines usam **inverted index** + **TF-IDF** + **PageRank**.

Sem fundamento algorítmico, você vira escravo de bibliotecas — quando algo não tem lib, você trava.

---

## 2. Teoria Hard

### 2.1 Análise de complexidade

Já vimos Big-O em [N04](N04-data-structures.md). Reforçando:

- **O (Big-O):** upper bound, "no máximo cresce assim".
- **Ω (Big-Omega):** lower bound.
- **Θ (Theta):** apertado (matches O e Ω).
- **o (little-o):** estritamente menor.

Pra problemas, fala-se de:
- **Best case** (raro relevante)
- **Worst case** (mais usado em garantias)
- **Average case** (geralmente apresentado em comparações)
- **Amortized** (custo médio sobre sequência de operações)

**Master theorem** (pra recorrências de divide-and-conquer):
- `T(n) = a·T(n/b) + f(n)` — comparar `f(n)` com `n^(log_b a)` pra resolver.
- Exemplo: merge sort `T(n) = 2T(n/2) + O(n)` → `O(n log n)`.

### 2.2 Sorting

**Comparison-based sorts** (têm lower bound `Ω(n log n)`):

| Algoritmo | Tempo médio | Pior caso | Espaço extra | Estável | Notas |
|-----------|-------------|-----------|--------------|---------|-------|
| Bubble sort | O(n²) | O(n²) | O(1) | sim | só didático |
| Insertion sort | O(n²) | O(n²) | O(1) | sim | bom pra n pequeno e quase-ordenado |
| Selection sort | O(n²) | O(n²) | O(1) | não | ruim, raramente usado |
| Merge sort | O(n log n) | O(n log n) | O(n) | sim | divide-and-conquer, boa pra dados externos |
| Quick sort | O(n log n) | O(n²) | O(log n) | não | excelente em prática, cache-friendly |
| Heap sort | O(n log n) | O(n log n) | O(1) | não | in-place mas constante alta |
| Tim sort | O(n log n) | O(n log n) | O(n) | sim | usado em Python, V8 (Array.sort) |
| Intro sort | O(n log n) | O(n log n) | O(log n) | não | quick → heap em recursão profunda; libstdc++ |

**Non-comparison sorts** (podem ser O(n) com restrições):
- **Counting sort**: O(n + k) onde k = range. Para inteiros pequenos.
- **Radix sort**: O(n·d) onde d = dígitos. Para strings/inteiros.
- **Bucket sort**: O(n) médio com distribuição uniforme.

**`Array.prototype.sort` em V8:** Tim sort estável desde V8 7.0 (Chrome 70+, Node 11+). Use `arr.sort((a,b) => a-b)` pra numérico — `(a,b) => a < b` está **errado** (não estável).

### 2.3 Searching

- **Linear search**: O(n). Funciona em qualquer ordem.
- **Binary search**: O(log n). **Requer ordenação.**
- **Interpolation search**: O(log log n) em distribuições uniformes; O(n) pior caso.
- **Hashing**: O(1) médio.
- **Trees** (BST, B-Tree, Trie): O(log n).

**Cuidado com binary search:**
```typescript
// Correto:
let lo = 0, hi = arr.length - 1;
while (lo <= hi) {
  const mid = lo + Math.floor((hi - lo) / 2); // evita overflow
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;
```

Erros clássicos: condição `<` vs `≤`, off-by-one no `mid`, overflow em `(lo+hi)/2` em linguagens com inteiro fixo.

### 2.4 Recursion e Dynamic Programming (DP)

**Recursão**: função se chama. Toda recursão tem **caso base** + **passo recursivo**.

```typescript
function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2); // O(2^n) — exponencial
}
```

**Problema:** `fib(40)` repete cálculos massivamente.

**Solução 1 — Memoization (top-down DP):**
```typescript
const memo = new Map<number, number>();
function fib(n: number): number {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n)!;
  const r = fib(n - 1) + fib(n - 2);
  memo.set(n, r);
  return r;
}
// O(n) tempo, O(n) espaço
```

**Solução 2 — Tabulação (bottom-up DP):**
```typescript
function fib(n: number): number {
  if (n < 2) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}
// O(n) tempo, O(1) espaço
```

**Quando DP se aplica:**
- **Optimal substructure**: solução do problema é solução de subproblemas.
- **Overlapping subproblems**: mesmos subproblemas aparecem em diferentes caminhos.

**Problemas DP clássicos:**
- Longest Common Subsequence
- Knapsack (mochila)
- Coin change
- Edit distance (Levenshtein) — usado em diff, autocorrect.
- Longest Increasing Subsequence

### 2.5 Greedy e Divide-and-Conquer

**Greedy:** escolha localmente ótima → globalmente ótima (em alguns problemas). Exemplos:
- Dijkstra (min path)
- Huffman coding
- Activity selection
- Kruskal/Prim (MST)

Greedy só funciona se o problema tem **matroid structure** ou propriedade de troca. Senão dá errado (TSP greedy é ruim).

**Divide-and-conquer:** divide problema em sub-problemas independentes, resolve recursivamente, combina. Exemplos:
- Merge sort
- Quick sort
- Strassen (multiplicação de matrizes)
- FFT
- Closest pair of points

### 2.6 Graph algorithms

**BFS (Breadth-First Search):** O(V+E). Usa **queue**. Encontra **menor número de arestas** (shortest path em grafos não-ponderados).

**DFS (Depth-First Search):** O(V+E). Usa **stack** (recursão). Útil pra:
- Detectar ciclos
- Topological sort (ordenar nós em DAG)
- Componentes conectados
- Articulation points / bridges

**Dijkstra:** O((V+E) log V) com heap. Caminho mais curto em grafo **com pesos não-negativos**. **Greedy.**

**Bellman-Ford:** O(V·E). Permite **pesos negativos** (mas não ciclos negativos).

**Floyd-Warshall:** O(V³). All-pairs shortest path. Pra grafos pequenos.

**A\***: Dijkstra + heurística admissível (subestima custo restante). Mais rápido na prática quando heurística é boa. **Usado em jogos, GPS, sistemas de routing.**

**Topological sort**: ordenação de DAG tal que aresta `u→v` aparece antes `v`. Útil pra build systems (dependências), scheduling, package managers.

**Union-Find (DSU)**: estrutura pra "equivalence classes". Operações `find`, `union` em O(α(n)) amortizado (≈ O(1)). Usado em Kruskal MST, conexão de componentes em rede.

**Minimum Spanning Tree (MST):**
- **Kruskal**: O(E log E). Usa Union-Find. Pega arestas mais leves sem formar ciclo.
- **Prim**: O((V+E) log V). Cresce a partir de um nó.

### 2.7 String algorithms

- **Naive matching**: O(n·m). Pra n curto, ok.
- **KMP** (Knuth-Morris-Pratt): O(n+m). Pré-computa "failure function" pra evitar re-comparações.
- **Rabin-Karp**: O(n+m) médio com **rolling hash**. Bom pra múltiplos padrões simultâneos.
- **Boyer-Moore**: heurísticas de **bad character** e **good suffix**. Sublinear na prática (`grep` usa).
- **Aho-Corasick**: encontra muitos padrões simultaneamente em O(n + m + k). Antivírus, detection systems.

**Tries**: estrutura natural pra prefix matching, autocomplete.

**Suffix arrays** e **suffix trees**: queries complexas em texto (subseqüências, repetições). Implementação avançada.

### 2.8 Computational complexity (rápido)

- **P**: problemas resolvíveis em tempo polinomial.
- **NP**: problemas onde solução é verificável em polinomial.
- **NP-complete**: problemas NP onde toda outra NP reduz a eles. Resolver um eficientemente = resolver todos. Famosos: SAT, TSP, Knapsack, Graph Coloring.
- **NP-hard**: pelo menos tão difícil quanto NP-complete (mas pode não estar em NP).
- **P = NP?** Pergunta aberta de US$ 1M (Millennium Prize). Provavelmente P ≠ NP.

**Pra você na prática:** quando um problema é NP-hard (TSP, scheduling, knapsack), aceitar **heurísticas/aproximações** em vez de buscar solução exata. Algoritmos genéticos, simulated annealing, branch-and-bound, ML-based heurísticas, etc.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Dar Big-O médio e pior de quick sort, merge sort, heap sort, Tim sort.
- [ ] Implementar **binary search** sem off-by-one no quadro.
- [ ] Distinguir **memoization** (top-down) vs **tabulação** (bottom-up) com exemplo.
- [ ] Explicar quando **greedy** funciona e quando falha. Dar **contraexemplo** (TSP greedy ruim).
- [ ] Implementar **Dijkstra** com priority queue mentalmente.
- [ ] Diferença entre **BFS** e **DFS** em termos de estrutura usada (queue vs stack) e comportamento.
- [ ] Explicar **A\*** e o que é uma **heurística admissível**.
- [ ] Citar 3 problemas **NP-hard** clássicos.
- [ ] Explicar **rolling hash** em Rabin-Karp.
- [ ] Casos onde **counting sort/radix sort** batem qualquer comparison sort.

---

## 4. Desafio de Engenharia

**Implementar e comparar 3 algoritmos de routing num grafo de estradas reais.**

### Especificação

1. Baixe um pequeno extract de OpenStreetMap (ex: cidade pequena via [extract.bbbike.org](https://extract.bbbike.org/) ou [Geofabrik](https://download.geofabrik.de/)) em formato `.osm.pbf`.
2. Parse o `.osm.pbf` (ou converta pra GeoJSON com `osmium` antes) e construa um **grafo dirigido** onde:
   - Vértices = nós OSM
   - Arestas = segmentos de via (ways)
   - Pesos = distância (haversine entre coords) ou tempo estimado (distância / `maxspeed` da via).
3. Implemente **3 algoritmos** de routing:
   - **Dijkstra** (com priority queue / min-heap)
   - **A\*** (com heurística haversine "como o pássaro voa")
   - **Bidirectional Dijkstra** (busca de origem e destino simultaneamente, encontram-se no meio)
4. CLI:
   ```
   $ node route.js --from "lat1,lng1" --to "lat2,lng2" --algo dijkstra
   ```
5. Compare em um conjunto de pares origem-destino:
   - Tempo de execução
   - Nodes explored
   - Caminho retornado é o mesmo? (deve ser, sem heurísticas inadmissíveis).

### Restrições

- Implemente **as estruturas (heap)** você mesmo, sem libs.
- Sem libs de routing prontas (`graphhopper-js`, etc).
- Pode usar lib de parsing OSM (`osm-pbf-parser`, etc).

### Threshold

- Os 3 algoritmos retornam **caminhos com mesma distância total** (exceto se A\* usa heurística inadmissível — não use).
- A\* explora **estritamente menos** ou igual ao Dijkstra.
- Bidirectional Dijkstra explora aproximadamente metade do espaço.
- Documenta no README:
  - Como você representou o grafo (adjacency list?)
  - Por que pré-computou heurística (distância haversine).
  - Casos onde A\* não ajuda (heurística ruim ou problema simétrico).
- Funciona em <500ms pra rotas de até 50 km no extract.

### Stretch goals

- **Contraction Hierarchies** ou **CH preprocessing** (preprocessamento que torna queries em milissegundos pra grafos enormes).
- **Multi-criteria** (otimizar tempo + evitar pedágios).
- **Visualização** (export do path em GeoJSON, render num mapa Leaflet).

Esse desafio é particularmente útil porque **alimenta o capstone de logística**.

---

## 5. Extensões e Conexões

- **Conecta com [N04 — Data Structures](N04-data-structures.md):** todo algoritmo opera sobre estruturas. Heap pra Dijkstra, queue pra BFS, stack pra DFS.
- **Conecta com [N01 — Computation Model](N01-computation-model.md):** algoritmos cache-friendly batem cache-hostile na prática mesmo com mesmo Big-O.
- **Conecta com [A09 — Postgres Deep](A09-postgres-deep.md):** query planner escolhe entre nested loop, hash, merge join — algoritmos de junção. PostGIS faz routing geo com algoritmos similares ao seu desafio.
- **Conecta com [S09 — Scaling](S09-scaling.md):** **consistent hashing** (DynamoDB, Cassandra, sharding moderno) é algoritmo crítico.
- **Conecta com [Capstone Senior](../04-senior/CAPSTONE-senior.md):** logística distribuída exige routing + otimização (VRP).
- **Conecta com [S10 — AI/LLM](../04-senior/S10-ai-llm-systems.md):** algoritmos de **nearest neighbor** em vector DBs (HNSW, IVF) são variações de graph search e clustering.

### Ferramentas satélites

- **[VisuAlgo](https://visualgo.net/en)** — animations.
- **[CP-Algorithms](https://cp-algorithms.com/)** — referência detalhada de algoritmos competitivos. Excelente.
- **[Leetcode top 100](https://leetcode.com/problem-list/top-100-liked-questions/)** — exercício.

---

## 6. Referências de Elite

### Livros canônicos
- **Introduction to Algorithms** (CLRS, 4th ed) — referência absoluta.
- **Algorithms** (Sedgewick & Wayne) — alternativa didática.
- **The Algorithm Design Manual** (Skiena) — pragmático, com war stories.
- **Algorithms for Competitive Programming** ([cp-algorithms.com](https://cp-algorithms.com/)) — free, denso.
- **Algorithms** (Jeff Erickson) — free em [jeffe.cs.illinois.edu/teaching/algorithms](https://jeffe.cs.illinois.edu/teaching/algorithms/). Notebook-style, brilhante.

### Cursos
- **[Princeton Algorithms (Coursera)](https://www.coursera.org/learn/algorithms-part1)** — Sedgewick. Sólido.
- **[MIT 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/)** — free, denso.

### Repos
- **[trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms)** — implementações em JS.
- **[the-algorithms](https://github.com/TheAlgorithms)** — mesmas estruturas em várias linguagens.
- **[GraphHopper](https://github.com/graphhopper/graphhopper)** — routing engine open-source. Leia pra ver Contraction Hierarchies em produção.
- **[OSRM](https://github.com/Project-OSRM/osrm-backend)** — outro routing engine.

### Talks
- **["What every programmer should know about algorithms"](https://www.youtube.com/results?search_query=what+every+programmer+should+know+algorithms)** — várias talks.
- **["Sorting Algorithms - Visualized"](https://www.youtube.com/watch?v=kPRA0W1kECg)** — clássica.

### Comunidade
- **[Codeforces](https://codeforces.com/)** — competitive programming, conteúdo de elite.
- **[Topcoder Tutorials](https://www.topcoder.com/community/competitive-programming/tutorials/)** — resumos de algoritmos.

---

**Encerramento:** após N05, você consegue olhar pra um problema novo e raciocinar: "isso parece grafo / DP / sorting / hashing / etc". Esse mapeamento é o que diferencia engenheiro de programador.
