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

### 2.19 ICU MessageFormat + RTL + locale negotiation production deep

i18n maduro 2026 não é "JSON com chaves traduzidas". É CLDR 44 (ICU 73+) pra pluralization/gender, Intl APIs Baseline pra format, locale negotiation RFC 4647 no edge, RTL via CSS logical properties, e Temporal API (Stage 3 → stable mid-2026) pra timezone. Cada peça tem pegadinha que só aparece no segundo locale.

#### Por que ICU MessageFormat (vs interpolação naive)

Naive `t('orders.count', { n }) → "1 pedidos"` falha em pluralização (1 vs 2+), gênero, ordem de palavras. ICU MessageFormat (Unicode CLDR) tem regras gramaticais embutidas: `one/two/few/many/other`, `select` por gender, nesting. Stack 2026: `formatjs` (React Intl), `next-intl` (Next.js native), `lingui-js`, `@formatjs/intl` (vanilla TS), `@vocab/core` (build-time).

```icu
{count, plural,
  =0 {Nenhum pedido}
  one {# pedido}
  other {# pedidos}
}
```

`=0` literal match precede categories. Português tem 2 categorias (one/other); russo 4 (one/few/many/other); árabe 6 (zero/one/two/few/many/other); polonês 4; japonês/chinês/coreano só `other` (sem agreement). NUNCA hardcode `if count === 1` — locale-specific failure.

Gender + nested:
```icu
{gender, select,
  male {Ele entregou {count, plural, one {# pedido} other {# pedidos}}}
  female {Ela entregou {count, plural, one {# pedido} other {# pedidos}}}
  other {Pessoa entregou {count, plural, one {# pedido} other {# pedidos}}}
}
```

#### Implementation TypeScript com next-intl

```ts
// messages/pt-BR.json
{
  "orders.count": "{count, plural, =0 {Nenhum pedido} one {# pedido} other {# pedidos}}",
  "orders.total": "Total: {amount, number, ::currency/BRL .00}",
  "orders.created": "Criado em {createdAt, date, ::yyyy-MM-dd HH:mm}"
}

// component
import { useTranslations } from 'next-intl';
const t = useTranslations();
t('orders.count', { count: 5 });                                // "5 pedidos"
t('orders.total', { amount: 1234.5 });                          // "Total: R$ 1.234,50"
t('orders.created', { createdAt: new Date('2026-05-06T14:30') }); // "Criado em 2026-05-06 14:30"
```

Skeleton `::currency/BRL .00` e `::yyyy-MM-dd HH:mm` vêm do ICU 73+ DateTimeSkeleton; mais flexível que pattern legacy `{amount, number, currency}`.

#### CLDR plural rules — categorias por locale

| Locale | Categorias | Exemplo prático |
|---|---|---|
| en, de, nl | one (1), other | 1 item / 2+ items |
| pt, es, fr | one (1), other | 1 item / 2+ items |
| ru, uk | one (1, 21, 31...), few (2-4, 22-24...), many (resto), other (fracionários) | 4 |
| ar | zero, one, two, few, many, other | 6 |
| ja, zh, ko | other | sem agreement |
| pl | one, few, many, other | regras complexas |

Verificação em test:
```ts
new Intl.PluralRules('ru').select(5);   // 'many'
new Intl.PluralRules('ru').select(22);  // 'few'
new Intl.PluralRules('ar').select(0);   // 'zero'
new Intl.PluralRules('pl').select(2);   // 'few'
```

Regression test obrigatório: snapshot por locale × `[0, 1, 2, 5, 11, 21, 22, 100]`. Releases que adicionam russo/árabe quebram silenciosamente sem essa cobertura.

#### RTL — Arabic, Hebrew, Persian

CSS Logical Properties (Baseline 2024 widely): `padding-inline-start` (LTR=left, RTL=right), `margin-inline-end`, `border-start-start-radius`, `inset-inline-start`. NUNCA `padding-left` em UI cross-locale.

```css
/* errado */
.card { padding-left: 12px; border-left: 1px solid; text-align: left; }
/* certo */
.card { padding-inline-start: 12px; border-inline-start: 1px solid; text-align: start; }
```

`<html dir="rtl" lang="ar">` ativa RTL globalmente; browser flips layout. Tailwind v4 expõe `dir-*` variants nativos; v3 usa plugin `tailwindcss-rtl` com prefixo `rtl:`.

Mirror em RTL: setas, chevrons, ícone de "voltar" (`transform: scaleX(-1)` quando inline-direction-dependent). NÃO mirror: logos, fotos, audio waveforms, code snippets, números (digits LTR mesmo em texto RTL).

Bidirectional text (nome árabe + número en): trust browser bidi (Unicode UAX#9), mas isolate user content em `<bdi>` ou `unicode-bidi: isolate`. Usuário hostil pode injetar RLO/LRO override e reordenar UI vizinha.

```html
<!-- user content em UI mixed-direction -->
<p>Pedido de <bdi>{{ user.displayName }}</bdi> entregue às 14:30.</p>
```

#### Locale negotiation — RFC 4647 lookup

```ts
import { match } from '@formatjs/intl-localematcher';

const supported = ['pt-BR', 'es-419', 'en'];
const requested = req.headers['accept-language']; // "pt-PT,pt;q=0.9,en;q=0.8"
const negotiated = match(parseAcceptLanguage(requested), supported, 'en');
// pt-PT → pt-BR (best match em Portuguese family); fallback 'en'
```

Strategy preference: URL-based (`/pt-BR/orders`) > query (`/orders?lang=pt-BR`) > cookie > Accept-Language. URL é SEO-friendly e cacheable. Per-user override sempre vence Accept-Language.

Pegadinha CDN: `Vary: Accept-Language` raw causa cardinality explosion (1000+ valores únicos em prod). Normalize em Worker antes do cache key (cruza com `../03-infraestrutura/03-10-cdn-edge.md` §2.20):

```ts
// Cloudflare Worker, antes do cache lookup
const accept = request.headers.get('accept-language') ?? '';
const normalized = match(parseAcceptLanguage(accept), ['pt-BR', 'es-419', 'en'], 'en');
const cacheKey = new Request(url + '?_lang=' + normalized, request);
```

#### Date/time/currency — Intl APIs (Baseline)

```ts
// Intl.DateTimeFormat — locale + timezone explícitos
new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
}).format(new Date()); // "6 de maio de 2026 às 14:30"

// Intl.NumberFormat — currency, percent, decimals
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1234.5); // "R$ 1.234,50"
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' }).format(1234.5); // "R$1,234.50"

// Intl.RelativeTimeFormat
new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(-2, 'hour'); // "há 2 horas"

// Intl.ListFormat (Baseline 2024)
new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(['A', 'B', 'C']); // "A, B e C"
new Intl.ListFormat('en', { type: 'conjunction' }).format(['A', 'B', 'C']);    // "A, B, and C"
```

Temporal proposal (TC39 Stage 3 → stable mid-2026): substitui `Date` com timezone-aware API. `Temporal.ZonedDateTime`, `Temporal.PlainDate`, `Temporal.Duration`. Polyfill estável via `@js-temporal/polyfill`; rollout nativo browser-by-browser em 2026.

#### Timezone — pegadinhas além de §2.7

`Date.toISOString()` é UTC sempre; rendering deve format pra user TZ via `Intl.DateTimeFormat({ timeZone })`. Storage SEMPRE UTC em DB (`TIMESTAMPTZ` Postgres); render com user TZ no client/edge. Use IANA names (`America/Sao_Paulo`), NUNCA offset fixo (`-03:00`) — DST e mudanças políticas (Brasil aboliu DST em 2019; Mexico em 2022) viram bug silencioso em código que tinha `if (month >= 10 && month <= 2)`.

#### Logística applied stack

Locales: pt-BR (primary), es-419 (Latin America Spanish), en (US/global). next-intl + messages JSON per locale + ICU MessageFormat + Intl APIs. URL strategy `/pt-BR/orders/:id`, `/es/orders/:id`, `/en/orders/:id`. Currency BRL primário; tenant config opcional pra USD/EUR em cliente cross-border. Address: pt-BR usa CEP 8 dígitos + estado siglas (SP, RJ); en usa ZIP + state code; phone via `libphonenumber-js`. Pluralização: `{count, plural, one {1 entrega hoje} other {# entregas hoje}}`.

#### Anti-patterns (10 itens, vistos em produção)

1. `if (count === 1) return "1 item"` em vez de ICU plural — quebra em ru/ar/pl.
2. `padding-left: 12px` em vez de `padding-inline-start` — quebra RTL.
3. `Date.toLocaleString()` sem `timeZone` — renders em server TZ; horror em SSR multi-region.
4. Concatenação `t('today_is') + ' ' + day` — ordem errada em ja/de/ar.
5. User content sem `<bdi>` em mixed-direction — algoritmo bidi trip + RLO injection.
6. `Vary: Accept-Language` raw em CDN — cardinality explosion.
7. Storage `Date` com offset `-03:00` — quebra após mudança DST/política.
8. Locale fallback hardcoded `'en'` sem RFC 4647 lookup — `pt-BR` user vê `en` quando `pt` disponível.
9. Plurais `one/other` hardcoded sem testar `Intl.PluralRules` — release ru/ar quebra.
10. Currency sem tenant config — assume BRL global; tenant europeu B2B vê BRL.

Cruza com **02-02 §a11y RTL** (`dir` attribute + screen reader announce), **02-09** (Postgres TIMESTAMPTZ + collation), **02-05** (Next.js app router locale strategy), **../03-infraestrutura/03-09-frontend-perf.md** (locale-specific bundle splitting via dynamic import), **../03-infraestrutura/03-10-cdn-edge.md §2.20** (Vary normalization no edge), **../04-produto/04-16-product-engineering.md §2.7** (locale market expansion business case + unit economics FX).

---

### 2.20 Translation Management Systems (TMS) + AI-assisted translation production 2026

§2.17-2.19 cobriu fundamentos: Unicode, ICU MessageFormat, RTL, locale negotiation, pluralização, formatação. Falta o **lado humano + máquina da produção de localization**: como fonte de verdade dos strings sai do repositório, atravessa um **TMS** (Translation Management System), passa por **machine translation** (DeepL / GPT-4o / Claude 3.7 Sonnet), volta revisada por humanos, e retorna ao repositório sem drift. 2024-2026 quebrou o equilíbrio antigo: AI raw já produz tier 1 com glossário forte; humano virou **post-editor + reviewer** em vez de tradutor primário. Throughput humano puro: ~2000 palavras/dia a $0.10-0.20/palavra. AI + post-edit: ~8000 palavras/dia a $0.01/palavra raw + $0.04 review. Custo cai 5-10x. Mas qualidade só sustenta se TMS + glossary + style guide + MQM rubric estiverem operando como single source of truth.

**TMS comparison matrix 2026** (escolha não é trivial — depende de open-source vs SaaS, GitHub-native, in-context, AI workflow nativo):

| TMS | Modelo | GitHub sync | AI built-in | In-context | Forte em |
|-----|--------|-------------|-------------|------------|----------|
| **Lokalise** (acquired SmartCat 2024) | SaaS | Action oficial | DeepL + GPT | Plugin Figma + web | UI rich, mid-large teams, JSON/ICU/XLIFF |
| **Phrase TMS** (Memsource rebrand) | Enterprise SaaS | API + CLI | AI workflows GA 2024 | Limited | Enterprise compliance, MQM nativo, XLIFF heavy |
| **Crowdin** | SaaS | Action oficial | DeepL + OpenAI | Crowdin In-Context | Community translation (gamification), open-source projects |
| **Tolgee 2.x** | Open-source self-hosted ou Cloud | CLI + Action | OpenAI + DeepL plugin | Chrome extension overlay (best-in-class) | Self-hosted, in-context superior, dev-first |
| **Transifex** | Enterprise SaaS | API | AI add-on | Yes | Enterprise legacy, mature, conservadora |

Logística aplicada: **Tolgee self-hosted** (Postgres + Docker compose, controle total, $0 SaaS) + **Claude 3.7 Sonnet via API** para tier 1 EN→pt-BR/es-MX/pt-PT + revisor nativo humano em pt-BR (interno) e contractor em es-MX/pt-PT.

**GitHub Action sync pattern**. Source language em Git (e.g. `locales/en.json`); TMS espelha; PR auto-aberto quando traduções voltam:

```yaml
# .github/workflows/i18n-sync.yml
name: i18n sync (Tolgee)
on:
  push:
    branches: [main]
    paths: ['locales/en.json', 'locales/en/**']
  schedule:
    - cron: '0 6 * * 1' # Monday 06:00 UTC: pull translated strings
  workflow_dispatch:

jobs:
  push-source:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Push source EN to Tolgee
        uses: tolgee/tolgee-action@v2
        with:
          api-key: ${{ secrets.TOLGEE_API_KEY }}
          api-url: https://tolgee.logistica.internal
          command: push
          languages: en
          files-pattern: 'locales/en/**.json'
          override-key-descriptions: true # screenshots + context preserved

  pull-translations:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pull translated locales
        uses: tolgee/tolgee-action@v2
        with:
          api-key: ${{ secrets.TOLGEE_API_KEY }}
          api-url: https://tolgee.logistica.internal
          command: pull
          languages: pt-BR,pt-PT,es-MX
          path: locales
      - name: Open PR
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: 'i18n: sync translations from Tolgee'
          branch: i18n/sync-${{ github.run_id }}
          title: 'i18n: weekly translation sync'
          body: 'Auto-sync from Tolgee. Review string diffs before merge.'
          labels: i18n,automated
```

Push é **eager** (toda mudança no `en` propaga); pull é **batched semanal** + PR (humano revisa o diff antes de mergear — captura quebra de variável ICU, contagem de placeholders divergente, encoding bug).

**Locale file conventions**. JSON nested por feature/page namespace (não flat com chaves english-as-key):

```json
// locales/en/checkout.json
{
  "checkout": {
    "header": "Review your order",
    "total_label": "Total: {amount, number, ::currency/USD}",
    "items_count": "{count, plural, =0 {No items} one {1 item} other {# items}}",
    "submit_cta": "Place order",
    "terms_accept": "I agree to the <link>Terms of Service</link>"
  }
}
```

Namespace por feature (`checkout`, `dashboard`, `auth`) evita translation memory cross-pollination indevida e permite lazy-load por rota. ICU MessageFormat para plurals/select. Nunca chave english-as-key (`{ "Place order": "Place order" }`) — translator vê chave igual ao valor e traduz mecanicamente, sem context.

**AI translation pipeline 2026**. Claude 3.7 Sonnet com glossary + style guide + tone embutidos no system prompt. TMS chama API ou worker bate em batch:

```typescript
// scripts/ai-translate.ts — invoked from Tolgee webhook on new untranslated key
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const GLOSSARY = {
  'Logistica': 'Logistica', // brand: NEVER translate
  'order': { 'pt-BR': 'pedido', 'es-MX': 'pedido', 'pt-PT': 'encomenda' },
  'shipment': { 'pt-BR': 'envio', 'es-MX': 'envío', 'pt-PT': 'envio' },
  'tracking number': { 'pt-BR': 'codigo de rastreio', 'es-MX': 'numero de rastreo', 'pt-PT': 'codigo de seguimento' },
};

const STYLE_GUIDE = {
  'pt-BR': 'Use "voce" (informal). Tom direto, conciso. Evite gerundio em titulos. Capitalize apenas primeira palavra em CTAs.',
  'pt-PT': 'Use "voce" formal. Vocabulario distinto de pt-BR (encomenda, ecra, ficheiro). Acordo Ortografico 1990.',
  'es-MX': 'Use "usted" em CTAs formais, "tu" em microcopy informal. Vocabulario neutro mexicano.',
};

export async function translate(key: string, source: string, targetLang: string, context?: string) {
  const glossaryHints = Object.entries(GLOSSARY)
    .filter(([term]) => source.toLowerCase().includes(term.toLowerCase()))
    .map(([term, val]) => {
      const target = typeof val === 'string' ? val : val[targetLang];
      return `- "${term}" -> "${target}"`;
    })
    .join('\n');

  const msg = await client.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1024,
    system: `You translate UI strings from English to ${targetLang} for Logistica (logistics SaaS).

Style guide: ${STYLE_GUIDE[targetLang]}

Glossary (MUST follow):
${glossaryHints || '(no glossary terms in this string)'}

Rules:
- Preserve ICU MessageFormat syntax: {var}, {n, plural, ...}, {x, select, ...}.
- Preserve XML-like tags: <link>, <bold>.
- Match string length within 1.3x of source (UI space constraints).
- Never translate brand names: Logistica, Stripe, AWS.
- Output ONLY the translated string, no quotes, no explanation.`,
    messages: [{
      role: 'user',
      content: `Key: ${key}\nContext: ${context ?? 'general UI'}\nSource (EN): ${source}\nTranslate to ${targetLang}:`,
    }],
  });

  return (msg.content[0] as { type: 'text'; text: string }).text.trim();
}
```

Output entra em Tolgee como **machine-translated draft** (estado MT), não auto-publica. Reviewer humano valida e promove para `REVIEWED`.

**Glossary + term base + translation memory**. Tres conceitos distintos, frequentemente confundidos:
- **Translation Memory (TM)**: pares source-target previamente aprovados. Match 100% reutiliza, 75-99% (fuzzy) sugere com edit. Reduz custo: 30-50% das strings em release N+1 batem com release N. TMS armazena automaticamente.
- **Term base / glossary**: lexicon de termos brand/domain com tradução fixa. "Logistica" -> "Logistica" (não traduz). "Order" -> "pedido" (pt-BR) / "encomenda" (pt-PT). Enforced no MT prompt e validado em review.
- **Style guide**: regras de tom/registro/grammar. "voce" vs "tu", capitalização de CTAs, tratamento formal/informal por contexto. Vive como markdown no repo + linkado no TMS, não como Google Doc não-versionado.

**In-context translation** (Tolgee Chrome ext, killer feature). Tradutor abre app em staging, vê strings renderizadas; clica num botão "Place order" e edita inline com contexto visual completo (tamanho do botão, posição, vizinhança). Resolve **string-only ambiguity** (e.g. "Open" — verbo "abrir" ou adjetivo "aberto"?). Reduz erros de tradução em 30-40%. Setup: instalar ext + apontar pra Tolgee API + adicionar SDK no app:

```tsx
// app/layout.tsx (staging only)
import { TolgeeProvider, DevTools, Tolgee, FormatIcu } from '@tolgee/react';

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatIcu())
  .init({
    apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL,
    apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY, // staging only, never prod
    language: 'en',
  });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <TolgeeProvider tolgee={tolgee} fallback="Loading...">
      {children}
    </TolgeeProvider>
  );
}
```

Em produção, build com flag `NEXT_PUBLIC_TOLGEE_DEV=false` que tree-shakes DevTools fora do bundle.

**Quality measurement: MQM (Multidimensional Quality Metrics)**. ASTM/ISO standard. Reviewer marca erros em rubric ponderada:

| Categoria | Severity | Peso |
|-----------|----------|------|
| **Accuracy** (mistranslation, omission, addition) | minor=1 / major=5 / critical=25 | 1.0 |
| **Fluency** (grammar, spelling, register) | minor=1 / major=5 | 1.0 |
| **Style** (style guide adherence, tone) | minor=0.5 / major=2 | 0.5 |
| **Terminology** (glossary deviation) | minor=1 / major=5 | 1.0 |

MQM Score = `100 - (sum_errors / word_count) * 100`. Tier 1 (CTAs, errors, billing) gate em MQM ≥ 95. Tier 2 (marketing, long-form) gate em ≥ 90. Spot-check 10% das strings AI-translated tier 1 — se > 2 strings com major error em sample de 50, **reject batch e re-prompt** com glossary reforçado.

**Stack Logistica produção**:
- **Tolgee self-hosted** em Railway (Docker compose: tolgee-app + Postgres + Redis), `tolgee.logistica.internal`.
- **Source EN** em Git (`locales/en/**.json`), GitHub Action push on merge to main.
- **Claude 3.7 Sonnet** webhook on new key untranslated em Tolgee, gera draft com glossary + style guide. ~$0.005/string.
- **Reviewer pt-BR** (interno, native), revisa via Tolgee UI + Chrome ext em staging. MQM tracked.
- **Contractor pt-PT/es-MX** via marketplace (e.g. Smartcat), 200 words/dia each, MQM gate ≥ 90.
- **Pull weekly** Monday 06:00 UTC, PR auto-aberto, dev review + merge.
- **Glossary** em `i18n/glossary.json` versionado, sync to Tolgee via CLI on change.

**10 anti-patterns**:
1. **AI translation deployed sem human review** em customer-facing UI: brand voice drift, glossary violations não detectadas, tone inconsistente. Mínimo: post-edit por nativo em tier 1.
2. **TMS sync via manual upload/download** (alguém puxa CSV, edita em Excel, faz upload): drift garantido entre Git e TMS, race conditions, perda de TM. Sempre via API/Action.
3. **Flat keys sem namespace** (`{"placeOrder":"Place order","placeOrderDashboard":"Place order"}`): translator confuso (mesma string, contextos divergentes), TM cross-polluted entre features, lazy-load impossível.
4. **Glossary mantido em Google Doc não sincronizado** com TMS: dev atualiza doc, TMS continua usando termo antigo, AI gera com glossary stale. Glossary é código — vive em Git, sync automático.
5. **Reviewer humano sem MQM rubric**: subjetivo, "parece ok"; sem accountability nem trend tracking. MQM force tipificação de erro + severity.
6. **AI translation sem glossary context** no prompt: brand term renderizado errado ("Logistica" → "Logística" em pt-BR, ou pior "Logistics"), terminologia inconsistente entre features.
7. **JSON locale com chaves english-as-key** (`{"Place order":"Place order"}`): translator não sabe se chave é literal ou identifier; quando EN muda, todas as chaves shiftam (chave nova, traduções perdidas).
8. **Review em batch >500 strings**: reviewer fadiga após ~200, qualidade despenca exponencialmente. Batch ≤ 200 strings, ou ≤ 4 horas.
9. **Locale files sem version control + diff em PR**: regressões silenciosas (string deletada por engano, encoding bug UTF-8/16 mistura), nenhum dev nota até customer reportar.
10. **Machine translation cost não-monitored**: GPT-4o em tier 1 high-traffic features, sem cap, sem dashboard. Conta surpresa $$$/mês. Cap por mês + alerta em 70%/90%.

Cruza com **§2.4** (pluralization — input do MT prompt), **§2.6** (number/currency/date — não traduzir, format por locale), **§2.7** (timezones — strings de "X minutes ago" precisam locale-aware), **§2.17** (i18n process + tooling intro), **§2.18** (anti-patterns base), **§2.19** (ICU MessageFormat + RTL + locale negotiation), **02-05 §2.23** (Next 15 Document Metadata por locale via TMS), **../03-infraestrutura/03-04-ci-cd.md §2.21** (release-please reconhecendo translation file changes como `chore(i18n)` no changelog), **../04-produto/04-10-ai-product-engineering.md §2.23** (MCP — expor TMS como MCP server pra Claude Desktop puxar status de tradução), **../04-produto/04-16-product-engineering.md §2.21** (SaaS pricing tiers por locale: locale availability como gate de plan).

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
