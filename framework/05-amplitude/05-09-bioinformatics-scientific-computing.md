---
module: 05-09
title: Bioinformatics & Scientific Computing, HPC, Numerical Methods, Reproducibility
stage: amplitude
prereqs: [01-15]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual diferenca define scientific computing vs SaaS engineering?"
    options:
      - "Scientific computing usa apenas Python; SaaS usa qualquer linguagem"
      - "Correctness numerica e reprodutibilidade > velocidade de delivery"
      - "Scientific computing nao usa containers"
      - "SaaS nao tem regulamentacao"
    correct: 1
    explanation: "Scientific computing prioriza correctness numerica, determinism, reprodutibilidade obrigatoria, long-running jobs (dias-semanas), data-heavy. Paper claim deve ser reproducible por third party."
  - q: "Qual e a diferenca entre MPI e OpenMP em HPC?"
    options:
      - "MPI e proprietario; OpenMP e open-source"
      - "MPI e paralelismo distribuido entre nodes; OpenMP e shared-memory dentro de node"
      - "Ambos sao identicos com APIs diferentes"
      - "OpenMP e exclusivo de GPUs"
    correct: 1
    explanation: "MPI (Message Passing Interface) faz paralelismo distribuido entre nodes via mensagens. OpenMP faz shared-memory dentro de node via pragmas. Programa hibrido usa ambos."
  - q: "Por que Singularity/Apptainer e preferido a Docker em HPC?"
    options:
      - "Docker nao roda em Linux"
      - "Singularity roda como user (sem root), integra com cluster filesystem e suporta MPI"
      - "Singularity e 10x mais rapido"
      - "Docker nao suporta GPU passthrough"
    correct: 1
    explanation: "Docker em HPC tem security issues (root). Singularity/Apptainer roda containers como user, integra com filesystem do cluster (Lustre/GPFS), suporta MPI dentro do container."
  - q: "Em 2026, por que uv (Astral) substitui pip+pip-tools+venv stack?"
    options: 
      - "uv e proprietario com licenca enterprise"
      - "uv e Rust-based e 10-100x faster em dependency resolution"
      - "uv elimina necessidade de virtualenvs"
      - "uv suporta apenas Python 2.7"
    correct: 1
    explanation: "uv (Astral, GA Set 2024) e Rust-based, 10-100x faster que pip em resolution e install. Substitui pip/pipx/poetry stack inteiro em projetos novos. PEP 723 inline scripts suportado."
  - q: "Qual e a contribuicao chave do AlphaFold 3 (Mai 2024) sobre AF2?"
    options:
      - "Open weights libertados para uso comercial"
      - "Prediz proteinas + DNA + RNA + ligands + ions, todo complexo biomolecular"
      - "Substitui completamente experimentos de cryo-EM"
      - "Roda em smartphone via inference local"
    correct: 1
    explanation: "AF3 expande para predicao de complexos biomoleculares completos (proteinas + DNA + RNA + ligands + ions), com ~50% improvement em interaction prediction vs AF2. Weights restricted (server only)."
---

# 05-09, Bioinformatics & Scientific Computing (Optional)

## 1. Problema de Engenharia

Software engineer faz CRUD; cientista faz pesquisa; bioinformata combina. Genômica gera **petabytes** de dados; physics simulations rodam em supercomputers; ML training scale-out exige HPC. Engineering aqui é diferente: numerical correctness > tudo, reprodutibilidade obrigatória, paper-driven, menos ágil mais rigor.

Pra Logística, 05-09 é **opcional, pra quem aspira eixo bio/biotech, pharma, healthcare AI, climate, genomics**, ou empresas como Genomatic, Recursion, 23andMe, Insitro, Ginkgo, climate tech. Domínio com complexidade técnica densa: pipelines genomic, file formats binários (BAM/VCF), GPU clusters, Python scientific stack, MPI, Slurm, reprodutibilidade de paper, HIPAA/LGPD-saúde.

Software engineer que vira "tech lead em laboratório" multiplica produtividade científica 5-10x. Saber programar é 30% do trabalho; entender o domínio (biologia, química, física computacional) é 70%. Este módulo dá **fundação suficiente** pra entrar, não pra fazer doutorado.

Cobertura: numerical methods, HPC (Slurm, MPI, OpenMP), GPU computing (CUDA básico), scientific Python stack (NumPy, SciPy, pandas, Polars, Dask), bioinformatics workflows (Nextflow, Snakemake), file formats (FASTA, BAM, VCF, HDF5, Zarr), reproducibility (Nix, conda, containers), papers e citation patterns, regulatory.

---

## 2. Teoria Hard

### 2.1 Scientific computing landscape

Diferenças vs SaaS engineering:
- **Correctness numérica > velocidade**.
- **Determinism**: mesmo input → mesmo output exato é meta (não sempre alcançado, GPU/parallelism quebra).
- **Reprodutibilidade**: paper claim deve ser reproducible por third party. Versioning agressivo de tudo.
- **Long-running jobs**: dias a semanas em cluster.
- **Data-heavy**: terabytes input, output. I/O é gargalo frequente.
- **Workflow tooling diferente**: pipelines, DAGs científicos vs Airflow.
- **Regulação**: HIPAA / LGPD / GDPR / GxP pra clinical.

### 2.2 Bioinformatics: domain quick

Genoma humano: 3 bilhões de bases. Sequencing read: 100-150bp em short-read (Illumina), 10kb-100kb em long-read (PacBio, Nanopore).

Pipeline canônico:
1. **Sequencing** → FASTQ files (raw reads).
2. **Quality control** (FastQC).
3. **Trimming** adapters (Trimmomatic).
4. **Alignment** ao genoma referência (BWA, minimap2) → SAM/BAM.
5. **Variant calling** (GATK, DeepVariant) → VCF.
6. **Annotation** (snpEff, VEP).
7. **Analysis** específica.

Cada passo: diferente tool, diferente file format, diferente runtime parameters. Ecosystem fragmentado.

### 2.3 File formats canônicos

- **FASTA**: sequencias proteína/DNA texto. `>header\nACGT...`.
- **FASTQ**: reads + quality scores Phred.
- **SAM / BAM**: alinhamentos. SAM texto, BAM binário compressed.
- **VCF / BCF**: variants. VCF texto tab-separated.
- **GFF / GTF**: annotations.
- **BED**: ranges.
- **HDF5**: arrays multi-dim, metadata. Usado em ML, climate.
- **Zarr**: cloud-native HDF5.
- **NetCDF**: climate, atmospheric.
- **Parquet**: tabular columnar (03-13 já cobriu).

Tools: `samtools`, `bcftools`, `bedtools` operam BAM/VCF/BED.

### 2.4 HPC: cluster computing

HPC cluster: 100s-1000s de nodes, interconnect alta-largura (InfiniBand, RoCE), shared filesystem (Lustre, GPFS).

Job scheduler:
- **Slurm** (Simple Linux Utility for Resource Management), domina.
- **PBS / Torque** legado.
- **LSF** (IBM) commercial.

```
sbatch --nodes=4 --ntasks-per-node=24 --time=48:00:00 my_job.sh
```

Jobs em queue. Priority via fairshare. Memory, CPU, GPU como recursos.

### 2.5 MPI e OpenMP

- **MPI** (Message Passing Interface): paralelismo distribuído entre nodes via passing messages. `MPI_Send`, `MPI_Recv`, `MPI_Allreduce`.
- **OpenMP**: paralelismo shared-memory dentro de node via `#pragma omp parallel for`.

Programa híbrido: MPI entre nodes + OpenMP por node.

C/C++/Fortran majoritários em HPC clássico. Python via mpi4py possível mas slower.

### 2.6 GPU computing

CUDA (NVIDIA) domina. Workloads massively parallel:
- Linear algebra (BLAS, cuBLAS).
- ML training (PyTorch, TensorFlow, JAX).
- Simulations (molecular dynamics, fluid).
- Crypto / hashing.
- Imaging.

**CUDA basics**:
- Kernel = function rodando em GPU.
- Grid de blocks de threads.
- Memory: global, shared, constant, register.
- Synchronization explicit.

Higher-level: PyTorch, JAX, CuPy, Numba (CUDA target). Maioria scientific evita escrever CUDA cru.

ROCm (AMD), oneAPI (Intel) competidores; menor ecossistema ainda.

### 2.7 Scientific Python stack

- **NumPy**: arrays N-dim, vectorized ops, BLAS-backed.
- **SciPy**: stats, optimization, linear algebra avançada, sparse matrices, signals.
- **pandas**: tabular DataFrame, vetorial. Lento em GB scale.
- **Polars**: alternative pandas Rust-based, faster.
- **xarray**: NumPy + labeled dims (geospatial, climate).
- **Dask**: parallel + out-of-core. Escala pandas/numpy a clusters.
- **Ray**: parallel + distributed.
- **scikit-learn**: ML clássico (não-deep).
- **PyTorch / TensorFlow / JAX**: deep learning.
- **Matplotlib / Seaborn / Plotly / Altair**: viz.
- **Jupyter / IPython**: notebooks.

Notebooks são ferramenta padrão em ciência. Pull request scientific frequently é notebook + paper.

### 2.8 Numerical methods e stability

- **Floating-point precision**: fp32 default ML; fp64 padrão sci compute; fp16 / bf16 mixed precision em ML.
- **Catastrophic cancellation**: subtração de numbers próximos perde precisão.
- **Conditioning** vs **stability** (01-15).
- **ODE / PDE solvers**: explicit (Euler) vs implicit (Crank-Nicolson). Stiffness importa.
- **Iterative solvers**: GMRES, CG (sparse linear systems).
- **Monte Carlo** vs deterministic.

Errors escalam com problem size. Quem ignora produz papers errados.

### 2.9 Workflow management: Nextflow, Snakemake, WDL

Pipelines bioinformatics são DAGs de tools. Tools de workflow:
- **Nextflow**: Groovy DSL. Channels (data flowing), processes (steps). Cloud-native (AWS Batch, GCP Life Sciences).
- **Snakemake**: Python-like, declarative rules.
- **WDL** (Workflow Description Language): standard CWL-adjacent. Cromwell engine.
- **CWL** (Common Workflow Language): standard.

Scale-out: same pipeline runs em laptop, HPC, cloud sem rewrite.

### 2.10 Reproducibility

Paper claims devem ser reproducible. Patterns:
- **Versioning**: input data, code, dependencies, params.
- **Containers**: Docker / Singularity / Apptainer.
- **Conda environments** com lockfile.
- **Nix** pra reproducibility extrema.
- **DVC** (Data Version Control): versionar data large.
- **MLflow / Weights & Biases**: experiment tracking.
- **Containers inside workflow**: cada Nextflow step em container.

Anti-pattern: "rodei em meu laptop em 2019, não sei mais".

### 2.11 Cluster software: Singularity / Apptainer

Docker em HPC tem security issues (root). **Singularity** / Apptainer roda containers como user, integra com filesystem do cluster, suporta MPI dentro do container.

Imagem Singularity (.sif) = single file, easy to transport, signed.

### 2.12 Data scale: petabyte-class

Sequencing centers geram TB/dia. Strategies:
- **Object storage** (04-03, GCS, Azure Blob) > file storage.
- **Tiered storage** (hot/warm/cold).
- **Streaming pipelines**: process while reading.
- **Compression**: bgzip (BAM), CRAM (mais comprimido), Zstd.
- **Cloud-native formats**: Zarr, COG (Cloud-Optimized GeoTIFF), Cloud-Optimized HDF5.

I/O pattern matters. Random access vs sequential vs out-of-core.

### 2.13 Bioinformatics infrastructure: Galaxy, Bioconductor

- **Galaxy**: web platform pra bioinformatics, low-code workflows.
- **Bioconductor**: R ecosystem pra genomics, transcriptomics.
- **Bioconda**: conda channel pra bioinformatics tools.
- **Nextflow nf-core**: community pipelines.

R + Bioconductor permanece dominante em statistical genomics. Python e Julia crescendo.

### 2.14 Climate / atmospheric / earth science

Adjacente. Tools:
- **WRF** (Weather Research Forecasting), GEOS-Chem.
- **xarray + Dask** workflows.
- **Pangeo**: stack open-source pra big data climate.
- **NetCDF / Zarr** files.
- **Earth Engine** (Google).

Datasets: ERA5 (ECMWF reanalysis), MERRA-2 (NASA), ESA, NOAA.

### 2.15 Healthcare AI: HIPAA + FDA

Healthcare scientific software regulado:
- **HIPAA** (US): Protected Health Information.
- **HITECH**: enforcement.
- **GDPR / LGPD-saúde** (BR/EU): special category data.
- **FDA SaMD** (Software as a Medical Device): clearance via 510(k) ou de novo.
- **GxP** (Good Manufacturing/Lab/Clinical Practice): documentation rigor.

Engineer software in this space ≠ SaaS B2B. Audit trails imutáveis, validation, change control.

### 2.16 Papers como artefato técnico

Ciência publica em **paper**, não release notes. Implicações:
- Code linkado ao paper (Zenodo DOI, GitHub commit).
- Methods section detalhada.
- Reproducibility supplement.
- Citation pattern: cite tools, datasets.
- Pre-print culture (bioRxiv, arXiv).

Software engineer entrando em scientific lab deve ler **papers do projeto** primeiro. Code segue science, não vice-versa.

### 2.17 Carreira em scientific computing

Roles:
- **Research Software Engineer** (RSE): ponte entre cientistas e código.
- **Bioinformatician**: dual-trained.
- **HPC Engineer**: opera cluster.
- **MLE em domínio científico**.
- **DevOps em pesquisa**.

Pay frequentemente menor que tech BigCo (academia, gov labs, startups biotech). Mission-driven > comp.

Empresas relevantes: Recursion, Genomatic, Insitro, Tempus, Verily, 23andMe, Ginkgo Bioworks, Moderna IT side, Pfizer R&D IT, climate tech (Watershed, Patch), space (SpaceX, Planet).

### 2.18 Crossover com módulos do framework

- **Performance** (03-10, 03-14): scientific code performance é foco constante.
- **Distributed** (04-01, 04-09): HPC é scale.
- **AI/LLM** (04-10): training infra overlapa.
- **Streaming** (04-13): genomic pipelines são streaming.
- **Math** (01-15): obrigatório.
- **Cripto** (01-12): patient data, signing.

---

### 2.19 Bioinformatics + scientific computing 2026 — AlphaFold 3, ESM3, uv/pixi/Mojo, modern HPC

Bioinformatics em 2026 não é mais Python + BLAST + Bash. Stack mudou: structure prediction virou commodity (AF3), gerative protein design saiu do paper (ESM3), Python tooling foi reescrito em Rust (uv, Polars, pixi), e HPC ganhou novo competitor de hardware (AMD MI300X, Apple Silicon). Quem entra em bio/biotech/pharma/healthcare AI hoje precisa conhecer este stack — não o stack 2020.

**1. AlphaFold 3 (DeepMind + Isomorphic Labs, Mai 2024).** Successor a AF2 (2021, Nobel Prize Química 2024 pra Hassabis/Jumper). AF3 prediz estrutura de proteínas + DNA + RNA + ligands + ions — todo complexo biomolecular, não só monômeros proteicos. ~50% improvement em interaction prediction vs AF2 (Nature, Mai 2024, "Accurate structure prediction of biomolecular interactions with AlphaFold 3", Abramson et al). Server access free pra non-commercial via alphafoldserver.com (Isomorphic Labs hospeda). Model weights restricted — não-OSS, fonte de tensão na community científica que esperava liberação como AF2. Use case: docking, drug discovery exploratory, target validation. Limites: hallucination em complexos raros, conformational dynamics não modelado (snapshot estático), allosteric não capturado bem.

**2. ESM3 (EvolutionaryScale, Jun 2024).** Model gerativo (não predictive only) — design de proteínas novas com properties target. 98B params (largest variant). Open weights parcial (small/medium variants liberados, large restricted commercial). "Generative 1B-task language model for proteins" architecture — multimodal (sequence + structure + function tokens). Use cases: drug discovery (binders novos), enzyme design (catalytic activity engineered), synthetic biology. Paper: Hayes et al, Jun 2024, EvolutionaryScale. Research split de Meta — equipe ESM/ESMFold migrou pra EvolutionaryScale (commercial spinout).

**3. RoseTTAFold (Baker Lab, UW) e ESMFold (Meta).** Alternativas open-source.
- **RoseTTAFold All-Atom (Mar 2024)**: prediz estrutura de proteínas + small molecules + nucleic acids. Open weights. Baker laboratory ganhou Nobel Química 2024 junto com DeepMind.
- **ESMFold (Meta, 2022)**: single-sequence prediction, no MSA needed (faster mas slightly lower accuracy que AF2/AF3). Útil pra metagenomics em scale (milhões de seqs).
- **Boltz-1 (MIT, Out 2024)**: open-source AF3-like reimplementation, weights liberados — começa a fechar gap OSS vs DeepMind.

**4. Modern Python scientific tooling 2024-2026.**

- **uv (Astral, Fev 2024 → GA Set 2024).** Rust-based pip+pip-tools+venv replacement. **10-100x faster** em dependency resolution e install. Comandos: `uv pip install`, `uv venv`, `uv lock`, `uv sync`. Substitui pip/pipx/poetry stack inteiro em projetos novos. PEP 723 inline scripts suportado. Astral também produz ruff (linter) e ty (type checker beta). Default em new Python projects 2026. Source: astral.sh/uv.
- **pixi (Prefix, 2024).** Conda-compatible package manager em Rust — solver speed muito superior a conda em conda-forge envs. Use case: scientific computing com C/Fortran deps que não estão em PyPI (BLAS, MPI, GDAL, htslib). Lockfile cross-platform. Source: pixi.sh.
- **Mojo (Modular AI, 2023+, beta 2024-2026).** Python-superset designed pra ML perf — claims 35,000x faster que CPython em hot loops via MLIR backend. SDK preview público; commercial license pra full features. Use cases: ML kernels custom, scientific compute hot paths, vetorized numerical loops. Status 2026: beta, ecosystem nascente, breaking changes ainda frequentes. Não substitui Python ainda em prod — usar como acceleration layer pontual.
- **Polars (DataFrame Rust + Python bindings, 1.x mature 2024).** 10-100x faster que pandas em queries column-oriented. Lazy evaluation API similar (não drop-in). Default DataFrame em new analytics projects 2026. Streaming engine pra > RAM datasets.
- **JAX (Google).** Mature em ML research, autograd + XLA jit. `vmap`/`pmap`/`scan` primitivas funcionais. Default em ML scientific groups (AlphaFold, ESM são JAX/PyTorch hybrids). PyTorch ainda dominante em ML eng prod.
- **PyTorch 2.x compile (`torch.compile()`, 2023+).** Graph-mode compile via TorchDynamo + Inductor backend, 30-100% speedup em training/inference hot paths. Default em new training code 2026.

**5. Reproducibility 2026 stack.**

- **Pixi/uv lockfiles** — exact dep version pinning, cross-platform.
- **Nix flakes** — fully reproducible (kernel level down). Used em research-heavy labs com cultura functional/declarative.
- **Apptainer/Singularity** — HPC containers (Docker rootful incompatible com shared compute clusters academic). SIF format, OCI-compatible.
- **Workflow managers** — Nextflow (Java/Groovy DSL2), Snakemake (Python), Cromwell (WDL). Nextflow ainda dominante 2026 em bioinformatics pipelines (nf-core repository com 100+ pipelines validados).
- **DVC (Data Version Control)** — git for data. Less hype 2026 mas útil em projetos com large datasets versionados.
- **MLflow / Weights & Biases / Comet ML** — experiment tracking. W&B dominante em research; MLflow em enterprise.

**6. HPC + scientific cluster trends 2026.**
- **AMD MI300X/MI325X** disputando Nvidia H100/H200 em ML training. ROCm (AMD's CUDA equivalent) ganhou maturity — PyTorch/JAX support production-grade.
- **Apple Silicon (M3 Ultra, M4 Max/Pro)** ganhando em prototyping ML local. MLX framework (Apple) — autograd + lazy eval otimizado pra unified memory architecture.
- **ARM-based supercomputing** — Fugaku (Japão) ainda top 10. NVIDIA Grace Hopper (ARM CPU + H100 GPU) em new clusters.
- **Quantum computing** — IBM (Eagle/Heron), Google (Sycamore), AWS Braket. **Não production-ready 2026** — pra projetos toy/exploratory only. Quantum advantage demonstrado em problemas sintéticos, não em workloads práticos.

**7. Domain ML stacks específicos.**
- **Genomics**: variant calling com DeepVariant (Google, CNN-based). AlphaMissense (DeepMind 2023, Science) pra missense variant pathogenicity. Enformer pra gene expression.
- **Drug discovery**: Boltz-1 (MIT 2024) open-source AF3-like. ChemBERTa, Mol2vec pra molecular embeddings. RFdiffusion (Baker Lab) pra de novo protein binder design.
- **Climate**: Aurora (Microsoft Research, 2024) — foundation model atmospheric. GraphCast (DeepMind, 2023) — neural weather forecasting, beats ECMWF em medium-range. Pangu-Weather (Huawei).
- **Cryo-EM**: cryoSPARC, RELION 5 com ML denoising integrado.

**8. Anti-patterns numerados (10).**
1. Pip + pip-tools em 2026 — uv é 10-100x faster, drop-in mostly. Migrar.
2. Conda em projetos sem deps C/Fortran — pixi é faster + better resolver. Pip+uv vence se PyPI puro.
3. Pandas pra > 1M rows — Polars vence consistentemente, sintaxe próxima. Migrar hot paths.
4. PyTorch sem `torch.compile()` em training loops 2026 — perf gap real, 30-100% deixado na mesa.
5. AlphaFold 3 server submissions sem caching local — re-submit waste, rate limit alphafoldserver. Cachear PDB outputs.
6. ESM3 commercial use sem checar license terms — large variant é restricted, uso comercial sem licença viola TOS.
7. Reproducibility "depois" — sem lockfile/container desde dia 1, paper review pede e você não consegue reproduzir nem o próprio resultado 6 meses depois.
8. Mojo em production 2026 sem fallback Python — beta ecosystem, breaking changes a cada minor release.
9. Quantum computing como solver pra problema clássico — overkill, slow vs CPU em qualquer benchmark prático.
10. JAX sem `vmap`/`pmap` em batch operations — perde 10x speedup grátis, código fica imperative-loop style.

**Logística applied (1 paragraph).** Se Logística adiciona route ML model (predict ETA from histórico + traffic + weather), train pipeline em Polars (feature engineering em colunas, 100M rows histórico) + JAX em GCP TPUs (autograd + jit + vmap em batch). Inference em prod via PyTorch 2.x exportado ONNX + `.compile()`, deployed em Lambda/Cloud Run com cold start < 500ms. Dependency management dos scripts CI e training jobs via uv (lockfile committed, `uv sync` em cada CI run). Reprodutibilidade via Pixi lockfile (deps com BLAS/LAPACK) + Apptainer image versionada por commit SHA. Experiment tracking em W&B. Não usar Mojo (beta), não usar quantum (irrelevante).

**Cruza com:** `04-10 §2.x` (LLM tooling — overlap em ML inference patterns, serving), `04-13 §2.x` (streaming/batch — pipelines de dados scientific), `01-15 §2.x` (math foundations — linear algebra, calculus subjacente), `03-10 §2.x` (backend perf — Polars/uv/JIT relevância em APIs analytics), `05-04 §2.15` (papers reading list — AF3, ESM3 papers cited).

**Fontes inline.** Nature "Accurate structure prediction of biomolecular interactions with AlphaFold 3" (Abramson et al, Mai 2024); ESM3 paper (Hayes et al, EvolutionaryScale, Jun 2024); astral.sh/uv docs (GA Set 2024); pixi.sh docs (Prefix); Modular AI Mojo blog e SDK release notes; Polars 1.x release notes (Q3 2024); Aurora foundation model (Microsoft Research blog, 2024); GraphCast (DeepMind blog, 2023); RoseTTAFold All-Atom (Krishna et al, Science Mar 2024); Boltz-1 (Wohlwend et al, MIT, Out 2024); AlphaMissense (Cheng et al, Science 2023); Nobel Prize Chemistry 2024 announcement (Hassabis, Jumper, Baker).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar 4 file formats bioinformatics e quando cada.
- Diferenciar MPI e OpenMP.
- Justificar Slurm + queue priority em cluster.
- Diferenciar fp32, fp64, bf16; quando cada.
- Listar 4 ferramentas Python scientific stack.
- Justificar Nextflow vs Airflow em pipeline genomic.
- Justificar Singularity vs Docker em HPC.
- Listar 4 patterns de reproducibility.
- Diferenciar pandas vs Polars vs Dask em escala.
- Justificar paper como primary artifact em ciência.
- Listar 4 regulamentações healthcare.
- Identificar overlap com módulos do framework.

---

## 4. Desafio de Engenharia

**Pipeline genomic mínimo + reproducible + cloud-runnable**.

### Especificação

1. **Setup**: Nextflow + Conda/Mamba.
2. **Pipeline**: variant calling minimal.
   - Input: 1 sample FASTQ pair (download de SRA público, ex: NA12878 subset).
   - Steps: FastQC → Trim → BWA align → Samtools sort → GATK HaplotypeCaller → annotate.
   - Output: VCF + report.
3. **Containers**: cada process em Docker/Singularity image (use Biocontainers ou nf-core).
4. **Configs**:
   - `local`: rodar em laptop.
   - `slurm`: rodar em HPC (mock se sem cluster).
   - `aws`: AWS Batch (custo controlado).
5. **Reproducibility**:
   - Versionado: Nextflow version, container hashes, conda lockfile.
   - DVC ou checksum pra input data.
   - `RUN.md` documentando exact commands.
6. **Análise pequena** (notebook):
   - Carrega VCF resultante em pandas/Polars.
   - Plot variant distribution per chromosome.
   - Compare contra known set (ClinVar).
7. **Doc** `SCIENTIFIC.md`:
   - Choice de tools.
   - Data flow.
   - Como reproducir.
   - Limitations / not-production-validated disclaimer.

### Restrições

- Don't fake science. Use real public data (1KG, GIAB).
- Each step containerized.
- Pipeline rodável em outro machine sem mudança.
- README explica quem é e não é audiência (educational, not clinical).

### Threshold

- Pipeline runs end-to-end com sample dataset.
- Output VCF correto (compare contra reference).
- Docs reprodutíveis em outra máquina.

### Stretch

- **Compare aligners**: BWA vs minimap2 same dataset; metrics.
- **GPU acceleration**: NVIDIA Parabricks ou DeepVariant.
- **Scale**: process 10 samples em parallel.
- **Pre-print style report**: methods + results + figures markdown.
- **Climate dataset alternative**: ERA5 + xarray + Dask weather analysis.
- **Paper-with-code link**: implementação reproduzindo claim de paper recente.

---

## 5. Extensões e Conexões

- Liga com **01-15** (math): foundation obrigatória.
- Liga com **01-14** (CPU microarch): perf de scientific code.
- Liga com **02-09** (Postgres) → adapt pra AlphaGenome / arrays.
- Liga com **03-03** (K8s): Kubernetes + Slurm hybrid.
- Liga com **03-10** (backend perf): overlap.
- Liga com **03-13** (analytical DBs): warehouse + scientific data.
- Liga com **04-10** (AI/LLM): overlap em training infra.
- Liga com **04-13** (streaming/batch): pipelines.
- Liga com **CAPSTONE-amplitude** track D (Data/ML).

---

## 6. Referências

- **"Bioinformatics Data Skills"**: Vince Buffalo.
- **"Practical Computing for Biologists"**: Haddock, Dunn.
- **"Bioinformatics Algorithms: An Active Learning Approach"**: Compeau, Pevzner.
- **"Scientific Programming and Computer Architecture"**: Divakar Viswanath.
- **"Numerical Recipes"**: Press et al.
- **"High Performance Python"**: Gorelick, Ozsvald.
- **"Python for Data Analysis"**: Wes McKinney.
- **Nextflow docs** + **nf-core**.
- **Bioconductor**.
- **Pangeo project**: climate.
- **MIT OpenCourseware 6.0001 + 18.06 + biology**.
- **Coursera Bioinformatics Specialization** (UC San Diego).
- **arxiv-sanity, bioRxiv**: pre-prints.
- **Nature Methods**, **Bioinformatics journal**.
- **TACC, NERSC, Oak Ridge**: HPC center docs.
