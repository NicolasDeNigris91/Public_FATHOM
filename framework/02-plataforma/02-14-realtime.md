---
module: 02-14
title: Real-time, WebSockets, SSE, WebRTC, Long Polling
stage: plataforma
prereqs: [02-07, 01-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-14, Real-time

## 1. Problema de Engenharia

"Real-time na web" não é uma tecnologia, são quatro, com semantics diferentes, custos diferentes, e armadilhas próprias. WebSockets, SSE, long polling, WebRTC. Cada um responde a um cenário específico. Devs frequentemente escolhem WebSocket por reflexo, paga complexidade que não precisa; outros usam polling pelo medo de WS, perdem performance.

Este módulo é real-time com clareza: protocolo (frames, ping/pong, reconnect), uso adequado, escala (sticky sessions, fan-out), back-pressure, autenticação no upgrade, e quando usar cada. Você sai sabendo desenhar um sistema com pushing real, não polling disfarçado.

---

## 2. Teoria Hard

### 2.1 Espectro de "real-time"

- **Polling clássico**: client pergunta a cada N segundos. Custoso, latente, mas trivial.
- **Long polling**: client manda request; server segura até ter resposta ou timeout. Próximo step. Funciona em qualquer infra HTTP.
- **Server-Sent Events (SSE)**: server faz push unidirecional sobre HTTP/1.1 ou HTTP/2. Reconnect automático.
- **WebSockets (WS)**: full-duplex bidirecional sobre HTTP upgrade.
- **WebRTC**: P2P entre clients, com servidor só pra signaling.
- **HTTP/2 push (DEPRECATED)**: foi removida do mainstream, não use.
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
- Não é "real-time" puro, overhead de reconnect a cada evento.
- Cuidado com proxies (timeouts, buffering).

Usado como fallback quando WS bloqueado.

### 2.3 SSE, Server-Sent Events

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
- Trafega sobre HTTP normal, passa por CDN, proxies geralmente.
- Push barato.

Desvantagens:
- Unidirecional (server → client). Cliente envia via fetch normal.
- Default browser limita 6 conexões por origin em HTTP/1.1. HTTP/2/3 levanta isso.
- IE/old-mobile sem suporte (irrelevante em 2026).

Quando vence: notificações push, status updates, dashboards live, AI streaming responses (ChatGPT-style). **SSE é underrated**: em 2026 voltou a ser padrão pra LLM streaming.

### 2.4 WebSockets, protocolo

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

### 2.5 WebSockets, operacional

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
- **`socket.io`**: alto-nível, com fallback (long polling), rooms, namespaces, ack callbacks. Próprio protocol em cima de WS, cliente precisa ser socket.io. Não é raw WS.
- **`Bun.serve` com `websocket`**: built-in em Bun.
- **Hono `upgradeWebSocket`** + adapters.

Em greenfield, decide:
- WS puro (`ws` ou framework): se você quer protocol limpo e suas próprias semantics.
- Socket.io: se rooms/namespaces/auto-reconnect/fallback são DX que vale dependência.

### 2.7 Autenticação no upgrade

WebSocket abre via HTTP, cookies/headers do upgrade são acessíveis ao server. Padrões:
- **Cookie HttpOnly de session** (mesmo que HTTP), server lê no upgrade, valida.
- **JWT em query string** (`/ws?token=...`), funciona, mas evite (logs).
- **JWT em first message**: depois do connect, cliente manda `{auth: token}`; server valida ou fecha.
- **Subprotocol header**: alguns trafegam token em `Sec-WebSocket-Protocol`.

Em mobile (RN), cookies trickier, mais comum first-message auth.

### 2.8 WebSocket em scale

Single server: trivial.

N servers: cliente conecta em qualquer um. Quando user A no server 1 manda mensagem pra user B no server 2, precisa **fan-out**.

Patterns:
- **Pub/Sub** via Redis: server 1 publica `chat:userB`; server 2 está subscribed; entrega ao socket local.
- **Sticky sessions**: load balancer roteia mesmo cliente sempre pro mesmo server (via cookie). Reduz movement mas não resolve fan-out.
- **Dedicated message bus**: NATS, Redis Streams, Kafka.
- **Managed**: Pusher, Ably, Soketi (open-source compat com Pusher).

Trade-off: servers mantêm estado (lista de sockets). Restart drops conexões. Clients reconectam.

#### Soketi e Centrifugo, deep

Em 2026 essas duas dominam self-host. Decisão:

| Tool | Modelo | Protocolo | Forte em | Limita em |
|---|---|---|---|---|
| **Soketi** (open-source) | Pusher-protocol-compatible | WebSocket clássico, channel-based | Drop-in pra apps que usavam Pusher (lib JS Pusher cliente igual); presence channels nativos | Presence em escala extrema (cardinality alta); features só do protocolo Pusher |
| **Centrifugo** (open-source) | Bidirectional WS / SSE / SockJS | Próprio + GRPC + HTTP API server-side | History + recovery (cliente reconecta e recebe missed messages); presence + join/leave; tokens JWT-based; client SDKs em 10+ langs | Curva de aprendizado maior; menos adoção que Pusher protocol |

**Soketi setup pra Logística:**
```js
// Server emite evento via Pusher SDK (que aponta pro Soketi)
import Pusher from 'pusher';
const soketi = new Pusher({ host:'soketi.internal', port:'6001', useTLS:false, ... });
await soketi.trigger(`courier-${courierId}`, 'location-update', { lat, lng });

// Client (Pusher JS SDK)
const client = new Pusher(KEY, { wsHost: 'rt.logistica.com', cluster: '' });
client.subscribe(`courier-${courierId}`).bind('location-update', (data) => mapUpdate(data));
```

Soketi escala horizontalmente via Redis adapter (broadcast cross-instance). Benchmark publicado: 1M+ conn/instance em 2GB RAM.

**Centrifugo unique strengths:**
- **History buffer** (configura por channel): cliente reconecta e pede missed events com `since` pointer; sem você implementar replay.
- **Presence**: `client.getPresence(channel)` lista quem está online. Logística usa pra "couriers ativos agora" sem polling DB.
- **Server-side API via GRPC**: alta perf pra eventos com burst alto.
- **Channel namespaces**: politica/permissão por padrão de nome (`logistics:courier:*`).

#### Sticky sessions: cookie hash vs IP hash

L4 LB (NLB AWS, HAProxy mode tcp): só vê IP. **Source IP affinity** funciona até NAT gateway (corp office, mobile carrier). Em mobile carrier com NAT compartilhado, milhares de users vão pro mesmo server — hot spot.

L7 LB (ALB AWS, Nginx, Cloudflare): cookie injection (`AWSALBAPP-x`, `lb_session`). **Cookie-hash sticky** distribui uniformemente, sobrevive a NAT, é o padrão moderno.

Pegadinha: se bypass do LB (apps mobile chegando direto via DNS round-robin), sticky não funciona. Mande cliente sempre via LB, nunca direto a backend.

#### Cardinality de canais

WebSocket scale-out via Redis pub/sub: cada canal subscrito em N instâncias = N×Redis SUBSCRIBE.

- **10k canais × 50 instâncias** = 500k Redis subscriptions. Redis aguenta, mas latência de subscribe sobe.
- **1M canais one-to-one** (canal por user) = problema. Use **shared channels com routing client-side** (1 canal `tenant-X` com payload contendo `targetUserId`).

Padrão Logística:
- `tenant-${tenantId}` (broadcast pra dashboard de lojista, dezenas de subscribers).
- `courier-${courierId}` (1-2 subscribers, usuário + admin).
- `order-${orderId}` (lifecycle do pedido, dezenas de updates, fecha após delivered).

Limpeza: canais com 0 subscribers há > 5min são liberados (Centrifugo TTL config; em Soketi, manual via API).

#### Presence em escala

Centrifugo presence é Redis-backed, ~100k presence updates/s por instance. Pusher presence (Soketi) similar. Acima disso:
- **Sample**: presence atualiza a cada 5s, não a cada msg.
- **Aggregate**: "47 couriers online" em vez de lista completa.
- **Sharded channels**: `couriers-shard-${id % 16}` reduz fan-out por broadcast.

### 2.9 Sticky session e load balancer

L4 (TCP) load balancer: cookies não enxergáveis; sticky por IP. Funciona até NAT.

L7 (HTTP) com cookie: balancer adiciona cookie `lb=server-3`. Roteamento estável.

CDNs (Cloudflare) suportam WebSocket; trace `Cf-Ray` se aparecerem problemas.

### 2.10 SSE em scale

Mesma lógica de fan-out (Redis pub/sub) aplica. Mais simples por ser unidirecional.

CDN compat: SSE deveria passar, mas configure pra não bufferizar (`X-Accel-Buffering: no` em Nginx, `Cache-Control: no-cache`).

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

### 2.14 WebTransport, deep

Sobre HTTP/3 / QUIC (01-03 §2.6.1). Em 2025-2026 saiu de "experimental" pra suportado em Chrome/Edge (default), Firefox (release recente), Safari (em desenvolvimento). Substitui WebSocket em casos onde HOL blocking importa ou onde você precisa datagram unreliable.

**Modelo mental:**
- WebTransport = **conexão QUIC** exposta no browser.
- Por conexão você abre **N streams** + **datagram channel**.
- Cada stream é independente, perda em um não afeta outros (sem TCP HOL blocking).

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
- **CORS-like origin checking**: server precisa validar origin do client.
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

Diferente de real-time em-app. Push notifications via APN (iOS) e FCM (Android), chegam mesmo com app fechado. Cobertos no 02-06.

Combinação real: WebSocket quando app aberto + Push quando fechado.

### 2.17 Presence at scale + message ordering cross-region

Senior+ tópico. Presence naive quebra em ~10k concurrent; ordering cross-region é problema distribuído mal compreendido por devs que tratam WS como "Redis + Pub/Sub e pronto".

#### Presence problem at scale

Naive: `SET user:<id>:online EX 30` + heartbeat a cada 15s. Aguenta ~10k concurrent. Acima disso, refresh load destrói Redis: 100k concurrent = 200k ops/s só de TTL refresh (Redis CPU 100%, sem espaço pra reads).

Pattern hierárquico (Discord/Slack 2026): cada WS server reporta `present_users[]` periódico (~5s) pra coordinator. Coordinator agrega em **presence shards** (per-channel). Subscribers leem shards interessados. ~2k ops/s pra mesmos 100k users (50x menos).

#### Presence diff strategy

Em vez de full snapshot a cada join/leave, mantém set + emite só diff:

```ts
import { Redis } from 'ioredis';
const redis = new Redis.Cluster([{ host: 'redis-shard-0', port: 6379 }]);

// Atomic add + diff publish via Lua (evita race entre SADD e PUBLISH)
const PRESENCE_JOIN = `
  local added = redis.call('SADD', KEYS[1], ARGV[1])
  if added == 1 then
    redis.call('PUBLISH', KEYS[2], cjson.encode({op='join', userId=ARGV[1]}))
  end
  return added
`;

async function addPresence(channelId: string, userId: string) {
  const setKey = `presence:${channelId}`;
  const diffChan = `presence:diff:${channelId}`;
  await redis.eval(PRESENCE_JOIN, 2, setKey, diffChan, userId);
}

// Recovery: cliente reconectando faz full SMEMBERS, depois consume diff
async function reconcilePresence(channelId: string) {
  const setKey = `presence:${channelId}`;
  const full = await redis.smembers(setKey);
  // Subscribe ao diff channel ANTES de retornar full pra não perder eventos
  return full;
}
```

Bandwidth: full snapshot de 1000 users em sala = ~30KB por join; diff = ~50 bytes. 600x menor.

#### Message ordering cross-region

Problem: 2 regions (US, EU) com WS users. Mensagem A→B atravessa regiões; ordem percebida depende de propagation.

- **Total ordering global**: requer broker centralizado (Kafka mono-region). Latência cross-region 100-300ms inaceitável pra chat-like. Descartado.
- **Per-conversation ordering** (99% dos casos): consistent hash by `conversation_id` → home region. Writes vão pra home; reads em qualquer região via async replication. Trade-off: write latency pra non-home users (~150ms RTT EU→US).
- **Hybrid Logical Clocks (HLC)** cross-region (cruza com `04-01` §2.21): cada region taga message com HLC; client orders por HLC localmente. Aceita inconsistência transient.

```ts
// HLC tag em cada message cross-region
type HLC = { wall: number; logical: number; region: string };

let local: HLC = { wall: Date.now(), logical: 0, region: 'us-east-1' };

function tagMessage(payload: unknown): { hlc: HLC; payload: unknown } {
  const now = Date.now();
  local = now > local.wall
    ? { wall: now, logical: 0, region: local.region }
    : { wall: local.wall, logical: local.logical + 1, region: local.region };
  return { hlc: { ...local }, payload };
}

// Client ordena por (wall, logical, region) tuple — never raw Date.now()
function compareHLC(a: HLC, b: HLC): number {
  return a.wall - b.wall || a.logical - b.logical || a.region.localeCompare(b.region);
}
```

Vector clocks raramente justificáveis em chat real-time (overhead de O(N regions) por message).

#### Sharding fan-out

Single Redis Pub/Sub satura em ~50k subscribers. Pattern: shard channels via `channel_id % N` em N Redis instances. Cada WS server subscribes só aos shards dos channels dos users conectados a ele.

Pegadinha em Redis Cluster: Pub/Sub classic é cluster-wide (cross-node fan-out destrói perf). **Redis 7+ Sharded Pub/Sub** via `SSUBSCRIBE` evita isso (mensagem fica no hash slot do channel):

```ts
// Redis 7+ Sharded Pub/Sub — escala 10x classic Pub/Sub em Cluster
const sub = new Redis.Cluster([{ host: 'redis-0', port: 6379 }]);
await sub.ssubscribe(`presence:diff:channel:${channelId}`);
sub.on('smessage', (channel, msg) => deliverToLocalSockets(channel, msg));

// Publisher
await redis.spublish(`presence:diff:channel:${channelId}`, JSON.stringify(diff));
```

Numbers reais 2026: Sharded Pub/Sub Redis 7 = ~500k channels × ~5k subs com p99 < 50ms. Classic Pub/Sub satura em ~50k subs.

#### WebSocket connection sharding

1 WS server tunado = ~50-200k concurrent (Linux defaults precisam tuning):

```bash
ulimit -n 1048576                                # max open files
sysctl -w net.core.somaxconn=65535               # listen backlog
sysctl -w net.ipv4.ip_local_port_range="1024 65535"  # ephemeral ports
sysctl -w net.ipv4.tcp_tw_reuse=1
```

Pattern Logística com 1M concurrent: 20 WS servers × 50k each, behind L4 NLB com **ip-hash sticky** (ou cookie sticky em ALB). WebSocket precisa stick pra reuse de connection — sem isso, reconnect cai em outro server e perde state local.

ALB com WebSocket: aumentar `idle_timeout` pra 3600s (default 60s mata long-lived).

#### Soketi / Centrifugo / Pusher 2026

| Tool | Fit | Threshold |
|---|---|---|
| **Soketi 1.x** (open-source Pusher protocol) | Drop-in Pusher; single-instance Redis adapter | < 50k concurrent single-node; cluster pra > 100k |
| **Centrifugo 5.x** (Go broker) | Presence + history nativo; horizontal scaling built-in | Até milhões concurrent em cluster 3-5 nodes |
| **Pusher Channels** (managed) | Zero-ops; caro ($1k+/mês a 10k concurrent) | Sempre, se budget permite |
| **Ably** (managed multi-region) | Presence cross-region built-in; HLC interno | Apps globais com presence sério |

Self-hosted threshold: < 50k → Soketi single-node. > 50k → Centrifugo cluster ou managed.

#### Logística applied

~5k lojistas × ~50 couriers tracked each = ~250k subscriptions concurrent. Stack:

- **Centrifugo cluster** (3 nodes, Redis-backed engine).
- Couriers publish location to `tenant:<id>:courier:<id>:location` (Centrifugo HTTP API server-side).
- Lojistas subscribe a courier IDs específicos (não ao tenant inteiro — fan-out controlado).
- Presence diff: lojistas vêem "courier X online/offline" via diff stream; full snapshot só no connect.
- Multi-region (US/EU/BR): per-tenant home region via consistent hash by `tenant_id`. Cross-region só pra analytics replication async.

#### Anti-patterns observados

- Heartbeat naive com TTL refresh > 10k concurrent (Redis CPU 100%).
- Full presence snapshot a cada join/leave (bandwidth explode em sala 1000+ users).
- Redis Pub/Sub classic em Cluster cross-node — use Sharded Pub/Sub Redis 7 (`SSUBSCRIBE`).
- Total ordering global em chat (latência cross-region inaceitável).
- WebSocket sem sticky session em LB (reconnects perdem state local).
- WS atrás de L7 ALB sem `idle_timeout` aumentado (default 60s mata connections).
- HLC ignorado, `Date.now()` raw cross-region (clock skew + replay out-of-order).
- Soketi self-hosted > 100k concurrent sem cluster (single-node bottleneck).

#### Cruza com

- `02-11` (Redis): Sharded Pub/Sub Redis 7+ + presence shards.
- `04-01` (sistemas distribuídos): HLC pra ordering cross-region.
- `04-02` (messaging): fan-out patterns, Kafka mono-region pra total ordering.
- `04-09` (scaling): WS connection limits + connection sharding.
- `03-05` (AWS): NLB ip-hash vs ALB cookie stickiness pra WS.

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

Adicionar **real-time tracking** ao Logística, courier streama posição, lojista vê em tempo real.

### Especificação

1. **Stack**:
   - Continuação Fastify + Redis. Adicione lib `ws` (não Socket.io aqui).
   - Front: dashboard simples (SSR Next ou SPA básica) consumindo eventos.
2. **Endpoint WebSocket, courier upload**:
   - `WS /courier/stream`, courier envia `{lat, lng, speed, ts}` a cada 5s.
   - Auth: cookie session ou first-message JWT (escolha + justifique).
   - Server valida, persiste último ponto em Redis (`courier:<id>:last`), faz pub em canal `courier:updates:<tenantId>`.
3. **Endpoint SSE, lojista observa**:
   - `GET /orders/:id/track`, SSE stream que emite eventos quando courier do pedido se move.
   - Server subscribe ao canal Redis correspondente, repassa pro client SSE.
   - Reconnect: server respeita `Last-Event-ID` e replay últimos eventos do Redis Stream.
4. **Long polling fallback**:
   - `GET /orders/:id/track-poll?since=<eventId>`, long polling 30s.
   - Cliente que não suporta SSE cai aqui.
5. **Notificação genérica via WebSocket, bidirecional**:
   - `WS /notifications`, cada user logado subscreve.
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

- **MDN, WebSockets, EventSource, WebRTC, Fetch streams** ([developer.mozilla.org/en-US/docs/Web/API](https://developer.mozilla.org/en-US/docs/Web/API)).
- **RFC 6455** (WebSocket Protocol).
- **RFC 8441** (WebSockets over HTTP/2).
- **High Performance Browser Networking**: Ilya Grigorik (capítulos sobre WS, SSE, WebRTC).
- **"Designing Data-Intensive Applications"**: Kleppmann, capítulo 11 (stream processing).
- **WebRTC for the Curious** ([webrtcforthecurious.com](https://webrtcforthecurious.com/)), book gratuito.
- **Soketi** ([soketi.app](https://soketi.app/)) e **Centrifugo** ([centrifugal.dev](https://centrifugal.dev/)), open-source WS infra.
- **Cloudflare blog**: Durable Objects, WebSocket at the edge.
