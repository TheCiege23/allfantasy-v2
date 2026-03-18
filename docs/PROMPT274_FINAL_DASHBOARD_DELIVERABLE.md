# PROMPT 274 — Final User Dashboard (Sleeper-Level UX)

**Objective:** Build the main dashboard to feel elite. Style: clean, mobile-first, fast, no clutter.

---

## What’s included

| Area | Implementation |
|------|----------------|
| **Active leagues by sport** | Grouped list (up to 6 visible), “View all” and “Create” links; each row: name, size, chevron. |
| **Upcoming drafts** | Single card linking to first league’s draft or mock draft; label reflects league name when present. |
| **Live matchups** | Single card linking to first league’s Matchups tab or matchup simulation; “Scores & projections” subtext. |
| **AI suggestions** | One prominent card (cyan accent) → Start/sit, waivers, trade tips (`/app/coach`). |
| **Token balance** | In top status strip; tappable to `/wallet`; shows balance or loading. |
| **Subscription status** | In top status strip; Pro/Free; tappable to `/pricing`. |
| **Quick actions** | Four: Start/Sit, Trade, Draft, Waivers — 2×2 grid (mobile), equal-width; large tap targets. |
| **Chimmy** | One compact row under AI suggestions → `/chimmy`. |
| **Footer** | Minimal: Referrals, Share, Discover leagues. |

---

## Design choices

- **Mobile-first:** Single column, max-width 512px; 2×2 quick actions; list-based leagues.
- **Clean:** No extra cards; referral/share moved to footer; consistent borders and bg (white/[0.03], white/[0.06]).
- **Fast:** No new heavy fetches; uses existing `useLeagueList`, `useTokenBalance`, `useEntitlement`; minimal re-renders.
- **No clutter:** Removed duplicate “Create AI post” and “Invite & earn” as primary sections; single “AI suggestions” and one Chimmy row; footer for secondary links.

---

## File changed

- **`components/dashboard/FinalDashboardClient.tsx`** — Full rewrite:
  - Status strip (tokens + subscription) with wallet/pricing links.
  - Quick actions with explicit icon colors (Tailwind-safe).
  - Leagues: flat list up to 6, “View all X leagues” when more.
  - Upcoming drafts: one card (first league draft or mock).
  - Live matchups: one card (first league matchups or simulation).
  - AI suggestions: one cyan-accent card.
  - Chimmy: one compact row.
  - Footer: Referrals, Share, Discover.

---

## Logic

- **Auth:** Unauthenticated users see sign-in/sign-up CTA; authenticated see full dashboard.
- **Leagues:** `useLeagueList(true)` when authenticated; `groupLeaguesBySport` then flatten; show first 6, link “View all” to `/leagues`.
- **Drafts:** Link = first league draft if `leagues.length > 0`, else mock draft; label = league name or “Mock draft”.
- **Live matchups:** Link = first league with `?tab=Matchups` if leagues exist, else `/app/matchup-simulation`.
- **Quick actions:** Start/Sit → `/app/coach`, Trade → `/trade-evaluator`, Draft → `/mock-draft`, Waivers → `/waiver-ai`.

---

## Summary

- **Final dashboard UI + logic** implemented in `FinalDashboardClient.tsx`.
- **Sleeper-level UX:** Clean, mobile-first, fast, minimal clutter; all requested areas (leagues, drafts, live matchups, AI, tokens, subscription, quick actions) covered in one cohesive layout.
