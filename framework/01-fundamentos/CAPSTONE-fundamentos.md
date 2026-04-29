---
capstone: novice
title: HTTP/1.1 Server from Scratch
stage: fundamentos
prereqs: [01-01, 01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, 01-10]
status: locked
gates:
  pratico: { status: pending, date: null, attempts: 0, notes: null }
---

# CAPSTONE Fundamentos, HTTP/1.1 Server From Scratch

## 1. Por que esse capstone existe

Ao final do Fundamentos você implementou pequenos exercícios isolados (LRU cache, MyPromise, mygit, mini-shell, etc). O capstone integra **tudo num projeto único de produção-grade simplificado**: um servidor HTTP/1.1 que vai do TCP cru até resposta a clientes reais como `curl` e `wrk`.

O que ele força você a integrar:
- **Sistemas (01-02):** sockets como FDs, `accept()` em loop, gestão de muitas conexões.
- **Redes (01-03):** parsing manual de HTTP/1.1 (request line, headers, body, chunked encoding, keep-alive).
- **Estruturas (01-04):** LRU cache (hash + DLL), table de routers (trie ou hash), pool de buffers.
- **Algoritmos (01-05):** matching de paths (string algorithms básicos), parser baseado em state machine.
- **Paradigmas (01-06):** state machine clara, error handling com `Result`-like.
- **JS profundo (01-07):** event loop, streams, backpressure, microtasks.
- **TypeScript (01-08):** tipos estritos pra request/response, types pra parser states.
- **Git (01-09):** repo separado bem versionado.
- **Unix (01-10):** logging estruturado, CLI, signals (SIGTERM graceful shutdown).

Este é o projeto que distingue **fundamentos sólidos** de **decoração**.

---

## 2. Especificação técnica

### 2.1 Protocolo

Implementar **HTTP/1.1** ([RFC 9112](https://datatracker.ietf.org/doc/html/rfc9112)) com:

- **Request parsing:**
  - Request line: `METHOD SP path SP HTTP/1.1 CRLF`
  - Headers até `CRLF CRLF`
  - Body conforme `Content-Length` ou `Transfer-Encoding: chunked`
- **Response generation:**
  - Status line: `HTTP/1.1 <code> <reason> CRLF`
  - Headers
  - Body (com `Content-Length` correto ou `chunked`)
- **Keep-alive** correto:
  - `Connection: keep-alive` (default em HTTP/1.1)
  - `Connection: close` fecha após response.
  - Reuso da mesma conexão TCP pra múltiplas requests sequenciais.
- **Status codes** mínimos: `200, 201, 204, 301, 304, 400, 401, 403, 404, 405, 408, 409, 411, 413, 414, 416, 429, 500, 501, 503`.

### 2.2 Arquitetura interna

Use uma **state machine** pra parser:

```
IDLE → READING_REQUEST_LINE → READING_HEADERS → READING_BODY → DISPATCH → WRITING_RESPONSE → IDLE
                                                ↓
                                              ERROR → close
```

Cada conexão TCP é uma instância dessa state machine. Múltiplas conexões coexistem (lembre-se: Node é single-thread + event loop, você gerencia muitas via `epoll` indiretamente).

### 2.3 Features mínimas (Threshold do portão prático)

1. **Servidor:**
   - `import { createServer } from './my-http-server'`
   - `createServer({ port, routes, ... }).listen()`
2. **Routing:**
   - Definição: `GET /users/:id`, `POST /orders`.
   - Path params: `req.params.id`.
   - Query string parseada: `req.query.foo`.
3. **Middlewares** (estilo Express):
   - `app.use((req, res, next) => { ... next(); })`
   - Order matters.
4. **Static file serving** com **LRU cache** (~64 MB, usa o LRUCache do desafio 01-04):
   - Conteúdo cacheado em memória.
   - `If-None-Match` (ETag) → `304`.
5. **Logs estruturados em JSON** (1 linha por request):
   ```json
   {"ts":"...","method":"GET","path":"/x","status":200,"latency_ms":3,"ip":"..."}
   ```
6. **Graceful shutdown:** `SIGTERM` → para de aceitar novas conexões, espera in-flight terminarem (timeout configurável), depois exit.
7. **Configuração via CLI/env:**
   - `--port 3000`
   - `--max-connections 1000`
   - `--keep-alive-timeout-ms 5000`

### 2.4 Robustez

- **Timeouts:** request idle (cliente abriu mas não enviou request), header parsing, body read, keep-alive idle.
- **Tamanho máximo de header** (default 16 KB) → `431 Request Header Fields Too Large`.
- **Body size limit** (default 1 MB) → `413 Payload Too Large`.
- **Backpressure**: se cliente lê devagar, não acumule megabytes em memória, pause a stream.
- **HTTP request smuggling defenses:** rejeitar requests com `Content-Length` E `Transfer-Encoding`. Validar chunks.

### 2.5 Restrições

- **Não use** `node:http`, `http2`, `node:fetch`, `express`, `fastify`, `hono`, libs de parser HTTP (`llhttp`, `http-parser-js`).
- **Pode usar** `node:net` (sockets TCP), `node:stream`, `node:url`, `node:fs`, `node:crypto` (pra ETag), `node:os`.
- **TypeScript estrito.**

### 2.6 Tests

Testes obrigatórios (Vitest ou Jest):
- **Unit:** parser de request line, parser de headers, parser de chunked body, LRU cache.
- **Integration:** servidor escuta, responde a `curl http://localhost:3000/x`, retorna corretamente status, headers, body.
- **Load:** `wrk -t4 -c100 -d10s http://localhost:3000/static/file.txt` mantém **0 erros** e responde >5k req/s no seu hardware (alvo razoável).
- **Adversarial:** request com `Content-Length` mentindo, chunked malformed, header gigante, devem ser rejeitados sem crash.

---

## 3. Threshold do Portão Prático

Pra o capstone passar, você precisa demonstrar:

1. **Funciona.** `curl -v http://localhost:3000/...` retorna respostas corretas, com headers HTTP/1.1 conformes.
2. **Concorrência.** `wrk -t4 -c100 -d10s` sem erros, com latência `p99 < 50ms` em respostas estáticas pequenas.
3. **Keep-alive correto.** `wrk` com `connection: keep-alive` reutiliza conexões, você consegue **provar isso** com `tcpdump`/`ss` ou logs.
4. **Robustez sob ataques:**
   - Cliente envia headers sem `\r\n\r\n` final, você fecha a conexão após timeout.
   - Cliente envia request smuggling tentativa, você rejeita.
5. **Graceful shutdown.** `kill -TERM <pid>` durante load test não causa erros nas in-flight requests.
6. **Relatório final** (no README do repo) com:
   - **Diagrama da state machine** do parser.
   - **Análise de performance** (números reais do wrk).
   - **3 escolhas de design** com trade-offs explicitados.
   - **5 limitações** comparado a Express/Fastify/Node http real.
   - **Logs de pelo menos 1 bug que você caçou** (o que viu, hipóteses, como descobriu causa, fix).

### Code review

O mentor vai fazer code review profundo, focando em:
- **State machine correctness:** não há paths que vazam memória ou deixam conexão pendurada.
- **Buffer handling:** zero copy onde possível, sem string concat em hot path.
- **Edge cases:**
  - Request line dividida em 2 chunks TCP.
  - Header fold (linhas continuadas, históricas mas válidas em HTTP/1.1).
  - Body chunked com chunks de 0 bytes.
  - Cliente desconecta no meio do body.
- **Error paths:** todo erro tem path claro pra resposta correta + cleanup.
- **Concurrency:** múltiplas conexões não corrompem state.

Você precisa **explicar verbalmente** cada decisão arquitetural. Se você não souber justificar uma linha, é sinal que copiou, falha o portão.

---

## 4. Stretch Goals (opcionais, mas alta alavancagem)

Cumprindo o threshold, você pode ir além:

- **HTTPS** (use `node:tls`). Aprende handshake na prática.
- **HTTP/2** (RFC 9113), implementar o frame format binário, multiplexing.
- **WebSocket upgrade** (RFC 6455), handshake `Upgrade: websocket`, frames.
- **Compression** (`Content-Encoding: gzip` ou `br`), usa `node:zlib`.
- **Rate limiting** por IP (token bucket).
- **Routing avançado** com **trie** de paths (ver 01-04).
- **Server metrics** (`/metrics` em formato Prometheus).
- **Cluster mode** (`node:cluster`) pra usar múltiplos cores.

---

## 5. Cronograma sugerido (mas tempo NÃO é critério)

Não há prazo. Mas se você quer um esqueleto mental:

1. **Setup:** repo git, TS, vitest, ESLint. Smoke test de `net.createServer` ecoando bytes.
2. **Parser request line + headers** (sem body). Testes unitários extensivos.
3. **Parser body** (Content-Length).
4. **Parser body chunked.**
5. **Response writer.**
6. **Keep-alive logic.**
7. **Routing + middlewares.**
8. **Static + LRU cache.**
9. **Logs estruturados.**
10. **Graceful shutdown.**
11. **Adversarial tests.**
12. **Load test + tuning.**
13. **README final.**

---

## 6. Referências para o capstone

- **[RFC 9112, HTTP/1.1](https://datatracker.ietf.org/doc/html/rfc9112)**: leia inteiro. Parser tem que estar conforme.
- **[RFC 9110, HTTP semantics](https://datatracker.ietf.org/doc/html/rfc9110)**: méthods, status codes, content negotiation.
- **[Node.js docs, net module](https://nodejs.org/api/net.html)**.
- **[How HTTP request smuggling works](https://portswigger.net/web-security/request-smuggling)**: entender pra defender.
- **[Inside NGINX: How We Designed for Performance & Scale](https://www.nginx.com/blog/inside-nginx-how-we-designed-for-performance-scale/)**: referência arquitetural.
- **[Hono source](https://github.com/honojs/hono)**: backend framework pequeno e moderno em TS, leitura excelente.
- **[Fastify source](https://github.com/fastify/fastify)**: produção, mais complexo.

---

## 7. Encerramento

Quando esse capstone passar, você **construiu de verdade** um servidor HTTP funcional. Você nunca mais vai ler `http.createServer((req,res)=>...)` da mesma forma, vai ver o parser, o keep-alive, o backpressure, o graceful shutdown que estão por baixo.

Esse é também o **fundamento** pro próximo capstone (Plataforma, Logística v1), onde a aplicação vai usar HTTP via libs maduras, mas você já saberá o que cada coisa significa.
