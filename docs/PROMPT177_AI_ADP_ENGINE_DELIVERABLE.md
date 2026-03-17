# PROMPT 177 — AllFantasy AI ADP Engine Deliverable

## Overview

Universal **AI ADP** system that:
- Updates from actual draft behavior (live drafts + completed mock drafts) across the app
- Can feed the draft room when the commissioner enables **AI ADP** per league
- Segments by **sport**, **league type** (redraft/dynasty), and **format** (default, ppr, half-ppr, sf, standard)
- Surfaces **low-sample** and **unavailability** so the UI never silently fails

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Schema & Migration

### Model: `AiAdpSnapshot`

- **Table:** `ai_adp_snapshots`
- **Unique:** `(sport, leagueType, formatKey)`
- **Fields:**
  - `id`, `sport`, `leagueType`, `formatKey`
  - `snapshotData` (JSON array of `{ playerName, position, team, adp, sampleSize, lowSample }`)
  - `totalDrafts`, `totalPicks`, `computedAt`, `meta` (optional: minSampleSize, lowSampleThreshold, segmentLabel)
- **Indexes:** `sport`, `computedAt`

### Migration

- **File:** `prisma/migrations/20260347000000_add_ai_adp_snapshots/migration.sql`
- **Apply:** `npx prisma migrate deploy` (or fix any existing schema issues and run `migrate dev`)

---

## Scheduled Job (Daily)

- **Endpoint:** `POST /api/cron/ai-adp`
- **Auth:** `x-cron-secret` or `x-admin-secret` header (e.g. `LEAGUE_CRON_SECRET` or `BRACKET_ADMIN_SECRET` / `ADMIN_PASSWORD`)
- **Body (optional):** `{ "since": "ISO date", "lowSampleThreshold": 5 }`
- **Behavior:** Aggregates live + mock draft picks, computes ADP per segment, upserts `AiAdpSnapshot`.

**Daily scheduler options:**
- **Vercel Cron:** Add to `vercel.json` a cron that calls this URL daily at the desired time with the secret in headers.
- **External cron:** e.g. `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://your-domain/api/cron/ai-adp`.

---

## API Routes

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| POST | `/api/cron/ai-adp` | Cron/Admin secret | Run AI ADP job (aggregate + compute + persist). |
| GET | `/api/ai-adp` | Session | Get AI ADP for segment: `?sport=&leagueType=&formatKey=&limit=` |
| GET | `/api/leagues/[leagueId]/ai-adp` | Can access league draft | Get AI ADP for league context + `enabled` from draft UI settings. Used by draft room. |
| GET | `/api/admin/ai-adp/diagnostics` | Admin session | List segments, last `computedAt`, totals, entry counts. |

---

## Service Usage

- **Engine:** `lib/ai-adp-engine/`
  - `runAiAdpJob(since?, lowSampleThreshold)` — run full job (cron).
  - `getAiAdp(sport, leagueType, formatKey)` — get snapshot for segment.
  - `getAiAdpForLeague(sport, isDynasty, formatKey?)` — best-match for league (exact → default format → redraft default).
- **Segmentation:** Sport (from `SUPPORTED_SPORTS`), leagueType (redraft/dynasty), formatKey (from league settings or mock metadata).
- **Low sample:** Entries with `sampleSize < lowSampleThreshold` get `lowSample: true`; threshold default 5.

---

## Player List / Draft Room Integration

- **Draft UI setting:** Commissioner enables **AI ADP** via draft settings (`draft_ai_adp_enabled` → `DraftUISettings.aiAdpEnabled`).
- **Draft room:** When `aiAdpEnabled`:
  - Fetches `GET /api/leagues/[leagueId]/ai-adp` and merges AI ADP into player entries (`aiAdp`, `aiAdpSampleSize`, `aiAdpLowSample`).
  - Sort by ADP uses **AI ADP** when enabled (fallback to standard ADP when no snapshot or per-player).
  - **UI:** Shows “AI ADP” badge when enabled; “AI ADP data not ready” when enabled but no snapshot; “Low sample” when any entry has low sample.
  - **Refresh:** AI ADP is refetched on the same interval as draft session/settings (e.g. every 8s when AI ADP is on).
- **No silent failure:** If AI ADP is unavailable, message is shown and standard ADP / sort controls remain usable (no dead controls).

**Files:**
- `components/app/draft-room/DraftRoomPageClient.tsx` — fetches league AI ADP, merges into `players`, passes `aiAdpUnavailable` / `aiAdpLowSampleWarning` to `PlayerPanel`.
- `components/app/draft-room/PlayerPanel.tsx` — shows AI ADP badge, unavailable message, low-sample warning; sorts by `aiAdp ?? adp` when `useAiAdp`; per-row ⚠ for `aiAdpLowSample`.

---

## Admin Diagnostics

- **GET /api/admin/ai-adp/diagnostics** (admin session): Returns `segments` (sport, leagueType, formatKey, computedAt, totalDrafts, totalPicks, entryCount) and a short `summary` (totalSegments, sports list).

---

## QA Checklist

- [ ] **Commissioner:** Enable AI ADP in draft settings for a league; enter draft room. “AI ADP” badge is visible; player order uses AI ADP when snapshot exists.
- [ ] **Commissioner:** Disable AI ADP; player order uses standard ADP; no AI ADP badge.
- [ ] **No snapshot:** With AI ADP enabled but no snapshot for that segment, “AI ADP data not ready” (or similar) is shown; sort by ADP still works (standard ADP); no silent failure or dead sort.
- [ ] **Low sample:** For a segment with few drafts, “Low sample” warning appears; individual players with low sample show ⚠; ordering still works.
- [ ] **Refresh:** After cron runs or new draft data exists, refresh draft room (or wait for poll); ordering/display updates when new AI ADP data loads.
- [ ] **Sort controls:** ADP and Name sort buttons always work; no dead controls when AI ADP is off or unavailable.
- [ ] **Admin:** GET `/api/admin/ai-adp/diagnostics` returns segments and summary when logged in as admin.
- [ ] **Cron:** POST `/api/cron/ai-adp` with valid secret returns `segmentsUpdated` / `totalPicksProcessed`; without secret returns 401.

---

## Files Touched (Summary)

- **Schema:** `prisma/schema.prisma` (AiAdpSnapshot)
- **Migration:** `prisma/migrations/20260347000000_add_ai_adp_snapshots/migration.sql`
- **Engine:** `lib/ai-adp-engine/` (types, aggregate-draft-picks, compute-adp, AiAdpService, index)
- **Cron:** `app/api/cron/ai-adp/route.ts`
- **API:** `app/api/ai-adp/route.ts`, `app/api/leagues/[leagueId]/ai-adp/route.ts`, `app/api/admin/ai-adp/diagnostics/route.ts`
- **Draft room:** `components/app/draft-room/DraftRoomPageClient.tsx`, `components/app/draft-room/PlayerPanel.tsx`
