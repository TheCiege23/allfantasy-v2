# Supplemental Draft — Prompt 4 of 4: QA + Final Wiring

## PREREQUISITE
Prompts 1, 2, and 3 must all be deployed and READY before running this prompt.

---

## CURSOR PROMPT

```
Read ALL files created in prompts 1-3:
  lib/supplemental-draft/types.ts
  lib/supplemental-draft/assetPoolBuilder.ts
  lib/supplemental-draft/SupplementalDraftEngine.ts
  app/api/leagues/[leagueId]/orphaned-teams/route.ts
  app/api/leagues/[leagueId]/supplemental-draft/route.ts
  app/api/leagues/[leagueId]/supplemental-draft/[draftId]/pick/route.ts
  app/api/leagues/[leagueId]/supplemental-draft/[draftId]/pass/route.ts
  app/api/leagues/[leagueId]/supplemental-draft/[draftId]/state/route.ts
  app/api/leagues/[leagueId]/supplemental-draft/[draftId]/complete/route.ts
  app/orphan-teams/OrphanTeamsClient.tsx
  app/league/[leagueId]/supplemental-draft/setup/page.tsx
  app/league/[leagueId]/supplemental-draft/[draftId]/page.tsx
  app/league/[leagueId]/tabs/LeagueSettingsTab.tsx
  prisma/schema.prisma

══════════════════════════════════════════════════════
CRITICAL QA CHECKS — FIX ALL FAILURES
══════════════════════════════════════════════════════

1. ENTITLEMENT GATE
   ☐ Every supplemental draft API route calls requireEntitlement('commissioner_supplemental_draft')
     BEFORE any other logic — returns 402 with upgradeUrl if not subscribed
   ☐ Gate is NOT bypassable by direct API call
   ☐ Frontend settings section shows subscription badge when ungated
   ☐ Subscription upgrade button links to /commissioner-upgrade?highlight=supplemental_draft

2. ORPHAN COUNT GUARD
   ☐ POST /supplemental-draft returns 400 if orphanCount < 2
   ☐ Settings section is greyed + pointer-events-none if orphanCount < 2
   ☐ Setup page redirects away if orphanCount drops below 2 mid-flow

3. DYNASTY-ONLY GUARD
   ☐ Supplemental draft ONLY shows for:
     isDynasty === true OR leagueVariant in ['dynasty','devy','c2c','salary_cap','dynasty_bestball']
   ☐ NEVER shows for standard redraft leagues

4. PICK VALIDATION
   ☐ Manager can ONLY pick on their turn
   ☐ Passed manager CANNOT make picks
   ☐ Asset can only be claimed once (isAvailable check)
   ☐ FAAB "pick" results in LOSS — faabAmount goes to 0, not manager's balance

5. TRADED PICK INTEGRITY
   ☐ originalOwnerRosterId NEVER changes through supplemental draft
   ☐ tradedToRosterId updates to winner's rosterId
   ☐ Round + year values are unchanged
   ☐ isTradedPick flag is preserved
   ☐ Pick display shows [TRADED] badge when isTradedPick

6. POST-DRAFT ASSET DISTRIBUTION
   ☐ Unclaimed players → added to league's waiver wire pool
   ☐ Unclaimed FAAB → faabRemaining on source rosters set to 0
   ☐ Unclaimed draft picks → FAAB bid auction record created
     → Only teams NOT in supp draft can bid
   ☐ completeDraft() runs all three distribution steps atomically

7. PASS MECHANICS
   ☐ Pass → added to passedRosterIds immediately, all subsequent picks skip them
   ☐ Commissioner remove-pass → manager re-enters at NEXT round
   ☐ All managers passed → draft auto-completes via completeDraft()
   ☐ Pass state visible in draft order panel

8. AUTO-PICK ON TIMEOUT
   ☐ If autoPickOnTimeout === true and timer expires:
     → Auto-skip this manager (same as passing once)
     → NOT added to passedRosterIds permanently (just skips this pick)
   ☐ Timer resets for next manager's pick

9. REAL-TIME POLLING
   ☐ /state polls every 5 seconds on the draft page
   ☐ UI updates when currentPickIndex changes
   ☐ Timer countdown accurate
   ☐ Completion state detected and completion screen shown

10. SUBSCRIPTION REDIRECT
    ☐ "View AF Commissioner Plans →" button → /commissioner-upgrade?highlight=supplemental_draft
    ☐ After payment, returning to the page shows feature as unlocked
    ☐ SubscriptionGateModal opens correctly from both settings + orphan teams panel

══════════════════════════════════════════════════════
ADDITIONAL WIRING CHECKS
══════════════════════════════════════════════════════

11. SETUP PAGE FLOW
    ☐ Step 3 (preview) fetches live asset pool from API
    ☐ Calculated rounds formula is: ceil(totalAssets / participantCount)
    ☐ FAAB warning clearly shown: "(lost if unclaimed)"
    ☐ Launch button disabled until all required steps complete

12. ORPHAN TEAMS PAGE
    ☐ Three option cards render correctly
    ☐ Advertise posts to find-a-league feed
    ☐ AI assign updates roster correctly
    ☐ Supplemental draft card state reflects current orphanCount + subscription

13. LIVE DRAFT PAGE
    ☐ Asset pool shows all three categories correctly
    ☐ Current user's turn is highlighted
    ☐ Pick button only active on user's turn
    ☐ Pass button always visible and functional
    ☐ Draft log updates in real-time

══════════════════════════════════════════════════════
FINAL VALIDATION
══════════════════════════════════════════════════════

1. npx tsc --noEmit — ZERO errors required
2. npx prisma validate — schema valid
3. Verify all route files export correct HTTP methods
4. Verify SupplementalDraft + SupplementalDraftPick in Prisma client

══════════════════════════════════════════════════════
FINAL STEPS — PROMPT 4
══════════════════════════════════════════════════════

1. npx tsc --noEmit — fix ALL remaining type errors
2. git add -A
3. git commit -m "fix(supplemental-draft-qa): all 13 QA checks pass — entitlement gates hardened, traded pick integrity verified, post-draft asset distribution atomic, pass mechanics correct, auto-pick timer, real-time polling, subscription redirect wired"
4. git push origin main
5. Confirm Vercel build READY
6. Report commit hash + list of fixes made
```
