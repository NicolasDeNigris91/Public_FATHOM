---
module: 02-06
title: React Native, Bridge, Bundles, Native Modules, New Architecture
stage: plataforma
prereqs: [02-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-06, React Native

## 1. Problema de Engenharia

A maioria dos devs front-end trata React Native como "React no celular". É erro caro. RN é um runtime separado com modelo de threads próprio, comunicação assíncrona com APIs nativas, e ferramental de build (Metro, Hermes, Gradle, Xcode) que não tem nada a ver com Webpack ou Vite. Você pode escrever JSX igual, mas o que acontece quando o `<View>` chega na tela passa por caminhos completamente diferentes.

Este módulo não é tutorial Expo. É o modelo mental de como JS conversa com Objective-C/Swift e Java/Kotlin, por que listas longas travam, por que Hermes mudou tudo, e o que a New Architecture (Fabric + TurboModules + JSI) realmente faz. Sem isso, você apanha em produção e culpa "performance do RN" quando é falta de entendimento.

---

## 2. Teoria Hard

### 2.1 RN vs alternativas

Cross-platform mobile mainstream em 2026:

- **React Native** (Meta): JS roda em runtime separado, comunica com nativo. UI usa componentes nativos reais (`UIView`, `android.View`).
- **Flutter** (Google): Dart compila pra ARM, render próprio com Skia/Impeller. Não usa componentes nativos, desenha tudo. Resultado é pixel-idêntico cross-platform mas "não parece" iOS/Android nativo sem trabalho extra.
- **Capacitor/Cordova**: webview embutida. Limitado em performance e acesso a APIs.
- **Native (Swift/Kotlin)**: zero overhead, dois codebases.
- **Kotlin Multiplatform**: compartilha lógica, UI nativa em cada lado.

RN ganha quando: time já é JS/React, precisa shipar rápido, UI razoavelmente padrão. Perde quando: animações pesadas customizadas, jogos, integração profunda com hardware (câmera AR, sensores raros).

### 2.2 Expo vs bare RN

**Expo** é um framework e plataforma sobre RN. Oferece:
- **Expo Go** (cliente runtime de dev), você não precisa abrir Xcode pra rodar JS.
- **Managed workflow** com SDK que abstrai módulos nativos comuns (Camera, Location, Notifications).
- **EAS Build**: compila iOS/Android na nuvem.
- **EAS Update**: OTA updates pra JS bundle sem passar pela store.
- **Config plugins**: modificam projeto nativo via JS config.

**Bare RN** é só `npx react-native@latest init`. Você dono de `ios/` e `android/`. Mais flexível, mais trabalho.

A separação "managed vs bare" hoje (Expo SDK 50+) está turva. Expo prebuild gera `ios/` e `android/`, você pode ter Expo + projeto nativo aberto. Recomendação 2026: **comece com Expo, eject só quando precisar.**

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

Por isso scrollar uma `ScrollView` com 10k items via bridge é lento, cada onScroll vira N mensagens serializadas.

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
- Não tem JIT por default (até pouco tempo), precompila para bytecode (HBC).
- Suporta debugging via Chrome DevTools / Flipper / nova IDE de RN.

Comparado com JSC (default antigo iOS): Hermes geralmente vence em startup e consumo. Em workloads de CPU sustentado, JSC com JIT podia ser mais rápido, mas pra app típico, o ganho de cold start vence.

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
- **`FlatList`**: virtualização básica. Aceitável pra listas médias.
- **`SectionList`**: agrupado.
- **`FlashList`** (Shopify), drop-in replacement pra `FlatList` com windowing melhor, recycling, performance superior. **Use FlashList em listas grandes.**
- **`LegendList`** (Legend State), outra opção performática moderna.

Otimizações sempre relevantes:
- `keyExtractor` estável.
- `getItemType` (FlashList), separa item types pra reciclar.
- `estimatedItemSize`, windowing precisa de palpite.
- `React.memo` na row component.
- `useCallback` em handlers passados pra row.
- Imagens com cache (FastImage / Expo Image).

### 2.9 Imagens, fonts, assets

- **`expo-image`** ou **FastImage**: cache, placeholder, transitions, performance superior à `Image` padrão.
- **`expo-font`**: load de fontes custom.
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

- **EAS Update** (Expo), o caminho moderno.
- **CodePush** (Microsoft), vai ser descontinuado em 2025; migrar.
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

- **React DevTools** standalone, inspeciona árvore.
- **Flipper** (descontinuado pelo Meta em 2024 mas ainda usado), debug network, layout, logs.
- **React Native DevTools** (nova), sucessor moderno integrado ao Hermes.
- **Performance Monitor** in-app, FPS de UI thread e JS thread separados (aprenda a ler).
- **Hermes profiler**: sampling profiler de JS.
- **Xcode Instruments** / **Android Studio Profiler**: pro lado nativo.

Sintomas comuns e onde olhar:
- Lista trava ao scrollar → JS thread bloqueada → mover pra UI thread, virtualizar, memoizar.
- Animação trava → confirmar `useNativeDriver` ou Reanimated.
- App lento ao abrir → bundle grande, muitos imports síncronos, módulos nativos pesados.
- Crash silencioso → logs nativos via Xcode/`adb logcat` (RN log não pega tudo).

### 2.17 Multi-platform: web e desktop

- **react-native-web**: render RN components em DOM. Útil pra compartilhar componentes; não é solução completa.
- **Expo for Web**: combina RN-Web + Metro pra web. Útil pra apps simples.
- Em projetos sérios cross-platform, geralmente vale ter codebases separados pra UI mobile e web (compartilhando lógica, schema, hooks puros).

### 2.18 Hermes engine + JSI + Reanimated 3 + Skia (RN performance deep)

Cobre o caminho crítico de performance do RN moderno: bytecode engine, ponte sem serialização, animações em UI thread, GPU-accelerated graphics. RN 0.78+ assume New Architecture default; Hermes é mandatório.

**Hermes engine internals**. Hermes compila JS pra bytecode `.hbc` ahead-of-time (no build), enviado dentro do bundle. JIT desligado por default — cold start ~25-40% mais rápido e RAM menor que JSC, mas peak throughput em hot loops puro JS ~2x pior. Trade-off explícito: app típico (UI + I/O) vence; app CPU-heavy perde. Pra workloads pesados, opt-in `enable_hermes_jit` no `ios/Podfile`. Profile com **Hermes Sampling Profiler** em React Native DevTools (gera flame trace). **Static Hermes** (experimental 2025+): subset typed de JS compila pra native code, fechando gap de throughput.

**JSI deep**. JSI substitui bridge JSON. C++ host objects expostos direto como JS objects via `jsi::HostObject`. **TurboModule = JSI + codegen**: codegen lê spec TS/Flow e gera binding C++/Java/ObjC. Estrutura completa de TurboModule custom:

```ts
// specs/NativeMyModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
export interface Spec extends TurboModule { getDeviceId(): string; }
export default TurboModuleRegistry.getEnforcing<Spec>('MyModule');
```

```json
// package.json
"codegenConfig": { "name": "MyModuleSpec", "type": "modules", "jsSrcsDir": "specs" }
```

```kotlin
// android/.../MyModule.kt
class MyModule(ctx: ReactApplicationContext) : NativeMyModuleSpec(ctx) {
  override fun getDeviceId(): String = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID)
}
```

Native module antiga (sem JSI) ainda funciona via **interop layer** (slow path) na New Arch — deprecate gradualmente.

**Fabric renderer**. Concurrent rendering, shadow tree C++ compartilhado entre threads via Yoga. `setNativeProps` legado **silent fail** em Fabric — substitua por `useAnimatedStyle` (Reanimated) ou commit hooks via ref imperativo novo.

**Reanimated 3 worklets**. Worklet roda em UI thread runtime separado, 60fps mesmo com JS thread bloqueado. Closure captura só primitivos serializáveis ou shared values; objects ricos viram `undefined` em runtime. Pattern de gesture-driven (Logística — order card que expande com pan):

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function OrderCard({ order, onAccept }: { order: Order; onAccept: (id: string) => void }) {
  const translateY = useSharedValue(0);
  const orderId = order.id; // capture primitivo, não o objeto

  const pan = Gesture.Pan()
    .onChange(e => { translateY.value = e.translationY; })
    .onEnd(e => {
      if (e.translationY < -120) runOnJS(onAccept)(orderId);
      translateY.value = withSpring(0);
    });

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return <GestureDetector gesture={pan}><Animated.View style={animated}>{/* row */}</Animated.View></GestureDetector>;
}
```

Cruze threads com `runOnJS` (atualizar React state pós-gesture); `useFrameCallback` pra 60fps callback; `useDerivedValue` pra computed shared. Pegadinhas: shared value mutado em loop sem `withTiming/withSpring` causa renderer thrash; closure capturada via `runOnUI` errado deadlocks.

**Skia (`@shopify/react-native-skia` v1.x)**. GPU-accelerated 2D engine (Skia, mesmo do Chrome/Flutter). Use case Logística: mapa custom com courier markers, polyline animada da rota, pulse dots em destinos:

```tsx
import { Canvas, Path, Skia, Group, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

const routePath = Skia.Path.MakeFromSVGString('M10,10 L120,80 L240,180')!;

function CourierMap({ progress }: { progress: SharedValue<number> }) {
  const end = useDerivedValue(() => progress.value); // 0..1
  return (
    <Canvas style={{ flex: 1 }}>
      <Path path={routePath} color="#0af" style="stroke" strokeWidth={4} start={0} end={end} />
    </Canvas>
  );
}
```

Integra com Reanimated shared values direto. Pintura completa (ImageShader, Mask, Blur) roda 60fps em low-end Android. **Não use Skia em UI estática** — `View` + transform resolve, Skia é overhead injustificado.

**MMKV vs AsyncStorage (2026)**. MMKV (Tencent C++ via JSI) ~30x mais rápido que AsyncStorage. API síncrona, sem promise overhead. AsyncStorage usa SQLite/RocksDB nativo, async via bridge — slow pra hot reads.

```ts
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV({ id: 'logistics-cache', encryptionKey: 'token' });
storage.set('jobs.today', JSON.stringify(jobs)); // sync, sem await
const cached = storage.getString('jobs.today');
```

**Anti-patterns**:

1. JSC habilitado em build de produção (perf pior que Hermes em apps modernos).
2. `setNativeProps` em Fabric (silent fail; use Reanimated ou ref imperativo novo).
3. Worklet capturando objeto rico via closure (`{order}` em vez de `order.id`) — `undefined` em runtime.
4. Shared value mutado em frame callback sem `withTiming/withSpring` (judder).
5. `runOnJS` em hot path de gesture (latência cross-thread; compute em worklet).
6. AsyncStorage pra hot reads (queue + bridge round-trip por call).
7. Skia em UI estática (overhead injustificado, `View` resolve).
8. Custom TurboModule sem `codegenConfig` em `package.json` (binding gen falha silently, runtime quebra).

**Logística applied**. Courier app: lista com FlashList (200+ jobs), swipe-to-accept via Reanimated worklet + `runOnJS` pra confirmar API, mapa com Skia desenhando polyline animada da rota, MMKV pra cache offline-first dos jobs do dia, MMKV+SecureStore split (dados em MMKV, token em SecureStore).

**Cruza com**: `02-04` (React concurrent rendering vs Fabric paralelo no shadow tree), `03-09` (frontend perf, princípios compartilhados — virtualização, memoização, off-main-thread), `02-17` (native mobile direto, quando JSI é insuficiente e precisa Swift/Kotlin puro), `02-14` (real-time, WebSocket em RN com offline-first via MMKV).

---

### 2.19 RN New Architecture GA + Expo SDK 53 + Bridgeless mode 2026

RN entrou em era estável entre 2024 e 2026. New Architecture deixou de ser opt-in experimental e virou default a partir de RN 0.74 (Q2 2024). Bridgeless mode — sem bridge JS↔Native serializando JSON — chegou a GA na mesma versão. RN 0.78 (Q3 2025) trouxe suporte oficial a React 19. Expo deixou de ser "alternativa hobby" e se tornou o DX path dominante: SDK 52 (Q4 2024, RN 0.76) consolidou Expo Router v4, e SDK 53 (Q1 2025, RN 0.78 + React 19) trouxe maturidade do EAS Build/Update como substituto Fastlane/Bitrise pra grande parte dos times. §2.5 cobriu o intro JSI/Fabric/TurboModules; §2.18 cobriu Hermes + Reanimated 3 + Skia; aqui é o stack de produção 2026.

**New Architecture as default (RN 0.74+)**. Fabric (renderer C++ síncrono, shadow tree paralelo), TurboModules (módulos nativos com chamadas síncronas via JSI, lazy-loaded), Codegen (gera bindings TS↔C++↔Java/ObjC a partir de spec). Old Architecture continua suportada via interop layer: módulos legacy (não-TurboModule) são wrapped por uma camada que fala com Fabric/JSI. Migração não é all-or-nothing — você pode ter biblioteca antiga rodando junto. Mas cada lib não-migrada é débito: interop tem overhead, e algumas falham silently sob Bridgeless.

**Bridgeless mode GA (RN 0.74+)**. Removeu a bridge clássica (queue assíncrono que serializava chamadas JS↔Native em JSON). Function calls cruzam thread direto via JSI. Ganho real: TTI (Time to Interactive) cai 20-40% em apps medianos, listas com 1000+ items renderizam sem stutter, animações nativas + JS sincronizam sem frame drop. Hermes (default desde RN 0.70) cold start em ~100ms vs JSC ~250ms. Bridgeless quebra módulos custom que ainda chamam `RCTBridge` direto — todos precisam migração TurboModule + Codegen spec.

```json
// app.json (Expo SDK 53)
{
  "expo": {
    "name": "courier-app",
    "slug": "courier-app",
    "version": "1.4.0",
    "newArchEnabled": true,
    "ios": { "buildNumber": "142", "bundleIdentifier": "com.logistica.courier" },
    "android": { "versionCode": 142, "package": "com.logistica.courier" },
    "plugins": [
      "expo-router",
      "expo-updates",
      ["expo-build-properties", { "ios": { "newArchEnabled": true }, "android": { "newArchEnabled": true } }]
    ],
    "updates": { "url": "https://u.expo.dev/PROJECT_ID", "channel": "production" },
    "runtimeVersion": { "policy": "appVersion" }
  }
}
```

**React 19 on RN 0.78+**. `use` hook funciona (suspende em Promise, contexto condicional). `ref` como prop sem `forwardRef`. Asset preloads (`preload`, `preinit`) são no-op em RN — uso correto é `Asset.loadAsync` do `expo-asset`. Suspense boundaries renderizam fallback durante carregamento de dados/imagens. Actions (`useActionState`, `useFormStatus`) funcionam mas são menos relevantes em mobile (não tem `<form>` HTML).

**Expo SDK 53 stack**. Expo Router v4 — file-system routing idêntico ao Next.js App Router, mas com `Stack`/`Tabs` ao invés de layouts HTML. Deep links automáticos pelo path. Layouts aninhados via `_layout.tsx`. Protected routes via redirect em layout.

```
app/
├── _layout.tsx              # root Stack
├── (auth)/
│   ├── _layout.tsx          # Stack auth
│   ├── login.tsx
│   └── verify.tsx
├── (courier)/
│   ├── _layout.tsx          # Tabs courier
│   ├── jobs.tsx             # /jobs
│   ├── jobs/[id].tsx        # /jobs/123 dynamic
│   ├── route.tsx
│   └── profile.tsx
└── +not-found.tsx
```

```tsx
// app/(courier)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function CourierLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.role !== 'courier') return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0a7' }}>
      <Tabs.Screen name="jobs" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="route" options={{ title: 'Rota' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
```

**EAS Build production patterns**. `eas.json` define profiles (development, preview, production). Secrets via `eas env:create` (não commitar). Simulator builds pra QA interno, internal distribution pra beta, EAS Submit publica direto na App Store / Play Console.

```json
// eas.json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": false }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "env": { "API_URL": "https://api.logistica.com" }
    }
  },
  "submit": {
    "production": {
      "ios": { "ascAppId": "1234567890", "appleTeamId": "TEAM123" },
      "android": { "serviceAccountKeyPath": "./play-service-account.json", "track": "production" }
    }
  }
}
```

**EAS Update (OTA) via channels/branches**. Channel = mapeamento estático no binário (`production`, `preview`). Branch = stream de updates publicados. `eas update --branch production-v1.4 --channel production` aponta channel pra branch específica. Rollback = repointar channel pra branch anterior. Disciplina: nunca apontar channel `production` pra branch `staging`. `runtimeVersion` previne update OTA com mismatch nativo.

**Continuous Native Generation (CNG)**. `npx expo prebuild --clean` regenera `ios/` e `android/` a partir de `app.json` + config plugins. Elimina mistério "o que mudei no Xcode". Pastas nativas podem ficar fora do git (recomendado) — fonte da verdade é `app.json` + plugins. Plugin custom modifica AndroidManifest, Info.plist, Podfile.

**Reanimated 4 (Q1 2025)**. CSS-like style props (`animatedStyle` direto em `<View style={[styles, transform: { rotate: angle.value }]}>` simplificado), worklets continuam (`'worklet'` directive), shared transitions API mais limpa, layout animations declarativas. Performance comparável à 3, API menos verbosa.

```tsx
// swipe-to-accept worklet
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function SwipeAccept({ onAccept }: { onAccept: () => void }) {
  const tx = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate(e => { tx.value = Math.max(0, e.translationX); })
    .onEnd(() => {
      if (tx.value > 200) {
        tx.value = withSpring(280);
        runOnJS(onAccept)();
      } else {
        tx.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return <GestureDetector gesture={pan}><Animated.View style={style} /></GestureDetector>;
}
```

**RN Skia 2.0 (Q4 2024)**. Canvas declarativo, animated drawings, photo manipulation com perf nativa. Polyline animada da rota, charts custom, filtros de imagem. Integração com Reanimated via `useDerivedValue` + `Skia.Path`.

**Stack Logística aplicada**. Courier app: RN 0.78 + Expo SDK 53 + New Arch + Bridgeless. Expo Router v4 com `(auth)`/`(courier)`/`(dispatcher)` segmentando rotas por role via layout-level redirect. EAS Build profile `production` com `autoIncrement` (versionCode/buildNumber automático). EAS Update channel `production` + branch `production-v1.4`. Reanimated 4 anima swipe-to-accept; Skia 2.0 desenha polyline live da rota com `useDerivedValue` lendo GPS via shared value. FlashList 2.0 (Q1 2025) renderiza 500+ jobs com recycling. Hot reload (Fast Refresh) durante dev via `expo-dev-client` com módulos nativos custom.

**10 anti-patterns**:

1. Bridgeless mode habilitado sem auditar custom native modules legacy (módulo que chama `RCTBridge` direto quebra runtime; migração TurboModule + Codegen obrigatória).
2. New Architecture com TurboModule sem `codegenConfig` em `package.json` (binding gen falha silently, app crasha no primeiro acesso ao módulo).
3. Expo Router v4 com nested layouts mal configurados (deep link `/jobs/123` não resolve porque `_layout.tsx` do segmento intermediário não existe).
4. EAS Build production sem `appVersionSource: "remote"` ou `autoIncrement` (versionCode/buildNumber duplicado, App Store/Play Console rejeitam upload).
5. EAS Update sem disciplina de channel (publicar branch `staging` no channel `production` por engano em `--branch` com nome confuso; sempre nomear branch com sufixo de ambiente).
6. Reanimated 4 worklet chamando `setState` React direto sem `runOnJS` (worklet roda na UI thread, setState exige JS thread; crash imediato).
7. RN 0.78 com biblioteca não-compatível React 19 (peer dep mismatch, `useEffect`/refs quebram porque lib usa API removida).
8. CNG (`prebuild`) com pastas `ios/`/`android/` versionadas no git e editadas manualmente em paralelo (drift entre app.json e nativo, próximo `prebuild --clean` apaga edits).
9. `Asset.preload` ou `preinit` do React 19 esperado funcionar em RN (no-op silencioso; usar `expo-asset` `Asset.loadAsync`).
10. `runtimeVersion` policy `appVersion` em update OTA com nova native dep adicionada (binário antigo recebe update incompatível, crash em produção; bumpar appVersion ou usar policy `nativeVersion`).

**Cruza com**: `02-06` §2.5 (New Architecture intro JSI/Fabric/TurboModules), §2.6 (Hermes), §2.7 (Metro bundler), §2.8 (FlashList lists), §2.10 (gestures + animation), §2.13 (OTA updates intro), §2.18 (Hermes/JSI/Reanimated 3/Skia deep), `02-04` §2.15 (React 19.1 patterns — same `use` hook + ref as prop), `02-13` §2.20 (Passkeys WebAuthn — react-native-passkey), `02-17` (native mobile direct, quando RN não basta), `03-04` §2.21 (release-please pra versionamento RN), `03-08` (security mobile — secure storage + cert pinning).

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

Construir o **app mobile da Logística**: companion app para entregadores.

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
- API mockada local ou remota, desde que o app funcione offline (cache).

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

- Liga com **02-04**: tudo é React. Mas a árvore renderiza em `UIView`/`android.View`, não DOM.
- Liga com **02-01/02-02**: layout flexbox via Yoga; acessibilidade tem APIs próprias (`accessibilityLabel`, `accessibilityRole`).
- Liga com **02-07** (Node): bundler usa Node; ferramentas de build são Node CLIs.
- Liga com **02-13** (auth): SecureStore/Keychain/Keystore como armazenamento de token.
- Liga com **02-14** (real-time): WebSocket nativo no RN; SSE precisa de polyfill em alguns RN versions.
- Liga com **03-01** (testes): Jest + React Native Testing Library; Detox/Maestro pra E2E.
- Liga com **03-04** (CI): EAS Build automatiza build CI/CD.
- Liga com **03-09** (perf): Web Vitals do mundo mobile = startup, FPS, jank, memory pressure.

---

## 6. Referências

- **React Native docs** ([reactnative.dev](https://reactnative.dev/)), leia New Architecture, Performance, Threading.
- **Expo docs** ([docs.expo.dev](https://docs.expo.dev/)), guia oficial moderno.
- **"React Native Performance"**: Vadim Demedes, série de posts sobre tunar.
- **Reanimated docs**: worklets, layout animations.
- **FlashList docs** ([shopify.github.io/flash-list](https://shopify.github.io/flash-list/)).
- **William Candillon** ("Can it be done in React Native?"), YouTube com Skia/Reanimated avançado.
- **Krzysztof Magiera** (criador de Reanimated/Gesture Handler), talks sobre internals.
- **"React Native Architecture: A Deep Dive"**: talks da React Conf sobre Fabric/JSI.
