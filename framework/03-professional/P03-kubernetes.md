---
module: P03
title: Kubernetes — Pods, Services, Ingress, HPA, Operators
stage: professional
prereqs: [P02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P03 — Kubernetes

## 1. Problema de Engenharia

Kubernetes é o orquestrador padrão de produção em empresas, e também a fonte mais comum de complexidade não-justificada. Times rodam clusters caros pra projetos que caberiam em Railway. Outros, com necessidade real de K8s, tratam como "Docker Compose com mais YAML" — não entendem control loops, declaration vs reality, scheduler decisions, resource pressure, ingress paths.

Este módulo é K8s real: arquitetura (control plane, kubelet, etcd), modelo declarativo, primitives (Pod, Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret), scheduling, autoscaling, observability, helm/kustomize, operators. Você sai sabendo decidir **se** K8s, e — quando sim — operar com competência.

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

Em geral você não cria Pod direto — usa Deployment.

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

**Service Mesh** (Istio, Linkerd, Cilium Service Mesh) adiciona:
- mTLS automatic entre serviços.
- Traffic management (weighted routing, retries, circuit breakers).
- Observability (metrics, tracing) sem código.
- Authorization policies.

Sidecar (Istio) ou eBPF-based (Cilium). Cilium ganhou tração em 2024-2026 por menor overhead.

Em projetos pequenos, mesh é overkill. Em microservices ≥ 10 com necessidade de mTLS e traffic control, vale.

### 2.16 Persistent Volumes

- **PV** (PersistentVolume): cluster resource, representa storage.
- **PVC** (PersistentVolumeClaim): request por storage.
- **StorageClass**: provisioning dinâmico (gp3 EBS, ssd-persistent disk).

Pod monta via PVC. PV pode sobreviver Pod morte e ser remontado.

Modos de acesso: ReadWriteOnce (1 node), ReadWriteMany (vários nodes — só alguns drivers, EFS), ReadOnlyMany.

### 2.17 Helm e Kustomize

Configuration management:
- **Helm**: package manager. Charts (templates Go) com values overrides. Versioning. Releases. Padrão de fato.
- **Kustomize**: built-in `kubectl`, overlay-based. Menos abstração, sem Go templates. Convive com Helm em pipelines.

Em 2026 muitos projetos preferem Helm pra installs de terceiros (charts oficiais) e Kustomize pra config própria. Outros preferem Helm pra tudo.

**Argo CD** / **Flux**: GitOps — repo Git é fonte de verdade; controller syncs cluster com repo. Padrão moderno em times maduros.

### 2.18 Operators

CRD (Custom Resource Definition) + Controller. Permite estender K8s com objetos custom.

Operators famosos:
- **PostgreSQL Operator** (Crunchy, Zalando, CloudNativePG).
- **Strimzi** (Kafka).
- **cert-manager** (TLS).
- **Prometheus Operator**.
- **External Secrets Operator** (puxa de cloud secret stores).

Pattern Operator: o controller traduz "vontade" declarada (`Postgres { replicas: 3, version: 16 }`) em ações (criar StatefulSet, configurar replicação, gerenciar backups).

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

Migrar **Logística v1** pra K8s. Não significa abandonar Railway — significa demonstrar competência. Pode rodar em K3s local ou GKE Autopilot free tier.

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
   - Requests realistas baseados em load test (k6 do P01).
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
   - api expõe `/metrics` (instrumentado em A08); ServiceMonitor coleta.
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

- Liga com **N02** (OS): namespaces, cgroups são fundação dos pods.
- Liga com **N03** (network): CNI, services, kube-proxy, iptables.
- Liga com **P02** (Docker): mesma image; runtime CRI executa.
- Liga com **P04** (CI/CD): build → push registry → Argo CD sync.
- Liga com **P05** (AWS): EKS, ALB Ingress Controller, EBS CSI.
- Liga com **P06** (IaC): Terraform pra provisionar EKS, KubeAdm clusters.
- Liga com **P07** (observability): Prometheus, Grafana, OTel.
- Liga com **P08** (security): RBAC, NetworkPolicies, image scanning.
- Liga com **S04** (resilience): circuit breaker via mesh, retry policies.
- Liga com **S08** (services vs monolith): K8s habilita microservices que sem ele seriam impraticáveis.

---

## 6. Referências

- **Kubernetes docs** ([kubernetes.io/docs](https://kubernetes.io/docs/)).
- **"Kubernetes in Action"** — Marko Lukša (livro de referência).
- **"Kubernetes: Up & Running"** — Brendan Burns et al.
- **Helm docs** ([helm.sh/docs](https://helm.sh/docs/)).
- **Kustomize docs** ([kubectl.docs.kubernetes.io/references/kustomize](https://kubectl.docs.kubernetes.io/references/kustomize/)).
- **Argo CD docs** ([argo-cd.readthedocs.io](https://argo-cd.readthedocs.io/)).
- **CloudNativePG docs** ([cloudnative-pg.io](https://cloudnative-pg.io/)).
- **KEDA docs** ([keda.sh](https://keda.sh/)).
- **Cilium / Linkerd docs**.
- **CNCF landscape** ([landscape.cncf.io](https://landscape.cncf.io/)) — overview do ecossistema.
- **Kelsey Hightower, "Kubernetes the Hard Way"** ([github.com/kelseyhightower/kubernetes-the-hard-way](https://github.com/kelseyhightower/kubernetes-the-hard-way)).
