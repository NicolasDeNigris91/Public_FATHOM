---
module: 03-14
title: Graphics, Audio & Real-Time Codecs — WebGL/WebGPU, Canvas, Audio API, Video Pipelines
stage: producao
prereqs: [03-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-14 — Graphics, Audio & Real-Time Codecs

## 1. Problema de Engenharia

Web é mais que documento + form. Aplicações modernas crescentemente envolvem **mídia**: mapas com millions de pontos, dashboards reativos com 60fps, videoconferência, áudio capture/processing, edição de imagem no browser, jogos, AR/VR (WebXR). Cada uma dessas capabilities tem stack próprio: Canvas 2D, WebGL/WebGPU, Web Audio, MediaStream, codecs (H.264, VP9, AV1, Opus), MSE, WebRTC.

Maioria dos devs trata isso como caixa-preta — usa biblioteca, cruza dedos. Mas apps competitivos no espaço de mídia (Figma, Excalidraw, Loom, Tldraw, Google Meet, Discord) **dominam pipelines internos**: GPU shaders custom, audio worklets, frame budgets de 16ms, codec choice e bitrate adaptation. Quando você precisa pixel-perfect 60fps com ms de latency, abstrações vazam.

Este módulo é **graphics/audio/video pipelines no browser e nativo**, com foco em entender **frame budget, GPU pipeline, codec internals, latência fim-a-fim**. Logística pode se beneficiar de mapa GPU-rendered, vídeo de comprovação de entrega, dashboards 60fps.

---

## 2. Teoria Hard

### 2.1 Frame budget e raf

60fps = 16.67ms por frame. Browser deve completar JS + style + layout + paint + composite dentro disso, ou frame **drops**.

`requestAnimationFrame` (raf) sincroniza com vsync. Trabalho em raf é tudo que rola por frame. Long tasks (> 50ms) são interrupção visível.

Targets: 60fps = 16ms; 120fps mobile/iPad = 8ms. Animations precisam ser GPU-only (transform, opacity); layout/paint mata budget.

### 2.2 Canvas 2D

API imperativa. Estado (transform, fillStyle, lineWidth) e métodos (`fillRect`, `arc`, `drawImage`). CPU-bound mas com hardware accel em compositing.

Bom pra: gráficos médios (até ~5k objetos), texto, sprites simples.

Anti-pattern: `ctx.fillStyle = 'red'` num loop com mesma cor (custo de state change). Batch.

OffscreenCanvas: roda em Worker; libera main thread.

### 2.3 WebGL: pipeline GPU

WebGL 1 (~OpenGL ES 2.0) e WebGL 2 (~OpenGL ES 3.0). API low-level, descrita em estados (program, buffers, uniforms, textures, framebuffers).

Pipeline:
1. **Vertex shader**: roda por vértice; transforma posição, passa varyings.
2. **Rasterization**: GPU interpola pra pixels.
3. **Fragment shader**: roda por pixel; computa cor.
4. **Blending / depth test / stencil**: pixel final no framebuffer.

Shaders em **GLSL ES**. Você compila string em `WebGLProgram`.

### 2.4 WebGPU: o sucessor

Padrão W3C novo (Chrome 113+, Firefox/Safari atrás). Baseado em Vulkan/Metal/D3D12. Trade off: mais boilerplate, mas:
- **Compute shaders** (não só graphics).
- **Bind groups** estáticos = menos overhead.
- **WGSL** (linguagem nova, mais segura que GLSL).
- Async APIs.

Pra novo projeto greenfield com browsers modernos: WebGPU. Pra suporte amplo hoje: WebGL ainda.

### 2.5 GPU programming basics

GPU é massivamente paralelo. Vertex shader roda 100k+ vezes/frame; fragment shader, milhões. Pensar **data-parallel**:
- Sem branches divergentes (todos os threads no warp executam mesmo path).
- Memory access coalescente (vizinhos lendo vizinhos).
- Texturas pra lookup (cache otimizado).

Compute shaders (WebGPU) deixam você usar GPU pra non-graphics: image processing, physics, ML.

### 2.6 SVG vs Canvas vs WebGL

- **SVG**: declarativo, em DOM. Bom até centenas de elementos (cada SVG é DOM node, layout cost).
- **Canvas 2D**: imperativo, raster. Bom até milhares.
- **WebGL/WebGPU**: dezenas de milhares a milhões. Maps (Mapbox, deck.gl) usam.

Critério: count de elementos + interatividade individual.

### 2.7 Web Audio API

Graph de **AudioNode**: source (oscillator, buffer, mediaStream), processor (gain, filter, convolver, panner), destination.

```js
const ctx = new AudioContext();
const src = ctx.createMediaStreamSource(stream);
const gain = ctx.createGain();
src.connect(gain).connect(ctx.destination);
```

**AudioWorklet**: processador custom em thread dedicada. Substitui `ScriptProcessorNode` (depreciado, rolava em main).

Sample rate típico 48kHz. Buffer sizes 128-1024 samples. Latency target < 20ms pra interactive.

### 2.8 MediaStream e WebRTC

`getUserMedia({video, audio})` retorna MediaStream. WebRTC (02-14) usa pra peer-to-peer.

Pipeline: capture → encode (browser-controlled) → network → decode → render. Peer connection negocia codecs (SDP) e candidates (ICE).

### 2.9 Codecs de vídeo

- **H.264 (AVC)**: ubíquo, hardware decode universal. Royalty issues.
- **H.265 (HEVC)**: ~30% melhor compressão; royalty pesado, adoção web limitada.
- **VP9**: open-source Google, ~similar HEVC, suporte web amplo.
- **AV1**: open AOM, ~30% melhor que VP9, encoder lento, decode chegando em hardware.

Conceitos:
- **GOP** (Group of Pictures): I-frame (independente) → P-frames (predict forward) → B-frames (bi-direção).
- **Bitrate**: CBR (constant), VBR (variable), CRF (constant rate factor — quality target).
- **Profile/level**: subset de features.
- **Resolution / framerate / colorspace** (BT.709/2020).

Bitrate adaptation (HLS/DASH): múltiplas renditions, player escolhe via bandwidth/buffer.

### 2.10 Codecs de áudio

- **Opus**: codec moderno, 6-510 kbps, voz e música. Default WebRTC.
- **AAC**: ubíquo em streaming; hardware acelerado.
- **MP3**: legado.
- **FLAC**: lossless.

Voz pode usar 16kHz mono em 24-32 kbps (Opus). Música stereo 128-256 kbps.

### 2.11 MSE e DASH/HLS

**Media Source Extensions (MSE)**: feed bytes em `<video>` via `SourceBuffer`. Permite players adaptive (DASH/HLS no browser).

- **HLS** (Apple): playlists `.m3u8` + segmentos `.ts/fmp4`.
- **DASH**: mpd manifest + segmentos.

Players: hls.js, dash.js, Shaka Player.

Live streaming: low-latency variants (LL-HLS, LL-DASH) com chunks de 1-2s. WebRTC < 500ms; HLS standard 6-30s.

### 2.12 Latency targets fim-a-fim

- Game/VR: < 50ms total (motion-to-photon).
- Voz interativa: < 150ms (VoIP, perceptual limit).
- Live (concert/sports premium): 1-3s.
- Live HLS típico: 6-30s.
- VOD: irrelevante.

Cada estágio (capture, encode, network, decode, render) consome budget. Profile e otimize estágio dominante.

### 2.13 GPU memory e textures

VRAM é finita. Texturas grandes (4k+) acumulam. Strategies:
- **Texture atlas**: combine pequenas em 1 grande.
- **Mipmap**: cadeia de versões reduzidas (anti-alias em zoom-out).
- **Compressed textures**: BCn/ETC2/ASTC. Browser support varia.
- **Streaming**: load on demand.

### 2.14 Color management

`sRGB` → `Display 03-03` → wide gamut. `<canvas color-space="display-p3">`. WebGL color spaces. HDR vídeo (HDR10, Dolby Vision) chegando.

Importa em apps de design/photo. Em maioria, sRGB basta.

### 2.15 Performance profiling

- DevTools Performance panel: frame timing, paint, scripting.
- WebGL Inspector / Spector.js: trace de GPU calls.
- `performance.measure` pra spans custom.
- Chrome `chrome://gpu` pra diagnose.

Frame drops aparecem como "long frames" no panel. Identifique culprit.

### 2.16 OffscreenCanvas + Workers

Canvas em Worker: render fora do main thread. Não bloqueia UI events, scrolling, input.

Patterns:
- Main: layout, input.
- Worker: render canvas/WebGL.
- Comunicação: postMessage, transferable.

Suporte: Chrome desde 2018; Safari/Firefox alcançaram.

### 2.17 Native bridging (mobile / desktop)

Se browser não dá conta, native shells (Tauri, Electron, Capacitor) abrem APIs:
- Hardware video encode/decode (VideoToolbox iOS/macOS, MediaCodec Android, NVENC/Quick Sync desktop).
- Camera APIs avançadas.
- WebGPU passa por Vulkan/Metal/D3D12.

Trade-off: complexidade de build / store, vs capability.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Estimar frame budget de 60/120 fps.
- Distinguir Canvas 2D, SVG, WebGL/WebGPU; quando cada.
- Explicar pipeline GPU: vertex → raster → fragment.
- Justificar AudioWorklet em vez de ScriptProcessorNode.
- Diferenciar H.264, VP9, AV1 em compressão e adoption.
- Explicar GOP (I/P/B frames) em uma frase.
- Listar latency targets típicos pra game / VoIP / live HLS / VOD.
- Justificar OffscreenCanvas em apps com render pesado.
- Explicar HLS vs WebRTC pra live streaming.
- Diferenciar texture atlas, mipmap, compressed texture.
- Explicar compute shader use case (image processing, ML inference).

---

## 4. Desafio de Engenharia

Construir **dashboard ao vivo da Logística com mapa GPU-rendered (deck.gl ou MapLibre + WebGL) + comprovação de entrega via vídeo**.

### Especificação

1. **Mapa GPU-rendered**:
   - 50k pontos de pings de couriers nas últimas 6h, render via deck.gl `ScatterplotLayer`.
   - 5k linhas de rota; render via `LineLayer`.
   - Heatmap de demanda; `HeatmapLayer`.
   - Update em tempo real via WS; throttled re-render.
   - 60fps em laptop comum.
2. **Custom shader**:
   - Layer custom com fragment shader que colore ponto por idade (mais antigo → mais opaco fade-out).
3. **Dashboard 60fps**:
   - Painel de métricas (P95 entrega, GMV, throughput) com sparklines em Canvas 2D, atualizando 1Hz sem dropped frames.
4. **Vídeo de comprovação de entrega**:
   - Frontend (Logística entregador, web): captura vídeo via `getUserMedia`, encode H.264 via MediaRecorder.
   - Upload com chunked HTTP (resumable).
   - Backend salva em 04-03 (MinIO local).
   - Reprodução: HLS adaptive (3 renditions, gerado via ffmpeg em queue worker).
5. **Áudio de notificação custom**:
   - Web Audio API: oscillator + envelope ADSR pra som de "novo pedido". Volume controlado por user.
6. **Profile**:
   - DevTools Performance trace mostrando frames < 16.67ms p95.
   - GPU memory < 200MB.

### Restrições

- WebGL ou WebGPU (não Canvas 2D pra mapa).
- AudioWorklet pra qualquer DSP custom.
- HLS playback funcional em Safari sem polyfill.
- Cobertura de teste de UI pra scenarios chave (mapa carrega, vídeo grava + upload).

### Threshold

- 60fps sustentado em mapa com 50k pontos em laptop M-class.
- Vídeo upload chunked com retry; replay em < 2s start.
- Trace mostra zero long tasks em main durante render.

### Stretch

- **WebGPU port** do mapa.
- **Compute shader** pra heatmap calculado em GPU.
- **WebCodecs API** pra encode H.264 frame-a-frame (vez de MediaRecorder).
- **AV1 fallback** se browser suporta (`VideoEncoder.isConfigSupported`).
- **WebXR**: cena AR mostrando rota do entregador no mundo real.

---

## 5. Extensões e Conexões

- Liga com **01-03** (networking): WebRTC depende de NAT traversal, UDP.
- Liga com **01-07** (JS): event loop, raf, microtasks.
- Liga com **02-03** (DOM/Web APIs): Canvas, MediaStream, Web Audio APIs.
- Liga com **02-14** (real-time): WebRTC, SSE.
- Liga com **03-09** (frontend perf): frame budget, long tasks.
- Liga com **03-12** (Wasm): codecs em Wasm (ffmpeg.wasm), DSP.
- Liga com **02-06/02-17** (mobile): hardware codecs, AVFoundation/MediaCodec.
- Liga com **04-10** (AI/LLM): inference em GPU (compute shader, Wasm-SIMD, WebNN).

---

## 6. Referências

- **WebGL Fundamentals** ([webglfundamentals.org](https://webglfundamentals.org/)).
- **WebGPU Fundamentals** ([webgpufundamentals.org](https://webgpufundamentals.org/)).
- **MDN Web Audio API** docs.
- **"High Performance Browser Networking"** — Ilya Grigorik, capítulos sobre real-time.
- **"The Book of Shaders"** — Patricio Gonzalez Vivo.
- **"Real-Time Rendering" (4th ed)** — Akenine-Möller et al.
- **deck.gl docs**.
- **MediaSource Extensions spec**, **WebCodecs spec**.
- **"FFmpeg from Zero to Hero"** — Nick Janetakis.
- **"Designing Audio Effect Plug-Ins in C++"** — Will Pirkle (DSP fundamentos).
- **GPU Gems** (free online) — NVIDIA.
