---
module: ST09
title: Bioinformatics & Scientific Computing — HPC, Numerical Methods, Reproducibility
stage: staff
prereqs: [N15]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# ST09 — Bioinformatics & Scientific Computing (Optional)

## 1. Problema de Engenharia

Software engineer faz CRUD; cientista faz pesquisa; bioinformata combina. Genômica gera **petabytes** de dados; physics simulations rodam em supercomputers; ML training scale-out exige HPC. Engineering aqui é diferente: numerical correctness > tudo, reprodutibilidade obrigatória, paper-driven, menos ágil mais rigor.

Pra Logística, ST09 é **opcional, pra quem aspira eixo bio/biotech, pharma, healthcare AI, climate, genomics**, ou empresas como Genomatic, Recursion, 23andMe, Insitro, Ginkgo, climate tech. Domínio com complexidade técnica densa: pipelines genomic, file formats binários (BAM/VCF), GPU clusters, Python scientific stack, MPI, Slurm, reprodutibilidade de paper, HIPAA/LGPD-saúde.

Software engineer que vira "tech lead em laboratório" multiplica produtividade científica 5-10x. Saber programar é 30% do trabalho; entender o domínio (biologia, química, física computacional) é 70%. Este módulo dá **fundação suficiente** pra entrar — não pra fazer doutorado.

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
- **Parquet**: tabular columnar (P13 já cobriu).

Tools: `samtools`, `bcftools`, `bedtools` operam BAM/VCF/BED.

### 2.4 HPC: cluster computing

HPC cluster: 100s-1000s de nodes, interconnect alta-largura (InfiniBand, RoCE), shared filesystem (Lustre, GPFS).

Job scheduler:
- **Slurm** (Simple Linux Utility for Resource Management) — domina.
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
- **Conditioning** vs **stability** (N15).
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
- **Object storage** (S3, GCS, Azure Blob) > file storage.
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

- **Performance** (P10, P14): scientific code performance é foco constante.
- **Distributed** (S01, S09): HPC é scale.
- **AI/LLM** (S10): training infra overlapa.
- **Streaming** (S13): genomic pipelines são streaming.
- **Math** (N15): obrigatório.
- **Cripto** (N12): patient data, signing.

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

- Liga com **N15** (math): foundation obrigatória.
- Liga com **N14** (CPU microarch): perf de scientific code.
- Liga com **A09** (Postgres) → adapt pra AlphaGenome / arrays.
- Liga com **P03** (K8s): Kubernetes + Slurm hybrid.
- Liga com **P10** (backend perf): overlap.
- Liga com **P13** (analytical DBs): warehouse + scientific data.
- Liga com **S10** (AI/LLM): overlap em training infra.
- Liga com **S13** (streaming/batch): pipelines.
- Liga com **CAPSTONE-staff** track D (Data/ML).

---

## 6. Referências

- **"Bioinformatics Data Skills"** — Vince Buffalo.
- **"Practical Computing for Biologists"** — Haddock, Dunn.
- **"Bioinformatics Algorithms: An Active Learning Approach"** — Compeau, Pevzner.
- **"Scientific Programming and Computer Architecture"** — Divakar Viswanath.
- **"Numerical Recipes"** — Press et al.
- **"High Performance Python"** — Gorelick, Ozsvald.
- **"Python for Data Analysis"** — Wes McKinney.
- **Nextflow docs** + **nf-core**.
- **Bioconductor**.
- **Pangeo project** — climate.
- **MIT OpenCourseware 6.0001 + 18.06 + biology**.
- **Coursera Bioinformatics Specialization** (UC San Diego).
- **arxiv-sanity, bioRxiv** — pre-prints.
- **Nature Methods**, **Bioinformatics journal**.
- **TACC, NERSC, Oak Ridge** — HPC center docs.
