# Supplemental Draft — Prompt 2 of 4: API Routes

## PREREQUISITE
Run Prompt 1 first and confirm `feat(supplemental-draft-p1)` is deployed and READY.

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  lib/supplemental-draft/types.ts
  lib/supplemental-draft/assetPoolBuilder.ts
  lib/supplemental-draft/SupplementalDraftEngine.ts
  lib/orphan-ai-manager/orphanRosterResolver.ts
  lib/subscription/featureGating.ts
  lib/subscription/requireEntitlement.ts
  app/league/[leagueId]/tabs/LeagueSettingsTab.tsx
  prisma/schema.prisma

══════════════════════════════════════════════════════
STEP 1 — ORPHANED TEAMS DETECTION API
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/orphaned-teams/route.ts

GET — authenticated, commissioner only

Response: {
  orphanedTeams: {
    rosterId: string
    teamName: string
    playerCount: number
    draftPickCount: number
    faabRemaining: number
    assets: SupplementalAsset[]
  }[]
  orphanCount: number
  hasActiveSuppDraft: boolean
  activeSuppDraftId: string | null
  canAdvertise: boolean       // always true if orphanCount >= 1
  canAssignAI: boolean        // always true if orphanCount >= 1
  canRunSuppDraft: boolean    // orphanCount >= 2 AND has subscription
  suppDraftGated: boolean     // true if not subscribed
}

Logic:
  1. Auth + verify commissioner
  2. getOrphanRosterIdsForLeague(leagueId)
  3. For each orphan roster: fetch team data + asset preview
  4. Check subscription via requireEntitlement('commissioner_supplemental_draft')
  5. Return full response

══════════════════════════════════════════════════════
STEP 2 — COMMISSIONER OPTIONS APIS
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/orphaned-teams/advertise/route.ts
POST — commissioner only
Body: { rosterIds: string[] }
  1. Mark teams as seeking manager (isAdvertised: true on roster settings)
  2. Create FindLeagueListing records for find-a-league feed
  3. Post announcement to league chat
  4. Return: { advertised: N }

Create app/api/leagues/[leagueId]/orphaned-teams/assign-ai/route.ts
POST — commissioner only
Body: { rosterId: string; aiManagerType: 'season_long' | 'until_claimed' }
  1. Update roster: aiManaged: true, aiManagerType
  2. Set platformUserId = 'ai-manager-{rosterId}'
  3. Return: { updated: true }

══════════════════════════════════════════════════════
STEP 3 — SUPPLEMENTAL DRAFT CORE ROUTES
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/supplemental-draft/route.ts

GET: Returns active supplemental draft state or null
  SupplementalDraftEngine.getActiveDraftForLeague(leagueId)

POST — commissioner + entitlement gate:
  1. requireEntitlement('commissioner_supplemental_draft') → 402 if ungated
  2. Verify isDynasty OR leagueVariant in dynasty variants
  3. Verify orphanCount >= 2 (hard block)
  4. Verify no active supplemental draft running
  5. buildAssetPoolFromRosters() + createDraft()
  6. Return draft state

──────────────────────────────────────────────────────

Create app/api/leagues/[leagueId]/supplemental-draft/[draftId]/start/route.ts
POST — commissioner only:
  SupplementalDraftEngine.startDraft(draftId, userId)

──────────────────────────────────────────────────────

Create app/api/leagues/[leagueId]/supplemental-draft/[draftId]/pick/route.ts
POST — participant only, must be their turn:
  Body: { assetId: string }  // 'PASS' to pass
  SupplementalDraftEngine.makePick(draftId, rosterId, assetId)

──────────────────────────────────────────────────────

Create app/api/leagues/[leagueId]/supplemental-draft/[draftId]/pass/route.ts
POST — participant or commissioner override:
  Body: { rosterId: string; remove?: boolean }
  remove: true = commissioner removing pass (restores manager to draft)
  SupplementalDraftEngine.passManager(draftId, rosterId, remove)

──────────────────────────────────────────────────────

Create app/api/leagues/[leagueId]/supplemental-draft/[draftId]/state/route.ts
GET — any authenticated league member:
  Returns SupplementalDraftState
  Frontend polls this every 5 seconds

──────────────────────────────────────────────────────

Create app/api/leagues/[leagueId]/supplemental-draft/[draftId]/complete/route.ts
POST — commissioner only (force complete):
  SupplementalDraftEngine.completeDraft(draftId)

══════════════════════════════════════════════════════
STEP 4 — ASSET POOL PREVIEW API
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/supplemental-draft/preview/route.ts

POST — commissioner only:
  Body: { sourceRosterIds: string[] }
  Builds preview WITHOUT creating a draft.
  Response: {
    assets: SupplementalAsset[]
    playerCount: number
    draftPickCount: number
    totalFaab: number
    totalAssets: number
    suggestedRounds: number
    suggestedPicksPerRound: number
  }

══════════════════════════════════════════════════════
STEP 5 — LEAGUE DOWNSIZING API
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/downsize/route.ts

POST — commissioner + entitlement gate:
  Body: {
    newTeamCount: number
    teamReassignments: {
      fromRosterId: string
      toRosterId: string | null  // null = add to supp draft pool
    }[]
  }
  1. requireEntitlement('commissioner_supplemental_draft')
  2. Validate newTeamCount < current leagueSize
  3. Apply reassignments (move manager+players or mark for pool)
  4. Update league.leagueSize to newTeamCount
  5. Return: { dissolved: N, readyForSuppDraft: true, sourceRosterIds }

══════════════════════════════════════════════════════
FINAL STEPS — PROMPT 2
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL type errors
2. git add -A
3. git commit -m "feat(supplemental-draft-p2): orphaned-teams detection API, advertise + AI manager routes, supplemental draft CRUD routes (create/start/pick/pass/state/complete), asset pool preview, league downsizing API"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash
```
