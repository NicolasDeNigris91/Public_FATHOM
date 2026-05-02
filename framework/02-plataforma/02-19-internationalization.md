---
module: 02-19
title: Internationalization & Localization, Unicode, ICU, Pluralization, RTL, Timezones
stage: plataforma
prereqs: [02-01, 02-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-19, Internationalization & Localization (i18n / l10n)

## 1. Problema de Engenharia

Software global. Logística pode crescer pra Brasil + México + EU em poucos anos. Mas i18n quase sempre é **after-thought**: dev escreve `"You have ${n} orders"` hardcoded em English; PR aprova; meses depois, time inteiro reescreve telas pra suportar pt-BR/es-MX/de-DE/he-IL/ar-SA. Custa 2-5x mais que ter feito desde o início.

i18n não é "tradução do front-end". Inclui: Unicode correctness (UTF-8/16, normalization, combining chars, emoji), pluralization (10+ regras em russo, polonês, árabe), gender-aware messages, number/currency/date format por locale, timezone math, RTL layouts, fonts com glyphs corretos, sorting/search com collation, input methods, certificados e regulamentação por país (LGPD, GDPR, CCPA), tax calc por região (já em 02-18), nomes pessoais cross-cultural (não há "first name + last name" universal), endereços com formatos divergentes.

Este módulo é o ofício de produzir software que não quebra no segundo locale: Unicode profundo, ICU MessageFormat, biblioteca i18n moderna (FormatJS, i18next, Lingui), Intl APIs do browser, RTL com CSS logical properties, locale-aware sorting, timezone correto (sempre UTC + tz id), e l10n process (translation memory, glossary, contractor workflow).

---

## 2. Teoria Hard

### 2.1 Unicode

Charset universal (1.1M code points, 150k assigned). Encodings:
- **UTF-8**: variable 1-4 bytes. ASCII compat. Default web/Linux.
- **UTF-16**: variable 2/4 bytes. Default Java, JS strings, Windows.
- **UTF-32**: fixed 4 bytes. Raro, fácil indexar.

**Code point** ≠ **grapheme cluster**. "é" pode ser 1 code point (precomposed) ou 2 (e + combining acute). Família emoji `👨‍👩‍👧` é 1 grapheme com 5 code points.

`str.length` em JS conta UTF-16 code units. **Errado** pra emoji + accents. Use `Intl.Segmenter` (modern) ou `grapheme-splitter` lib.

### 2.2 Normalization

Same string aparente, bytes diferentes. Forms:
- **NFC**: composed (`é` precomposto).
- **NFD**: decomposed (`e` + combining).
- **NFKC, NFKD**: compatibility (transformações como ﬁ → fi).

Comparação requer normalização. `str.normalize('NFC')`. Bug clássico: usuário cadastra "café" (NFD), login compara com "café" (NFC), mismatch silencioso.

### 2.3 Collation

Sort cultural-aware. "ç" em Português < "z"; em Castellano antigo, "ñ" tinha posição própria.

`String.localeCompare(b, locale, opts)` ou `Intl.Collator(locale, opts)`. Opts:
- `sensitivity`: 'base'/'accent'/'case'/'variant'.
- `numeric: true`: "10" > "2" como números.

Postgres collation: schemas, índices baseados. Trocar collation pode invalidar índice, caso real causando incidents.

### 2.4 Pluralization

English: 0/1 vs N+. Russian: 1, 2-4, 5+. Polish: 1, 2-4, 5+ except 22-24, 25-29 different. Árabe: 6 categorias (zero, one, two, few, many, other).

ICU CLDR define regras. Use:
```js
new Intl.PluralRules('pl').select(5);  // → 'many'
```

Frameworks: ICU MessageFormat, FormatJS, i18next, Lingui.

```
{n, plural,
  =0 {Sem pedidos}
  one {Um pedido}
  other {# pedidos}
}
```

### 2.5 Gender e select

ICU `select`:
```
{gender, select,
  female {Ela viu seu perfil}
  male {Ele viu seu perfil}
  other {Visualizaram seu perfil}
}
```

Cross-language: em Português, gender afeta artigo/adjetivo. Em English, raramente. Regras divergem.

### 2.6 Number, currency, date format

`Intl.NumberFormat`:
- `1234.5` → en-US: `1,234.5`; pt-BR: `1.234,5`; de-DE: `1.234,5`; fr-FR: `1 234,5`; ar-EG: `١٬٢٣٤٫٥` (não-Latin digits).

Currency:
- `$1,234.50` (en-US) vs `R$ 1.234,50` (pt-BR) vs `1 234,50 €` (fr-FR) vs `€1.234,50` (de-DE).
- `Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})`.

Dates:
- `new Intl.DateTimeFormat('ja-JP', {dateStyle: 'long'}).format(d)` → "2026年4月28日".
- 12h vs 24h, week start, calendar systems (Gregorian, Buddhist, Hijri).

### 2.7 Timezones

UTC sempre. Persist UTC. Display in user tz.

Tz id (IANA): `America/Sao_Paulo`. **NÃO** offset (`-03:00`); offset muda com DST.

`Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo'})`.

Libs: `date-fns-tz`, `dayjs-timezone`, `Luxon`. JS native `Temporal` API (chegando, parcial).

DST: Brasil **não** tem desde 2019. Ainda assim, world has. Calculation com horário "futuro" envolve atualizações IANA tzdata. Mantenha tzdata atualizado (geralmente 2-4 releases/ano).

Common bugs:
- Offset hard-coded.
- Server e DB em tz diferente.
- "tomorrow at noon" calculado em UTC vs user-tz.

#### Edge cases que mordem em produção

- **Half-hour / quarter-hour timezones**: India `Asia/Kolkata` UTC+5:30; Iran `Asia/Tehran` UTC+3:30; Nepal `Asia/Kathmandu` UTC+5:45; Australian Central UTC+9:30. Filters como `WHERE EXTRACT(HOUR FROM ts) = 9` quebram. Use `EXTRACT(EPOCH FROM ts) / 60` quando precisa precisão sub-hora.
- **DST transition: spring forward**: 2:30 AM no Brasil em 2019 não existia. `DateTime("2019-11-03 02:30 America/Sao_Paulo")` → ambíguo, libs típicas pulam pra 3:30 ou rejeitam. **Schedule de courier** marcado pra esse minuto: bug silencioso.
- **DST transition: fall back**: 1:30 AM aconteceu **duas vezes**. Audit log com timestamp local sem offset = ordering ambíguo. Persist UTC SEMPRE.
- **DST policy mudando**: Brasil aboliu em 2019; Russia em 2014; Mexico em 2022. tzdata atualiza; build cacheado em container velho fica errado. Pin `tzdata >= 2025b` em Dockerfile + audit anual.
- **Tz não-existentes**: `Africa/Asmera` é alias de `Africa/Asmara`; `US/Pacific` é alias de `America/Los_Angeles`. Use canônico; aliases somem em IANA updates.
- **Cron em UTC vs local**: K8s CronJob roda em UTC; PostgreSQL `pg_cron` roda em DB tz. "Backup às 3 AM Brasília" requer cuidado.
- **Recurring events**: "todo domingo às 9 AM" — em UTC ou em local user tz? Se persiste UTC e user move pra outro tz, evento move junto. Persist as `(rrule_text, tz_id)` separados; gera ocorrências on-the-fly.
- **Date-only vs timestamp**: birthday do user é `1990-05-15` (sem tz). Não converta pra UTC midnight; perde 1 dia em half-tz. Use type `date` puro.

```typescript
// Padrão sano com Luxon
import { DateTime } from 'luxon';

// Persist UTC sempre
const persistedAt = DateTime.now().toUTC().toISO();

// Display em tz do user
const display = DateTime.fromISO(persistedAt, { zone: 'utc' })
  .setZone(user.tz)
  .toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY, { locale: user.locale });

// "Tomorrow at 9 AM in user tz" — converte pra UTC pra schedule
const scheduleAt = DateTime.now().setZone(user.tz)
  .plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0 })
  .toUTC().toISO();

// DST safety check: se ambíguo, escolha early
const ambiguous = DateTime.fromISO('2025-11-02T01:30', { zone: 'America/New_York' });
if (!ambiguous.isValid) throw new Error('Ambiguous local time during DST transition');
```

`Temporal` API (TC39 Stage 3, 2026): supersedes Luxon na padronização; `Temporal.ZonedDateTime`, `Temporal.PlainDate`, `Temporal.Duration`. Polyfill estável; rollout nativo browser-by-browser.

### 2.8 Strings em código vs templates

**Anti-pattern**: `"You have " + n + " orders"`. Concatena gramática.

**Pattern**: chave + ICU template.
```js
t('orders.count', { count: n });
```

Locales:
```json
// en
{"orders.count": "You have {count, plural, =0 {no orders} one {one order} other {# orders}}"}
// pt-BR
{"orders.count": "Você {count, plural, =0 {não tem pedidos} one {tem um pedido} other {tem # pedidos}}"}
```

### 2.9 Bidi (RTL e LTR)

Árabe, hebraico, persa, urdu são RTL. Layout inverte.

CSS logical properties:
- `margin-inline-start` em vez de `margin-left`.
- `text-align: start` em vez de `left`.
- `padding-inline-end`.
- `border-inline-start`.

`dir="rtl"` em html. Browser flips layout. Imagens direcionais (setas, ícones de "voltar") precisam mirror.

### 2.10 Fonts e scripts

Não-Latin scripts: Cyrillic (russo), Greek, CJK (Chinese/Japanese/Korean), Arabic, Hebrew, Devanagari (hindi), Thai, etc.

System fonts: cobrem só subset. Custom font precisa coverage. Google Fonts, Noto family ("no tofu"; cobertura ampla), Source Sans/Han.

CJK = renders pesados. Use subsetting + variable fonts.

Emoji: cada plataforma renders diferente. Twemoji (Twitter), Noto Color Emoji.

### 2.11 Input methods (IME)

Chinese/Japanese/Korean usam IME (Input Method Editor): user digita romaji/pinyin, sugere candidates, confirma. UI deve **não** processar `keydown` durante composition (use `compositionstart`/`compositionend`).

Bug clássico: search-as-you-type dispara em cada keydown durante IME composition, query incompleta vai pro backend.

### 2.12 Search e collation em DB

Postgres: `CREATE COLLATION pt_BR (locale = 'pt_BR.UTF-8')`. Diferença em sorting/comparison.

`pg_trgm` para fuzzy. **Unaccent** extension pra search ignorando acentos: `unaccent('café') = 'cafe'`.

Elasticsearch / Meilisearch (02-15): tokenizer + stemmer language-aware. RSLP (português) ≠ Snowball English.

### 2.13 Currency, FX e money

Já em 02-18, recall:
- bigint cents.
- ISO 4217 currency codes.
- FX rates daily.
- Locale-aware display.

Edge: zero-decimal currencies (JPY, KRW). 100 yen é 100, não 1.00.

Stripe / PSPs lidam minor units: 100 USD = 10000 cents; 100 JPY = 100 (no decimals).

#### Currency precision por ISO 4217 — pegadinhas reais

| Tipo | Exponent | Exemplos | Minor unit pra 1 unit |
|---|---|---|---|
| **Zero-decimal** | 0 | JPY, KRW, VND, CLP, ISK, UGX | 1 yen = 1 |
| **Two-decimal** (default) | 2 | USD, EUR, BRL, GBP, CAD | 1 dollar = 100 cents |
| **Three-decimal** | 3 | KWD (Kuwait), BHD (Bahrain), OMR (Oman), JOD (Jordan), TND (Tunisia), LYD (Libya), IQD (Iraq) | 1 KWD = 1000 fils |
| **Four-decimal** (raro, mercados FX) | 4 | UYI (Uruguay indexed), CLF (Chile UF) | 1 unit = 10000 sub |

Hard-coding `* 100` quebra em 3-decimals. Padrão correto:

```typescript
// API Stripe-style
const exponentByCurrency: Record<string, number> = {
  JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, UGX: 0,
  KWD: 3, BHD: 3, OMR: 3, JOD: 3, TND: 3, LYD: 3, IQD: 3,
  // default: 2
};

function toMinorUnits(amount: string | number, currency: string): bigint {
  const exp = exponentByCurrency[currency] ?? 2;
  // Use Decimal lib pra evitar float drift; aqui simplificado
  const factor = 10n ** BigInt(exp);
  const [whole, frac = ''] = String(amount).split('.');
  const fracPadded = frac.padEnd(exp, '0').slice(0, exp);
  return BigInt(whole) * factor + BigInt(fracPadded || '0');
}

toMinorUnits('100',     'USD');  // 10000n
toMinorUnits('100',     'JPY');  // 100n
toMinorUnits('100.123', 'KWD');  // 100123n
toMinorUnits('100',     'BRL');  // 10000n
```

`Intl.NumberFormat` faz display correto automaticamente:
```typescript
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(100);   // "￥100"
new Intl.NumberFormat('ar-KW', { style: 'currency', currency: 'KWD' }).format(0.123); // "د.ك. ٠٫١٢٣"
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(99.9);  // "R$ 99,90"
```

#### FX rate provider patterns

**Anti-patterns:**
- Free APIs sem SLA → produção quebra silenciosamente quando provider sai do ar.
- Cache infinito de FX → conversão desatualizada vira loss financeiro real.
- 1 cotação pra display + 1 pra settlement → arbitragem pelos clientes.

**Padrão production-ready:**

```typescript
// FX rates persistidos por dia + provider versioned
type FxRate = {
  base: string;           // "USD"
  quote: string;          // "BRL"
  rate: string;           // decimal as string ("5.1234")
  provider: string;       // "openexchangerates" | "ecb" | "fixer"
  fetched_at: Date;
  effective_date: string; // "2026-05-01"
};

// Multi-provider fallback chain
const providers = [
  { name: 'ecb', fetch: fetchEcb },                  // free, daily, EUR base
  { name: 'openexchangerates', fetch: fetchOXR },    // paga, hourly, multi-base
  { name: 'fixer', fetch: fetchFixer },              // backup
];

async function refreshFxDaily() {
  for (const p of providers) {
    try {
      const rates = await p.fetch();
      await db.upsert('fx_rates', rates.map(r => ({ ...r, provider: p.name })));
      log.info({ provider: p.name, count: rates.length }, 'FX refreshed');
      return;
    } catch (err) {
      log.warn({ provider: p.name, err }, 'FX provider failed, trying next');
    }
  }
  await alertOps('All FX providers failed; rates stale');
  // NÃO catch silencioso — dados financeiros stale são bug crítico
}
```

**Pra settlement (cobrança/pagamento real):**
- Não converta ao mostrar; converta ao **commit transaction**.
- Snapshot da rate dentro da transação: `INSERT INTO orders (..., fx_rate_used, fx_provider, fx_at) VALUES (...)`. Cliente pediu reembolso 30 dias depois? Use rate snapshot, não atual.
- Cobre spread vs rate inter-bancário se você é o "exchanger" (Stripe Connect, Wise pattern).

#### Half-decimal e indexed currencies (CLF, UYI)

- **CLF (Chile Unidad de Fomento)**: indexado a inflação chilena. Cotação muda diariamente pelo Banco Central. Use pra empréstimos longos. Tem 4 decimals.
- **UYI (Uruguay Unidad Indexada)**: similar.
- **XAU / XAG / XPT / XPD**: ouro, prata, platina, paládio. Não são moedas, são commodities; ISO 4217 lista mas display difere (`oz tr`).

Se Logística vai operar em LATAM e oferecer pagamento em moeda indexada, separe **money currencies** (BRL, USD, EUR) de **indexed/commodity** (CLF, XAU) em schema; lógica de conversão é diferente.

Cruza com **02-18** (payments deep), **04-09 §2.14** (cost categories de cross-border), **04-16 §2.7** (unit economics requer FX correto).

### 2.14 Address formats

US: street, city, state, zip.
Brasil: street, número, complemento, bairro, cidade, estado, CEP.
Japão: zip, prefecture, city, street, building (orderem inversa).
UK: street, town, postcode (state ausente).

Backend: persist como structured JSON ou separated fields. Front-end: render com template por país. Don't impose US shape.

Lib: `i18n-postal-address`, libphonenumber pra phone.

### 2.15 Names

"First name + last name" não é universal. Spanish: dois sobrenomes (paterno + materno). Indonesian: muitos só 1 nome. Hungarian: family name first. Chinese: family name first.

Persist `full_name` (string) + opcional `display_name`. Don't force first/last separation se não preciso.

Falabamos como 2025+ pattern: Patrick McKenzie's "Falsehoods Programmers Believe About Names" é leitura obrigatória.

### 2.16 Compliance regional

- **GDPR** (EU): consent, data subject rights, DPO, Cross-border transfers (SCCs, adequacy).
- **LGPD** (Brasil): similar GDPR; ANPD agency.
- **CCPA/CPRA** (Califórnia): opt-out de "sale" de info.
- **PIPL** (China): data localization, gov approvals.
- **HIPAA** (US health), **PCI-DSS** (cards).
- **VAT/IVA/ICMS** tax-side em 02-18.

Engenharia: dependendo do mercado, multi-region storage, audit logs, data residency, right-to-be-forgotten endpoints.

### 2.17 i18n process e tooling

- **Translation memory** (TM): reuse translations.
- **Glossary**: termos consistentes (Logística → mantém em pt; "tracker" → ?).
- **Pseudolocale**: en-XA, testar layout com strings expandidas (~30% longer).
- **Translation services**: Crowdin, Lokalise, Phrase, Smartling. ICU support, workflow, integration GitHub.
- **String key naming**: hierarchic (`orders.list.empty`).
- **Plurals e gender em key**: avoid; use ICU.

### 2.18 Anti-patterns clássicos

- Concatenação de strings em UI.
- `if (locale === 'en') ... else ...` em código.
- Fixed widths em layout (text expand quebra).
- Hardcoded date format.
- Sort em JS sem `localeCompare`.
- Missing `lang` attribute (a11y + tools).
- IME race condition com search.
- Server tz != UTC.
- Float em currency.
- Não testar com pseudolocale.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar UTF-8 / UTF-16 / UTF-32; vantagem de cada.
- Distinguir code point e grapheme cluster com exemplo de emoji ZWJ.
- Aplicar Unicode normalization NFC vs NFD.
- Usar `Intl.PluralRules` pra polonês.
- Justificar UTC + tz id em vez de offset.
- Listar 4 CSS logical properties pra RTL.
- Explicar IME composition events.
- Justificar bigint cents em currency.
- Listar 5 anti-patterns de i18n.
- Explicar pseudolocale e por que ajuda.
- Diferenciar GDPR / LGPD / CCPA em 1 frase cada.

---

## 4. Desafio de Engenharia

Internationalize a Logística para **3 locales**: pt-BR (default), en-US, es-MX.

### Especificação

1. **Stack**:
   - Frontend: i18next ou Lingui ou FormatJS.
   - Backend: same lib pra emails / notifications.
2. **Locales suportados**: pt-BR, en-US, es-MX.
3. **Cobertura mínima**:
   - Todas strings UI extraídas (zero hardcoded).
   - 5+ messages com pluralization ICU.
   - 2+ messages com gender select.
   - Datas, números, moedas via `Intl`.
4. **Timezone**:
   - User has `timezone` em profile.
   - Server persist UTC.
   - Display em user tz consistently.
   - Renderer respeita server tz fallback.
5. **RTL** (stretch):
   - Adicionar he-IL como 4º locale com RTL ativado.
   - CSS logical properties usado.
6. **Search collation**:
   - Postgres índices com collation `pt_BR.UTF-8` em campos relevantes.
   - Unaccent disponível em search.
7. **Pseudolocale**:
   - Build target `en-XA` que expande strings 30% e adiciona acentos. Use pra detect overflow.
8. **Translation pipeline**:
   - Strings em arquivos JSON ou PO.
   - Doc `TRANSLATION-PROCESS.md` definindo workflow.
9. **Testing**:
   - Snapshot visual em 3 locales.
   - Unit tests em pluralização edge (n=0, 1, 2, 5).

### Restrições

- Zero strings hardcoded em UI.
- Nenhuma concat manual de strings traduzíveis.
- Tudo currency em bigint cents + currency code.
- Server UTC; client tz-aware.
- Lang attribute correto em `<html>` por locale.

### Threshold

- 3 locales funcionando, navigation completa.
- Tests cobrem pluralization e currency em 3 locales.
- Pseudolocale ativável; layout não quebra.
- README documenta processo de tradução.

### Stretch

- **he-IL** com RTL.
- **Crowdin / Lokalise** integration real (free tier).
- **A11y testing** automated cross-locale (a11y errors variam por language; lang attribute crucial).
- **Email templates** com mesma stack.
- **Number digit grouping** custom (Indian numbering uses lakhs/crores).
- **Calendar systems** alternatives (Buddhist, Hijri) opt-in.

---

## 5. Extensões e Conexões

- Liga com **01-12** (cripto): Unicode normalization affects hashing.
- Liga com **02-01** (HTML/CSS): logical properties, lang.
- Liga com **02-02** (a11y): lang attribute, RTL accessibility.
- Liga com **02-04** (React): useTranslation, formatting.
- Liga com **02-05** (Next.js): i18n routing.
- Liga com **02-09** (Postgres): collation, citext, unaccent.
- Liga com **02-15** (search): tokenizer per language.
- Liga com **02-18** (payments): currency formatting.
- Liga com **03-08** (security): unicode normalization in input validation (homoglyph attacks).
- Liga com **03-17** (a11y testing): lang correctness checked.
- Liga com **04-05** (API design): Accept-Language header, language negotiation.
- Liga com **04-16** (product): mercados internacionais drive feature.

---

## 6. Referências

- **Unicode Standard** ([unicode.org](https://unicode.org/)). Latest version.
- **ICU User Guide** ([unicode-org.github.io/icu](https://unicode-org.github.io/icu/)).
- **CLDR** (Common Locale Data Repository).
- **MDN, `Intl` namespace**.
- **"Falsehoods Programmers Believe About Names"**: Patrick McKenzie.
- **"Falsehoods Programmers Believe About Time"**: Noah Sussman e revisões.
- **"Falsehoods Programmers Believe About Addresses"**: Mike Hearn.
- **"Internationalization in Practice"**: Mark Davis (Unicode Consortium).
- **i18next docs** ([i18next.com](https://www.i18next.com/)).
- **FormatJS docs** ([formatjs.io](https://formatjs.io/)).
- **Crowdin / Lokalise / Phrase**: translation platforms.
- **Patrick McKenzie's "Bits about Money"** essays, currency edge cases.
- **GDPR text** + **LGPD text**.
