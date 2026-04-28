---
module: P05
title: AWS Core — IAM, VPC, EC2, S3, RDS, Lambda, ECS/EKS, CloudFront
stage: professional
prereqs: [N02, N03, P02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P05 — AWS Core

## 1. Problema de Engenharia

AWS é dominante em cloud enterprise e tem 200+ serviços. A maioria dos devs sabe usar 5: EC2 manualmente, S3 pra blob, RDS pra DB, Lambda pra "serverless", e por aí. Falta o modelo mental — IAM como espinha dorsal, VPC como rede, custo por bom uso vs custo por preguiça, decisões entre Lambda/Fargate/EKS, replicação multi-AZ, security groups, NAT gateways. Sem isso, você commit em arquitetura cara e frágil.

Este módulo cobre os primitives core. Não é "tutorial AWS" — é mapa pra navegar 90% das decisões de cloud em projetos médios. Foco em decisões e princípios. Hands-on no desafio.

---

## 2. Teoria Hard

### 2.1 Modelo geral

AWS organizado em **regions** (geo) e **availability zones** (data centers isolados em uma região). High availability = multi-AZ. Disaster recovery = multi-region.

Recursos são por região (com exceções: IAM, Route 53, CloudFront, são globais).

Conta AWS é unidade de billing e isolation. Em organizações sérias, **AWS Organizations** com múltiplas contas (dev, staging, prod, security) e **Control Tower** pra governance.

### 2.2 IAM — espinha dorsal

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

### 2.3 VPC — rede

**VPC**: rede virtual privada na sua conta. Default VPC em cada região vem pronta; em prod, crie a própria.

Componentes:
- **Subnets**: subdivisão de IP range, por AZ. Public (route to IGW) ou Private.
- **Internet Gateway (IGW)**: route pra internet pra subnets públicas.
- **NAT Gateway**: subnets privadas saem pra internet via NAT (custo $$$).
- **Route Tables**: regras de roteamento por subnet.
- **Security Groups**: stateful firewall por instância. Allow rules apenas.
- **NACLs**: stateless firewall por subnet. Allow + deny.
- **VPC Endpoints**: comunicação privada com serviços AWS sem passar pela internet (S3, ECR, Secrets Manager).
- **Transit Gateway / VPC Peering**: conectar VPCs.
- **VPN, Direct Connect**: hybrid com on-prem.

Padrão: 3 AZs com 1 subnet pública + 1 privada cada. Backend em privadas; ALB em públicas.

NAT Gateway custa ~$32/mês + $0.045/GB. Em projetos sensíveis a custo, considere VPC Endpoints pra S3/ECR/etc., reduzindo egresso via NAT.

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

### 2.5 S3 — object storage

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
- **Server-side encryption**: SSE-S3 (default), SSE-KMS, SSE-C.
- **Pre-signed URLs**: acesso temporário sem dar credentials.
- **Object Lambda**: transformação on-the-fly em GET.
- **Event notifications**: S3 → SNS/SQS/Lambda em PUT/DELETE.

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

Em 2026 AWS oferece **MemoryDB** também — Redis-compat com persistência multi-AZ stronger (durable, RPO 0). Mais cara.

### 2.8 Lambda

FaaS. Function executa em response a evento. Runtimes built-in (Node, Python, Java, Go, Ruby, .NET) ou custom (container image até 10 GB).

Modelo:
- Cold start: primeira execution após idle. Otimizar pra Node ~100-300ms; pra container, 500ms-2s.
- Warm reuse: container fica vivo por minutos. Module-level state persiste (sem garantir).
- Concurrency: cada request invoca container; aumenta concurrency até limit (default 1000 por região, ajustável).
- **Provisioned concurrency**: pre-warmed pra evitar cold start. Custo extra.

Triggers: API Gateway, ALB, S3, SQS, EventBridge, DynamoDB Streams, etc.

Limitations:
- 15 min execution.
- 10 GB memory max.
- Stateless (ext storage via S3, EFS, DynamoDB).
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
- **Kinesis Firehose**: pipe to S3/Redshift/OpenSearch.
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
- **S3 Storage class errado**: Standard pra archive vira caro.
- **EC2 idle**: t.medium dev box esquecida $30/mês.

**Cost Explorer**, **Budgets**, **Trusted Advisor** ajudam. **AWS Cost Anomaly Detection** detecta picos.

### 2.18 Multi-account org

Em orgs sérias:
- Account "management" (billing, Org).
- Account "security" (CloudTrail, GuardDuty, audit logs).
- Account "shared services" (Route53, ECR central).
- Accounts por env (dev, staging, prod) e/ou por team.

**SSO** (Identity Center) federa users em todas contas com roles específicas.

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

Migrar **Logística v1** pra AWS — abandonar Railway pra esse exercício, ainda em escala pequena.

### Especificação

1. **Conta AWS**:
   - Free tier ou conta dedicada.
   - **Não use root**. Crie IAM user admin com MFA + acesso CLI; ou Identity Center.
2. **Infra (criada via Console + AWS CLI a princípio; em P06, IaC)**:
   - VPC com 3 AZs, subnets pub/priv.
   - 1 NAT Gateway (custo controlado).
   - VPC Endpoints pra S3 e ECR (reduzir egress).
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
   - **S3 bucket** pra uploads (foto de delivery, comprovantes).
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
  - Diagrama de arquitetura (VPC, subnets, services, S3, RDS, ElastiCache, ALB, CloudFront, Route53).
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

- Liga com **N03** (network): subnets, routing, TLS, DNS.
- Liga com **N02** (OS): EC2 = VM Linux; processes lá.
- Liga com **A09/A10/A11**: RDS, ElastiCache, ORMs cabem.
- Liga com **A13** (auth): Cognito ou IAM Identity Center vs custom.
- Liga com **A14** (real-time): API Gateway WebSocket pra Lambda; ALB suporta WS direto.
- Liga com **P02** (Docker): images em ECR.
- Liga com **P03** (K8s): EKS é variant.
- Liga com **P04** (CI/CD): OIDC integration.
- Liga com **P06** (IaC): Terraform/Pulumi pra reproduzir tudo declarativamente.
- Liga com **P07** (observability): CloudWatch + alternativas SaaS.
- Liga com **P08** (security): IAM, GuardDuty, WAF.

---

## 6. Referências

- **AWS docs** ([docs.aws.amazon.com](https://docs.aws.amazon.com/)) — leia VPC, IAM, EC2, S3, RDS, ECS, Lambda, CloudFront whitepapers.
- **"AWS Well-Architected Framework"** — six pillars (operational excellence, security, reliability, performance, cost, sustainability).
- **AWS Solutions Architect cert prep books** — Stephane Maarek (Udemy também).
- **Yan Cui's blog** ([theburningmonk.com](https://theburningmonk.com/)) — deep takes em Lambda e serverless.
- **Corey Quinn / Last Week in AWS** — críticas de pricing e produtos.
- **AWS re:Invent talks** — releases anuais, deep dives em features.
- **"Serverless Land"** ([serverlessland.com](https://serverlessland.com/)) — patterns.
- **AWS CDK Workshop** — IaC introdução.
