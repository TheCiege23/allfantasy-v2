# Supplemental Draft — Prompt 1 of 4: Schema + Engine + Types

## FEATURE OVERVIEW
Adds a supplemental draft system for dynasty/salary-cap/devy/C2C leagues when:
- **Scenario A**: 2+ managers leave (orphaned teams)
- **Scenario B**: League downsizes (e.g., 16 teams → 12)

Assets from dissolved teams are pooled into a draft board. New/remaining managers draft them.
This is an **AF Commissioner** gated feature.

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  lib/orphan-ai-manager/orphanRosterResolver.ts
  app/orphan-teams/OrphanTeamsClient.tsx
  app/orphan-teams/page.tsx
  lib/live-draft-engine/DraftSessionService.ts
  lib/live-draft-engine/auction/AuctionEngine.ts
  lib/workers/draft-worker.ts
  prisma/schema.prisma
  components/subscription/SubscriptionGateModal.tsx
  hooks/useSubscriptionGate.ts
  lib/subscription/featureGating.ts
  lib/subscription/types.ts
  app/league/[leagueId]/tabs/LeagueSettingsTab.tsx

══════════════════════════════════════════════════════
CONTEXT: HOW SUPPLEMENTAL DRAFTS WORK
══════════════════════════════════════════════════════

A supplemental draft pools all orphaned/dissolved team assets
and lets managers draft them like a normal live draft.

SCENARIO A — Orphaned teams (2+ managers leave):
  All assets from orphaned rosters go into the pool.
  New managers who join to fill orphaned spots participate.
  Example: 3 orphaned teams × 30 total assets
    → 3 managers in draft, 10 rounds (30 ÷ 3)

SCENARIO B — League downsizing (e.g., 16 → 12 teams):
  Commissioner re-assigns remaining managers.
  4 dissolved teams' assets go to the pool.
  All 12 remaining managers participate.
  Rounds = ceil(total dissolved assets ÷ 12)

ASSET RULES:
  - Players → claimed manager's roster
  - Draft picks → claimed manager (traded values FROZEN, never change)
  - FAAB → LOST if unclaimed (not transferable between managers)
  - Unclaimed players → waivers
  - Unclaimed picks → FAAB bid auction for non-participants
  - Traded pick originalOwnerRosterId NEVER changes

PASS BUTTON:
  Any manager can Pass at any time → skipped for ALL remaining picks
  Commissioner can remove Pass status for any manager
  If ALL managers pass → draft auto-completes

══════════════════════════════════════════════════════
STEP 1 — SCHEMA
══════════════════════════════════════════════════════

READ prisma/schema.prisma fully. Then add:

model SupplementalDraft {
  id                    String   @id @default(cuid())
  leagueId              String
  scenario              String   // 'orphan_teams' | 'league_downsizing'
  status                String   @default("pending")
  // pending | configuring | in_progress | completed | cancelled

  participantRosterIds  String[]
  passedRosterIds       String[] @default([])
  draftOrder            String[]
  currentPickIndex      Int      @default(0)
  totalRounds           Int      @default(0)
  picksPerRound         Int      @default(0)
  sourceRosterIds       String[]
  assetPool             Json     @default("[]")
  orderMode             String   @default("randomized")
  draftType             String   @default("linear")
  pickTimeSeconds       Int      @default(120)
  autoPickOnTimeout     Boolean  @default(true)
  createdByUserId       String
  startedAt             DateTime?
  completedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  league  League                @relation(fields: [leagueId], references: [id])
  picks   SupplementalDraftPick[]

  @@index([leagueId])
  @@index([status])
}

model SupplementalDraftPick {
  id                    String   @id @default(cuid())
  supplementalDraftId   String
  pickNumber            Int
  round                 Int
  pickInRound           Int
  rosterId              String
  assetType             String?  // 'player' | 'draft_pick' | 'faab' | null
  assetId               String?
  assetDisplayName      String?
  isPassed              Boolean  @default(false)
  pickedAt              DateTime?

  supplementalDraft SupplementalDraft @relation(fields: [supplementalDraftId], references: [id])

  @@unique([supplementalDraftId, pickNumber])
  @@index([supplementalDraftId, rosterId])
}

Add relation to League model if not present:
  supplementalDrafts SupplementalDraft[]

Run: npx prisma migrate dev --name add_supplemental_draft

══════════════════════════════════════════════════════
STEP 2 — TYPES
══════════════════════════════════════════════════════

Create lib/supplemental-draft/types.ts

export type SupplementalScenario = 'orphan_teams' | 'league_downsizing'
export type SupplementalAssetType = 'player' | 'draft_pick' | 'faab'

export type SupplementalAsset = {
  id: string
  assetType: SupplementalAssetType
  sourceRosterId: string
  // Player
  playerId?: string
  playerName?: string
  playerPosition?: string
  playerTeam?: string
  // Draft pick
  pickId?: string
  pickRound?: number
  pickYear?: number
  originalOwnerRosterId?: string  // FROZEN — never changes
  tradedToRosterId?: string
  pickLabel?: string
  isTradedPick?: boolean
  // FAAB
  faabAmount?: number
  // Status
  claimedByRosterId?: string | null
  claimedAt?: string | null
  isAvailable: boolean
}

export type SupplementalDraftConfig = {
  leagueId: string
  scenario: SupplementalScenario
  sourceRosterIds: string[]
  participantRosterIds: string[]
  orderMode: 'randomized' | 'commissioner_set'
  manualOrder?: string[]
  pickTimeSeconds: number
  autoPickOnTimeout: boolean
}

export type SupplementalDraftState = {
  id: string
  leagueId: string
  scenario: SupplementalScenario
  status: 'pending' | 'configuring' | 'in_progress' | 'completed' | 'cancelled'
  participantRosterIds: string[]
  passedRosterIds: string[]
  draftOrder: string[]
  currentPickIndex: number
  totalRounds: number
  picksPerRound: number
  assetPool: SupplementalAsset[]
  sourceRosterIds: string[]
  picks: {
    pickNumber: number
    round: number
    pickInRound: number
    rosterId: string
    assetType?: string
    assetId?: string
    assetDisplayName?: string
    isPassed: boolean
    pickedAt?: string
  }[]
  currentRosterId: string | null
  currentPickNumber: number
  isComplete: boolean
  startedAt: string | null
  completedAt: string | null
}

══════════════════════════════════════════════════════
STEP 3 — ASSET POOL BUILDER
══════════════════════════════════════════════════════

Create lib/supplemental-draft/assetPoolBuilder.ts

export async function buildAssetPoolFromRosters(
  leagueId: string,
  sourceRosterIds: string[]
): Promise<{
  assets: SupplementalAsset[]
  totalCount: number
  playerCount: number
  draftPickCount: number
  faabCount: number
  totalFaab: number
}>

For each sourceRosterId:
  1. READ schema to find how players are stored (RosterPlayer relation)
     Add each player as assetType: 'player'
  2. READ schema for traded/future picks model
     CRITICAL: isTradedPick flag is preserved, originalOwnerRosterId FROZEN
     Add each pick as assetType: 'draft_pick'
  3. If faabRemaining > 0:
     Add as assetType: 'faab' with faabAmount
     NOTE: FAAB is LOST if unclaimed — document clearly

══════════════════════════════════════════════════════
STEP 4 — SUPPLEMENTAL DRAFT ENGINE
══════════════════════════════════════════════════════

Create lib/supplemental-draft/SupplementalDraftEngine.ts

export class SupplementalDraftEngine {

  static async createDraft(config, commissionerUserId):
    1. Build asset pool
    2. Calculate rounds: ceil(totalAssets / participantCount)
    3. Set draft order (randomized or manual)
    4. Store in DB as SupplementalDraft status='configuring'

  static async startDraft(draftId, commissionerUserId):
    1. Verify status === 'configuring'
    2. Set status='in_progress', startedAt=now

  static async makePick(draftId, rosterId, assetId):
    1. Verify it's this roster's turn
    2. If assetId === 'PASS': add to passedRosterIds, create pass pick
    3. Else: mark asset claimed, create pick record
    4. Advance currentPickIndex (skip passed managers)
    5. Check end conditions → call completeDraft if done

  static async passManager(draftId, rosterId, commissionerOverride):
    Add/remove from passedRosterIds
    If commissionerOverride: REMOVE (restore to draft)

  static async completeDraft(draftId):
    1. Set status='completed'
    2. Assign claimed assets to winning rosters
    3. Handle unclaimed:
       - Players → waivers
       - FAAB → zero out (lost)
       - Draft picks → create FAAB bid auction for non-participants

  static async getDraftState(draftId)
  static async getActiveDraftForLeague(leagueId)
}

══════════════════════════════════════════════════════
STEP 5 — SUBSCRIPTION FEATURE ID
══════════════════════════════════════════════════════

UPDATE lib/subscription/featureGating.ts (READ first)
UPDATE lib/subscription/types.ts (READ first)

Add to SubscriptionFeatureId:
  'commissioner_supplemental_draft'

Add gate definition:
  label: 'Supplemental Draft'
  description: 'Run a supplemental draft for orphaned teams or league downsizing.'
  requiredPlanId: 'commissioner'
  highlightParam: 'supplemental_draft'

══════════════════════════════════════════════════════
FINAL STEPS — PROMPT 1
══════════════════════════════════════════════════════

1. npx prisma migrate dev --name add_supplemental_draft
2. npx tsc --noEmit — fix ALL type errors
3. git add -A
4. git commit -m "feat(supplemental-draft-p1): schema (SupplementalDraft + SupplementalDraftPick), types, assetPoolBuilder, SupplementalDraftEngine, commissioner_supplemental_draft subscription gate"
5. git push origin main
6. Confirm Vercel build READY
7. Report commit hash
```
