# Sort Engine 2.0 - Fuzzy Search Proof of Concept

## Overview

This project is a Proof of Concept (PoC) created to evaluate whether fuzzy searching can improve the search experience of the Fost Plus Sort Engine.

The current Sort Engine appears to rely primarily on keyword-based searching using titles, keywords and synonyms. While this approach works for exact matches, it can struggle when users search using:

- Alternative descriptions
- Brand names
- Typographical errors
- Different word orders
- Informal terminology

This proof of concept investigates whether a fuzzy search engine can improve search accuracy without introducing AI models, external APIs, or additional infrastructure complexity.

---

## Objectives

The primary objectives of this PoC are:

- Improve search accuracy
- Improve user experience
- Reduce dependency on exact keyword matches
- Reduce maintenance effort for manually managed search terms
- Evaluate whether fuzzy search can solve a significant portion of current search issues
- Establish a foundation for future AI-powered search enhancements

---

## Current Search Limitations

Examples of searches that can be difficult for traditional keyword-based search engines:

```text
cola
cola blik
cocacola
monster energy
red bull
petfles
yoghurtpotje
```

A human immediately understands these concepts.

A traditional search engine often requires:

- Exact keywords
- Exact synonyms
- Exact spelling

Otherwise, no result may be returned.

---

## Proposed Solution

This Proof of Concept uses:

- Nuxt 4
- TypeScript
- Fuse.js

Fuse.js performs fuzzy matching instead of exact matching.

Instead of searching for exact words, Fuse.js calculates how similar a search query is to existing records.

---

## Search Architecture

```text
User Input
    ↓
Normalize Query
    ↓
Fuse.js Search
    ↓
Calculate Similarity Score
    ↓
Rank Results
    ↓
Return Best Matches
```

---

## Query Normalization

Before searching, all queries are normalized.

### Example

Input:

```text
Coca-Cola
```

Normalized:

```text
coca cola
```

Input:

```text
Énergy Drink
```

Normalized:

```text
energy drink
```

Input:

```text
COLA BLIK
```

Normalized:

```text
cola blik
```

This process:

- Converts to lowercase
- Removes accents
- Replaces separators (-, _, /)
- Removes duplicate spaces

This significantly improves matching consistency.

---

## Traditional Search vs Fuzzy Search

### Traditional Search

```text
User
 ↓
Exact Match
 ↓
Result
```

Possible implementation:

```sql
WHERE title LIKE '%cola%'
OR keyword LIKE '%cola%'
```

#### Advantages

- Fast
- Simple
- Predictable

#### Limitations

- Sensitive to spelling mistakes
- Requires exact terminology
- Requires extensive synonym management
- Poor handling of alternative descriptions

---

### Fuzzy Search

```text
User
 ↓
Similarity Matching
 ↓
Ranking
 ↓
Best Results
```

#### Advantages

- Supports spelling mistakes
- Supports alternative wording
- Supports partial matches
- Supports different word orders
- Improves user experience

#### Limitations

- Slightly more computationally expensive
- Requires tuning of thresholds and ranking weights

---

## What Fuzzy Search Solves

Example:

Dataset:

```json
{
  "title": "Drankblikje",
  "keywords": [
    "cola",
    "coca cola",
    "pepsi",
    "fanta",
    "sprite",
    "red bull",
    "monster"
  ]
}
```

User search:

```text
cola blik
```

Result:

```text
Drankblikje
PMD
97% Match
```

Even though the exact term "cola blik" may not exist in the dataset.

---

## What Fuzzy Search Does NOT Solve

Fuse.js is **not an AI model**.

It cannot automatically infer that:

```text
cola
```

means:

```text
soft drink
```

which can be packaged as:

```text
drinks can
plastic bottle
drink carton
```

If the dataset contains only:

```json
{
  "title": "Drankblikje"
}
```

and no keywords or synonyms, Fuse.js will generally not be able to connect:

```text
cola
```

to:

```text
Drankblikje
```

This remains a data problem, not a search problem.

---

## Importance of Keywords and Synonyms

The quality of fuzzy search depends heavily on the quality of the underlying dataset.

Example:

```json
{
  "title": "Drankblikje",
  "keywords": [
    "cola",
    "coca cola",
    "pepsi",
    "fanta",
    "sprite",
    "red bull",
    "monster"
  ]
}
```

With good synonyms and keywords:

```text
cola
cola blik
monster energy
red bull
```

can all resolve to:

```text
Drankblikje
```

---

## Dataset Structure

Each waste item contains:

```ts
{
  id: string
  title: string
  fraction: string
  keywords: string[]
  synonyms: string[]
}
```

Example:

```ts
{
  id: 'drinks-can',
  title: 'Drankblikje',
  fraction: 'PMD',
  keywords: [
    'cola',
    'coca cola',
    'pepsi',
    'fanta',
    'sprite'
  ],
  synonyms: [
    'colablikje',
    'frisdrankblikje'
  ]
}
```

---

## Supported Waste Categories

The current dataset contains examples for:

### PMD

- Drink cans
- Plastic bottles
- Drink cartons
- Food trays
- Plastic packaging

### Paper & Cardboard

- Newspapers
- Magazines
- Cardboard boxes
- Paper bags
- Envelopes

### Glass

- Glass bottles
- Glass jars
- Drinking glasses
- Mirrors
- Window glass

### Residual Waste

- Diapers
- Cat litter
- Cigarette butts
- Vacuum cleaner bags
- Plastic cutlery

### Garden Waste

- Grass
- Leaves
- Branches
- Pruning waste

### Hard Plastics

- Buckets
- Storage containers
- Garden furniture
- Toys

### Wood

- Wooden furniture
- Pallets
- Wooden planks

### Electronics

- Mobile phones
- Chargers
- Household appliances
- Lamps

### Batteries

- AA batteries
- Rechargeable batteries
- Button cells
- Powerbanks

### Hazardous Waste

- Paint
- Solvents
- Chemicals
- Motor oil
- Spray cans

### Construction Waste

- Rubble
- Gypsum
- Insulation materials

---

## Match Percentage

Fuse.js returns a score between:

```text
0 = perfect match
1 = poor match
```

For presentation purposes this PoC converts the score into a user-friendly percentage:

```ts
matchPercentage = Math.round(
  (1 - score) * 100
)
```

Example:

| Fuse Score | Match Percentage |
|------------|------------------|
| 0.00 | 100% |
| 0.05 | 95% |
| 0.10 | 90% |
| 0.25 | 75% |
| 0.50 | 50% |

---

## Future Improvements

### Phase 1

- Expand synonym coverage
- Expand waste item dataset
- Improve ranking logic

### Phase 2

- Barcode recognition
- GS1 integration
- MyFost integration

### Phase 3

- Image recognition
- Packaging identification

### Phase 4

- AI-powered fallback search
- Semantic search capabilities

### Phase 5

- Personalized sorting recommendations
- Multi-modal search (text + image + barcode)

---

## Running the Project

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm dev
```

### Open Application

```text
http://localhost:3000
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Nuxt 4 | Frontend & API |
| TypeScript | Type safety |
| Fuse.js | Fuzzy search engine |
| Tailwind CSS | Styling |
| Node.js | Runtime |

---

## Conclusion

This Proof of Concept demonstrates that a combination of:

- High-quality keywords
- Well-maintained synonyms
- Fuzzy searching

can significantly improve search quality compared to traditional exact-match search approaches.

The solution remains:

- Lightweight
- Fast
- Easy to maintain
- Cost-effective

while providing a strong foundation for future enhancements such as barcode scanning, image recognition and AI-assisted search.