# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Personal study workspace for the **iOS final exam (May 9, 2026, 14:00–16:45)**. Not a shipping product. Two halves of the exam drive the structure:

- **Written (closed book, 45 min)** — Output Prediction, Code Improvement, View Decomposition
- **Practical (open book, 120 min)** — extend/refactor a starter SwiftUI app, graded via unit tests

Topics 01–05 follow class slides: Swift basics, SwiftUI layout, State & interaction, Lists & navigation, API & AppStorage. Topics 06–08 are the written-exam-only categories.

`instruction.md` (English) and `instruction-Thai.md` (original) hold the official exam brief — re-read before changing scope.

## Repository layout

```
exercise/    Q&A flashcard markdown (source for the drill site)
knowledge/   concise reference notes per topic (01–05)
learn/       longer walkthrough notes per topic (01–05)
site/        Astro + React + Tailwind app that renders all of the above
swift/       Xcode playground + Swift Playgrounds iOS app for hands-on practice
```

Three content directories drive the site; the site is generated, never hand-edited under `site/src/data/`.

## site/ — the drill app

Astro 6 + React 19 + Tailwind v4. Node ≥ 22.12.

```bash
cd site
pnpm install
pnpm dev         # rebuilds cards.json + pages.json + search-index.json then runs astro dev (localhost:4321)
pnpm build       # same prebuild step, then static build to dist/
pnpm preview     # preview the built site
```

Package manager is **pnpm** (lockfile: `pnpm-lock.yaml`). Don't run `npm install` — it will create a competing `package-lock.json`.

`predev` / `prebuild` automatically run `build-cards.mjs`, `build-pages.mjs`, and `build-search.mjs`. If you edit markdown under `exercise/`, `knowledge/`, or `learn/` while `astro dev` is already running, **restart it** — Astro won't re-run those Node scripts on file change.

### Build pipeline

- `scripts/build-cards.mjs` reads `../exercise/exercises-NN-*.md` → writes `src/data/cards.json`. It splits on `## Section X` headers, then on `### Q1` / `### A1` style headers, and pairs the prompt markdown with the markdown inside `<details><summary>Answer</summary>…</details>`. Code blocks are pre-rendered with highlight.js. **A card without a `<details>` block is silently dropped.**
- `scripts/build-pages.mjs` reads `../knowledge/NN-*.md` and `../learn/NN-*.md` → writes `src/data/pages.json` keyed by 2-digit slug. Only slugs present in its `TOPIC_LABEL` map (`01`–`05`) are emitted; topics 06–08 are exercise-only.
- `scripts/build-search.mjs` reads the just-built `src/data/pages.json`, strips HTML to plain text, and writes `public/search-index.json` (one entry per knowledge/learn/mock page) — consumed by the Cmd+K palette via `fetch('/search-index.json')` on first open. Must run after `build-pages.mjs`.
- Topic code → label mapping is duplicated in `build-cards.mjs`, `build-pages.mjs`, and `DrillDeck.tsx` (`TOPIC_SHORT`). Keep all three in sync when adding a topic.

### Routes

- `/` — `DrillDeck` (active-recall flashcards from `cards.json`, hide-by-default, persists progress + topic filters in `localStorage` under `drill-progress-v1` / `drill-filters-v1`). Keyboard: Space reveal/next, J prev, K next, 1 got, 2 review, S shuffle.
- `/knowledge/` and `/knowledge/[slug]` — rendered from `pages.json.knowledge`
- `/learn/` and `/learn/[slug]` — rendered from `pages.json.learn`
- The sidebar (`src/layouts/Sidebar.astro`) is the global shell; pages opt in by wrapping their body in `<Sidebar title=… active=…>`. It also mounts `<CommandPalette client:load />` so Cmd/Ctrl+K opens a Fuse.js fuzzy search across all knowledge/learn/mock pages on every route.

## Authoring content

### Flashcards (`exercise/exercises-NN-*.md`)

Filename must match `^exercises-(\d{2})-.*\.md$` where `NN ∈ {01..08}`. Inside:

```markdown
## Section A — <human label>

### Q1

<prompt markdown, including ```swift code blocks```>

<details><summary>Answer</summary>

<answer markdown>
</details>
```

Card id is `NN-<sectionLetter>-<questionId>` (e.g. `01-A-Q3`). Question id can be `Q1` or `A1` (any single letter + digits). The summary text is stripped — don't put answer content in `<summary>`.

### Knowledge / Learn pages

Filename must match `^(\d{2})-.*\.md$` with `NN ∈ {01..05}`. Plain markdown, rendered with `marked` + highlight.js. Empty files render as `<p>(empty)</p>` rather than failing the build.

## swift/ — hands-on practice

- `playground.playground` — open `playground.xcworkspace` in Xcode for a scratch Swift REPL (`Contents.swift`).
- `prepare.swiftpm` — Swift Playgrounds iOS app project (iOS 16+, Swift 6). Open in Swift Playgrounds or Xcode. `MyApp.swift` is the `@main` entry, `ContentView.swift` is the root view.

There is no shared build/test runner across `swift/` — each subproject is opened in its native tool.

## Working notes

- All content (markdown + Swift) is written in a mix of Thai and English. Don't translate unless asked; mirror whichever language the surrounding context uses.
- This is a private repo (no `.git` here, no remote). No CI, no formatter config — match the existing tone and let prettier/format-on-save handle whitespace.
- `site/src/data/*.json` are build artifacts. Don't edit by hand and don't commit changes to them as the "fix" for a content bug — fix the source markdown and rebuild.
