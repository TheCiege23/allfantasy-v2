# Redraft Players + Waivers Deep Build

## Scope

This pass begins Step 3 of the Redraft Backbone Sprint for NFL and NCAAF redraft leagues. It does not run provider writes, touch production data, modify env files, or change non-redraft league behavior except through shared player/waiver components already used by the redraft shell.

## What Existed Before

- The redraft league shell already mounted Players and Waivers tabs with `PlayersTab` and `SportAwareWaiverWire`.
- The waiver wire already loaded settings, pending claims, claim history, waiver runs, FAAB balance, waiver priority, commissioner insights, and AI recommendation panels.
- Waiver claim create/edit/cancel routes existed with commissioner-scoped claim visibility.
- Waiver processing already supported deterministic FAAB and priority resolution, transactions, idempotency keys, commissioner/manual processing, and cron-compatible execution.
- The available-player API already excluded rostered players, used canonical NFL identity/projection context where available, and returned unified player rows for NFL/NCAAF.
- Watchlist state existed locally in the waiver wire UI.
- Redraft War Room and Chimmy routes already had waiver-aware deterministic recommendation surfaces.

## What Was Missing

- Player rows looked closer to transport data than a finished product surface.
- Headshot and team-logo fallbacks were not consistently explicit, increasing risk of broken media states.
- ADP, AF ADP, projections, stats, bye week, and source labels were not surfaced together on waiver/player rows.
- NCAAF limited-data states were not obvious enough in the waiver UI.
- Search/filter/sort was tied too closely to the initial server payload and defaulted to name sorting instead of fantasy value.
- Large player lists had no explicit render guard.
- Waiver claim mutation errors were mostly message-only responses, making client UX mapping brittle.

## What Was Fixed

- Added richer waiver/player row presentation with player name, position color, team badge/logo fallback, injury/status, projection, ADP, AF ADP, bye, rank, rostered percent, recent trend, source labels, stats summary, Compare, Watch, and Claim/Pending actions.
- Reused the safe `PlayerHeadshot` fallback chain and added a local team-logo fallback badge so missing media never renders a broken image icon.
- Added source and data-quality labels:
  - Provider ADP
  - AF ADP
  - AF ADP coming soon
  - Projection source
  - Fallback projection
  - Missing ADP
  - Missing stats
  - Limited confidence
  - NCAAF limited data
- Added season-stat summaries only when normalized stats exist. Missing stats are labeled instead of invented.
- Expanded waiver filter/sort support to include on-waivers, free agents, injured, rostered, projection, ADP, rank, ownership, and recent activity.
- Changed default waiver sort to projected points so the first screen is fantasy-value oriented.
- Increased initial player fetch to 200 rows, then added local search/filter/sort plus a 120-row render guard to avoid painting the entire world on every keystroke.
- Added deferred search input handling so local typing does not repeatedly reprocess immediately.
- Added structured waiver claim error codes for create/edit/cancel paths, including `CLAIM_EXISTS`, `CLAIM_NOT_FOUND`, `WAIVER_CLOSED`, `INVALID_FAAB`, `INSUFFICIENT_FAAB`, `DROP_REQUIRED`, `INVALID_DROP`, `PLAYER_UNAVAILABLE`, `PLAYER_LOCKED`, `UNAUTHORIZED`, and `VALIDATION_FAILED`.
- Added regression coverage for complete player data, media fallbacks, NCAAF limited data, source labels, local player-list filtering/sorting, render guardrails, and duplicate waiver claim rejection.

## Remaining Work

- Full free-agent add/drop hardening should get its own slice: open-roster adds, required-drop selection, optimistic rollback, transaction feed proof, and the full structured error set for add/drop routes.
- War Room waiver recommendations need a dedicated pass for best add, best drop, injury replacement, bye-week replacement, streamer, stash, FAAB suggestion, confidence labels, and illegal transaction exclusion.
- Chimmy waiver/player context needs a dedicated prompt/context pass for legal available players, pending claims, FAAB, priority, source labels, and NCAAF limited-data explanations.
- AF ADP remains a product foundation follow-up. This pass displays AF ADP when present and a clear "coming soon" label when absent.
- Player media quality depends on existing provider/headshot/logo availability. This pass adds polished fallbacks but does not backfill media.
- NCAAF CFBD/provider parity remains limited. The UI now degrades clearly instead of pretending projections/stats exist.
- Deep waiver settings UX, mobile Playwright coverage, and commissioner waiver processing UX polish remain follow-ups.

## Manual Smoke Checklist

- Open an NFL redraft league and navigate to Players.
- Confirm player rows show position colors, player fallback/media, team badge/logo, projection, ADP, AF ADP state, bye, rank, trend, source labels, and CTAs.
- Search by a known player name and confirm the list filters locally without a full shell reload.
- Filter by position and confirm only matching players remain.
- Sort by projection, ADP, rank, ownership, recent, name, team, and position.
- Open Waivers and confirm available players exclude rostered players.
- Open a claim drawer for an available player and confirm FAAB/drop fields remain usable.
- Try submitting a duplicate claim in a test league and confirm the UI can map `CLAIM_EXISTS`.
- Open an NCAAF redraft league and confirm player rows render with limited-data labels when projections/stats/media are unavailable.
- Confirm large lists show a render-limit note rather than rendering every player row at once.
- Confirm draft-room start/pause/resume performance did not regress after opening Players/Waivers.

## Production Safety Notes

- No provider syncs were run.
- No provider write mode was run.
- No production database writes were made.
- No env files were changed or staged.
- The render guard is client-side only and does not alter player eligibility.
- Rostered-player exclusion remains server-side in the existing waiver players API.
- Missing stats, ADP, projections, injuries, headshots, and logos are labeled or rendered with fallbacks; this pass does not fabricate data.
