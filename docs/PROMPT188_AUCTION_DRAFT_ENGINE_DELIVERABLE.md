# PROMPT 188 — AllFantasy Auction Draft Engine (Deliverable)

## Overview

Premium auction draft room with **deterministic, rules-based** mechanics. No AI required for core auction behavior. Optional AI features (nomination advice, bid value explanation, budget strategy, “should I keep bidding?”, recap) can be added later via existing helper/recap endpoints.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Automation vs AI Breakdown

| Feature | Deterministic / Rules-based | AI Optional |
|--------|-----------------------------|-------------|
| Nomination order | ✅ Round-robin from slotOrder | — |
| Active player on auction | ✅ currentNomination in auctionState | — |
| Bid timer | ✅ Server timerEndAt; client displays countdown | — |
| Minimum next bid | ✅ currentBid + minBidIncrement | — |
| Budget tracking | ✅ auctionBudgets per roster; enforce on bid | — |
| Roster slot validation | ✅ canPlaceAuctionBid (max bid by slots left) | — |
| Winning bidder resolution | ✅ resolveAuctionWin (assign to high bidder or pass) | — |
| Player assignment to roster | ✅ DraftPick + amount; appendPickToRosterDraftSnapshot | — |
| Pause / resume | ✅ Same as snake (DraftSessionService) | — |
| Commissioner controls | ✅ resolve_auction, pause, resume, set_timer_seconds | — |
| Reconnect / resync | ✅ GET session returns full auction snapshot | — |
| Autopick / auto-bid | 🔲 Not implemented (configurable rules possible later) | — |
| Orphan baseline automation | 🔲 Reuse existing orphan AI manager if desired | — |
| Nomination advice | — | ✅ Optional: use draft/recommend or new auction-advice API |
| Bid value explanation | — | ✅ Optional: AI helper panel |
| Budget strategy | — | ✅ Optional: AI helper panel |
| “Should I keep bidding?” | — | ✅ Optional: AI helper panel |
| Auction recap | — | ✅ Optional: draft/recap extended for auction |

---

## Routes / Services

### Backend

| Path | Label | Description |
|------|--------|-------------|
| `lib/live-draft-engine/types.ts` | [UPDATED] | AuctionState, AuctionBudgets, AuctionNomination, AuctionSessionSnapshot, DraftPickSnapshot.amount, DraftEventType auction events |
| `lib/live-draft-engine/auction/AuctionEngine.ts` | [NEW] | nominatePlayer, placeBid, resolveAuctionWin, initializeAuctionForSession, getAuctionStateFromSession, getBudgetsFromSession, getAuctionConfigFromSession |
| `lib/live-draft-engine/auction/index.ts` | [NEW] | Re-exports |
| `lib/live-draft-engine/DraftSessionService.ts` | [UPDATED] | buildSessionSnapshot includes auction + pick.amount; startDraftSession initializes auction when draftType=auction |
| `lib/live-draft-engine/index.ts` | [UPDATED] | Export auction |
| `app/api/leagues/[leagueId]/draft/auction/nominate/route.ts` | [NEW] | POST nominate (playerName, position, team?, playerId?, byeWeek?) |
| `app/api/leagues/[leagueId]/draft/auction/bid/route.ts` | [NEW] | POST bid (amount) |
| `app/api/leagues/[leagueId]/draft/auction/resolve/route.ts` | [NEW] | POST resolve (sell to high bidder or pass) |
| `app/api/leagues/[leagueId]/draft/controls/route.ts` | [UPDATED] | action resolve_auction (commissioner) |
| `prisma/schema.prisma` | [UPDATED] | DraftSession: auctionBudgetPerTeam, auctionBudgets, auctionState; DraftPick: amount |
| `prisma/migrations/20260320000000_add_auction_draft_fields/migration.sql` | [NEW] | Add columns |

### Frontend

| Path | Label | Description |
|------|--------|-------------|
| `components/app/draft-room/AuctionSpotlightPanel.tsx` | [NEW] | Spotlight: nominated player card, high bid, bidder, timer, bid input, Sell/Resolve, budgets strip |
| `components/app/draft-room/DraftRoomShell.tsx` | [UPDATED] | Optional auctionStrip above board |
| `components/app/draft-room/PlayerPanel.tsx` | [UPDATED] | canNominate, onNominate (Nominate button when auction + my turn) |
| `components/app/draft-room/DraftRoomPageClient.tsx` | [UPDATED] | Auction state, handleAuctionNominate/Bid/Resolve, auctionStrip, canNominate/onNominate |
| `components/app/draft-room/DraftBoard.tsx` | [UPDATED] | Pass pick.amount to cell |
| `components/app/draft-room/DraftBoardCell.tsx` | [UPDATED] | Show amount ($X) when present |
| `components/app/draft-room/index.ts` | [UPDATED] | Export AuctionSpotlightPanel |

---

## UI Requirements Met

- Auction player spotlight area ✅ (AuctionSpotlightPanel with DraftPlayerCard)
- Current highest bid ✅
- Highest bidder ✅
- Remaining budgets ✅ (strip per roster)
- Roster preview ✅ (existing roster view in PlayerPanel + board)
- Nominated player card with image/stats/team logo ✅ (DraftPlayerCard in spotlight)
- Bidding controls ✅ (amount input + Bid button)
- Chat panel ✅ (unchanged)
- Queue / watchlist ✅ (unchanged)
- AI helper panel ✅ (unchanged; optional auction-specific advice can be wired later)

---

## Mandatory Click Audit (QA Checklist)

- [ ] **Nominate player works** — As current nominator, select a player and click Nominate; player appears in spotlight and bid timer starts.
- [ ] **Bid button works** — With a player on the block, enter amount ≥ min next bid and click Bid; high bid and bidder update; timer resets.
- [ ] **Timer updates correctly** — Countdown shows and decreases; when it hits 0, client can call Resolve (or commissioner uses Sell/Pass).
- [ ] **Commissioner controls work** — Pause, Resume, Reset timer, Undo pick, Resolve auction (Sell/Pass), Set timer seconds.
- [ ] **Budget updates correctly** — After a sold player, winning roster’s remaining budget decreases; bid validation rejects bids above remaining budget.
- [ ] **Roster assignment updates correctly** — Won players appear in draft board and in roster view with correct owner and amount.
- [ ] **AI helper opens correctly** — Helper panel (if enabled) opens; no dead buttons.
- [ ] **No dead auction controls** — Nominate, Bid, and Resolve/Sell are enabled when appropriate and trigger API calls; errors show in pickError area.

---

## Config / League Setup

- League draft type must be `auction` (via league settings or draft config). When the draft session is created with `draftType: 'auction'`, starting the draft initializes auction state and budgets (default $200/team unless `auctionBudgetPerTeam` is set on the session).
- Timer length uses the same `timerSeconds` as snake/linear (e.g. 35s for bid timer). Commissioner can change via Set timer seconds.

---

## File Manifest (Summary)

**New:**  
`lib/live-draft-engine/auction/AuctionEngine.ts`, `lib/live-draft-engine/auction/index.ts`,  
`app/api/leagues/[leagueId]/draft/auction/nominate/route.ts`, `app/api/leagues/[leagueId]/draft/auction/bid/route.ts`,  
`app/api/leagues/[leagueId]/draft/auction/resolve/route.ts`,  
`components/app/draft-room/AuctionSpotlightPanel.tsx`,  
`prisma/migrations/20260320000000_add_auction_draft_fields/migration.sql`

**Updated:**  
`lib/live-draft-engine/types.ts`, `lib/live-draft-engine/DraftSessionService.ts`, `lib/live-draft-engine/index.ts`,  
`app/api/leagues/[leagueId]/draft/controls/route.ts`,  
`prisma/schema.prisma`,  
`components/app/draft-room/DraftRoomShell.tsx`, `components/app/draft-room/PlayerPanel.tsx`,  
`components/app/draft-room/DraftRoomPageClient.tsx`, `components/app/draft-room/DraftBoard.tsx`,  
`components/app/draft-room/DraftBoardCell.tsx`, `components/app/draft-room/index.ts`
