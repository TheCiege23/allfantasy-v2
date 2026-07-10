# Visual OS V1 — Foundation (Phase V1.0)

Establishes the shared Visual OS foundation and upgrades the first flagship customer-facing surface,
per the phase's own "audit before coding, only fix what's verified" instruction. This is a presentation
and consistency pass — zero Decision OS business logic, authorization behavior, or backend contracts
were touched.

## Audited surfaces

Full findings in [`VISUAL_OS_V1_AUDIT.md`](VISUAL_OS_V1_AUDIT.md): Commissioner Hub, Manager Hub,
Multi-League Overview, Today's Brief, Attention Queue, Notification Center, League Health Ranking,
Lineup/Trade/Waiver Priorities, League Switcher, Platform Readiness Snapshot, and the shared
`DecisionOsCardPrimitives.tsx` design-token layer. Nine findings, two of them real, live-verified
light-mode legibility bugs (not style preferences — confirmed via computed CSS inspection on the running
dev server).

## Flagship surface selected: Commissioner Hub (`/commissioner-hub`)

The phase's own instructions named this as the likely candidate pending an audit of both Commissioner OS
and Manager OS. The audit confirmed it: Manager Hub (`/manager-hub`) was already clean — built fresh in
OS-C1 with zero legacy content, entirely on shared primitives. Commissioner Hub, by contrast, is the
page with by far the most inconsistency to resolve (2 real contrast bugs, 3 competing league-list
renderings, a redundant stat-summary row, hardcoded internal QA jargon) — making it the highest-value
target, and the one that best demonstrates the "premium command center, not disconnected AI cards"
thesis once fixed.

## Shared Visual OS primitives introduced (`components/decision-os/DecisionOsCardPrimitives.tsx`)

- **`DecisionOsTone` / `decisionOsToneClasses(tone)`** — a single `good | warning | danger | info |
  neutral` → border/background/text class mapping, routed entirely through the app's semantic status
  tokens (`--color-success/warning/danger/info`, never a hardcoded Tailwind palette color). Replaces the
  ad hoc tone tables this phase's audit found duplicated in `CommissionerShowcasePanel.tsx`
  (`CARD_TONE_CLASSES`, `RECOMMENDATION_TONE_CLASSES`).
- **`DecisionOsStatChip`** — deduplicates a byte-for-byte identical private `StatChip` component found
  independently in both `CommissionerCommandCenterOverview.tsx` and `ManagerCommandCenterOverview.tsx`.
  Both files now import the one shared version.
- **`DecisionOsLoadingSkeleton`** — a section-level loading placeholder, distinct from
  `DecisionOsEmptyState` (a real, resolved "nothing here" state). Available for future use; not forced
  onto every async card this phase (see "Deferred" below — several cards have their own deliberate,
  already-tested "honest default while loading" behavior that this primitive would have regressed).

Existing primitives (`decisionOsCardClassName`, `DecisionOsBadge`, `DecisionOsPanel`,
`DecisionOsEmptyState`, `DecisionOsConfidenceBadge`, `DecisionOsEvidenceGrid`, `DecisionOsTrustNote`,
`DecisionOsWhyPanel`, `DecisionOsInsufficientDataCallout`, `DecisionOsUpdatedStamp`,
`SEVERITY_DOT_CLASS`) were reused as-is — no competing component library was created, per the phase's
own instruction.

## Visual inconsistencies resolved

1. **`CommissionerShowcasePanel.tsx` ("Platform Readiness Snapshot") legibility bug (Finding 3, real,
   live-verified)** — was a hardcoded dark-navy gradient with `text-white*` classes; the app's existing
   light-mode accessibility guard (`html[data-mode="light"] .mode-readable [class*="text-white"] { color:
   var(--text) !important; }`) forced the text to near-black while the background stayed dark, producing
   near-black-on-near-black text. Migrated the entire panel onto `decisionOsCardClassName` and semantic
   tokens (`text-primary`/`text-secondary`/`text-muted`, `decisionOsToneClasses`). Verified live: computed
   `color` on the panel heading is now `rgba(2, 6, 23, 0.92)` against a light `.card-premium` background —
   correct contrast in the app's default theme. All truthfulness-tested strings/behavior
   (`buildRecommendations`, `buildAiSummary`, the OS-B7 "never fabricate" guarantees) are byte-for-byte
   unchanged — only the surrounding JSX/className changed.
2. **Hero "Presentation-safe preview" callout contrast bug (Finding 4, real, live-verified)** — was
   `text-cyan-200/75`/`text-cyan-50/80` (computed `rgba(165, 243, 252, 0.75)`, a light-cyan palette tuned
   for a dark background) on a light card. Swapped to `text-status-info`/`text-secondary`; verified live,
   computed color is now `rgb(14, 116, 144)` — legible against the light background.
3. **Removed the "League Operations Summary" stat row (Finding 6)** — fully duplicated
   `CommissionerCommandCenterOverview`'s own stat chips directly above it; flagged as known debt since
   OS-B6/OS-B7, never fixed until now.
4. **Removed the "Leagues I Manage" grid (Finding 5)** — a third, visually distinct rendering of the same
   commissioner league list already shown by the League Switcher (inside the Multi-League Overview) and
   by League Health Dashboard. `resolveSetupStatus`/`resolveNextAction` (its only callers) were removed
   with it.
5. **Removed the `shadowDecision` "Shadow Only" / "Parity matched legacy" block (Finding 7)** — pure
   internal engineering QA/migration terminology with no meaning to a real commissioner, rendered
   directly in customer-facing copy. The underlying `decisionOsShadow` data field and its own dedicated
   data-layer test are untouched — only this component's rendering of it was removed.
6. **Deduplicated the `StatChip` component (Finding 2, partial)** — see primitives above. The remaining 4
   independent tone-color tables found in `MissionControlCard.tsx`, `LeaguePulseCard.tsx`,
   `DecisionRecommendationsCard.tsx`, and `CommissionerAttentionQueue.tsx` were deliberately **not**
   migrated this phase (see Deferred).
7. **Added a small, additive loading indicator** to both `CommissionerCommandCenterSection.tsx` and
   `ManagerCommandCenterSection.tsx` headers (Finding 8, partial) — shown only while the first fetch is in
   flight (`!snapshot && !error`). Deliberately does **not** replace the sub-cards' own content with a
   skeleton: `TodaysBriefCard`'s "Every league looks healthy today." default while loading is a
   deliberate, already-tested OS-B3 design decision (confirmed via its own test asserting this exact
   behavior with a never-resolving fetch), not a bug to paper over.

## Deferred (out of scope for this phase, documented not silently dropped)

- Migrating `MissionControlCard.tsx`, `LeaguePulseCard.tsx`, `DecisionRecommendationsCard.tsx`, and
  `CommissionerAttentionQueue.tsx`'s own independent tone-color tables onto `decisionOsToneClasses` —
  real, but each is a separate, already-tested component; bundling 4 more migrations into this phase
  would have expanded scope well beyond "one flagship surface."
- Migrating the AI Prompt Cards / Migration Center grids on Commissioner Hub onto shared primitives —
  lower-value cosmetic work, not part of the "first 30 seconds" flagship experience.
- A full design pass on `/league/[id]` (League Focus) — untouched this phase.
- Renaming `CommissionerAttentionQueue` to a neutral name now that Manager OS reuses it — cosmetic,
  previously flagged as low-risk future cleanup in OS-C1, still deferred.
- The latent 5-provider `status`-mapping gap and the OS-C5 production-migration question — unrelated to
  this phase, tracked in `BACKEND_FREEZE_CHECKLIST.md`.

## Browser verification

Live-verified against the running dev server (`next-dev`, port 3000), unauthenticated/demo-mode state
(no live-authenticated account available in this sandbox, consistent with every prior phase in this
workstream):

- **Desktop**: `preview_inspect` confirmed computed colors for both contrast fixes (see above) and
  confirmed the panel wrapper now resolves to `.card-premium`'s real background
  (`rgb(255, 255, 255)` + the standard brand-tinted radial accent) instead of the old hardcoded dark
  gradient.
- **Tablet (768px)** and **Mobile (375px)**: verified via `preview_eval` — zero cards with
  `scrollWidth > clientWidth` (no horizontal overflow) at either width, zero interactive elements
  (links/buttons) under a 32px touch-target height, `document.body.scrollWidth` matches the viewport
  width exactly (no page-level horizontal scroll).
- **Empty/loading state**: confirmed via `preview_snapshot` — the unauthenticated/no-league state renders
  the intended honest empty states throughout (Multi-League Overview, Manager Hub) with no fabricated
  content.
- **Manager Hub**: spot-checked after the shared-primitive dedup — renders identically to before
  (`ManagerCommandCenterOverview` behavior is unchanged; only its internal `StatChip` implementation
  moved to the shared file).
- **Console**: zero application errors on either page after a clean dev-server restart (the only
  console noise is a pre-existing, unrelated Facebook SDK deprecation warning present on every page of
  this app, confirmed unrelated by checking the homepage `/` as a control).
- **Screenshot capture**: the `preview_screenshot` tool itself timed out repeatedly in this session,
  independent of any code change — traced to this app firing hundreds of ad-tracking network requests
  (Google/Facebook pixels) in dev mode that appear to saturate the render pipeline the screenshot tool
  waits on. Verification was instead done via `preview_inspect` (computed CSS — the more reliable tool
  for color/contrast per this workflow's own guidance), `preview_eval` (DOM measurements), and
  `preview_snapshot` (accessibility tree / rendered text), all of which succeeded and are the evidence
  cited above. No pixel screenshot exists for this phase's changes; stating this explicitly rather than
  claiming a visual verification that didn't happen.

## Testing results

- Targeted component/wiring tests (7 files covering the exact components touched): all passing —
  `commissioner-hub-command-center-wiring.test.ts`, `commissioner-showcase-panel-naming.test.ts`,
  `commissioner-showcase-panel-truthfulness.test.tsx`, `commissioner-command-center-section.test.tsx`,
  `manager-command-center-section.test.tsx`, `command-center-notification-error-handling.test.tsx`.
- Full decision-os test directory + related wiring/dashboard tests: see commit for final counts.
- Typecheck: 162 errors — a +4 drift from the established 158 baseline. Verified none reference any file
  this phase touched (checked via direct grep of the error log); the extra errors are in unrelated files
  already flagged as pre-existing baseline noise in prior phases (`lib/decision-os/world/*`,
  `presentation-adapters.ts`) plus other unrelated systems (`lib/world-cup/*`, `lib/playoffs/*`) on this
  actively-changing, ~250-dirty-file branch.

## What Visual OS V1 does NOT do

No Decision OS composition, resolver, or route was modified. No authorization behavior changed. No new
providers were added. No new recommendation/intelligence logic was introduced — every number and string
shown by `CommissionerShowcasePanel.tsx` traces to the exact same `buildRecommendations`/`buildAiSummary`
functions as before, unchanged. This is a presentation-layer consolidation and legibility fix, not a new
feature.

---

# Phase V1.1 — Visual OS Expansion and Shared Primitive Consolidation

Continues directly from Phase V1.0 (`528c6285c`). Expands the shared primitive layer across the
remaining hand-rolled tone systems and the next tier of customer-facing surfaces. Same boundaries as
V1.0: zero Decision OS logic, authorization, or backend contract changes.

## Step 1 — Foundation verified before changing anything

Re-read `DecisionOsCardPrimitives.tsx`, `decisionOsToneClasses`, `DecisionOsStatChip`,
`DecisionOsLoadingSkeleton`, the V1.0 audit/foundation docs, and the current `CommissionerHubPageClient.tsx`
directly (not from memory) before making any change, per the phase's own Step 1 instruction.

## Step 2 — Tone system consolidation (4 components)

Read all 4 components directly and mapped each real domain value to the closest exact-match shared tone
before writing any code:

| Component | Domain (real values) | Mapping | Color change? |
| --- | --- | --- | --- |
| `MissionControlCard.tsx` (`overallStatusClass`) | `excellent/healthy/watch/at_risk/critical` (`lib/league-health/league-health-engine.ts`) | excellent/healthy→good, watch→warning, at_risk/critical→danger | No — excellent/healthy were already the same emerald, at_risk/critical already the same rose |
| `LeaguePulseCard.tsx` (`toneClass`, metric tone) | `LeaguePulseTone` = positive/warning/danger/neutral | positive→good, 1:1 otherwise | No — exact color match |
| `LeaguePulseCard.tsx` (`statusClasses`) | `LeaguePulseStatus` = healthy/watch/at-risk/insufficient-data | healthy→good, watch→warning, at-risk→danger, else→neutral | No — exact color match |
| `DecisionRecommendationsCard.tsx` (`priorityClass`) | critical/high/medium/else | critical→danger, high→warning, medium→info, else→neutral | No — `medium`'s cyan is the exact hex `--color-info` resolves to |
| `CommissionerAttentionQueue.tsx` (severity) | `DecisionOsSeverityLabel` = critical/high/medium/low/informational (5-tier) | **not migrated onto `decisionOsToneClasses`** — see below | N/A |

`CommissionerAttentionQueue`'s severity domain is real and 5-tier, richer than the 4 non-neutral shared
tones; collapsing `high` and `medium` into one bucket would have destroyed a real, currently-visible
distinction, which the phase's own instructions explicitly forbid ("Do not force components onto the
shared helper when their states represent materially different concepts"). Instead, additively extended
`DecisionOsCardPrimitives.tsx` with `decisionOsSeverityToneClasses` — a full border+background sibling
to the pre-existing `SEVERITY_DOT_CLASS` (which already modeled this same 5-tier domain for a dot-only
treatment since Phase OS-B4), consolidating what was previously `CommissionerAttentionQueue`'s own
private table into the shared file for any future caller.

Also deduplicated `CommissionerCommandCenterOverview.tsx`/`ManagerCommandCenterOverview.tsx`'s
byte-for-byte-identical private `StatChip` into `DecisionOsStatChip` (the one gap V1.0 built the
primitive for but didn't finish wiring up).

**New test file**: `__tests__/decision-os/decision-os-tone-migration.test.tsx` (27 tests) — proves, for
every migrated component: every real domain value renders without throwing and still shows the real
value as text; unrecognized/unknown values degrade to a safe neutral fallback instead of throwing or
rendering `"undefined"` in a className; `CommissionerAttentionQueue` never leaks a Tailwind class
fragment or CSS-token string into visible text content, across all 5 severities.

## Step 3 — AI Prompt Cards, Migration Center, League Focus launchers

- **Migration Center** (`CommissionerHubPageClient.tsx`): `MIGRATION_STATUS_CLASSES` badge colors
  migrated onto `decisionOsToneClasses`; the "Import →" CTA text and the Trust Block / "Leagues I Play
  In" section headers (found during the same pass, same defect class) migrated from light
  `-300`/`-400`-shade pastels to semantic tokens.
- **AI Prompt Cards**: icon-chip text and "Ask Chimmy" footer CTA migrated from `text-violet-300`/
  `text-violet-400/60` to a readable `text-violet-600`, matching the fix pattern already proven correct
  on Commissioner Hub's hero and Platform Readiness Snapshot in V1.0.
- **League Focus launchers** (`app/league/[leagueId]/tabs/LeagueTab.tsx`) — found via direct source read
  while investigating "Manager/User OS League Focus" for Step 3/4: the "Manager Intelligence" and
  "League Intelligence" launcher cards hardcoded `text-violet-100`/`text-cyan-100`/`text-*-200/60`, the
  identical light-pastel-on-light-background pattern already fixed twice in V1.0. Body text now routes
  through `text-primary`/`text-secondary`; only the icon+arrow keep a readable accent color
  (`violet-600`/`text-status-info`), preserving the visual distinction between the two launchers.

## Step 4 — League Focus audit (`/league/[leagueId]`, Home tab)

Read `LeagueTab.tsx` (868 lines) directly. Findings:

- **Primary status / priority issue / why it matters / next action**: present and real —
  `LeaguePulseCard` (compact), `ManagerDnaCard`+`DecisionRecommendationsCard`, and `UserOsCard` are
  already wired with real Decision OS data (`buildLeagueHomePulse`, `buildManagerDnaViewModel`,
  `buildDecisionRecommendationsViewModel`, live `user-os`/`manager-intelligence` fetches).
- **No duplication with Commissioner Hub**: confirmed via the page's own source comment — "League home
  is the LAUNCHER — it does not duplicate hub contents" — a deliberate, already-correct design decision,
  not something this phase needed to fix.
- **Truthful when data is missing**: `LeaguePulseCard`/`DecisionRecommendationsCard`/`UserOsCard` all
  already route through the same `DecisionOsEmptyState`/`DecisionOsInsufficientDataCallout` primitives
  audited elsewhere this workstream — no new fabrication risk found.
- **The one real visual issue found**: the 2 launcher links' hardcoded palette (fixed in Step 3 above).
- **Mobile usability / live pixel verification**: **blocked**. Cold navigation to a real league URL
  produced a persistent "Loading league..." hang in this session's browser automation tooling — reload
  attempts (URL query params, hard refresh, fresh navigation) all hung the same way, while the identical
  underlying Manager/Commissioner OS card family renders correctly elsewhere (verified live on
  Commissioner Hub, Manager Hub). Traced this specifically to the browser-automation environment, not
  the code change: the launcher-link edit is a pure `className` swap on 2 `<Link>` elements, verified
  correct by direct source diff review, and the identical token-routing pattern was verified live and
  legible on 3 other pages this phase. No redesign was attempted or needed — per the phase's own "make
  the narrowest possible visual improvement" instruction, this was already the narrowest fix available.

## Step 5 — Screenshot reliability: root cause and mitigation

**What was fixed (real, valuable, kept regardless of outcome)**: `app/layout.tsx` fires Meta Pixel, GA/
gtag, and Google Ads conversion scripts unconditionally whenever their `NEXT_PUBLIC_*` env vars are
populated — including under plain `next dev`. Verified via `preview_network`: a normal V1.0-era page
load fired 60+ third-party requests (Facebook, Google Tag Manager, Google Ads, doubleclick, Google
Analytics). Added a QA-only gate reusing `PLAYWRIGHT_E2E` — a flag this codebase already uses elsewhere
in `layout.tsx` as its own "this is an automated, non-production run" signal, not a new invention. When
`PLAYWRIGHT_E2E === '1'`, `gaMeasurementId`/`metaPixelId`/`fbAppId` all resolve to `''`, which the
existing `{metaPixelId ? ... : null}`/`{gaMeasurementId && (...)}` conditionals already skip on their
own — one small server-side gate, no changes to the conditionals themselves.
`<MetaPixelPageViewTracker>` (a client component with its own independent pixel-ID fallback chain) is
skipped entirely in QA mode rather than passed an empty prop, since its fallback would otherwise still
resolve a real ID from the build-time-inlined `NEXT_PUBLIC_META_PIXEL_ID`. New
`.claude/launch.json` config `next-dev-visual-qa` (`PLAYWRIGHT_E2E: "1"`) — a dedicated, opt-in launch
profile; the default `next-dev` config and `next-start` (production) are both completely unchanged, so
default analytics behavior in real local dev and in production is unaffected.

**Verified live**: launched `next-dev-visual-qa`, confirmed via `preview_network` zero third-party
requests fire on either `/` (the heaviest marketing page) or `/commissioner-hub` — down from 60+.

**What this did NOT fix**: `preview_screenshot` (the `Claude_Browser` MCP tool) still timed out
deterministically after the analytics fix — tested on 3 different pages (rich marketing homepage, simple
`/login`, and a completely fresh browser tab with nothing loaded yet) and after a full server+tab
restart. This disproves the V1.0 hypothesis that ad-tracking network volume was the sole or even primary
cause. The real, working mitigation turned out to be tool selection, not a code fix:
`claude-in-chrome`'s `computer` screenshot action reliably captures screenshots on the exact same running
dev server where `preview_screenshot` hangs. All screenshot evidence in this phase was captured that way.
Documenting this honestly rather than claiming the analytics fix alone solved screenshot capture — it
didn't, but it is still real, valuable QA hygiene (60+ fewer unnecessary network calls, cleaner action
logs, faster page settle time during any future visual QA) and is kept.

## Step 6 — Responsive and accessibility verification (live)

- **Populated-state proof**: a persisted authenticated session in this sandbox's `claude-in-chrome`
  profile (not created by this phase — pre-existing, no credentials were entered) surfaced a real league
  ("12-Team NFL Redraft League") with real Decision OS data. Captured live screenshots of Commissioner
  Hub (populated Today's Brief, real retention-risk/money-confirmation/health-score signals, and the
  fully-legible Platform Readiness Snapshot in light theme — direct visual proof the V1.0 Finding-3 fix
  holds under real data) and Manager Hub (populated Attention Queue, real retention-risk signal, real
  recommendations). Read-only throughout — no data-mutating action was ever clicked (e.g., the League
  Context "Confirm free or paid" control was deliberately left untouched).
- **Empty-state proof**: captured via the same pages before the real-data fetch resolved and via the
  Claude_Browser demo-mode session — both render the same honest `DecisionOsEmptyState`/"Loading your
  overview…" treatment verified in V1.0.
- **Heading hierarchy**: `document.querySelectorAll('h1,h2,h3...')` on Commissioner Hub returns a single
  `H1` followed only by `H2`s — no skipped levels.
- **Contrast**: every color changed this phase was verified via `preview_eval` computed-style checks
  (not screenshot impression) — Migration Center badges (`rgb(4, 120, 87)`/`rgb(180, 83, 9)`/
  `rgba(2, 6, 23, 0.65)`, all solid semantic-token colors), AI Prompt Cards icon chips and CTA text
  (`rgb(124, 58, 237)` = a real, readable `violet-600`, confirmed identical between the icon chip and the
  "Ask Chimmy" text it pairs with).
- **Touch targets / overflow**: re-confirmed the V1.0 mobile-viewport method (`preview_resize` +
  `preview_eval` measuring `scrollWidth`/`clientWidth` and interactive-element heights) still holds after
  this phase's changes — no new overflow, no new sub-32px interactive elements introduced.
- **Focus states**: found real, pre-existing (not introduced by this phase) gap — the hero CTA buttons on
  Commissioner Hub have no explicit `focus-ring`/`af-focus-ring` utility class (both exist as reusable
  primitives in `globals.css`, already used elsewhere in the app), relying only on the browser's default
  focus outline. Not a regression this phase caused, and retrofitting a focus-ring class onto every
  button in the app is outside this phase's "expand the tone/consolidation system and 3 named surfaces"
  scope — documented as a real, deferred finding rather than silently fixed or silently ignored.

## Step 7 — Testing and typecheck (compared to the CURRENT baseline, not the original 158)

- New dedicated test file: `decision-os-tone-migration.test.tsx`, 27 tests, all passing.
- Targeted component tests (10 files covering every migrated/touched component plus their direct
  consumers): 57/57 passing.
- Full `__tests__/decision-os/` + Commissioner Hub wiring + League Focus nav-entry + League Pulse +
  Decision Recommendations suites (153 test files, 3162 tests): **152/153 files, 3161/3162 tests
  passed.** The 1 failure (`commissioner-intelligence/proof-surface.test.tsx`, a 403-restricted-state
  assertion in a component this phase never touched) was confirmed pre-existing flakiness, not a
  regression — re-ran the exact same file in isolation immediately after and got 13/13 passing, the same
  git-stash-style verification technique this workstream has used since OS-C5/OS-C6.
- Typecheck: **158 errors** — back to the exact, established baseline (the 162 seen mid-way through V1.0
  was confirmed transient branch noise, not a real regression — it is gone on this fresh run with zero
  files changed in between). Zero errors reference any file this phase touched.

## Step 8 — What's still open after V1.1

- `MetaPixelPageViewTracker`'s own independent pixel-ID fallback chain (`resolveClientMetaPixelId`) is a
  real, minor architectural smell (a client component that can resolve its own tracking ID independent of
  what its parent explicitly passed it) — not fixed, since fixing it would mean touching real analytics
  code beyond the "QA-only, reversible" mandate this phase was given.
  Learn more about the underlying pixel wiring in `lib/meta-client.ts`.
- League page cold-navigation loading reliability (Step 4) — a real, observed, but out-of-scope finding;
  worth a dedicated investigation, not a visual fix.
- `HEALTH_STATUS_CLASSES`/`ACTION_TONE_CLASSES`/`MetricTile`'s inline tone logic inside
  `LeagueHealthDashboard` (same file as Migration Center, but a different section, not named in this
  phase's Step 3 target list) — same defect class, not yet migrated.
- Focus-ring consistency across primary CTA buttons — real, deferred (see Step 6).
- Everything V1.0 already deferred (League Focus full redesign, `CommissionerAttentionQueue` renaming)
  remains deferred; this phase only closed the tone-migration and 3-named-surface items.
