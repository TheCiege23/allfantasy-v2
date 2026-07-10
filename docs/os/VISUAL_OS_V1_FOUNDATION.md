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

---

# Phase V1.2 — Visual OS Consistency Completion

Continues directly from Phase V1.1 (`1d8ef08ac`, doc fixup `bce972a96`). Same boundaries: zero Decision
OS logic, authorization, or backend contract changes.

## Step 1 — Foundation verified before changing anything

Confirmed branch (`g15-event-foundation`) and the last 5 commits directly via `git log` before touching
anything. Re-read `DecisionOsCardPrimitives.tsx` in full (not from memory) and `LeagueHealthDashboard`'s
real current source, per the phase's own Step 1 instruction. Established typecheck baseline: 158 (the
same number every phase in this workstream has confirmed).

## Step 2 — League Health tone consolidation

Read `HEALTH_STATUS_CLASSES`, `ACTION_TONE_CLASSES`, and `MetricTile`'s inline tone logic directly, then
compared each real domain to `decisionOsToneClasses`'s 4 non-neutral buckets before writing code:

| Table | Domain | Result |
| --- | --- | --- |
| `HEALTH_STATUS_CLASSES` | `OverallStatus` (5-tier: excellent/healthy/watch/at_risk/critical) | **Not a safe 4-tone migration** — this table used 5 genuinely distinct colors (healthy=cyan ≠ excellent=emerald; at_risk=orange ≠ critical=rose), unlike `MissionControlCard`'s own version of the same domain (V1.1), where those pairs were already identical colors. Additively extended the primitives with `decisionOsHealthStatusToneClasses`. |
| `ACTION_TONE_CLASSES` | `CommissionerHealthActionTone` (standard/warning/danger) | Clean 1:1 match onto `decisionOsToneClasses` (neutral/warning/danger) |
| `MetricTile` | local (neutral/good/warn) | Clean 1:1 match onto `decisionOsToneClasses` (neutral/good/warning) |

While migrating `HEALTH_STATUS_CLASSES`, found the same recurring light-pastel contrast-risk pattern
(text-`-300` shades) already fixed 3 times in V1.0/V1.1 — fixed it the same way this time too (`-600`
shades), keeping the 5 distinct hues (a contrast fix, not a semantic change, consistent with the phase's
"preserve exact meaning, existing thresholds" instruction — hue = meaning, shade = legibility).

`ACTION_TONE_CLASSES`'s per-tone hover treatment (`hover:bg-amber-500/[0.13]` etc.) was replaced with one
generic, tone-agnostic `hover:brightness-95` — a small simplification, not a meaning change (still 3
visually distinct hover states, since the base tone colors differ).

**New tests**: extended `decision-os-tone-migration.test.tsx` with 3 new tests for
`decisionOsHealthStatusToneClasses` (5-distinct-color proof, readable-shade proof, safe-fallback proof).
New `commissioner-hub-league-health-tone-consolidation.test.ts` (4 tests, source-scan convention
matching `commissioner-hub-command-center-wiring.test.ts`, since `CommissionerHubPageClient.tsx` is not
fully rendered in tests) proves the old private tables are actually gone and the real usage sites call
the new shared primitives.

## Step 3 — Shared focus-ring primitive

Found the codebase already has not one but **two** competing focus-ring utility classes:
`.focus-ring:focus-visible` (already adopted 20+ times across dashboard/referral/subscription
components) and `.af-focus-ring:focus-visible`/`.af-control:focus-visible` (zero current usages).
Investigated both rather than assuming — found `.af-focus-ring`/`.af-control` were **completely
non-functional in the app's default light theme**: a later, duplicate `:root` block in `globals.css`
redefines the shared `--focus-ring` custom property to an `outline`-shaped value
(`2px solid rgba(34, 211, 238, 0.5)`), which is invalid syntax when consumed as `box-shadow` (what both
broken classes did) and silently computes to `none`. Verified live by creating a real focused DOM element
and reading its computed `box-shadow` (`"none"`, confirmed the bug). `.focus-ring` was unaffected because
it already consumed the variable as `outline`, the shape it's actually defined as.

**Decision**: formalized `.focus-ring` — the already-correct, already-widely-adopted class — as the ONE
shared focus-ring primitive for Decision OS surfaces, rather than fixing `af-focus-ring` and asking
components to switch to it. This is both lower-risk (zero chance of regressing the 20+ existing usages)
and more consistent with "reuse what already works" than introducing a second, freshly-fixed option.
Also fixed the broken `.af-focus-ring`/`.af-control` classes anyway (real bug, zero usages so zero
regression risk, good hygiene for any future adopter) by switching both to `outline`, matching the value
shape `--focus-ring` is actually defined as.

**Adoption** — added `.focus-ring` to every genuinely "primary CTA" / real keyboard-interactive element
across the named surfaces:
- Commissioner Hub: hero "Create a League"/"Sign In" and "Import League" buttons; empty-state CTAs;
  `CommissionerActionLink` (League Health Dashboard's real per-league action links).
- Manager Hub: hero "Sign In" button.
- League Focus (`LeagueTab.tsx`): the 2 Decision OS launcher links (already touched for color in V1.1).
- League switchers: `CommissionerLeagueSwitcher.tsx` and `ManagerLeagueSwitcher.tsx` list items (both
  previously had ZERO focus-visible styling at all).
- Primary recommendation action: `LeaguePulseCard.tsx`'s "Continue" next-action button.
- Alert/action rows: `NotificationCenter.tsx`'s "Mark read" and "Dismiss" buttons.

Deliberately did NOT add focus styling to non-interactive elements (e.g. `CommissionerAttentionQueue`'s
list items and `MissionControlCard`'s retention-risk list items are static `<li>`s with no href/onClick —
correctly excluded).

**New Finding 11 (deferred, not fixed)**: found the Commissioner Hub empty-state CTAs use
`text-amber-300` — yet another instance of the recurring light-pastel contrast pattern — while adding
focus-ring to the same buttons. Not fixed this phase (Step 3's scope was focus-ring, not another
contrast sweep); documented rather than silently expanded into or silently ignored.

**New test file**: `focus-ring-adoption.test.tsx` (4 tests) proves `.focus-ring` is actually present on
the real rendered elements in `CommissionerLeagueSwitcher`, `ManagerLeagueSwitcher`, `NotificationCenter`
(both buttons), and `LeaguePulseCard`'s Continue button — not just documented as intended.

## Step 4 — League Focus cold-navigation investigation: root-caused

Reproduced the V1.1 finding and root-caused it via real dev-server logs (`preview_logs`), not
speculation. The evidence is unambiguous:

```
GET /api/i18n/translations?lang=en          200 in 89667ms
GET /api/i18n/translations?lang=en          200 in 89657ms
GET /api/auth/session                       200 in 90426ms
GET /api/subscription/entitlements...       200 in 80114ms
GET /api/decision-os/manager-intelligence   200 in 23979ms
✓ Compiled /api/user/roster-legality-summary in 84.2s
```

`/api/i18n/translations` — a static JSON lookup with no database dependency — took **89–90 seconds**.
This alone proves the slowness has nothing to do with League Focus's own code, its data-fetch pattern, or
any Suspense/loading-boundary logic: a route that does none of those things was exactly as slow. The
pattern held across multiple, completely unrelated pages (dashboard, homepage, login, League Focus) and
routes (i18n, auth session, subscription entitlements, Decision OS manager-intelligence) throughout this
session — a session-wide resource/network condition, not a route-specific or page-specific one.

Checked `app/league/[leagueId]/loading.tsx` directly: it's a standard, correctly-implemented Next.js App
Router `loading.tsx` special file — the "Loading league…" text is Next.js's own automatic fallback,
shown while the server component's `Promise.all` of 6 parallel Prisma queries (already parallelized,
already a good pattern) resolves. This is not a bug in the loading boundary; it is a boundary correctly
waiting on a genuinely (in this session) slow response.

**Determination: sandbox/session-specific environmental slowness, not a code defect** — not a
route/data-fetch race, not an authorization/session hydration issue, not a suspense/loading-boundary
issue. Per the phase's own instruction ("If it is not reproducible outside the sandbox, document the
evidence and leave production code unchanged"), zero code changes were made to the league page's data
loading logic. This does not rule out that `/api/subscription/entitlements`'s 80-second response time
specifically might be worth investigating in a real, non-sandboxed environment someday (an unrelated,
narrower observation) — but that is a distinct, separate question from "is League Focus's own code
broken," which this investigation answers: no.

## Step 5 — Visual QA (live, real data, real environment conditions)

Live-verified with real populated data (the same persisted, pre-existing authenticated session from
V1.1 — no credentials entered) across Commissioner Hub and Manager Hub: real Today's Brief content,
real Notification Center entries (4 real notifications, Mark read/Dismiss buttons present), real League
Health Dashboard content (found via `claude-in-chrome`'s `find` tool: "78/100 health score, 45/100
engagement score" — real data flowing through the newly-migrated `decisionOsHealthStatusToneClasses`).
Verified `.focus-ring` is present on real rendered hero CTAs (`Sign In`, `Create a League`) via computed
DOM inspection.

**Screenshot capture was significantly hampered this phase by extreme, real, verified environmental
slowness** (see Step 4 — the same 15–90 second response times affected screenshot/eval tooling directly,
not just the app). Both `preview_screenshot` and `claude-in-chrome`'s screenshot action timed out
intermittently during this phase, consistent with — and additional evidence for — the Step 4 finding.
Where screenshots timed out, verification fell back to `find`/computed-style/DOM inspection (all of which
succeeded), consistent with the honest-evidence discipline established in V1.0/V1.1. League Focus's own
live render could not be confirmed visually this phase for the same reason (confirmed via direct source
diff and the same token-routing pattern working live elsewhere instead — see V1.1's Step 4 note, still
accurate).

## Step 6 — Testing and typecheck (compared against the CURRENT baseline)

- Targeted tests for all Step 2/3 changes (9 files): 70/70 passing.
- New test files: `decisionOsHealthStatusToneClasses` tests (3, added to `decision-os-tone-migration.test.tsx`),
  `commissioner-hub-league-health-tone-consolidation.test.ts` (4), `focus-ring-adoption.test.tsx` (4).
- Full `__tests__/decision-os/` + Commissioner Hub wiring + League Health consolidation + Commissioner
  Intelligence + League Pulse + Decision Recommendations suites (155 test files, 3173 tests): **155/155
  files, 3173/3173 tests passing — fully clean, zero flaky failures this run** (a pre-existing flake in
  `commissioner-intelligence/proof-surface.test.tsx`, unrelated to this phase, was observed once during
  an earlier isolated run of the same day's V1.1 work and did not recur here).
- Typecheck: **158** — the exact established baseline, confirmed with zero errors referencing any file
  this phase touched.

## Step 7 — What's still open after V1.2

- Commissioner Hub empty-state CTAs' `text-amber-300` (Finding 11, found this phase, deferred).
- `/api/subscription/entitlements`'s 80-second response time — worth investigating separately in a
  real (non-sandboxed) environment; not established as a real production issue by this phase's evidence,
  since the SAME session showed similarly extreme latency on a route with zero business logic
  (`/api/i18n/translations`).
- `CommissionerAttentionQueue`'s severity domain, `MissionControlCard`'s `OverallStatus` domain, and
  `LeagueHealthDashboard`'s `OverallStatus` domain now each have their own additive primitive
  (`decisionOsSeverityToneClasses`, the `MissionControlCard`-specific 4-tone collapse, and
  `decisionOsHealthStatusToneClasses` respectively) — a real, pre-existing, deliberately-preserved
  inconsistency (the same `healthy` status renders as emerald in one card and cyan in another). Not
  unified this phase per "preserve exact meaning, existing thresholds"; a future phase could decide
  whether to unify the 2 different `OverallStatus` treatments deliberately, as an explicit product
  decision rather than an incidental refactor.
- Everything V1.0/V1.1 already deferred remains deferred.
