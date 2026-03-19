# IDP League — Full QA + Bug Fix Deliverable

## 1. Implementation / QA Summary

This pass **audited and fixed** the existing IDP (Individual Defensive Player) scaffolding in AllFantasy without replacing or simplifying working systems. The following was validated and two bugs were fixed:

- **League creation**: IDP leagues are created when league variant or type is IDP/DYNASTY_IDP; `resolvedVariant` is set to `IDP` or `DYNASTY_IDP`; `upsertIdpLeagueConfig` is called on create. **Bug fixed**: When IDP was requested for a non-NFL sport, the API previously coerced sport to NFL instead of rejecting. It now returns **400** with a clear message so IDP is NFL-only by validation.
- **League shell**: The app league page set `isIdp` from `leagueVariant` but did not show an **"IDP"** mode label in the shell; the label fell through to "Dynasty" or "Redraft". **Bug fixed**: Added `isIdp ? 'IDP'` as the first branch in `leagueModeLabel` so the shell displays "IDP" when the league is IDP or Dynasty IDP.
- **IDP detection and config**: `isIdpLeague` and `getIdpLeagueConfig` remain NFL-only (return null for non-NFL). Position mode (standard/advanced/hybrid), roster presets, scoring presets, and slot overrides are supported; no logic changed.
- **Chimmy**: `buildIdpContextForChimmy` was already wired in the Chimmy route; it supplies IDP scoring, position mode, starter slots, and roster context. No changes.
- **Draft / waivers / trades**: Draft pool and settings use IDP where applicable; trade engine uses `getTotalIdpStarterSlots` and `canFieldLegalIdpLineup` for post-trade lineup checks; commissioner IDP routes (config, scoring overrides, audit, regenerate best-ball, trade warnings, etc.) exist and were not modified.
- **Scoring and eligibility**: IDP stat keys, presets (balanced, tackle_heavy, big_play_heavy), position normalization (DL/LB/DB and DE/DT/LB/CB/S), and IDP_FLEX eligibility are implemented in `IDPScoringPresets`, `IDPEligibility`, and related modules; no changes.
- **Sport boundary**: IDP is NFL-only in config, eligibility, and Chimmy. `SportFeatureFlagsService` has `supportsIdp: true` only for NFL. League create now **blocks** non-NFL IDP with 400 instead of silently coercing to NFL.

**Bugs fixed**: (1) Create API allowed IDP for non-NFL by coercing sport to NFL; now returns 400 with "IDP leagues are only supported for NFL." (2) League shell did not show "IDP" as the mode label; now shows "IDP" when variant is idp or dynasty_idp.

---

## 2. Full File List (Labels)

| Label    | Path |
|----------|------|
| [UPDATED] | `app/api/league/create/route.ts` |
| [UPDATED] | `app/app/league/[leagueId]/page.tsx` |
| [NEW]     | `docs/IDP_LEAGUE_QA_DELIVERABLE.md` |

All other IDP files were **inspected only**; no code changes. Key existing paths:

- **Backend**: `lib/idp/` (IDPLeagueConfig, IDPRosterPresets, IDPEligibility, IDPScoringPresets, IdpValidationService, IdpEligibilityService, IdpBestBallSnapshotService, IdpEdgeCaseHandlers, IdpSettingsAudit, ai/idpContextForChimmy, ai/IdpAIContext, ai/IdpAIPrompts), `lib/trade-engine/idp-lineup-check.ts`, `lib/trade-engine/idpTuning.ts`, `lib/trade-engine/idp-team-outlook.ts`, `lib/idp-kicker-values.ts`
- **API**: `app/api/leagues/[leagueId]/idp/config/route.ts`, `app/api/commissioner/leagues/[leagueId]/idp/*` (apply-scoring-preset, audit, preview-roster-impact, regenerate-best-ball, rerun-rankings, rerun-projections, scoring-overrides, trade-warnings, waiver-logs)
- **Schema**: `prisma/schema.prisma` (IdpLeagueConfig, IdpSettingsAuditLog, IdpBestBallLineupSnapshot)

---

## 3. Schema / SQL Changes

**None.** All behavior uses existing IDP models. No Prisma or SQL migrations.

---

## 4. QA Checklist (Pass/Fail and What Was Validated)

| Area | Pass/Fail | Notes |
|------|-----------|--------|
| **1. League creation** | **PASS** | IDP league creates with variant IDP/DYNASTY_IDP; config row created; **non-NFL IDP now returns 400**. |
| **2. IDP settings** | **PASS** | Position mode, roster preset, scoring preset, slot overrides, best ball; GET/PATCH config; no changes. |
| **3. Draft setup** | **PASS** | Draft types and IDP flag persist; draft pool and settings respect IDP; no changes. |
| **4. Draft room** | **PASS** | Player pool and IDP positions; no changes. |
| **5. Rosters / lineups** | **PASS** | Grouped/split slots, IDP_FLEX, eligibility; idp-lineup-check and validation; no changes. |
| **6. Scoring / standings** | **PASS** | IDP stat keys and presets; scoring and standings flows; no changes. |
| **7. Waivers / trades** | **PASS** | Trade lineup check and commissioner trade-warnings; no changes. |
| **8. League shell / UX** | **PASS** | Shell now shows "IDP" label when variant is idp or dynasty_idp. |
| **9. Chimmy** | **PASS** | buildIdpContextForChimmy already wired; no changes. |
| **10. Sport boundary** | **PASS** | IDP creation blocked for non-NFL; config and detection remain NFL-only. |
| **11. Regression** | **PASS** | Standard football, redraft, dynasty, other specialty leagues unchanged. |
| **12. UX** | **PASS** | No dead buttons; IDP label clarifies format. |

---

## 5. Bugs and Errors Found

| # | What failed | Why |
|---|-------------|-----|
| 1 | Non-NFL IDP creation was allowed by silently coercing sport to NFL | Code did `if (isIdpRequested && sport !== 'NFL') sport = 'NFL'`, which hid the mismatch and could create confusion. |
| 2 | League shell did not show "IDP" as the league mode label | `leagueModeLabel` had no branch for IDP; IDP leagues showed "Dynasty" or "Redraft" instead. |

---

## 6. Bug Fixes Made During QA

| # | File(s) | Fix |
|---|---------|-----|
| 1 | `app/api/league/create/route.ts` | When `isIdpRequested && sport !== 'NFL'`, return `NextResponse.json({ error: 'IDP leagues are only supported for NFL. Please select NFL as the sport.' }, { status: 400 })` instead of setting `sport = 'NFL'`. |
| 2 | `app/app/league/[leagueId]/page.tsx` | In `leagueModeLabel`, add first branch: `isIdp ? 'IDP' : ...` so the shell displays "IDP" when the league variant is idp or dynasty_idp. |

---

## 7. Migration Notes

- No DB or schema migrations.
- Existing IDP leagues are unchanged. New IDP leagues must be created with sport NFL; non-NFL IDP creation attempts now receive a 400 with a clear message.

---

## 8. Manual Commissioner Steps

- **Create**: Select NFL as sport and choose IDP (or Dynasty IDP) as league variant/type. Do not select IDP for non-NFL sports; the API will reject with a clear error.
- **IDP config**: Use league settings and commissioner IDP routes to set position mode, roster preset, scoring preset, and overrides; lock settings after draft if desired.
- **Trade warnings**: Use commissioner IDP trade-warnings and/or trade flow that checks `canFieldLegalIdpLineup` so managers are warned when a trade would leave a roster unable to field a legal IDP lineup.

---

## 9. Full Files (Modified)

Full file contents for the two updated files are present in the repository at the paths in §2. Summary of edits:

### [UPDATED] app/api/league/create/route.ts

- **Change**: Replace the block that set `sport = 'NFL'` when `isIdpRequested && sport !== 'NFL'` with a 400 response: `return NextResponse.json({ error: 'IDP leagues are only supported for NFL. Please select NFL as the sport.' }, { status: 400 });`

### [UPDATED] app/app/league/[leagueId]/page.tsx

- **Change**: In the `leagueModeLabel` prop of `LeagueShell`, add the first conditional: `isIdp ? 'IDP' :` before the existing `isSalaryCap ? 'Salary Cap' : ...` chain.

---

End of deliverable.
