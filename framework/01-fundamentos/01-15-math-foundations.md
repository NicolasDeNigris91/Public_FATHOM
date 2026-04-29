---
module: 01-15
title: Math Foundations for Computing, Discrete, Linear Algebra, Probability, Information Theory
stage: fundamentos
prereqs: [01-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-15, Math Foundations for Computing

## 1. Problema de Engenharia

Engenheiros que dizem "matemática não é necessária pra programar" estão certos pra CRUD app. Mas ML, criptografia, distributed systems consensus, performance analysis, search ranking, graphics, blockchain, type systems, todos exigem **base matemática**. Sem ela:
- 01-12 (cripto): você não entende discrete log nem por que Curve25519 é segura.
- 04-10 (AI/LLM): vector embeddings, gradient descent, attention, opacos.
- 04-01 (distributed): probabilistic guarantees, FLP, Byzantine, gossip, só intuição.
- 02-15 (search): TF-IDF, BM25 são fórmulas, HyperLogLog é probabilístico.
- 01-13 (compilers): type systems usam logic; correção via teorema.
- 04-14 (formal methods): impossível.

Este módulo é **mínimo viável de matemática aplicada a software**. Não é curso de matemática. É vocabulário e ferramentas. Discrete math (logic, set, graph), linear algebra (vetor, matriz, eigenvalues, SVD), probability (distribuições, expectation, Bayes, Markov), information theory (entropy, mutual info, coding), e numerical methods (precision, stability). Plus quando NÃO importa (CRUD app sem analytics).

Se você teve cálculo na faculdade e esqueceu, este módulo é re-entrada produtiva. Se nunca teve, este módulo te dá enough to navigate ML/cripto sem afogar.

---

## 2. Teoria Hard

### 2.1 Lógica e teoria de conjuntos

Vocabulário base:
- **Proposições**: enunciados true/false.
- **Conectivos**: ¬ (NOT), ∧ (AND), ∨ (OR), → (implica), ↔ (iff).
- **Quantificadores**: ∀ (for all), ∃ (exists).
- **De Morgan**: ¬(A ∧ B) = ¬A ∨ ¬B.
- **Conjuntos**: ∪, ∩, \, ⊆, cardinality |A|.
- **Functions**: injective, surjective, bijective.
- **Relations**: equivalence (reflexive, symmetric, transitive), order (partial, total).

Aplicações: boolean algebra em código, type theory (sum/product types ↔ lógica), DB queries (set operations).

### 2.2 Combinatorics

- **Permutations**: n! arranjos.
- **Combinations**: C(n,k) = n! / (k!(n-k)!).
- **Pigeonhole**: n+1 pombos em n caixas → uma caixa ≥ 2.
- **Inclusion-exclusion**: |A∪B| = |A| + |B| - |A∩B|.
- **Stirling, Catalan, Fibonacci**: sequências famosas.

Aplicações: análise de algoritmos, hash collisions (birthday paradox), crypto entropy.

**Birthday paradox**: 23 pessoas → > 50% probabilidade de 2 com mesmo aniversário. Implicações: hash collisions em N tentativas vs N² pares. Crypto pre-image vs collision.

### 2.3 Number theory (essential pra cripto)

- **Modular arithmetic**: a mod n. Anéis Z/nZ.
- **GCD, Euclid algorithm, extended Euclid**: encontrar inverso modular.
- **Fermat's little theorem**: a^(p-1) ≡ 1 (mod p), p primo.
- **Euler's theorem**: a^φ(n) ≡ 1 (mod n).
- **Prime numbers, primality tests**: Miller-Rabin probabilístico.
- **Discrete logarithm**: dado g^x mod p, achar x. Difícil. Base de DH/ECDH.
- **Elliptic curves**: y² = x³ + ax + b. Group law sobre curva. Point multiplication = base de ECC.

Aplicações: RSA (factoring), ECDH (discrete log em curva), Shor (quantum quebra ambos).

### 2.4 Graph theory

- **Graph**: G = (V, E). Directed / undirected, weighted.
- **Walks, paths, cycles**.
- **Connectedness**, **strongly connected components**.
- **Trees**: graph acíclico conectado.
- **Spanning trees**: subgraph cobrindo todos vertices, mínimo.
- **Matching**, **flow**.
- **Coloring**: register allocation em compiler é graph coloring.

Aplicações: routing (Dijkstra, A*), social graphs, dependency analysis, neural networks (computational graph), DAGs em pipelines.

### 2.5 Linear algebra

- **Vetor**: ordem N, em R^N. Operações: add, scalar mul, dot, cross.
- **Norm**: L1 (Manhattan), L2 (Euclidean), L∞ (max). Pra distance, regularização.
- **Matriz**: M × N. Operações: add, mul, transpose, inverse.
- **Linear transformation**: y = Mx. Rotação, projeção, scaling.
- **Determinant**: invertibilidade.
- **Rank**: dimensão da imagem.
- **Eigenvalues / eigenvectors**: Mv = λv. Encontram direções estáveis.
- **SVD** (Singular Value Decomposition): M = UΣV^T. Decomposição universal. Base de PCA, latent semantic analysis, recomendação.
- **PCA** (Principal Component Analysis): redução dimensional.

Aplicações: ML (forward pass = matmul), graphics (transforms), embeddings (vetores), search (cosine similarity), spectral clustering.

### 2.6 Calculus essentials

- **Derivative**: df/dx. Taxa de mudança.
- **Gradient** (∇f): vetor de derivadas parciais.
- **Chain rule**: d(f(g(x)))/dx = f'(g(x))·g'(x). Base de **backprop**.
- **Integral**: área sob curva. Probability density → CDF.
- **Convexity**: função onde linha entre pontos fica acima da função. Optimization fácil.

Aplicações: gradient descent (treinar ML), optimization, queueing theory (probability integrals).

### 2.7 Probability

- **Sample space**, **events**, **probability**: P(A) ∈ [0,1], P(Ω)=1.
- **Conditional**: P(A|B) = P(A∩B)/P(B).
- **Independence**: P(A∩B) = P(A)P(B).
- **Bayes**: P(A|B) = P(B|A)P(A)/P(B).
- **Random variable** discrete vs contínua.
- **Distribuições**:
  - **Bernoulli** (yes/no).
  - **Binomial** (n bernoullis).
  - **Geometric** (1ª success).
  - **Poisson** (eventos por intervalo, λ).
  - **Uniform** (continuous).
  - **Normal/Gaussian** (CLT).
  - **Exponential** (waiting time).
  - **Power law** (heavy tail; muitos sistemas reais).
- **Expectation, variance, std deviation, covariance**.
- **CLT** (Central Limit Theorem): soma de N variáveis iid → Normal.
- **Law of Large Numbers**.

Aplicações: A/B testing, performance analysis (latency P50/P95/P99), Bloom filters, HyperLogLog, ML, simulações Monte Carlo, capacity planning.

### 2.8 Markov chains

Estado segue transição probabilística. Memoryless: próximo só depende do atual.

- **Transition matrix** P.
- **Stationary distribution**: π = πP.
- **Ergodicity**.
- **Hidden Markov Models** (HMM): inferir estados de observações.
- **MCMC** (Markov Chain Monte Carlo): sampling de distribuições difíceis.

Aplicações: PageRank (random walker), language models (n-gram), recomendação, queueing, ML inference.

### 2.9 Information theory

- **Entropy** H(X) = -Σ p(x) log p(x). Incerteza ou bits necessários pra codificar.
- **Joint entropy, conditional entropy**.
- **Mutual information** I(X;Y) = H(X) - H(X|Y). Informação compartilhada.
- **KL divergence** D(p||q) = Σ p log(p/q). Distância entre distribuições. Loss em ML.
- **Cross-entropy**: medida usada em classification loss.
- **Channel capacity** (Shannon): max info por símbolo.
- **Coding**: Huffman (optimal prefix), arithmetic, Lempel-Ziv (LZ).

Aplicações: compression (gzip, zstd), ML loss functions, mutual info for feature selection, channel design (modems, cellular).

### 2.10 Numerical methods e precision

- **Floating point IEEE 754**: signal + exponent + mantissa. Precisão limitada.
- **Cancellation**: subtraction de valores próximos perde precisão.
- **Stability** vs **conditioning**.
- **Kahan summation**: somar floats sem perda.
- **Determinism**: GPU vs CPU mesmas ops nem sempre dão mesmo bit.

Aplicações: graphics, ML training (mixed precision, fp16, bf16), financial calc (não use float! use bigint cents).

### 2.11 Optimization

- **Linear programming** (LP): max c^T x subject to Ax ≤ b. Simplex, interior point.
- **Convex optimization**: convex func + convex set. Globally solvable. Many ML problems convexified.
- **Non-convex**: gradient descent local minima. Stochastic GD, momentum, Adam.
- **Discrete optimization**: integer programming, NP-hard.
- **OR-Tools** (Google), **Gurobi**, **CPLEX** pra LP/IP.

Aplicações: routing (Logística!), scheduling, ML training, hyperparameter tuning.

### 2.12 Statistical tests

- **t-test**: comparar duas médias.
- **chi-square**: independence.
- **A/B testing**: hypothesis testing aplicada.
- **p-value**, **confidence interval**, **type I/II errors**.
- **Multiple testing correction**: Bonferroni, FDR.
- **Bayesian alternatives**: posterior probabilities.

Aplicações: A/B tests (04-16), anomaly detection, data quality.

### 2.13 Big-O e crescimento

(Reforço de 01-05 com mais rigor)
- O(1), O(log n), O(n), O(n log n), O(n²), O(2^n).
- Master theorem pra recurrences.
- Amortized analysis (e.g., dynamic array push).
- Probabilistic analysis (e.g., quicksort expected n log n).

### 2.14 Discrete probability em sistemas

- **Bloom filter**: false positive rate em função de hash funcs e bits.
- **HyperLogLog**: cardinality com std error √(1/m).
- **Cuckoo filter, count-min sketch**: similar.
- **Random load balancing**: power of 2 choices reduz max load.
- **Consistent hashing**: deviação em N chaves entre N nodes.

Cada um deriva de probability + clever data structure.

### 2.15 Cryptographic math (preview de 01-12)

- **One-way functions**: hash.
- **Trapdoor functions**: RSA (factor), ECC (discrete log em curva).
- **Hard problems**: factoring, discrete log, lattice.
- **Random oracle model**: idealization de hash.
- **Negligible probability**: 1/2^k pra k grande.

### 2.16 Quantum overview

Paper limit de fundamento clássico:
- **Qubit**: superposition de |0⟩ + |1⟩.
- **Shor's**: quebra fatoração.
- **Grover's**: speedup quadrático em busca.
- **Post-quantum crypto**: lattice (Kyber, Dilithium), hash-based.

Pra Staff sciência, vocabulário básico.

### 2.17 Math tooling

- **NumPy / SciPy** (Python): linear algebra, stats.
- **SymPy**: symbolic math.
- **Jupyter / Colab**: scratch.
- **Wolfram Alpha**: rápido.
- **Mathematica / MATLAB / Octave**: simbólico/numérico.
- **R**: statistics.
- **Julia**: scientific computing crescente.

Não precisa dominar todos. NumPy + Jupyter cobre 90% das experimentações.

### 2.18 Quando matemática não importa

- CRUD apps sem analytics.
- Frontend sem ML/graphics.
- Backend sem ranking/search/cripto.
- Maioria do trabalho de Pleno em SaaS B2B.

Honest: 60% dos engenheiros saem da carreira sem aplicar matemática profunda. **Mas** ela é o gate pra ML, cripto, distributed correctness, performance, domínios crescentes.

Don't avoid; learn enough to transition quando preciso.

### 2.19 Linear algebra deep, para ML, graphics, embeddings

Conteúdo de §2.5 expandido com casos de uso concretos.

**Operações fundamentais cost-aware**:
- Dot product u·v: O(d). Hardware-accelerated via SIMD (AVX2 = 8 fp32/cycle).
- Matrix mul A(m×k) × B(k×n): O(m·k·n). Cache-blocked (tiles 64-256). cuBLAS / MKL otimizam fortemente.
- Cosine similarity = (u·v) / (||u|| · ||v||). Pra vetores L2-normalized = só dot product.

**Eigendecomposition** (A = QΛQ^-1):
- Existe pra matriz quadrada com eigenvectors LI.
- Symmetric matrix: Q ortogonal, Λ real (decomposição espectral).
- Power iteration acha maior eigenvalue em O(iter * n²). PageRank usa.

**SVD** (A = UΣV^T):
- Existe **pra qualquer matriz** (não só quadrada).
- Σ singular values ≥ 0 em ordem decrescente.
- Truncate top-k singular values → low-rank approximation. Compressão lossy ótima em norma Frobenius.
- Aplicações: PCA (= SVD em data centered), latent semantic analysis, recomendação (Netflix prize Singh), image compression.

**Norms recap**:
- L2 (Euclidean): √(Σ x_i²). Default em ML.
- L1 (Manhattan): Σ|x_i|. Sparsity-inducing em regularização.
- L∞: max|x_i|. Robust to outliers.
- Cosine: 1 - cos(angle). Direction matters, magnitude don't.

**Pra embeddings (04-10)**:
- Vetores 384-1536 dim (text-embedding-3-small = 1536).
- L2-normalize antes pra usar dot product.
- ANN (HNSW, 02-15) escala busca.

### 2.20 Probability deep, distribuições com casos

§2.7 expansão com formulae úteis.

**Bernoulli(p)**: 1 com prob p, 0 caso contrário. E[X]=p, Var[X]=p(1-p).

**Binomial(n, p)**: soma de n Bernoullis iid. E[X]=np, Var[X]=np(1-p). Use pra A/B test sample size.

**Poisson(λ)**: contagem de eventos em intervalo. E[X]=λ, Var[X]=λ. Aproximação de Binomial(n, p) com n→∞, p→0, np=λ. Use pra modelar requests/seg.

**Geometric(p)**: tentativas até sucesso. E[X]=1/p. Use pra retry counts.

**Exponential(λ)**: tempo entre eventos Poisson. E[X]=1/λ. Memoryless: P(X>s+t | X>s) = P(X>t). Modela latency tail.

**Normal(μ, σ²)**: gaussiana. CLT: soma de N variáveis iid com média e variance finitas → Normal pra N grande.

**Power law / Pareto**: P(X>x) ∝ x^(-α). Pesado em cauda. Modela: file sizes, web traffic, wealth, latency P99/P99.9.

**Para A/B test**:
- H0: p_A = p_B.
- Two-proportion z-test ou Bayesian beta-binomial.
- Sample size: `n ≈ 16 / (effect size)²` rule-of-thumb pra power 0.8, alpha 0.05.

**Para latency analysis**:
- Distribuições heavy-tail são REGRA, não exceção.
- Reportar percentis P50/P95/P99/P999, **não média** (média mascara cauda).
- Use t-digest (03-13) ou HDR Histogram pra estimar percentis em streaming.

### 2.21 Information theory deep, para compression, ML loss, channels

§2.9 expansão.

**Entropy** H(X) = -Σ p(x) log₂ p(x). Bits necessários pra encode.
- Distribuição uniforme em N símbolos: H = log₂ N (max).
- Sequência só de 'A': H = 0.
- Inglês: ~1.5 bits/char (vs 7-8 bits ASCII raw → compressão ~5x).

**Cross-entropy** H(p, q) = -Σ p log q. Bits pra encode com encoding subótimo.

**KL divergence** D_KL(p||q) = H(p,q) - H(p) ≥ 0. Distância (não simétrica) entre distribuições.

**Em ML**:
- Loss de classificação = cross-entropy entre target one-hot e softmax predictions.
- Variational inference minimiza KL divergence.

**Compression**:
- Shannon limit: dado fonte com entropia H, é impossível encode em < H bits/symbol average.
- Huffman atinge ótimo em prefix codes (com restrição inteiros bits).
- Arithmetic coding aproxima ótimo continuous.
- LZ77/LZ78 (gzip, deflate, zstd): explora repetições.

**Mutual information** I(X;Y) = H(X) - H(X|Y). Reduz incerteza de X dado Y.
- Feature selection: I(feature, label) alto = feature informativa.
- Decision trees usam information gain.

### 2.22 Graphs avançado, para social, web, ML

§2.4 expansion concreto.

**Algoritmos com complexity**:
- BFS / DFS: O(V+E).
- Dijkstra (positive weights): O(E log V) com binary heap; O(E + V log V) com Fibonacci heap.
- Bellman-Ford (negative): O(V*E).
- Floyd-Warshall (all-pairs): O(V³).
- Topological sort: O(V+E). Acíclico requirement.
- Strongly connected components (Tarjan): O(V+E).
- Min spanning tree (Kruskal/Prim): O(E log V).
- Max flow (Edmonds-Karp): O(V*E²); (Push-relabel): O(V²√E).

**PageRank** (Brin & Page, 1998):
- PR(p) = (1-d)/N + d * Σ_{q→p} PR(q)/L(q).
- d = damping factor (0.85 típico).
- Iterativo até convergência (~100 iter pra Web scale).
- Implementado via power iteration sobre matriz de transição.

**Centrality measures**:
- **Degree**: count de vizinhos.
- **Betweenness**: fração de shortest paths que passam por v.
- **Closeness**: 1 / sum distances de v a outros.
- **Eigenvector**: PageRank generalizado.

**Community detection**:
- **Louvain**: maximize modularidade. O(N log N) tipicamente.
- **Label propagation**: cada node herda label majoritário dos vizinhos. Fast, frágil.
- **Spectral clustering**: eigenvectors do Laplaciano.

### 2.23 Numerical computing, float, stability

§2.10 expansion.

**IEEE 754 fp32 (single)**:
- 1 sign + 8 exponent + 23 mantissa.
- Range: ~1e-38 a ~1e+38.
- Precision: ~7 decimais.

**IEEE 754 fp64 (double)**:
- 1 + 11 + 52.
- Range: ~1e-308 a ~1e+308.
- Precision: ~15-17 decimais.

**Bf16** (Brain Float, ML):
- 1 + 8 + 7. Same range que fp32 mas precision baixa.
- Useful em training (gradient flows preserved).

**Subnormal numbers**: muito perto de 0, exponent fixo. Slow path em CPU. `flush-to-zero` mode evita penalty.

**Catastrophic cancellation**:
```
x = 1.0000001
y = 1.0
x - y = 1e-7  // só 1 dígito útil pós-substração
```
Quando subtrair valores muito próximos, precision desaparece.

**Mitigation**:
- Reformular fórmulas (e.g., (a-b) onde a≈b → use trigonometric identity).
- Kahan summation: compensa erro de soma.
- Use higher precision em pontos críticos.

**Overflow / underflow**:
- LogSumExp: `log(Σ e^x_i)` overflows fácil. Reformular: `max(x) + log(Σ e^(x_i - max(x)))`.
- Softmax: subtrair max antes de exp pra evitar overflow.

### 2.24 Linear algebra em código

```python
import numpy as np

# Vetores
u = np.array([1, 2, 3])
v = np.array([4, 5, 6])
print(np.dot(u, v))                        # 32
print(np.linalg.norm(u))                   # 3.74...

# Matriz
A = np.array([[1, 2], [3, 4]])
print(A @ A)                               # matmul

# Inverse
print(np.linalg.inv(A))

# SVD
U, S, Vh = np.linalg.svd(A)
print(S)                                   # singular values

# Eigendecomposition
eigvals, eigvecs = np.linalg.eig(A)
```

NumPy (BLAS-backed) é canônico. Em GPU: cupy (drop-in replacement), JAX (composable transforms), PyTorch tensors.

### 2.25 Optimization concrete, gradient descent

```
loss = f(theta)
gradient = ∇_theta loss
theta_new = theta_old - lr * gradient
```

**Variants**:
- **SGD**: noisy gradient (mini-batch).
- **Momentum**: v_t = γ*v_(t-1) + lr*∇. Acumula direção.
- **Nesterov**: lookahead momentum.
- **AdaGrad / RMSprop**: adapta lr per-parameter.
- **Adam**: combinação. Default em deep learning.

**Convergence**:
- Convex problem: gradient descent converge a global min se lr suficiente pequeno.
- Non-convex: converge a local min (não garantido global).
- Saddle points: SGD escapes (noise helps).

**Learning rate scheduling**: cosine, step decay, warmup. Crítico em treinos longos.

### 2.26 Probabilistic data structures math

§2.14 expansão com formulae.

**Bloom filter**: cobertos em 01-04 §2.15.

**HyperLogLog**:
- m buckets de log₂(log₂ N) bits.
- Stochastic averaging.
- Erro padrão: 1.04/√m.
- m=2048 → erro 2.3%.

**Count-Min Sketch**:
- d hash functions × w buckets.
- Estimate count(x) = min over d hashes.
- Erro: ε pertence ((e/w), com prob 1-δ) com d ≥ ln(1/δ).
- Configure pra dataset target.

**MinHash**:
- Estima Jaccard similarity entre sets.
- Hash N vezes, take min de cada.
- Pr[same minhash] = Jaccard(A,B).

Uso: dedup de docs, plagiarism detection, near-duplicate.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Aplicar Bayes em problema concreto.
- Calcular dot product, cosine similarity em vetores pequenos.
- Explicar SVD ou PCA em uma frase.
- Diferenciar L1, L2, L∞ norms.
- Calcular birthday paradox approximation.
- Diferenciar Bernoulli, Binomial, Poisson, Normal.
- Aplicar CLT e LLN.
- Aplicar Bayes condicional.
- Calcular entropy de distribuição simples.
- Diferenciar p-value e confidence interval.
- Justificar floating point cancellation com exemplo.
- Aplicar gradient descent step em função 2D.
- Justificar consistent hashing usando intuição probabilística.

---

## 4. Desafio de Engenharia

Implementar **5 algoritmos matemáticos** em TypeScript ou Python.

### Especificação

1. **Vector / matrix lib mínima**:
   - Tipo Vector + Matrix.
   - Operações: add, sub, dot, matmul, transpose, inverse 3x3.
   - Norms L1, L2, L∞.
   - Tests cobrindo edge cases.
2. **PCA on toy dataset**:
   - Implementar via SVD (use lib pra SVD; PCA wrapping).
   - Aplicar em dataset 2D blob → reduzir 1D.
   - Plot.
3. **Bayes inference**:
   - Spam classifier mínimo: prior P(spam), likelihood P(word|spam) via training set.
   - Posterior P(spam|words).
   - Test em mini set.
4. **Gradient descent**:
   - Minimize f(x,y) = (x-3)² + (y+2)². Convex.
   - Show convergence em 50 iterations.
   - Plot trajectory.
5. **HyperLogLog**:
   - Implementar com m=128 buckets.
   - Estimar cardinality em set de 100k items único + duplicates.
   - Comparar com size real.
6. **Análise** (`math-bench.md`):
   - Validate cada implementação contra biblioteca de referência (NumPy, simple-statistics).
   - Document precision e edge cases.

### Restrições

- Sem libs de math além de SVD (justificável usar LAPACK/SciPy lá).
- Tests cobrem casos numéricos delicados.
- Floats com cuidado (Kahan onde apropriado).

### Threshold

- 5 implementations passing tests.
- Comparison vs NumPy / standard libs com erros ≤ tolerance.
- README clarifica matemática usada.

### Stretch

- **K-means** clustering com plot.
- **Markov chain** simulation com stationary distribution comparison.
- **Bloom filter** com FPR analítico vs medido.
- **Linear regression** by gradient descent vs closed-form.
- **Monte Carlo integration** de função 2D.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): graph, hash, probabilistic.
- Liga com **01-05** (algorithms): probabilistic, randomized.
- Liga com **01-12** (cripto): número, EC, mod arithmetic.
- Liga com **01-13** (compilers): graph (CFG, register alloc).
- Liga com **02-09** (Postgres): query stats, percentiles.
- Liga com **02-15** (search): TF-IDF, BM25, vector cosine.
- Liga com **02-16** (graph DBs): graph theory.
- Liga com **03-10** (backend perf): probability of latency tail.
- Liga com **03-13** (analytical DBs): t-digest, HLL.
- Liga com **04-01** (distributed): probability of failures, gossip.
- Liga com **04-04** (resilience): jitter, exponential backoff statistics.
- Liga com **04-10** (AI/LLM): linear algebra is core.
- Liga com **04-11** (Web3): cripto + Merkle.
- Liga com **04-14** (formal methods): logic.

---

## 6. Referências

- **"Mathematics for Machine Learning"**: Deisenroth, Faisal, Ong. Gratuito.
- **"3Blue1Brown" YouTube channel**: Essence of Linear Algebra, Calculus.
- **"Concrete Mathematics"**: Graham, Knuth, Patashnik.
- **"Introduction to Probability"**: Blitzstein, Hwang.
- **"Probability and Statistics for Computer Scientists"**: Baron.
- **"Information Theory, Inference, and Learning Algorithms"**: David MacKay (gratuito, brilhante).
- **"Numerical Recipes"**: Press et al.
- **"Convex Optimization"**: Boyd, Vandenberghe (gratuito).
- **"The Art of Computer Programming"**: Knuth (vols 1-4, dense).
- **MIT OCW 18.06 Linear Algebra**: Gilbert Strang.
- **Khan Academy**: fundações lacunares.
- **3Blue1Brown e StatQuest**: visualizações.
