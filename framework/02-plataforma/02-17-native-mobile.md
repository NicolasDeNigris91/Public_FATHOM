---
module: 02-17
title: Native Mobile — iOS Swift, Android Kotlin, Platform APIs, Build Pipelines
stage: plataforma
prereqs: [02-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-17 — Native Mobile (iOS / Android)

## 1. Problema de Engenharia

React Native esconde plataforma. Você consegue construir apps razoáveis sem entender o que **está embaixo** — UIKit/SwiftUI no iOS, Android Framework + Compose no Android, lifecycles, threading, energy management, permissions, store policies. Mas quando precisa de feature platform-specific (Apple Pay nativo, ARKit, foreground service, push provisioning, MDM, deep linking confiável, biometric com Secure Enclave), ou quando RN bridge engasga sob carga, você precisa **saber ler/escrever código nativo**.

E em entrevista de Senior mobile, "construí com RN" é fraco. Senior conhece o que está abaixo da abstração. Apple e Google atualizam APIs todo ano; quem não acompanha as plataformas viver de SO do passado. Reactive frameworks (SwiftUI, Compose) mudaram completamente o paradigma vs imperative (UIKit, Views) — entender o porquê é fundamental.

Este módulo é um **mergulho seletivo em iOS Swift e Android Kotlin** — não pretende formar dev nativo full-time, e sim fechar o gap entre "useo RN" e "entendo o sistema". Lifecycle, threading, memory, UI frameworks modernos, networking, persistence, permissions, push, build, app store realities.

---

## 2. Teoria Hard

### 2.1 iOS architecture (high level)

iOS = Darwin (XNU kernel, Mach + BSD) + frameworks Apple. App roda dentro de **process** sandboxed, com app group de assets/data. Linguagens: Swift (preferida) e Objective-C (legado).

Lifecycle de app: `application(_:didFinishLaunching...)` → `applicationDidBecomeActive` → background → terminate. Em iOS moderno, **scenes** (multi-window iPad), `SceneDelegate`.

Limite de tempo em background: ~30s (`beginBackgroundTask`), tarefas longas precisam **Background Tasks framework** (BGAppRefreshTask, BGProcessingTask) ou `BackgroundFetch` legado.

### 2.2 UIKit vs SwiftUI

- **UIKit**: imperativo, MVC/MVVM, view hierarchy mutável. `UIViewController`, `UIView`, autolayout (constraints), delegate/datasource pattern. Maturíssimo, todas APIs disponíveis.
- **SwiftUI**: declarativo, view = função pura de state. `View` é struct, body recomputa. Composição, `@State`, `@Binding`, `@ObservedObject`, `@StateObject`, `@EnvironmentObject`. Animations builtin.

Hoje: SwiftUI default em new code, com fallbacks UIKit (UIViewControllerRepresentable, UIViewRepresentable) onde necessário. Apps existentes misturam.

### 2.3 Concorrência em Swift

Swift Concurrency (Swift 5.5+):
- `async` / `await`.
- `Task { ... }` cria task.
- **Actors**: tipo que isola estado. Acesso só via `await`. Elimina muito data race.
- **Sendable**: protocolo de tipos seguros pra cruzar boundaries.
- **TaskGroup**, **AsyncSequence**.

Antes: GCD (Grand Central Dispatch) — `DispatchQueue.main.async`, `.global(qos: .userInitiated)`. Ainda muito código legado.

Threads em iOS: **main thread** pra UI. Off-main pra trabalho. Bloquear main = ANR-equivalent (watchdog mata após ~20s).

### 2.4 Memory management iOS

ARC (Automatic Reference Counting): compiler insere retain/release. Reference cycles são vazamentos — `weak`/`unowned` quebram (closures que capturam `self`). Patterns: `[weak self] in guard let self else { return }`.

Instruments (Xcode tool): Leaks, Allocations, Time Profiler. Sample app pra encontrar retain cycle e pegar memory growth.

### 2.5 Android architecture

Android = Linux kernel + bibliotecas C (Bionic libc) + Android Runtime (ART, antes Dalvik). Apps em Java/Kotlin compilam pra **DEX** (Dalvik Executable), JIT/AOT pelo ART.

Cada app é processo Linux + UID. IPC via **Binder** (mecanismo único Android). `Activity`, `Service`, `BroadcastReceiver`, `ContentProvider` são os 4 componentes históricos.

### 2.6 Activity lifecycle e Compose

Lifecycle clássico: `onCreate` → `onStart` → `onResume` → `onPause` → `onStop` → `onDestroy`. Configuração change (rotação) por padrão recria activity.

ViewModels (AndroidX) sobrevivem a config change. **State holder** pattern.

UI:
- **Views (XML + imperative)**: legado, ainda majoritário em apps grandes.
- **Jetpack Compose**: declarativo, tipo SwiftUI. `@Composable` functions, recomposition automática, `remember`, `State`, `LaunchedEffect`. Material 3 components.

### 2.7 Coroutines em Kotlin

Coroutines = light threads, baseadas em suspend functions. Estruturada via `CoroutineScope`. Dispatchers: Main, IO, Default.

```kotlin
viewModelScope.launch(Dispatchers.IO) {
  val data = repo.fetch()
  withContext(Dispatchers.Main) { _state.value = data }
}
```

Flow: stream cold/hot reativo, similar a RxJava mas integrada com coroutines. StateFlow e SharedFlow pra state.

### 2.8 Threading e ANR

ANR (Application Not Responding) dispara se main thread fica > 5s sem responder. Causas comuns: IO em main, work pesado em main, lock contention.

Sempre I/O off-main. `runOnUiThread` pra atualizar view do background.

### 2.9 Networking

iOS: **URLSession** (default), `Combine` reactive, async/await. JSON via `Codable`. Alamofire é wrapper popular.

Android: **OkHttp** + **Retrofit** combo padrão. Coroutines + Moshi/kotlinx.serialization pra JSON.

Considerações: certificate pinning, retry policies, offline first, request coalescing, ETags, image caching.

### 2.10 Persistence

iOS: **Core Data** (legado, abstração ORM), **SwiftData** (iOS 17+, novo wrapper), **Realm**, **GRDB**. UserDefaults pra config simples. Keychain pra secrets.

Android: **Room** (Jetpack, abstração SQLite), **DataStore** (config moderna), Realm. SharedPreferences (legado).

SQLite é base em ambos. Backups, migrations, encryption (SQLCipher).

### 2.11 Permissions

Modelos opaco-pra-RN:
- iOS: `Info.plist` description strings + runtime request via framework (`PHPhotoLibrary.requestAuthorization`). Negar uma vez = só Settings reabilita.
- Android: runtime permissions desde 6.0. Manifest declara, código pede com `requestPermissions`. Granularidade mudou em cada versão (storage scoped, photo picker, posix tasks).

### 2.12 Push notifications

iOS: **APNs** (Apple Push Notification service). Token device-specific, server envia via HTTP/2 com auth JWT. **Notification Service Extension** (modify payload) e **Notification Content Extension** (custom UI). **Silent push** pra wake app sem alert.

Android: **FCM** (Firebase Cloud Messaging). Token registra, server envia via HTTP. Tipos: notification, data. Foreground/background behavior diferente.

Limites: throttling, payload size, delivery semantics ("best effort", não garantido). Para crítico, fallback (SMS, in-app badge).

### 2.13 Background work

iOS: BackgroundTasks (BGAppRefreshTask, BGProcessingTask), **BackgroundFetch** legado. Sistema decide quando rodar baseado em behavior do user. **Foreground app** sem limite.

Android: **WorkManager** (Jetpack) pra trabalho deferred com constraints (network, charging). **Foreground services** pra trabalho user-visible (música, navegação). **Doze mode** suspende quando idle. Background limits foram apertando version-by-version.

### 2.14 App size & build

Bundle iOS: IPA (`.ipa` zip). App thinning entrega só archs/assets do device. App Store Connect upload via Xcode/Transporter/`xcrun altool`.

Android: **AAB** (Android App Bundle) recomendado, Play gera APKs por device. **R8** (sucessor de ProGuard) faz code shrinking, obfuscation.

CI: Xcode Cloud, Bitrise, GitHub Actions com macOS runner (iOS) ou Linux (Android).

### 2.15 Energy & performance

Battery é UX: anti-pattern queimar. Patterns:
- Coalesce networking.
- Honor `Low Data Mode` (iOS), `DataSaver` (Android).
- Cancel work em background unless critical.
- Use system frameworks for location (significant change vs continuous updates).
- Profile com Energy Log (iOS) e Battery Historian (Android).

### 2.16 Store realities

App Store: review humano (1-2 dias usual, mais em casos), reject por privacy strings ausentes, IAP requirement em digital goods, Sign in with Apple obrigatório se outro SSO. **Privacy Manifest** + tracking domains required.

Play Store: review automatizado e humano, política mudando rápido (target SDK requirements, data safety form), Play Integrity API pra detectar tampering.

### 2.17 Deep links e Universal Links / App Links

- iOS: **Universal Links** (HTTPS URL → app se instalado, fallback site). Requires apple-app-site-association no domínio.
- Android: **App Links** (HTTPS), DigitalAssetLinks JSON. Custom schemes (`myapp://`) ainda usados, menos seguros (qualquer app reivindica).

### 2.18 RN vs Native: quando ir nativo

- Performance crítica (render-heavy, ML on-device, AR/games).
- Acesso a APIs platform-specific avançadas (Vision, ARKit, CoreML, Bluetooth complexo, MDM).
- Time-to-market e team capacity favorecem RN; Senior mobile entrega ambos quando preciso.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar UIKit vs SwiftUI; quando misturar.
- Explicar Swift Concurrency: `async/await`, actors, Sendable.
- Listar lifecycle iOS e Android (states canônicos).
- Diferenciar Compose vs Views; vantagens declarativo.
- Explicar coroutines + dispatchers Kotlin.
- Justificar I/O off-main; ANR Android.
- Explicar APNs vs FCM (auth, payload, silent).
- Diferenciar BackgroundTasks (iOS) vs WorkManager (Android).
- Explicar Universal Links / App Links e a verificação domain.
- Diferenciar AAB e APK; o que R8 faz.
- Explicar quando RN não basta com 3 critérios.

---

## 4. Desafio de Engenharia

Construir **app nativo iOS + Android** que consome a API da Logística (do CAPSTONE-plataforma).

### Especificação

**iOS app (Swift + SwiftUI, Xcode 15+)**:
1. Tela login (OAuth2 PKCE, store token em Keychain).
2. Lista pedidos do entregador via API; pull-to-refresh.
3. Detalhe pedido: mapa (MapKit) com pickup/dropoff, botão "comecei rota".
4. Background location tracking via `CLLocationManager` (significant change). Push pro server quando muda.
5. Push notification (APNs) ao receber atribuição de pedido. Service Extension altera payload.
6. Universal Link: `https://logistica.example.com/orders/:id` abre detalhe.
7. Local persistence via SwiftData ou Core Data (cache offline-first).
8. Sign in with Apple opcional.

**Android app (Kotlin + Compose, AGP 8+)**:
1. Login OAuth2 PKCE; token em EncryptedSharedPreferences ou Keystore.
2. Lista, detalhe, mapa (Google Maps SDK ou OSMdroid).
3. Foreground service com tracking de location quando rota ativa.
4. FCM push.
5. App Link: mesmo URL pattern.
6. Persistence via Room.

**Common**:
- Compartilhe API client design pattern (mesmo endpoints, modelos compatíveis).
- Treine cancelation de coroutines / tasks ao trocar tela.
- Logging estruturado (OSLog iOS, Timber Android).

### Restrições

- Sem RN, sem Flutter. **Só nativo**.
- Permissions request com explanation.
- Keychain/Keystore pra credentials. Nunca em plain text.
- Pinning ou pelo menos certificate validation customizada documentada.
- Cobertura unit + UI tests (XCTest, Espresso/UiAutomator).

### Threshold

- Build pipeline (CI) gera artifact assinado (ad-hoc/debug ok).
- Login E2E funciona em device real (TestFlight ad-hoc / Firebase App Distribution).
- Push notification chega.
- Tracking liga foreground service e pinga server cada 30s.
- Universal/App Link abre app em fluxo correto.

### Stretch

- **Biometric auth** (FaceID, BiometricPrompt) pra reabrir app.
- **Apple Pay** sandbox / Google Pay pra simular pagamento de pedido.
- **WatchOS companion** mostra próxima entrega.
- **Wear OS companion** idem.
- **Compose Multiplatform** ou **Swift cross-platform UI** experimentar (não substituir o nativo).

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): Android = Linux. iOS = Darwin.
- Liga com **01-03** (networking): TLS, pinning, HTTP/2 (APNs).
- Liga com **01-07** (JS): RN bridge — agora você sabe o que está abaixo.
- Liga com **02-06** (RN): contraste arquitetural.
- Liga com **02-13** (auth): OAuth2 mobile-specific (PKCE obrigatório).
- Liga com **02-14** (real-time): WebSocket em mobile, reconnect agressivo, energy.
- Liga com **01-12** (crypto): Keychain/Keystore baseiam em hardware secure enclave.
- Liga com **03-08** (security): mobile threats — root/jailbreak detection, anti-tamper.
- Liga com **03-09** (perf frontend): Core Web Vitals → mobile equivalent (energy, frame time).

---

## 6. Referências

- **"iOS App Distribution & Best Practices"** — Apple Developer.
- **Apple WWDC sessions** — anuais; busque "What's new in SwiftUI", "Swift Concurrency".
- **"Hacking with Swift"** — Paul Hudson.
- **"Functional Swift"** — objc.io.
- **Android Architecture Components / Jetpack docs** ([developer.android.com/jetpack](https://developer.android.com/jetpack)).
- **"Compose Cookbook"** — Google.
- **"Kotlin Coroutines: Deep Dive"** — Marcin Moskała.
- **Google I/O sessions** — anuais.
- **"Effective Kotlin"** — Marcin Moskała.
- **"Designing Mobile Apps"** — Apple HIG, Google Material 3 guidelines.
