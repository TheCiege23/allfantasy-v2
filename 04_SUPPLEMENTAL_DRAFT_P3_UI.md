# Supplemental Draft — Prompt 3 of 4: UI + Draft Settings Integration

## PREREQUISITE
Prompts 1 and 2 must be deployed and READY before running this prompt.

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  app/orphan-teams/OrphanTeamsClient.tsx
  app/orphan-teams/page.tsx
  app/league/[leagueId]/tabs/LeagueSettingsTab.tsx
  lib/supplemental-draft/types.ts
  components/subscription/SubscriptionGateModal.tsx
  components/subscription/PremiumGate.tsx
  hooks/useSubscriptionGate.ts
  hooks/useEntitlements.ts
  components/draft/LotteryReveal.tsx

══════════════════════════════════════════════════════
STEP 1 — ORPHANED TEAMS COMMISSIONER PANEL
══════════════════════════════════════════════════════

UPDATE app/orphan-teams/OrphanTeamsClient.tsx

READ fully. Replace/augment the commissioner options panel.

Show when orphanCount >= 1 — three option cards:

CARD 1 — Advertise:
  📢 Advertise to Find-a-League
  Description: "Post these teams so new managers can claim them"
  [Checkboxes for each orphaned team]
  [Post to Find-a-League] button
  → calls /api/leagues/{id}/orphaned-teams/advertise

CARD 2 — AI Manager:
  🤖 Assign AI Manager
  Description: "AI manages until human takes over, or full season"
  [Checkboxes for each orphaned team]
  [For season / Until claimed] toggle
  [Assign AI Manager] button
  → calls /api/leagues/{id}/orphaned-teams/assign-ai

CARD 3 — Supplemental Draft (AF Commissioner gated):
  🏈 Supplemental Draft

  STATE A — orphanCount < 2:
    Greyed out, pointer-events-none
    "Requires 2+ orphaned teams (currently: {N})"

  STATE B — orphanCount >= 2 but not subscribed:
    Border: border-amber-500/20
    Show SubscriptionGateBadge + description
    [View AF Commissioner Plans →] button
    → opens SubscriptionGateModal with 'commissioner_supplemental_draft'

  STATE C — orphanCount >= 2 AND subscribed:
    Border: border-cyan-500/20 bg-cyan-500/[0.03]
    "✓ {N} orphaned teams — {totalAssets} assets available"
    [Set Up Supplemental Draft →]
    → navigates to /league/{leagueId}/supplemental-draft/setup

Implementation:
  const { hasCommissioner } = useEntitlements()
  const { gate, close, state } = useSubscriptionGate()
  const canRunSuppDraft = orphanCount >= 2 && hasCommissioner

══════════════════════════════════════════════════════
STEP 2 — DRAFT SETTINGS TAB SECTION
══════════════════════════════════════════════════════

UPDATE app/league/[leagueId]/tabs/LeagueSettingsTab.tsx

READ fully. Find draft settings section.

Add "Supplemental Draft" section inside draft settings.
ONLY show for dynasty/devy/c2c/salary-cap leagues.

  const DYNASTY_VARIANTS = ['dynasty', 'devy', 'c2c', 'salary_cap', 'dynasty_bestball']
  const isDynastyLeague = league.isDynasty ||
    DYNASTY_VARIANTS.includes(league.leagueVariant?.toLowerCase() ?? '')

  {isDynastyLeague && (
    <div className={[
      'rounded-xl border p-4 mt-4',
      orphanCount < 2 ? 'border-white/[0.06] opacity-50 pointer-events-none'
        : !hasCommissioner ? 'border-amber-500/20 bg-amber-500/[0.03]'
        : 'border-cyan-500/20 bg-cyan-500/[0.03]'
    ].join(' ')}>

      <h4 className="text-sm font-bold text-white">🏈 Supplemental Draft</h4>
      <p className="text-xs text-white/50 mt-0.5">
        For orphaned teams or league downsizing.
      </p>

      {orphanCount < 2 && (
        <p className="text-xs text-white/30 mt-2">
          🔒 Requires 2+ orphaned teams. Currently: {orphanCount}.
        </p>
      )}

      {orphanCount >= 2 && !hasCommissioner && (
        <div className="mt-3">
          <SubscriptionGateBadge
            featureId="commissioner_supplemental_draft"
            onClick={() => gate('commissioner_supplemental_draft')}
          />
          <button
            onClick={() => gate('commissioner_supplemental_draft')}
            className="mt-2 text-xs text-amber-300 hover:text-amber-200"
          >
            View AF Commissioner Plans →
          </button>
        </div>
      )}

      {orphanCount >= 2 && hasCommissioner && (
        <>
          <p className="text-xs text-green-400 mt-2">
            ✓ {orphanCount} orphaned teams — {totalAssets} assets available
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => router.push(`/league/${leagueId}/orphan-teams`)}>
              Manage Orphaned Teams
            </button>
            <button onClick={() => router.push(`/league/${leagueId}/supplemental-draft/setup`)}>
              Set Up Supplemental Draft →
            </button>
          </div>
        </>
      )}
    </div>
  )}

══════════════════════════════════════════════════════
STEP 3 — SETUP PAGE (Multi-Step Flow)
══════════════════════════════════════════════════════

Create app/league/[leagueId]/supplemental-draft/setup/page.tsx

STEP 1 — Choose Scenario:
  [Orphaned Teams] [League Downsizing]
  Info panel explaining each

STEP 2 — Select Source Teams:
  Orphaned: checkboxes for all orphaned teams (auto-select all)
  Downsizing: league size selector + reassignment UI

STEP 3 — Preview Asset Pool:
  Calls POST /supplemental-draft/preview
  Shows:
    Players: [count] [list]
    Draft Picks: [count] [list, mark traded picks with badge]
    FAAB: [total] — ⚠️ "FAAB is lost if unclaimed"
    Calculated: {rounds} rounds × {picks} picks per round

STEP 4 — Configure Draft:
  Draft Order:
    ○ Randomize automatically (recommended)
    ○ Set manually [drag-reorder list]
  
  Pick Timer: [60s / 90s / 120s / 180s / No limit]
  Auto-pick on timeout: [On / Off]

STEP 5 — Review & Launch:
  Summary card
  [🏈 Launch Supplemental Draft] button
  → POST /api/leagues/{id}/supplemental-draft
  → Redirect to /league/{id}/supplemental-draft/{draftId}

══════════════════════════════════════════════════════
STEP 4 — LIVE DRAFT PAGE
══════════════════════════════════════════════════════

Create app/league/[leagueId]/supplemental-draft/[draftId]/page.tsx

Polls GET /state every 5 seconds.

THREE-COLUMN LAYOUT:
  Left:   Asset Pool (categorized tabs: All / Players / Picks / FAAB)
  Center: On-the-clock display + pick timer + [Pick] buttons
  Right:  Draft order + Pass status per manager

ASSET POOL CARDS:
  Player card: name, position, team, projected value
  Pick card: year, round, [TRADED] badge if isTradedPick
  FAAB card: amount + red warning "(lost if unclaimed)"
  Active turn: [Pick →] button on each card
  Not your turn: view-only

ON THE CLOCK:
  Large: "Round {R}, Pick {P}"
  Manager name + countdown timer
  When current user: bold cyan "YOUR PICK"
  [Pass] button always visible

DRAFT ORDER PANEL:
  Per manager row: avatar, name, status dot
  Active: green dot
  Passed: [PASSED] red badge
  Commissioner only: [Remove Pass] button on passed rows

DRAFT LOG:
  "Round 3, Pick 2: {Manager} selected {Asset}"
  "Round 4, Pick 1: {Manager} passed"

COMPLETION SCREEN:
  "✅ Supplemental Draft Complete"
  Summary table: who got what
  "Unclaimed players → waiver wire"
  "Unclaimed FAAB → forfeited"
  "Unclaimed picks → FAAB bid auction"
  [Back to League] button

══════════════════════════════════════════════════════
FINAL STEPS — PROMPT 3
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL type errors
2. git add -A
3. git commit -m "feat(supplemental-draft-p3): OrphanTeamsClient commissioner options (advertise/AI/supp-draft), LeagueSettingsTab supplemental-draft section (gated + greyed), setup multi-step page, live draft room page (asset pool, on-the-clock, pass button, draft log, completion screen)"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash
```
