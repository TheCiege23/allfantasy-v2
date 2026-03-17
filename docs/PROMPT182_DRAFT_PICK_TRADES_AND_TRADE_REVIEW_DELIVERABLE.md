# PROMPT 182 — Draft Pick Trades During Draft and Trade Review UX Deliverable

## Overview

Draft-pick ownership changes and trade review UX integrated with the draft room: pick trade ownership resolution, correct future/current pick owner display, color metadata and optional red owner-name indicator, private AI trade evaluation for the receiving manager, accept/reject/counter actions, and session/board refresh after accepted trades. League veto/delay rules are preserved (no override).

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Features

| Feature | Implementation |
|--------|-----------------|
| **Pick trade ownership resolution** | `DraftSession.tradedPicks` (JSON array of `TradedPickRecord`). `resolvePickOwner(round, slot, slotOrder, tradedPicks)` returns current owner and `tradedPickMeta`. |
| **Future/current pick owner display** | `buildSessionSnapshot` resolves `currentPick` with `resolvePickOwner` so on-the-clock shows the actual owner. Draft board cells use `resolvePickOwner` for empty and filled cells so ownership is correct. |
| **Color metadata (traded pick color mode)** | Existing `tradedPickColorModeEnabled`; cells and manager strip use `tradedPickMeta.tintColor` when set. |
| **Red owner-name indicator** | Existing `tradedPickOwnerNameRedEnabled`; when on, `tradedPickMeta.newOwnerName` shown in red (e.g. "→ NewOwner"). |
| **AI trade evaluation (private)** | POST `/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/review` — receiver only; returns suggested verdict (accept/reject/counter), reasons, decline/counter suggestions. Not posted to league chat. |
| **Accept/reject/counter** | POST `/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/respond` with `action: accept | reject | counter`. Accept appends two entries to `session.tradedPicks` and returns updated session. |
| **Accepted trades update state** | On accept, API returns `session`; client calls `setSession(updatedSession)` so draft board and current pick refresh. |
| **League/public chat** | No trade content or AI review posted to league chat; evaluation is private to the receiver. |
| **Veto/delay rules** | No code changes to league veto/delay; trade execution is draft-only (session.tradedPicks). League-level trade review settings remain as configured. |

---

## Schema

- **DraftSession**: added `tradedPicks Json?` default `"[]"`. Each element: `{ round, originalRosterId, previousOwnerName, newRosterId, newOwnerName }`.
- **DraftPickTradeProposal**: new table — sessionId, proposerRosterId, receiverRosterId, giveRound, giveSlot, giveOriginalRosterId, receiveRound, receiveSlot, receiveOriginalRosterId, proposerName, receiverName, status (pending | accepted | rejected | countered), respondedAt, responsePayload, createdAt, updatedAt.

---

## Backend

### Trade routing and ownership

- **PickSubmissionService**: reads `session.tradedPicks`, uses `resolvePickOwner(round, slot, slotOrder, tradedPicks)` so submitted pick is stored with correct `rosterId` and `tradedPickMeta`.
- **DraftSessionService.buildSessionSnapshot**: reads `session.tradedPicks`, resolves `currentPick` via `resolvePickOwner`, includes `tradedPicks` in snapshot.
- **DraftBoard**: receives `tradedPicks`; for each cell calls `resolvePickOwner(round, slot, slotOrder, tradedPicks)` for `displayName` and `tradedPickMeta` (for empty cells; filled cells use existing pick data which was stored with correct owner).

### APIs

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| GET | `/api/leagues/[leagueId]/draft/trade-proposals` | canAccessLeagueDraft | List proposals: pending for current user as receiver; commissioner sees all. |
| POST | `/api/leagues/[leagueId]/draft/trade-proposals` | canAccessLeagueDraft | Create proposal (giveRound, giveSlot, receiveRound, receiveSlot, receiverRosterId). Validates ownership. |
| POST | `/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/respond` | canAccessLeagueDraft, receiver only | accept / reject / counter. Accept appends to session.tradedPicks and returns updated session. |
| POST | `/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/review` | canAccessLeagueDraft, receiver only | Private AI review: verdict, reasons, decline/counter suggestions. |

### Services

- **DraftPickTradeService**: `appendDraftPickTrades(leagueId, newTrades)`, `getSessionTradedPicks(leagueId)`.
- **PickOwnershipResolver**: existing `resolvePickOwner`, `applyTradedPickUIMeta`.

---

## Frontend

### Draft room

- **Top bar**: "Trades" button with optional badge (pending count for current user). Opens trade panel modal.
- **DraftPickTradePanel** (modal): "Offer trade" form (my pick to give by round, receive from manager + their round), list of "Pending for you" with per-proposal "Review" and "AI review". In review: Accept / Reject / Counter buttons; "AI review" calls review API and shows verdict/reasons. On accept, parent receives updated session and calls `setSession(updatedSession)` so board refreshes.
- **Draft board**: receives `tradedPicks` from session; each cell uses resolved owner and `tradedPickMeta` (color mode and red name from existing settings).

### Color and red-name integration

- Existing `tradedPickColorModeEnabled` and `tradedPickOwnerNameRedEnabled` from draft settings; passed to `DraftBoard` and `DraftBoardCell` / `DraftManagerStrip`. Resolved `tradedPickMeta` from `resolvePickOwner` includes `tintColor` (caller can set from manager color) and `showNewOwnerInRed`.

---

## Mandatory Click Audit (QA Checklist)

- [ ] **Offer trade entry works:** Open Trades → Offer trade → select give round, receive from manager, receive round → Send offer. Proposal appears for receiver.
- [ ] **Review trade opens correctly:** As receiver, open Trades; pending offer appears; click Review. Accept/Reject/Counter and AI review are visible.
- [ ] **Private AI trade review sends correctly:** Click "AI review" on a pending proposal; request succeeds; verdict and reasons display; no content in league chat.
- [ ] **Accept/reject/counter actions work:** Accept records trade and returns session; Reject and Counter update proposal status; Accept refreshes draft board.
- [ ] **Pick ownership updates correctly after trade:** After accept, draft board and current-on-the-clock show new owner for affected picks; future cells show resolved owner.
- [ ] **Draft board refreshes correctly:** After accept, session is updated and board re-renders with new tradedPicks; no stale ownership.
- [ ] **No dead trade buttons:** Trades, Offer trade, Send offer, Review, AI review, Accept, Reject, Counter all wired and functional.

---

## QA Checklist (concise)

1. Offer trade: form submits; proposal created.
2. Review trade: modal opens; pending offer visible; Review expands actions.
3. AI review: returns verdict/reasons; private (no chat).
4. Accept: session.tradedPicks updated; session returned; board and current pick reflect new owner.
5. Reject/Counter: proposal status updated.
6. Board and strip show correct owner and (when enabled) color/red name for traded picks.
7. All trade-related buttons work; no dead controls.

---

## Files Touched

- **Schema:** `prisma/schema.prisma` — `DraftSession.tradedPicks`, `DraftPickTradeProposal`; `prisma/migrations/20260350000000_add_draft_pick_trades/migration.sql`.
- **Types:** `lib/live-draft-engine/types.ts` — `TradedPickRecord`, `DraftSessionSnapshot.tradedPicks`.
- **Engine:** `lib/live-draft-engine/DraftSessionService.ts` (tradedPicks in snapshot, currentPick resolved), `lib/live-draft-engine/PickSubmissionService.ts` (use session.tradedPicks for owner resolution), `lib/live-draft-engine/DraftPickTradeService.ts`, `lib/live-draft-engine/index.ts`.
- **API:** `app/api/leagues/[leagueId]/draft/trade-proposals/route.ts`, `app/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/route.ts`, `app/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/review/route.ts`.
- **UI:** `components/app/draft-room/DraftBoard.tsx` (tradedPicks prop, resolvePickOwner per cell), `components/app/draft-room/DraftPickTradePanel.tsx`, `components/app/draft-room/DraftTopBar.tsx` (Trades button, pending count), `components/app/draft-room/DraftRoomPageClient.tsx` (trade panel modal, session update on accept, pending count fetch), `components/app/draft-room/index.ts`.
