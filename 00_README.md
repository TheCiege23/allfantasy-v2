# AllFantasy.AI — Cursor Prompt Library
## Production Deployment Queue

All prompts below push directly to production via `git push origin main`.
Run them **in order**. Confirm each Vercel build is **READY** before starting the next prompt.

---

## 📋 Execution Order

| # | File | Feature | Est. Time |
|---|------|---------|-----------|
| 1 | `01_AT_MENTIONS_SYSTEM.md` | @global, @chimmy, @username, @all in all chats | 15-20 min build |
| 2 | `02_SUPPLEMENTAL_DRAFT_P1_SCHEMA_ENGINE.md` | Schema + Engine + Types | 10-15 min |
| 3 | `03_SUPPLEMENTAL_DRAFT_P2_API_ROUTES.md` | All API routes | 10-15 min |
| 4 | `04_SUPPLEMENTAL_DRAFT_P3_UI.md` | Setup + live draft pages | 15-20 min |
| 5 | `05_SUPPLEMENTAL_DRAFT_P4_QA.md` | QA pass + fixes | 10-15 min |
| 6 | `06_LEAGUE_SIDEBAR_CARD.md` | My Leagues card redesign | 10 min |
| 7 | `07_DASHBOARD_POPUPS.md` | Waivers/Lineups/Trades popups | 15 min |
| 8 | `08_WEIGHTED_LOTTERY_DRAFT.md` | Dynasty year 2+ lottery | 15 min |

---

## 🔑 Key Rules

1. **Always read files first** — every prompt says this. Cursor must read before editing.
2. **Wait for READY** — check Vercel after each push before sending the next prompt.
3. **Fix TS errors** — every prompt runs `npx tsc --noEmit`. Zero errors required before commit.
4. **Do not skip the schema prompt** — Prompt 2 (supp draft) must run before Prompt 3.

---

## 🏗 Architecture Summary

### @ Mentions
- `lib/chat-core/mentionPrivacyFilter.ts` — server-side security layer
- `@chimmy` messages stored with `isPrivate: true`, filtered from all other users
- `@global` opens `GlobalBroadcastModal` — commissioner selects leagues, sends simultaneously
- `@all` / `@username` use existing `NotificationDispatcher`

### Supplemental Draft
- Gated: **AF Commissioner** subscription required
- Enabled: **2+ orphaned teams** minimum
- Engine: `lib/supplemental-draft/SupplementalDraftEngine.ts`
- Drafted picks keep `originalOwnerRosterId` frozen (traded pick values never change)
- Unclaimed FAAB → forfeited. Unclaimed picks → FAAB bid auction.
- Pass button: manager exits draft permanently (commissioner can restore)

### League Sidebar Card
- New `LeagueSidebarCard` component replaces inline rendering
- Status dot colors: blue=pre-draft, yellow=drafting, green=active, gray=complete
- Commissioner COMM badge, Paid/Free badge, platform color labels

### Dashboard Popups  
- All three chips (Waivers, Lineups, Trades) lazy-fetch on first click
- Auto-refresh every 30s while open
- AI recommendations are FREE to view
- Clicking league link to navigate is PRO gated

### Weighted Lottery
- `dynastyYearGuard.ts` — blocks startup leagues
- `settings.startup_season` tracks first year
- LotteryReveal: sequential card-flip drama reveal

---

## 🔒 Subscription Gates

| Feature | Required Plan |
|---------|--------------|
| Supplemental Draft | AF Commissioner |
| Weighted Lottery | Free (dynasty feature) |
| League link from dashboard popup | AF Pro |
| @global broadcast | Free (commissioner only) |

---

## ✅ Post-Deploy Checklist

After all 8 prompts are deployed:

- [ ] Visit `/dashboard` — all 3 TodayStrip chips are clickable
- [ ] Waiver popup shows AI recommendations
- [ ] Trade popup shows pending trades with accept/decline verdict
- [ ] Lineup popup shows issues including QUESTIONABLE players
- [ ] My Leagues right rail shows colored status dots
- [ ] Commissioner badge (COMM) visible on commissioner's leagues
- [ ] Type `@` in any league chat — autocomplete shows @global/@chimmy/@all/@username
- [ ] @chimmy message is invisible to other users
- [ ] @global modal opens for commissioners with league selector
- [ ] Dynasty Settings page shows 🎱 Weighted Lottery option (year 2+ leagues only)
- [ ] Lottery preview shows odds table
- [ ] Orphaned teams panel shows 3 commissioner options
- [ ] Supplemental draft option greyed if < 2 orphans
- [ ] Supplemental draft shows subscription badge if not AF Commissioner
