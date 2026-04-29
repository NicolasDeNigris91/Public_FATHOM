---
module: 01-03
title: Redes, OSI, TCP/IP, DNS, HTTP, TLS
stage: fundamentos
prereqs: [01-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-03, Redes

## 1. Problema de Engenharia

Toda aplicação web roda sobre uma pilha de protocolos que vai desde sinais elétricos (camada física) até JSON sobre HTTPS (camada de aplicação). Não entender o que está embaixo do `fetch()` significa não saber:

- Por que latência é alta (RTT, slow start, packet loss, TLS handshake)
- Por que conexões "morrem" (TCP keepalive, NAT timeout, idle close)
- Por que HTTPS é lento na primeira request mas rápido depois (session resumption)
- Por que HTTP/2 ajuda em alguns casos e não em outros (multiplexing vs head-of-line blocking)
- Por que CORS dói (e por que as soluções de Stack Overflow são quase todas erradas)

Exemplos onde desconhecimento custa caro:
- Você adiciona `Cache-Control: no-cache` achando que desabilita cache. Não desabilita, só força revalidação. Pra desabilitar é `no-store`. Pequeno detalhe que custou caro.
- Sua API tem latência alta em conexões de mobile. Causa: TLS handshake (~300ms+ em cold start) + você não habilitou HTTP/2 (que reusa conexão).
- Seu WebSocket "cai" após 60 segundos em produção, mas funciona localmente. Causa: NAT timeout do load balancer + você não configurou ping/pong.

Este módulo te dá o **modelo mental completo** da pilha de rede, desde o pacote IP até o cookie HTTP.

---

## 2. Teoria Hard

### 2.1 Modelo OSI vs TCP/IP

O **OSI** é um modelo de referência de 7 camadas, didático mas pouco aderente à prática. O **TCP/IP** (4-5 camadas) é o que internet realmente usa.

| OSI | TCP/IP | Exemplo |
|-----|--------|---------|
| 7. Application | Application | HTTP, gRPC, DNS, SMTP |
| 6. Presentation | (parte de Application) | TLS, JSON, gzip |
| 5. Session | (parte de Application) | Sessions, cookies |
| 4. Transport | Transport | TCP, UDP, QUIC |
| 3. Network | Internet | IP, ICMP |
| 2. Data Link | Link | Ethernet, Wi-Fi |
| 1. Physical | Link | Cabo, ondas |

Cada camada **encapsula** a anterior: pacote IP carrega segmento TCP, que carrega request HTTP. Cada camada adiciona seu cabeçalho.

```
[Ethernet header | [IP header | [TCP header | [HTTP request]]]]
```

### 2.2 IP, Internet Protocol

**IP é roteamento.** Cada interface de rede tem um endereço IP (IPv4 32-bit, IPv6 128-bit). Pacote IP tem destino → roteadores encaminham.

**IPv4** (`192.168.1.10`): 4 octetos, ~4 bilhões de endereços. Esgotado, usamos NAT.
**IPv6** (`2001:0db8::1`): 8 grupos de 4 hex, virtualmente infinitos endereços. Adoção crescente mas ainda parcial.

**IP é stateless e sem garantia.** Pacotes podem:
- Ser perdidos
- Chegar fora de ordem
- Ser duplicados
- Ser fragmentados (se MTU da rede é menor que pacote)

**MTU (Maximum Transmission Unit):** tipicamente 1500 bytes em Ethernet. Pacotes maiores são fragmentados.

**Subnets e roteamento:** mascará `192.168.1.0/24` define rede. Router compara IP destino com tabela de rotas e encaminha. Internet é uma teia de roteadores BGP.

**NAT** (Network Address Translation): seu roteador doméstico tem 1 IP público; máquinas internas têm IPs privados (`192.168.x.x`, `10.x.x.x`). NAT mapeia conexões saintes pra portas. Por isso você não pode receber conexão de fora sem port forwarding.

**ICMP**: protocolo de controle. `ping` usa ICMP echo request/reply. `traceroute` usa TTL incrementado.

### 2.3 TCP, Transmission Control Protocol

**TCP** é a camada que dá garantias em cima do IP não-confiável:
- **Confiabilidade**: pacotes perdidos são retransmitidos.
- **Ordem**: dados chegam na ordem enviada.
- **Controle de fluxo**: receptor anuncia quanto pode receber (window size).
- **Controle de congestionamento**: emissor reduz taxa se rede está congestionada.
- **Conexão**: estabelecimento explícito (handshake) e encerramento.

**TCP three-way handshake:**

```
Cliente                     Servidor
   │                            │
   │──── SYN (seq=x) ──────────►│
   │                            │
   │◄── SYN-ACK (seq=y, ack=x+1)│
   │                            │
   │──── ACK (ack=y+1) ────────►│
   │                            │
   │◄════════ data ════════════►│
```

Custo: **1 RTT** (round-trip time) antes de enviar dado. Se RTT é 50ms, 50ms de overhead. Por isso reuso de conexão (HTTP keepalive) importa muito.

**TCP four-way close:**

```
Cliente                     Servidor
   │──── FIN ──────────────────►│
   │◄─── ACK ───────────────────│
   │◄─── FIN ───────────────────│
   │──── ACK ──────────────────►│
```

Existe estado **TIME_WAIT** (~2 minutos) onde a conexão fica "fantasma" pra evitar pacotes atrasados confundirem nova conexão. Servidores que abrem muitas conexões saintes podem esgotar portas locais por TIME_WAIT.

**Slow start e congestion control**: TCP começa enviando pouco e dobra (exponencialmente) até ver perda; então reduz e cresce linearmente. Conexões novas são lentas no início. Conexões longas estabilizam em alta vazão.

**Nagle's algorithm**: agrupa pequenas escritas em um segmento maior. Útil pra throughput, ruim pra latência. Pode ser desabilitado com `TCP_NODELAY` (Node: `socket.setNoDelay(true)`).

### 2.4 UDP, User Datagram Protocol

**UDP é IP + portas + checksum**. Sem garantias. Sem ordem. Sem retransmissão. Sem controle de fluxo.

**Por que existe:**
- **Latência crítica** (DNS, jogos, VoIP, streaming): perdas são preferíveis a esperar retransmissão.
- **Broadcast/multicast**: TCP é point-to-point.
- **Sem state**: servidor não mantém conexão aberta, útil pra carga massiva.

**QUIC** (sobre UDP, usado em HTTP/3) implementa as garantias do TCP **em user space**, mais flexível e com features novas (0-RTT, conexão persistente em mudança de IP).

### 2.5 DNS, Domain Name System

DNS resolve nomes (`example.com`) em IPs.

**Hierárquico:**
- **Root servers** (`a.root-servers.net` ... `m.`)
- **TLD servers** (`.com`, `.org`, `.br`)
- **Authoritative servers** (DNS do dominio)
- **Recursive resolvers** (provedor, 1.1.1.1, 8.8.8.8), fazem o trabalho pesado

**Tipos de record:**
- `A`, IPv4
- `AAAA`, IPv6
- `CNAME`, alias pra outro nome
- `MX`, mail server
- `TXT`, texto livre (SPF, DMARC, verificações)
- `NS`, name server autoritativo
- `SOA`, start of authority

**Cache e TTL:** cada resposta tem TTL. Resolvers e clientes cacheiam até expirar. Por isso mudanças de DNS demoram a propagar.

**Custo de DNS**: lookup pode levar 10-100ms na primeira vez. Browsers cacheiam. Aplicações podem cachear via lib (Node: `dns.setServers`, ou pacote `cacheable-lookup`).

**DNS over HTTPS (DoH) / DNS over TLS (DoT):** DNS criptografado.

### 2.6 HTTP/1.1, HTTP/2, HTTP/3

**HTTP/1.1** (1997, RFC 9112):
- Texto plano, request/response.
- **Keep-alive** (`Connection: keep-alive`) reusa conexão TCP.
- **Pipelining** existia mas é raro/quebrado.
- Limita ~6 conexões paralelas por origem em browser.
- **Head-of-line blocking** em nível de conexão: requests serializados.

**HTTP/2** (2015, RFC 9113):
- Binário (não textual).
- **Multiplexing**: muitos streams numa conexão TCP, paralelismo sem TIME_WAIT.
- **Header compression** (HPACK).
- **Server push** (raramente usado, sendo deprecated).
- Ainda sofre **TCP head-of-line blocking**: 1 pacote perdido bloqueia todos os streams.

**HTTP/3** (2022, RFC 9114):
- Roda sobre **QUIC** (UDP, com criptografia integrada).
- Sem TCP HOL blocking, perdas em um stream não afetam outros.
- **0-RTT** em conexões repetidas (envia dado no primeiro pacote se conhece o servidor).
- Migração de IP transparente (útil em mobile que muda de Wi-Fi pra 4G).

### 2.6.1 QUIC deep, por que é o transport de 2025+

QUIC (RFC 9000, 9001, 9002) é o substrato de HTTP/3 mas tem importância autônoma. Em 2026 já é majoritário em CDN traffic (Cloudflare, Akamai, Fastly reportam 30-50% das requests). Vale entender pra design de protocolos novos.

**Por que UDP em vez de TCP:**
- TCP é **kernel space** e protocolo concreto, mudar exige patch de OS, deploy lento.
- UDP é primitivo. QUIC roda em user space, bibliotecas atualizam por release de aplicação. Isso destrava velocidade de evolução do transport.
- TCP fast open exige cooperação de kernel + middleboxes; muitos NATs descartam. QUIC encripta cabeçalho de transport, middleboxes não têm o que mexer.

**Connection vs streams:**
- 1 conexão QUIC = N streams independentes. Stream individual tem ordering garantida; entre streams, **sem HOL blocking**.
- Stream IDs são tipados (client-initiated bidirecional, server-initiated unidirecional, etc.), base de WebTransport (02-14).

**0-RTT na prática:**
- Cliente cacheia "session ticket" do servidor. Próxima conexão envia request **junto com handshake**. Latência: 0 RTT extra vs 1-2 RTT do TLS 1.3 sobre TCP.
- Risco: **replay attack** em requests não-idempotentes. POST de pagamento via 0-RTT é furada, aceite só GET/idempotent em 0-RTT (NGINX faz isso por default).

**Connection migration:**
- Conexão identificada por **Connection ID** (não por 5-tuple IP/port). Mudar de Wi-Fi pra 4G mantém conexão viva, útil em apps mobile, vídeo conferência.
- Cuidado: alguns load balancers velhos hash em 5-tuple e quebram migration.

**Trade-offs reais:**
- **CPU cost**: QUIC na primeira geração custava 2-3x mais CPU que TCP+TLS. Em 2026 com aceleração (kTLS-like, GSO/GRO em UDP) está ~1.2-1.5x. Cloudflare publicou números detalhados.
- **Middlebox blocking**: ~5% de redes corporativas bloqueiam UDP/443 por DPI conservador. App precisa fallback pra HTTP/2-over-TCP.
- **Stateful firewall**: rotas que registram TCP states não funcionam pra UDP. Custom rules necessários.

**Quando você toca QUIC:**
- Servidor: nginx 1.25+, Caddy, h2o, ou bibliotecas (`quiche` da Cloudflare em Rust, `msquic` da Microsoft, `lsquic` da LiteSpeed).
- Cliente: navegadores modernos por default, `curl --http3`, libs HTTP em todas as linguagens majoritárias têm clients h3.
- WebTransport (cobre 02-14): API de browser pra streams QUIC custom.

**Métodos HTTP:**
- `GET` (idempotente, sem body, com query string)
- `POST` (criação, com body, **não idempotente**)
- `PUT` (substituição completa, idempotente)
- `PATCH` (modificação parcial, geralmente não idempotente, mas depende)
- `DELETE` (idempotente)
- `HEAD`, `OPTIONS` (metadados, CORS preflight)

**Status codes (categorias):**
- `1xx`, Informational (raro)
- `2xx`, Success (`200 OK`, `201 Created`, `204 No Content`)
- `3xx`, Redirect (`301`, `302`, `304 Not Modified`)
- `4xx`, Client error (`400`, `401`, `403`, `404`, `409`, `429`)
- `5xx`, Server error (`500`, `502`, `503`, `504`)

### 2.7 TLS, Transport Layer Security

TLS adiciona **confidencialidade**, **integridade** e **autenticação** sobre TCP. HTTPS = HTTP sobre TLS.

**TLS 1.3 handshake (simplificado):**

```
Cliente                                    Servidor
   │── ClientHello (suites, key share) ───►│
   │                                       │
   │◄─ ServerHello + cert + key share ─────│
   │   (+ Finished, encrypted)              │
   │                                       │
   │── Finished (encrypted) ──────────────►│
   │                                       │
   │◄═══════ Application Data ════════════►│
```

**1 RTT** pra estabelecer (vs 2 RTT em TLS 1.2). **0-RTT** em sessões repetidas (resumption).

**Componentes:**
- **Cifras simétricas** (AES-GCM, ChaCha20-Poly1305): criptografam payload, rápidas.
- **Cifras assimétricas** (ECDHE pra key exchange, RSA/ECDSA pra assinatura): pra estabelecer chave compartilhada.
- **Certificados X.509**: identidade assinada por CA. Cadeia de confiança até root CAs no sistema.
- **Hash** (SHA-256): integridade.

**Validação de certificado:**
1. Cadeia até CA confiável.
2. Não expirado.
3. CN/SAN bate com hostname.
4. Não revogado (CRL ou OCSP).

**Erros comuns:** `SELF_SIGNED_CERT_IN_CHAIN` em dev, `CERT_HAS_EXPIRED`, hostname mismatch.

**mTLS (mutual TLS)**: cliente também apresenta certificado. Usado em service mesh (Istio), zero-trust networking.

### 2.8 HTTP avançado, caching, cookies, CORS

**Caching (RFC 9111):**
- `Cache-Control: max-age=3600`, cache por 1h
- `Cache-Control: no-cache`, usa cache mas valida primeiro com servidor (ETag/Last-Modified)
- `Cache-Control: no-store`, **não cacheia** (use pra dados sensíveis)
- `Cache-Control: private`, só cliente cacheia, não proxies/CDN
- `ETag: "abc123"`, fingerprint de conteúdo. Cliente envia `If-None-Match` em revalidação; servidor responde `304 Not Modified` se igual.

**Cookies:**
- `Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`
- `HttpOnly`: JS não acessa (defesa contra XSS roubar token).
- `Secure`: só envia em HTTPS.
- `SameSite=Strict|Lax|None`: defesa contra CSRF.
- `Domain`, `Path`: escopo do cookie.

**CORS, Cross-Origin Resource Sharing:**
- Browsers bloqueiam requests cross-origin (origin = scheme + host + port) por default.
- Servidor pode permitir com headers: `Access-Control-Allow-Origin: https://my.com`, `Allow-Methods`, `Allow-Headers`, `Allow-Credentials`.
- Requests "complexos" (PUT, custom headers, etc) disparam **preflight OPTIONS** antes do request real.
- Erros comuns: `*` com `credentials: 'include'` (não funciona, Origin tem que ser explícito).

### 2.9 Sockets em Node, código que mostra tudo

```typescript
import net from 'node:net';

// Servidor TCP simples
const server = net.createServer((socket) => {
  socket.setNoDelay(true); // desabilita Nagle
  socket.on('data', (buf) => socket.write(`echo: ${buf}`));
  socket.on('end', () => console.log('client disconnected'));
});

server.listen(3000); // syscalls: socket, bind, listen
```

Internamente: `socket()` → FD; `bind()` → associa FD a porta; `listen()` → kernel aceita conexões; `accept()` → nova conexão é novo FD; cada `data` é `read(fd, buf)`; `write` é syscall.

Quando o cliente conecta, o kernel notifica via `epoll`. libuv leva isso pra event loop. Sua callback é chamada em JS.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Listar as 4 camadas de TCP/IP e dar 2 protocolos por camada.
- [ ] Desenhar o **TCP three-way handshake** com seq/ack numbers.
- [ ] Explicar o **slow start** e por que conexões novas têm vazão baixa.
- [ ] Distinguir **TCP** vs **UDP** com 4 diferenças e dar caso de uso pra cada.
- [ ] Explicar **HOL blocking** em HTTP/1.1, HTTP/2, e por que QUIC resolve.
- [ ] Desenhar o **TLS 1.3 handshake** completo, identificando o que é assimétrico vs simétrico.
- [ ] Explicar **CORS** e dar um caso onde `Access-Control-Allow-Origin: *` falha (e por quê).
- [ ] Distinguir `Cache-Control: no-cache` vs `no-store`.
- [ ] Explicar `SameSite=Lax` vs `Strict` em termos de proteção CSRF.
- [ ] Dar um caso onde `Connection: keep-alive` é prejudicial (ex: load balancer com conexões longas presas).
- [ ] Explicar por que `EAGAIN` aparece em sockets não-bloqueantes e como tratar.

---

## 4. Desafio de Engenharia

**Implementar um proxy HTTP/1.1 reverso em Node, do zero (sem `http`).**

### Especificação

Você vai construir um servidor TCP que:
1. **Escuta na porta 3000.**
2. Aceita conexões TCP brutas e **parseia HTTP/1.1 manualmente** (request line, headers, body).
3. Suporta `Content-Length` e `Transfer-Encoding: chunked`.
4. Para cada request, **encaminha** pra um servidor backend (você define a URL via env var, ex: `BACKEND=http://localhost:8080`).
5. Retorna a resposta do backend ao cliente, preservando status, headers e body.
6. **Suporta keep-alive** corretamente (`Connection: keep-alive`).
7. Suporta **múltiplas conexões concorrentes**.

### Restrições

- Use **apenas** `node:net`, `node:url`, `node:crypto` (e tipagem TypeScript).
- **Não use** `node:http`, `node:fetch`, libs como `http-proxy`, `axios`, etc.
- Você implementa o parser HTTP do zero.

### Threshold

- Funciona como proxy de um servidor `node -e 'require("http").createServer((req,res)=>res.end("hi")).listen(8080)'` em background.
- Suporta `wrk -t4 -c100 -d10s http://localhost:3000/` mantendo correção (todas as responses corretas, sem corrupção).
- Lida com headers que vêm em múltiplos chunks TCP (não assuma que `data` event traz tudo).
- Documenta no README:
  - Estado do parser (state machine: `READING_REQUEST_LINE` → `READING_HEADERS` → `READING_BODY` → ...).
  - Como você lida com **request smuggling** (atacante envia request que parece 1 mas é 2).
  - Como você lida com `100 Continue`.

### Stretch goals

- Suporte a **load balancing** entre múltiplos backends (round-robin).
- Suporte a **health checks** (descarta backends doentes).
- Suporte a **logs estruturados** com latência por request.

---

## 5. Extensões e Conexões

- **Conecta com [01-02, OS](01-02-operating-systems.md):** sockets são FDs; `epoll` é o que sustenta servidores high-concurrency. Acceptar conexão é syscall.
- **Conecta com [01-07, JavaScript Deep](01-07-javascript-deep.md):** todos eventos de socket entram no event loop como callbacks. Backpressure em streams TCP/HTTP é gerenciado pela API de streams do Node.
- **Conecta com [02-07, Node.js Internals](../02-plataforma/02-07-nodejs-internals.md):** `net` e `http` são thin wrappers em libuv + parsing TS.
- **Conecta com [02-13, Auth](../02-plataforma/02-13-auth.md):** OAuth2 e JWT dependem de TLS pra confidencialidade. Cookies SameSite são defesa CSRF.
- **Conecta com [02-14, Real-time](../02-plataforma/02-14-realtime.md):** WebSocket é upgrade HTTP → protocolo binário sobre TCP. SSE usa HTTP normal com `Content-Type: text/event-stream`.
- **Conecta com [03-05, AWS Core](../03-producao/03-05-aws-core.md):** Route53 (DNS), CloudFront (CDN), Application Load Balancer (TLS termination), Security Groups (firewalls em IP/porta).
- **Conecta com [03-08, Applied Security](../03-producao/03-08-applied-security.md):** mTLS, CSP, CORS, rate limiting baseado em IP.

### Ferramentas satélites

- **`curl -v`**: ver request/response HTTP completo.
- **`tcpdump`**, **`wireshark`**: capturar pacotes raw.
- **`mtr`**: ping + traceroute em tempo real.
- **`dig`**, **`nslookup`**: queries DNS.
- **`openssl s_client -connect host:443`**: inspecionar TLS handshake.
- **`mitmproxy`**: proxy MITM pra debug HTTP/HTTPS.
- **`wrk`**, **`k6`**, **`vegeta`**: load testing.
- **[Wireshark filters cheat sheet](https://www.wireshark.org/docs/dfref/)**.

---

## 6. Referências de Elite

### Livros canônicos
- **Computer Networking: A Top-Down Approach** (Kurose & Ross, 8th ed), top-down, melhor pra programadores.
- **High Performance Browser Networking** (Ilya Grigorik), free em [hpbn.co](https://hpbn.co/). Capítulos sobre TCP, TLS, HTTP/2, WebSocket, WebRTC. **Leitura obrigatória.**
- **TCP/IP Illustrated, Volume 1** (Stevens), clássico, denso, mas autoritativo.

### RFCs canônicos (leia os relevantes)
- [RFC 791](https://datatracker.ietf.org/doc/html/rfc791), IP
- [RFC 793](https://datatracker.ietf.org/doc/html/rfc793), TCP (também leia [RFC 9293](https://datatracker.ietf.org/doc/html/rfc9293), atualização)
- [RFC 768](https://datatracker.ietf.org/doc/html/rfc768), UDP (1 página)
- [RFC 1035](https://datatracker.ietf.org/doc/html/rfc1035), DNS
- [RFC 9110](https://datatracker.ietf.org/doc/html/rfc9110), HTTP semantics
- [RFC 9112](https://datatracker.ietf.org/doc/html/rfc9112), HTTP/1.1
- [RFC 9113](https://datatracker.ietf.org/doc/html/rfc9113), HTTP/2
- [RFC 9114](https://datatracker.ietf.org/doc/html/rfc9114), HTTP/3
- [RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446), TLS 1.3
- [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455), WebSocket

### Talks
- **["High Performance Networking in Google Chrome"](https://www.igvita.com/posa/high-performance-networking-in-google-chrome/)**: Ilya Grigorik.
- **["A QUIC look at HTTP/3"](https://www.youtube.com/results?search_query=QUIC+HTTP%2F3)**: várias talks na conferência Linux Networking.

### Repos
- **[curl](https://github.com/curl/curl)**: código C de referência. Leia `lib/http.c`, `lib/conncache.c`.
- **[nginx](https://github.com/nginx/nginx)**: servidor HTTP de referência.
- **[Caddy](https://github.com/caddyserver/caddy)**: server HTTP em Go, fácil de ler.
- **[h2o](https://github.com/h2o/h2o)**: HTTP/2 server, ótimo pra estudar implementação.

### Comunidade
- **[Cloudflare blog](https://blog.cloudflare.com/)**: escreve sobre TCP, TLS, QUIC com profundidade técnica raríssima.
- **[Mozilla MDN, HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)**.
- **r/networking**, **r/webdev**.

---

**Encerramento:** após 01-03 você consegue ler logs HTTP, debug de DNS, configuração de TLS, sem chutar. CORS deixa de ser misterioso. Latência vira algo que você pode raciocinar (RTT, slow start, handshake) e medir.
