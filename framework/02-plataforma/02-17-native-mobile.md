---
module: 02-17
title: Native Mobile, iOS Swift, Android Kotlin, Platform APIs, Build Pipelines
stage: plataforma
prereqs: [02-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual o papel de `actor` em Swift Concurrency?"
    options:
      - "É um tipo que executa em background thread automaticamente"
      - "É um tipo que serializa acesso a estado mutável via mailbox interno, eliminando data races; acesso externo precisa de `await`"
      - "É uma alternativa a `class` que não permite herança"
      - "É um wrapper sobre GCD que substitui DispatchQueue"
    correct: 1
    explanation: "Actors em Swift isolam estado mutável: chamadas externas são automaticamente serializadas e exigem `await`. Substituem locks/queues manuais. `MainActor` é o actor global de UI thread."
  - q: "Por que `GlobalScope.launch` é anti-pattern em Kotlin Android?"
    options:
      - "Porque é mais lento que `viewModelScope`"
      - "Porque não tem parent scope, não cancela com lifecycle e vaza coroutines quando ViewModel/Activity morre"
      - "Porque só funciona em Dispatchers.IO"
      - "Porque gera warnings de deprecation"
    correct: 1
    explanation: "GlobalScope é desligado da structured concurrency: a corrotina sobrevive ao ciclo de vida do componente, vazando memória e causando crashes ao tocar UI destruída. Use `viewModelScope` ou `lifecycleScope`."
  - q: "Por que custom URI schemes (`myapp://`) são considerados inseguros vs Universal Links / App Links?"
    options:
      - "Porque o iOS removeu suporte em iOS 17"
      - "Porque qualquer app pode reivindicar o mesmo scheme e fazer hijacking; Universal/App Links exigem prova de propriedade do domínio via .well-known JSON"
      - "Porque schemes não passam pelo App Store Review"
      - "Porque schemes não suportam parâmetros de query"
    correct: 1
    explanation: "Custom schemes não têm autoridade — múltiplos apps podem registrar o mesmo `myapp://`, e o sistema escolhe arbitrariamente. Universal/App Links validam via apple-app-site-association / assetlinks.json, comprovando ownership do domínio."
  - q: "Por que ANR é disparado em Android quando a main thread fica > 5s ocupada?"
    options:
      - "Porque o kernel mata processos com CPU alta"
      - "Porque o sistema entende que o app não está respondendo a input do usuário, oferecendo dialog de 'wait/close'; I/O em main é causa clássica"
      - "Porque o garbage collector dispara automaticamente"
      - "Porque o ART recompila a aplicação"
    correct: 1
    explanation: "Android monitora a UI thread; se ela não consome eventos por > 5s, dispara o dialog ANR. I/O síncrono, work pesado ou lock contention em main causam isso. Sempre I/O off-main via `Dispatchers.IO`."
  - q: "Em Kotlin Multiplatform, qual o padrão arquitetural vencedor para reaproveitar código sem comprometer UX nativa?"
    options:
      - "Compartilhar UI inteira via Compose Multiplatform iOS em todos os apps"
      - "Domain layer + Repositories + Use Cases em `commonMain`, mantendo UI nativa (SwiftUI iOS, Compose Android) para preservar look-and-feel da plataforma"
      - "Compartilhar Models e UI; manter apenas networking nativo"
      - "Usar KMP apenas para testes unitários, sem código de produção compartilhado"
    correct: 1
    explanation: "O padrão maduro KMP é shared logic + native UI: lógica de domínio é a parte reutilizável; UI nativa preserva o look platform. Empresas como Netflix, Cash App e McDonald's seguem esse modelo."
---

# 02-17, Native Mobile (iOS / Android)

## 1. Problema de Engenharia

React Native esconde plataforma. Você consegue construir apps razoáveis sem entender o que **está embaixo**: UIKit/SwiftUI no iOS, Android Framework + Compose no Android, lifecycles, threading, energy management, permissions, store policies. Mas quando precisa de feature platform-specific (Apple Pay nativo, ARKit, foreground service, push provisioning, MDM, deep linking confiável, biometric com Secure Enclave), ou quando RN bridge engasga sob carga, você precisa **saber ler/escrever código nativo**.

E em entrevista de Senior mobile, "construí com RN" é fraco. Senior conhece o que está abaixo da abstração. Apple e Google atualizam APIs todo ano; quem não acompanha as plataformas viver de SO do passado. Reactive frameworks (SwiftUI, Compose) mudaram completamente o paradigma vs imperative (UIKit, Views), entender o porquê é fundamental.

Este módulo é um **mergulho seletivo em iOS Swift e Android Kotlin**: não pretende formar dev nativo full-time, e sim fechar o gap entre "useo RN" e "entendo o sistema". Lifecycle, threading, memory, UI frameworks modernos, networking, persistence, permissions, push, build, app store realities.

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

Antes: GCD (Grand Central Dispatch), `DispatchQueue.main.async`, `.global(qos: .userInitiated)`. Ainda muito código legado.

Threads em iOS: **main thread** pra UI. Off-main pra trabalho. Bloquear main = ANR-equivalent (watchdog mata após ~20s).

### 2.4 Memory management iOS

ARC (Automatic Reference Counting): compiler insere retain/release. Reference cycles são vazamentos, `weak`/`unowned` quebram (closures que capturam `self`). Patterns: `[weak self] in guard let self else { return }`.

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

### 2.19 Swift Concurrency + Kotlin Coroutines deep + structured concurrency patterns

**Swift Concurrency (Swift 5.5+, strict concurrency obrigatório em Swift 6 / 2024+)**:

- `async/await` substitui callbacks: cleanup automático no escopo, erro propaga via `throws` em vez de `Result<T, E>` em closures.
- `Task { ... }` cria task independente herdando contexto do caller (priority, actor). `Task.detached { ... }` desliga do contexto — usar raramente, só pra trabalho fire-and-forget verdadeiro.
- Structured concurrency via `withThrowingTaskGroup(of: T.self) { group in ... }`: filhos cancelam quando pai falha; await no bloco garante todos terminam antes de retornar.
- `actor` substitui locks: serializa acesso a mutable state via mailbox interno. `MainActor` é actor global pra UI; anotar com `@MainActor` força execução em main thread.
- `Sendable` protocol marca tipos thread-safe que cruzam concurrency domains. Swift 6 strict mode rejeita compile se tipo non-Sendable cruzar actor boundary.
- Cancellation cooperativa: `try Task.checkCancellation()` em loops longos; `Task.isCancelled` non-throwing pra cleanup voluntário. Cancellation propaga down a tree de tasks filhas automaticamente.

**Pattern produção iOS — courier app (cancel previous + start new = "latest wins")**:

```swift
@MainActor
final class JobsViewModel: ObservableObject {
  @Published var jobs: [Job] = []
  @Published var error: Error?
  private var refreshTask: Task<Void, Never>?

  func refresh() {
    refreshTask?.cancel()
    refreshTask = Task {
      do {
        let fetched = try await api.fetchJobs()
        guard !Task.isCancelled else { return }
        jobs = fetched
      } catch is CancellationError { return }
      catch { self.error = error }
    }
  }
  deinit { refreshTask?.cancel() }
}
```

Evita race em pull-to-refresh repetido. Em SwiftUI, prefira `.task { await viewModel.load() }` modifier — cancela automaticamente quando view desmonta.

**AsyncSequence + AsyncStream** pra observable streams: WebSocket reactive consumido com `for try await update in stream`. Liga com `CLLocationUpdate.liveUpdates()` (iOS 17+) replacing delegate-based `CLLocationManager`. Pegadinha: `AsyncStream` sem `continuation.onTermination = { ... }` vaza a continuation quando consumer cancela.

**Kotlin Coroutines (1.7+, Compose 1.6+)**:

- `suspend fun` suspende corotina, não thread; estado salvo em continuation, retomado em qualquer thread do dispatcher.
- Dispatchers: `Main` (UI, single thread), `IO` (blocking I/O, 64 threads default), `Default` (CPU-bound, # cores), `Unconfined` (raro, herda thread do caller).
- `withContext(Dispatchers.IO) { ... }` swap pra block I/O, retorna ao dispatcher original.
- Structured concurrency: `coroutineScope { }` falha de filho cancela siblings; `supervisorScope { }` siblings independem.
- `Job`, `Deferred<T>`, `async { ... }.await()` pra parallel decomposition.

**Scopes Android**:

- `viewModelScope.launch { ... }` cancela ao `onCleared()`.
- `lifecycleScope.launch { repeatOnLifecycle(STARTED) { flow.collect { ... } } }` collect Flow só em foreground; cancela em STOPPED, restart em START.
- Anti-pattern: `GlobalScope.launch` — sem parent, sem cancellation, vaza com lifecycle.

**Pattern produção Android — courier app**:

```kotlin
class JobsViewModel(private val api: LogisticaApi) : ViewModel() {
  private val _state = MutableStateFlow<JobsState>(Loading)
  val state: StateFlow<JobsState> = _state.asStateFlow()

  private var refreshJob: Job? = null

  fun refresh() {
    refreshJob?.cancel()
    refreshJob = viewModelScope.launch {
      _state.value = Loading
      _state.value = try {
        Success(api.fetchJobs())
      } catch (e: CancellationException) { throw e }
      catch (e: Exception) { Error(e) }
    }
  }
}
```

`CancellationException` sempre re-throw; engolir quebra structured concurrency.

**Flow + StateFlow + SharedFlow**:

- `Flow<T>` cold: re-executa builder por collector. Use `flowOn(Dispatchers.IO)` pra emit em IO mantendo collect em Main.
- `StateFlow<T>` hot: tem current value, conflated, share entre collectors. UI state.
- `SharedFlow<T>` hot: replay configurável, sem current value. Eventos one-shot (snackbar, navigation).
- Operadores: `combine`, `flatMapLatest` (cancela inner anterior — perfeito pra search), `debounce`, `distinctUntilChanged`.

**NDK + JNI quando necessário**: Logística usa TF Lite C++ via JNI pra ETA prediction on-device. `external fun nativeMethod()` em Kotlin → `JNIEXPORT` em C++. Build via `externalNativeBuild { cmake { ... } }`. Overhead ~100ns por chamada; batch operations evitam chatty calls. Pegadinha: `GlobalRef` sem `DeleteGlobalRef` vaza JNI table (limit ~51200 refs).

**Deep linking unified — Universal Links / App Links**:

- iOS: `apple-app-site-association` JSON em `https://logistica.example.com/.well-known/`, validated by APN service (CDN-fetched on app install).
- Android: `assetlinks.json` no mesmo path; `<intent-filter android:autoVerify="true">` no manifest.
- Pegadinha: Cloudflare/CDN cacheia `.well-known` — invalidação após change demora. Verificar com `swcutil dl -d <domain>` (iOS) e `adb shell pm verify-app-links --re-verify <pkg>` (Android).
- Custom URI scheme (`logistica://order/123`) é inseguro — qualquer app reivindica scheme (hijacking). Use Universal/App Links sempre que possível.

**Anti-patterns observados**:

- `GlobalScope.launch` em Kotlin (vaza, sem cancellation com lifecycle).
- `Task { ... }` em SwiftUI sem `.task` modifier ou cancel em deinit (vaza após view dismissed).
- `withContext(Dispatchers.Main)` em loop (re-dispatch overhead; mover update fora do loop).
- `runBlocking` em production code (bloqueia thread, defeats purpose; só em tests/`main`).
- Swift 6 sem `Sendable` em modelo cross-actor (compile error em strict; runtime crash em loose).
- `actor.method()` chamado de outro actor sem `await` (compile fail).
- `MutableStateFlow` exposed direto na public API (consumers podem write; expor `asStateFlow()`).
- JNI `GlobalRef` sem `DeleteGlobalRef` (table leak).
- Custom URI scheme em vez de Universal/App Links (scheme hijacking attack).
- `async/await` engolindo `CancellationError` em catch genérico (cancellation virando user-facing error).

**Logística applied**: courier iOS = SwiftUI + Swift Concurrency + `actor LocationBuffer` pra coalescer GPS samples + `AsyncStream<DispatchEvent>` consumindo WS de atribuição. courier Android = Compose + `viewModelScope` + `StateFlow` pra UI + Room (coroutines-aware) pra cache offline. Deep link `https://logistica.example.com/orders/:id` abre detalhe via Universal/App Links validados.

**Cruza com**: `02-06` (RN, quando JSI insuficiente vs nativo direto), `02-13` (auth, OAuth2 PKCE em Keychain/EncryptedSharedPreferences), `04-04` (resilience, structured concurrency = supervision tree do Erlang), `02-04` (React, Concurrent rendering vs actor model nativo), `04-09` (scaling, mobile clients são major source de tráfego em distributed systems).

---

### 2.20 Swift 6 strict concurrency + Kotlin Multiplatform 2.0 + iOS 18 / Android 16 frontiers 2026

Mobile native em 2026 mudou de patamar. Swift 6 strict concurrency virou **default em new code Apple-side** (WWDC24 "Migrate your app to Swift 6"), Kotlin Multiplatform estabilizou Nov 2023 (Kotlin 1.9.20); Kotlin 2.0 GA Maio 2024 (JetBrains KotlinConf 2024) e está em produção em Netflix, McDonald's, Cash App, Philips. iOS 18 / Android 16 trouxeram features de alta-leverage (App Intents 2.0 + Apple Intelligence, Predictive Back stable, Health Connect 1.0, Foreground Service Types). Quem está em RN bridge mode legado em 2026 está cooked: New Architecture é default desde RN 0.76 (23 Out 2024).

**1. Swift 6 strict concurrency em produção 2026.** O modo `complete` força o compiler a provar ausência de data races em compile time. Migration playbook: liga `SWIFT_STRICT_CONCURRENCY=complete` em build settings, vê warnings explodirem, corrige module-by-module antes de Swift 6.x mudar warnings → errors. Region-based isolation (SE-0414) permite passar non-`Sendable` values entre isolation domains se compiler prova region disjoint — reduz `@Sendable` boilerplate brutal. Apple migrou SwiftUI internals em iOS 18 (WWDC24 talk Migrate your app to Swift 6). Escape hatches em ordem de preferência: isolated conformance > `@preconcurrency` import (silencia warnings de módulo legado) > `nonisolated(unsafe)` last-resort em property que comprovadamente nunca cruza thread.

```swift
// Actor isolando location stream — zero data race compile-time
actor LocationStream {
    private var subscribers: [UUID: AsyncStream<CLLocation>.Continuation] = [:]
    func subscribe() -> AsyncStream<CLLocation> {
        AsyncStream { cont in
            let id = UUID()
            subscribers[id] = cont
            cont.onTermination = { [weak self] _ in
                Task { await self?.unsubscribe(id) }
            }
        }
    }
    private func unsubscribe(_ id: UUID) { subscribers.removeValue(forKey: id) }
}
```

**2. Kotlin Multiplatform — shared logic + native UI.** KMP estabilizou Nov 2023 (Kotlin 1.9.20); Kotlin 2.0 saiu Maio 2024. Compose Multiplatform iOS atingiu Stable em CMP 1.8.0 (Mai 2025); current 1.11.x em 2026. Padrão vencedor: Domain layer + Repository + use cases em `commonMain`, UI nativa cada lado (SwiftUI iOS, Compose Android). Empresas em produção (JetBrains case studies 2024): Netflix shared toolkit, McDonald's app global, Cash App backend logic, Philips medical devices. `expect`/`actual` com `@Multiplatform` annotation para platform-specific bindings (Keychain iOS / EncryptedSharedPreferences Android).

```kotlin
// commonMain — domain layer compartilhado
class DispatchUseCase(private val repo: OrderRepository) {
    suspend fun nextDelivery(courierId: CourierId): Delivery? =
        repo.activeOrders(courierId)
            .filter { it.status == OrderStatus.READY }
            .minByOrNull { it.deadline }
            ?.toDelivery()
}
// iosMain — SwiftUI consome via Kotlin/Native bridge
// androidMain — Compose consome direto
```

**3. iOS 18 features alta-leverage 2026.** `@Observable` macro (Swift 5.9+) substitui `ObservableObject` — class normal vira observable sem `@Published`, recompose mais granular. Swift Testing framework substitui XCTest: `@Test` annotation, parametrized via `arguments:`, traits pra tagging. App Store agora monitora **Predictable App Launch Time** como métrica de qualidade pública. Adaptive Icons (light/dark/tinted), Control Center widgets via `ControlWidget`, App Intents 2.0 com Apple Intelligence integration (Siri executa intent direto sem deep linking).

```swift
@Observable
final class RouteViewModel {
    var currentLeg: Leg?
    var distanceRemaining: Measurement<UnitLength> = .init(value: 0, unit: .kilometers)
    func update(from gps: CLLocation) async { /* ... */ }
}
```

**4. Android 16 features alta-leverage 2026.** Predictive Back animations stable (Android 14+ opt-in, Android 16 default em apps modernos). Health Connect 1.0 GA centraliza dados de saúde (substitui Google Fit, deprecated 2025). Foreground Service Types **obrigatórios** (`location`, `mediaPlayback`, `dataSync`, etc) desde Android 14 — não declarar = `ForegroundServiceTypeException` crash. Privacy Sandbox on Android (Topics API, Protected Audience) em rollout. Splash Screen API mandatory (Play Store policy 2024+). Per-app language preferences via `AppLocaleManager`. Photo Picker dispensa `READ_MEDIA_IMAGES` permission.

**5. Cross-platform decision matrix 2026.** Quatro caminhos sérios:
- **KMP** vence em teams com platform expertise nos dois lados que querem reaproveitar lógica sem comprometer UX nativa. Curve: alta no início, paga em apps complexos.
- **RN 0.76+ New Architecture** vence em teams web pivotando pra mobile, ou empresas com componentes shared web+mobile (Meta, Shopify, Discord). JSI bridgeless mode aproxima de native mas ainda paga JS overhead.
- **Flutter 3.27** com Impeller renderer mandatory (Skia deprecated em iOS desde 3.10) vence em greenfield com design system shared owned pelo time, e em apps que priorizam pixel-perfect cross-platform sobre look-native.
- **Native-only** vence em performance-critical (camera pipelines, ARKit/ARCore, Metal/Vulkan compute, on-device ML, audio realtime). Sem competição séria.

**6. New Architecture RN 0.76+ (default desde 23 Out 2024).** Bridgeless mode elimina async JSON bridge legado. Fabric renderer (synchronous shadow tree) + TurboModules (lazy native modules via JSI) + JSI obrigatórios. Codegen workflow: define spec TypeScript, gera headers C++/Java/ObjC. Meta reporta 30% startup improvement em apps migrados (React Conf 2024). Apps em bridge mode em iOS 18 SDK começam a quebrar — ponteiros ABI mudaram.

**7. Apple Intelligence integration (US-EN GA iOS 18.1 Out 2024; EU via iOS 18.4 Mar 2025).** Set de APIs em camadas: Genmoji (custom emoji generation), Writing Tools (system-wide rewrite/proofread/summarize), Siri com App Intents (Siri executa app actions sem abrir app), Image Playground API (Image Playground sheet em-app), Visual Intelligence (camera-based query). Modelo on-device 3B parâmetros + Private Cloud Compute pra queries server-side com attestation criptográfica (Apple publica binários PCC pra audit, WWDC24 keynote).

```swift
struct ShowNextDeliveryIntent: AppIntent {
    static let title: LocalizedStringResource = "Show next delivery"
    static let openAppWhenRun: Bool = true
    @Dependency var dispatchService: DispatchService
    func perform() async throws -> some ProvidesDialog {
        let next = try await dispatchService.nextDelivery()
        return .result(dialog: "Next: \(next.address) by \(next.eta.formatted())")
    }
}
```

**8. Build & ship 2026.** Xcode Cloud (CI Apple-managed, integrado a TestFlight + App Store Connect) destrona Bitrise/CircleCI pra times Apple-only. Android Gradle Plugin 8.7 com R8 full-mode default (mais agressivo que ProGuard, requires keep rules corretas). App Bundle (AAB) mandatory desde 2021, com Play Asset Delivery pra grandes assets. **Baseline Profiles obrigatórios** em apps Play Store sérios — afeta Android Vitals score público. App Size Report Card em App Store Connect monitora download/install size — apps grandes perdem ranking.

**9. Swift macros 2026 (Swift 5.9+ stable, expansion patterns).** Macros como `@Observable`, `@Model` (SwiftData), `#Preview` substituindo boilerplate runtime. Macro types: freestanding (`#unwrap`), attached (`@Observable`). Implementação com SwiftSyntax + SwiftCompilerPlugin. Use cases real: codegen de boilerplate, analytics auto-instrumentation, type-safe SwiftUI Previews com mock data injection. Trade-off: build time +15-30% em modules com macros heavy; cache local muda menos que xcodebuild incremental.

```swift
// Custom macro pra analytics auto-tracking
@AnalyticsTracked("checkout")
struct CheckoutView: View { /* compiler injeta tracking on appear/dismiss */ }
```

**10. Compose Multiplatform iOS — GC quirks e profiling 2026.** Kotlin/Native usa garbage collector próprio (não ARC, não JVM GC). New Memory Manager (default 2.0+) é concurrent mark-and-sweep, but pode introduzir pauses inesperadas em hot path. Profiling: Xcode Instruments + `kotlin.native.binary.gc=cms` flag, monitorar `KPRELEASE_FAILURE_HANDLER` para inspect leaks. Memory pressure em iOS 18: `os_proc_available_memory()` pra detectar low-mem state e trigger compactions manuais. Real cases: JetBrains AppCode killed Q4 2024 (Compose Multi iOS prevailed); Toursprung GPS app reportou 12% jank reduction após GC tuning (KotlinConf 2024 talk).

**11. App size + delivery 2026 deep.** Android App Bundle (AAB) mandatory desde 2021, com Play Asset Delivery (PAD) tiers: install-time (default), fast-follow (download em background pós-install), on-demand (chamado em runtime via PlayCore API). iOS: App Thinning (slicing por device variant) + On-Demand Resources (ODR, tags em assets, max 2GB initial install). Code: AAB com PAD module em Gradle.

```kotlin
// app/build.gradle.kts — Asset Pack on-demand
android {
    assetPacks += listOf(":route-tiles-pack")
}
// route-tiles-pack/build.gradle.kts
plugins { id("com.android.asset-pack") }
assetPack {
    packName.set("route_tiles")
    dynamicDelivery { deliveryType.set("on-demand") }
}
```

Real numbers: courier app pode shippar com 30MB initial, baixar 200MB de map tiles via on-demand quando courier pega primeira route. Crítico pra emerging markets (data caps).

**12. Mobile observability 2026 — crash + perf + business metrics.** Stack mature em 2026: Sentry Mobile SDK 8.x (iOS Swift 6, Android Kotlin coroutines-aware, captura crash + perf + replay session) substitui Crashlytics em B2B sério (Crashlytics ainda padrão consumer). Firebase Performance Monitoring detecta slow renders, slow startup, slow network — gratuito mas data ownership questionável. **iOS:** `os_signpost` + Instruments Time Profiler pra hot paths; `MetricKit` (iOS 13+) reporta crash + hang reports + power metrics direto do device sem SDK. **Android:** Macrobenchmark + Baseline Profile validation (CI roda Macrobenchmark pra confirmar baseline profile efetivo); Android Vitals (Play Console) reporta ANR rate, slow rendering, permissões abusivas — métricas públicas que afetam ranking. Padrão production: Sentry pra crash + perf + breadcrumbs, MetricKit/Vitals pra ground-truth devices reais, custom analytics (Amplitude, Mixpanel) pra funnel business.

```swift
// iOS — os_signpost em hot path crítico
import os.signpost
let log = OSLog(subsystem: "com.app.dispatch", category: "routing")
let id = OSSignpostID(log: log)
os_signpost(.begin, log: log, name: "RouteCompute", signpostID: id)
let route = router.compute(from: origin, to: destination)
os_signpost(.end, log: log, name: "RouteCompute", signpostID: id, "%{public}d stops", route.legs.count)
```

```kotlin
// Android — Macrobenchmark validando baseline profile
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    @get:Rule val benchmarkRule = MacrobenchmarkRule()
    @Test fun startup() = benchmarkRule.measureRepeated(
        packageName = "com.app",
        metrics = listOf(StartupTimingMetric()),
        compilationMode = CompilationMode.Partial(BaselineProfileMode.Require),
        startupMode = StartupMode.COLD,
        iterations = 10
    ) { pressHome(); startActivityAndWait() }
}
```

Real numbers 2026: app B2B logístico série A = $200-500/mês Sentry Team plan; replay add-on $0.05/replay; equipe gasta 10-15% do ticket budget em SDK observability vs hosting (Sentry tier scale).

**Logística applied.** Courier app usa KMP: domain shared (`Order`, `Route`, `Dispatch`, `Courier` entities) em `commonMain`, repositories shared, use cases shared. iOS UI SwiftUI puro com Swift 6 strict concurrency; `actor LocationStream` isola GPS subscribers, `@Observable` view models. Android UI Jetpack Compose com Coroutines `StateFlow<RouteState>`. Apple Intelligence App Intent "Show next delivery" invocável via Siri sem abrir app. Android Foreground Service com type `location` declarado, baseline profile gerado pra hot path do dispatch screen. RN ficou de fora — performance GPS realtime + ARKit pra navegação indoor warehouse não negocia.

**Cruza com.** `02-06` (React Native 0.76 New Architecture, JSI bridgeless vs nativo direto: KMP é alternative que escolhe shared logic ao invés de shared UI). `04-04` (resilience, structured concurrency = supervision tree Erlang: Task tree em Swift, `coroutineScope` em Kotlin propaga cancellation determinística). `02-13` (auth, Keychain iOS / EncryptedSharedPreferences + Tink Android pra OAuth tokens, biometric gate via LocalAuthentication / BiometricPrompt). `04-09` (scaling, mobile fleet 100M+ devices: APNs HTTP/2 batching, FCM topic-based fan-out, Firebase A/B + Remote Config rollout staged). `03-08` (security, App Attest iOS + Play Integrity Android pra device attestation, blocking emulators e jailbreak/root em paths sensíveis).

**Anti-patterns mobile 2026.**

1. Swift 6 strict concurrency desligado em prod ("vamos depois") — débito explode quando Apple force migration; ligar agora module-by-module.
2. KMP shared module exposto na UI direto via `expect`/`actual` sem domain mapper — UI fica acoplada a internal types Kotlin/Native, refactor brutal depois.
3. RN bridge mode em 2026 — bridgeless é default 0.76+; bridge causa crash em iOS 18 SDK e perde 30% startup vs New Architecture.
4. Foreground Service sem type declarado (Android 14+) — `ForegroundServiceTypeException` em runtime, app crasha em launch.
5. `ObservableObject` + `@Published` em código novo iOS 17+ — `@Observable` macro recompose mais granular, performance melhor, código menor.
6. Skia renderer em Flutter 3.27 — deprecated em iOS desde 3.10, Impeller é mandatory; manter Skia = janks visíveis no iPhone.
7. App Intents ignorado — perder integração Siri + Apple Intelligence + Spotlight + Shortcuts em iOS 18.1+ é desperdiçar surface de discovery free.
8. Sem Baseline Profile em Android — startup fica 30-40% pior, Android Vitals score cai, Play Store ranking afeta downloads.
9. Compose Multiplatform iOS em produção sem testar Memory Model edge cases — Kotlin/Native ainda tem GC tuning quirks; profile antes de ship.
10. XCTest em código novo em 2026 — Swift Testing é estratégia oficial Apple, parametrized + traits + concurrent execution; XCTest fica pra suites legadas.

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
- Liga com **01-07** (JS): RN bridge, agora você sabe o que está abaixo.
- Liga com **02-06** (RN): contraste arquitetural.
- Liga com **02-13** (auth): OAuth2 mobile-specific (PKCE obrigatório).
- Liga com **02-14** (real-time): WebSocket em mobile, reconnect agressivo, energy.
- Liga com **01-12** (crypto): Keychain/Keystore baseiam em hardware secure enclave.
- Liga com **03-08** (security): mobile threats, root/jailbreak detection, anti-tamper.
- Liga com **03-09** (perf frontend): Core Web Vitals → mobile equivalent (energy, frame time).

---

## 6. Referências

- **"iOS App Distribution & Best Practices"**: Apple Developer.
- **Apple WWDC sessions**: anuais; busque "What's new in SwiftUI", "Swift Concurrency".
- **"Hacking with Swift"**: Paul Hudson.
- **"Functional Swift"**: objc.io.
- **Android Architecture Components / Jetpack docs** ([developer.android.com/jetpack](https://developer.android.com/jetpack)).
- **"Compose Cookbook"**: Google.
- **"Kotlin Coroutines: Deep Dive"**: Marcin Moskała.
- **Google I/O sessions**: anuais.
- **"Effective Kotlin"**: Marcin Moskała.
- **"Designing Mobile Apps"**: Apple HIG, Google Material 3 guidelines.
