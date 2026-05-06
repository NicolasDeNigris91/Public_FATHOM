---
module: 03-14
title: Graphics, Audio & Real-Time Codecs, WebGL/WebGPU, Canvas, Audio API, Video Pipelines
stage: producao
prereqs: [03-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-14, Graphics, Audio & Real-Time Codecs

## 1. Problema de Engenharia

Web é mais que documento + form. Aplicações modernas crescentemente envolvem **mídia**: mapas com millions de pontos, dashboards reativos com 60fps, videoconferência, áudio capture/processing, edição de imagem no browser, jogos, AR/VR (WebXR). Cada uma dessas capabilities tem stack próprio: Canvas 2D, WebGL/WebGPU, Web Audio, MediaStream, codecs (H.264, VP9, AV1, Opus), MSE, WebRTC.

Maioria dos devs trata isso como caixa-preta, usa biblioteca, cruza dedos. Mas apps competitivos no espaço de mídia (Figma, Excalidraw, Loom, Tldraw, Google Meet, Discord) **dominam pipelines internos**: GPU shaders custom, audio worklets, frame budgets de 16ms, codec choice e bitrate adaptation. Quando você precisa pixel-perfect 60fps com ms de latency, abstrações vazam.

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
- **Bitrate**: CBR (constant), VBR (variable), CRF (constant rate factor, quality target).
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

### 2.18 WebGPU compute shaders + WebCodecs API (media processing pipelines)

WebGL é legacy. WebGPU é o stack moderno: compute shaders first-class, storage buffers, async error handling, bindless textures, command encoders explícitos. Baseline 2024: Chrome/Edge desde 2023, Safari iOS 17.4+ / macOS 14.4+, Firefox 130+ (em flag até 2024). Coverage real 2026: ~80-85% browsers; WebGL fica como fallback obrigatório.

Diferença conceitual: WebGL é state-machine imperativa herdada de OpenGL ES 2.0/3.0; WebGPU é command-buffer + pipeline-state-objects estilo Vulkan/Metal/D3D12. WGSL substitui GLSL — sintaxe Rust-like, type-safe, sem preprocessor macros. Validation acontece em `createPipeline` (não em runtime), erros via `device.lost` Promise + `pushErrorScope`/`popErrorScope`.

Pipeline canônico: `adapter` → `device` → `commandEncoder` → `computePass` / `renderPass` → `queue.submit()`.

**Compute shader Logística** (image diff entre delivery proof e pickup photo, fraud detection client-side):

```wgsl
@group(0) @binding(0) var<storage, read> img_a: array<u32>;
@group(0) @binding(1) var<storage, read> img_b: array<u32>;
@group(0) @binding(2) var<storage, read_write> diff: array<atomic<u32>>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.y * 1024u + gid.x;
  if (idx >= arrayLength(&img_a)) { return; }
  let a = img_a[idx];
  let b = img_b[idx];
  let d = abs(i32(a & 0xFFu) - i32(b & 0xFFu));
  atomicAdd(&diff[0], u32(d));
}
```

```ts
const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
if (!adapter) throw new Error('WebGPU adapter unavailable');
const device = await adapter.requestDevice();
device.lost.then((info) => console.error('GPU device lost:', info.reason, info.message));

const module = device.createShaderModule({ code: SHADER_WGSL });
const pipeline = device.createComputePipeline({
  layout: 'auto',
  compute: { module, entryPoint: 'main' }
});

const bufA = device.createBuffer({ size: imgA.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
const bufB = device.createBuffer({ size: imgB.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
const bufDiff = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
device.queue.writeBuffer(bufA, 0, imgA);
device.queue.writeBuffer(bufB, 0, imgB);

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: bufA } },
    { binding: 1, resource: { buffer: bufB } },
    { binding: 2, resource: { buffer: bufDiff } }
  ]
});

const encoder = device.createCommandEncoder();
const pass = encoder.beginComputePass();
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(128, 128); // 1024x1024 / 8x8
pass.end();

const readback = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
encoder.copyBufferToBuffer(bufDiff, 0, readback, 0, 4);
device.queue.submit([encoder.finish()]);

await readback.mapAsync(GPUMapMode.READ);
const totalDiff = new Uint32Array(readback.getMappedRange())[0];
readback.unmap();
```

Performance real: 4MP image diff em ~5ms desktop GPU (RTX 3060 / M2), ~20ms mobile A17/Adreno 740. CPU equivalente (loop JS single-thread): 200-500ms. Speedup 40-100x justifica complexidade. Workgroup size 8x8=64 threads é sweet spot pra texture-like workload; aumentar pra 16x16=256 pode dar +20% em GPUs desktop, mas estoura register budget em mobile.

**WebGPU vs WebGL trade-off**: WebGL cobre 95% browsers mas não tem compute shaders, sem storage buffers, e usa estado global imperativo (bind point / texture unit). WebGPU é modern (compute first-class, async errors, explicit command buffers) mas 80-85% coverage. Pattern produção: WebGPU primary + WebGL fallback via `if (!navigator.gpu) { useWebGL(); }`. Lib `wgpu-matrix` (matemática) ou `three.js r160+` (motor) já suportam WebGPU backend.

**WebCodecs API** (Baseline 2024 Chromium/Safari, Firefox 130+): hardware-accelerated encode/decode direto em browser via VideoToolbox (Apple), MediaCodec (Android), NVENC/QuickSync (desktop). Substitui hacks `MediaRecorder + canvas + getUserMedia` que tinham latência variável e zero controle de bitrate/keyframe. APIs principais:

- `VideoEncoder` / `VideoDecoder`: encode raw frames → H.264/VP9/AV1 chunks; decode chunks → raw frames.
- `AudioEncoder` / `AudioDecoder`: AAC, Opus, FLAC.
- `VideoFrame` / `AudioData`: transferable objects, zero-copy cross-Worker.
- `ImageDecoder`: decode JPEG/PNG/WebP/AVIF/GIF off-main-thread.

**Pipeline Logística** (compress delivery proof video em-browser antes de upload, sem aguardar full processing):

```ts
const stream = canvas.captureStream(30);
const reader = new MediaStreamTrackProcessor({ track: stream.getVideoTracks()[0] }).readable.getReader();

let frameCount = 0;
const encoder = new VideoEncoder({
  output: (chunk, meta) => { /* push pra IndexedDB ou upload streaming via fetch ReadableStream */ },
  error: (e) => console.error(e)
});
encoder.configure({ codec: 'avc1.42E01E', width: 1280, height: 720, bitrate: 2_000_000, framerate: 30 });

while (true) {
  const { value: frame, done } = await reader.read();
  if (done) break;
  encoder.encode(frame, { keyFrame: frameCount % 60 === 0 });
  frame.close();
  frameCount++;
}
await encoder.flush();
encoder.close();
```

Output H.264 chunks empacotados via `mp4-muxer` ou `webm-muxer` (CMAF), upload streaming via `fetch` com `ReadableStream` body sem aguardar full processing. Numbers: 1080p 30s → ~5MB H.264 (vs ~50MB raw); encode ~0.5x realtime mobile A14+, ~0.2x desktop GPU. Bitrate 2 Mbps adequado pra delivery proof; subir pra 4 Mbps se cena tem texture (boxes empilhadas).

Feature detection robusta antes de configurar:

```ts
const support = await VideoEncoder.isConfigSupported({
  codec: 'avc1.42E01E',
  width: 1280, height: 720, bitrate: 2_000_000, framerate: 30
});
if (!support.supported) {
  // fallback: MediaRecorder com canvas.captureStream()
}
```

**OffscreenCanvas + WebGPU + Worker**: main thread `canvas.transferControlToOffscreen()` → `worker.postMessage({ canvas: offscreen }, [offscreen])`. Worker pede próprio `adapter`/`device` (device é per-document/per-realm, não cross-thread transferable) e faz `createCommandEncoder()` + render isolado. Libera main thread pra UI/scroll. Combina com WebCodecs: encoder roda em Worker, encoded chunks voltam via `postMessage` pra main thread fazer upload.

**Mobile gotchas**: iOS 17.4+ tem WebGPU mas só GPU tier A14+ (iPhone 12+); fallback graceful obrigatório em devices mais antigos. Android Chrome WebGPU OK em GPU Vulkan-capable (Adreno 6xx+, Mali-G7x+); Mali antigos e PowerVR caem pra WebGL. Battery: compute shaders consomem GPU em sustained load >30s ativam thermal throttling, performance cai 30-50%. Detecte via `Performance API` + `requestVideoFrameCallback` deltas e degrade qualidade (drop framerate ou resolution) automaticamente.

**HDR + wide-color em delivery photos**: HDR10/HLG metadata via WebCodecs `colorSpace` field. Display-P3 wide-color displays renderizam gamut maior; CSS `@media (color-gamut: p3)`. Logística: courier iPhone HDR captura → preserve HDR no upload → dashboard exibe em P3.

**Stack Logística aplicado**: courier app captura via `MediaRecorder` + WebCodecs encode → upload streaming. Dashboard lojista: WebGPU compute shader compara photo diff pickup/delivery em <50ms client-side. Edge: image transformations via Imgproxy (cobertos em `03-10` §2.20), não WebGPU.

**Observability**: instrumente `device.lost` Promise (telemetry de GPU crashes), `pushErrorScope('validation')` em dev pra catch shader bugs cedo, e meça `encoder.encodeQueueSize` pra detectar back-pressure (queue >5 indica encode mais lento que captura, drop frame ou downscale). Real User Monitoring: log `encoder.state`, codec efetivo (hardware vs software via `support.config`), e tempo wall-clock por chunk pra correlacionar com device GPU tier.

**Decision matrix** (quando usar):
- Foto/video processing >100ms em CPU → WebGPU compute shader.
- Upload de video >5MB raw → WebCodecs encode em-browser.
- Render 3D/2D pesado (delivery route map, heatmap) → WebGPU render pass.
- Image filters simples (blur, brightness) → CSS `filter` ou Canvas2D (não justifica GPU setup).
- Codec não suportado em browser (HEVC em Firefox) → WebAssembly (libavif, libheif) — cobertos em `03-12`.

Anti-patterns observados:
- WebGL em greenfield (legacy; WebGPU já 80%+ coverage 2026).
- Compute shader sem `workgroup_size` apropriado (sub-utilização GPU; 64-256 thread/group sweet spot).
- `device.queue.submit()` por command (overhead; batch em encoder).
- WebCodecs encoder sem `keyFrame` regular (chunks dependentes; seek impossível).
- `getUserMedia` full resolution sem downscale antes de encode (4K mobile = OOM).
- Sync readback `mapAsync()` em hot path (stalls pipeline; double-buffer e read frame anterior).
- WebGPU sem `requestAdapter({ powerPreference: 'high-performance' })` (mobile pega integrated GPU).
- Sem fallback WebGL/MediaRecorder em browser sem WebGPU/WebCodecs (UX quebra silenciosa).

Cruza com: `02-03` (DOM Web APIs, OffscreenCanvas + Workers), `03-09` (frontend perf, GPU pipeline, image LCP em delivery photos), `02-06` (RN, Skia paralelo nativo), `03-12` (WebAssembly, codec libs Wasm-compiled).

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
- **"High Performance Browser Networking"**: Ilya Grigorik, capítulos sobre real-time.
- **"The Book of Shaders"**: Patricio Gonzalez Vivo.
- **"Real-Time Rendering" (4th ed)**: Akenine-Möller et al.
- **deck.gl docs**.
- **MediaSource Extensions spec**, **WebCodecs spec**.
- **"FFmpeg from Zero to Hero"**: Nick Janetakis.
- **"Designing Audio Effect Plug-Ins in C++"**: Will Pirkle (DSP fundamentos).
- **GPU Gems** (free online), NVIDIA.
