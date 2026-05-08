---
module: 03-05
title: AWS Core, IAM, VPC, EC2, 04-03, RDS, Lambda, ECS/EKS, CloudFront
stage: producao
prereqs: [01-02, 01-03, 03-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que IAM Roles são preferidas a IAM Users para serviços/aplicações em produção?"
    options:
      - "Roles têm permissions mais granulares que Users"
      - "Roles são identidades assumíveis, eliminando access keys long-lived embedded em código"
      - "Roles têm limite maior de policies anexadas"
      - "Users não suportam MFA, Roles suportam"
    correct: 1
    explanation: "Apps em EC2/ECS/Lambda assumem IAM role e recebem credenciais temporárias rotacionadas automaticamente. Sem access keys hardcoded ou em env vars que vazam em git/logs."
  - q: "Por que NAT Gateway é considerado uma 'armadilha invisível' de custo?"
    options:
      - "Cobra $32/mês fixo + $0.045/GB processed; workload com 10TB egress = $450/mês só de NAT"
      - "Tem latência inferior a 100ms cross-AZ"
      - "Conta dupla CPU em horários de pico"
      - "Não pode ser desligado sem destruir a VPC"
    correct: 0
    explanation: "Mitigação: VPC Endpoints (Gateway tipo S3/DynamoDB são FREE; Interface tipo ECR/Secrets são $0.01/h + $0.01/GB) substituem NAT pra serviços AWS, cortando 90% do custo."
  - q: "Em que cenário Lambda perde claramente para ECS Fargate?"
    options:
      - "Workloads com burst irregular pequeno"
      - "Workloads com throughput steady alto e long-running connections (WebSockets persistentes)"
      - "APIs REST simples"
      - "Processamento event-driven via SQS"
    correct: 1
    explanation: "Lambda tem 15min execution limit e é stateless (sem long-lived connections). Em volume alto e steady, custo Lambda supera Fargate. WebSockets exigem API Gateway WebSocket por cima, complicando."
  - q: "Qual o trade-off principal de S3 Express One Zone vs S3 Standard?"
    options:
      - "Express é mais lento porém mais barato em armazenamento"
      - "Sub-ms latência consistente e 50% menor custo de request, mas single-AZ (não durável cross-AZ) e 5x mais caro por GB-month"
      - "Express só funciona com KMS encryption obrigatória"
      - "Standard suporta versioning, Express não"
    correct: 1
    explanation: "S3 Express é single-AZ — perde dados em AZ outage. Use SÓ para data reconstruível: ML training shuffle, hot temp scratch, cache. Não para data durável."
  - q: "Por que `Compute Savings Plan 1-year no-upfront` é o default 2026 sobre Reserved Instances Standard?"
    options:
      - "Tem savings idêntico mas cobre EC2/Fargate/Lambda em qualquer região, com flexibilidade máxima"
      - "Funciona apenas para Graviton ARM"
      - "É grátis, RI custa upfront"
      - "Reserved só existe em us-east-1"
    correct: 0
    explanation: "Compute SP 1-year dá ~50-60% savings com flex pra trocar entre EC2/Fargate/Lambda. Standard RI 3-year só vale para workload comprovadamente steady por 3+ anos — raro em startup."
---

# 03-05, AWS Core

## 1. Problema de Engenharia

AWS é dominante em cloud enterprise e tem 200+ serviços. A maioria dos devs sabe usar 5: EC2 manualmente, 04-03 pra blob, RDS pra DB, Lambda pra "serverless", e por aí. Falta o modelo mental, IAM como espinha dorsal, VPC como rede, custo por bom uso vs custo por preguiça, decisões entre Lambda/Fargate/EKS, replicação multi-AZ, security groups, NAT gateways. Sem isso, você commit em arquitetura cara e frágil.

Este módulo cobre os primitives core. Não é "tutorial AWS", é mapa pra navegar 90% das decisões de cloud em projetos médios. Foco em decisões e princípios. Hands-on no desafio.

---

## 2. Teoria Hard

### 2.1 Modelo geral

AWS organizado em **regions** (geo) e **availability zones** (data centers isolados em uma região). High availability = multi-AZ. Disaster recovery = multi-region.

Recursos são por região (com exceções: IAM, Route 53, CloudFront, são globais).

Conta AWS é unidade de billing e isolation. Em organizações sérias, **AWS Organizations** com múltiplas contas (dev, staging, prod, security) e **Control Tower** pra governance.

### 2.2 IAM, espinha dorsal

**IAM** controla quem pode fazer o quê. Conceitos:
- **Users**: humanos (raramente recomendado em 2026; prefer SSO).
- **Groups**: agregam users.
- **Roles**: identidade assumível por serviços ou cross-account. **Default em prod**.
- **Policies**: JSON com permissions (Action, Resource, Effect, Condition).
- **Identity Center (SSO)**: federação centralizada.

Princípios:
- **Least privilege**: começa restrito; libera o necessário.
- **Roles, não users**: app rodando em EC2 assume IAM role; não armazena access keys.
- **OIDC pra CI**: GH Actions assume role via OIDC, sem keys long-lived.
- **MFA pra root**: e nunca usa root pra operação dia-a-dia.

Policies têm tamanho limite (6 KB inline, 6 KB managed default). Conditions poderosas: `aws:SourceIp`, `aws:RequestTag`, `aws:PrincipalOrgID`, `aws:MultiFactorAuthPresent`.

**IAM Access Analyzer**: detecta policies overly permissive.

### 2.3 VPC, rede

**VPC**: rede virtual privada na sua conta. Default VPC em cada região vem pronta; em prod, crie a própria.

Componentes:
- **Subnets**: subdivisão de IP range, por AZ. Public (route to IGW) ou Private.
- **Internet Gateway (IGW)**: route pra internet pra subnets públicas.
- **NAT Gateway**: subnets privadas saem pra internet via NAT (custo $$$).
- **Route Tables**: regras de roteamento por subnet.
- **Security Groups**: stateful firewall por instância. Allow rules apenas.
- **NACLs**: stateless firewall por subnet. Allow + deny.
- **VPC Endpoints**: comunicação privada com serviços AWS sem passar pela internet (04-03, ECR, Secrets Manager).
- **Transit Gateway / VPC Peering**: conectar VPCs.
- **VPN, Direct Connect**: hybrid com on-prem.

Padrão: 3 AZs com 1 subnet pública + 1 privada cada. Backend em privadas; ALB em públicas.

NAT Gateway custa ~$32/mês + $0.045/GB. Em projetos sensíveis a custo, considere VPC Endpoints pra 04-03/ECR/etc., reduzindo egresso via NAT.

### 2.3.1 VPC deep, onde Senior diverge de Pleno

Pleno conhece subnet/SG/NAT. Senior decide topologia, custos, e patterns avançados. Lacuna típica:

**Multi-VPC topology, quando você precisa:**
- **VPC peering**: conexão 1-pra-1, sem transitive routing. Bom pra 2-3 VPCs. Não escala, N² pares.
- **Transit Gateway (TGW)**: hub-and-spoke. 1 TGW conecta N VPCs + on-prem (via VPN/Direct Connect) + outras regiões. Custo: $0.05/hora por VPC attach + processing fees. Em multi-account real, TGW resolve. Suporta route tables segmentadas (prod isolada de dev mesmo no mesmo TGW).
- **Cloud WAN** (2024+): camada acima de TGW pra global multi-region. Mais cara, melhor pra dezenas de VPCs cross-region.

**PrivateLink, o que Pleno raramente domina:**
- VPC Endpoints clássicos: **Gateway** (04-03, DynamoDB) usam route table; **Interface** usam ENI dentro da sua VPC com IP privado.
- **PrivateLink avançado**: você expõe um **NLB** como serviço VPC. Outros VPCs (até de outras contas) consomem como Interface Endpoint. Pattern padrão pra **B2B SaaS**: cliente acessa seu serviço sem expor à internet.
- Custo: $0.01/hora por Endpoint + $0.01/GB processed. Usado bem, economiza muito vs NAT egress.

**Egress VPC pattern (multi-account):**
- 1 VPC dedicada pra egress (NAT Gateways, AWS Network Firewall, traffic inspection).
- Outras VPCs roteiam internet via TGW → egress VPC. Centraliza custo, controle, e logging.
- Reduz NAT GW de N (uma por VPC) pra ~3 (uma por AZ centralizada).

**IPv6 em 2026:**
- AWS cobra **$0.005/hora por IPv4 público**. IPv6 é grátis. Em 2026 vale dual-stack ou IPv6-only quando possível pra cortar custo significativo em fleets grandes.
- ALB, NLB, EC2 suportam IPv6 nativo. Lambda em VPC com IPv6 desde 2024.

**Security Groups vs NACLs, pegadinha:**
- SG é **stateful**: response automática. NACL é **stateless**: regra explícita pra response port (ephemeral 1024-65535).
- SG padrão: deny tudo, allow listas. NACL padrão default VPC: allow tudo.
- Pra **egress filtering** (impedir exfil de dados), SG outbound é o que importa. NACL ajuda em DDoS L4 (block IP range).

**VPC Lattice (2023+):**
- Service-to-service connectivity sem você gerenciar VPC peering/TGW. Application-layer (HTTP/gRPC).
- Concorrente direto de Service Mesh (Istio/Linkerd) pra cenários AWS-only.
- Custo razoável; vale considerar antes de stack mesh complexa.

**Endpoint Policies, controle granular:**
- VPC Endpoint pode ter policy IAM-like restringindo o que você acessa via aquela rota.
- Pattern: bucket 04-03 só acessível via PrivateLink + bucket policy reforça (defesa em profundidade).

**Custos típicos de networking esquecidos:**
- **NAT Gateway egress**: linha mais cara em fatura de muitos times. ~$0.045/GB. 1TB/mês = $45 só em egress.
- **AZ-cross traffic**: $0.01/GB ao mover entre AZs. ALB → target em outra AZ. Multi-AZ RDS replicação.
- **Region-cross**: $0.02-0.09/GB. Cuidado com cross-region replication automática sem necessidade.

### 2.4 EC2

VMs. Tipos:
- **General**: t (burstable), m (balanceado).
- **Compute**: c.
- **Memory**: r.
- **Storage**: i, d.
- **Accelerated**: g, p, inf (GPUs/ML).
- **Spot**: até 90% off por capacidade descartável.
- **Reserved / Savings Plans**: comitments 1-3 anos.

Em 2026 muita carga foi pra serverless ou container. EC2 ainda é base; you'll provision when running K8s self-managed, custom AMIs, etc.

EBS: storage block. Tipos: gp3 (default, balanced), io2 (high IOPS), st1 (throughput optimized). Snapshots, encryption.

### 2.5 04-03, object storage

Bucket → object key. Bytes ilimitados (per object 5 TB).

Storage classes:
- **Standard**: default.
- **Intelligent-Tiering**: AWS move automaticamente. Default pra projetos novos.
- **Standard-IA**: infrequent access.
- **Glacier Instant / Flexible / Deep Archive**: archive, retrieval lento.

Features:
- **Versioning**: keep histórico.
- **Lifecycle policies**: mover/expirar.
- **Replication**: cross-region.
- **Bucket policies + ACLs**: prefer bucket policies; ACLs deprecated.
- **Block Public Access**: ative em todas contas.
- **Server-side encryption**: SSE-04-03 (default), SSE-KMS, SSE-C.
- **Pre-signed URLs**: acesso temporário sem dar credentials.
- **Object Lambda**: transformação on-the-fly em GET.
- **Event notifications**: 04-03 → SNS/SQS/Lambda em PUT/DELETE.

Pricing: storage + requests + egress (egress é o caro). CloudFront na frente reduz egress.

### 2.6 RDS e Aurora

**RDS**: managed Postgres, MySQL, MariaDB, Oracle, SQL Server. Backup automático, multi-AZ, read replicas.

**Aurora**: AWS-built engine compatível Postgres/MySQL. Storage layer custom (replication ao nível dele), faster failover, auto-scaling storage. Premium price.

**Aurora Serverless v2**: scales capacity unit. Custo fixo+variável. Bom pra workloads variáveis.

Decisão típica:
- Pequeno-médio: RDS Postgres com Multi-AZ.
- High-availability + read scale: Aurora Postgres.
- Dev/staging: instância barata, sem multi-AZ.

### 2.7 ElastiCache

Managed Redis (compatível com Redis OSS / Valkey) e Memcached.

- **Redis Cluster mode**: sharding nativo.
- **Multi-AZ replicas**: failover.
- **Backup snapshots** opcionais.

Em 2026 AWS oferece **MemoryDB** também, Redis-compat com persistência multi-AZ stronger (durable, RPO 0). Mais cara.

### 2.8 Lambda

FaaS. Function executa em response a evento. Runtimes built-in (Node, Python, Java, Go, Ruby, .NET) ou custom (container image até 10 GB).

Modelo:
- Cold start: primeira execution após idle. Otimizar pra Node ~100-300ms; pra container, 500ms-2s.
- Warm reuse: container fica vivo por minutos. Module-level state persiste (sem garantir).
- Concurrency: cada request invoca container; aumenta concurrency até limit (default 1000 por região, ajustável).
- **Provisioned concurrency**: pre-warmed pra evitar cold start. Custo extra.

Triggers: API Gateway, ALB, 04-03, SQS, EventBridge, DynamoDB Streams, etc.

Limitations:
- 15 min execution.
- 10 GB memory max.
- Stateless (ext storage via 04-03, EFS, DynamoDB).
- No long-lived connections (WS impossível direto; API Gateway WebSocket compensa).

Custo: per request + per ms de execution. Free tier generoso; em volume alto, comparar com Fargate.

### 2.9 ECS / Fargate / EKS

Container orchestration AWS:
- **ECS** (Elastic Container Service): orchestrator AWS-native. Concepts: task definition, service, cluster.
- **Fargate**: serverless compute pra ECS e EKS. Sem nodes pra gerenciar.
- **EKS** (Elastic Kubernetes Service): managed K8s. Você opera nodes (EC2 ou Fargate).
- **EKS Auto Mode** (2024+): managed nodes + addons. Step further toward K8s without ops.

Decisão:
- Container 1-5 serviços, time pequeno: ECS + Fargate.
- Containers 10+ ou multi-team, ecosystem K8s: EKS.
- Burst irregular pequeno: Lambda.
- Steady throughput: Fargate.

### 2.10 API Gateway e ALB

- **API Gateway**: HTTP/REST + WebSocket. Auth (Cognito, custom), throttling, mapping. Caro em volumes altos.
- **API Gateway HTTP API**: subset cheaper, lambda/HTTP integration. 70% mais barato que REST API.
- **ALB**: L7 load balancer. Path/host routing. Lambda target. Geralmente vence pra HTTP simples.
- **NLB**: L4. TCP/UDP, alta throughput.
- **CloudFront**: CDN. Edge locations globais. TLS termination, cache, WAF.

Padrão pra app: CloudFront → ALB → ECS/Fargate ou Lambda.

### 2.11 EventBridge, SQS, SNS, Kinesis

- **SQS**: queue. Standard (at-least-once, sem ordem) ou FIFO (ordenada, exactly-once com dedup).
- **SNS**: pub/sub topics. Fan-out pra múltiplos subscribers (SQS, Lambda, HTTP).
- **EventBridge**: event bus, schema registry, rules. Pra event-driven com filtering rico. Default pra novos projetos.
- **Kinesis Data Streams**: streaming append-only, partition by key. Tipo Kafka, AWS-native.
- **Kinesis Firehose**: pipe to 04-03/Redshift/OpenSearch.
- **MSK**: managed Kafka.

### 2.12 DynamoDB

NoSQL key-value/document. Single-digit ms latency em qualquer escala.

- Partition key + (opcional) sort key.
- GSI (Global Secondary Index): índices em outros campos.
- LSI (Local): mesmo partition, sort diferente.
- On-demand vs provisioned capacity.
- DAX: cache em memória.
- Streams: change data capture.
- TTL automático.

Bem usado, é foundational. Mal usado, vira Postgres caro com SQL fraco. Depende de modelar pra access patterns conhecidos.

### 2.13 Cognito

Auth managed: User Pools (signup/login/MFA), Identity Pools (federation). Concorrente com Auth0/Clerk.

Em 2026, Cognito tem APIs limitadas e DX inferior a Clerk/Auth0. Usado quando custo é decisivo ou compliance força AWS.

### 2.14 Secrets Manager e Parameter Store

- **Secrets Manager**: secrets com rotation automática (DBs, API keys). $0.40/secret/mês + API calls.
- **SSM Parameter Store**: hierarchical params. Standard (free) e Advanced ($).

Em apps típicos, Parameter Store cobre 80% dos casos a custo zero.

### 2.15 CloudWatch

Logs, metrics, alarms.
- **Logs**: ingestion + retention. Pricing por GB.
- **Metrics**: 15-month retention, granular. Custom metrics caros em volume.
- **Alarms**: trigger SNS/Lambda em threshold.
- **Logs Insights**: query language pra logs.
- **Container Insights / Lambda Insights**: dashboards pré-prontos.

Em 2026, muitos projetos pipan logs/metrics pra Datadog/Grafana Cloud e mantêm CloudWatch leve.

### 2.16 IAM em ação

Pattern: app rodando em ECS task → task role IAM → permissions explicitas.

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::logistica-uploads/*"
}
```

Anti-padrões:
- `Action: "*"` ou `Resource: "*"` em tudo.
- Embeddar access keys em código.
- Usar root credentials.

### 2.17 Custos

Surpresas comuns:
- **Egress**: $0.09/GB out pra internet. CDN reduz.
- **NAT Gateway**: $32/mês fixo + $0.045/GB.
- **CloudWatch Logs**: $0.50/GB ingestion. Logs verbose explodem custo.
- **Lambda + RDS**: cada invocation faz cold start de connection. Use RDS Proxy.
- **04-03 Storage class errado**: Standard pra archive vira caro.
- **EC2 idle**: t.medium dev box esquecida $30/mês.

**Cost Explorer**, **Budgets**, **Trusted Advisor** ajudam. **AWS Cost Anomaly Detection** detecta picos.

### 2.18 Multi-account org

Em orgs sérias:
- Account "management" (billing, Org).
- Account "security" (CloudTrail, GuardDuty, audit logs).
- Account "shared services" (Route53, ECR central).
- Accounts por env (dev, staging, prod) e/ou por team.

**SSO** (Identity Center) federa users em todas contas com roles específicas.

### 2.19 FinOps e cost engineering

Pleno conhece "monitorar fatura". Senior pratica **FinOps**: disciplina de unit economics em cloud. Em 2025-2026 virou skill obrigatória pra quem opera infra.

**Conceitos centrais:**
- **Unit cost**: $ por unidade de business (per request, per active user, per GB processed). Métrica que importa, não fatura absoluta.
- **Cost allocation tags**: tag tudo (`team`, `service`, `env`). AWS Cost Explorer + tags = breakdown real. Sem tags, fatura é black box.
- **Budgets + alerts** (AWS Budgets): alarmes em $X% do mês esperado. Catch surge antes do CFO catch.
- **Reserved Instances vs Savings Plans**: SP é mais flexível (cobre EC2/Fargate/Lambda em qualquer região). 1-year ou 3-year, no/partial/all upfront. Tipicamente 30-60% off on-demand.
- **Spot**: instâncias interruptíveis, ~70-90% off. Use pra workloads tolerantes (batch, CI, stateless web com graceful drain).

**Padrões de waste em produção:**
- **Idle resources**: NAT GW idle, RDS dev rodando full-time, EBS volumes detached, snapshots órfãos.
- **Over-provisioning**: CPU usado < 20% mas instância dimensionada pro pico. RightSize via CloudWatch ou Compute Optimizer.
- **Cross-AZ traffic gratuito assumido**: $0.01/GB. Multi-AZ RDS replication, ALB → target em AZ diferente.
- **Egress sem PrivateLink**: dados saindo via NAT vs VPC endpoint.
- **Logs over-retentioned**: CloudWatch Logs $0.50/GB ingest + storage. Tiered: hot 1 dia, 04-03 30 dias, Glacier após.

**Tools de FinOps:**
- **AWS Cost Explorer** (built-in): breakdowns, forecasts, recommendations.
- **AWS Compute Optimizer**: rightsizing automático.
- **CUR (Cost and Usage Reports)**: dump completo em 04-03, query via Athena.
- **Vantage, Cloudability, CloudHealth, ProsperOps**: third-party dashboards.
- **OpenCost** (CNCF): K8s-aware cost allocation.

**Métricas de programa de FinOps:**
- Cloud spend / revenue ratio (ideal < 10% pra SaaS, < 30% pra AI startup).
- Reserved coverage % (target > 70% em compute estável).
- Spot adoption % em workloads compatíveis.
- Idle resource $ recovered/quarter.

**Padrão pragmático:**
1. Tag everything em IaC desde o dia 1 (Terraform default tags).
2. Setup Budgets em $50% e $80% do esperado por month.
3. Monthly cost review (1h/mês): top 5 services, top 5 growth, anomalies.
4. Quarterly: Compute Optimizer recommendations + Reserved/Savings refresh.

### 2.20 Sustainability (Green software)

Em 2025-2026 virou signal de maturidade técnica em diversos contextos (consumer-facing brands, EU GDPR + sustainability reporting, talent attraction). Não é só "marketing", tem decisões técnicas reais.

**Princípios (Green Software Foundation):**
- **Carbon efficiency**: minimizar emissões por unit work.
- **Energy efficiency**: minimizar energia consumida.
- **Carbon awareness**: rodar quando grid está mais limpo.
- **Hardware efficiency**: aproveitar hardware existente (cloud > underutilized on-prem).

**Métricas:**
- **gCO₂eq/request** (gramas CO2 equivalente por request).
- **gCO₂eq/user-month**.
- **PUE** (Power Usage Effectiveness) do data center.

**Decisões técnicas com impact:**
- **Region choice**: AWS us-west-2 (Oregon, hydropower-heavy) emite ~10x menos CO2 que us-east-1 (Virginia, gas-heavy). Mesmo workload.
- **Time-shifting**: jobs batch quando grid é renovável (Cloud Carbon Footprint API mostra forecast).
- **Right-sizing**: instance idle = energia desperdiçada. FinOps e sustainability se sobrepõem 80%.
- **Static site / cache**: page renderizado 1x e servido N vezes via CDN consume ~100x menos que SSR per request.
- **Image/asset optimization**: WebP/AVIF reduz transferred bytes (network energy).
- **Database query efficiency**: query unindexed = N⁰ inéfico = N⁰ joules.

**Tools/specs:**
- **Cloud Carbon Footprint** (open-source): estimativas por cloud.
- **AWS Customer Carbon Footprint Tool**: built-in console.
- **GCP Carbon Footprint dashboard**: emissions per project.
- **Website Carbon Calculator**: gCO2/page load.
- **Green Software Foundation** (GSF): standards, certificações.

**Como integrar em practice:**
- **Carbon budget per service**: similar a SLO, mas pra sustentabilidade. Alarme quando ultrapassa.
- **Sustainability checklist em design review**: caching, region choice, right-sizing default.
- **PR template item**: "Esta mudança aumenta ou reduz consumo de recurso? Por quê?".

Pra muitos times é prematuro. Pra times em B2C, governance forte, ou EU compliance: já é parte do trabalho.

### 2.21 AWS cost optimization deep — Reserved/Savings Plans, Spot, S3 storage classes, NAT Gateway armadilha, egress

AWS bill em Logística pode ser optimizado 40-70% sem mudar arquitetura. 5 alavancas: (1) Reserved Instances / Savings Plans (savings 30-72%), (2) Spot pra workloads tolerantes (savings 50-90%), (3) S3 storage classes lifecycle (savings 40-95%), (4) NAT Gateway armadilha ($0.045/GB processed!), (5) Egress (cross-region $0.02/GB; internet $0.09/GB). Esta seção entrega cost engineering production-ready com numbers reais 2026.

**Compute savings — RI vs Savings Plans (2026):**

| Plan | Savings | Commitment | Flexibilidade |
|---|---|---|---|
| **Standard RI** | até 72% | 1 ou 3 anos | Lock instance type+region |
| **Convertible RI** | até 66% | 1 ou 3 anos | Trocar instance family |
| **Compute Savings Plan** | até 66% | 1 ou 3 anos | Qualquer EC2/Fargate/Lambda em qualquer região |
| **EC2 Instance Savings Plan** | até 72% | 1 ou 3 anos | Family + region locked |
| **SageMaker Savings Plan** | até 64% | 1 ou 3 anos | SageMaker only |

- **Recomendação 2026 default**: **Compute Savings Plan 1-year no-upfront** — 50-60% savings, máxima flex.
- **Quando RI Standard 3-year**: workload comprovadamente steady por 3+ anos (rare em startup).

**Spot — savings 50-90% mas instances podem morrer:**

```bash
# Spot pra batch jobs / stateless workers
aws ec2 run-instances \
  --instance-market-options 'MarketType=spot,SpotOptions={MaxPrice=0.05,InstanceInterruptionBehavior=terminate}' \
  --instance-type m6i.xlarge \
  --image-id ami-...
```

- **Quando vence**: stateless processing, batch jobs, CI runners, ML training, dev/staging environments.
- **Quando NÃO**: stateful DB primary, single-user SaaS, anything user-facing sem fallback.
- **Spot interruption notice**: 2 minutos antes de terminate via instance metadata. Apps tem que escutar e drain.
- **EKS Karpenter**: auto-bid spot + on-demand mix; reagrupa pods em interruption.
- **Spot Fleet** (legacy) vs **EC2 Fleet** (current): Fleet flexibilizes instance types.

**S3 storage classes — lifecycle pra savings 40-95%:**

| Class | $/GB/mês 2026 | Acesso | Latency | Quando |
|---|---|---|---|---|
| Standard | $0.023 | Frequente (> 1x/mês) | ms | Hot data |
| Standard-IA | $0.0125 | < 1x/mês | ms | Logs 30-90 dias |
| One Zone-IA | $0.01 | < 1x/mês, replicable | ms | Re-creatable thumbnails |
| Glacier Instant Retrieval | $0.004 | Quarterly | ms | Old archives instant access |
| Glacier Flexible | $0.0036 | < 1x/ano | minutes-hours | Compliance archives |
| Glacier Deep | $0.00099 | < 1x/ano | 12h | Cold archives |
| Intelligent-Tiering | $0.023 → varia | Auto-tiers | ms | Unknown access pattern |

Logística lifecycle policy:

```json
{
  "Rules": [{
    "Id": "tracking-pings-archive",
    "Status": "Enabled",
    "Filter": { "Prefix": "tracking-pings/" },
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 }
  }]
}
```

- **Pegadinha**: Standard-IA charges minimum 30 days storage + 128KB minimum. Migrar arquivo de 1KB pra IA = anti-savings.

**NAT Gateway — a armadilha invisível ($0.045/GB processed):**

- Se app em private subnet → NAT GW → Internet, paga **$0.045/GB**. Workload com 10TB egress/mês = $450 só de NAT.
- **Solução 1: VPC Endpoints** pra serviços AWS:
  ```
  S3, DynamoDB → Gateway endpoints (FREE, no charge per GB)
  ECR, Secrets Manager, KMS, etc → Interface endpoints ($0.01/hour + $0.01/GB)
  ```
- **Solução 2: NAT Instance** (EC2 pra fazer NAT): single instance ~$5/mês + transfer cost normal $0.09/GB. Vence se NAT < 50GB/mês.
- **Logística check**: rode `aws ce get-cost-and-usage --filter "DIMENSION/SERVICE=AmazonNatGateway"` mensal — surpresa garantida.

**Data egress — o dragão silencioso:**

| Origem → Destino | $/GB |
|---|---|
| EC2 → Internet | $0.09 |
| EC2 → CloudFront | $0.00 (free pra CF tier 1) |
| EC2 → outra AZ mesma região | $0.01 |
| EC2 → outra região | $0.02 |
| S3 → Internet | $0.09 |
| S3 → CloudFront | $0.00 |

Logística action items:

- Servir static assets via CloudFront (free egress + cache).
- Cross-AZ traffic: redesign pra single-AZ se latency permite (mas perde HA).
- Multi-region replication: data transfer custa real.
- Stripe webhooks chegando do internet → seu API: incoming gratis. Outbound de você → Stripe API call = pago.

**CloudFront — egress savings + perf:**

- Free tier 1TB/mês egress (2026 update).
- $0.085/GB depois (vs S3 $0.09 direto). Savings + cache + edge POPs.
- Cache hit rate > 90% típico pra static assets → reduz origin cost também.
- **Pegadinha**: CloudFront cache key inclui Host header; subdomains diferentes = cache separado.

**Lambda cost optimization:**

- **Memory tuning**: Lambda billa per GB-second. Sometimes 1024MB memory roda 2x mais rápido que 512MB → 50% menos billed time.
  - Use **AWS Lambda Power Tuning** tool (open source) pra encontrar sweet spot.
- **Provisioned Concurrency** pra latency-sensitive: paga $0.00001520/GB-second sempre. Vale só se cold start > 200ms é unacceptable.
- **ARM Graviton** (`arm64`): 20% cheaper, often faster que x86.
- **Lambda SnapStart** (Java only): reduz cold start 10x; paga $0.0000178/GB-second.

**Database cost — RDS / Aurora:**

- **Aurora Serverless v2**: scales 0.5 ACU → 128 ACU. 1 ACU = 2GB RAM + ~equivalente CPU. $0.12/ACU-hour.
- **Reserved Aurora 1-year**: 35% savings vs on-demand.
- **Read replicas em outra AZ**: data transfer cross-AZ $0.01/GB = pode dominar bill em high-throughput.
- **Aurora I/O-Optimized** (2023+): pricing alternativo sem charge per I/O. Vence se > 25% bill é I/O.
- **Backup retention**: cobra storage além da retention default. Set policy.

**FinOps tooling — visibility é prerequisite:**

- **Cost Explorer**: free, AWS native. Filter por tag, service, region.
- **AWS Budgets**: alertas em projetado/actual.
- **Cost Anomaly Detection**: ML-based; pega spike inesperado em 24h.
- **CUR (Cost & Usage Report)**: dump em S3, query com Athena. Single source pra dashboards custom.
- **Vantage / Cloudability / Apptio**: SaaS FinOps; multi-cloud + recommendations + chargeback.
- **infracost** (open source): show $ delta em PR de Terraform. PR review com cost visible.

**Tagging strategy obrigatória pra cost attribution:**

```hcl
# terraform tags em TODO recurso
tags = {
  Environment = "prod"
  Project     = "logistica"
  Owner       = "platform-team"
  CostCenter  = "engineering"
  Service     = "orders-api"
}
```

- Sem tags: bill de $40k/mês indistinguível por team/feature/env.
- Activate cost allocation tags em Billing console (auto após 24h).

**Logística — saving stack típico (60% reduction):**

```
Before: $40k/mês AWS bill
Actions:
  1. Compute Savings Plan 1y → -50% on EC2 ($12k → $6k)
  2. Spot pra Karpenter dev/staging → -75% ($4k → $1k)
  3. S3 lifecycle pra tracking-pings archive → -80% storage ($2k → $400)
  4. VPC Endpoints (S3+DDB+ECR) substituindo NAT → -90% NAT ($800 → $80)
  5. CloudFront pra static assets → -100% egress de assets ($1.5k → free)
  6. Aurora Serverless v2 vs reserved m6g.xlarge → -40% off-peak ($2k → $1.2k)
  7. ARM Graviton em workers → -20% ($1.5k → $1.2k)

After: ~$15k/mês (-62%)
ROI engineering: ~2 semanas focused work; payback < 1 mês.
```

**Anti-patterns observados:**

- **No tagging**: cost attribution impossible; bill explica nada.
- **NAT Gateway pra TUDO**: $0.045/GB compounds; VPC Endpoints free pra S3/DDB.
- **S3 sem lifecycle**: tracking pings 90 dias → 7 anos em STANDARD = $5k/mês em storage que poderia ser $200.
- **Reserved 3-year em workload de 6-meses**: lock perdido; wasted commitment.
- **Spot em workload critical sem fallback**: interruption = downtime.
- **EBS gp2** em vez de gp3 (default 2026): gp3 30% cheaper + better IOPS baseline.
- **CloudWatch Logs sem retention**: cobra $0.03/GB-month indefinidamente; set retention 30-90 dias.
- **Idle resources**: EC2 stopped ainda cobra EBS; Elastic IPs unattached cobram $0.005/hora.
- **Cross-region replication "pra HA"**: $0.02/GB transfer + $0.023/GB storage 2x.
- **Lambda max memory "porque sempre"**: tune via Power Tuning; sweet spot tipicamente 512-1024MB.

Cruza com **03-05 §2.17** (custos foundation), **03-05 §2.19** (FinOps), **04-09 §2.14** (cost ao scale geral), **04-16 §2.16** (cost optimization patterns business-level), **03-02 §2.20** (Docker secrets em S3 → use Secrets Manager pra evitar S3 cost).

---

### 2.22 Lambda runtime tuning + EventBridge schemas + Step Functions vs Lambda choreography

Senior+ owns serverless deep: runtime trade-offs, cold start mitigation, event-driven design schema-first, e quando orquestrar (Step Functions) vs coreografar (Lambda + EventBridge). Decisões aqui mudam latência P99 em 10x e custo mensal em ordens de grandeza.

**Lambda runtime decision 2026** (escolha por workload, não por familiaridade):

- **Node.js 22 LTS** (default web/API): ecosystem npm gigante; JIT warmup ~50-100ms; bundle ESBuild para cortar.
- **Python 3.13** (data/ML): PyArrow + numpy nativos rápidos; SnapStart suportado 2025+.
- **Java 21 + SnapStart**: cold start ~200ms (era 2-5s sem snapshot); enterprise legacy + Spring Cloud Function.
- **Go 1.x via custom runtime (`provided.al2`)**: cold start ~50-100ms; binário ~10MB; alta concorrência.
- **Rust via `cargo-lambda`**: cold start ~10-30ms (menor da indústria); binário ~5MB; growing forte 2026.
- **Bun runtime**: Lambda Layer experimental 2025+; cold start competitivo com Node mas ecosystem ainda maduro.

**Cold start optimization** (memory drives CPU):

- Lambda aloca vCPU proporcional à memory: 256MB ~0.16 vCPU; 1769MB = 1 vCPU full; 3008MB ~2 vCPUs; 10240MB ~6 vCPUs.
- **AWS Lambda Power Tuning** (Step Function open-source): roda função em N memory configs, plota cost × latência → sweet spot.
- **Provisioned Concurrency**: instâncias pre-warmed; elimina cold start; ~$0.0000041/GB-second provisionado + execução normal. Use só em high-traffic previsível.
- **SnapStart** (Java 21+, Python 3.12+): snapshot do init state; cold start 10x mais rápido; gratuito.
- Pattern Logística: `provisioned_concurrency = 3` em `/api/orders` (tráfego constante); on-demand em `/webhooks/*` (irregular, custo provisionado não compensa).

**Lambda Function URL vs API Gateway**:

- **Function URL**: HTTPS endpoint direto na Lambda; sem overhead API Gateway; pricing simples (só Lambda).
- **API Gateway HTTP API v2**: $1/1M requests; custom domains, JWT auth, throttling, WAF, CORS managed. Default 2026.
- **API Gateway REST API**: legado; $3.50/1M requests (3.5x); raramente justificado sobre HTTP API v2 em 2026 (só se precisa request validation avançada ou usage plans).
- **App Runner / ECS Fargate**: alternativa para serviços long-running além do limite Lambda 15min ou que precisam websocket persistente.

**Lambda Powertools** (TS 2+ / Python) — production-grade utilities, abandone helpers caseiros:

```ts
import middy from '@middy/core';
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit, logMetrics } from '@aws-lambda-powertools/metrics';
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';

const logger = new Logger({ serviceName: 'orders-api' });
const tracer = new Tracer({ serviceName: 'orders-api' });
const metrics = new Metrics({ namespace: 'Logistica', serviceName: 'orders-api' });
const persistenceStore = new DynamoDBPersistenceLayer({ tableName: 'idempotency-store' });

const businessLogic = async (event: { body: { orderId: string; tenantId: string } }) => {
  logger.info('Processing order', { orderId: event.body.orderId });
  metrics.addMetric('OrderCreated', MetricUnit.Count, 1);
  // business logic
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

export const handler = middy()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: false }))
  .use(logMetrics(metrics))
  .handler(makeIdempotent(businessLogic, { persistenceStore, dataKeywordArgument: 'event' }));
```

Structured logs JSON correlation-id ready para CloudWatch Logs Insights; tracing X-Ray automático; metrics EMF zero-cost (parsing CloudWatch native); idempotency DynamoDB-backed (cruza com **04-02 §2.18**).

**EventBridge fundamentals**:

- **Event bus** (default + custom buses): pub/sub para eventos AWS-native + custom apps.
- **Rules**: pattern match em event JSON → routing para targets (até 5 por rule).
- **Targets**: Lambda, SQS, SNS, Step Functions, Kinesis, API destinations (HTTP externo), Firehose, etc.
- **Schema Registry**: discover automático de schemas via traffic; versioning; auto-gen de TypeScript/Java/Python bindings via `aws schemas put-code-binding`.
- **Archive + Replay**: retain eventos 14d-1y; replay subset por filtro temporal/pattern para debug ou reprocessamento pós-bug.

**Schema-first event design (Logística)**:

```json
{
  "Source": "logistica.orders",
  "DetailType": "OrderPlaced",
  "Detail": {
    "version": "1.0",
    "orderId": "ord-123",
    "tenantId": "tenant-abc",
    "items": [{ "sku": "BOX-A", "qty": 2 }],
    "totalCents": 12500,
    "placedAt": "2026-05-06T14:00:00Z"
  }
}
```

Registre schema em EventBridge Schema Registry → CI gera bindings TypeScript → consumers importam type. Toda mudança breaking incrementa `version`; consumers validam antes de processar. Sem schema registry, qualquer mudança em provider quebra consumers silenciosamente em produção.

**EventBridge Pipes** (2022+) — substitui glue Lambdas:

- Modelo `source → filter → enrich → target` com zero ou mínimo código.
- Pattern: SQS queue (source) → filter (only `eventType = "OrderPlaced"`) → enrichment Lambda (carrega tenant config) → Step Function (target).
- Elimina dezenas de "lambdas-conectoras" que só roteiam eventos. Menos código = menos bugs = menos cost.

**Step Functions vs Lambda choreography**:

- **Lambda choreography** (event-driven): cada Lambda emite evento; consumers reagem. Loose coupling. Hard de visualizar fluxo end-to-end. Debugging via correlation-id em logs distribuídos.
- **Step Functions** (orchestration): state machine ASL JSON; visual workflow no console; retry + catch + parallel + map + wait built-in; histórico de execução por instância.
- **Use Step Functions quando**: workflow multi-step com branches/retries (saga), execução > 15min, visibilidade de estado crítica (compliance/audit), human approval steps.
- **Use Lambda choreography quando**: simple async fan-out, execução curta, loose coupling preferido, equipes independentes deployment-isoladas.

**Step Functions example — Logística order saga**:

```json
{
  "Comment": "Order Placement Saga",
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:111111111111:function:ReserveInventory",
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "OrderFailed" }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:111111111111:function:ChargePayment",
      "Retry": [{ "ErrorEquals": ["PaymentRetryable"], "IntervalSeconds": 5, "MaxAttempts": 5, "BackoffRate": 2.0 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "ReleaseInventory" }],
      "Next": "AssignCourier"
    },
    "AssignCourier": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:111111111111:function:AssignCourier",
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "RefundPayment" }],
      "Next": "OrderConfirmed"
    },
    "OrderConfirmed": { "Type": "Succeed" },
    "RefundPayment": { "Type": "Task", "Resource": "arn:aws:lambda:us-east-1:111111111111:function:RefundPayment", "Next": "ReleaseInventory" },
    "ReleaseInventory": { "Type": "Task", "Resource": "arn:aws:lambda:us-east-1:111111111111:function:ReleaseInventory", "Next": "OrderFailed" },
    "OrderFailed": { "Type": "Fail", "Cause": "OrderProcessingFailed" }
  }
}
```

Compensações rodam em ordem reversa (saga pattern, cruza com **04-02 §2.18** e **04-04**). `Retry` antes de `Catch`; backoff exponencial built-in; sem código de orquestração custom.

**Cost Step Functions**:

- **Express** (< 5min, high-volume): $1/1M state transitions equivalente; sem histórico de execução retido (logs via CloudWatch). Default para sub-fluxos chamados por API.
- **Standard** (long-running, audit): $25/M state transitions; histórico completo retido 90 dias; visualização console por execução. Default para sagas auditáveis.

**Logística applied serverless stack**:

- **API Gateway HTTP API v2** + Lambda (Node.js 22, 1024MB tuned via Power Tuning) para `/api/*`.
- **EventBridge custom bus** `logistica-events` para eventos cross-service; schemas versionados no Schema Registry.
- **Step Functions Standard** para `order-saga` (multi-step transacional auditável).
- **EventBridge Pipes** para SQS → enrichment → Step Functions trigger.
- **Lambda Powertools** em todas as funções (logs estruturados + idempotency DynamoDB + metrics EMF).
- **Provisioned Concurrency = 3** em orders-api; on-demand em webhook handlers.
- **Cost típico**: $50-200/mês para 10k orders/dia (Lambda + Step Functions Standard + EventBridge + DynamoDB idempotency).

**Anti-patterns observados**:

- Lambda 256MB em CPU-bound work: lento, custa mais (mais tempo × menos CPU); bump pra 1769MB sweet spot via Power Tuning.
- Provisioned Concurrency em low-traffic Lambda: custo fixo > economia cold start; on-demand fine.
- REST API Gateway em vez de HTTP API v2: 3.5x cost para mesma feature em 95% dos casos.
- Lambda choreography em workflow com 5+ steps: debugging nightmare distribuído; migra para Step Functions.
- Step Functions Standard em simple 2-step flow: over-engineered; use Express ou direct Lambda chain.
- EventBridge sem Schema Registry: consumers quebram silenciosamente em provider change; sem governança.
- Lambda sem Powertools structured logs: CloudWatch unstructured = grep manual = unsearchable em scale.
- Lambda Layer com 50+ deps inflado: cold start penalty; tree-shake ESBuild bundle por função.
- DynamoDB stream → Lambda → DynamoDB write: write amp 2x; use EventBridge Pipes com filter para evitar.
- SnapStart desabilitado em Java/Python Lambda: cold start 10x maior evitável; flag gratuita.

Cruza com **03-05 §2.21** (cost optimization compute layer), **04-08 §2.22** (Strangler Fig migration usa EventBridge para coexistência), **04-04** (Step Functions resilience, retry/catch states), **04-02 §2.18** (idempotent consumer DynamoDB-backed em Lambda Powertools), **02-08** (frameworks backend, Lambda Powertools como middleware pattern).

---

### 2.23 AWS modern stack 2026 — Bedrock GenAI, EventBridge Pipes, S3 Express One Zone, Graviton 4, Aurora Limitless, Step Functions Distributed Map

Portfólio AWS reorganizou-se 2023-2026 em torno de cinco eixos: **GenAI gerenciada via Bedrock** (foundation models multi-vendor sem GPU ops), **event mesh serverless via EventBridge Pipes** (source→filter→enrichment→target substitui ~80% das glue Lambdas), **storage tier sub-ms via S3 Express One Zone** (single-AZ, latência consistente <10ms p99, hot data ML/cache), **economia ARM dominante via Graviton 4** (R8g GA Q4 2024, 40% melhor perf/$ vs x86), **sharding transacional via Aurora Limitless Database** (GA Q4 2024, single endpoint sobre múltiplos shards Postgres). Quem opera AWS legado (EC2 + RDS single-writer + glue Lambda + Python x86) perde 30-50% de custo e 5-10x latência vs stack 2026 equivalente. Não é refactor opcional — é a baseline competitiva.

**Bedrock GenAI stack — foundation models como managed service.** Bedrock GA Q3 2023, Bedrock Agents + Knowledge Bases GA Q4 2023, Guardrails GA Q2 2024. Claude 3.7 Sonnet on Bedrock Q1 2025, Claude 4 family 2025. Quatro pilares:

- **Foundation models multi-vendor**: Claude (Anthropic), Llama (Meta), Titan (AWS), Mistral, Cohere, Stability — sem provisionar GPU, billed por token.
- **Knowledge Bases**: managed RAG. Source = S3 (PDFs, MD, JSON). Backend vector store = OpenSearch Serverless, Pinecone, Aurora pgvector. Chunking strategy configurável (fixed, semantic, hierarchical). API `retrieve_and_generate` retorna resposta + citations.
- **Agents**: orchestration LLM com action groups (Lambda invocations), session memory, prompt templates. Antecede o padrão MCP (cf. **04-10 §2.23**) — same pattern, AWS-managed runtime.
- **Guardrails**: content filters (hate, sexual, violence), PII redaction (SSN, CPF custom regex), denied topics, contextual grounding (detecta hallucination vs source).

```python
# Bedrock InvokeModel — Claude 3.7 Sonnet
import boto3, json
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
resp = bedrock.invoke_model(
    modelId="anthropic.claude-3-7-sonnet-20250219-v1:0",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "Resume o pedido #1234"}],
    }),
)
print(json.loads(resp["body"].read())["content"][0]["text"])

# Knowledge Base — RAG turnkey
agent = boto3.client("bedrock-agent-runtime")
out = agent.retrieve_and_generate(
    input={"text": "Como cancelar entrega?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": "KB-ABCD1234",
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0",
        },
    },
)
print(out["output"]["text"], out["citations"])
```

**EventBridge Pipes — service-to-service ETL low-code.** GA Q4 2022, agora maduro. Quatro estágios: **source** (SQS, Kinesis, DynamoDB Streams, MSK, MQ), **filter** (JMESPath/event pattern), **enrichment** (Lambda, Step Functions, API Destination), **target** (EventBridge bus, SQS, Lambda, SNS, Kinesis, Step Functions, ~25 targets). Substitui Lambda `SQS → enrich → publish` boilerplate. Cobra apenas eventos que passam o filter.

```yaml
# CDK / CloudFormation — SQS source + filter SEV1 + Lambda enrich + EventBridge target
PipeCourierAssignment:
  Type: AWS::Pipes::Pipe
  Properties:
    RoleArn: !GetAtt PipeRole.Arn
    Source: !GetAtt CourierAssignmentQueue.Arn
    SourceParameters:
      FilterCriteria:
        Filters:
          - Pattern: '{"body": {"severity": ["SEV1", "SEV2"]}}'
      SqsQueueParameters: { BatchSize: 10 }
    Enrichment: !GetAtt EnrichCourierMetadataFn.Arn
    Target: !GetAtt EventBus.Arn
    TargetParameters:
      EventBridgeEventBusParameters:
        DetailType: courier.assigned
        Source: logistics.dispatch
```

**S3 Express One Zone + Mountpoint.** S3 Express GA Q4 2023 — single-AZ, sub-ms latência consistente, 50% menor custo de request, **5x mais caro por GB-month** ($0.16 vs $0.023 S3 Standard). Use case: ML training shuffle, hot temp scratch, checkpoint frequente. **Não é durável cross-AZ** — perde dados em AZ outage. Mountpoint for S3 (GA Q3 2023) expõe bucket como filesystem POSIX read-optimized — read-heavy ML datasets sem sync manual.

```bash
# Bucket S3 Express (suffix --x-s3 obrigatório)
aws s3api create-bucket \
  --bucket logistics-hot-cache--use1-az4--x-s3 \
  --create-bucket-configuration 'Location={Type=AvailabilityZone,Name=use1-az4},Bucket={Type=Directory,DataRedundancy=SingleAvailabilityZone}'

# Mountpoint — bucket como filesystem
mount-s3 logistics-training-data /mnt/data --read-only --cache /tmp/s3cache
```

**Graviton 4 (R8g) economics.** R8g GA Q4 2024 — 40% melhor perf/$ vs x86 (m7i) e 30% vs Graviton 3. Compatibilidade ARM resolvida 2023-2024 (Node, Python, Java, Go: zero-cost; binários nativos: rebuild multi-arch via Docker buildx). Lambda em Graviton 3+ economiza ~20% por invocação. **Managed services preço idêntico arch-agnostic** — só vale para EC2/EKS/Lambda. Stack típica logística: EKS node group `m8g.xlarge` substituiu `m7i.xlarge` → 30% menor bill compute.

```dockerfile
# Multi-arch Docker (Graviton + x86)
# docker buildx build --platform linux/arm64,linux/amd64 -t app:latest --push .
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]
```

**Aurora Limitless Database — sharded Postgres single-endpoint.** GA Q4 2024. Cluster com **shard group** (multiple writers) + **routers** (single endpoint, query routing). Distribution key define sharding (e.g., `tenant_id`). Cross-shard transactions via 2PC com overhead — design para single-shard ops como hot path. Target 100M+ TPS. Aurora I/O-Optimized (GA 2023) corta 40% custo em workloads I/O-pesados (>25% bill é I/O). Combine: Limitless + I/O-Optimized para multi-tenant SaaS scale-out.

```sql
-- Aurora Limitless: criar shard group + sharded table
CALL rds_aurora.limitless_create_shard_group('logistics_shards', shard_count := 8);

CREATE TABLE orders (
  order_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  payload JSONB
) WITH (mode = 'sharded', distribution_key = 'tenant_id');

CREATE TABLE tenants ( tenant_id UUID PRIMARY KEY, name TEXT )
  WITH (mode = 'reference');  -- replicada em todos os shards
```

**Step Functions Distributed Map — paralelismo S3 escala Spark-like.** Itera sobre dataset S3 (CSV, JSONL, Manifest) com até **10000 execuções concorrentes**. Substitui Spark/EMR para batches moderados (GBs, não TBs). `ItemBatcher` agrupa N itens por execução (controla custo + downstream load). `MaximumConcurrency` limita pressão.

```json
{
  "Type": "Map",
  "ItemReader": {
    "Resource": "arn:aws:states:::s3:getObject",
    "ReaderConfig": { "InputType": "CSV", "CSVHeaderLocation": "FIRST_ROW" },
    "Parameters": { "Bucket": "logistics-batch", "Key": "shipments-2026-05.csv" }
  },
  "ItemBatcher": { "MaxItemsPerBatch": 100 },
  "MaxConcurrency": 500,
  "ItemProcessor": {
    "ProcessorConfig": { "Mode": "DISTRIBUTED", "ExecutionType": "EXPRESS" },
    "StartAt": "ProcessShipmentBatch",
    "States": {
      "ProcessShipmentBatch": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": { "FunctionName": "ProcessShipments", "Payload.$": "$" },
        "End": true
      }
    }
  }
}
```

**Stack logística aplicada.** Bedrock Claude 3.7 Sonnet + Knowledge Base (S3 com 200 PDFs help docs, OpenSearch Serverless backend) para customer support agent — responde "como cancelar?" com citation à doc fonte; Guardrails redact CPF/cartão. EventBridge Pipes: SQS `courier_assignment` → filter `severity in [SEV1,SEV2]` → Lambda enrich (busca courier metadata DynamoDB) → EventBridge bus → 4 targets (Slack alert, Datadog metric, audit S3, dispatch retry). S3 Express bucket `--x-s3` para hot inventory cache (1ms p99 vs 30ms S3 Standard) — TTL 24h, fallback Standard. EKS migrado m7i → m8g (Graviton 4) → 30% menos compute bill, zero code change (Node + Java OpenJDK ARM-native). Step Functions Distributed Map noturno: itera CSV 5M shipments S3, ItemBatcher 200, MaxConcurrency 1000, gera relatório Athena.

**10 anti-patterns**:

1. **Bedrock sem Guardrails em customer-facing**: PII leak (CPF, cartão) + jailbreak amplificado por marca. Guardrail é compliance, não opcional.
2. **Knowledge Base sem chunking strategy explícita**: default fixed 300 tokens quebra contexto semântico → retrieval ruim → hallucination. Use semantic ou hierarchical para docs longos.
3. **EventBridge Pipes para source→target trivial sem filter/enrichment**: use Lambda destination ou SQS-Lambda direto — Pipes overkill (custo + latência).
4. **S3 Express assumido durável cross-AZ**: single-AZ design — outage da AZ = perda total. Use só para data reconstruível (cache, scratch, training shuffle).
5. **Mountpoint para workload write-heavy**: otimizado read — writes vão direto S3 sem cache, latência ruim. Use EFS ou FSx para write-heavy.
6. **Graviton 4 sem container multi-arch**: deploy falha em ARM se build x86-only. `docker buildx --platform linux/arm64,linux/amd64` mandatório no CI.
7. **Aurora Limitless em workload single-shard friendly**: overhead de routers + 2PC sem benefit — Aurora Serverless v2 é mais simples e barato para <50K TPS single-tenant.
8. **Distributed Map sem ItemBatcher em datasets massivos**: 10000 execuções concorrentes saturam downstream (RDS connection pool, third-party API). ItemBatcher + MaxConcurrency mandatórios.
9. **Bedrock multi-region failover sem cross-region inference quota**: request denied silent quando primary region throttla. Configure cross-region inference profile (Q1 2025) ou fallback explícito.
10. **EventBridge Pipes enrichment Lambda síncrono lento (>1s p99)**: pipe stalls, SQS messages re-deliver, custo explode. Enrichment deve ser <200ms p99 — se não, mova para target Step Functions async.

Cruza com **03-05 §2.5** (S3 foundation, Express é tier complementar), **§2.6** (RDS/Aurora foundation, Limitless evolui o pattern), **§2.8** (Lambda foundation, Pipes substitui glue Lambdas), **§2.11** (EventBridge/SQS/SNS, Pipes orchestra os três), **§2.21** (cost optimization, Graviton 4 + Aurora I/O-Optimized + S3 Express trade-offs), **§2.22** (Lambda runtime + EventBridge schemas, Pipes consome schemas), **04-10 §2.21** (RAG architectures — Bedrock Knowledge Bases como RAG turnkey vs build-your-own), **04-10 §2.23** (MCP — Bedrock Agents é predecessor managed do mesmo padrão), **03-06** (Terraform/CDK provisioning de tudo acima), **04-09 §2.22** (multi-region scaling — Bedrock cross-region inference Q1 2025 resolve quota single-region).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diagrama VPC com 3 AZs, subnets pub/priv, IGW, NAT, ALB.
- Justificar IAM Role over IAM User com 2 cenários.
- Diferenças entre RDS Postgres, Aurora Postgres, Aurora Serverless v2.
- Decisão Lambda vs Fargate vs EKS pra 3 cenários distintos.
- Por que NAT Gateway é custoso e como mitigar.
- 3 ações pra reduzir egress cost.
- Distinguir SQS Standard vs FIFO; SNS vs EventBridge.
- Princípios de DynamoDB modeling (single-table design overview).
- Estratégia de secrets em ECS task com Secrets Manager.
- 3 práticas pra evitar bill explosivo.

---

## 4. Desafio de Engenharia

Migrar **Logística v1** pra AWS, abandonar Railway pra esse exercício, ainda em escala pequena.

### Especificação

1. **Conta AWS**:
   - Free tier ou conta dedicada.
   - **Não use root**. Crie IAM user admin com MFA + acesso CLI; ou Identity Center.
2. **Infra (criada via Console + AWS CLI a princípio; em 03-06, IaC)**:
   - VPC com 3 AZs, subnets pub/priv.
   - 1 NAT Gateway (custo controlado).
   - VPC Endpoints pra 04-03 e ECR (reduzir egress).
3. **Compute**:
   - **ECS Fargate** pra api e web.
   - 2 services (api, web), task definitions com image GHCR ou ECR.
   - Application Load Balancer na frente, com listener 443 + cert ACM.
   - Health checks em `/healthz`.
4. **Database**:
   - **RDS Postgres** Multi-AZ (instância pequena, t4g.small).
   - DB subnet group privado.
   - Security group: só ECS task security group pode falar 5432.
5. **Cache**:
   - **ElastiCache Redis** (cluster-disabled, 1 primary + 1 replica).
6. **Storage**:
   - **04-03 bucket** pra uploads (foto de delivery, comprovantes).
   - Block Public Access ativado.
   - Bucket policy: só ECS task role escreve; ler via pre-signed URL.
7. **Domain + CDN**:
   - **Route53** hosted zone (você pode usar subdomain de domínio existente).
   - **CloudFront** na frente do ALB pra api (cache em rotas idempotentes) e do web.
   - TLS via ACM.
8. **Logs e métricas**:
   - Containers logam em CloudWatch Logs (driver Fargate default).
   - 7 dias de retention.
   - 1 alarm: api 5xx rate > 1% por 5 min → SNS topic → email.
9. **Secrets**:
   - DATABASE_URL, JWT_SECRET, REDIS_AUTH em **Secrets Manager**.
   - Task definition referencia.
10. **CI/CD**:
    - GH Actions com OIDC → AWS role. Sem long-lived keys.
    - Workflow: build → push ECR → update ECS service.

### Restrições

- Sem root credentials usadas.
- Sem secret em env var hardcoded.
- Sem security group com `0.0.0.0/0` pra DB ou cache.
- Sem instância EC2 (use Fargate).

### Threshold

- README documenta:
  - Diagrama de arquitetura (VPC, subnets, services, 04-03, RDS, ElastiCache, ALB, CloudFront, Route53).
  - IAM roles e policies criadas (mostre JSON).
  - Decisão Fargate vs EKS, justificada pra esse projeto.
  - Custo mensal estimado (Cost Explorer ou planilha).
  - Demo: deploy completo from scratch + smoke test.

### Stretch

- Aurora Postgres em vez de RDS (compare custos e features).
- Lambda + API Gateway HTTP API pra 1 endpoint específico (webhook), demonstrando coexistência.
- WAF em CloudFront com regras OWASP top.
- GuardDuty + CloudTrail pra audit log.
- Multi-region read replica (read-only) pra RDS.

---

## 5. Extensões e Conexões

- Liga com **01-03** (network): subnets, routing, TLS, DNS.
- Liga com **01-02** (OS): EC2 = VM Linux; processes lá.
- Liga com **02-09/02-10/02-11**: RDS, ElastiCache, ORMs cabem.
- Liga com **02-13** (auth): Cognito ou IAM Identity Center vs custom.
- Liga com **02-14** (real-time): API Gateway WebSocket pra Lambda; ALB suporta WS direto.
- Liga com **03-02** (Docker): images em ECR.
- Liga com **03-03** (K8s): EKS é variant.
- Liga com **03-04** (CI/CD): OIDC integration.
- Liga com **03-06** (IaC): Terraform/Pulumi pra reproduzir tudo declarativamente.
- Liga com **03-07** (observability): CloudWatch + alternativas SaaS.
- Liga com **03-08** (security): IAM, GuardDuty, WAF.

---

## 6. Referências

- **AWS docs** ([docs.aws.amazon.com](https://docs.aws.amazon.com/)), leia VPC, IAM, EC2, 04-03, RDS, ECS, Lambda, CloudFront whitepapers.
- **"AWS Well-Architected Framework"**: six pillars (operational excellence, security, reliability, performance, cost, sustainability).
- **AWS Solutions Architect cert prep books**: Stephane Maarek (Udemy também).
- **Yan Cui's blog** ([theburningmonk.com](https://theburningmonk.com/)), deep takes em Lambda e serverless.
- **Corey Quinn / Last Week in AWS**: críticas de pricing e produtos.
- **AWS re:Invent talks**: releases anuais, deep dives em features.
- **"Serverless Land"** ([serverlessland.com](https://serverlessland.com/)), patterns.
- **AWS CDK Workshop**: IaC introdução.
