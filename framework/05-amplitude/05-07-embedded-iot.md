---
module: 05-07
title: Embedded & IoT, RTOS, Microcontrollers, Constrained Networks, Telemetry
stage: amplitude
prereqs: [01-02, 03-11]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 05-07, Embedded & IoT

## 1. Problema de Engenharia

Software roda em mais que servidores e laptops. Carros, tracking devices, sensores de logística, IoT industrial, médicos, bilhões de microcontroladores rodando código com 32KB RAM, sem GC, sem OS, talvez com RTOS, em conexão flaky 2G/LoRa/BLE. Cloud-only engineer perde porção significativa da computação real.

Pra Logística, embedded é altamente relevante: tracker GPS no caminhão, sensor de temperatura em entrega refrigerada, leitor de barcode/QR custom, beacon BLE em hub. Construir hardware ou stack mobile-edge expande o que produto pode fazer.

Este módulo é embedded **suficiente pra Staff** que talvez nunca seja embedded full-time mas precisa entender quando contratar, integrar, ou fazer um wedge inicial. Microcontrollers (Arm Cortex-M, ESP32), RTOS (FreeRTOS, Zephyr), bare-metal vs RTOS, constrained networks (LoRa, NB-IoT, BLE, MQTT), OTA updates, security em devices, telemetry pipeline. Plus quando NÃO embedded (overengineering pra problema que app mobile resolve).

Optional pra Staff cujo eixo é cloud-only. Obrigatório se Logística genuinely envolve hardware.

---

## 2. Teoria Hard

### 2.1 Spectrum hardware

- **Microcontroller (MCU)**: Arm Cortex-M, ESP32, RP2040. KB-MB RAM, MHz CPU, $1-10. Bare metal ou RTOS.
- **Microprocessor com Linux** (MPU): Raspberry Pi, BeagleBone. GB RAM, GHz, $20-100. Linux-based; quase como server pequeno.
- **SoC mobile**: smartphones, tablets. Não é "embedded" tradicional.

Logística likely uses: MCU em tracker custom, MPU em router de hub, smartphone como driver tool.

### 2.2 RTOS basics

Real-Time Operating System:
- Determinístico scheduling. Tasks com priorities; preemption.
- Sem MMU usually (no virtual memory).
- Sem demand paging.
- Latency previsível (deadline matters).

Popular:
- **FreeRTOS**: open, Amazon-backed.
- **Zephyr**: Linux Foundation; modern.
- **NuttX**: POSIX-style.
- **VxWorks**: commercial classic.

Bare metal (sem RTOS): main loop + interrupts. Simples, escala mal acima de poucas tasks.

### 2.3 Memory model embedded

Sem heap dinâmico em hard real-time. Static allocation, pools de tamanho fixo.

Stack overflow não há helper, debug via canários, watermarks.

Linker scripts decidem layout (text, data, bss, heap, stack) em flash + RAM.

### 2.4 Interrupts e ISR

Interrupt: hardware sinaliza CPU. ISR (Interrupt Service Routine) responde. Restrições:
- Curto.
- Reentrant ou disabled.
- Sem chamadas blocking.
- Variáveis volatile pra comm com main.

ISR + RTOS: defer trabalho pra task via queue/sema.

### 2.5 Power management

Battery-powered devices: deep sleep dominante. Patterns:
- Sleep majority of time.
- Wake em interrupt (timer, GPIO, network).
- Minimize wake time.
- Coalesce trabalho.
- LDO / DC-DC converters efficient at target voltage.

Months/years de bateria possíveis com discipline.

### 2.6 Constrained networks

- **WiFi**: alto poder, full IP. Indoor.
- **BLE** (Bluetooth Low Energy): peer/peripheral. ~100m range. Low power.
- **LoRa / LoRaWAN**: long range (km), low bandwidth. Sub-GHz.
- **NB-IoT / LTE-M / 4G CAT-M**: cellular IoT, baixa data, low power.
- **Zigbee / Thread / Z-Wave**: mesh local.
- **Sigfox**: ultra-narrowband.

Logística trackers usually: cellular (NB-IoT) outdoor + BLE local.

### 2.7 Protocolos IoT

- **MQTT**: pub/sub leve, broker centralized. Default IoT.
- **CoAP**: REST-like sobre UDP. Constrained.
- **LwM2M**: device management.
- **HTTP**: pesado mas universal.

QoS levels MQTT: 0 (fire-and-forget), 1 (at-least-once), 2 (exactly-once via 4-way).

### 2.8 OTA (Over-The-Air) updates

Crítico. Device em campo precisa update sem visit físico.

Patterns:
- A/B partitions: write new image em B; reboot; B verifica; commit; rollback se falha.
- Delta updates: comprimir diff.
- Signed firmware: chain of trust.
- Bootloader gerencia.

Failures podem brick device. Test extensively.

### 2.9 Security em devices

Threats únicos:
- Physical access: extract firmware, sniff bus.
- Cloning: flash idêntico em outro device.
- Replay attacks.
- Side channel: timing, power analysis.

Defesas:
- **Secure element / TPM** pra keys.
- **Secure boot**: chain of trust desde ROM.
- **Anti-rollback** counters.
- **Encrypted firmware**.
- **Per-device unique keys**.
- **Tamper detection**.

PCI-DSS-like padrões em payment terminals (PCI PTS).

### 2.10 Telemetry pipeline

Device → broker → cloud → time-series store (03-13) → dashboards.

Backpressure quando connection cai: device buffers locally, replays. SD/flash log.

Schema: protobuf compacto > JSON em links escassos. Avro também usado.

### 2.11 Test em embedded

- Unit tests no host (mock hardware).
- HIL (Hardware-In-the-Loop) tests com bench setups.
- Field test em campo real.
- Fuzzing via interfaces.

Cobertura difícil. Pesquisa ativa.

### 2.12 Toolchains

- **C/C++** dominante. Compiler GCC/LLVM cross-compile.
- **Rust** crescendo (embedded-hal, RTIC, embassy). Memory safety vence em embedded.
- **MicroPython / CircuitPython**: Python on MCU. Ok pra prototyping.
- **TinyGo**: Go subset embedded.
- **Zig**: emergente.

IDEs: PlatformIO (popular para multi-platform), STM32CubeIDE, Espressif IDF, Zephyr's west.

#### Embedded Rust em profundidade

Rust embedded ganhou maturidade industrial 2023-2026 (Espressif oficializou Rust em ESP32; Linux kernel aceitando drivers em Rust). Stack típico:

**HAL trait pattern** (`embedded-hal` crate): abstrações **vendor-neutral** sobre periféricos.

```rust
use embedded_hal::digital::OutputPin;
use embedded_hal::i2c::I2c;

// Driver de sensor escrito uma vez, roda em STM32, ESP32, RP2040, nRF52, ...
pub struct DhtSensor<I, P> where I: I2c, P: OutputPin {
    i2c: I,
    power_pin: P,
}
impl<I: I2c, P: OutputPin> DhtSensor<I, P> {
    pub fn read(&mut self) -> Result<f32, Error> { /* ... */ }
}
```

Cada vendor implementa o trait com seu HAL crate (`stm32f4xx-hal`, `esp-hal`, `rp2040-hal`, `nrf-hal`). Driver de aplicação fica portável.

**no_std vs std vs std com allocator custom:**
- **`#![no_std]`**: sem heap, sem stdlib. Defaults pra MCU pequeno (STM32 Cortex-M0, M3). Tudo `&'static` ou stack-allocated.
- **`#![no_std]` + `alloc`**: heap via custom allocator (`linked_list_allocator`, `embedded-alloc`). Permite `Box`, `Vec`, mas você decide tamanho do heap.
- **`std`**: precisa OS abaixo (Linux embarcado, Tock OS). MCUs maiores (Cortex-A) ou embedded Linux.

**Async runtimes em embedded:**

| Runtime | Modelo | Quando |
|---|---|---|
| **embassy** | async/await em `no_std`, executor cooperativo, integra HAL async | Default moderno; HAL async em quase todos vendors em 2026 |
| **RTIC** (Real-Time Interrupt-driven Concurrency) | Static priority scheduling, SoftIRQ-like | Quando timing é crítico (ms determinístico) |
| **Tock OS** | Multiprocesso real, isolation entre apps | Plataforma multi-tenant em embedded (raro) |

Embassy Logística (firmware do tracker do desafio):
```rust
#[embassy_executor::task]
async fn gps_task(mut uart: Uart<'static>) {
    let mut buf = [0u8; 256];
    loop {
        let n = uart.read(&mut buf).await.unwrap();
        // parse NMEA, broadcast position via channel
    }
}

#[embassy_executor::task]
async fn telemetry_task(mut socket: TcpSocket<'static>) {
    Timer::after_secs(30).await;
    // send batched telemetry via MQTT
}
```

**defmt — logging compactado**: serializa logs binários (não strings) → host-side decoder reconstrói. 10-100x menor que `printf`. Crítico em MCU sem console grande.

```rust
defmt::info!("GPS lock: lat={=f32} lng={=f32}", lat, lng);
// transmitido como ~10 bytes vs ~80 bytes em printf
```

**probe-rs — debugger/flasher universal**: substitui OpenOCD + gdb + STLink utility com 1 binário em Rust. `cargo flash --chip STM32F411RETx` ou `cargo embed` (RTT log + flash + reset em 1 comando).

**Quando Rust vs C em 2026:**
- Projeto novo, sem code base C legado: **Rust**. Memory safety + ergonomia + ecosistema maturando.
- Sistema existente em C/C++: incremental — driver novo em Rust, link com FFI. Não rewrite.
- Vendor-locked (proprietary HAL apenas em C): C/C++ até vendor abrir.
- Time sem Rust skill: cuidado, curva de aprendizado em embedded é dupla (linguagem + embedded constraints). 3-6 meses até produtividade.

### 2.13 Filesystem em flash

Flash wear-out (NAND). Filesystem aware:
- **LittleFS** (ARM), power-loss resilient, wear-leveling.
- **SPIFFS** (ESP), older, going away.
- **FATFS** wrapped com wear-leveling layer.

Logs e config persistem; mas evite write-heavy.

### 2.14 Hardware design overview (overview)

Staff IT often interage com firmware/hardware engineers. Vocabulário:
- **PCB**: placa de circuito.
- **MCU package** (QFN, BGA).
- **Power tree**: source → regulators → rails.
- **Bus**: I2C, SPI, UART, CAN.
- **GPIO**: pin config.
- **EMC** (Electromagnetic compatibility): regulatory.
- **DFM** (Design for Manufacturing).

Não substitui EE, but ajuda comunicação.

### 2.15 Connectivity strategy: device-cloud

Direct (device → cloud over MQTT/HTTP) vs via gateway (device → BLE/Zigbee → gateway → cloud).

Trade-off: gateway adds dependência mas reduz cellular cost (1 modem vez de N).

### 2.16 Edge computing

Trabalho em device em vez de cloud. ML inference em MCU (TinyML, TensorFlow Lite Micro). Privacy-preserving (data não sai).

Trade-off: dev complexity vs cloud cost reduzido.

### 2.17 Quando NÃO embedded custom

Default: smartphone como compute + sensors + network. Custom hardware quando:
- Smartphone não tem sensor.
- Custom certified (medical, automotive, industrial).
- Cost/scale (millions of units; smartphone caro).
- Power budget (anos battery; phone não dá).

90% dos casos B2B SaaS, smartphone basta. Don't over-engineer.

### 2.18 Logística IoT scenarios

- **Rastreio com tracker NB-IoT**: device $30-50 cada, bateria meses, ping a cada N minutos.
- **Sensor de temperatura** em transporte refrigerado.
- **BLE beacons** em hubs pra detect courier proximity.
- **OBD-II adapter** pra vehicle telemetry.
- **Smart locker** com lock controlled by mobile app.

Nem todos justificam build próprio; smartphone-app-only sim.

**Cruza com:** **05-02 §2.11** (Capstone B on-device AI — overlap com edge AI em embedded), **02-17 §2.20** (mobile native — patterns que cross-over com edge IoT).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Spectrum MCU vs MPU vs SoC.
- Distinguir bare-metal e RTOS; quando cada.
- Listar restrições de ISR (curto, reentrant, sem blocking).
- Diferenciar BLE / LoRa / NB-IoT / WiFi por range/power/bandwidth.
- Justificar A/B partition pra OTA.
- Listar threats únicos a embedded e defesas.
- Estimar power budget pra device dado sleep ratio.
- Listar QoS levels MQTT.
- Justificar Rust embedded crescendo.
- Argumentar quando smartphone é alternativa válida ao custom hardware.

---

## 4. Desafio de Engenharia

Construir **tracker IoT mínimo** integrado à Logística, opcional simulado em ESP32 dev kit ($10).

**Relação com 05-08 (Hardware Design)**: este desafio cobre o **lado firmware** (MQTT, sleep, OTA, buffer, telemetry). O desafio do 05-08 cobre o **lado hardware** do mesmo dispositivo (schematic + PCB + BOM + manufacturing files). Use **MCU e sensors consistentes** entre os dois (ESP32 + GPS NEO-6M + DHT22 é uma escolha viável que aparece em ambos os módulos). Se você está fazendo o eixo embedded/hardware completo (track A/B do CAPSTONE-amplitude com foco IoT), o output integrado é firmware-em-PCB-custom validado por bring-up real.

### Especificação

**Hardware** (escolha 1 path):
- **Path A, Simulado**: usa ESP32 dev kit + sensors básicos. Compre ($30 total), monte.
- **Path B, Pure simulation**: emulador QEMU + dummy sensors. Sem hardware físico.

1. **Firmware (Rust embedded ou C com FreeRTOS)**:
   - Lê GPS (fake em sim, real-ish em ESP32 + módulo NEO-6M).
   - Reads temp sensor (DHT22 ou simulated).
   - Sleep majority of time; wake every 30s.
   - Send via MQTT (em WiFi ou simulated NB-IoT).
   - Local buffer em SPIFFS/LittleFS pra reconnect.
2. **Backend integração**:
   - MQTT broker (Mosquitto local).
   - Service Node consome topics, persiste em Postgres (`iot_pings`).
   - Forward pra Logística existing tracking system.
3. **OTA mechanism (Path A)**:
   - Backend serve firmware blob.
   - Device fetch + verify signature + flash partition B + reboot.
4. **Security**:
   - Per-device cert / key (signed by CA).
   - TLS to broker.
   - Firmware signed.
5. **Telemetry**:
   - Battery voltage reported.
   - Buffer overflow events reported.
   - Heartbeat alert if missed > N minutos.
6. **Power profiling**:
   - Document estimated battery life sob different ping intervals.
7. **Doc** `EMBEDDED-DECISIONS.md`:
   - Por que escolheu MCU / RTOS / linguagem.
   - Network choice trade-offs.
   - OTA strategy.
   - Security posture.

### Restrições

- Sleep dominant, tempo awake < 10%.
- Buffered local quando offline.
- Idempotent insert no backend (event_id).
- Signed firmware.

### Threshold

- Path A: device físico funcionando, OTA testado.
- Path B: simulação completa com mesmas garantias logical.
- 24h soak test sem crashes.

### Stretch

- **TinyML**: pequena rede roda no MCU (gesto, anomaly detection).
- **BLE peripheral mode**: device exposto para mobile app pair.
- **Mesh** Zigbee/Thread entre devices.
- **Power harvesting**: solar com supercap.
- **Real cellular**: NB-IoT module integrado, contrato com provider IoT (Hologram, Soracom).

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): kernel concepts em RTOS.
- Liga com **01-03** (networking): protocolos custom, NAT.
- Liga com **01-11** (concurrency): scheduling em RTOS.
- Liga com **01-12** (crypto): secure boot, signatures.
- Liga com **02-14** (real-time): pings + WebSocket fanout.
- Liga com **03-11** (Rust): embedded Rust.
- Liga com **03-13** (time-series): destination dos pings.
- Liga com **04-04** (resilience): retry, backpressure.
- Liga com **CAPSTONE-amplitude**: track de specialization opcional.

---

## 6. Referências

- **"Making Embedded Systems"**: Elecia White.
- **"Embedded Software Engineering 101"**: Christoph Schmidt-Dwertmann.
- **FreeRTOS docs**.
- **Zephyr docs**.
- **"Programming Embedded Systems in C and C++"**: Michael Barr.
- **"The Rust Embedded Book"** ([rust-embedded.github.io](https://rust-embedded.github.io/)).
- **"Linux Kernel Development"**: Robert Love.
- **MQTT spec v5**.
- **LoRaWAN spec**.
- **"TinyML"**: Pete Warden, Daniel Situnayake.
- **Espressif IDF docs** (ESP32).
- **Hackaday + Hackster.io** community.
