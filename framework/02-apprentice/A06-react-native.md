---
module: A06
title: React Native — Bridge, Bundles, Native Modules, New Architecture
stage: apprentice
prereqs: [A04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# A06 — React Native

## 1. Problema de Engenharia

A maioria dos devs front-end trata React Native como "React no celular". É erro caro. RN é um runtime separado com modelo de threads próprio, comunicação assíncrona com APIs nativas, e ferramental de build (Metro, Hermes, Gradle, Xcode) que não tem nada a ver com Webpack ou Vite. Você pode escrever JSX igual, mas o que acontece quando o `<View>` chega na tela passa por caminhos completamente diferentes.

Este módulo não é tutorial Expo. É o modelo mental de como JS conversa com Objective-C/Swift e Java/Kotlin, por que listas longas travam, por que Hermes mudou tudo, e o que a New Architecture (Fabric + TurboModules + JSI) realmente faz. Sem isso, você apanha em produção e culpa "performance do RN" quando é falta de entendimento.

---

## 2. Teoria Hard

### 2.1 RN vs alternativas

Cross-platform mobile mainstream em 2026:

- **React Native** (Meta): JS roda em runtime separado, comunica com nativo. UI usa componentes nativos reais (`UIView`, `android.View`).
- **Flutter** (Google): Dart compila pra ARM, render próprio com Skia/Impeller. Não usa componentes nativos — desenha tudo. Resultado é pixel-idêntico cross-platform mas "não parece" iOS/Android nativo sem trabalho extra.
- **Capacitor/Cordova**: webview embutida. Limitado em performance e acesso a APIs.
- **Native (Swift/Kotlin)**: zero overhead, dois codebases.
- **Kotlin Multiplatform**: compartilha lógica, UI nativa em cada lado.

RN ganha quando: time já é JS/React, precisa shipar rápido, UI razoavelmente padrão. Perde quando: animações pesadas customizadas, jogos, integração profunda com hardware (câmera AR, sensores raros).

### 2.2 Expo vs bare RN

**Expo** é um framework e plataforma sobre RN. Oferece:
- **Expo Go** (cliente runtime de dev) — você não precisa abrir Xcode pra rodar JS.
- **Managed workflow** com SDK que abstrai módulos nativos comuns (Camera, Location, Notifications).
- **EAS Build** — compila iOS/Android na nuvem.
- **EAS Update** — OTA updates pra JS bundle sem passar pela store.
- **Config plugins** — modificam projeto nativo via JS config.

**Bare RN** é só `npx react-native@latest init`. Você dono de `ios/` e `android/`. Mais flexível, mais trabalho.

A separação "managed vs bare" hoje (Expo SDK 50+) está turva. Expo prebuild gera `ios/` e `android/` — você pode ter Expo + projeto nativo aberto. Recomendação 2026: **comece com Expo, eject só quando precisar.**

### 2.3 Threads no RN

RN tem três threads principais (modelo clássico, pre-New Architecture):

1. **JS thread**: roda seu código React, reconciliation, lifecycle. Single thread.
2. **Native/UI thread**: roda código nativo, gestures, layout final, drawing.
3. **Shadow thread**: roda Yoga (layout engine de flexbox em C++) pra calcular dimensões.

**Implicação**: se o JS thread bloquear (loop síncrono pesado), animações continuam fluidas se forem dirigidas pelo nativo (Animated com `useNativeDriver: true`, Reanimated 2/3). Mas qualquer interação que depende de JS (toque que dispara setState) trava.

Por isso: **mover trabalho pra UI thread sempre que possível** é o caminho. Reanimated worklets rodam JS direto na UI thread via JSI. Animated com `useNativeDriver` pré-compila a animação e entrega pro nativo executar.

### 2.4 The Bridge (arquitetura clássica)

Até a New Architecture, JS e nativo conversavam por **bridge**: fila assíncrona, batched, JSON-serialized.

Fluxo: JS chama método nativo → mensagem serializada vira JSON → enfileirada → flushed em batch → nativo deserializa → executa → resposta volta da mesma forma.

Problemas:
- Async forçado mesmo quando síncrono seria possível.
- JSON serialization overhead em payloads grandes (lista com milhares de items).
- Difícil compartilhar estruturas (cada lado tem cópia).
- Difícil tipar (sem schema enforced).

Por isso scrollar uma `ScrollView` com 10k items via bridge é lento — cada onScroll vira N mensagens serializadas.

### 2.5 New Architecture: JSI, TurboModules, Fabric

Reescrita gradual desde 2018, mainline em RN 0.74+, default em 0.76+. Três peças:

**JSI (JavaScript Interface)**: API C++ que permite ao JS engine (Hermes/V8) chamar funções nativas direto, com referências compartilhadas, sem serialização. JS pode "segurar" um objeto C++ e chamar métodos dele.

**TurboModules**: módulos nativos com codegen a partir de specs TypeScript/Flow. Geram glue code C++ que usa JSI. Resultado: chamadas síncronas possíveis quando faz sentido, sem JSON.

**Fabric**: novo renderer. Em vez de async commits via bridge, render síncrono usando shadow tree em C++. Simplifica UI threading e reduz inconsistências.

**Codegen**: você define interfaces de TurboModules e Fabric components em TS/Flow; tooling gera C++/ObjC++/Java. Garante type safety entre JS e nativo.

Status 2026: New Arch é default. Libs precisam ser compatíveis (a maioria das principais já é). Migração de projetos antigos é trabalho não-trivial (revisar libs, ajustar config).

### 2.6 Hermes

Hermes é JS engine criado pela Meta especificamente pra RN mobile. Default desde RN 0.70.

Características:
- Otimizado pra startup rápido (parsing AOT, bytecode cache).
- Footprint de memória menor (importante em low-end Android).
- Não tem JIT por default (até pouco tempo) — precompila para bytecode (HBC).
- Suporta debugging via Chrome DevTools / Flipper / nova IDE de RN.

Comparado com JSC (default antigo iOS): Hermes geralmente vence em startup e consumo. Em workloads de CPU sustentado, JSC com JIT podia ser mais rápido — mas pra app típico, o ganho de cold start vence.

### 2.7 Metro bundler

Metro é o bundler do RN. Difere de Webpack:
- Não gera múltiplos chunks (até recente; ainda limitado).
- Faz tree-shaking simples.
- Resolve `*.ios.tsx`, `*.android.tsx`, `*.native.tsx` por platform.
- Usa Babel pra transformar JSX e TS.
- Watcher próprio (file system events).

Bundle final é JS único (mais assets). Pra dev: **HMR (Hot Module Replacement)** preserva state; **Fast Refresh** recompila componentes.

### 2.8 Listas: o teste de fogo

Listas viraram benchmark de RN porque são caso patológico:
- Muitos items renderizados → muito JSX → muitas instâncias.
- Bridge clássica serializa cada update.
- Re-render de uma row recria sub-árvore inteira se você não memoizar.

Componentes:
- **`FlatList`** — virtualização básica. Aceitável pra listas médias.
- **`SectionList`** — agrupado.
- **`FlashList`** (Shopify) — drop-in replacement pra `FlatList` com windowing melhor, recycling, performance superior. **Use FlashList em listas grandes.**
- **`LegendList`** (Legend State) — outra opção performática moderna.

Otimizações sempre relevantes:
- `keyExtractor` estável.
- `getItemType` (FlashList) — separa item types pra reciclar.
- `estimatedItemSize` — windowing precisa de palpite.
- `React.memo` na row component.
- `useCallback` em handlers passados pra row.
- Imagens com cache (FastImage / Expo Image).

### 2.9 Imagens, fonts, assets

- **`expo-image`** ou **FastImage** — cache, placeholder, transitions, performance superior à `Image` padrão.
- **`expo-font`** — load de fontes custom.
- Assets em `assets/` resolvidos por Metro. Imports diretos: `require('./assets/logo.png')`.
- SVG: **react-native-svg**. SVG nativo, bom desempenho.

### 2.10 Gestures e animação

- **`react-native-gesture-handler`**: substitui o sistema legado de touch. Roda na UI thread, integra com Reanimated.
- **`react-native-reanimated`** v3+: API declarativa pra animações que rodam na UI thread via JSI worklets. Padrão atual.
- **Animated** built-in: anterior, ainda funciona, mas Reanimated supera.
- **Skia (`@shopify/react-native-skia`)**: 2D graphics arbitrário (charts custom, paint, filters) com performance nativa.

Worklets: funções JS marcadas com `'worklet'` que Reanimated extrai e roda em runtime separado na UI thread. Não podem capturar closure mutável da JS thread sem `runOnUI`.

### 2.11 Navegação

- **React Navigation** v7+: lib mais usada. Stack, Tabs, Drawer, Modal. Roda em JS, com integração nativa via `@react-navigation/native-stack` (usa `UINavigationController`/`Fragment`).
- **Expo Router**: file-based routing inspirado em Next App Router, sobre React Navigation. Default em projetos Expo modernos.
- **react-native-screens**: backend nativo que React Navigation usa. Aciona transições nativas reais.

### 2.12 Networking, storage, secure storage

- `fetch` global existe. Comportamento difere de browser em alguns edge cases (cookies, multipart).
- **AsyncStorage** (`@react-native-async-storage/async-storage`): key-value local, async, sem encryption.
- **MMKV** (Tencent, lib RN port): key-value síncrono, super rápido, com encryption opcional. Recomendação.
- **expo-secure-store** / Keychain (iOS) / Keystore (Android): secrets (tokens).
- **WatermelonDB** ou **op-sqlite** ou **expo-sqlite**: bancos locais para dados estruturados.

### 2.13 OTA updates

JS bundle pode ser atualizado sem republish na store, **mas só JS** (e assets). Mudanças nativas exigem nova build.

- **EAS Update** (Expo) — o caminho moderno.
- **CodePush** (Microsoft) — vai ser descontinuado em 2025; migrar.
- Política da App Store/Play permite OTA pra patches de bug e features incrementais; **não permite mudar funcionalidade material da review**.

### 2.14 Push notifications

- **Expo Notifications** abstrai APN (iOS) e FCM (Android). 
- Em bare RN: integrar APN e Firebase Messaging direto.
- **Background tasks**: limitados em iOS, restritos em Android moderno (Doze mode). Lib `expo-task-manager` ajuda.

### 2.15 Build e distribuição

iOS:
- Conta Apple Developer ($99/ano).
- Provisioning profiles, certs, App Store Connect.
- TestFlight pra beta.
- Review pode levar 1-3 dias, com rejeições por edge cases.

Android:
- Google Play Console ($25 one-time).
- Internal/Closed/Open tracks pra beta.
- Review mais leve que Apple.

EAS Build automatiza: gera builds na nuvem, gerencia credenciais, deploy pra TestFlight/Play. Sem EAS, você abre Xcode/Android Studio.

### 2.16 Debugging e profiling

- **React DevTools** standalone — inspeciona árvore.
- **Flipper** (descontinuado pelo Meta em 2024 mas ainda usado) — debug network, layout, logs.
- **React Native DevTools** (nova) — sucessor moderno integrado ao Hermes.
- **Performance Monitor** in-app — FPS de UI thread e JS thread separados (aprenda a ler).
- **Hermes profiler** — sampling profiler de JS.
- **Xcode Instruments** / **Android Studio Profiler** — pro lado nativo.

Sintomas comuns e onde olhar:
- Lista trava ao scrollar → JS thread bloqueada → mover pra UI thread, virtualizar, memoizar.
- Animação trava → confirmar `useNativeDriver` ou Reanimated.
- App lento ao abrir → bundle grande, muitos imports síncronos, módulos nativos pesados.
- Crash silencioso → logs nativos via Xcode/`adb logcat` (RN log não pega tudo).

### 2.17 Multi-platform: web e desktop

- **react-native-web**: render RN components em DOM. Útil pra compartilhar componentes; não é solução completa.
- **Expo for Web**: combina RN-Web + Metro pra web. Útil pra apps simples.
- Em projetos sérios cross-platform, geralmente vale ter codebases separados pra UI mobile e web (compartilhando lógica, schema, hooks puros).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diagrama: JS thread, UI thread, Shadow thread (modelo clássico). E o que muda em New Architecture.
- Explicar como bridge serializa mensagem, por que JSON era o gargalo, e como JSI elimina serialização.
- Distinguir TurboModules e Fabric, e dizer o que codegen produz.
- Listar 3 razões específicas pra preferir Hermes a JSC.
- Explicar por que `useNativeDriver: true` melhora animação.
- Dizer quando usar `FlashList` em vez de `FlatList` e quais props críticas tunar.
- Explicar worklet de Reanimated e sua restrição de captura.
- Justificar Expo vs bare RN com 3 casos pra cada.
- Explicar políticas de OTA update e o que viola guidelines.
- Diagnosticar JS thread vs UI thread como gargalo só olhando Performance Monitor.

---

## 4. Desafio de Engenharia

Construir o **app mobile da Logística** — companion app para entregadores.

### Especificação

1. **Stack**:
   - Expo SDK mais recente, New Architecture habilitada.
   - TypeScript strict.
   - Expo Router pra navegação.
   - Reanimated 3 + Gesture Handler.
   - MMKV pra storage local.
   - Expo Secure Store pra token.
2. **Telas**:
   - **Login**: form, valida via API mockada, salva token em SecureStore.
   - **Home (entregas do dia)**: lista de pedidos com FlashList, ≥ 200 items mock. Cada row mostra cliente, endereço, status. Pull-to-refresh.
   - **Detalhe da entrega**: mapa estático ou link pra Maps app, botões de ação (iniciado, concluído, problema).
   - **Histórico**: lista paginada infinita.
   - **Perfil**: dados do entregador, logout.
3. **Animações**:
   - Pelo menos 1 animação custom com Reanimated worklet (ex: card que expande com gesto).
   - Transições nativas via React Navigation (não a custom slide).
4. **Persistência**:
   - Cache local de entregas em MMKV (offline-first leve).
   - Token em SecureStore.
5. **Performance**:
   - 60 FPS na home rolando lista (mostrar Performance Monitor no README).
   - Cold start < 2s em device físico.
6. **OTA-ready**:
   - Configurar EAS Update (sem necessariamente publicar; só configurado).
   - README explica o que pode ir via OTA e o que não pode.

### Restrições

- Sem libs de UI prontas que escondem RN (NativeBase, Tamagui podem; mas você deve saber o que fazem).
- Sem `react-native-elements`.
- API mockada local ou remota — desde que o app funcione offline (cache).

### Threshold

- Roda em iOS Simulator e Android Emulator (preferir device físico se tiver).
- README documenta:
  - Mapa de telas e navegação.
  - Decisão de quais animações foram pra UI thread e por quê.
  - Profile de scrollar a lista (FPS antes/depois de tunar FlashList).
  - 1 hot-fix que você simulou via OTA: mudou texto de label, fez novo bundle, comentou a flow.

### Stretch

- Push notification end-to-end (Expo Notifications).
- Background task que sincroniza pedidos quando voltam online.
- Dark mode via `useColorScheme` + sistema de tema.
- Skia: chart custom de KPIs do dia.

---

## 5. Extensões e Conexões

- Liga com **A04**: tudo é React. Mas a árvore renderiza em `UIView`/`android.View`, não DOM.
- Liga com **A01/A02**: layout flexbox via Yoga; acessibilidade tem APIs próprias (`accessibilityLabel`, `accessibilityRole`).
- Liga com **A07** (Node): bundler usa Node; ferramentas de build são Node CLIs.
- Liga com **A13** (auth): SecureStore/Keychain/Keystore como armazenamento de token.
- Liga com **A14** (real-time): WebSocket nativo no RN; SSE precisa de polyfill em alguns RN versions.
- Liga com **P01** (testes): Jest + React Native Testing Library; Detox/Maestro pra E2E.
- Liga com **P04** (CI): EAS Build automatiza build CI/CD.
- Liga com **P09** (perf): Web Vitals do mundo mobile = startup, FPS, jank, memory pressure.

---

## 6. Referências

- **React Native docs** ([reactnative.dev](https://reactnative.dev/)) — leia New Architecture, Performance, Threading.
- **Expo docs** ([docs.expo.dev](https://docs.expo.dev/)) — guia oficial moderno.
- **"React Native Performance"** — Vadim Demedes, série de posts sobre tunar.
- **Reanimated docs** — worklets, layout animations.
- **FlashList docs** ([shopify.github.io/flash-list](https://shopify.github.io/flash-list/)).
- **William Candillon** ("Can it be done in React Native?") — YouTube com Skia/Reanimated avançado.
- **Krzysztof Magiera** (criador de Reanimated/Gesture Handler) — talks sobre internals.
- **"React Native Architecture: A Deep Dive"** — talks da React Conf sobre Fabric/JSI.
