---
module: 02-14
title: Real-time — WebSockets, SSE, WebRTC, Long Polling
stage: plataforma
prereqs: [02-07, 01-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-14 — Real-time

## 1. Problema de Engenharia

"Real-time na web" não é uma tecnologia — são quatro, com semantics diferentes, custos diferentes, e armadilhas próprias. WebSockets, SSE, long polling, WebRTC. Cada um responde a um cenário específico. Devs frequentemente escolhem WebSocket por reflexo, paga complexidade que não precisa; outros usam polling pelo medo de WS, perdem performance.

Este módulo é real-time com clareza: protocolo (frames, ping/pong, reconnect), uso adequado, escala (sticky sessions, fan-out), back-pressure, autenticação no upgrade, e quando usar cada. Você sai sabendo desenhar um sistema com pushing real, não polling disfarçado.

---

## 2. Teoria Hard

### 2.1 Espectro de "real-time"

- **Polling clássico**: client pergunta a cada N segundos. Custoso, latente, mas trivial.
- **Long polling**: client manda request; server segura até ter resposta ou timeout. Próximo step. Funciona em qualquer infra HTTP.
- **Server-Sent Events (SSE)**: server faz push unidirecional sobre HTTP/1.1 ou HTTP/2. Reconnect automático.
- **WebSockets (WS)**: full-duplex bidirecional sobre HTTP upgrade.
- **WebRTC**: P2P entre clients, com servidor só pra signaling.
- **HTTP/2 push (DEPRECATED)**: foi removida do mainstream — não use.
- **HTTP/3 + WebTransport**: novo, baseado em QUIC. Estável mas adoção nascente.

Escolha por **direção** e **frequência**:
- Server → client raro: SSE ou polling.
- Server → client frequente, unidirecional: SSE.
- Client → server frequente OU bidirecional: WebSocket.
- Cliente↔cliente com baixa latência (voz, vídeo): WebRTC.

### 2.2 Long polling

Client faz `GET /events?since=X`. Server compara estado; se há novidade, responde; senão, segura request até timeout (~30s) ou novo evento.

Vantagens:
- Funciona em qualquer infra HTTP.
- Reverso ao polling: latência baixa quando há eventos.

Desvantagens:
- Conexão consumida durante hold.
- Não é "real-time" puro — overhead de reconnect a cada evento.
- Cuidado com proxies (timeouts, buffering).

Usado como fallback quando WS bloqueado.

### 2.3 SSE — Server-Sent Events

Spec MDN/W3C. Stream de eventos texto, framing trivial (`\n\n` separa). API browser:

```js
const es = new EventSource('/orders/stream');
es.onmessage = (e) => console.log(e.data);
es.addEventListener('order_paid', (e) => { ... });
```

Server emite:
```
event: order_paid
data: {"id":"123","total":100}
id: 42

```

Vantagens:
- Reconnect automático com `Last-Event-ID` header (server pode resumir).
- Trafega sobre HTTP normal — passa por CDN, proxies geralmente.
- Push barato.

Desvantagens:
- Unidirecional (server → client). Cliente envia via fetch normal.
- Default browser limita 6 conexões por origin em HTTP/1.1. HTTP/2/3 levanta isso.
- IE/old-mobile sem suporte (irrelevante em 2026).

Quando vence: notificações push, status updates, dashboards live, AI streaming responses (ChatGPT-style). **SSE é underrated** — em 2026 voltou a ser padrão pra LLM streaming.

### 2.4 WebSockets — protocolo

RFC 6455. Upgrade de HTTP/1.1:
```
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```
Server responde 101 Switching Protocols + handshake. Daí, conexão TCP é reaproveitada como canal full-duplex de frames.

Frames:
- Opcodes: text, binary, close, ping, pong, continuation.
- Masking: clientes mascaram payload (anti-cache attacks via proxies). Servers não mascaram.
- Frames podem ser fragmentados (`FIN` flag).

Subprotocols (`Sec-WebSocket-Protocol`): negociados, definem semantica acima do raw frame (ex: `graphql-ws`).

### 2.5 WebSockets — operacional

**Ping/pong**: keep-alive. Server manda `ping`, client responde `pong`. Detect disconexão e mantém NATs vivos. Lib geralmente faz auto.

**Reconnect**: WS fecha por motivos (network, idle timeout, server reboot). Cliente robusto reconecta com backoff exponencial + jitter.

**Resync de estado**: ao reconnect, cliente precisa pegar o que perdeu. Padrões:
- Server mantém estado, cliente pede snapshot inicial + subscribes.
- Server emite eventos com IDs sequenciais; cliente diz último ID recebido; server replay.
- Cliente reconcilia via REST query e depois entra em stream.

**Backpressure**: se cliente lento e server empurra muito, buffer cresce. Lib boa expõe writable stream e respeita.

**Close codes**: 1000 normal, 1001 going away, 1006 abnormal (sem close frame), 4xxx app-defined.

### 2.6 Bibliotecas Node

- **`ws`**: lib pura WebSocket, performance forte, low-level.
- **`uWebSockets.js`**: C++ bindings, throughput muito alto.
- **`socket.io`**: alto-nível, com fallback (long polling), rooms, namespaces, ack callbacks. Próprio protocol em cima de WS — cliente precisa ser socket.io. Não é raw WS.
- **`Bun.serve` com `websocket`**: built-in em Bun.
- **Hono `upgradeWebSocket`** + adapters.

Em greenfield, decide:
- WS puro (`ws` ou framework): se você quer protocol limpo e suas próprias semantics.
- Socket.io: se rooms/namespaces/auto-reconnect/fallback são DX que vale dependência.

### 2.7 Autenticação no upgrade

WebSocket abre via HTTP — cookies/headers do upgrade são acessíveis ao server. Padrões:
- **Cookie HttpOnly de session** (mesmo que HTTP) — server lê no upgrade, valida.
- **JWT em query string** (`/ws?token=...`) — funciona, mas evite (logs).
- **JWT em first message** — depois do connect, cliente manda `{auth: token}`; server valida ou fecha.
- **Subprotocol header**: alguns trafegam token em `Sec-WebSocket-Protocol`.

Em mobile (RN), cookies trickier — mais comum first-message auth.

### 2.8 WebSocket em scale

Single server: trivial.

N servers: cliente conecta em qualquer um. Quando user A no server 1 manda mensagem pra user B no server 2, precisa **fan-out**.

Patterns:
- **Pub/Sub** via Redis: server 1 publica `chat:userB`; server 2 está subscribed; entrega ao socket local.
- **Sticky sessions**: load balancer roteia mesmo cliente sempre pro mesmo server (via cookie). Reduz movement mas não resolve fan-out.
- **Dedicated message bus**: NATS, Redis Streams, Kafka.
- **Managed**: Pusher, Ably, Soketi (open-source compat com Pusher).

Trade-off: servers mantêm estado (lista de sockets). Restart drops conexões. Clients reconectam.

### 2.9 Sticky session e load balancer

L4 (TCP) load balancer: cookies não enxergáveis; sticky por IP. Funciona até NAT.

L7 (HTTP) com cookie: balancer adiciona cookie `lb=server-3`. Roteamento estável.

CDNs (Cloudflare) suportam WebSocket; trace `Cf-Ray` se aparecerem problemas.

### 2.10 SSE em scale

Mesma lógica de fan-out (Redis pub/sub) aplica. Mais simples por ser unidirecional.

CDN compat: SSE deveria passar — mas configure pra não bufferizar (`X-Accel-Buffering: no` em Nginx, `Cache-Control: no-cache`).

### 2.11 GraphQL Subscriptions

Subscriptions em GraphQL são tipicamente backed por WebSocket (`graphql-ws` subprotocol). Lib server: `graphql-ws`, deprecates antigo `subscriptions-transport-ws`.

Fluxo: cliente abre WS, manda `{type: "subscribe", id: 1, payload: {query: ...}}`, server emite `{type: "next", id: 1, payload: {data: ...}}` em loop, fim com `{type: "complete"}`.

### 2.12 WebRTC

P2P real-time entre browsers. Casos: voz/vídeo, file transfer, low-latency game data.

Componentes:
- **`RTCPeerConnection`**: sessão.
- **SDP**: descrição de oferta/resposta (codecs, candidatos ICE).
- **ICE / STUN / TURN**: descoberta de network paths. STUN dá IP público; TURN é relay quando NAT impede P2P.
- **Signaling server**: você implementa (WS, SSE) pra trocar SDP/ICE entre peers. WebRTC não define.
- **Data Channels**: canal arbitrário (não só audio/video).

Complexidade alta. Em projetos onde voz/vídeo é core, considere SaaS (Twilio, LiveKit, Daily, Agora) ou self-hosted SFU (mediasoup, Janus, Jitsi).

Em logística: WebRTC pra audio entre courier e cliente quando há entrega complicada. Provavelmente não vale build próprio; integre LiveKit ou similar.

### 2.13 Mensagens delivery: at-most-once, at-least-once, exactly-once

- **At-most-once**: send and forget. Pode perder. Trivial.
- **At-least-once**: ack + retry. Pode duplicar. Cliente idempotente.
- **Exactly-once**: dedup id + commit em store. Mais caro.

WebSocket bruto é at-most-once. Protocols sobre (graphql-ws, custom) podem implementar acks.

Pra notificações user-facing simples, at-most-once geralmente ok. Pra ações críticas (pagamento), use HTTP + idempotency, não WS.

### 2.14 WebTransport — deep

Sobre HTTP/3 / QUIC (01-03 §2.6.1). Em 2025-2026 saiu de "experimental" pra suportado em Chrome/Edge (default), Firefox (release recente), Safari (em desenvolvimento). Substitui WebSocket em casos onde HOL blocking importa ou onde você precisa datagram unreliable.

**Modelo mental:**
- WebTransport = **conexão QUIC** exposta no browser.
- Por conexão você abre **N streams** + **datagram channel**.
- Cada stream é independente — perda em um não afeta outros (sem TCP HOL blocking).

**API client (browser):**
```ts
const wt = new WebTransport('https://example.com/realtime');
await wt.ready;

// Stream bidirecional ordered & reliable (TCP-like dentro de QUIC)
const stream = await wt.createBidirectionalStream();
const writer = stream.writable.getWriter();
await writer.write(new TextEncoder().encode('hello'));

// Stream unidirecional do servidor → cliente
for await (const stream of wt.incomingUnidirectionalStreams) { /* ... */ }

// Datagrams: unreliable, unordered, message-sized (UDP-like)
const dgWriter = wt.datagrams.writable.getWriter();
await dgWriter.write(new Uint8Array([1, 2, 3]));
```

**Quando usar WebTransport sobre WebSocket:**

| Caso | WebSocket | WebTransport |
|---|---|---|
| Chat/notificações | Suficiente | Overkill |
| Game state sync (latency-critical) | TCP HOL blocking dói | Streams independentes ganham |
| Live video/audio (realtime) | Frequência alta + lossy OK | Datagrams unreliable matam latency |
| Telemetria de sensors | Cada métrica em stream próprio | Streams + datagrams ideal |
| Browser → Browser (P2P) | WebRTC já cobre | WebRTC ainda é melhor |

**Server-side em 2026:**
- **Node**: `@fails-components/webtransport` (binding pra `lsquic` em C). Maturidade média.
- **Rust**: `wtransport` ou `quiche`. Maduro.
- **Go**: `quic-go/webtransport-go`. Sólido em produção.
- **Servidores HTTP/3**: nginx 1.25+, Caddy 2.7+, Cloudflare Workers (Durable Objects WebSocket por enquanto, WT em roadmap).

**Pegadinhas reais:**
- **TLS 1.3 obrigatório** + **QUIC** = nem sempre passa em redes corporativas com firewalls UDP-blocking. Tenha fallback pra WebSocket.
- **CORS-like origin checking** — server precisa validar origin do client.
- **Stateful proxies/CDN**: muitos CDNs ainda não passam WebTransport em 2026. Cloudflare e Fastly sim, outros não.
- **Reconnect**: ao contrário de WebSocket que tem semantics simples (connection drop = reopen), WebTransport tem reconnect por stream + connection migration QUIC. Lib client geralmente abstrai.

**Veredicto:**
- **App genérico de chat/notificação em 2026**: WebSocket continua sendo o pragmático. Maturidade total, suporte universal.
- **Game multiplayer, live editor colaborativo, vídeo realtime, telemetry**: vale WebTransport. Resolve dores reais de WebSocket.
- **Edge functions / serverless**: WebSocket via Durable Objects (Cloudflare) ou similar; WebTransport em edge ainda nascente.

### 2.15 Edge runtime e WebSocket

- **Cloudflare Workers**: suporta WebSocket via `Durable Objects`. Each connection sticks to a Durable Object. Pattern: 1 DO por "room".
- **Vercel Edge**: WebSocket suportado em algumas configs, melhor via Edge Functions com fetch streams.
- **AWS Lambda**: não tem WS persistente; **API Gateway WebSocket** mantém conexão e invoca Lambda em events.

Em projetos sérios de real-time, considere serviço dedicado (Soketi, Centrifugo, Pusher, Ably) em vez de tentar empurrar WS em runtime stateless.

### 2.16 Push notifications mobile

Diferente de real-time em-app. Push notifications via APN (iOS) e FCM (Android) — chegam mesmo com app fechado. Cobertos no 02-06.

Combinação real: WebSocket quando app aberto + Push quando fechado.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Comparar long polling, SSE, WebSocket e WebRTC em direção, latência e custo de infra.
- Explicar o handshake WebSocket: que headers, que código de status.
- Implementar reconnect exponencial com jitter em pseudo-código.
- Distinguir auth no upgrade WS via cookie e via first-message JWT, com pros/contras.
- Explicar fan-out via Redis pub/sub com diagrama.
- Justificar SSE pra streaming LLM em vez de WS.
- Configurar SSE atrás de Nginx/CDN sem buffering.
- Discriminar at-most-once, at-least-once, exactly-once com 1 caso pra cada.
- Citar 2 cenários onde WebRTC vence WS, e 2 onde build próprio é loucura.
- Explicar limitação de WS em Lambda e como API Gateway WebSocket compensa.

---

## 4. Desafio de Engenharia

Adicionar **real-time tracking** ao Logística — courier streama posição, lojista vê em tempo real.

### Especificação

1. **Stack**:
   - Continuação Fastify + Redis. Adicione lib `ws` (não Socket.io aqui).
   - Front: dashboard simples (SSR Next ou SPA básica) consumindo eventos.
2. **Endpoint WebSocket — courier upload**:
   - `WS /courier/stream` — courier envia `{lat, lng, speed, ts}` a cada 5s.
   - Auth: cookie session ou first-message JWT (escolha + justifique).
   - Server valida, persiste último ponto em Redis (`courier:<id>:last`), faz pub em canal `courier:updates:<tenantId>`.
3. **Endpoint SSE — lojista observa**:
   - `GET /orders/:id/track` — SSE stream que emite eventos quando courier do pedido se move.
   - Server subscribe ao canal Redis correspondente, repassa pro client SSE.
   - Reconnect: server respeita `Last-Event-ID` e replay últimos eventos do Redis Stream.
4. **Long polling fallback**:
   - `GET /orders/:id/track-poll?since=<eventId>` — long polling 30s.
   - Cliente que não suporta SSE cai aqui.
5. **Notificação genérica via WebSocket — bidirecional**:
   - `WS /notifications` — cada user logado subscreve.
   - Server envia eventos: `order_status_changed`, `new_message`.
   - Cliente envia `{ack: eventId}` pra server marcar entregue.
6. **Scale-out**:
   - Rode 2 instâncias do server (PM2 ou docker-compose).
   - Courier conecta em instância A; lojista observa via instância B. Funciona via Redis fan-out.
   - Demonstre.
7. **Reconexão**:
   - Cliente courier reconnects com backoff exponencial + jitter.
   - Estado se perdido durante disconnect → cliente envia buffer ao reconnect.
8. **Métricas**:
   - `/metrics` adiciona `ws_connections_total`, `ws_messages_sent_total`, `sse_clients_active`.

### Restrições

- Sem Socket.io.
- Sem libs cloud-managed (Pusher, Ably).
- Pelo menos 1 endpoint deve ser SSE; pelo menos 1 WS bidirecional.

### Threshold

- README documenta:
  - Diagrama da arquitetura (instances, Redis pub/sub, clients).
  - Decisão SSE vs WS pra cada endpoint, justificada.
  - Fan-out demonstrado entre instâncias.
  - Reconnect demonstrado (kill da connection, log do backoff, resync).
  - 1 caso de backpressure simulado (cliente lento) e como tratou.

### Stretch

- WebTransport endpoint experimental (rodar em Chrome).
- Migration de SSE LLM-style: endpoint `/assistant/chat` que streama tokens de resposta (mock, sem LLM real necessário).
- Edge: rodar variant em Cloudflare Workers com Durable Object pra room.
- WebRTC signaling: server faz só signaling; 2 browsers fecham canal P2P pra trocar mensagem.

---

## 5. Extensões e Conexões

- Liga com **01-03** (networking): TCP, HTTP upgrade, TLS, NAT.
- Liga com **02-03** (Web APIs): EventSource, WebSocket browser.
- Liga com **02-05** (Next): Route handlers podem servir SSE.
- Liga com **02-07** (Node): event loop e socket handling.
- Liga com **02-08** (frameworks): plugin Fastify-WS, Hono WebSocket adapters.
- Liga com **02-11** (Redis): fan-out, Streams pra replay.
- Liga com **02-13** (auth): WS upgrade auth.
- Liga com **03-03** (K8s): sticky sessions, ingress config.
- Liga com **03-05** (AWS): API Gateway WebSocket, Lambda limitations.
- Liga com **04-02** (messaging): Kafka como backbone pra fan-out de larga escala.
- Liga com **04-04** (resilience): connection retries, circuit breaker dependendo de Redis.

---

## 6. Referências

- **MDN — WebSockets, EventSource, WebRTC, Fetch streams** ([developer.mozilla.org/en-US/docs/Web/API](https://developer.mozilla.org/en-US/docs/Web/API)).
- **RFC 6455** (WebSocket Protocol).
- **RFC 8441** (WebSockets over HTTP/2).
- **High Performance Browser Networking** — Ilya Grigorik (capítulos sobre WS, SSE, WebRTC).
- **"Designing Data-Intensive Applications"** — Kleppmann, capítulo 11 (stream processing).
- **WebRTC for the Curious** ([webrtcforthecurious.com](https://webrtcforthecurious.com/)) — book gratuito.
- **Soketi** ([soketi.app](https://soketi.app/)) e **Centrifugo** ([centrifugal.dev](https://centrifugal.dev/)) — open-source WS infra.
- **Cloudflare blog**: Durable Objects, WebSocket at the edge.
