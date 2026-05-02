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
