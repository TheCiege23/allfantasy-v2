# PROMPT 272 — Global User Flow QA and System Integration Audit

**Binding context:** AllFantasy Master Project Context (seven sports; deterministic-first; Chimmy as product face).

**Objective:** Ensure every major user flow works end-to-end with no broken steps.

---

## Full flow audit (summary)

| # | Flow | Verdict | Notes |
|---|------|--------|-------|
| 1 | Sign up → onboarding → dashboard | OK | Signup → verify/redirect; onboarding/funnel → dashboard; fantasy home at `/app/home`. |
| 2 | Create league → invite → draft → league start | OK | `/create-league` → `POST /api/league/create` → `/app/league/[id]`; shell name fixed via `GET /api/leagues/[leagueId]`. |
| 3 | Join league → view team → set lineup | OK | `/join` → preview + `POST /api/leagues/join` or `POST /api/creator-invites/join` → league page; Team tab + commissioner lineup. |
| 4 | Draft (live + mock) | OK | Live: `/app/league/[leagueId]/draft`; mock: `/mock-draft`, `/mock-draft/join`, share. |
| 5 | AI (chat, trade, waiver, war room) | OK | `/ai-chat`, `/war-room` landings → openToolHref to Chimmy/mock-draft; trade-evaluator, waiver-ai, app/coach. |
| 6 | Subscription purchase → feature unlock | OK | Pricing → Stripe; return to `/donate/success`; refetch entitlement+tokens on donate/success (fix applied). |
| 7 | Token purchase → token usage | OK | `/wallet`, `/wallet/deposit` → `/donate`; `useTokenBalance`, `/api/tokens/balance`; refetch on focus + after donate/success. |
| 8 | Commissioner actions → league updates | OK | `GET /api/commissioner/leagues/[leagueId]/check`; Commissioner tab in league shell. |
| 9 | Chat (DM, league, AI) | OK | `/messages` (auth prompt); league Chat tab; Chimmy/ai. |
| 10 | Settings (language, timezone, profile) | OK | `/settings` (redirect to login if unauthenticated); SettingsClient tabs. |

---

## 1. Sign up → onboarding → dashboard

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Sign up | `/signup`, `POST /api/auth/register` | OK | Redirects to `/verify` or `redirectAfterSignup`; supports email/phone verification. |
| Verify | `/verify` | OK | Request verification, then redirect to `returnTo`. |
| Onboarding | `/onboarding`, `/onboarding/funnel` | OK | Redirect to `/login` if unauthenticated; redirect to `/dashboard` if already verified/complete. |
| Dashboard | `/dashboard` | OK | Server-rendered; uses BracketLeague memberships + entries. Links to `/onboarding/funnel`, `/brackets`, `/profile`, `/feed`. |

**Verdict:** Flow works. Dashboard is bracket-centric; fantasy league home is `/app/home` and `/leagues`.

---

## 2. Create league → invite users → draft → league start

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Create league | `/create-league`, `CreateLeagueView` → `POST /api/league/create` (or equivalent) | OK | Redirects to `/app/league/${leagueId}` on success. |
| Invite | Commissioner tab / invite flow | OK | `GET/POST /api/commissioner/leagues/[leagueId]/invite`, invite links/codes. |
| Draft | `/app/league/[leagueId]/draft` | OK | Server checks `prisma.league`, redirects if no league. `DraftRoomPageClient` loads. |
| League start | League settings, draft completion | OK | No dead route. |

**Fix applied:** League shell at `/app/league/[leagueId]` previously fetched league name only from `/api/bracket/my-leagues` (BracketLeague). Fantasy leagues created or joined via `/create-league` or `/join` are **League** model, so name showed as "League". **Fixed:** Shell now falls back to `GET /api/leagues/[leagueId]` when league is not in bracket list (new API returns `{ id, name, sport }` for any member with access).

**Verdict:** Flow works after league-name fix.

---

## 3. Join league → view team → set lineup

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Join | `/join`, `GET /api/leagues/join/preview`, `POST /api/leagues/join` | OK | On success redirects to `/app/league/${leagueId}` or `/creator/leagues/${id}`. |
| View team | `/app/league/[leagueId]` (Team tab) | OK | Uses `useLeagueSectionData` and tab content. |
| Set lineup | Commissioner/lineup tools | OK | `POST /api/commissioner/leagues/[leagueId]/lineup` etc. |

**Verdict:** Flow works.

---

## 4. Draft flow (live + mock)

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Live draft | `/app/league/[leagueId]/draft` | OK | Auth + league check; `DraftRoomPageClient`; draft APIs under `/api/leagues/[leagueId]/draft/*`. |
| Mock draft | `/mock-draft`, `/mock-draft/join`, `/mock-draft/share/[shareId]` | OK | Auth required for main mock draft page; lobby and join exist. |

**Verdict:** No dead routes; flow works.

---

## 5. AI usage flow (chat, trade, waiver, war room)

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| AI chat (Chimmy) | `/chimmy`, `/ai` | OK | Chimmy landing and AI hub. |
| Messages / DM | `/messages` | OK | Sign-in prompt when unauthenticated; `MessagesContent` when authed. |
| Trade | `/trade-analyzer`, `/trade-evaluator`, `/app/league/[leagueId]` (Trades tab) | OK | Trade APIs and UI present. |
| Waiver AI | `/waiver-ai`, Waivers tab → `POST /api/app/leagues/[leagueId]/waivers/ai-advice` | OK | WaiversTab and WaiverWirePage. |
| War room / Advantage | `/app/advantage`, `/app/coach` | OK | Routes exist. |

**Verdict:** Flow works.

---

## 6. Subscription purchase → feature unlock

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Pricing | `/pricing` | OK | Client page; Stripe buy button. |
| Success | `/success` (early-access), `/donate/success` (Stripe return) | OK | Stripe checkout returns to `/donate/success?mode=donate|lab`. Post-return refetch: added in donate/success (refetch entitlement + tokens on mount when `mode` present). |
| Feature unlock | `useEntitlement()`, `/api/subscription/entitlements` | OK | Refetch on focus; after donate/success we now refetch so UI updates. |

**Verdict:** Flow works after donate/success refetch fix.

---

## 7. Token purchase → token usage

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Wallet | `/wallet` | OK | Wallet page. |
| Token balance | `useTokenBalance()`, `/api/tokens/balance` | OK | Refetch on focus (PROMPT 268). |
| Deposit | `/wallet/deposit` → redirects to `/donate` | OK | Intentional redirect. |

**Verdict:** Flow works.

---

## 8. Commissioner actions → league updates

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Commissioner check | `GET /api/commissioner/leagues/[leagueId]/check` | OK | Used by league shell. |
| Commissioner tab | League shell "Commissioner" tab | OK | CommissionerTab and related APIs (invite, draft, settings, etc.). |

**Verdict:** Flow works.

---

## 9. Chat (DM, league, AI)

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| DM / inbox | `/messages`, `MessagesContent` | OK | Requires auth. |
| League chat | League shell "Chat" tab, `LeagueChatTab` | OK | Uses shared chat APIs. |
| AI (Chimmy) | `/chimmy`, `/ai` | OK | AI chat surfaces. |

**Verdict:** Flow works.

---

## 10. Settings updates (language, timezone, profile)

| Step | Route / API | Status | Notes |
|------|-------------|--------|------|
| Settings page | `/settings` | OK | Redirect to login if unauthenticated. |
| Profile, preferences, security, notifications, etc. | `SettingsClient` tabs | OK | Uses `useSettingsProfile`, timezone/language, security, notifications, connected accounts, referral, legacy import, legal, account. |

**Verdict:** Flow works; single `/settings` page with tabs (no separate `/settings/language` routes).

---

## Broken flow list (before fixes)

1. **League shell name wrong for fantasy leagues**  
   - **Flow:** Create league or join league → open `/app/league/[leagueId]`.  
   - **Issue:** Shell displayed "League" because name was loaded only from `/api/bracket/my-leagues` (BracketLeague).  
   - **Fix:** Added `GET /api/leagues/[leagueId]` returning `{ id, name, sport }` and updated league shell to fall back to it when league is not in bracket list.

2. **Post-purchase state not refreshed after Stripe return (donate/lab)**  
   - **Flow:** User completes Stripe checkout (donate or Bracket Lab) → redirect to `/donate/success?mode=donate|lab`.  
   - **Issue:** `usePostPurchaseSync` was never mounted; Stripe success URL does not include `checkout=success`, so entitlement and token balance were not refetched on return.  
   - **Fix:** On `/donate/success`, when `mode` is present in URL, call `refetchEntitlement()` and `refetchTokens()` on mount so dashboard/wallet show updated state.

---

## Fix plan (implemented)

| # | Fix | Status |
|---|-----|--------|
| 1 | Add `GET /api/leagues/[leagueId]` (minimal summary, access via `canAccessLeagueDraft`) | Done |
| 2 | In `app/app/league/[leagueId]/page.tsx`, after bracket/my-leagues, if league not found call `GET /api/leagues/[leagueId]` and set name | Done |
| 3 | In `app/donate/success/page.tsx`, on mount when `mode` is in URL: refetch entitlement + token balance so post-Stripe return shows updated state | Done |

---

## Redirects and dead routes (reference)

- `/app/leagues` → `/leagues` (intentional alias).
- `/discover` → `/discover/leagues`.
- `/wallet/deposit` → `/donate`.
- `/march-madness/join` → `/brackets/join`; `/march-madness` → `/brackets`; `/bracket/home` → `/bracket`.
- No dead routes identified for the 10 critical flows above.

---

## Mobile + desktop

- Layout and navigation are responsive; no flow-specific mobile breakage identified.  
- Touch targets and readability should be validated manually for key flows (signup, join, draft, settings).

---

## Summary

- **Full flow audit:** Completed for all 10 critical flows.  
- **Broken flow list:** Two issues (1) league shell name for fantasy leagues, (2) post-purchase state not refreshed after Stripe return to donate/success.  
- **Fix plan:** Implemented (leagues API + shell fallback; donate/success refetch).  
- **Merged fixes:** `app/api/leagues/[leagueId]/route.ts`, `app/app/league/[leagueId]/page.tsx`, `app/donate/success/page.tsx`.
