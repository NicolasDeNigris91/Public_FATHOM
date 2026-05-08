---
module: 01-02
title: Sistemas Operacionais, Processes, Threads, Scheduling, Syscalls, FDs
stage: fundamentos
prereqs: [01-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que uma syscall não é grátis (custa ~100-1000 ns) e o que runtimes como Node fazem pra mitigar?"
    options:
      - "Cada syscall força um context switch entre cores; runtimes pinam threads pra evitar."
      - "A CPU precisa transitar entre user mode e kernel mode (com salvamento de registradores e flush parcial de pipeline); runtimes batcham (writev em vez de várias write)."
      - "Syscalls disparam page faults, e o OS precisa carregar páginas do disco; runtimes pré-carregam tudo na inicialização."
      - "Cada syscall reescreve a page table; runtimes fazem mmap upfront."
    correct: 1
    explanation: "A transição user↔kernel mode salva registradores, troca a stack, invalida parte do pipeline. Por isso batch syscalls (writev, sendmmsg, io_uring) ganham tanto — uma transição amortiza N operações."
  - q: "Qual destas NÃO é uma diferença real entre processo e thread no Linux?"
    options:
      - "Threads do mesmo processo compartilham heap; processos têm espaços de endereço separados."
      - "Threads têm stacks independentes; processos têm stacks separadas por definição."
      - "Threads são escalonadas pelo runtime do usuário, processos pelo kernel."
      - "fork() cria processo (cópia do espaço de endereços via COW); pthread_create cria thread (compartilha tudo)."
    correct: 2
    explanation: "Em Linux, threads são escalonadas pelo MESMO scheduler do kernel que escalona processos — são 'lightweight processes'. Threads N:1 escalonadas em userspace existiram (green threads) mas não são o modelo padrão; pthreads são 1:1 com kernel threads."
  - q: "O Linux 6.6 substituiu CFS por EEVDF como scheduler default não-realtime. Qual é a vantagem prática principal?"
    options:
      - "EEVDF é mais rápido em throughput puro (~50% melhor benchmark)."
      - "EEVDF expressa slice/lag por entidade, reduzindo tail latency em workloads com bursts pequenos (web servers)."
      - "EEVDF substitui SCHED_DEADLINE pra workloads real-time."
      - "EEVDF elimina context switches usando hyperthreading."
    correct: 1
    explanation: "CFS minimizava unfairness médio mas dependia de heurísticas pra interatividade. EEVDF expõe slice e deadline virtuais explicitamente, reduzindo p99 latency em ~20% em web servers (Phoronix). Não muda throughput agregado significativamente."
  - q: "Após fork() em Linux, o que acontece com os file descriptors do processo pai?"
    options:
      - "O filho começa com tabela de FDs vazia; precisa reabrir tudo."
      - "O filho herda CÓPIA da tabela apontando pras MESMAS entries do kernel — pai e filho compartilham posição em arquivos abertos."
      - "Os FDs do pai são fechados automaticamente; só o filho os mantém."
      - "Cada FD é duplicado (file descriptions independentes); writes em um não afetam o outro."
    correct: 1
    explanation: "fork() duplica a fd-table mas as entries apontam pra mesma file description (offset, flags) no kernel. Por isso pai e filho podem 'corromper' arquivos compartilhados se ambos escreverem sem coordenação — clássico bug de log files compartilhados após fork sem reabrir."
  - q: "Você tem um servidor de banco trusted que faz I/O massivo e batched. epoll vs io_uring — qual a decisão certa em 2026 e por quê?"
    options:
      - "epoll sempre, porque io_uring foi descontinuado por causa dos CVEs."
      - "io_uring com SQPOLL pinned em CPU dedicada — ganho de 30-50% em random I/O e o threat model permite (ambiente trusted, não multi-tenant)."
      - "io_uring sempre, mesmo em containers Docker default — ele é mais rápido."
      - "Nenhum dos dois; usar AIO (POSIX aio_*) que é o padrão moderno."
    correct: 1
    explanation: "io_uring vence claramente em I/O massivo, mas teve CVEs de sandbox-escape (Docker default seccomp e Chrome OS desabilitaram). A decisão correta depende do threat model: backend dedicado/trusted = io_uring com SQPOLL pinned; container multi-tenant = epoll por segurança."
---

# 01-02, Sistemas Operacionais

## 1. Problema de Engenharia

O sistema operacional (SO) é o software que **multiplexa** a CPU, a memória, o disco e a rede entre múltiplos programas que pensam que cada um tem a máquina inteira. Sem entender o SO, conceitos como `event loop`, `worker threads`, `epoll`, `process.fork`, `permission denied`, `EAGAIN`, `SIGTERM`, `pipe`, `mount` parecem mágica.

Exemplos onde desconhecimento custa caro:
- Sua app Node trava sob carga alta. Causa real: você está abrindo um **file descriptor** por request e atingiu o `ulimit -n`. Você não sabia que sockets, files, pipes, todos são FDs e há limite por processo.
- Você cria 1000 threads pra "paralelizar" e o servidor fica mais lento. Causa: contention de scheduler + cache thrashing. Você não tinha modelo mental de **scheduler**, **context switch**, **CPU affinity**.
- Sua aplicação trava em produção sem erro óbvio. Causa: deadlock entre dois processos com `flock` no mesmo arquivo. Você não conhecia file locks.
- Você lê arquivo gigante com `fs.readFile` e o Node mata o processo com OOM. Você não sabia distinguir leitura síncrona/buffered vs streaming.

Este módulo te dá o vocabulário e os mecanismos do SO que sustentam **toda** a stack de runtime (Node, Postgres, Redis, Docker, Kubernetes).

---

## 2. Teoria Hard

### 2.1 O que é um SO, kernel vs user space

O kernel é um programa especial que roda em **modo privilegiado** da CPU. Ele tem acesso direto a hardware (CPU, RAM, disco, rede). Aplicações rodam em **user space**, em modo não-privilegiado, e **não** podem tocar hardware diretamente.

```
┌────────────────────────────────────────┐
│  User space (apps, libs, runtime)      │
│  Node, postgres, redis, etc            │
└────────────────────┬───────────────────┘
                     │ system calls
                     ▼
┌────────────────────────────────────────┐
│  Kernel (Linux, BSD, etc)              │
│  Scheduler, VM, FS, Network, Drivers   │
└────────────────────┬───────────────────┘
                     │
                     ▼
                Hardware
```

Quando uma app precisa fazer algo privilegiado (ler arquivo, abrir socket), ela faz uma **system call** (`syscall`), uma chamada que passa controle pro kernel via interrupção de software. Após o kernel executar, retorna ao user space.

**Custo de syscall:** ~100-1000 ns dependendo da operação. Não é grátis. Por isso runtimes como Node fazem batching (uma syscall `writev` em vez de várias `write`).

### 2.2 Processo

Um **processo** é uma instância em execução de um programa. Cada processo tem:
- **PID** (process ID, número único do kernel)
- **Espaço de endereços virtual** próprio (text, data, heap, stack, ver 01-01)
- **Um ou mais threads** de execução
- **File descriptors** abertos
- **UID/GID** (usuário/grupo dono do processo)
- **Working directory**, **environment variables**, **command line args**
- **Estado**: running, sleeping (waiting on I/O), zombie (terminou mas pai não fez `wait`), stopped

**Criação de processo (Linux):** `fork()` cria uma cópia exata do processo atual. O filho recebe um PID novo, herda FDs do pai, e continua a execução do mesmo ponto do código. Geralmente o filho então faz `exec()` pra trocar o programa em execução por outro (assim que `bash` roda comandos).

**Process tree:** Linux tem `init` (PID 1) como ancestral de todos. `pstree` mostra a árvore.

**Zombie process:** quando processo termina, seu exit status fica esperando o pai chamar `wait()`. Se o pai nunca chama, o filho fica como **zombie** (consome só uma entrada na process table). Se o pai morre antes do filho, o filho é "adotado" por PID 1.

### 2.3 Thread

Uma **thread** é uma sequência de execução **dentro** de um processo. Threads do mesmo processo:
- Compartilham espaço de endereços (heap, código)
- Têm **stacks separadas**
- Têm registradores próprios
- São escalonadas pelo SO (em Linux, threads são "Lightweight Processes", kernel não distingue muito de processo)

**Vantagem:** comunicação rápida via memória compartilhada.
**Custo:** sincronização (mutex, semáforos, atomics) é difícil. Race conditions e deadlocks são fáceis de introduzir.

**Em Node:** o seu código JS roda em **uma única thread** (a main thread). Mas o Node usa **thread pool** internamente (`libuv`) pra I/O bloqueante (filesystem, DNS, crypto). Worker Threads (módulo `node:worker_threads`) permitem JS paralelo.

### 2.4 Scheduling

O kernel **escalona** threads/processos sobre os cores físicos (CPUs). Componentes:

- **Run queue**: lista de threads prontas pra rodar (em Linux, há uma run queue por core).
- **Scheduler**: decide qual thread roda em cada core, por quanto tempo (time slice / quantum, tipicamente 1-100ms).
- **Context switch**: salvar registradores e estado da thread atual, restaurar os da próxima. Custa ~1-10 µs + invalidação parcial de cache.

**Linux scheduler atual: CFS (Completely Fair Scheduler).** Mantém uma red-black tree de threads runnable, ordenada por **vruntime** (tempo virtual de CPU acumulado). Sempre escolhe a thread com menor vruntime, daí "fair".

**Estados de thread:**
- **Running** (executando)
- **Runnable** (na run queue, pronta)
- **Sleeping/Blocked** (esperando algo: I/O, mutex, sleep)
- **Zombie** (processo)

Quando uma thread faz syscall bloqueante (`read` num socket sem dado), o kernel a coloca em `Sleeping`. Quando o evento ocorre (dado chega), thread vai pra `Runnable`.

**Implicações práticas:**
- **Mais threads que cores ≠ mais paralelismo.** Apenas N threads rodam simultaneamente em N cores. As outras esperam.
- **Context switching tem custo.** 1000s de threads concorrentes em I/O bound podem funcionar, mas em CPU-bound geralmente é melhor ~1 thread por core.
- **CPU affinity** (`taskset`, `sched_setaffinity`) trava thread em cores específicos, útil pra cache locality em workloads críticas.

### 2.4.1 Schedulers modernos: CFS, EEVDF, Windows, BSD

CFS reinou de 2007 até 2024. A partir do **Linux 6.6** (out/2023), o kernel mainline adotou **EEVDF** (Earliest Eligible Virtual Deadline First) substituindo CFS pra workloads não-realtime. Mudança discreta pra usuário comum, relevante pra quem ajusta latência fina.

**EEVDF em uma frase:** cada thread recebe um **deadline virtual**; scheduler sempre roda quem está "elegível" (acumulou direito) com menor deadline. CFS minimizava unfairness entre quem rodou; EEVDF agrega **slice/lag** explícitos, mais fácil raciocinar sobre latência tail.

**Por que mudou:**
- CFS dependia de heurísticas (`sched_min_granularity_ns`, etc.) pra balancear interatividade vs throughput. EEVDF expressa o trade-off via `slice` por entidade.
- CFS tinha bugs documentados em workloads com burst pequeno (web servers acordando rápido). EEVDF reduz tail latency em ~20% em benchmarks (Phoronix 2024).

**Outras classes de scheduler em Linux** (não substituídas por EEVDF):
- **`SCHED_FIFO`/`SCHED_RR`** (real-time, prioridade fixa). Usada em audio, controle industrial. Sem timesharing, pode ser starver.
- **`SCHED_DEADLINE`** (EDF, Earliest Deadline First). Real-time hard. Você declara `(runtime, deadline, period)` e kernel admite só se cabe.
- **`SCHED_IDLE`** (background, prioridade mais baixa que normal).
- **`chrt`** muda a classe de um processo.

**Windows scheduler:** **multilevel feedback queue** com 32 prioridades. Foreground apps recebem boost (UI responsivo), I/O-bound idem. Não é "fair" no sentido CFS, é "responsivo". A partir do **Windows 11**, há **Thread Director** que coopera com Intel hybrid CPUs (P-cores + E-cores) pra colocar work certo no core certo.

**macOS/BSD scheduler:** **Mach** + **BSD scheduler layer**. Threads têm `quality of service class` (`QOS_CLASS_USER_INTERACTIVE`, `..._USER_INITIATED`, `..._UTILITY`, `..._BACKGROUND`). Apple Silicon tem heterogeneous cores (P/E), scheduler decide energy/perf.

**Implicações práticas pra Senior:**
- **Latency-sensitive workload em Linux**: considere `SCHED_FIFO` ou `SCHED_DEADLINE` em vez de só `nice`. Cuidado com starvation.
- **Container scheduling**: containers herdam scheduler do host. cgroups v2 com `cpu.weight` é o que você ajusta em K8s `resources.requests.cpu`.
- **Hybrid CPUs (Intel 12th+, Apple M-series)**: `taskset` em P-core/E-core importa. Background scrapers em E-core, hot path em P-core.
- **Não adivinhe**: use `perf sched`, `bpftrace` (eBPF), ou `schedviz` pra ver decisões reais do scheduler.

### 2.5 System calls e standard library

Aplicação não chama syscalls diretamente, chama wrappers da **libc** (em C, libc é a implementação que faz a syscall). Em outras linguagens, há equivalente (Node usa libuv que chama syscalls).

**Syscalls clássicas** que você precisa saber existir:

| Categoria | Syscalls | O que faz |
|-----------|----------|-----------|
| Process | `fork`, `execve`, `wait`, `exit`, `getpid` | Criar/finalizar processos |
| Memory | `mmap`, `munmap`, `brk`, `mprotect` | Alocar memória virtual |
| File I/O | `open`, `read`, `write`, `close`, `lseek`, `stat` | Ler/escrever arquivos |
| Filesystem | `mkdir`, `unlink`, `rename`, `chmod`, `chown` | Manipular FS |
| Network | `socket`, `bind`, `listen`, `accept`, `connect`, `send`, `recv` | TCP/UDP |
| I/O multiplex | `select`, `poll`, `epoll_*`, `kqueue` (BSD), `IOCP` (Windows) | Gerenciar muitos FDs |
| Signals | `kill`, `signal`, `sigaction` | Inter-process signaling |
| Time | `clock_gettime`, `nanosleep` | Relógio, sleep |
| IPC | `pipe`, `socketpair`, `shmget`, `mq_open` | Inter-process communication |

Use `strace -f` em qualquer processo Linux pra ver as syscalls que ele faz. **Faça isso uma vez com `node script.js`**: você vai entender o que o runtime está realmente fazendo.

### 2.6 File descriptors

Tudo no Linux é **arquivo**: ou pelo menos é exposto via API de arquivo. Sockets, pipes, terminais, arquivos regulares, dispositivos, tudo é representado por um **file descriptor (FD)**: um inteiro pequeno que indexa uma tabela por processo.

FDs especiais:
- **0** = stdin
- **1** = stdout
- **2** = stderr

Quando você abre arquivo (`open`), o kernel retorna o FD numericamente menor disponível. Quando faz `socket`, idem. Quando faz `pipe`, retorna **dois** FDs (read end + write end).

**Limite de FDs por processo:** `ulimit -n` (default 1024 ou 65536, varia). Servidores de alta concorrência aumentam pra milhões. Cada socket aberto consome 1 FD.

**Closing FDs** é responsabilidade do processo. Não fechar = leak. Use **try/finally** (em qualquer linguagem) ou RAII (C++/Rust).

**Tabela de FDs após fork:** o filho herda **cópia da tabela**. Os mesmos FDs apontam pras mesmas entries no kernel, então pai e filho compartilham posição em arquivos abertos!

### 2.7 I/O bloqueante vs não-bloqueante vs assíncrono

Imagine `read(fd, buf, 1024)`:

- **Bloqueante (default):** se não há dado disponível, a thread fica em `Sleep` até dado chegar. Simples, mas escala mal, uma thread por conexão pra um servidor web é caro.
- **Não-bloqueante (`O_NONBLOCK`):** se não há dado, retorna **imediatamente** com `EAGAIN`/`EWOULDBLOCK`. Aplicação tem que pollar/voltar depois. Permite uma thread gerenciar muitos FDs.
- **I/O multiplex (`select`/`poll`/`epoll`):** thread bloqueia em **muitos FDs ao mesmo tempo**, acorda quando qualquer um tem dado pronto. **`epoll` (Linux)** é eficiente até 100k+ conexões, usado pelo libuv (Node), nginx, redis.
- **AIO (assíncrono real, Linux `io_uring`):** kernel faz a operação em background, acorda app quando termina. Mais eficiente mas mais complexo.

**Por que isso importa pra Node:**
- O Node não bloqueia a thread principal em I/O. Usa `epoll`/`kqueue`/`IOCP` (via libuv) pra esperar muitos FDs.
- Operações de **filesystem** em Linux ainda são feitas com **thread pool** (libuv) porque a kernel API histórica é bloqueante. Por isso fs.* tem variantes blocking/non-blocking.

### 2.8 Signals

**Signal** é uma notificação assíncrona enviada pelo kernel a um processo. Lista clássica:
- `SIGINT` (Ctrl+C), interrupção
- `SIGTERM`, pedido educado pra terminar (default `kill <pid>`)
- `SIGKILL` (9), terminação forçada, não captável
- `SIGSEGV`, segmentation fault (acesso a memória inválida)
- `SIGCHLD`, filho terminou
- `SIGPIPE`, escreveu em pipe sem leitor
- `SIGUSR1`, `SIGUSR2`, definidos pelo usuário

Aplicações **podem capturar** signals (exceto `SIGKILL` e `SIGSTOP`) com `signal()` ou `sigaction()`. Em Node: `process.on('SIGTERM', handler)`.

**Padrão importante**: graceful shutdown. Captura `SIGTERM`, fecha conexões abertas, espera in-flight requests terminarem, depois encerra. Kubernetes envia `SIGTERM`, espera `terminationGracePeriodSeconds`, depois `SIGKILL`.

### 2.9 IPC, Inter-Process Communication

Mecanismos pra processos se comunicarem:
- **Pipes (`|` no shell)**: stream unidirecional, criada com `pipe()` ou ao spawnar com `popen`. Usado em Node via `child_process`.
- **Named pipes (FIFOs)**: pipes acessíveis por nome no FS.
- **Unix domain sockets**: like sockets TCP/UDP mas locais. Mais rápido (não passa pela network stack). Usado em Docker (socket `/var/run/docker.sock`), Postgres (default usa Unix socket pra conexões locais).
- **Shared memory (`shmget`, `mmap` com `MAP_SHARED`)**: regiões de memória mapeadas em múltiplos processos. Mais rápido, mas exige sincronização manual.
- **Message queues** (POSIX, System V).
- **Sockets de rede** (TCP/UDP loopback).

### 2.10 Permissões e usuários

Cada arquivo tem **owner (UID)**, **group (GID)** e bits de permissão:
- **Read (r), Write (w), Execute (x)** pra cada um de: owner, group, others.
- Notação numérica: `chmod 755 file` = `rwxr-xr-x`.

Bits especiais:
- **setuid (4xxx)**: ao executar, processo roda com UID do owner do arquivo (não do invocador). É como `sudo` funciona internamente.
- **setgid (2xxx)**: idem pra grupo. Em diretórios, novos arquivos herdam grupo.
- **sticky (1xxx)**: em diretórios (ex: `/tmp`), só owner pode deletar arquivos.

**Princípio de menor privilégio:** rode aplicações com usuário não-root (Docker `USER appuser`). Capabilities Linux (CAP_NET_BIND_SERVICE, etc.) permitem dar permissões granulares sem dar root inteiro.

---

### 2.11 Linux moderno 2026 — io_uring + cgroups v2 PSI + eBPF observability

Linux 2026 não é o Linux 2015. Três tecnologias mudaram o jogo: **io_uring** (async I/O sem syscalls em hot path), **cgroups v2 + PSI** (pressure-aware resource control), **eBPF** (kernel programável em userspace, sem rebuild). Quem ainda raciocina em `epoll + thread-pool + cgroups v1 + iptables` opera com vocabulário deprecated.

**1. io_uring — async I/O moderno (Linux 5.1+, mainstream desde 5.10 LTS, hardened em 6.1+ LTS)**

Submission Queue (SQ) + Completion Queue (CQ) **shared** entre kernel e userspace via `mmap`. Userspace escreve SQE (Submission Queue Entry), kernel processa, escreve CQE. Com `IORING_SETUP_SQPOLL`, kernel thread polla SQ — **zero syscalls em hot path**. Ganho real: PostgreSQL 17 (Set 2024) introduziu io_uring backend reportando **30-50% throughput improvement em random I/O** (PostgreSQL 17 release notes). MySQL InnoDB, ScyllaDB, libuv (Node.js 20+ opcional) também suportam.

```c
// io_uring read+write batched (liburing wrapper)
struct io_uring ring;
io_uring_queue_init(32, &ring, 0);

struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd_in, buf, BUF_SZ, 0);
sqe->flags |= IOSQE_IO_LINK;  // chain próximo

sqe = io_uring_get_sqe(&ring);
io_uring_prep_write(sqe, fd_out, buf, BUF_SZ, 0);

io_uring_submit(&ring);  // 1 syscall (zero com SQPOLL)
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
io_uring_cqe_seen(&ring, cqe);
```

**Restrição crítica:** io_uring teve **4+ CVEs sandbox-escape em 2022-2023**. Google Security blog (Jul 2023) anunciou que **Chrome OS, Docker default seccomp, e Android 15 desabilitaram io_uring no syscall filter por padrão**. Em produção: avalie threat model — perf gain vs attack surface. Em container multi-tenant não-confiável, **deixe desabilitado**. Em backend trusted (database, file server dedicado), habilite.

**2. epoll vs io_uring — decision matrix 2026**

| Critério | epoll vence | io_uring vence |
|---|---|---|
| Simplicidade | sim (libev/libuv maduras) | curva ainda íngreme |
| Threat model restrito | sim (battle-tested) | seccomp issues |
| I/O massivo paralelo | não (1 syscall por op) | sim (batch + zero-copy) |
| Registered buffers / fixed FDs | n/a | sim (3-5x speedup) |
| Sandboxed/multi-tenant | sim | bloqueado por seccomp |

Default conservador: **epoll**. Default agressivo perf: **io_uring** com SQPOLL pinned em CPU dedicada.

**3. cgroups v2 (default em Ubuntu 22.04+, Debian 12+, RHEL 9+, Fedora 31+)**

V1 tinha múltiplas hierarchies (cpu, memory, blkio cada uma sua árvore) — bug-prone. V2 é **single unified hierarchy**, controllers principais: `cpu`, `memory`, `io`, `pids`, `cpuset`. **PSI (Pressure Stall Information)** Linux 4.20+ mede *quanto tempo* processos esperam por CPU/memory/io — métrica direta de saturação, exposta em `/proc/pressure/{cpu,memory,io}` e per-cgroup.

`oomd` (Facebook) e `systemd-oomd` (default Ubuntu 22.04+) usam thresholds PSI pra **OOM-kill antes** do kernel OOM (que é catastrófico, freezeia o sistema enquanto decide).

```ini
# /etc/systemd/system/dispatch.service
[Service]
ExecStart=/usr/bin/dispatch-worker
MemoryHigh=512M           # throttle ANTES de hard limit
MemoryMax=768M            # hard limit (OOM-kill)
IOWeight=200              # 1-10000, default 100
CPUWeight=150             # CPU share relativo
TasksMax=512              # pids.max
```

**4. eBPF observability stack 2026**

Kernel programável: você carrega bytecode verificado em runtime, attach a tracepoints/kprobes/uprobes/XDP/TC. Sem rebuild, sem reboot, sem kernel module.

- **Tracing:** `bpftrace` (one-liners, like `awk` pra kernel), Tracee (Aqua Security, runtime security), Pixie (NewRelic, no-instrumentation k8s).
- **Networking:** **Cilium** (CNI + service mesh, substitui iptables/IPVS), Katran (Facebook L4 LB).
- **Security:** **Falco** (CNCF graduated), Tetragon (Cilium runtime enforcement, LSM hooks).
- **Performance:** bcc-tools (`opensnoop`, `execsnoop`, `tcpconnect`), Parca (continuous profiling), Pyroscope (Grafana).

Adoção real: **Cilium em Google GKE Dataplane V2, AWS EKS auto-attach, Microsoft AKS "Azure CNI Powered by Cilium" GA Q4 2024** (CNCF Cilium release notes). Cilium em GKE substitui kube-proxy → latência p99 service-to-service cai 30-40%.

**5. eBPF programs — exemplos 2026**

```bash
# Trace todo execve syscall (ver o que está sendo executado)
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_execve {
  printf("%s -> %s\n", comm, str(args->filename));
}'

# Latência de open() por processo
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @start[tid] = nsecs; }
                  tracepoint:syscalls:sys_exit_openat /@start[tid]/ {
                    @us[comm] = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'
```

**Stack moderna: CO-RE (Compile Once, Run Everywhere) + libbpf.** Substitui BCC (older, precisava kernel headers + clang em runtime — bloated, lento). Requer kernel 5.4+ pra CO-RE básico, 5.8+ pra full features (LSM hooks, ring buffer, trampolines).

**6. PSI-driven autoscaling em Kubernetes 2026**

PSI exposto em pods via cAdvisor (`container_pressure_memory_full_seconds_total`). **KEDA** (CNCF graduated) + Prometheus adapter escala baseado em pressure metrics — direto, não em CPU% (proxy ruim).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: dispatch-worker }
spec:
  scaleTargetRef: { name: dispatch-worker }
  minReplicaCount: 2
  maxReplicaCount: 50
  cooldownPeriod: 180     # evita flapping
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      threshold: '0.30'   # 30% memory pressure full
      query: |
        avg(rate(container_pressure_memory_full_seconds_total{pod=~"dispatch-.*"}[2m]))
```

Adoção real: **Spotify reportou 25% cost reduction em batch workers** migrando de CPU-based HPA pra PSI-aware HPA (Spotify engineering blog 2024).

**7. journald — observability nativa Linux 2026**

`systemd-journald` é o default em Ubuntu 22.04+, RHEL 8+, Debian 12+. Logs binários estruturados (campos indexados: `_PID`, `_UID`, `_TRANSPORT=audit`, `_SYSTEMD_UNIT`), persistência opt-in via `Storage=persistent` em `/etc/systemd/journald.conf` (cria `/var/log/journal/`). Forward pra Grafana Loki / Datadog via `systemd-journal-upload` ou Vector. `journalctl -u dispatch.service -f --since "10 min ago"` substitui `tail -F /var/log/syslog | grep`.

**Anti-patterns 2026**

1. **io_uring habilitado em sandbox/container multi-tenant sem auditar threat model** — você ganha 30% perf e abre CVE class de sandbox-escape.
2. **epoll + thread-pool em hot path I/O massivo** quando io_uring vence — legacy code que merece refactor, não cargo-cult.
3. **cgroups v1 ainda em produção em 2026** — deprecated upstream, sem PSI, sem unified hierarchy. Migra (`systemd.unified_cgroup_hierarchy=1`).
4. **BCC instalado sem libbpf+CO-RE** — bloated (clang em runtime), lento, kernel-headers dependency. Use `bpftrace` ou libbpf-based tools.
5. **bpftrace em produção sem rate-limit nas probes** — probe overhead em syscall hot path pode shred CPU. Use `@map = lhist()` com sampling, não `printf` em todo evento.
6. **Falco/Tetragon sem audit ruleset apropriado pro seu workload** — alerta-storm, time ignora, ignora alerta real. Tune as rules antes de promover pra prod.
7. **systemd journald sem `Storage=persistent`** — logs perdidos a cada reboot, debugging post-mortem impossível.
8. **PSI autoscaling sem cooldown/stabilization window** — flapping (scale up → pressure cai → scale down → pressure sobe → loop), custa mais que não escalar.
9. **Cilium em produção sem Hubble enabled** — você ganha o dataplane mas cega a observabilidade L3-L7. Habilita Hubble + Hubble UI desde dia 1.
10. **io_uring SQPOLL kthread sem CPU pinning** — kernel thread compete por CPU com workload, performance fica pior que epoll. `IORING_SETUP_SQ_AFF` + `sq_thread_cpu`.

**Logística applied.** O courier-tracking ingestor usa **io_uring registered buffers** pra ler GPS UDP packets em batch (zero-copy, fixed buffers pré-alocados). O dispatch service roda em systemd unit com `MemoryHigh=512M IOWeight=200 CPUWeight=200` — isolado de batch jobs noturnos (`MemoryHigh=2G IOWeight=50`). `bpftrace` em produção monitora `execve` syscalls do dispatch process — qualquer spawn inesperado dispara alert (Falco rule). Cilium CNI substituiu kube-proxy no cluster: latência p99 dispatch-to-postgres caiu de 8ms pra 4.5ms. Hubble visualiza fluxo dispatch → backend em tempo real.

**Cruza com.** [`01-02 §2.10`](#210-permissões-e-usuários) (capabilities + seccomp são complementos a cgroups — defense in depth), [`01-03`](./01-03-networking-protocols.md) (Cilium opera em camada XDP/TC do kernel, abaixo do socket), [`03-02`](../03-execucao/03-02-docker-containerizacao.md) (Docker runtime respeita cgroups; entender v2 é entender resource limits de containers), [`03-03`](../03-execucao/03-03-kubernetes-orquestracao.md) (cgroups v2 + PSI dirigem HPA/VPA modernos), [`03-07`](../03-execucao/03-07-observability-monitoring.md) (eBPF + journald + RUM são as três camadas de observability 2026).

**Fontes inline.** PostgreSQL 17 release notes (Set 2024); Google Security blog "io_uring CVEs and our response" (Jul 2023); Spotify engineering blog "PSI-aware HPA" (2024); CNCF Cilium release notes "Azure CNI Powered by Cilium GA" (Q4 2024); Linux kernel docs `Documentation/admin-guide/cgroup-v2.rst` e `Documentation/accounting/psi.rst`.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Explicar a diferença entre **kernel mode** e **user mode**, e o que é uma **system call**.
- [ ] Distinguir **processo** vs **thread**, listando 4 diferenças concretas (memória, FDs, custo de criação, paralelismo).
- [ ] Desenhar o ciclo de vida de uma thread (Running → Runnable → Sleeping → Runnable...).
- [ ] Explicar **CFS** em uma frase e dizer **por que EEVDF substituiu** em Linux 6.6+ (o que muda em latência tail).
- [ ] Diferenciar `SCHED_OTHER` / `SCHED_FIFO` / `SCHED_RR` / `SCHED_DEADLINE` em Linux. Quando usar cada um.
- [ ] Explicar como hybrid CPUs (P/E cores em Intel 12+ e Apple M-series) influenciam decisões de scheduling.
- [ ] Listar pelo menos 8 syscalls e dizer pra que servem.
- [ ] Explicar **file descriptor** e por que sockets, files e pipes usam o mesmo conceito.
- [ ] Distinguir **bloqueante**, **não-bloqueante**, **multiplex (epoll)**, e **AIO** com casos onde cada um se aplica.
- [ ] Desenhar o que acontece com FDs após `fork()`.
- [ ] Listar pelo menos 6 signals e quais são captáveis.
- [ ] Dar um caso de **deadlock** entre dois processos via file lock.
- [ ] Dar um caso onde **shared memory** é a escolha certa, e outro onde **Unix domain socket** é melhor.
- [ ] Explicar **setuid** e dar o caso de uso clássico (`/usr/bin/passwd`).

---

## 4. Desafio de Engenharia

**Implementar um mini-shell Unix em TypeScript.**

### Especificação

Construa um REPL que aceite comandos e execute como um shell (bash-like). Suporte:

1. **Comandos externos**: `ls`, `cat foo.txt`, `node script.js`, etc. Use `child_process.spawn` ou equivalente.
2. **Pipes**: `cat foo.txt | grep bar | wc -l`, encadeamento de processos.
3. **Redirecionamento**: `ls > out.txt`, `cat < in.txt`, `command 2> err.log`.
4. **Background jobs**: `sleep 10 &`, não bloqueia o prompt.
5. **Built-ins**: `cd <path>`, `exit`, `pwd`, `export VAR=value`.
6. **Sinais**: Ctrl+C deve enviar `SIGINT` ao processo em foreground sem matar o shell.
7. **Tratamento de zombies**: shell deve fazer `wait` em filhos terminados.

### Restrições

- **Não use libs de shell parsing** (`shelljs`, `execa` com complex modes). Apenas `node:child_process`, `node:readline`, e Node API base.
- Você pode usar libs apenas pra **parsing do input** (ex: `yargs-parser`), mas o controle de processos tem que ser seu.

### Threshold

- Suporta corretamente pipes de 3 ou mais comandos sem perder dados.
- Background jobs continuam após o foreground terminar.
- Ctrl+C não mata o shell em hipótese nenhuma.
- Documentar (no README) **quais syscalls** são feitas em cada feature (rode `strace` no shell e analise).

### Stretch goals

- **Job control completo**: `jobs`, `fg`, `bg`, `kill %1`.
- **History persistente** (arquivo `~/.myshell_history`).
- **Tab completion** de paths.

---

## 5. Extensões e Conexões

- **Conecta com [01-01, Computation Model](01-01-computation-model.md):** virtual memory, page tables, mmap são features do kernel. Stack/heap layout é mantido pelo kernel ao iniciar processo.
- **Conecta com [01-03, Networking](01-03-networking.md):** sockets são FDs. `epoll` esperando em N sockets é o **fundamento** do servidor Node.
- **Conecta com [01-09, Git Internals](01-09-git-internals.md):** Git usa file locks (`*.lock` files) pra serializar escritas no `.git/`. Falhas em fork+exec são origem de "git stuck on lock" issues.
- **Conecta com [01-10, Unix CLI & Bash](01-10-unix-cli-bash.md):** o que você usa no shell é orquestração de processos via syscalls.
- **Conecta com [02-07, Node.js Internals](../02-plataforma/02-07-nodejs-internals.md):** event loop do Node é construído sobre `epoll` (Linux), `kqueue` (BSD/macOS), `IOCP` (Windows). Worker threads são threads kernel.
- **Conecta com [03-02, Docker](../03-producao/03-02-docker.md):** containers são processos com **namespaces** (PID, net, mount, IPC, UTS, user) e **cgroups** isolados, features do kernel Linux.
- **Conecta com [03-03, Kubernetes](../03-producao/03-03-kubernetes.md):** pods são grupos de containers compartilhando network namespace.

### Ferramentas satélites

- **`strace`**: trace de syscalls de um processo.
- **`ltrace`**: trace de chamadas a libraries (libc).
- **`lsof -p <pid>`**: lista todos FDs abertos por um processo.
- **`htop`, `top`**: estado de processos, threads, scheduling.
- **`ps -ef`, `ps auxf`**: snapshot de processos.
- **`pidstat`, `vmstat`, `iostat`**: estatísticas finas.
- **`/proc/<pid>/`**: filesystem virtual com info de cada processo (status, fd, maps, etc).
- **`bpftrace`, `eBPF`**: tracing avançado low-overhead.

---

## 6. Referências de Elite

### Livros canônicos
- **Operating Systems: Three Easy Pieces** (Remzi Arpaci-Dusseau), free em [pages.cs.wisc.edu/~remzi/OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/). **Leitura obrigatória.** Capítulos 4-5 (processes), 26-32 (concurrency), 35-43 (persistence).
- **Advanced Programming in the UNIX Environment** (Stevens & Rago, "APUE"), bíblia. Use como referência.
- **The Linux Programming Interface** (Michael Kerrisk), alternativa moderna a APUE, mais Linux-specific.
- **Linux Kernel Development** (Robert Love), quando quiser entender o lado kernel.

### Artigos
- **["The C10K problem"](http://www.kegel.com/c10k.html)**: Dan Kegel. Histórico, mas o **fundamento conceitual** de servidores high-concurrency. Leia.
- **["The C10M problem"](https://highscalability.com/the-secret-to-10-million-concurrent-connections-the-kernel-i/)**: sequência moderna.
- **["Understanding the Linux Kernel CFS"](https://opensource.com/article/19/2/fair-scheduling-linux)**.

### Repos
- **[Linux kernel source](https://github.com/torvalds/linux)**: `kernel/sched/` pra scheduler, `fs/` pra filesystems.
- **[libuv](https://github.com/libuv/libuv)**: implementação de event loop C que o Node usa.
- **[busybox](https://www.busybox.net/)**: implementações minimal de quase todos comandos Unix. Excelente pra ler código.
- **[xv6](https://github.com/mit-pdos/xv6-public)**: SO didático do MIT. Pode ler inteiro.

### Documentação primária
- **[man pages](https://man7.org/linux/man-pages/)**: `man 2 <syscall>` (seção 2 = syscalls). Use sempre.
- **[Linux man pages online](https://man7.org/linux/man-pages/)**.

### Talks
- **["Linux Scheduler"](https://www.youtube.com/watch?v=q1GH3wMs9_Y)**: várias talks de LinuxCon.
- **Brendan Gregg performance talks**: [brendangregg.com/talks.html](https://www.brendangregg.com/talks.html).

### Comunidade
- **[r/linux](https://www.reddit.com/r/linux)**, **[r/kernel](https://www.reddit.com/r/kernel)**.
- **LWN.net**: jornalismo técnico de kernel de altíssima qualidade.

---

**Encerramento:** após 01-02 você consegue raciocinar sobre runtime: por que o Node escala bem em I/O e mal em CPU-bound, por que Postgres usa multi-process em vez de multi-thread (até versão recente), por que Docker é "leve" comparado a VMs. Esse modelo mental é a base de toda discussão de operação em escala.
