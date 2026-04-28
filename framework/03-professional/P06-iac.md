---
module: P06
title: IaC — Terraform, Pulumi, CDK, Crossplane
stage: professional
prereqs: [P05]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P06 — IaC

## 1. Problema de Engenharia

ClickOps cresce até dor: ninguém lembra como aquele LB foi configurado; staging "esquece" um security group; reproduzir prod em outra região leva uma semana de cliques. IaC promete reverter isso — código declarativo, versionado, reviewable, automated. Mas adoção sem disciplina vira lava: state corrompido, drift entre código e cloud, módulos copy-paste com 2k linhas, secrets em state files git.

Este módulo é IaC com profundidade: Terraform (de fato standard), Pulumi (linguagens reais), AWS CDK, Crossplane (K8s-native). State management, módulos reutilizáveis, drift detection, multi-env, secrets, blast radius. Você sai sabendo desenhar IaC que sobrevive 2+ anos de mudança.

---

## 2. Teoria Hard

### 2.1 Por que IaC

- **Reprodutível**: spin staging idêntico a prod.
- **Versionado**: PR review pra mudança de infra.
- **Auditável**: git log explica o que e quando.
- **Recuperável**: destroyed → re-created from code.
- **Compossível**: módulos pra patterns recorrentes.

Sem IaC, infra é tribal knowledge.

### 2.2 Espectro de ferramentas

- **Imperative scripts** (bash + AWS CLI): rápido, frágil, sem state.
- **Configuration management** (Ansible, Chef, Puppet): pra config em VMs, menos pra cloud resources.
- **Declarative IaC** (Terraform, OpenTofu, Pulumi, CDK): cloud resources em código declarativo.
- **K8s-native** (Crossplane): IaC modelado como CRDs em K8s.

Em 2026, Terraform/OpenTofu domina. Pulumi cresce em times JS/Python/Go. CDK forte em AWS-only shops. Crossplane em times K8s-heavy.

### 2.3 Terraform vs OpenTofu

HashiCorp mudou licença (BSL) em 2023; comunidade forkou pra **OpenTofu** (Linux Foundation), drop-in compatible.

Em projetos novos: OpenTofu pra evitar lock-in. Compatibilidade com Terraform providers e modules é total.

### 2.4 Modelo declarativo Terraform

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "logistica-tfstate"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "tflock"
  }
}

provider "aws" { region = var.region }

resource "aws_s3_bucket" "uploads" {
  bucket = "logistica-${var.env}-uploads"
}
```

Comandos:
- `terraform init` — baixa providers, configura backend.
- `terraform plan` — diff entre código e state. Reviewa antes.
- `terraform apply` — aplica.
- `terraform destroy` — remove tudo (cuidado).

### 2.5 State

State é a fonte de verdade do que Terraform criou. Mapeia código → resources reais. Sem state, Terraform não sabe se recurso já existe.

**Backend**:
- **Local**: `terraform.tfstate` no diretório. **Não use em time.**
- **Remote**: S3 + DynamoDB lock; Terraform Cloud; GitLab Backend.

**Locking**: evita 2 apply simultâneos corromperem state.

**Encryption**: state pode conter secrets (passwords, etc.). **Encripte at rest** sempre.

**Drift**: state vs realidade. Alguém mudou no console → Terraform detecta no plan.

### 2.6 Modules

Reutilização. Módulo é diretório com `main.tf`, `variables.tf`, `outputs.tf`.

```hcl
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  cidr = "10.0.0.0/16"
  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  ...
}
```

Module registry público (HashiCorp registry, GitHub) tem módulos battle-tested. Use antes de escrever próprio.

Módulo próprio quando: pattern recorrente do seu projeto que merece abstraction. Não vire arquiteto cego — `module-of-modules` virou anti-padrão famoso.

### 2.7 Workspaces, ambientes

Terraform Workspaces: múltiplos states por module config. Útil pra envs simples.

**Padrão melhor**: directory per env (`environments/dev/`, `environments/staging/`, `environments/prod/`) cada um com seu state file e variables. Workspaces escondem ambiguidade. Directory explicit.

### 2.8 Variables, locals, outputs

```hcl
variable "env" { type = string }
locals { name_prefix = "logistica-${var.env}" }
output "vpc_id" { value = module.vpc.vpc_id }
```

Variable values:
- `terraform.tfvars` (gitignored em alguns casos).
- `*.auto.tfvars` (auto-loaded).
- CLI `-var` ou `-var-file`.
- Env vars `TF_VAR_env=prod`.

Outputs expõem valores; outros modules consomem via `data.terraform_remote_state` ou via `module.x.output`.

### 2.9 Pulumi

Linguagens reais (TS, Python, Go, .NET, Java). Mesma abstração de resources, mas você usa loops, ifs, funções, types nativos.

```ts
import * as aws from "@pulumi/aws";
const bucket = new aws.s3.Bucket("uploads", {
  bucket: `logistica-${env}-uploads`,
});
```

Pros:
- Type checking, IDE support.
- Lógica complexa expressa nativamente.
- Compartilhamento de código com aplicação (constantes, helpers).

Cons:
- Comunidade menor que Terraform.
- Menos exemplos copy-pasteable.
- State em Pulumi Cloud (free pra OSS) ou self-hosted.

Em times TS/JS-heavy, Pulumi vira escolha natural.

### 2.10 AWS CDK

CDK constrói **CloudFormation** templates a partir de código (TS, Python, Java, Go, .NET).

Layers:
- **L1**: 1:1 com CFN resources.
- **L2**: opinionated, sane defaults.
- **L3 (Patterns)**: alto nível ("ApplicationLoadBalancedFargateService cria VPC + ECS + ALB + Route53 + ACM").

Cons: locked em AWS. CFN tem limites (timeouts, error handling difícil). Drift detection fraca.
Pros: integração profunda em AWS. Constructs ricas. Para AWS-only shops, vale.

CDKTF (CDK for Terraform): CDK que sai Terraform em vez de CFN. Híbrido.

### 2.11 Crossplane

K8s-native IaC. Você define resources como CRDs no cluster:
```yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata: { name: prod-db }
spec:
  forProvider:
    region: us-east-1
    engine: postgres
    instanceClass: db.t4g.small
```

Controllers Crossplane reconciliam — mesmo modelo do K8s.

Pros: GitOps natural; uma plataforma pra app + infra; Compositions (módulos) reutilizáveis.
Cons: curva de aprendizado; ecosystem menor que Terraform; nem todo provider tem qualidade Crossplane.

### 2.12 Secrets em IaC

Anti-padrão #1: secret em `.tf` versionado.

Padrão:
- Criar resource (RDS) com password via random + store em Secrets Manager.
- App lê de Secrets Manager via IAM role.
- Terraform NUNCA tem o valor literal em código.
- State criptografado at rest pode conter; minimize.

Em CI: Terraform assume role via OIDC.

### 2.13 Drift, importing, refactor

**Drift**: console mudou recurso → `plan` mostra. Decisão: trazer pra código ou reverter.

**Import**: trazer recurso existente pra state sem destruir/recriar. `terraform import aws_s3_bucket.x bucket-name`. Em Terraform 1.5+, `import {}` blocks declarativos.

**Refactor**: renomear resource sem destroy/recreate. `moved {}` block (Terraform 1.1+).

### 2.14 Testing IaC

- **`terraform plan`**: review humano é o teste primário.
- **`terraform validate`**: syntax checks.
- **`tflint`**: linter, regras best practices.
- **`tfsec`, `checkov`**: security scanners (overly permissive, encryption off, etc.).
- **`terraform-docs`**: gera docs.
- **Terratest**: integration tests em Go (sobe infra, valida, destrói).
- **Pulumi**: unit tests com mocks; property tests.

Em CI: validate + lint + scan em PR; plan visível; apply só com approval.

### 2.15 Multi-environment patterns

- **Dir per env** + shared modules: simples, claro.
- **Workspace per env**: ambíguo; evite.
- **Composition root + envs as configs**: 1 root module parametrizado por env-specific tfvars.

Cross-env data: outputs de "shared" stack lidos por env stacks via `data.terraform_remote_state`.

### 2.16 Blast radius

State único = mudança em S3 bucket pode forçar replan de DB. Separe por blast radius:
- **Networking**: VPC, subnets. Mudança rara, alto blast.
- **Data layer**: RDS, ElastiCache. Mudança média.
- **Compute layer**: ECS services, Lambda. Mudança frequente.
- **DNS / cert**: rara.

Cada layer com state separado. Apps não precisam re-plan VPC.

### 2.17 Policy as Code

- **Sentinel** (Terraform Cloud): policies que gate apply.
- **OPA / Conftest**: avaliam plan.json contra policies.
- **AWS Service Control Policies**: gate API calls em Org level.

Gate típico: nenhum SG com `0.0.0.0/0` em porta 22. RDS sempre encrypted. Tags obrigatórias.

### 2.18 Cost estimation

- **Infracost**: estima custo de mudança em PR. "Esse PR adiciona ~$120/mês."

Visibilidade de custo no review evita surpresa.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar Terraform vs OpenTofu vs Pulumi vs CDK vs Crossplane.
- Configurar S3 + DynamoDB backend com encryption e locking.
- Distinguir workspaces vs directory-per-env e quando cada falha.
- Listar 3 anti-padrões em IaC (state local em time, secret em tf, root module gigante).
- Estratégia pra secret de DB password sem nunca aparecer em state code.
- Refactor: renomear resource sem destroy/recreate.
- Importar recurso pré-existente pro state.
- Justificar separação de state por blast radius.
- Listar 3 ferramentas de policy/scan em CI.
- Decidir quando module próprio vs registry público.

---

## 4. Desafio de Engenharia

Reproduzir **infra do P05** com Terraform/OpenTofu, dividida por blast radius e versionada.

### Especificação

1. **Stack**:
   - OpenTofu 1.6+ (compatível com Terraform).
   - Backend S3 + DynamoDB (criados manualmente uma vez via CLI; bootstrap).
   - Providers: AWS, opcionalmente Cloudflare (DNS) ou Route53.
2. **Estrutura de repo**:
   ```
   infra/
     bootstrap/             # cria backend bucket + DDB table
     modules/
       vpc/
       ecs-service/
       rds-postgres/
       elasticache-redis/
     environments/
       staging/
         networking/
         data/
         compute/
       prod/
         networking/
         data/
         compute/
   ```
3. **Layers**:
   - **networking** state: VPC, subnets, IGW, NAT, security groups base.
   - **data** state: RDS, ElastiCache. Reads networking via `terraform_remote_state`.
   - **compute** state: ECS cluster, services, ALB, CloudFront, Route53. Lê outros.
4. **Modules**:
   - `vpc`: 3 AZs, pub/priv subnets, NAT controlado por flag.
   - `ecs-service`: task definition, service, target group, security group, com inputs (image, cpu, memory, env vars, secrets ARNs).
   - `rds-postgres`: instância Multi-AZ, password gerado random + Secrets Manager, parameter group.
   - `elasticache-redis`: cluster + replicas.
5. **Secrets**:
   - DB password gerado via `random_password`, armazenado em Secrets Manager.
   - JWT secret em Secrets Manager.
   - Task definitions referenciam secrets via ARN.
   - State encryptado em S3 (server-side); fluxos de access logueados.
6. **CI**:
   - PR: terraform fmt/validate/lint (tflint) + tfsec + plan.
   - Comment do plan no PR.
   - Merge em main: apply em staging automated; apply em prod com approval.
7. **Refactor**:
   - Demonstre `moved {}` renomeando recurso sem destroy.
   - Demonstre `import {}` trazendo um recurso "criado clickado" pro state.
8. **Cost estimation**:
   - **Infracost** rodando em PRs com mudança de infra.
   - Estimativa do custo total mensal.

### Restrições

- Sem state local.
- Sem secret literal em qualquer arquivo.
- Sem root module único > 300 linhas.
- Sem `terraform apply` em prod sem `terraform plan` review.

### Threshold

- README documenta:
  - Estrutura de directories e estados (e o porquê).
  - Diagrama de dependências entre layers.
  - Demonstração de `plan` mostrando mudança em compute sem afetar networking.
  - Instâncias de `moved` e `import` aplicadas.
  - Output Infracost com custo estimado.
  - Demonstração de drift: muda algo no console; `plan` mostra; reverte via apply.

### Stretch

- Implementar 1 módulo em Pulumi (TS) ao lado dos modules Terraform; comparar DX.
- Crossplane: instale em K8s e crie 1 RDS via Crossplane CRD; compare modelo.
- Sentinel ou OPA gate: policy proibindo SG com 0.0.0.0/0 em qualquer porta de admin.
- Atlantis ou Terraform Cloud pra workflow de PR-driven apply.

---

## 5. Extensões e Conexões

- Liga com **N09** (Git): IaC vive em git; PR review.
- Liga com **P02** (Docker): images referenciadas em IaC.
- Liga com **P03** (K8s): Helm charts deployed via IaC ou Argo CD; Crossplane em K8s.
- Liga com **P04** (CI/CD): plan/apply automated.
- Liga com **P05** (AWS): IaC reproduz tudo do P05.
- Liga com **P07** (observability): IaC instala Grafana/Prometheus stack.
- Liga com **P08** (security): policy-as-code, drift detection como audit.
- Liga com **S08** (services vs monolith): infra cresce com arquitetura; IaC mantém visibilidade.

---

## 6. Referências

- **Terraform docs** ([developer.hashicorp.com/terraform](https://developer.hashicorp.com/terraform)) e **OpenTofu** ([opentofu.org](https://opentofu.org/)).
- **"Terraform: Up & Running"** — Yevgeniy Brikman.
- **"Infrastructure as Code"** — Kief Morris.
- **terraform-aws-modules** ([github.com/terraform-aws-modules](https://github.com/terraform-aws-modules)).
- **Pulumi docs** ([pulumi.com/docs](https://www.pulumi.com/docs/)).
- **AWS CDK docs** ([docs.aws.amazon.com/cdk/v2/guide](https://docs.aws.amazon.com/cdk/v2/guide/)).
- **Crossplane docs** ([crossplane.io](https://www.crossplane.io/)).
- **Infracost** ([infracost.io](https://www.infracost.io/)).
- **tfsec** ([github.com/aquasecurity/tfsec](https://github.com/aquasecurity/tfsec)) e **checkov**.
- **Atlantis** ([runatlantis.io](https://www.runatlantis.io/)).
