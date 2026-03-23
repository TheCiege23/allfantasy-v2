# Prompt 50 — AI Sports Media Engine (Deliverable)

## 1. Media Engine Architecture

- **Core orchestration:** `lib/sports-media-engine/LeagueMediaEngine.ts`
  - `generateArticle(input)` resolves league/sport context, runs AI generation, persists `MediaArticle`.
  - `listArticles(input)` supports league/sport/tag filtering + cursor pagination.
  - `getArticleById(articleId, leagueId)` returns league-scoped detail.
- **Context builders:**
  - `RecapGenerator` builds standings/season highlights for recap-style stories.
  - `PowerRankingGenerator` builds ranking-focused context and top-team highlights.
- **Narrative pipeline:** `NarrativeBuilder`
  - DeepSeek => stat bullets (`getStatisticalInsights`).
  - Grok => tone hints (`getNarrativeToneHints`).
  - OpenAI => final human-readable article (`buildArticle`).
- **Persistence layer:** Prisma `media_articles` table (headline/body/tags/sport/league/date).
- **Sport scope compliance:** all sport resolution/filtering uses `isSupportedSport` / `normalizeToSupportedSport` from `lib/sport-scope.ts` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).

---

## 2. Schema Additions

- `MediaArticle` (`prisma/schema.prisma`, `@@map("media_articles")`)
  - `id` (cuid primary key)
  - `leagueId`
  - `sport`
  - `headline`
  - `body`
  - `tags` (JSON, default `[]`)
  - `createdAt`
- Indexes: `leagueId`, `(leagueId, sport)`, `createdAt`.
- Migration present: `prisma/migrations/20260324000000_add_media_articles/migration.sql`.

---

## 3. AI Workflow Logic

- **Generation path:**
  1) Resolve league + sport (explicit sport if provided, else league sport fallback).
  2) Build type-specific context (recap/rankings generators).
  3) Optional DeepSeek statistical insights.
  4) Optional Grok narrative tone hints.
  5) OpenAI composes final headline + body.
  6) Persist article with `tags: [type]`.
- **Roles by model:**
  - DeepSeek: quantitative highlights.
  - Grok: narrative voice guidance.
  - OpenAI: final polished article output.
- **Failure behavior:**
  - DeepSeek/Grok failures are non-fatal (steps are skipped).
  - OpenAI/config errors gracefully return a fallback article payload, which is still persisted.

---

## 4. UI Integration

- **League News tab:** `components/app/tabs/NewsTab.tsx`
  - sport/type filters, refresh, generate controls, article cards.
  - Uses `hooks/useMediaArticles.ts` for list + cursor pagination (`Load more` button).
  - Generate request now forwards selected sport.
- **Article detail page:** `app/app/league/[leagueId]/news/[articleId]/page.tsx`
  - headline/body/tags/date display, share button, back link, `#ai-explanation` section.
  - Hash deep-link auto-scroll for AI explanation section.
  - Share feedback differentiates `Shared!` vs `Copied!`.
- **Routes:**
  - `GET /api/leagues/[leagueId]/media`
  - `POST /api/leagues/[leagueId]/media`
  - `GET /api/leagues/[leagueId]/media/[articleId]`

---

## 5. UI Audit Findings

| Surface | Interaction | Result |
|---|---|---|
| News tab | sport filter | Refetches list with validated/normalized sport; works. |
| News tab | type filter | Refetches list with validated tags; works. |
| News tab | Refresh | Triggers reload; works. |
| News tab | Generate article | Calls POST; returns article and refreshes list; works. |
| News tab | article links | Navigates to detail page; works. |
| News tab | AI explanation link | Opens article with `#ai-explanation`; scroll target works. |
| News tab | cursor pagination | `Load more` button appears when `nextCursor` exists; loads next page. |
| Article page | Share button | Uses native share when available, clipboard fallback otherwise; status text accurate. |
| Article page | Back to News | Returns to league tab state (`?tab=News`); works. |
| API | data loading paths | list/detail/generate endpoints wired and returning expected shapes. |

---

## 6. QA Results

- `npm run typecheck` => pass.
- `npx vitest run "__tests__/media-routes-contract.test.ts"` => pass (5/5 tests).
- Route contract coverage includes:
  - list filter forwarding + sport normalization.
  - invalid sport/tag rejection.
  - POST auth + league membership enforcement.
  - POST payload validation + normalized sport/week forwarding.
  - article detail scoping/404 behavior.

---

## 7. Fixes

- Added optional Grok tone pass in `NarrativeBuilder` to align with required model-role split.
- Hardened OpenAI error path to avoid hard failures when API config/calls fail.
- Fixed generation sport fallback by resolving to league sport when request sport is absent.
- Hardened media POST route with auth + league membership check to prevent abuse.
- Added list query validation (invalid sport/tag now returns 400).
- Improved article list pagination behavior and exposed cursor-based `Load more` in UI.
- Improved article detail fetch error handling and explanation hash-scroll UX.
- Fixed share feedback copy so native-share does not incorrectly show `Copied!`.

---

## 8. Checklist

- [x] News tab filters, refresh, and generation controls wired.
- [x] Media list/detail endpoints wired to UI and loading correctly.
- [x] Share button works with native share/clipboard fallback.
- [x] AI explanation links navigate and focus explanation section.
- [x] Article type and sport filters validated server-side.
- [x] Sport handling supports all platform sports through `sport-scope`.
- [x] Route contracts added and passing for list/generate/detail.
- [x] Typecheck passes after changes.
- [ ] Manual browser click-pass across all article types in a populated league (recommended final smoke pass).

---

## 9. Explanation

The AI Sports Media Engine turns league standings and season context into automated media coverage. For each requested story type, it builds structured context, optionally enriches with DeepSeek stats and Grok tone guidance, then uses OpenAI to render readable article copy. Every article is persisted with sport/type metadata so the News tab can filter, paginate, and deep-link into a stable article page. The pipeline is sport-aware across all supported sports, and generation APIs are validated + permission-scoped to league participants.
