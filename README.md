# Polytopo Human

A choice-driven identity narrative web game exploring how human identity is shaped by environment, upbringing, and context. Players make choices across life stages; the game builds a psychological and sociological profile from every decision.

Built with SvelteKit 5, Tailwind CSS v4, and plain JSON — no backend.

---

## Concept

Every choice you make accumulates trait scores across five opposing axes:

| Axis          | ↔              |
| ------------- | -------------- |
| Otoritas      | Kebebasan      |
| Kolektivisme  | Individualisme |
| Spiritualitas | Rasionalisme   |
| Tradisi       | Kemajuan       |
| Konformitas   | Pemberontakan  |

At the end, your accumulated scores resolve into one of eight identity archetypes — from *Pilar Desa* to *Jiwa Bebas* to *Sang Pencari*.

Story stages are grounded in Indonesian cultural contexts: village politics, gotong royong, pengajian, family hierarchy, urban/rural tension, and religious identity.

---

## Stack

- **SvelteKit 5** with Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **TypeScript** — strict mode, fully typed
- **Tailwind CSS v4**
- **localStorage + JSON** — no backend required

---

## Project Structure

```text
src/
  lib/
    engine/
      gameEngine.ts         # node traversal, trait accumulation, session management
      traitCalculator.ts    # pair balance, dominant trait scoring
    stores/
      gameStore.svelte.ts   # Svelte 5 runes-based singleton store + localStorage
    data/
      nodes/
        childhood.json      # original story (village head's child, Java)
        *.json              # one file per additional story
      stories.json          # story registry: id, title, premise, start node
      traits.json           # 10 trait definitions + 8 archetype profiles
    types/
      game.ts               # all TypeScript interfaces
  routes/
    +page.svelte            # main game view — narrative + choices + stage progress
    summary/
      +page.svelte          # profile reveal — trait bars, path replay, session export
    stories/
      +page.svelte          # story picker
    +layout.svelte
    layout.css
```

---

## Node Schema

Content is fully decoupled from the engine. Add nodes to any JSON file and load them — no engine changes required.

```json
{
  "id": "node_c001",
  "stage": "childhood",
  "text": "Narrative text here.",
  "tags": ["keluarga", "komunitas"],
  "choices": [
    {
      "id": "choice_c001a",
      "text": "Choice text.",
      "next": "node_c002",
      "traits": { "authority": 1, "collectivism": 1 }
    },
    {
      "id": "choice_c001b",
      "text": "Another choice.",
      "next": null,
      "traits": { "freedom": 1, "individualism": 1 }
    }
  ],
  "isEnding": false
}
```

`next: null` signals end of game and triggers the summary screen. Use `condition` on a choice to gate it behind a trait threshold:

```json
{
  "condition": { "trait": "rationalism", "min": 3 }
}
```

---

## Session Export

Every completed session can be exported as anonymized JSON for future aggregation:

```json
{
  "sessionId": "uuid",
  "startedAt": "ISO timestamp",
  "completedAt": "ISO timestamp",
  "pathTaken": ["node_c001", "node_c003", "node_c006"],
  "choicesMade": ["choice_c001c", "choice_c003a", "choice_c006a"],
  "finalTraits": { "individualism": 5, "freedom": 4, "progress": 3 },
  "finalProfile": "Jiwa Bebas"
}
```

---

## Developing

Requires Node.js ≥ 20 (a `bun.lock` is committed; `bun install` / `bun run dev` work too).

```sh
npm install
npm run dev
```

Type check:

```sh
npm run check
```

Validate story data (unique ids, valid traits, resolvable links, reachable endings):

```sh
npm run validate
```

Production build:

```sh
npm run build
npm run preview
```

---

## Stories

Besides the original village story, the game includes stories from Bugis Sulawesi, Peranakan Semarang, a Deaf child in Jakarta, Flores, Pattani (Thailand), a Jakarta riverbank settlement, Dayak Kaharingan Kalimantan, Tamil Malaysia and a Mexican-American family in Texas. Indonesian is the default; every story, profile and UI string also has an English translation.

## Languages

The game supports Indonesian (`id`, default) and English (`en`). The language comes from the saved choice, otherwise the browser language, and can be switched with the toggle on every page. The choice is stored in `localStorage`, and `<html lang>` follows it.

- Indonesian text lives in the node files; English text lives in parallel files keyed by the same ids:
  `src/lib/data/en/nodes/<story>.json` (`{ "<nodeId>": { "text": "...", "choices": { "<choiceId>": "..." } } }`),
  plus `en/stories.json`, `en/profiles.json`, `en/traits.json`, `en/tags.json`.
- UI strings are in `src/lib/i18n/ui.ts`.
- Session exports always use the canonical Indonesian profile name.

### Adding a translation

Add the matching entries under `src/lib/data/en/` (same node and choice ids, same structure) and run `npm run validate`. It fails on any missing translation or structural mismatch. To add a new language, add it to `ui.ts` and add a parallel data folder.

## Adding Content

1. Add a new `src/lib/data/nodes/<story>.json` (all files in that folder are loaded automatically)
2. Register it in `src/lib/data/stories.json` with its start node
3. Add the English text under `src/lib/data/en/` (see Languages)
4. Run `npm run validate`
5. Add new profiles to `traits.json` under `"profiles"`

The engine handles everything else — no code changes needed for new narrative content.
