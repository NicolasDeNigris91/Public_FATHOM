# SELF-ASSESSMENT, Calibração Inicial

> Questionário pra você decidir, com franqueza, **onde realmente está**. Não pra pular módulos sem provar, você ainda passa portões. Mas pra **calibrar cadência** (módulos que você domina passam rápido; módulos novos demandam tempo) e **identificar gaps cegos**.

Regras:

1. **Responda sozinho, sem consultar nada.** Resposta com Google = falha pra fim de calibração.
2. **Resposta certa em 30 segundos** = você sabe. **Trava ou consulta** = não sabe.
3. **Não cole gabarito.** Ninguém te assiste; você é a única vítima de auto-engano.
4. **Se acertou ≥ 70% das perguntas de um módulo**, ainda **faça o portão conceitual**. Geralmente você descobre buracos. Mas pode pular Teoria Hard inicial e ir direto pro desafio.
5. **Se acertou < 70%**, faça o módulo inteiro normal.

Total: **66 perguntas, ~3 horas com tempo de pensar**. Faça em 1-2 sessões. Anote respostas em `assessment-result.md` no seu repo de estudos pessoal (não neste).

---

## Estágio 1: Fundamentos

### 01-01 Computation Model
1. Qual a diferença entre RAM e disco em ordem de magnitude de latência?
2. O que é uma syscall e por que custa mais que call de função normal?

### 01-02 Operating Systems
3. Diferença entre processo e thread.
4. O que é virtual memory e como page faults funcionam?

### 01-03 Networking
5. Diferença entre TCP e UDP em uma frase.
6. O que SNI faz no TLS handshake?

### 01-04 Data Structures
7. Em B-Tree, por que fan-out é alto vs binary tree?
8. Quando hash table degrada pra O(n)?

### 01-05 Algorithms
9. Quicksort tem O(n log n) average. Qual é pior caso e como escolha de pivot mitiga?
10. Diferença entre BFS e DFS.

### 01-06 Programming Paradigms
11. O que é pure function?
12. Diferencie OO clássico, functional, e logic programming em uma frase cada.

### 01-07 JavaScript Deep
13. Qual a ordem de fases do event loop do Node?
14. Por que `[1,2,3] + [4,5,6]` retorna `'1,2,34,5,6'` em JS?

### 01-08 TypeScript Type System
15. Diferencie `unknown` e `any`.
16. O que faz `infer` em conditional types?

### 01-09 Git Internals
17. Quais 4 tipos de objects Git tem?
18. O que `git rebase --interactive` faz internamente?

### 01-10 Unix CLI & Bash
19. Diferença entre `>`, `>>`, `2>`, `&>` em redirection.
20. O que `set -euo pipefail` faz e por que usar?

### 01-11 Concurrency Theory
21. Defina race condition formalmente.
22. Por que x86 TSO é mais forte que ARM relaxed memory model?

### 01-12 Cryptography Fundamentals
23. Diferença entre hash, MAC e signature.
24. Por que nonce reuse em AES-GCM destrói segurança?

### 01-13 Compilers & Interpreters
25. Liste fases canônicas de pipeline de compilador.
26. Por que SSA simplifica otimizações?

### 01-14 CPU Microarchitecture
27. Estime latência (ciclos) de L1 vs L3 vs DRAM.
28. O que é false sharing e como detectar?

### 01-15 Math Foundations
29. Aplique Bayes: P(spam) = 0.3, P(palavra X | spam) = 0.6, P(palavra X) = 0.4. Calcule P(spam | palavra X).
30. O que SVD faz em uma frase?

---

## Estágio 2: Plataforma

### 02-01 HTML/CSS/Tailwind
31. Diferença entre `inline-block` e `flex` em modelo de layout.
32. O que CSS Cascade Layers (`@layer`) resolvem?

### 02-02 Accessibility
33. Liste 3 atributos ARIA e quando usar cada.
34. Qual contrast ratio mínimo WCAG AA pra texto normal?

### 02-03 DOM & Web APIs
35. Diferença entre `querySelector` e `getElementById` em performance.
36. O que `requestIdleCallback` faz?

### 02-04 React Deep
37. O que é Fiber e qual problema resolve?
38. Quando `useMemo` é prejudicial?

### 02-05 Next.js
39. Diferencie 4 caching layers do App Router.
40. Quando usar Server Action vs Route Handler?

### 02-06 React Native
41. O que é o bridge clássico de RN e por que New Architecture (Fabric) o substitui?

### 02-07 Node.js Internals
42. O que é libuv threadpool e quando bloqueia?

### 02-08 Backend Frameworks
43. Diferencie Express middleware vs Fastify hooks em modelo mental.

### 02-09 Postgres Deep
44. Como Postgres permite leituras sem bloqueio durante writes concorrentes?
45. Por que `ALTER TABLE ADD COLUMN NOT NULL DEFAULT` clássico travava produção?

### 02-10 ORMs
46. Diferencie Prisma e Drizzle em filosofia.

### 02-11 Redis
47. Por que Redis é single-threaded e isso é vantagem ou desvantagem?

### 02-12 MongoDB
48. Quando MongoDB é escolha melhor que Postgres?

### 02-13 Auth (OAuth2/JWT)
49. O que PKCE adiciona ao OAuth2 e por que é obrigatório em mobile?

### 02-14 Real-time
50. Diferencie WebSocket, SSE, WebRTC em casos de uso.

### 02-15 Search Engines
51. O que `k1` e `b` controlam em BM25?

### 02-16 Graph Databases
52. Quando graph DB vence Postgres com WITH RECURSIVE?

### 02-17 Native Mobile
53. Por que UIKit e SwiftUI coexistem em código moderno?

### 02-18 Payments & Billing
54. Por que webhook deve verificar signature E ser idempotente?

### 02-19 i18n / l10n
55. Diferencie code point e grapheme cluster com exemplo.

---

## Estágio 3: Produção

### 03-01 Testing
56. Diferencie unit, integration, E2E, property-based.

### 03-02-03-03 Docker / K8s
57. O que cgroups e namespaces fazem em containers?
58. O que `kubectl apply` faz internamente?

### 03-04 CI/CD
59. Diferencie blue-green e canary deploy.

### 03-07 Observability
60. Liste os 4 sinais dourados (Google SRE).

### 03-08 Security
61. Diferencie SQLi e XSS em vetor.

### 03-10 Backend Performance
62. Como você mede gargalo em Node sob carga real?

### 03-13 Time-Series & Analytical DBs
63. Por que ClickHouse comprime mais que Postgres?

### 03-15 Incident Response
64. Defina SLI, SLO, SLA, error budget.

### 03-17 Accessibility Testing
65. Por que tooling automatizado a11y só pega ~30-40% de issues?

---

## Estágio 4: Sistemas

### 04-01 Distributed Systems
66. Enuncie CAP e por que ele é insuficiente sem PACELC.

---

## Avaliação

Conte: **acertos / total** por estágio.

| Faixa | Interpretação |
|---|---|
| ≥ 90% | Você likely **domina o estágio**. Faça portões pra confirmar; pode rodar módulos rápido. |
| 70-89% | Você **conhece**, mas com buracos. Faça módulos com Teoria Hard skim + Desafio + Portões. |
| 40-69% | Você tem **base parcial**. Estude Teoria Hard + faça Desafio + Portões. Padrão. |
| < 40% | Você é **iniciante real** no estágio. Estude com Feynman + Active Recall + tudo. Sem pressa. |

Cuidado: viés de auto-avaliação **inflaciona**. Se ficou em dúvida em pergunta, conte como erro. Honestidade aqui paga depois.

---

## Cross-cutting flags

Se travou em **maioria** das perguntas em alguma área, sinal forte de gap a tratar antes de avançar:

- Travou em 01-02-01-03-01-11-01-14: **fundamentos de OS/networking/concorrência/CPU**. Foque Fundamentos antes de qualquer estágio acima.
- Travou em 01-04-01-05-01-15: **CS theory + math**. Mesma coisa.
- Travou em 02-04-02-05-02-07: **stack JS/TS profundo**. Foque Plataforma frontend+Node.
- Travou em 02-09 + 03-10 + 03-13: **Postgres + perf + analytics**. Foque trilha de dados.
- Travou em 04-01-04-04-04-14: **distributed**. Senior precisa.
- Travou em 04-12-04-15-04-16-ST*: **carreira/influência/business**. Não tente Staff antes.

---

## Resultado

Em `assessment-result.md` (seu repo pessoal):

- Score por estágio.
- Lista de módulos que você passou ≥ 90% (rápido).
- Lista de módulos com ≥ 70% (skim + portões).
- Lista de módulos < 70% (módulo completo).
- Lista de gaps cegos identificados.
- Decisão sobre por onde começar (probabilidade alta: 01-01, mas se você é meio-Senior real, pode começar mais alto).

Refazer assessment a cada 6 meses recomendado. Sua percepção muda, autoavaliação evolui.

---

**Comece quando estiver pronto. Não consulte nada.** Honestidade aqui é o primeiro portão.
