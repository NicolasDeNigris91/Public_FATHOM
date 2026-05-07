---
module: 03-03
title: Kubernetes, Pods, Services, Ingress, HPA, Operators
stage: producao
prereqs: [03-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-03, Kubernetes

## 1. Problema de Engenharia

Kubernetes é o orquestrador padrão de produção em empresas, e também a fonte mais comum de complexidade não-justificada. Times rodam clusters caros pra projetos que caberiam em Railway. Outros, com necessidade real de K8s, tratam como "Docker Compose com mais YAML", não entendem control loops, declaration vs reality, scheduler decisions, resource pressure, ingress paths.

Este módulo é K8s real: arquitetura (control plane, kubelet, etcd), modelo declarativo, primitives (Pod, Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret), scheduling, autoscaling, observability, helm/kustomize, operators. Você sai sabendo decidir **se** K8s, e, quando sim, operar com competência.

---

## 2. Teoria Hard

### 2.1 Quando você precisa de K8s

Sinais que K8s vale:
- Múltiplos serviços (10+) com lifecycles diferentes.
- Autoscaling baseado em métricas customizadas.
- Multi-region ou multi-tenant heavy isolation.
- Stateful workloads complexos (DBs, queues que você opera).
- Time grande, organização poliglota.

Sinais que K8s é overkill:
- 1-3 serviços, tráfego médio.
- Time pequeno (< 5 engs).
- Cargas previsíveis.
- Budget operacional limitado.

Alternativas razoáveis: Railway, Render, Fly.io, AWS App Runner, Cloud Run. Logística v2 vai pra K8s pra você aprender; em projeto real, decida com base em escala.

### 2.2 Arquitetura

**Control plane**:
- **API Server**: única entrada, autentica, autoriza, valida.
- **etcd**: store distribuído (Raft) com estado do cluster.
- **Scheduler**: decide em qual node rodar Pods.
- **Controller Manager**: roda controllers (Deployment, ReplicaSet, etc.).
- **Cloud Controller Manager**: integra cloud provider (LBs, volumes).

**Nodes (workers)**:
- **kubelet**: agente, garante que pods estejam rodando.
- **kube-proxy**: programação de iptables/ipvs pra Services.
- **CRI runtime** (containerd, CRI-O): roda containers.
- **CNI plugin** (Calico, Cilium, AWS VPC CNI, Flannel): rede de pods.

Tudo que você cria é objeto declarativo armazenado em etcd. Controllers comparam estado desejado vs atual e reconciliam.

### 2.3 Pod

Unidade de scheduling. Geralmente 1 container, podendo ter sidecars.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
spec:
  containers:
    - name: api
      image: ghcr.io/me/logistica-api:v1.2.3
      ports:
        - containerPort: 3000
      resources:
        requests: { cpu: 100m, memory: 256Mi }
        limits: { cpu: 500m, memory: 512Mi }
```

Em geral você não cria Pod direto, usa Deployment.

Pods são efêmeros: caem, IP some, novo Pod nasce com IP novo.

### 2.4 Deployment

Roda N réplicas idênticas com rolling updates.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 3
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      containers: [...]
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

Strategy:
- **RollingUpdate** (default): sobe Pods novos, mata antigos gradualmente.
- **Recreate**: mata todos, sobe novos. Downtime garantido. Pra apps que não suportam dois versões coexistentes.

### 2.5 ReplicaSet

Controller subjacente do Deployment. Você não mexe direto.

### 2.6 StatefulSet

Pra workloads com identidade estável (DBs, brokers).

Diferenças de Deployment:
- Pods nomeados ordenadamente (`pod-0, pod-1, pod-2`).
- Persistent Volume Claims por pod, persistem mesmo se Pod morrer.
- Updates ordenadamente.

Em produção, prefer **Operators** específicos (Postgres Operator, Strimzi pra Kafka) que cuidam de detalhes (failover, replicação, backups). StatefulSet "puro" raramente é o que você quer pra DB.

### 2.7 DaemonSet

Garante 1 Pod em cada node (ou subconjunto). Usado pra:
- Log agents (Fluentd, Vector).
- Metrics agents (node-exporter, OTel collector).
- Security tools (Falco).

### 2.8 Job e CronJob

- **Job**: roda Pod até completion (1 ou N).
- **CronJob**: schedule cron, dispara Jobs.

Pra batch processing, migrations, backups.

### 2.9 Service

Pods são efêmeros. Service dá IP virtual estável + DNS pra grupo de Pods (selecionados por label).

```yaml
apiVersion: v1
kind: Service
metadata: { name: api }
spec:
  selector: { app: api }
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

Tipos:
- **ClusterIP**: IP interno (default). Acessível só dentro cluster.
- **NodePort**: expõe em porta de cada node.
- **LoadBalancer**: provider provisiona LB cloud (ELB, GCP LB).
- **ExternalName**: alias DNS pra service externo.

DNS interno: `api.namespace.svc.cluster.local`.

### 2.10 Ingress

Roteamento HTTP/HTTPS L7 pra Services. Necessita um **Ingress Controller** (Nginx, Traefik, AWS ALB, Cloud Run). Sem controller, Ingress objects ficam parados.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: logistica
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts: [api.logistica.com]
      secretName: logistica-tls
  rules:
    - host: api.logistica.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: api, port: { number: 80 } }
```

**Gateway API** é a evolução do Ingress (mais expressivo, role-based). Em 2026, GA e crescente.

### 2.11 ConfigMap e Secret

- **ConfigMap**: chave-valor não-sensível. Mounted como env vars ou files.
- **Secret**: similar, base64-encoded (não criptografado por default!). Em prod, **encryption at rest em etcd** ou external secret store (AWS Secrets Manager, Vault, GCP Secret Manager via External Secrets Operator).

```yaml
apiVersion: v1
kind: Secret
metadata: { name: api-secrets }
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXM6Ly8uLi4=   # base64
```

### 2.12 Resource requests e limits

- **Request**: garantia mínima. Scheduler aloca Pod no node se request couber.
- **Limit**: máximo. CPU é throttled; memory que excede → OOM kill.

QoS classes:
- **Guaranteed**: requests == limits em todos containers.
- **Burstable**: requests < limits.
- **BestEffort**: sem requests/limits. Primeiro a ser evicted em pressão.

Em prod, sempre defina requests realistas. Sem isso, scheduler chuta, e você overcommit ou under-utiliza.

### 2.13 Probes

- **Liveness**: kubelet checa; falha → restart Pod.
- **Readiness**: falha → remove de Service (não recebe tráfego). Pod fica vivo mas isolado.
- **Startup**: pra apps com cold start lento. Atrasa liveness.

Backend deve ter `/healthz` (liveness) e `/readyz` (readiness com checks de DB/Redis).

### 2.14 Autoscaling

**HPA (Horizontal Pod Autoscaler)**: scale réplicas baseado em métricas (CPU, memória, custom).

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

Custom metrics via **KEDA** (Kubernetes Event-Driven Autoscaling): scale por queue depth (Kafka, SQS), Redis lists, latency p99, etc. Padrão moderno.

**VPA (Vertical Pod Autoscaler)**: ajusta requests/limits. Combinar com HPA é tricky (conflito). Usado em alguns workloads stateful.

**Cluster Autoscaler**: adiciona/remove nodes baseado em pending Pods.

### 2.15 Networking: ClusterIP vs Service Mesh

**Service Mesh** (Istio, Linkerd, Cilium Service Mesh) adiciona, sem mexer em código de aplicação:
- **mTLS automático** entre serviços (cert rotation gerenciada).
- **Traffic management**: weighted routing (canary, blue/green), retries com budget, timeout, circuit breakers.
- **Observability L7**: metrics RED por route, tracing automático (W3C trace context), access logs.
- **Authorization policies**: SPIFFE identity + AuthorizationPolicy (cross-namespace, mTLS-aware).
- **Traffic mirroring**: copia tráfego prod pra staging sem afetar response (shadow deploys).

**Modelos de implementação:**

| Mesh | Modelo | Overhead | Quando |
|---|---|---|---|
| **Istio** | Sidecar (Envoy por pod) | ~30-100MB RAM + ~0.5ms latency por hop | Features máximas, multi-cluster, ambient mode (2024+) reduz overhead |
| **Linkerd** | Sidecar (Rust micro-proxy) | ~10MB RAM, < 1ms p99 | Simplicidade, perf, mTLS sem complexidade |
| **Cilium Service Mesh** | eBPF kernel-level | ~zero por hop, sem sidecar | Performance crítica, já usa Cilium CNI |
| **Istio ambient mode** | ztunnel L4 + waypoint L7 sob demanda | Médio | Quem quer Istio mas sem custo de sidecar em todo pod |

**Cilium ganhou tração 2024-2026** por eliminar sidecar (eBPF intercepta no kernel). Trade-off: tooling menos maduro, debugging eBPF é mais hardcore.

**Decisão:**
- < 5 services: mesh é overkill. mTLS via cert-manager + app-level config.
- 5-20 services + mTLS obrigatório (compliance): Linkerd (mais simples).
- 20+ services + traffic shaping complexo: Istio ambient ou Cilium.
- Multi-cluster + multi-tenant: Istio (federation features).

**Cuidado**: cada mesh introduz **failure mode novo** (control plane down ≠ data plane down em mesh maduro, mas debug fica mais profundo). Game day obrigatório antes de prod.

### 2.16 Persistent Volumes

- **PV** (PersistentVolume): cluster resource, representa storage.
- **PVC** (PersistentVolumeClaim): request por storage.
- **StorageClass**: provisioning dinâmico (gp3 EBS, ssd-persistent disk).

Pod monta via PVC. PV pode sobreviver Pod morte e ser remontado.

Modos de acesso: ReadWriteOnce (1 node), ReadWriteMany (vários nodes, só alguns drivers, EFS), ReadOnlyMany.

### 2.17 Helm e Kustomize

Configuration management:
- **Helm**: package manager. Charts (templates Go) com values overrides. Versioning. Releases. Padrão de fato.
- **Kustomize**: built-in `kubectl`, overlay-based. Menos abstração, sem Go templates. Convive com Helm em pipelines.

Em 2026 muitos projetos preferem Helm pra installs de terceiros (charts oficiais) e Kustomize pra config própria. Outros preferem Helm pra tudo.

**Argo CD** / **Flux**: GitOps, repo Git é fonte de verdade; controller syncs cluster com repo. Padrão moderno em times maduros.

### 2.18 Operators, pattern deep

CRD (Custom Resource Definition) + Controller. Permite estender K8s com objetos custom. É o pattern que torna K8s extensível além de "container orchestrator", vira plataforma onde stateful systems se autoadministram.

**Anatomia de um operator:**
1. **CRD** define schema do recurso novo (`PostgresCluster`, `KafkaTopic`).
2. **Controller** roda em pod no cluster, watches o API server pra mudanças nesses recursos.
3. **Reconcile loop**: `desired_state - current_state = action`. Loop infinito.
4. **Status subresource**: controller publica observed state em `.status` do recurso.

**Reconcile loop pseudo-code:**
```go
for event := range watch(api, "PostgresCluster") {
    desired := event.spec
    current := observe(cluster, desired.name)
    diff := compare(desired, current)
    apply(diff)              // create StatefulSet, ConfigMap, Secret, etc.
    updateStatus(desired.name, observed)
}
```

**Idempotência é essencial**: mesma reconcile rodando 100x deve convergir pra mesmo estado. Sem efeitos colaterais cumulativos.

**Quando vale escrever operator próprio:**
- Aplicação tem **lifecycle complexo** (rolling upgrade com migration de schema, election de leader, backup orchestration).
- Operações repetitivas que humanos fazem hoje viram automatable + auditable.
- Você publica como produto / open source.

**Quando NÃO escrever:**
- App stateless padrão. Deployment + HPA cobrem.
- Lifecycle simples. Helm chart resolve.
- Time pequeno. Manter operator é overhead permanente.

**Ferramentas pra escrever operators:**
- **Operator SDK** (RH/Operator Framework): Go (mais maduro), Ansible-based, Helm-based.
- **Kubebuilder**: Go. Mais low-level, comunidade ampla.
- **Metacontroller**: lambdas-style. Você escreve sync function em qualquer linguagem.
- **Crossplane**: declara cloud resources como K8s resources (RDS, 04-03, GKE clusters via YAML).

**Operators famosos em produção:**
- **CloudNativePG** (Postgres), provavelmente o melhor operator de DB existente em 2026.
- **Strimzi** (Kafka).
- **cert-manager** (TLS).
- **Prometheus Operator** + **kube-prometheus-stack**.
- **External Secrets Operator** (puxa de AWS SM, Vault, GCP Secret Manager).
- **ArgoCD** (GitOps, operator que reconcila git → cluster).
- **Velero** (backup/restore).
- **OpenTelemetry Operator** (instrumenta apps automaticamente).

**Anti-patterns conhecidos:**
- Operator que faz scheduling logic próprio (concorre com kube-scheduler, perde sempre).
- Reconcile loop que cria recursos sem `ownerReferences`, leak ao deletar CR.
- Operator que faz blocking I/O em reconcile (bloqueia outros eventos).
- Status update sem retry, perdas silenciosas.

### 2.18.1 Quando NÃO usar Kubernetes

K8s é poderoso, é caro de manter. Senior real escolhe consciente. Tabela completa de alternativas (ECS, Nomad, Fly.io, Cloud Run, Kamal, etc.) e heurística por tamanho de time vive em [`framework/03-producao/README.md`](README.md#quando-not-usar-k8s) — ali fica visível antes do aluno entrar no módulo, pra evitar que K8s seja escolhido por default.

Resumo bruto:
- Time < 5 + app < 10 services: K8s é overhead net-negative.
- Time 5-30: managed K8s (EKS Auto Mode, GKE Autopilot) começa a justificar.
- Time > 30 + multi-region + compliance heavy: K8s domina.

### 2.19 Security

- **RBAC**: Role + RoleBinding (ou ClusterRole). Princípio do menor privilégio.
- **PodSecurity Standards** (substitui PSP descontinuado): restricted, baseline, privileged.
- **Network Policies**: firewall L3/L4 entre Pods. Default Allow All é perigoso; pin policies estritas.
- **Image scanning + admission control** (Kyverno, OPA Gatekeeper): bloqueia images vulneráveis ou config errado em admission.

### 2.20 Distros e managed

- **Vanilla K8s self-hosted**: kubeadm, kops. Você opera. Pesado.
- **EKS** (AWS), **GKE** (Google), **AKS** (Azure): managed control plane. Você ainda opera nodes (ou usa node-managed/Fargate).
- **DigitalOcean DOKS**, **Linode LKE**: simples e baratos.
- **K3s, K0s**: distros leves pra dev/edge.
- **Talos**: minimalist, immutable, declarative.

Pra aprender: K3s local ou GKE Autopilot/EKS Auto Mode.

### 2.21 K8s production resilience — PodDisruptionBudget, topology spread, descheduler, priority classes, eviction

Default K8s scheduling parece "just works" mas é frágil em production. Node drain durante upgrade pode tirar 100% das replicas de um service. Pods se acumulam em 1 node (single point of failure). OOMKill cascade derruba services não-related. PriorityClass mal-config = critical pod evicted antes do batch job. Esta seção cobre 5 patterns de resiliência operacional: PDB, topology spread, descheduler, priority classes, eviction tuning — com YAML production-ready.

#### PodDisruptionBudget (PDB) — proteção em voluntary disruption

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: prod
spec:
  minAvailable: 2          # at least 2 pods up always
  # OR maxUnavailable: 1   # at most 1 pod down at a time
  selector:
    matchLabels:
      app: api
  unhealthyPodEvictionPolicy: AlwaysAllow   # Kubernetes 1.27+
```

- **Voluntary disruption**: `kubectl drain`, node upgrade, cluster autoscaler scale-down. PDB blocks if would violate.
- **Involuntary** (node hardware failure, OOM): PDB does NOT protect. Use multiple replicas + spread.
- **`unhealthyPodEvictionPolicy: AlwaysAllow`** (1.27+): permite evict de pods unhealthy mesmo se violaria PDB. Sem isso, unhealthy pod travado em terminating bloqueia drain forever.

#### Topology Spread Constraints — distribute pods across failure domains

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 6
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector: { matchLabels: { app: api } }
          matchLabelKeys: [pod-template-hash]    # Kubernetes 1.27+
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector: { matchLabels: { app: api } }
      containers: [...]
```

- **`maxSkew: 1`** + **`zone` topologyKey**: max diferença de 1 pod entre zones. 6 pods em 3 zones = 2/2/2.
- **`whenUnsatisfiable: DoNotSchedule`** (zone): hard constraint — não schedule se violaria. **`ScheduleAnyway`** (hostname): soft, prefer mas não bloqueia.
- **`matchLabelKeys: [pod-template-hash]`** (1.27+): considera só pods da mesma ReplicaSet (rolling update não confunde counting).
- Sem isso: 6 pods podem cair todos em 1 zone; AZ failure = 100% downtime.

#### Anti-affinity (alternative/complement)

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector: { matchLabels: { app: api } }
                topologyKey: kubernetes.io/hostname
```

- **`required`**: hard rule, scheduler refuses. **`preferred`**: soft, weighted preference.
- 2026 standard: prefer Topology Spread Constraints over Anti-Affinity (more flexible).

#### PriorityClass — eviction order under pressure

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-prod
value: 100000
globalDefault: false
description: "API + DB clients; never evict before batch"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: best-effort-batch
value: 1000
description: "Batch jobs; first to evict on node pressure"
---
# Apply em deployment
spec:
  template:
    spec:
      priorityClassName: critical-prod
```

- Kubelet eviction: lowest priority first.
- Scheduler preemption: high-priority pod can preempt lower if cluster full.
- **System critical**: pré-definidos `system-cluster-critical` (2000000000) e `system-node-critical` (2000001000) — não use pra workload normal.
- **Pegadinha**: missing PriorityClass = priority 0 = mistura com batch. Sempre set explicit pra prod workloads.

#### Resource requests/limits + QoS classes (recap operacional)

```yaml
spec:
  containers:
    - name: api
      resources:
        requests: { cpu: 250m, memory: 512Mi }
        limits:   { cpu: 1, memory: 1Gi }
```

- **Guaranteed** (requests = limits): never evicted on memory pressure.
- **Burstable** (limits > requests): evicted in middle order.
- **BestEffort** (no requests/limits): evicted first.
- **Production rule**: Guaranteed pra critical services; Burstable pra workers; BestEffort proibido em namespace prod.
- **Memory limit pegadinha**: hit limit = OOMKill imediato; sem grace. Set 20-30% above observed peak.

#### Descheduler — re-balance pods over time

```yaml
# descheduler-policy.yaml
apiVersion: descheduler/v1alpha2
kind: DeschedulerPolicy
profiles:
  - name: ProfileName
    pluginConfig:
      - name: DefaultEvictor
        args:
          evictLocalStoragePods: false
          nodeFit: true
      - name: RemoveDuplicates
      - name: LowNodeUtilization
        args:
          thresholds: { cpu: 20, memory: 20, pods: 20 }
          targetThresholds: { cpu: 50, memory: 50, pods: 50 }
      - name: RemovePodsViolatingTopologySpreadConstraint
    plugins:
      balance:
        enabled: [RemoveDuplicates, LowNodeUtilization, RemovePodsViolatingTopologySpreadConstraint]
```

- Descheduler corre como CronJob ou Deployment + leader election.
- Removes pods que violam spread, são duplicate em mesmo node, ou underutilized nodes.
- PDB + PriorityClass STILL respected — eviction safe.
- **Scenario**: cluster autoscaler adds nodes em spike, mas pods existentes não se movem; descheduler re-balance.

#### Eviction thresholds — tuning kubelet

```yaml
# kubelet config (per node)
evictionHard:
  memory.available: "200Mi"
  nodefs.available: "10%"
  imagefs.available: "10%"
evictionSoft:
  memory.available: "500Mi"
  nodefs.available: "15%"
evictionSoftGracePeriod:
  memory.available: "1m30s"
evictionMaxPodGracePeriod: 60
```

- **Hard threshold**: immediate OOMKill on hit; sem grace.
- **Soft threshold**: graceful eviction respeitando `terminationGracePeriodSeconds` até `evictionMaxPodGracePeriod`.
- Default: ~100Mi reserved. Em high-density nodes, pode bater frequente. Tune per workload.

#### Logística production stack — todas as defenses ligadas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: prod
spec:
  replicas: 6
  strategy:
    rollingUpdate: { maxSurge: 2, maxUnavailable: 0 }
  template:
    metadata: { labels: { app: orders-api, tier: critical } }
    spec:
      priorityClassName: critical-prod
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector: { matchLabels: { app: orders-api } }
          matchLabelKeys: [pod-template-hash]
      containers:
        - name: api
          image: registry/orders-api:v2.3.1
          resources:
            requests: { cpu: 500m, memory: 1Gi }
            limits:   { cpu: 1, memory: 1Gi }      # Guaranteed QoS
          livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 10 }
          readinessProbe: { httpGet: { path: /ready, port: 8080 }, periodSeconds: 5 }
          startupProbe:   { httpGet: { path: /healthz, port: 8080 }, failureThreshold: 30, periodSeconds: 2 }
      terminationGracePeriodSeconds: 60
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: orders-api
  namespace: prod
spec:
  minAvailable: 4
  selector: { matchLabels: { app: orders-api } }
  unhealthyPodEvictionPolicy: AlwaysAllow
```

#### Anti-patterns observados

- **No PDB**: cluster upgrade evicts todas replicas; downtime guaranteed.
- **PDB com `minAvailable` igual a `replicas`**: drain bloqueia infinito; nenhum pod pode ser evicted. Set `replicas - 1` ou `maxUnavailable: 1`.
- **No topology spread**: 100% replicas em 1 zone; AZ failure = 100% down.
- **Sem `matchLabelKeys`**: rolling update tem rolling pods + new pods counted; spread aparece violado constantemente.
- **PriorityClass faltando em prod**: critical pods misturados com batch em eviction order.
- **Memory limit muito justo**: hit limit em traffic spike = OOMKill cascading restart loop.
- **`maxUnavailable: 25%` em deployment de 4 replicas**: 1 pod evictable, mas se PDB diz `minAvailable: 3`, drain trava.
- **Sem `terminationGracePeriodSeconds`**: SIGTERM + 30s default; long-running requests truncated. Set baseado em request p99 latency.
- **Sem startupProbe**: liveness mata pod durante boot lento.

#### Validation toolkit

- **`kubectl drain --dry-run`**: simula drain pra ver se PDB bloqueia.
- **`kube-no-trouble (kubent)`**: detecta deprecated APIs.
- **`kubescape`** ou **`polaris`**: scans de best practices em deployment manifests.
- **`chaos-mesh`** ou **`litmus`**: chaos engineering — kill node, inject latency, partition network. Valida defenses funcionam.

Cruza com **03-03 §2.14** (autoscaling), **03-03 §2.16** (persistent volumes — PDB protege StatefulSet também), **03-03 §2.18** (operators que gerenciam PDB programaticamente), **03-15 §2.11** (chaos engineering valida resilience), **04-04 §2.x** (resilience patterns aplicam stack inteiro).

### 2.22 Custom Controllers + Operators deep (kubebuilder, controller-runtime, CRD design)

**Stack 2026**: kubebuilder 4.2+, controller-runtime 0.18+, K8s 1.30+, Go 1.22+. Operator Pattern (CoreOS, 2016) codifica conhecimento operacional em software; substitui playbooks manuais por reconciliation contínua.

#### Operators vs Helm/Kustomize

- **Helm/Kustomize**: templating declarativo; deploy uma vez; sem ongoing logic. Bom para apps stateless simples.
- **Operators**: reconciliation loop contínuo; day-2 ops (backup, failover, scaling, upgrade) automatizados.
- **Use cases**: stateful workloads (Postgres, Kafka, Elasticsearch, ML pipelines), multi-step domain operations, lifecycle management de tenants.
- **Decisão**: se app precisa de "operator knowledge" pós-deploy (failover, restore, schema migration), operator. Senão, Helm chart resolve.

#### Reconciliation loop — fundamentos

- Controller observa CRs (Custom Resources) + dependências (Deployments, Services, ConfigMaps).
- Cada mudança chama `Reconcile(req)`. Compara desired (Spec) vs actual (cluster state); muta para convergir.
- **Idempotente**: chamadas N vezes com mesma input produzem mesmo resultado. `Create` substituído por `CreateOrUpdate` ou `Get`-then-`Create`.
- **Level-triggered, NÃO edge-triggered**: reage ao estado atual, não a eventos. Resilient a missed events, controller restarts, network partitions.
- **Eventual consistency**: um passo por Reconcile; se mais trabalho pendente, retorna `RequeueAfter` ou `Requeue: true`. Não tente "tudo de uma vez".

#### CRD design — Spec, Status, subresources, schema

- **Spec**: desired state, escrito por user.
- **Status**: actual state, escrito pelo controller. Subresource `/status` separa RBAC e preserva user `spec` em status updates.
- **Subresource `/scale`**: integra HPA/`kubectl scale` com CRD.
- **OpenAPI v3 schema**: validation server-side (types, enums, ranges, defaults, required). Rejeita garbage antes de chegar ao controller.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: logisticatenants.logistica.example.com
spec:
  group: logistica.example.com
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [tier, region]
              properties:
                tier:     { type: string, enum: [free, pro, enterprise] }
                region:   { type: string, enum: [us-east, eu-west, br-sao-paulo] }
                replicas: { type: integer, minimum: 1, maximum: 100, default: 3 }
            status:
              type: object
              properties:
                phase: { type: string, enum: [Pending, Provisioning, Ready, Failed] }
                readyReplicas: { type: integer }
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:               { type: string }
                      status:             { type: string }
                      reason:             { type: string }
                      message:            { type: string }
                      lastTransitionTime: { type: string, format: date-time }
      subresources:
        status: {}
        scale:
          specReplicasPath:   .spec.replicas
          statusReplicasPath: .status.readyReplicas
  scope: Namespaced
  names:
    plural:     logisticatenants
    singular:   logisticatenant
    kind:       LogisticaTenant
    shortNames: [ltenant]
```

#### kubebuilder + controller-runtime — skeleton Go

`kubebuilder init --domain logistica.example.com --repo github.com/logistica/operator` + `kubebuilder create api --group logistica --version v1alpha1 --kind LogisticaTenant` gera scaffolding completo (Makefile, Dockerfile, RBAC, manager).

```go
func (r *LogisticaTenantReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    var tenant logisticav1alpha1.LogisticaTenant
    if err := r.Get(ctx, req.NamespacedName, &tenant); err != nil {
        if errors.IsNotFound(err) { return ctrl.Result{}, nil } // deleted; nothing to do
        return ctrl.Result{}, err
    }

    // Step 1: ensure Namespace (idempotente: IsAlreadyExists tolerado)
    ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "tenant-" + tenant.Name}}
    if err := r.Create(ctx, ns); err != nil && !errors.IsAlreadyExists(err) {
        return ctrl.Result{}, err
    }

    // Step 2: ensure Deployment (com OwnerReference para GC)
    deploy := r.deploymentFor(&tenant)
    if err := ctrl.SetControllerReference(&tenant, deploy, r.Scheme); err != nil {
        return ctrl.Result{}, err
    }
    if err := r.Create(ctx, deploy); err != nil && !errors.IsAlreadyExists(err) {
        return ctrl.Result{}, err
    }

    // Step 3: update Status via subresource (não toca Spec)
    tenant.Status.Phase = "Ready"
    tenant.Status.ReadyReplicas = deploy.Status.ReadyReplicas
    if err := r.Status().Update(ctx, &tenant); err != nil {
        return ctrl.Result{}, err
    }

    log.Info("reconciled", "tenant", tenant.Name, "phase", tenant.Status.Phase)
    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}

func (r *LogisticaTenantReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&logisticav1alpha1.LogisticaTenant{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        WithEventFilter(predicate.GenerationChangedPredicate{}). // ignora status-only updates
        Complete(r)
}
```

#### Owner references + garbage collection

- `ctrl.SetControllerReference(parent, child, scheme)` adiciona `OwnerReference` com `controller: true`.
- Quando parent deletado, K8s GC remove children automaticamente em cascade.
- `kubectl delete logisticatenant my-tenant` derruba Namespace, Deployment, Service, ConfigMap em sequência sem código adicional.

#### Watching dependencies — `Owns`, `Watches`, predicates

- **`For(&LogisticaTenant{})`**: primary CRD; reconcile triggered em qualquer mudança.
- **`Owns(&Deployment{})`**: watch resources criados pelo controller; mudanças em status do Deployment re-triggera reconcile do tenant.
- **`Watches(&corev1.ConfigMap{}, handler.EnqueueRequestsFromMapFunc(...))`**: resources não-owned (ex: shared config); função custom mapeia evento → list de Requests.
- **`predicate.GenerationChangedPredicate{}`**: filtra eventos onde só `.metadata.resourceVersion` muda (status writes); reconcile só em Spec changes. Reduz CPU 10x+.

#### Status conditions pattern

Convenção K8s API (`metav1.Condition`):

- **`Available`** — operator atingiu desired state.
- **`Progressing`** — convergindo (provisioning, scaling).
- **`Degraded`** — falha parcial; service ainda up mas deteriorado.

Cada condition: `type`, `status` (`True`/`False`/`Unknown`), `reason` (CamelCase code), `message` (human-readable), `lastTransitionTime`. Tooling genérico (kubectl, ArgoCD, OpenShift console) renderiza health automaticamente.

#### Distribution

- **OperatorHub.io**: catálogo CNCF + Red Hat certified.
- **Helm chart**: `helm install logistica-operator`; mais simples para users já em Helm.
- **OLM (Operator Lifecycle Manager)**: install/upgrade/dependency resolution; nativo OpenShift.
- **Manifests YAML diretos**: `kubectl apply -f operator.yaml`; zero overhead, sem packaging extras.

#### Logística aplicado — `LogisticaTenant` operator

- **CRD**: `LogisticaTenant {tier, region, replicas}`.
- **Reconcile cria**: Namespace `tenant-<name>` + Deployment `orders-api` (replicas conforme Spec) + Service ClusterIP + ConfigMap (tenant-specific config: feature flags, billing tier) + RoleBinding (tenant admin acesso ao namespace).
- **Day-2 ops**: nightly backup CronJob criado por tier `pro+`; tier upgrade `free → pro` muta HPA `minReplicas`; deletion archiva dados em S3 antes do GC cascade.
- **Resultado**: 1000+ tenants gerenciados com mesmo esforço operacional que 10. "Tenant lifecycle" expresso declarativamente em YAML.

#### Anti-patterns observados

- **Reconcile não idempotente**: cria duplicates em retry; sempre `Get`-then-`Create` ou `CreateOrUpdate`.
- **Edge-triggered**: lógica reage a "creation event"; missed event = resource nunca criado. Sempre level-triggered.
- **Long Reconcile (> 30s)**: bloqueia worker pool; quebrar em smaller steps com `RequeueAfter`.
- **Status updated via `r.Update(ctx, &obj)`**: conflita com subresource `/status`; sempre `r.Status().Update(ctx, &obj)`.
- **No OwnerReference em children**: orphans em parent delete; cleanup manual obrigatório.
- **Watch all events sem predicate**: Reconcile spam em status writes; CPU 100%; usar `GenerationChangedPredicate`.
- **Operator multi-replica sem leader election**: race conditions em writes; flag `--leader-elect` obrigatória em prod.
- **CRD sem OpenAPI schema**: aceita qualquer garbage; user errors aparecem em runtime no controller.
- **CRD pre-K8s 1.16 sem subresources**: status reset em Spec update; subresources `/status` separa o write path.
- **Hardcoded namespace**: multi-tenant operator deve ser cluster-scoped ou namespace-aware via `WATCH_NAMESPACE` env.

Cruza com **03-03 §2.18** (operators pattern intro), **03-03 §2.21** (PDB/topology spread aplicáveis a workloads gerenciados pelo operator), **03-04 §2.x** (CI/CD, operator deploy + image promotion), **04-08 §2.x** (services, operators automatizam stateful services), **04-04 §2.x** (resilience, reconcile = self-healing built-in), **03-15 §2.x** (incident response, operator-managed recovery reduz MTTR).

---

### 2.23 Kubernetes 1.32 stack 2026 — Gateway API GA, KEDA, Karpenter v1, cgroups v2, sidecar containers GA

Kubernetes 1.32 (Q4 2024) estabilizou patterns que ficaram alpha por anos. Stack de produção 2026 não é mais Ingress + Cluster Autoscaler + HPA simples: é **Gateway API v1.2 GA** (Q3 2024) substituindo Ingress, **KEDA 2.16** para scaling event-driven (60+ scalers), **Karpenter v1.0 GA** (Q3 2024) como node autoprovisioner com consolidation contínua, **cgroups v2** (default desde 1.25) habilitando `memory.high` soft-limit + PSI metrics, e **sidecar containers GA** (1.29+) resolvendo race conditions de startup/shutdown que atormentavam Istio/Vault/Fluent Bit há anos. Quem está em 2026 ainda em Ingress + Cluster Autoscaler + HPA-only opera com stack de 2020.

**Gateway API GA — vs Ingress.** Ingress era HTTP-only, anotações vendor-specific (`nginx.ingress.kubernetes.io/*`), sem typed policies. Gateway API é typed CRD-based, multi-protocolo (HTTPRoute, GRPCRoute, TLSRoute, TCPRoute), e split por **role**: infra team gerencia `GatewayClass` + `Gateway` (qual controller, IPs, certificados, listeners), app team gerencia `HTTPRoute` (rotas, backends, filters). GAMMA initiative (parte do Gateway API) padroniza service mesh sobre as mesmas APIs — Istio, Linkerd, Cilium implementam.

```yaml
# Infra team: GatewayClass + Gateway (cluster-scoped + namespace-scoped)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: gateway-system
spec:
  gatewayClassName: envoy-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-tls  # cross-namespace via ReferenceGrant
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels: { gateway-access: prod }
---
# App team: HTTPRoute (orders) + GRPCRoute (couriers)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: orders-route
  namespace: orders
  labels: { gateway-access: prod }
spec:
  parentRefs:
    - name: prod-gateway
      namespace: gateway-system
  hostnames: ["api.logistica.com"]
  rules:
    - matches:
        - path: { type: PathPrefix, value: /v1/orders }
      backendRefs:
        - name: orders-svc
          port: 8080
          weight: 90
        - name: orders-svc-canary
          port: 8080
          weight: 10  # canary 10% nativo, sem Flagger/Argo Rollouts pra split simples
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add: [{ name: X-Gateway, value: envoy }]
```

`parentRefs` = quais Gateways adotam essa rota; `backendRefs` = pesos para canary nativo. Status do HTTPRoute reporta `Accepted: True` quando o Gateway aceita — debug primeiro lugar quando rota não funciona.

**KEDA — event-driven autoscaling (scale-to-zero).** HPA built-in escala por CPU/memory/custom metrics, mas não escala para zero e não conhece queues. KEDA é deployment + CRD `ScaledObject` que cria HPA por baixo dos panos com **External Metrics API**, e adiciona scale-to-zero. 60+ scalers oficiais: SQS, Kafka, RabbitMQ, NATS, Postgres (queries), Prometheus, Cron, Azure Service Bus, GCP PubSub.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: courier-assigner
  namespace: logistica
spec:
  scaleTargetRef:
    name: courier-assigner-deploy
  minReplicaCount: 0          # scale-to-zero quando queue vazia
  maxReplicaCount: 50
  pollingInterval: 15         # checa scaler a cada 15s (NÃO use 1s — rate-limit no SQS)
  cooldownPeriod: 300         # espera 5min sem load antes de scale-down (evita flapping)
  fallback:
    failureThreshold: 3
    replicas: 5               # se scaler falhar 3x, fixa em 5 (não desce a zero por bug)
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123/courier-assignment
        queueLength: "30"     # 1 replica por 30 mensagens visíveis
        awsRegion: us-east-1
        identityOwner: pod    # usa IRSA da pod, não credenciais do KEDA operator
    - type: prometheus        # OR — escala se QUALQUER trigger pedir mais
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        threshold: "100"
        query: sum(rate(http_requests_total{service="courier-assigner"}[2m]))
```

Scale-from-zero típico: ~30s (poll interval + pod startup). Para jobs batch que precisam terminar (não loop), use `ScaledJob` em vez de `ScaledObject` — cria Job por mensagem.

**Karpenter v1 — node autoprovisioner.** Cluster Autoscaler escalava ASGs pré-definidos. Karpenter (GA Q3 2024 após 3 anos alpha) provisiona nodes diretamente via EC2 Fleet API olhando para pods Pending — escolhe instance type ótimo (CPU/memory/spot/zone) em ~30s, vs Cluster Autoscaler ~2-3min. **Consolidation** roda contínua: se workload cabe em nodes menores ou menos nodes, Karpenter dreina e termina automaticamente.

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata: { name: spot-batch }
spec:
  template:
    metadata:
      labels: { workload: batch, capacity: spot }
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["c7i", "c7a", "m7i"]   # Karpenter escolhe a mais barata que cabe
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]      # multi-arch pra Graviton
      taints:
        - key: workload
          value: batch
          effect: NoSchedule
      expireAfter: 720h                    # rotaciona node a cada 30d (drift + AMI updates)
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
    budgets:
      - nodes: "10%"                       # NUNCA dreina mais que 10% dos nodes simultâneos
      - nodes: "0"
        schedule: "0 9 * * mon-fri"        # zero disruption durante business hours
        duration: 8h
```

Savings reais 2026: 30-60% no custo EC2 vs Cluster Autoscaler (mistura spot + right-sizing contínuo + bin-packing). Sem `disruption.budgets`, Karpenter faz mass-eviction durante consolidation — production outage garantido.

**cgroups v2 + memory.high + PSI.** cgroups v2 é default desde K8s 1.25 (kernel 5.8+). Mudanças relevantes: `memory.max` é hard limit (OOMKill), mas agora há `memory.high` — soft limit que faz throttling de alocação antes do OOM. `requests.memory` em K8s 1.27+ vira `memory.low` (proteção contra reclaim sob pressure global), `limits.memory` vira `memory.max`. **PSI (Pressure Stall Information)** — `/proc/pressure/{cpu,memory,io}` — exposto via cAdvisor, pode ser scraped pelo Prometheus e usado como External Metric pra KEDA escalar antes do CPU% saturar. Verifique cgroup version no node:

```bash
stat -fc %T /sys/fs/cgroup/   # cgroup2fs = v2; tmpfs = v1 (migre)
cat /sys/fs/cgroup/kubepods.slice/.../memory.pressure  # PSI metrics
```

Em clusters ainda em cgroups v1 (RHEL 7, Amazon Linux 2 antigo), perde memory.high + PSI — não há como ter soft-limit de memória, qualquer pico = OOMKill.

**Sidecar containers GA (1.29+, stable 1.32).** Antes: sidecars eram containers regulares no `spec.containers` — sem ordering garantido (Istio proxy não estava pronto quando app fazia primeiro request), sem lifecycle separado (Job não terminava porque sidecar ficava rodando). Solução 2026: sidecar é **init container com `restartPolicy: Always`**. Ordering garantido (todos init containers até o sidecar precisam estar Ready), lifecycle separado (sidecar é terminado DEPOIS dos main containers), restart independente.

```yaml
spec:
  initContainers:
    - name: istio-proxy
      image: docker.io/istio/proxyv2:1.24
      restartPolicy: Always         # <-- isso faz dele sidecar
      lifecycle:
        postStart:
          exec: { command: ["pilot-agent", "wait"] }   # bloqueia até proxy ready
    - name: log-shipper
      image: fluent/fluent-bit:3.1
      restartPolicy: Always
      volumeMounts: [{ name: logs, mountPath: /var/log/app }]
  containers:
    - name: app
      image: logistica/orders:v2.4.1
      # app só inicia depois que istio-proxy + log-shipper estão Ready
```

**Topology Aware Routing.** `service.kubernetes.io/topology-mode: Auto` na Service: kube-proxy roteia preferencialmente para endpoints na mesma AZ — reduz cross-AZ traffic costs (NAT $0.01/GB AWS) e latência. Combine com `internalTrafficPolicy: Local` para forçar same-node routing quando aplicável (DaemonSet log shippers).

**Stack Logística aplicada.** Gateway API: `prod-gateway` único termina TLS para `api.logistica.com`, HTTPRoute para `/v1/orders` (REST), GRPCRoute para `couriers.v1.CourierService` (gRPC interno mas exposto). KEDA: `courier-assigner` escala 0→50 em SQS `courier-assignment`; `notification-worker` escala em Kafka topic `order.events` lag; `report-generator` ScaledJob escala em Postgres query (jobs pendentes). Karpenter: NodePool `default` (on-demand m7i para api/db) + `spot-batch` (spot c7a/Graviton para workers KEDA, tolerations match). cgroups v2 + PSI: HPA do `orders-svc` usa memory.pressure PSI como custom metric (escala antes do CPU saturar). Sidecar GA: Istio proxy + Vault agent injector + Fluent Bit todos como init `restartPolicy: Always` — Jobs de migration não pendem mais por sidecar leak.

**10 anti-patterns 2026.**

1. **Ingress + Gateway API coexistindo.** Mesma rota em ambos = comportamento indefinido (qual controller responde primeiro). Migre por namespace ou por hostname, nunca dual-stack na mesma rota.
2. **KEDA `cooldownPeriod` baixo (< 60s).** Flapping: scale-up → load drena → scale-down → load volta → scale-up. Cada ciclo = pod startup + image pull. Mínimo 300s em workloads HTTP, 600s+ em batch.
3. **Karpenter sem `disruption.budgets`.** Consolidation agressivo dreina 50% dos nodes em 1min — outage. Sempre limite a `10-20%` simultâneo + zero durante business hours.
4. **cgroups v1 em K8s 1.30+.** Perde `memory.high` (sem soft-limit, só OOMKill), perde PSI metrics, perde memory QoS. Migre nodes para AL2023/Bottlerocket/Ubuntu 22.04+.
5. **Sidecar como container regular sem `restartPolicy: Always`.** Race condition: app faz request antes do Istio proxy estar pronto → 503. Job nunca termina porque Fluent Bit fica rodando.
6. **Gateway sem `GatewayClass` matching.** Gateway fica `Accepted: False` silenciosamente — sem rota funciona. Sempre verifique `kubectl get gateway -o jsonpath='{.status.conditions}'`.
7. **KEDA scaler com `pollingInterval: 1`.** Rate-limit no SQS/Kafka API, custo de chamadas explode. 15-30s é o sweet spot para HTTP workloads, 60s para batch.
8. **Karpenter `instance-family` muito restrito (1 família).** Fleet falha sob spot interruption mass — sem capacity. Permita 3-5 famílias compatíveis (`c7i, c7a, m7i, m7a`).
9. **PDB `minAvailable: 100%` + Karpenter consolidation.** PDB bloqueia drain forever, Karpenter não consolida nada — paga node ocioso. Use `maxUnavailable: 1` ou `25%`.
10. **Service Mesh + Gateway API duplicando policies.** Retry/timeout em ambos = comportamento composto inesperado (timeout 5s no Gateway × 3 retries no mesh = 15s real). Defina edge no Gateway, in-mesh no mesh — sem overlap.

**Cruza com 03-03 §2.10** (Ingress — predecessor que Gateway API substitui), **03-03 §2.14** (HPA — KEDA cria HPA por baixo, mesma External Metrics API), **03-03 §2.18** (operators — KEDA, Karpenter, Istio são operators), **03-03 §2.21** (PDB + topology spread — interagem com Karpenter consolidation), **03-03 §2.15** (service mesh — GAMMA padroniza sobre Gateway API), **03-05 §2.x** (AWS — Karpenter é EKS-native, IRSA + EC2 Fleet API), **04-08 §2.11** (service mesh + platform engineering — split GatewayClass/HTTPRoute = role-based platform), **04-09 §2.x** (scaling — KEDA event-driven é categoria distinta de HPA/VPA), **03-15 §2.x** (incident response — disruption budgets + PDB controlam blast radius de consolidation).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diagrama do control plane com 4 componentes e função de cada.
- Distinguir Pod, Deployment, StatefulSet, DaemonSet, Job com 1 caso pra cada.
- Justificar Service ClusterIP vs LoadBalancer vs ExternalName.
- Distinguir ConfigMap e Secret e o problema de Secret só em base64.
- Explicar QoS classes e impacto em scheduling/eviction.
- Configurar HPA com custom metric via KEDA.
- Argumentar Service Mesh sim/não pra projeto de N serviços.
- Distinguir Helm e Kustomize.
- Explicar GitOps com Argo CD em 4 etapas.
- Citar 3 cenários onde Operator é melhor que YAML manual.

---

## 4. Desafio de Engenharia

Migrar **Logística v1** pra K8s. Não significa abandonar Railway, significa demonstrar competência. Pode rodar em K3s local ou GKE Autopilot free tier.

### Especificação

1. **Cluster**:
   - K3s local via Multipass/Lima/Docker, ou GKE Autopilot.
   - Ingress controller: Traefik (default K3s) ou Nginx.
   - cert-manager pra TLS (Let's Encrypt staging em local; prod em GKE).
2. **Workloads**:
   - **api** (Deployment, 3 replicas, HPA min=2 max=10 by CPU 70%).
   - **web** (Deployment, 2 replicas).
   - **postgres** via **CloudNativePG operator** (não StatefulSet manual).
   - **redis** via Bitnami chart Helm (1 master + 2 replicas, Sentinel).
   - **migrations** como Job que roda antes de api subir (init container ou pre-install hook Helm).
3. **Networking**:
   - api e web servem via Ingress (`api.logistica.local`, `app.logistica.local`).
   - api fala com Postgres e Redis via DNS interno (`postgres-rw.default.svc.cluster.local`).
   - NetworkPolicy: web pode falar com api; api com Postgres/Redis; Postgres só recebe de api. Tudo mais bloqueado.
4. **Config & secrets**:
   - ConfigMap pra config não-sensível.
   - Secret pra DATABASE_URL, REDIS_PASSWORD, JWT_SECRET. Em local, sealed-secrets ou direto. Em prod, External Secrets Operator + AWS Secrets Manager (ou GCP Secret Manager).
5. **Probes**:
   - api e web com liveness `/healthz` e readiness `/readyz`.
   - Startup probe pra Next se cold start > 10s.
6. **Resources**:
   - Requests realistas baseados em load test (k6 do 03-01).
   - Limits 2x requests.
   - QoS Burstable pra api e web; Guaranteed pra Postgres pod.
7. **Autoscaling**:
   - HPA por CPU como mostrado.
   - **KEDA**: scale api adicionalmente baseado em Redis stream length de `courier:updates`. Quando há muitos eventos pendentes, scale up.
8. **GitOps**:
   - Helm chart próprio em pasta `charts/logistica/`.
   - Argo CD apontando pra repo, syncing namespace.
   - Demonstre: commit altera replicaCount → Argo aplica.
9. **Observability mínima**:
   - Prometheus Operator + Grafana via kube-prometheus-stack.
   - api expõe `/metrics` (instrumentado em 02-08); ServiceMonitor coleta.
   - Dashboard mostra QPS, latency p99, error rate, HPA replicas.

### Restrições

- Sem Postgres em StatefulSet manual. Operator.
- Sem `latest` tag.
- Sem Pod com `runAsRoot`.
- Sem NetworkPolicy permissiva (default-allow).

### Threshold

- README documenta:
  - Diagrama do cluster (namespaces, services, ingress).
  - Decisão de cada resource request com base em load test.
  - Estratégia de secrets (qual provider, encryption at rest).
  - HPA + KEDA: cenário simulado de scale (load test mostra HPA expandir).
  - GitOps demo: commit → Argo aplica em < 1 min.
  - Comando `kubectl` mínimo pra reproduzir tudo (ou `helm install`).

### Stretch

- Service Mesh: instale Linkerd ou Cilium e migre comunicação api↔postgres pra mTLS.
- Multi-cluster com Argo CD ApplicationSet.
- Operator próprio simples: CRD `Tenant` que cria namespace, quota, network policy ao ser criado.
- Canary deployment com Argo Rollouts ou Flagger.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): namespaces, cgroups são fundação dos pods.
- Liga com **01-03** (network): CNI, services, kube-proxy, iptables.
- Liga com **03-02** (Docker): mesma image; runtime CRI executa.
- Liga com **03-04** (CI/CD): build → push registry → Argo CD sync.
- Liga com **03-05** (AWS): EKS, ALB Ingress Controller, EBS CSI.
- Liga com **03-06** (IaC): Terraform pra provisionar EKS, KubeAdm clusters.
- Liga com **03-07** (observability): Prometheus, Grafana, OTel.
- Liga com **03-08** (security): RBAC, NetworkPolicies, image scanning.
- Liga com **04-04** (resilience): circuit breaker via mesh, retry policies.
- Liga com **04-08** (services vs monolith): K8s habilita microservices que sem ele seriam impraticáveis.

---

## 6. Referências

- **Kubernetes docs** ([kubernetes.io/docs](https://kubernetes.io/docs/)).
- **"Kubernetes in Action"**: Marko Lukša (livro de referência).
- **"Kubernetes: Up & Running"**: Brendan Burns et al.
- **Helm docs** ([helm.sh/docs](https://helm.sh/docs/)).
- **Kustomize docs** ([kubectl.docs.kubernetes.io/references/kustomize](https://kubectl.docs.kubernetes.io/references/kustomize/)).
- **Argo CD docs** ([argo-cd.readthedocs.io](https://argo-cd.readthedocs.io/)).
- **CloudNativePG docs** ([cloudnative-pg.io](https://cloudnative-pg.io/)).
- **KEDA docs** ([keda.sh](https://keda.sh/)).
- **Cilium / Linkerd docs**.
- **CNCF landscape** ([landscape.cncf.io](https://landscape.cncf.io/)), overview do ecossistema.
- **Kelsey Hightower, "Kubernetes the Hard Way"** ([github.com/kelseyhightower/kubernetes-the-hard-way](https://github.com/kelseyhightower/kubernetes-the-hard-way)).
