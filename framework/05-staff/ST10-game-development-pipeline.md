---
module: ST10
title: Game Development Pipeline — Engines, ECS, Animation, Networking, Tooling
stage: staff
prereqs: [P14]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# ST10 — Game Development Pipeline (Optional)

## 1. Problema de Engenharia

Game dev tem stack próprio: engines (Unity, Unreal, Godot, Bevy), arquiteturas dataa-oriented (ECS), shaders custom, animation pipeline (rigging, skinning, blend trees), audio dinâmico, físicas, AI behavior trees, networking lockstep ou rollback, ferramentas de level design, asset pipeline (importers, atlases, LODs). Frame budget de 16ms (60fps) ou 8ms (120fps mobile/VR) é constante; soft real-time obriga otimização agressiva.

Pra Logística, ST10 é **opcional, especialty**. Faz se você aspira a games full-time, ou empresas adjacentes (Unity, Roblox, Riot, EA, indie), ou se interactive media é gap de carreira. Empresas SaaS típicas raramente exigem.

Mas há **transferência valiosa**: ECS pattern aplica em sistemas reactive não-jogo (data-oriented design vence cache em high-perf code), shaders abrem GPU compute (P14, S10), networking lockstep é caso brutal de distributed systems (S04, S14), tooling de level editor é problema de DSL (N13).

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

(Revisita P14 com lens de game)
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
- **WebGPU** chegando (P14).

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

- Liga com **N04** (data structures): spatial partitioning (quadtree, grid).
- Liga com **N05** (algorithms): A*, behavior trees, steering.
- Liga com **N11** (concurrency): job systems multi-threaded.
- Liga com **N14** (CPU microarch): cache, ECS data layout.
- Liga com **N15** (math): linear algebra GPU, probability AI.
- Liga com **A14** (real-time): WebSocket, networking.
- Liga com **A17** (mobile native): mobile games stack.
- Liga com **P09** (frontend perf): web games perf overlap.
- Liga com **P11** (Rust): Bevy engine.
- Liga com **P12** (Wasm): web build target.
- Liga com **P14** (graphics/codecs): same family.
- Liga com **S04** (resilience): netcode patterns.
- Liga com **S10** (AI/LLM): future ML in games.
- Liga com **CAPSTONE-staff** track C (Frontend) ou D (Data/ML).

---

## 6. Referências

- **"Game Engine Architecture (3rd ed)"** — Jason Gregory. Bíblia.
- **"Real-Time Rendering" (4th ed)** — Akenine-Möller et al.
- **"Game Programming Patterns"** — Robert Nystrom (gratuito em [gameprogrammingpatterns.com](https://gameprogrammingpatterns.com/)).
- **"Data-Oriented Design"** — Richard Fabian (gratuito).
- **"Programming Game AI by Example"** — Mat Buckland.
- **"Multiplayer Game Programming"** — Joshua Glazer, Sanjay Madhav.
- **"AI for Games (3rd ed)"** — Ian Millington.
- **GDC Vault** ([gdcvault.com](https://www.gdcvault.com/)) — talks de profissionais.
- **Bevy book** ([bevyengine.org](https://bevyengine.org/)).
- **Godot docs** ([docs.godotengine.org](https://docs.godotengine.org/)).
- **Unreal Engine docs**.
- **Unity Learn**.
- **Sebastian Lague YouTube** — visual game algorithms.
- **Catlike Coding tutorials** — Unity deep.
- **Casey Muratori, Jonathan Blow** — talks sobre game dev culture.
- **GGPO library** — rollback netcode reference.
- **EnTT, Flecs** — ECS libraries C++.
- **PICO-8 / TIC-80** — fantasy consoles, learning constraints.
