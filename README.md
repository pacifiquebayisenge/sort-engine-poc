# Sort Engine PoC — Betersorteren.be

Een proof of concept gebouwd om de zoekervaring van de Fost Plus Sort Engine te verbeteren.
De huidige zoekmachine op betersorteren.be gebruikt exacte keyword-matching — dit PoC demonstreert een gelaagde aanpak met fuzzy search, barcode-herkenning, een beslissingsboom en AI-classificatie als fallback.

---

## Achtergrond

De live Sort Engine API geeft bij veelgebruikte zoekopdrachten geen of slechte resultaten:

| Zoekopdracht   | Resultaat live API            | Resultaat dit PoC                   |
| -------------- | ----------------------------- | ----------------------------------- |
| `cola blik`    | ❌ null                       | ✅ Drankblikje (PMD)                |
| `metalen vork` | ❌ null                       | ✅ Metalen voorwerp (Recyclagepark) |
| `autoband`     | ❌ null                       | ✅ Autoband (Recyclagepark)         |
| `cola`         | ⚠️ 6 resultaten, niet gerankt | ✅ Drankblikje bovenaan             |

De oorzaak is tweeledig: te weinig keywords per item én geen tolerantie voor variatie in de zoekmachine.

---

## Architectuur — vijf lagen

```
Gebruiker zoekt
       ↓
┌─────────────────────────────────┐
│  Laag 1 — Fuzzy text search     │  Fuse.js over lokale dataset
│  Laag 2 — Beslissingsboom       │  Geleide vragen (materiaal, staat, ...)
│  Laag 3 — Barcode scan          │  Camera of manuele invoer → Open Food Facts
│  Laag 4 — AI-classificatie      │  Foto + beschrijving → OpenRouter LLM
│  Laag 5 — Contactformulier      │  Doorverwijzing naar Fost Plus
└─────────────────────────────────┘
       ↓
Elk resultaat wordt gelogd
       ↓
Admin dashboard (toekomstige uitbreiding)
```

Elke laag wordt alleen geactiveerd als de vorige laag geen bevredigend resultaat oplevert (< 60% match).

---

## Wat is gebouwd

### Fuzzy search (`/server/api/search.get.ts`)

- Fuse.js met gewogen velden: synoniemen (40%), titel (35%), keywords (25%)
- Query-normalisatie: lowercase, diacritics, koppeltekens, dubbele spaties
- Fuse-index wordt één keer opgebouwd bij module load, niet per request
- Confidence-score omgezet naar matchPercentage (0–100%)

### Beslissingsboom (`/components/DecisionTree.vue`)

- Echte gelaagde vraagstructuur: categorie → materiaal → toestand
- Elke vraag leidt naar een fractie of een vervolgvraag
- Automatische doorstap naar AI-input als barcode niet gevonden

### Barcode scanner (`/components/BarcodeScanner.vue`)

- `@zxing/browser` dynamisch geladen (alleen als scanner opent)
- Rear camera met visuele overlay
- Resultaat wordt automatisch opgezocht via Open Food Facts

### Barcode lookup (`/server/api/barcode.get.ts`)

- Open Food Facts API — gratis, geen key nodig
- Verpakkingsmateriaal gemapt naar Belgische fracties
- `source: 'barcode'` bij zeker resultaat (90%), `source: 'barcode-uncertain'` bij twijfel (40%)

### AI-classificatie (`/server/api/ai-classify.post.ts`)

- Foto (base64) + tekstbeschrijving → OpenRouter LLM
- Probeert eerst vision model (`meta-llama/llama-3.2-11b-vision-instruct:free`)
- Valt automatisch terug op `openrouter/free` (altijd beschikbaar, text-only)
- Vaste lijst van 14 toegestane fracties — hallucinate is onmogelijk
- Postcode wordt meegegeven als context

### Logging (`/server/api/log.post.ts`)

- Elk zoekevent gelogd: query, laag, resultaat, confidence, postcode
- Feedback (👍/👎) per resultaat gelogd
- In-memory voor PoC, klaar voor Supabase-integratie

### Data (`/data/sortingItems.ts`)

- ~70 items, gemiddeld 14 keywords per item
- Demonstreert hoe de Fost Plus database verrijkt zou moeten worden
- Merknamen, colloquiale termen, multi-word queries inbegrepen
- Bevat items die volledig ontbreken in de live API (bv. `autoband`, `vape`, `nespresso-capsule`)

---

## Snel starten

### Vereisten

- Node.js 20+
- pnpm

### Installatie

```bash
pnpm install
```

### Omgevingsvariabelen

```bash
cp .env.example .env
```

Vul je OpenRouter API key in:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
```

Key aanmaken op: [openrouter.ai/keys](https://openrouter.ai/keys) — geen creditcard nodig.

### Starten

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech stack

| Technologie             | Gebruik                        |
| ----------------------- | ------------------------------ |
| Nuxt 4                  | Frontend + server API routes   |
| Vue 3 + TypeScript      | Componenten                    |
| Fuse.js                 | Fuzzy search engine            |
| @zxing/browser          | Barcode scanner (camera)       |
| Open Food Facts API     | Barcode → productinformatie    |
| OpenRouter              | AI-classificatie (gratis tier) |
| Tailwind CSS + @nuxt/ui | Styling                        |

---

## Projectstructuur

```
sort-engine-poc/
├── assets/css/
│   └── main.css
├── components/
│   ├── BarcodeScanner.vue     # Camera barcode scanner
│   └── DecisionTree.vue       # Geleide identificatie (3 stappen)
├── data/
│   └── sortingItems.ts        # Verrijkte dataset (~70 items)
├── layouts/
│   └── default.vue
├── pages/
│   └── index.vue              # Hoofdpagina (search + results + feedback)
├── server/api/
│   ├── ai-classify.post.ts    # AI-classificatie via OpenRouter
│   ├── barcode.get.ts         # Barcode lookup via Open Food Facts
│   ├── log.post.ts            # Event logging
│   └── search.get.ts          # Fuzzy search via Fuse.js
├── .env.example
├── nuxt.config.ts
└── package.json
```

---

## Dataset — uitleg verrijking

`data/sortingItems.ts` is een demonstratie van hoe de Fost Plus database eruit zou moeten zien na keyword-verrijking.

**Huidig in de live API:**

```json
{
	"title": "Drankblikje",
	"keywords": []
}
```

**Na verrijking (dit PoC):**

```ts
{
  id: 'drinks-can',
  title: 'Drankblikje',
  fraction: 'PMD',
  keywords: [
    'cola', 'cola blik', 'coca cola', 'fanta', 'sprite',
    'pepsi', 'red bull', 'monster', 'energy drink',
    'bierblik', 'jupiler blik', 'aluminium blik', ...
  ],
  synonyms: ['colablikje', 'frisdrankblikje', 'soda can', ...]
}
```

Keyword-verrijking van alle ~300 items in de live database is de snelste en goedkoopste interventie — geschatte inspanning: 1 week (LLM-gegenereerd + redactionele review).

---

## Bekende beperkingen van dit PoC

- **Postcode/IC-regels niet geïmplementeerd** — de app accepteert een postcode maar IC-specifieke overrides (bv. pizzadoos → GFT in sommige gemeenten) zijn nog niet gebouwd
- **Statische dataset** — de Fuse.js search loopt over de lokale `sortingItems.ts`, niet over de live Fost Plus API
- **Logging is in-memory** — events verdwijnen bij server restart; productie vereist een database (bv. Supabase)
- **Admin dashboard niet gebouwd** — de logging-infrastructuur is aanwezig maar de visualisatie nog niet
- **Geen meertaligheid** — `@nuxtjs/i18n` is aanwezig in `package.json` maar niet geconfigureerd

---

## Volgende stappen

| Fase  | Beschrijving                                          | Inspanning |
| ----- | ----------------------------------------------------- | ---------- |
| **1** | Database-verrijking — 300 items, ~14 keywords/item    | ~1 week    |
| **2** | Live Fost Plus API integratie + server-side caching   | ~1 dag     |
| **3** | IC-regeloverrides per postcode                        | ~3-4 dagen |
| **4** | Admin dashboard (analytics + onopgeloste items queue) | ~5-8 dagen |
| **5** | Meertaligheid NL/FR/EN/DE                             | ~3-4 dagen |

---

## Gesloten feedbackloop

Het centrale concept van dit PoC is dat onopgeloste vragen de database verbeteren:

```
Gebruiker zoekt → geen resultaat
       ↓
Beslissingsboom / barcode / AI → nog steeds geen resultaat
       ↓
Contactformulier → admin queue
       ↓
Admin onderzoekt → item toegevoegd aan database
       ↓
Gebruiker krijgt notificatie met correct antwoord
       ↓
Alle toekomstige gebruikers vinden het item via laag 1
```

Dit maakt de database zelf-verbeterend op basis van echte gebruikersvragen.
