---
module: 05-08
title: Hardware Design Fundamentals, PCB, Schematics, Chip-Level, FPGA
stage: amplitude
prereqs: [05-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual e a funcao do decoupling capacitor proximo a cada IC?"
    options:
      - "Aumentar voltage de operacao do chip"
      - "Absorver transients e estabilizar power local"
      - "Filtrar sinais de comunicacao I2C"
      - "Reduzir custo do BOM"
    correct: 1
    explanation: "Decoupling caps (100nF + 1uF + 10uF) proximos ao chip absorvem transients de corrente. Sem decoupling, system reboots aleatoriamente sob carga."
  - q: "Qual e o trade-off principal entre LDO e switching regulator (buck/boost)?"
    options:
      - "LDO e digital; switching e analogico"
      - "LDO e linear (simples, dissipa calor); switching e eficiente mas complexo"
      - "LDO suporta corrente maior universalmente"
      - "Switching nao funciona em baixas voltagens"
    correct: 1
    explanation: "LDO (Low-Dropout) e linear: simples, mas dissipa calor (eficiencia baixa). Switching (buck/boost) e eficiente mas complexo (ripple, noise, components extras)."
  - q: "Em PCB high-speed (>50 MHz), qual regra rege spacing entre traces para evitar crosstalk?"
    options:
      - "1W rule (1x trace width)"
      - "3W rule (3x trace width)"
      - "10W rule (10x trace width)"
      - "Sem rule; spacing nao afeta crosstalk"
    correct: 1
    explanation: "3W rule recomenda spacing de 3x trace width entre traces para minimizar crosstalk em high-speed. Outras: impedance matching 50/100ohm, length matching para differential pairs."
  - q: "Qual e o primeiro passo no bring-up day playbook ANTES de ligar o PCB?"
    options:
      - "Programar firmware via JTAG"
      - "Visual + multimetro continuidade VCC<->GND deve ser circuito aberto"
      - "Conectar todas antenas para teste RF"
      - "Aplicar rated voltage direto da bench supply"
    correct: 1
    explanation: "Pre-power inspection: visual (solder bridges, missing components, wrong orientation) + multimetro continuidade VCC<->GND (>10kohm). Ligar com short queima MCU em segundos."
  - q: "Qual estrategia de cost reduction tipicamente NAO funciona sem analise cuidadosa?"
    options:
      - "Sole source elimination"
      - "Layer reduction (4 -> 2 layers)"
      - "Volume discount via PCBA partner"
      - "Eliminar todos os decoupling caps para economizar"
    correct: 3
    explanation: "Eliminar decoupling caps causa instability sob carga. Patterns validos: DFM desde inicio, sole source elimination, cheaper alternatives, layer reduction, volume discount, panelization."
---

# 05-08, Hardware Design Fundamentals (Optional)

## 1. Problema de Engenharia

05-07 cobriu firmware (software rodando em microcontroller). Mas Logística pode crescer pra criar **hardware próprio**: tracker custom com sensores específicos, leitor de barcode integrado, smart locker, beacon BLE proprietary. Aí entra hardware design: schematics, PCB layout, BOM, manufacturing.

Software engineer raramente vira hardware engineer full-time. Mas Senior+ que **fala a linguagem** de hardware engineer multiplica capacidade do time. Saber ler schematic é como saber ler SQL: você não precisa escrever, mas precisa entender o que outra pessoa fez. Senior conhece power delivery, decoupling, signal integrity, EMC, DFM enough pra colaborar com EE sem virar gargalo.

Este módulo é **opcional, especialty**. Faz se Logística (ou empresa-alvo) tem hardware real, ou se você quer abrir-se a robotics/IoT/embedded futures. Para 95% das trajetórias software-only, é skip seguro.

Cobertura: schematic literacy, PCB design fundamentals, BOM e sourcing, manufacturing flow (DFM, JTAG, ICT), power tree, signal integrity (alta velocidade), EMC, FPGA/ASIC overview, ferramentas (KiCad, Altium, OrCAD), tracker IoT design fim-a-fim.

---

## 2. Teoria Hard

### 2.1 Schematic literacy

Schematic = diagrama lógico do circuito. Símbolos:
- Resistores (zigzag ou retângulo IEC), capacitores (linhas paralelas), inductors.
- Diodes, transistors (BJT, MOSFET).
- IC blocks (chip = caixa retangular com pinos numerados).
- Power rails (VCC, VDD, GND).
- Connectors.

Linhas = nets (fios elétricos). Junções com bolinha; cruzes sem bolinha = não conectadas. Labels (PWR, RX, MOSI) substituem fios físicos quando schematic fica denso.

Saiba ler datasheet de chip: pinout, electrical characteristics, application circuit. Datasheets de Texas Instruments, Microchip, STMicro, NXP são modelo.

### 2.2 PCB layout fundamentals

PCB = Printed Circuit Board. Camadas (layers) de cobre + insulator FR-4. Common: 2-layer, 4-layer, 6-layer.

Workflow:
1. **Schematic** finalizado.
2. **Net list** gerada.
3. **Component placement** em PCB.
4. **Routing** (traços conectam pads).
5. **Design Rule Check (DRC)**: validações eletrônicas + mecânicas.
6. **Gerber files** geradas → fabricação.
7. **Pick-and-place** files → assembly.

Trade-offs principais:
- Trace width × current capacity.
- Trace width × impedance (controlled em high-speed).
- Layer stackup × signal integrity.
- Component orientation × pick-and-place yield.

### 2.3 Power tree e decoupling

Cada chip precisa power estável. Power delivery:
- **VRM** (Voltage Regulator Module): converte input → rail.
- **LDO** (Low-Dropout Regulator): linear, simples, dissipa calor.
- **Buck / Boost / Buck-Boost**: switching, eficiente.
- **Decoupling capacitors**: 100nF + 1uF + 10uF próximos a cada chip pra absorver transients.

Power tree document mostra all rails, regulator topology, current budget, droop sob load. Sem isso, system reboots aleatoriamente sob carga.

Ground plane: solid copper layer reduz noise. Não corte com traços densos.

### 2.4 Signal integrity (high-speed)

Sinais > 50 MHz começam a ter comportamento de transmission line (refletex, ringing, crosstalk).

Topics:
- **Impedance matching**: 50Ω single-ended, 100Ω differential default.
- **Termination**: series, parallel.
- **Length matching**: differential pairs com mesma length; rotas com same delay.
- **Stackup**: thickness de dielectric afeta impedance.
- **Crosstalk**: spacing 3W rule (3x trace width).
- **Vias**: descontinuidades; minimize em high-speed.

USB 3, HDMI, PCIe, DDR têm specs estritos. Tools: Hyperlynx, Ansys SIwave.

### 2.5 EMC (Electromagnetic Compatibility)

Regulamentação: FCC (US), CE (EU), Anatel (BR). Compliance obrigatório pra venda.

Tests:
- **Emissions**: aparelho não deve emitir RF além de limite.
- **Immunity**: aparelho continua funcionando sob ESD, surge, RF externo.

Mitigations design-time:
- Solid ground planes.
- Filtering (ferrite beads, common-mode chokes).
- Shielding (metal can sobre crystal, oscilator).
- Cable design (twisted pair, shielded).
- Distance entre clock e antenna.

Falha em EMC test = redesign caro. Hardware engineer experiente prevê.

### 2.6 BOM e sourcing

BOM (Bill of Materials): lista de componentes com part numbers, quantities, manufacturers, distributors.

- **Avoid sole source** (1 manufacturer): risk supply chain.
- **Lifecycle**: parts marcadas EOL (End of Life) viram problema.
- **Lead times**: chips popular em high-demand period (chip shortage 2020-22 mostrou).
- **Alternatives**: 2-3 substitutes sempre.

Distributors: Digi-Key, Mouser, LCSC, Octopart aggregator. Per-unit cost cai com volume.

PCBA partner (PCB + assembly): JLCPCB, PCBWay (China low-cost), Sierra Circuits, Bittele (premium).

### 2.7 DFM (Design For Manufacturing)

PCB que monta sem yield issue:
- Component orientation consistente (orientation marks).
- Adequate spacing pra placement machines.
- Pads cobertos pra hot air rework.
- No tiny chip-on-edge.
- Test points acessíveis.
- Polarity marks claras.
- Fiducial marks pra alignment.

Failures DFM = baixo yield = high cost.

### 2.8 Test e bring-up

Após PCB chega:
- **Visual inspection**: solder joints, components.
- **Power-up devagar** com bench supply current-limited.
- **Smoke test**: 5min, monitor calor, current draw.
- **Programming**: bootloader / firmware via JTAG, SWD, ISP.
- **ICT** (In-Circuit Test): probes em test points.
- **Functional test**: end-to-end (sensores, comm, display).

Bring-up de protótipo é onde firmware (05-07) e hardware se encontram. Conhecer ambos lados acelera.

### 2.9 Common interfaces / buses

- **GPIO**: digital in/out simples.
- **I2C**: 2-wire, multi-slave, ≤ 1 MHz típico.
- **SPI**: 4-wire, faster, master/slave.
- **UART**: serial assíncrono, simples.
- **CAN**: automotive, robusto, multi-master.
- **USB**: 1.1 / 2.0 / 3.x / Type-C com PD.
- **Ethernet**: physical (PHY) + MAC.
- **RS-485**: serial industrial.

Cada um tem protocol layers, pinout, levels (3.3V, 5V, 12V), termination. Mismatch destrói.

### 2.10 FPGA overview

FPGA (Field-Programmable Gate Array): hardware reconfigurable. Define circuito via HDL (Verilog, VHDL, SystemVerilog) ou high-level synthesis (Vitis HLS, Chisel).

Casos: prototyping ASIC, SDR (software-defined radio), custom accel, real-time signal processing, robotics.

Vendors: Xilinx (AMD), Intel/Altera, Lattice, Microchip.

Tools open-source recentes: Yosys, Nextpnr (icestorm pra Lattice).

Pra Staff: vocabulário base. Implementação real exige RTL design discipline.

### 2.11 ASIC overview

ASIC (Application-Specific Integrated Circuit): chip custom. Massive NRE (non-recurring engineering, $1M+) compensado por volume.

Process node (7nm, 3nm) define density e power. Foundries: TSMC, Samsung, Intel, GlobalFoundries.

Open-source ASIC chegando: Skywater PDK 130nm + Caravel + OpenLane (Efabless). $0 a $10k pra tape-out experimental.

Pra software engineer: vocabulário pra entender por que chips levam anos e custam fortunas. Design 12-24 meses; tape-out months wait.

### 2.12 Ferramentas

- **KiCad** (open source, free): schematic + PCB. Production-grade hoje.
- **Altium Designer** (proprietary): industry standard. Caro.
- **OrCAD / Allegro** (Cadence): legacy + high-end.
- **Eagle / Fusion 360 Electronics**: Autodesk.
- **EasyEDA**: web-based, integrated com JLCPCB.
- **OrCAD AMS / SPICE**: simulation analógica.
- **LTspice**: free SPICE simulator.

Output: Gerber, Excellon drill, BOM CSV, pick-and-place CSV. Standard files entendidos por todos PCBA partners.

### 2.13 Mechanical e enclosure

PCB raramente vive nu. Enclosure:
- **3D printed**: fast prototyping, low volume.
- **Injection molded**: high volume, hight setup cost.
- **Sheet metal**: industrial, robust.
- **Off-the-shelf** plastic boxes (Hammond).

Mechanical CAD: Fusion 360, SolidWorks, OnShape (free pra individual). STEP files exchange.

PCB outline e mounting holes coordenados com enclosure design.

### 2.14 Certifications

Pra venda comercial:
- **FCC ID** (US): emissions + intentional radiator (radio).
- **CE Marking** (EU): EMC + LVD + RoHS.
- **Anatel** (BR): para qualquer rádio (BLE, WiFi, cellular).
- **UL** (safety, US): para products com power supply.
- **RoHS / WEEE / REACH**: substâncias proibidas.
- **IP rating** (IP67 etc): water/dust resistance.

Pre-compliance test em laboratório próprio (poor-man's): Spectrum analyzer + LISN. Real cert via lab credenciado: $5k-$50k típico.

### 2.15 Lifecycle de hardware

- **Concept** → schematic.
- **Prototype rev A**: erros aprendidos.
- **Rev B**: corrige.
- **Rev C / production**: ready.
- **Pilot run**: 100-1000 units pra validate manufacturing.
- **Mass production**: scaling.
- **Sustaining engineering**: bug fixes, cost reduction.
- **EOL**: lifetime buy de critical parts.

Cada rev demora semanas (PCB lead time + assembly + bring-up). Hardware **lento** comparado a software.

### 2.16 Cost reduction patterns

- **DFM** desde início.
- **Sole source elimination**.
- **Cheaper alternative** components.
- **Layer reduction** (4 → 2 layers).
- **Volume discount**.
- **Panelization** (múltiplas PCBs em mesmo painel).
- **Test reduction** (skip what's redundant).

Cost-down cycles em devices em produção.

### 2.17 Hardware-software co-design

Arquitetura otimizada considera ambos lados:
- HW provê hardware accelerator (RNG, hash, crypto, FFT).
- SW exposes APIs.
- Joint security: secure element + secure boot + signed firmware.
- Joint power: SW puts CPU em sleep; HW wake-up por GPIO/timer.

Staff cross-domain (firmware + cloud + HW) é raro e valuable.

### 2.18 Logística IoT design fim-a-fim

Tracker custom GPS + cellular:
- ARM Cortex-M4 (STM32 ou ESP32-04-03).
- GPS module (u-blox NEO-M9N).
- Cellular module (Quectel BG95 NB-IoT).
- LiPo battery + protection IC + charger (TP4056).
- Boost converter pra LDO pra 3.3V.
- Antenna passive pra GPS, active pra cell.
- Push button + LED indicator.
- USB-C pra charging + debug (CDC).
- Enclosure injection-molded IP67.

BOM ~$30-50 em volume 1000+. Cert FCC/Anatel/CE = + $30k. Volume pra retorno: 1000 units min.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Ler schematic simples (3-5 ICs) e identificar power, GND, comm buses.
- Justificar decoupling cap próximo a chip.
- Diferenciar LDO e switching regulator; trade-off.
- Listar 4 considerações de signal integrity em > 100 MHz.
- Listar 3 mitigations EMC design-time.
- Justificar BOM com sole-source elimination.
- Listar 4 itens de DFM.
- Estimar lead time de PCB protótipo (concept → bring-up).
- Diferenciar FPGA e ASIC.
- Diferenciar I2C e SPI; quando cada.
- Listar 4 certifications obrigatórias pra venda B2C.
- Estimar cost de tracker IoT em volume 1000.

---

## 4. Desafio de Engenharia

**Desenhar tracker IoT da Logística end-to-end** em KiCad + iniciar fabricação real (ou parar antes de spend $100).

### Especificação

1. **Schematic** (KiCad):
   - MCU (STM32L4 ou ESP32).
   - GPS module (NEO-M9N, breakout ok).
   - Cellular module (NB-IoT), ou WiFi se cell module fora de escopo.
   - LiPo battery management.
   - Power tree: charger + boost + LDO.
   - USB-C pra power + CDC debug.
   - LED + button.
   - Test points em rails críticos.
2. **PCB layout** (KiCad):
   - 2-layer ou 4-layer (justifique).
   - Footprint ≤ 60x40mm.
   - Antennas com clearance.
   - Solid GND plane.
   - DRC clean.
3. **BOM**:
   - Part numbers manufacturer + Mouser/Digi-Key/LCSC.
   - Substitutes pra cada (mínimo 1).
   - Cost @ qty 100 + qty 1000.
4. **3D model** + enclosure mock:
   - Outline preview em Fusion 360 ou Onshape.
   - Mock IP67 box ou aprox.
5. **Manufacturing files**:
   - Gerber + drill + pick-and-place + BOM CSV.
   - Quote em JLCPCB ou PCBWay (assembly turnkey).
6. **Plan de bring-up** (playbook detalhado abaixo):
   - Test plan: sequence smoke test → power up → JTAG → firmware load → GPS lock → cell registration.
   - Risks identificados, contingências documentadas.

**Bring-up day playbook** (sequência para ordem de magnitude correta de descoberta de bugs — não pule etapas):

1. **Pre-power inspection** (10 min):
   - Visual: solder bridges, missing components, wrong orientation (chips, electrolytics, diodes).
   - Multímetro continuidade: VCC ↔ GND **deve ser circuito aberto** (>10kΩ). Se for short, NÃO ligue. Achar short antes custa 30s; ligar com short queima MCU em segundos.
   - Verificar polaridade de conectores (USB, JTAG, battery).

2. **Power-up isolado** (15 min):
   - Bench power supply com **current limit em ~100mA** primeiro. Se draw > expected (datasheet típico < 50mA quiescent), tem short ou pino flutuando.
   - Mede VCC em test points: regulators OK? Ripple < 50mV?
   - Mede VCC nos pinos de cada IC: presente em todos? Decoupling caps fazem job?
   - Se algo aquece > 60°C, KILL POWER. Componente errado, polaridade invertida, ou short.

3. **Programming interface** (15 min):
   - JTAG/SWD via probe-rs ou ST-Link: `probe-rs list` deve mostrar device.
   - Read MCU ID register: confirma que MCU vivo + comunica.
   - Erase flash (sanity), program "blink LED" minimal firmware. Se LED pisca = clock + GPIO + power tudo OK.
   - Failure aqui é 60% do tempo: clock external crystal não oscila (capacitores carga errados), reset pin float, BOOT pins erradas.

4. **Periférico por periférico** (30-60 min cada):
   - **Não ligue tudo de uma vez**. Bring up: GPIO → UART → I2C/SPI → timers → ADC → conectividade.
   - Para cada periférico: scope ou logic analyzer no fio antes de acreditar em qualquer log. Vê signal forma de onda? Trabalha em right voltage levels (3.3V vs 5V vs 1.8V mismatches comem horas)?
   - I2C silent? Pull-ups presentes (4.7kΩ típico)? Address correto (varia por vendor; manda `i2cdetect`)?

5. **Connectivity stack** (1-2h):
   - GPS: cold start até primeiro lock pode ser 30s-15min em céu aberto. Indoor = no fix, planeje teste outdoor.
   - Cellular (NB-IoT/LTE-M): SIM ativada? APN correto? Carrier provisioning? Antena com clearance suficiente (3-5cm de plano metálico)?
   - WiFi: regulatory domain? Chip frequencies certified for region?

6. **Soak test** (24h):
   - Firmware completo, scenario realista, log everything via defmt/RTT.
   - Power consumption profile: corresponde ao calculado? Sleep current < 100µA esperado?
   - Erros silenciosos: counters de retries, watchdog resets, malloc failures.

**Common failures e diagnóstico:**

| Sintoma | Causa típica | Tempo médio até fix |
|---|---|---|
| MCU não enumera em USB/SWD | Clock crystal sem oscilar (caps wrong), boot pins erradas | 1-3h |
| Sensor I2C "presente" mas data lixo | Endianness, scale factor, init sequence missing | 30min-2h |
| GPS sem lock indoor | Esperado; precisa outdoor ou patch antenna externa | n/a (test plan issue) |
| Cell modem timeout em registration | APN, SIM não ativada, sinal fraco | 1-4h (SIM + RF debug) |
| Battery dura 1/10 do esperado | Sleep state errado (peripheral não suspended), I2C pulldown drenando | 4-8h debug power profiling |
| Random reset após N horas | Brownout (power supply marginal), watchdog config errada, stack overflow | 2-3 dias intermitente |

**Skills críticos não-óbvios** que separam alguém que faz bring-up rápido de quem fica preso:
- Ler datasheet de ponta a ponta (250+ páginas) — não pular pra "pinout".
- Scope/logic analyzer skill: tipicamente 1 semana de prática reverter saber de "ler waveforms".
- Saber usar uma loupe (10x) pra inspecionar solder.
- Hot air rework: dessoldar + ressoldar componente errado em 5 min vs 30 min com soldering iron.
- Multímetro mode certo (continuity, diode, resistance, voltage) na hora certa.

Senior em hardware tem isso como tacit knowledge. Se você está aprendendo, espere bring-up de protótipo simples levar **1-3 dias inteiros** primeira vez; **4-8 horas** quando experiente.
7. **Doc** `HARDWARE-DECISIONS.md`:
   - MCU choice rationale.
   - Power topology.
   - Antenna decisions.
   - Cost analysis.
   - Cert path.

**Stop-loss**: este é desafio pedagógico. Ordering protótipo (~$50-100) é stretch. Schematic + PCB design + quote já satisfazem threshold. Se não quer gastar, pare antes de fab.

**Integração explícita com 05-07**: este PCB é o hardware onde **roda o firmware do desafio 05-07**. Use o **mesmo MCU e sensors** escolhidos lá (ESP32 + GPS NEO-6M + DHT22, ou STM32L4 + módulo equivalente). 05-07 e 05-08 não são desafios redundantes; são **dois lados do mesmo dispositivo**:
- 05-07 (firmware): MQTT + sleep + OTA + buffer offline + telemetry. Roda em dev kit ou simulado.
- 05-08 (hardware): schematic + PCB layout + BOM + manufacturing files do dispositivo final.

Se você fez 05-07 com Path A (ESP32 dev kit), este PCB é a evolução: mesmo MCU, mesmas APIs, mas placa custom com power management adequado, antenas com clearance, footprint compacto. Bring-up do PCB rev A em 05-08 stretch valida o firmware 05-07 no hardware real — esse é o ciclo completo de specialization em embedded/hardware.

### Restrições

- Sem clone de design existente; design seu (referenciar app circuits de datasheets ok).
- DRC clean.
- Decoupling em todo IC.
- BOM com substitutes.
- Doc de decisions.

### Threshold

- Schematic + PCB layout completos com DRC clean.
- BOM CSV.
- Quote real obtido de PCBA partner.
- Doc decisions explicado.

### Stretch

- **Order PCB rev A** ($50-150). Bring-up real. Document failures.
- **Firmware skeleton** integrado com 05-07 implementation.
- **EMC pre-compliance** test caseiro.
- **Enclosure 3D-printed** prototipo.
- **Pitch deck** pra hipotético produto interno.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): bare metal, drivers, syscalls em microkernel.
- Liga com **01-14** (CPU microarchitecture): conhecimento sobe ao nível ASIC/SoC design.
- Liga com **01-12** (cripto): secure element, hardware security.
- Liga com **05-07** (embedded): firmware roda neste hardware.
- Liga com **CAPSTONE-amplitude** track A/B/G: opção pra eixo IoT/hardware/robotics.

---

## 6. Referências

- **"The Art of Electronics"**: Horowitz, Hill (3rd ed). Bíblia.
- **"PCB Design for Real-World EMI Control"**: Bruce Archambeault.
- **"High-Speed Digital Design"**: Howard Johnson, Martin Graham.
- **"Practical Electronics for Inventors"**: Paul Scherz.
- **KiCad docs** ([kicad.org/help](https://www.kicad.org/help/)).
- **EEVblog** (Dave Jones), YouTube + forum.
- **Phil's Lab**: YouTube, design sessions práticos.
- **Texas Instruments / Microchip / STMicro datasheets + app notes**.
- **Sparkfun / Adafruit tutorials**: accessible intro.
- **"Open Circuits"**: Eric Schlaepfer, Windell Oskay (foto-essays de chip teardowns).
- **Hackaday**: community, projects.
- **Skywater PDK + Efabless**: open-source ASIC.
- **Ben Eater's videos**: 8-bit computer from scratch.
