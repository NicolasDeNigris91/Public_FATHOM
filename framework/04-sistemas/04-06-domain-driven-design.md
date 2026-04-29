---
module: 04-06
title: Domain-Driven Design, Bounded Contexts, Aggregates, Tactical
stage: sistemas
prereqs: [04-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-06, Domain-Driven Design

## 1. Problema de Engenharia

DDD virou buzzword. Times "fazem DDD" e produzem CRUD com vocabulário pomposo (Repository, ValueObject, Entity em todo lado) e pouco da disciplina real, modelo do domínio que reflete realidade, ubiquitous language, bounded contexts, refinamento contínuo via conversa com stakeholders. O resultado: código verbose, abstrações errôneas, e times que confundem padrões táticos com a essência.

Este módulo separa estrátégia (bounded contexts, context mapping, ubiquitous language) de tática (aggregates, value objects, domain events, repositories). Você sai sabendo aplicar DDD com sobriedade e identificar onde NÃO vale.

---

## 2. Teoria Hard

### 2.1 Eric Evans, 2003

Livro "Domain-Driven Design: Tackling Complexity in the Heart of Software". Premissa:
- Software complexo lida com realidade complexa do domínio.
- Modelar o domínio bem é tarefa central.
- O modelo emerge de conversa entre devs e domain experts.
- O modelo é refinado continuamente.

DDD não é estilo de código. É **disciplina de modelagem**.

### 2.2 Ubiquitous language

Vocabulário compartilhado entre devs e domain experts. Termos do código = termos da conversa.

Anti-padrão:
- Stakeholder fala "entrega", código fala "shipment".
- Stakeholder fala "cliente", código fala "user".

Fonte de bug latente: traduções implícitas. Padrão: glossário no repo, refinado em sprints.

### 2.3 Bounded Context

Modelo é coerente dentro de um contexto. Um termo significa coisas diferentes em contextos diferentes.

Em Logística:
- Contexto **Order Management**: `Order` é entidade central com status pipeline, items, total.
- Contexto **Routing**: `Order` é um stop com lat/lng e priority.
- Contexto **Billing**: `Order` é evento monetário.

Mesmo "Order" mapeando dados similares mas com perspective distinta. Não force "1 modelo to rule them all".

Bounded context dá **autonomia**: cada um pode evoluir, scale, choose stack independente.

### 2.4 Context map

Diagrama relações entre bounded contexts:

- **Shared kernel**: 2 contexts compartilham subset (cuidado).
- **Customer/Supplier**: upstream / downstream.
- **Conformist**: downstream copia upstream sem traduzir.
- **Anti-corruption layer**: downstream traduz upstream em domain próprio (defesa).
- **Open Host Service**: upstream expõe API estável.
- **Published Language**: schema canônico (events, OpenAPI).
- **Separate Ways**: contexts não interagem.
- **Big Ball of Mud**: anti-pattern, sem boundaries claros.

Discutir context map evita arquitetura acidental.

### 2.5 Strategic vs tactical

- **Strategic DDD**: identification de bounded contexts, language, context map, distillation de core domain. Modelagem de alto nível.
- **Tactical DDD**: padrões de implementação dentro de um bounded context.

**Strategic é o que mais importa**. Tactical sem strategic é cargo cult.

### 2.6 Core, Supporting, Generic subdomains

Não todo domínio tem mesmo valor:

- **Core**: diferencial competitivo. Onde investir engenharia.
- **Supporting**: necessário, único do biz, sem diferencial.
- **Generic**: pronto, comoditizado (auth, billing, email).

Em Logística, **routing inteligente** é core (você compete com isso). Auth é generic (use Auth0 ou implemente sem inovar). Billing é supporting (regras próprias mas sem rocket science).

DDD investe profundo em core; supporting com cuidado; generic compra ou usa pronto.

### 2.7 Tactical patterns

Aggregate (já vimos): cluster consistente. Aggregate root é única entry. Transações dentro de 1 aggregate. Cross-aggregate via events/saga.

**Entity**: identity persistente (`Order` tem id; identidade é o id, não os atributos).
**Value Object**: identidade pelos atributos. Imutável. (`Address` com street/city, 2 addresses iguais são "iguais", sem id).
**Domain Service**: lógica que não cabe naturalmente em entity/VO. Stateless.
**Domain Event**: algo que aconteceu, com significado de domínio (`OrderDelivered`).
**Repository**: abstração pra persistência. "Like a in-memory collection". Hide DB details.
**Factory**: encapsula criação complex de aggregate.
**Specification**: encapsula query/filter como objeto.

Em projetos JS/TS modernos, "Repository" pode ser exagero, `db.query` em camada simples cobre. Não force pattern; use quando complexidade emerge.

### 2.8 Aggregate design rules

- Pequeno é bom. Aggregate inteiro carregado em memory; transação encompasses-o.
- 1 aggregate per transaction. Cross-aggregate via events.
- Reference outros aggregates por **id** (não navegação direta).
- Invariants enforced no aggregate root.
- Em N+1 reads, considere CQRS read models.

Anti-padrão: aggregate gigantesco abrange domínio inteiro. Lock contention, slow loads.

### 2.9 Domain events

Eventos do domínio comunicam mudanças significativas:
- Past tense, domain-vocabulary.
- Imutáveis.
- Carry minimum info (event-notification) ou state (event-carried).
- Emitidos pelo aggregate.

Diferença com integration events:
- **Domain event**: dentro do bounded context. In-process bus.
- **Integration event**: cross context. Broker (Kafka/etc.).

Map: domain event no aggregate → publisher transforma em integration event quando relevante a outros contexts (com schema versioned).

### 2.10 Modular monolith with bounded contexts

Você não precisa microservices pra fazer DDD. **Modular monolith com módulos = bounded contexts** é poderoso:
- 1 deployable.
- Módulos comunicam via in-process events / public APIs claras.
- Refactor pra serviço só quando dor justifica.

Java tem Spring Modulith; .NET tem similar; em TS, convenção via package monorepo + lint rules.

### 2.11 Onde DDD não vale

- CRUD trivial sem regras complexas. Apenas tabelas e endpoints.
- Pre-domain-clarity (early startup pivoting); fica difícil refatorar abstrações boas se domain ainda é incerto.
- Time pequeno + domain simples.

Adopt-when-pain-justifies.

### 2.12 Event Storming

Método pra descobrir domínio coletivamente. Walls com sticky notes:
- Orange: domain events.
- Blue: commands.
- Yellow: aggregates.
- Pink: hot spots / dúvidas.
- Purple: policies.

Workshops com stakeholders + devs. Descobre bounded contexts, ubiquitous language, processo real.

Vlingo, Alberto Brandolini popularizaram.

### 2.13 Refactoring toward DDD

Codebase legacy:
- 1: identifique bounded contexts (dores frequentes, mudanças que sempre tocam mesma área).
- 2: estabeleça module boundaries.
- 3: dependa por interfaces, não by import direto.
- 4: ubiquitous language refresh: renomeie pra match domain.
- 5: aggregate emerge naturalmente quando você nota grupo de tabelas que sempre transaciona junto.

Não pare tudo pra "fazer DDD"; refactor incremental.

### 2.14 DDD com event sourcing

ES + DDD são amigos: aggregates emit events; events são domain-language artifacts; replay reconstruct aggregate.

Greg Young, Vaughn Vernon: combinação canônica.

### 2.15 Antipadrões comuns

- **Anemic domain model**: entities só getters/setters; lógica em "service" externo. Perde encapsulamento.
- **Tactical-only DDD**: aplica padrões sem strategic. Codebase pesado sem benefit.
- **Aggregate gigante**: contention.
- **Naming hipster**: `OrderEntityFactoryProvider`. Use linguagem do domínio.
- **Repository pattern em CRUD trivial**: adds layer sem benefit.

### 2.16 Aplicação no Logística

Bounded contexts candidates:
- **Order Management**: lifecycle de pedido, status.
- **Routing & Dispatch**: matching courier-pedido, optimization.
- **Courier Management**: profile, status, location.
- **Billing**: cobrança, payouts.
- **Notifications**: push, email, SSE.
- **Analytics**: read-side de tudo.

Cada um com modelo próprio. Order em Routing é diferente de Order em Billing.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir strategic e tactical DDD.
- Definir bounded context com 1 caso real.
- Listar 4 patterns de context mapping.
- Diferenciar core, supporting, generic subdomains.
- Aggregate design rules em 4 pontos.
- Domain event vs integration event.
- 3 anti-padrões DDD.
- Quando NÃO usar DDD.
- Event Storming basics.
- Modular monolith + bounded contexts vs microservices.

---

## 4. Desafio de Engenharia

Refatorar **Logística** rumo a modular monolith DDD.

### Especificação

1. **Strategic discovery**:
   - Conduza Event Storming (sozinho ou com 1-2 amigos): liste events do domínio (sticky-style em Miro/Excalidraw).
   - Identifique bounded contexts (mínimo 4: Order Management, Routing, Courier, Billing).
   - Documente ubiquitous language (glossário), pelo menos 20 termos.
2. **Modularização**:
   - Reorganize código em módulos por bounded context (`src/order-management/`, `src/routing/`, etc.).
   - Public API por módulo (export limitado); internal não escapa.
   - ESLint rule: módulo X só importa de módulo Y se permitido.
3. **Ubiquitous language**:
   - Renomeie nomes que divergiam do domínio.
   - Documente vocabulário em README do módulo.
4. **Tactical em Order Management**:
   - `Order` aggregate com root + events.
   - Methods invariant-enforcing (`order.markPickedUp(courierId, ts)`, checa status, courier assigned).
   - Domain events (`OrderPickedUp`) emitted.
   - Repository abstrai persist, retorna fully-loaded aggregate.
5. **Cross-context comunication**:
   - In-process event bus pra domain events em mesmo deployment.
   - Order Management publica `OrderAssigned` → Courier Management reage atualizando status courier; Notifications reage emitindo push.
   - Integration events (em broker, 04-02/04-03) só onde cross-deploy.
6. **Anti-corruption layer**:
   - Module Routing recebe `Order` de Order Management mas tem próprio `RoutableStop` (mapeia campo necessários, ignora o resto).
7. **Strategic decisions documented**:
   - `ARCHITECTURE.md` com:
     - Context map.
     - Subdomain classification (core/supporting/generic).
     - Decisões: por que Routing é candidato a serviço separado (03-11 Rust)? Por que Auth é generic (poderia trocar Auth0 sem dor)?
8. **Refactor non-DDD areas**:
   - Algumas áreas (CRUD de tenant settings) ficam simples. Documente que NÃO valem tactical patterns.

### Restrições

- Sem dividir tudo em microservices. Modular monolith.
- Sem aggregates gigantes (limite ~5 entities por aggregate).
- Sem repository em CRUD trivial.

### Threshold

- README documenta:
  - Context map diagrammed.
  - Glossário ubiquitous language.
  - Decisão core/supporting/generic.
  - 1 antes/depois: módulo refactorado mostrando ganho de clareza.
  - 1 cross-context flow seguido (event published → consumed).
  - 1 caso onde você decidiu NÃO usar DDD pattern.

### Stretch

- Spring Modulith-style module check em CI.
- Event Storming workshop real com 2-3 amigos não-técnicos.
- 1 bounded context extracted pra serviço separado (Routing → Rust do 03-11). Demonstre ACL.
- Hexagonal/Ports-Adapters dentro de bounded context.
- Event sourcing in Order context (04-03).

---

## 5. Extensões e Conexões

- Liga com **02-08** (frameworks): hexagonal app structure.
- Liga com **02-09** (Postgres): aggregates → tables; transactions per aggregate.
- Liga com **04-03** (event-driven): domain events ↔ integration events.
- Liga com **04-05** (API): API = published language do bounded context.
- Liga com **04-07** (architectures): hexagonal, clean, onion.
- Liga com **04-08** (services vs monolith): bounded context é unidade candidata a serviço.
- Liga com **04-12** (tech leadership): DDD requires conversa stakeholders.

---

## 6. Referências

- **"Domain-Driven Design"**: Eric Evans (2003).
- **"Implementing Domain-Driven Design"**: Vaughn Vernon (2013).
- **"Domain-Driven Design Distilled"**: Vaughn Vernon (curto).
- **"Learning Domain-Driven Design"**: Vlad Khononov (mais moderno, 2021).
- **"Domain-Driven Design Quickly"**: InfoQ free.
- **Alberto Brandolini, "Introducing EventStorming"**.
- **"Patterns, Principles, and Practices of Domain-Driven Design"**: Scott Millett, Nick Tune.
- **Vaughn Vernon's blog and talks**.
- **DDD Crew** ([github.com/ddd-crew](https://github.com/ddd-crew)), collected resources.
