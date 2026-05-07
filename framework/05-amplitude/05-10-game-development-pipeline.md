---
module: 05-10
title: Game Development Pipeline, Engines, ECS, Animation, Networking, Tooling
stage: amplitude
prereqs: [03-14]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 05-10, Game Development Pipeline (Optional)

## 1. Problema de Engenharia

Game dev tem stack próprio: engines (Unity, Unreal, Godot, Bevy), arquiteturas dataa-oriented (ECS), shaders custom, animation pipeline (rigging, skinning, blend trees), audio dinâmico, físicas, AI behavior trees, networking lockstep ou rollback, ferramentas de level design, asset pipeline (importers, atlases, LODs). Frame budget de 16ms (60fps) ou 8ms (120fps mobile/VR) é constante; soft real-time obriga otimização agressiva.

Pra Logística, 05-10 é **opcional, especialty**. Faz se você aspira a games full-time, ou empresas adjacentes (Unity, Roblox, Riot, EA, indie), ou se interactive media é gap de carreira. Empresas SaaS típicas raramente exigem.

Mas há **transferência valiosa**: ECS pattern aplica em sistemas reactive não-jogo (data-oriented design vence cache em high-perf code), shaders abrem GPU compute (03-14, 04-10), networking lockstep é caso brutal de distributed systems (04-04, 04-14), tooling de level editor é problema de DSL (01-13).

Cobertura: arquitetura de game engine, ECS (Entity-Component-System), rendering pipeline, animation, physics, audio, AI in games, networking, asset pipeline, ferramentas, monetização (free-to-play, ads, IAP), live ops. Engines: Unity, Unreal, Godot, Bevy. Plus indie path realistic.

---

## 2. Teoria Hard

### 2.1 Game loop fundamentals

```
loop:
  input()
  update(dt)
  render()
  sleep_until_next_frame()
```

Variants:
- **Fixed timestep**: physics determinístico, render variable.
- **Variable timestep**: render livre.
- **Semi-fixed**: physics fixed dentro de step variable.

dt (delta time) crítico. Fixar physics em 60Hz, render livre.

Frame budget: 16.67ms @ 60fps. Subdivisão típica:
- Input + sim: 2-4ms.
- Render: 8-12ms.
- GPU wait: rest.

### 2.2 Engine architecture

Componentes core:
- **Renderer**: 3D ou 2D, command buffers pra GPU.
- **Scene graph** ou **ECS**.
- **Physics**: Box2D, Bullet, PhysX, Havok, Jolt.
- **Audio**: FMOD, Wwise, OpenAL, miniaudio.
- **Asset pipeline**: importers, packers.
- **Scripting**: C#, Lua, GDScript, Blueprint.
- **Editor**: tooling visual.
- **Networking**: integrated.
- **Animation system**: rigs, blend trees, IK.

Engines AAA: Unreal (C++), Unity (C#). Indie: Godot (GDScript/C#/C++), Bevy (Rust), Defold (Lua), MonoGame, Phaser (web 2D).

### 2.3 ECS (Entity-Component-System)

Pattern data-oriented:
- **Entity**: ID (number).
- **Component**: data POD.
- **System**: function que itera componentes.

Vantagem: cache-friendly (arrays of components), parallelizável, composable.

Em vez de `class Player extends Character extends Actor`, você tem entity 42 com `Position{x,y}`, `Velocity{vx,vy}`, `Health{hp}`, `Renderable{sprite}`. Sistemas: `MovementSystem` (Position+Velocity), `RenderSystem` (Renderable+Position), `DamageSystem` (Health+Hitbox).

Implementations: EnTT (C++), Flecs, Bevy ECS, Unity DOTS, Specs (Rust).

ECS mental model é diferente de OOP. Aprenda escrevendo small game.

### 2.4 Rendering pipeline

(Revisita 03-14 com lens de game)
- **Scene** → culling (frustum, occlusion) → batching → draw calls.
- **Materials / shaders**: PBR (Physically-Based Rendering) standard.
- **Lighting**: forward, deferred, clustered. Shadows (cascaded shadow maps, raytraced).
- **Post-processing**: bloom, tone mapping, AA (TAA, FXAA, DLSS), motion blur.
- **GPU profiling**: RenderDoc, NVIDIA Nsight.

GPU calls são caros. Reduce draw calls via batching, instancing, atlas, mesh combining.

### 2.5 Animation

- **Skeletal animation**: bones + skin weights. Blend trees, state machines.
- **Inverse Kinematics (IK)**: foot placement em terreno irregular.
- **Blend shapes / morph targets**: facial.
- **Procedural**: physics-driven (ragdoll, cloth).
- **Motion matching**: AAA modern, large mocap library.

Tools: Maya, Blender, Houdini, Marvelous Designer (cloth).

Engine integration: Unreal AnimGraph, Unity Mecanim, Godot AnimationTree.

### 2.6 Physics

Real-time physics simulators:
- **Rigid body** (Box2D 2D, Bullet/PhysX 3D, Jolt em Horizon Forbidden West).
- **Soft body / cloth**.
- **Fluid** (rare in games, simpler approximations).
- **Vehicle** specific.

Trade-off: accuracy vs perf vs stability. Determinism em multiplayer é desafio (quasi-deterministic em best case).

### 2.7 Audio

- **Music**: looping tracks, layers (combat layer adds em battle).
- **SFX**: positional 3D, attenuation, occlusion.
- **Dialogue**: lipsync.
- **Adaptive audio** (Wwise, FMOD): event-driven, dynamic mix.
- **DSP effects**: reverb zones, EQ, doppler.

Audio é frequentemente undervalued mas separa amateur de pro.

### 2.8 AI in games

- **State machines**: simples, frágil em escala.
- **Behavior trees**: composability. Halo origem.
- **Utility AI**: scoring decisions.
- **GOAP** (Goal-Oriented Action Planning): F.E.A.R. clássico.
- **Steering behaviors**: Reynolds.
- **Pathfinding**: A*, NavMesh.
- **ML in games**: AlphaStar, MarI/O. Production limited (pixel-perfect ML rare em prod).

Game AI é predictable + fun > optimal. Player perception driven.

### 2.9 Networking

Modelos:
- **Lockstep** (RTS clássico): all clients run same simulation, only inputs sent. Demanda determinismo perfeito.
- **Client-server authoritative**: server source of truth, clients predict + reconcile (FPS).
- **Peer-to-peer**: indie, simpler para small scale.
- **Rollback netcode** (fighting games): predict, on misprediction rewind+replay. Street Fighter, GGPO.

Latency masking: dead reckoning, animation blending, lag compensation.

Frameworks: Mirror (Unity), Photon, Nakama, Colyseus (web). Game-specific.

### 2.10 Asset pipeline

Source assets (Maya, Blender, Photoshop) → importer → engine-native format → optimized for runtime.

Stages:
- **Import**: .fbx, .glb, .obj, .png, .wav.
- **Process**: texture compression (BCn, ASTC), mesh LODs, audio compression.
- **Bundle**: AssetBundle (Unity), Pak (Unreal), .pck (Godot).
- **Stream**: load on demand.

Tools: Blender, Substance Painter, ZBrush, Maya, Houdini. Photoshop legacy.

Atlas + texture compression + LOD = perf wins fundamentais.

### 2.11 Game design vs engineering

Engineer não decide fun. Mas viabiliza:
- **Engine choice**.
- **Tooling pra designers** (level editor, behavior editor, dialogue tool).
- **Iteration speed** (hot reload, fast play).
- **Prototyping** apoiado.
- **Performance constant**: jogos lentos não são divertidos.

Carmack: "if it's worth doing, it's worth doing in code". Mas engineer wisdom: tooling > raw code pra game dev. Most-used tool é editor; otimize-o.

### 2.12 Genres com requisitos diferentes

- **FPS**: low latency, hit registration, anti-cheat.
- **MMORPG**: persistent state, sharding, server clusters.
- **MOBA**: sub-50ms latency, deterministic for replay.
- **Battle royale**: 100 players, persistent server, networking pesado.
- **Mobile casual**: free-to-play, IAP, retention.
- **VR**: 90+ fps obrigatório, motion sickness mitigation.
- **Sim/strategy**: AI heavy.
- **Indie 2D**: simpler stack, art direction over tech.

Tech stack varies muito.

### 2.13 Free-to-play e monetização

Modelos:
- **IAP** (In-App Purchase): cosmetics, currency, battle pass.
- **Ads**: banners, rewarded video, interstitial.
- **Subscriptions**.
- **DLC** / expansions.
- **Battle pass**: temporal commitment.
- **Loot boxes**: regulated em vários países.

Engineering: IAP infra, fraud (alts, bots, RMT), economy balance (econ-team often involved), live events.

### 2.14 Live ops

Game launches → live ops começa. Daily:
- **Events** (limited time).
- **Balance patches** com data.
- **A/B tests**.
- **Server scaling**.
- **Anti-cheat** updates.
- **Customer support**.

Tools: dashboards (Unity Analytics, Looker), feature flags, hotfix pipeline.

### 2.15 Anti-cheat e security

Big challenge in multiplayer:
- **Client-side validation** = trust client, bad.
- **Server authoritative** as default.
- **Anti-cheat tools**: BattlEye, EasyAntiCheat, Vanguard (Riot kernel-level).
- **Code obfuscation**.
- **Replay analysis** post-hoc.
- **Statistical detection**: aimbot via headshot rate.

Cheat economy é dollar-driven (BR, FPS). Investimento required.

### 2.16 Engines comparados

| Engine | Linguagem | Forças | Fraquezas |
|---|---|---|---|
| **Unity** | C# | Acessível, asset store, mobile dominant, 2D ok | Performance ceiling, recent biz drama |
| **Unreal** | C++ + Blueprint | AAA visuals, free pro models, royalty | C++ steep, mobile mais pesado |
| **Godot** | GDScript / C# / C++ | Open-source, lightweight, MIT | Less mature pra AAA |
| **Bevy** | Rust | ECS-first, modern, bleeding-edge | Pre-1.0, ecosystem young |
| **Custom** | qualquer | Full control | All-in cost |

Indie: Godot, Bevy attractive. Unity middle ground. Unreal AAA.

### 2.17 Indie reality

Indie shipping rate é low. Trade-off scope vs polish vs time.

Patterns:
- **MVP first**: jogue mecânica core sem art em 2 weeks. Se chato, pivote.
- **Vertical slice**: 1 level fully polished antes de scale.
- **Build verticalmente, não horizontalmente** (don't make 100 mediocre levels first).
- **Public WIP** building audience early (Twitter, Steam page, Discord).
- **Partner**: artist + designer + dev minimo team.

Steam, itch.io, Epic. Console requires devkit + cert.

### 2.18 Tooling para devs

- **Visual scripting** (Blueprint, Bolt): designer-accessible.
- **Hot reload** code.
- **Reload assets** sem restart.
- **Profiler integrated** (Unity Profiler, Unreal Insights).
- **Debug console** customizable.
- **Cheat menus** internal.

Tooling investment compounds. Boring work pra dev mas multiplica game team.

### 2.19 Web games e WebGL/WebGPU

Web platform games crescendo. Stack:
- **Unity WebGL** export.
- **Godot HTML5** export.
- **Phaser** (2D nativo web).
- **Three.js + custom**.
- **PlayCanvas**.
- **Babylon.js**.
- **WebGPU** chegando (03-14).

Browser limita certos features (audio autoplay, fullscreen). Cross-platform deploy potential.

### 2.20 Carreira em games

Roles:
- **Gameplay programmer**: mechanics.
- **Engine programmer**: core systems.
- **Graphics programmer**: shaders, rendering.
- **Tools programmer**: editor, pipelines.
- **Server / netcode programmer**: multiplayer.
- **AI programmer**: NPC behavior.
- **Audio programmer**: niche.
- **Technical artist**: ponte entre art e dev.

Pay frequentemente abaixo de SaaS BigCo, especially indie/AA. AAA US/JP comparáveis. Mission: "make games" attracts.

Empresas: Riot, Epic, EA, Ubisoft, Activision, Roblox, Unity, Niantic, Roblox, Garena, Tencent, indie studios (Hadron, Mojang originally).

---

### 2.21 Game dev stack 2026 — Unity 6 + Unreal 5.4 + Godot 4.3 + Bevy 0.14 + WebGPU + ML in games

Game dev 2026 fragmentou em quatro engines viáveis (Unity 6, Unreal 5.4/5.5, Godot 4.3, Bevy 0.14) mais runtimes web (WebGPU GA) e ML embedded (NPC LLM, neural assets). Pós Unity Runtime Fee fallout (Set 2023) e ~27k layoffs 2023-2024, escolha de engine virou decisão de risk management — não só técnica.

**1. Engines decision matrix 2026.**

- **Unity 6** (release Out 2024) — pós Runtime Fee fallout (Set 2023, walked back parcialmente Out 2023). Trust damage durou. Lessons aprendidas: avoid revenue-share pivots; license tiers Personal/Pro/Enterprise estabilizadas pós-crise. URP/HDRP renderers maduros, DOTS (data-oriented tech stack) production-ready. Use case: 2D/casual mobile, AR/VR (XR Interaction Toolkit), prototyping rápido. Fonte: Unity blog Set 12 2023 + Set 22 2023 statement.
- **Unreal 5.4** (Abr 2024) → **5.5** (Out 2024) — Nanite (virtualized geometry), Lumen (real-time GI), MetaHuman (photorealistic chars), Niagara VFX. Use case: AAA, archviz, virtual production (LED walls). Stack: C++ + Blueprints visual scripting. Verse language emergindo via Unreal Editor for Fortnite (UEFN). Fonte: Unreal 5.4 release notes Abr 2024.
- **Godot 4.3** (Ago 2024) — open-source MIT, GDScript primary + C# + GDExtension (C++/Rust binding). Vulkan/OpenGL/Metal/D3D12 multi-backend. Use case: indie 2D/3D, jam games, lightweight projects, non-corporate alternative. Crescimento pós Unity Runtime Fee mensurável (Steam tag charts). Fonte: Godot 4.3 changelog Ago 2024.
- **Bevy 0.14** (Jul 2024) — Rust ECS engine, modular, no editor (Bevy editor em desenvolvimento 2026). Steep learning curve (Rust + ECS paradigm). Use case: experimental, perf-critical, devs Rust-fluent. ECS reference: bevy.org/learn. Fonte: bevy crate docs.
- **Construct 3 / GameMaker / RPG Maker** — niche mas viável (2D web exports, retro RPGs).
- **Custom engines** — só justifica em scope MMO custom-protocol ou hyper-niche (pixel art roguelike with proprietary tooling). Caso contrário abandonment garantido.

**2. Unity Runtime Fee fallout (Set 2023 → 2026 lessons).** Unity tentou retroativamente cobrar per-install fee em Set 12 2023 — backlash massivo de devs, threats de migration coletiva, John Riccitiello forced out. Walked back parcialmente Set 22 2023 statement. Trust em engine vendor virou critical concern. Implicação prática: **diversifica skills entre engines** se career risk-averse — devs single-engine ficaram exposed. Lesson generaliza: vendor lock-in em ferramenta core de produção é risco operacional, não conveniência.

**3. WebGPU stable 2024+ — wgpu rust, browser support.**

- WebGPU GA: Chrome 113 (Mai 2023), Safari 18 (Set 2024), Firefox Nightly + Beta 2024 (estable previsto 2025). Cobertura cross-browser ainda incompleta — fallback WebGL2 obrigatório.
- **wgpu** (Rust crate, 0.20+ em 2024-2026) é abstração cross-platform: WebGPU → Vulkan/Metal/D3D12/OpenGL. Default stack pra Rust graphics. Used em Bevy.
- WebGPU Compute Shaders → ML inference no browser via transformers.js, ONNX Runtime Web. Inference local de modelos pequenos (< 1B params) viável.
- **WGSL** (WebGPU Shading Language) — alternativa a GLSL/HLSL, designed pra safety + portabilidade.

**4. ML in games 2024-2026.**

- **NPC dialogue via local LLM** — Inworld AI, Convai partnerships. Concerns: latency (target < 200ms TTFB pra conversa fluida), cost ($0.01-0.10 per interaction em cloud), hallucination (NPC inventando lore inconsistente). Solução: cache + fallback rules-based em hot path.
- **Neural assets** — denoising, upscaling, animation. Nvidia DLSS 3 (frame generation, Mai 2023), DLSS 4 (CES Jan 2025) — multi-frame generation. AMD FSR 3, Intel XeSS competidores.
- **Procedural content + ML** — terrain gen, level gen via GANs/diffusion. Cite: "Tencent ACE" 2024 (NPC AI demo).
- **Animation** — motion capture com inferência ML eliminando suit physical. ZeroBrush, RokoMotion (2024+).

**5. Layoffs 2023-2025 reality check.** ~16k+ game industry layoffs em 2023, 11k em 2024 (gameindustrylayoffs.com tracker, ~27k total). Affected: Embracer Group (split em três), Microsoft (Bethesda, Activision-Blizzard pos-aquisição $69B), Unity (25%+ workforce cuts), Sega, Bungie. Lessons:

- Funding bubble 2020-2021 (COVID gaming surge) popped.
- AAA "platinum studios" não imune — name brand não protege.
- Indie/solo dev model em alta (itch.io discoverability, Steam Direct $100 fee acessível).
- Multi-platform shipping (Steam + console + mobile + web) cresce como hedge.

**6. Cross-platform deployment 2026.**

- **Steam** — PC gaming dominant, $100 Steam Direct fee one-time, ~30% revenue share Valve. Wishlist + algoritmo de discovery decisivos.
- **Consoles** — PS5, Xbox Series X|S, Nintendo Switch 2 (Mar 2025+). Dev kits expensive ($), platform certification rigorous (TRC/TCR/Lotcheck).
- **Mobile** — App Store + Play Store (~30% cuts, Epic v Apple ongoing). Mobile gaming ~50% global game revenue.
- **Web** — itch.io, CrazyGames, Poki via WebGPU/WebGL. Lower revenue per user mas discovery free.
- **Cloud gaming** — GeForce NOW, Xbox Cloud Gaming. Niche, mas latency-tolerant genres viáveis.

**7. Tooling moderno 2026.**

- **Source control** — Git LFS pra binary assets (Unreal/Unity), Perforce ainda dominant em AAA (file locking, depot model). Git enterprise (GitHub LFS, GitLab) em monorepos grandes.
- **CI/CD** — Unity Cloud Build, Unreal via Buildkite/Jenkins/GitHub Actions, Bevy use rust toolchain standard (cargo + cross).
- **Asset pipeline** — FBX/GLTF interchange, Substance Painter (texturing), Houdini procedural (terrain, VFX).
- **Live service ops** — PlayFab (Microsoft), Unity Gaming Services, Photon (multiplayer authoritative server).

**8. Anti-patterns numerados (10).**

1. Único engine know-how — Unity Runtime Fee mostrou risk de vendor lock-in.
2. Custom engine pra primeiro projeto sem AAA experience prévio — abandonment garantido em 6-12 meses.
3. Git sem LFS pra projeto > 5GB binary assets — repo unusable em meses (clone times, history bloat).
4. Unity Personal license em jogo > $200k revenue threshold — viola TOS, lawsuit risk.
5. NPC LLM em hot path sem cache + fallback rules-based — latency unplayable, cost catastrófico em scale.
6. WebGL fallback ausente em projeto WebGPU → 30%+ users (Safari < 18, Firefox stable previsto 2025) sem game.
7. Mobile sem certificação Apple Privacy Manifest (obrigatório 2024+) — rejected publish.
8. Console dev kit sem CI integration — manual builds não escalam, certification cycles longos.
9. AAA scope em indie team — burnout, scope creep, projeto morre antes do alpha.
10. DLSS/FSR/XeSS ignorado em PC port — 30%+ perceived perf gap vs competitors.

**Logística applied (1 paragraph):** se Logística virar gamified courier app (achievements por entregas, leaderboards regionais, missões dynamic), engine choice = mobile-first → Godot 4.3 (custo zero, exports Android/iOS limpos) ou Unity (asset store huge, mobile pipeline matura, analytics builtin). NPC AI via local LLM (Llama 3.2 1B on-device) pra missões generative — coordenador virtual sugerindo rotas com personalidade. WebGPU prototype pra "tracking visualization" — heatmap rotas em browser dashboard sem instalar app, fallback WebGL2 pra Safari < 18.

**Cruza com:** `03-14 §2.x` (codecs/graphics — WebGPU, GPU programming), `03-12 §2.x` (WebAssembly — Rust → wasm pra game web), `04-10 §2.x` (LLM tooling — NPC AI), `02-06 §2.x` (React Native — game UI overlay mobile).

**Fontes:** Unity blog Set 12 2023 (Runtime Fee announcement) + Set 22 2023 (walk-back statement); Unreal Engine 5.4 release notes Abr 2024; Godot 4.3 changelog Ago 2024; Bevy book + bevy 0.14 release Jul 2024; wgpu crate docs (gfx-rs/wgpu); gameindustrylayoffs.com tracker; Nvidia DLSS 4 announcement CES Jan 2025.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Estimar frame budget @ 60fps e @ 120fps.
- Diferenciar fixed timestep, variable, semi-fixed.
- Justificar ECS sobre OOP em high-perf game.
- Listar 4 stages de rendering pipeline.
- Diferenciar lockstep, client-server authoritative, rollback netcode.
- Justificar texture compression + LOD pra perf.
- Diferenciar behavior tree, state machine, utility AI.
- Listar 4 monetization modelos free-to-play.
- Listar 4 desafios de anti-cheat.
- Comparar Unity, Unreal, Godot, Bevy em 2 dimensões.
- Listar 3 engineering investments em tooling de game.

---

## 4. Desafio de Engenharia

**Mini-jogo arcade 2D em ECS** + tooling de editor mínimo.

### Especificação

Engine: **Bevy** (Rust, ECS-first, recomendado pra learning) ou Godot (acessível). Pulou Unity/Unreal pra forçar exposure a stack diferente.

1. **Core mechanics**:
   - 2D top-down arena.
   - Player com movement (WASD/arrow), shoot.
   - Enemies spawn waves; pathfinding simple A* or steering.
   - Score, lives, game over.
   - Pickups (health, weapons).
2. **ECS rigorous**:
   - Entities com components: `Transform`, `Velocity`, `Health`, `Sprite`, `Collider`, `Weapon`, `AI`.
   - Sistemas separados: movement, collision, AI, render, audio.
   - Aim em > 60fps em 100 entidades simultâneas.
3. **Tooling editor**:
   - Hot reload de assets (textures swap sem restart).
   - In-game debug console (toggle FPS, spawn enemy, kill all).
   - Save/load level state.
4. **Audio dinâmico**:
   - SFX positional.
   - Music adaptive (calmo em explorando, intenso em combat).
5. **Networking optional** (stretch):
   - 2-player co-op via lockstep ou client-server simples.
6. **Build pipeline**:
   - WebAssembly target (jogo roda em browser).
   - Native target.
   - Asset bundle compressed.
7. **Polish**:
   - Particle effects.
   - Screen shake on impact.
   - Hit pause em finish blow.
   - Audio feedback distinto pra cada ação.

### Restrições

- Sem usar template completo de jogo. Build from `cargo new` ou Godot empty.
- ECS rigorosamente; sem fallback pra OOP.
- Asset feito por você (placeholder shapes/colors ok) ou royalty-free explicito.
- 60fps target em hardware reasonable.
- Build < 50MB.

### Threshold

- Jogo runnable end-to-end.
- ECS architecture explained em README.
- WASM build deployed em itch.io ou GitHub Pages.
- Demo video 2-3 min mostrando.

### Stretch

- **Multiplayer co-op** via WebSocket ou QUIC.
- **Procedural generation**: room layouts.
- **Behavior tree** AI em vez de FSM.
- **Shader custom** (post-processing CRT effect, ex.).
- **Modding API**: load custom enemy stats from JSON.
- **Steam page** mockup pra hipotética publicação.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): spatial partitioning (quadtree, grid).
- Liga com **01-05** (algorithms): A*, behavior trees, steering.
- Liga com **01-11** (concurrency): job systems multi-threaded.
- Liga com **01-14** (CPU microarch): cache, ECS data layout.
- Liga com **01-15** (math): linear algebra GPU, probability AI.
- Liga com **02-14** (real-time): WebSocket, networking.
- Liga com **02-17** (mobile native): mobile games stack.
- Liga com **03-09** (frontend perf): web games perf overlap.
- Liga com **03-11** (Rust): Bevy engine.
- Liga com **03-12** (Wasm): web build target.
- Liga com **03-14** (graphics/codecs): same family.
- Liga com **04-04** (resilience): netcode patterns.
- Liga com **04-10** (AI/LLM): future ML in games.
- Liga com **CAPSTONE-amplitude** track C (Frontend) ou D (Data/ML).

---

## 6. Referências

- **"Game Engine Architecture (3rd ed)"**: Jason Gregory. Bíblia.
- **"Real-Time Rendering" (4th ed)**: Akenine-Möller et al.
- **"Game Programming Patterns"**: Robert Nystrom (gratuito em [gameprogrammingpatterns.com](https://gameprogrammingpatterns.com/)).
- **"Data-Oriented Design"**: Richard Fabian (gratuito).
- **"Programming Game AI by Example"**: Mat Buckland.
- **"Multiplayer Game Programming"**: Joshua Glazer, Sanjay Madhav.
- **"AI for Games (3rd ed)"**: Ian Millington.
- **GDC Vault** ([gdcvault.com](https://www.gdcvault.com/)), talks de profissionais.
- **Bevy book** ([bevyengine.org](https://bevyengine.org/)).
- **Godot docs** ([docs.godotengine.org](https://docs.godotengine.org/)).
- **Unreal Engine docs**.
- **Unity Learn**.
- **Sebastian Lague YouTube**: visual game algorithms.
- **Catlike Coding tutorials**: Unity deep.
- **Casey Muratori, Jonathan Blow**: talks sobre game dev culture.
- **GGPO library**: rollback netcode reference.
- **EnTT, Flecs**: ECS libraries C++.
- **PICO-8 / TIC-80**: fantasy consoles, learning constraints.
