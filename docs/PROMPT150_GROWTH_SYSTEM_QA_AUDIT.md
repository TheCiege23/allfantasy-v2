# PROMPT 150 — AllFantasy Growth System QA and Click Audit

## Scope Audited

- Creator leagues (landing, join, discover)
- Viral invites (accept, join by code, share)
- Referrals (dashboard, progress, leaderboard, rewards)
- Public league discovery (discover/leagues, by sport)
- Social sharing (share APIs, moment, track)
- AI social clips (social-clips, clips, generate/publish)
- Automated blogs (blog index, [slug], draft, API)
- Platform content feed (feed page, tabs, filters, follow, save)
- Onboarding (profile, funnel, checklist API)
- Retention (nudges, dismiss, dashboard widgets)

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER).

---

## 1. Issue List by Severity

### Critical (P0) — None

- All growth routes have corresponding pages; no broken redirects identified.
- Join and invite/accept APIs exist and return expected shapes; redirects target valid pages.

### High (P1) — Fixed

| ID | Issue | Location | Fix |
|----|--------|----------|-----|
| P1-1 | Dead buttons: “Helpful” / “Not helpful” did nothing (TODO placeholder) | `app/components/WaiverAI.tsx` | Wired to local state + toast; show “Thanks for your feedback!” and disable after click. |

### Medium (P2) — No code change required

| ID | Issue | Notes |
|----|--------|--------|
| P2-1 | Waiver feedback not persisted server-side | Optional enhancement: POST to `/api/legacy/feedback` with tool: "WaiverAI" and feedbackType "like" / "confusing" for analytics. Current fix removes dead UX. |
| P2-2 | Join page success path redirects immediately | Intentional; “You joined the league” may not be visible. Consider brief delay or leaving as-is for speed. |

### Low (P3) — Informational

| ID | Item | Status |
|----|------|--------|
| P3-1 | Creator follow/unfollow APIs require creator slug | Profile page uses `creator.slug`; 404 if slug missing. Handled by “Creator not found” state. |
| P3-2 | Content feed “Follow” navigates to creator profile | No dedicated follow API from feed card; link is valid. |
| P3-3 | Retention nudge dismiss cooldown 24h | Documented in PROMPT149; no change. |

---

## 2. File-by-File Fix Plan

| File | Action | Status |
|------|--------|--------|
| `app/components/WaiverAI.tsx` | Add `feedbackSentForIndex` state; on “Helpful”/“Not helpful” click set state, show toast, render “Thanks for your feedback!” and hide buttons for that suggestion. | **Done** |
| All other growth routes/components | Verify only (routes exist, handlers exist, loading/error/success covered). | **Verified** |

No other files required code changes for this audit.

---

## 3. Full Merged Code Fixes

**Single file modified:** `app/components/WaiverAI.tsx`

- Added state: `feedbackSentForIndex: Set<number>`.
- Replaced placeholder `onClick={() => {/* TODO */}}` on both feedback buttons with:
  - `setFeedbackSentForIndex(prev => new Set(prev).add(i))`
  - `toast.success('Thanks for your feedback!')`
- When `feedbackSentForIndex.has(i)` is true, render “Thanks for your feedback!” instead of the two buttons.

No patch snippets; full file remains as merged in the repo.

---

## 4. Final QA Checklist

Use this to re-verify after any future changes.

### Routes exist

- [ ] `/creators` — list
- [ ] `/creators/[handle]` — profile, leagues, follow, share
- [ ] `/creator` — dashboard (auth)
- [ ] `/creator/leagues/[leagueId]` — landing + join
- [ ] `/join` — join by code (creator invite)
- [ ] `/invite/accept` — accept invite (token)
- [ ] `/referral` — referral dashboard
- [ ] `/referrals` — invite links + referral
- [ ] `/discover`, `/discover/leagues`, `/discover/leagues/[sport]`
- [ ] `/app/discover` — find league
- [ ] `/feed` — content feed (auth)
- [ ] `/onboarding`, `/onboarding/funnel`
- [ ] `/dashboard` — dashboard + checklist + nudges
- [ ] `/social-clips`, `/social-clips/[assetId]`
- [ ] `/clips`, `/clips/[id]`
- [ ] `/blog`, `/blog/[slug]`, `/blog/draft/[articleId]`

### Components render

- [ ] Creator profile: header, leagues, analytics tab, branding (owner), follow/unfollow, share
- [ ] Creator league card: join CTA, link to league landing
- [ ] Join page: code input/auto-join, loading, success, error
- [ ] Invite accept: preview, accept button, expired/full/already member states
- [ ] Referral: section, progress widget, leaderboard, CTA to /referrals
- [ ] Discover: PublicLeagueDiscoveryPage, sport filter
- [ ] Feed: tabs (Following / For You / Trending), filters, cards, refresh, follow, save
- [ ] Onboarding: funnel steps, checklist on dashboard, progress widget
- [ ] Retention: ReturnPromptCards, dismiss
- [ ] WaiverAI: suggestions, roster alerts, **Helpful / Not helpful** → “Thanks for your feedback!”

### Click handlers and state

- [ ] Creator follow/unfollow: loading state, refetch creator after success
- [ ] Creator share: copy URL + POST share API
- [ ] Join: POST `/api/creator-invites/join`, redirect to `/creator/leagues/[id]` on success
- [ ] Invite accept: POST `/api/invite/accept`, redirect bracket or creator league
- [ ] Feed: tab switch refetches; filters refetch; refresh refetches; follow navigates; save toggles localStorage
- [ ] Checklist: task links navigate; milestone recorded on click for tool/AI/referral
- [ ] Nudges: CTA links navigate; dismiss POST and removes card
- [ ] WaiverAI: Helpful/Not helpful update state and show toast (no dead buttons)

### Backend APIs

- [ ] Creator: GET/PATCH profile, GET leagues, POST follow/unfollow/share, GET analytics
- [ ] Creator league: GET `/api/creator/leagues/[leagueId]`
- [ ] Join: POST `/api/creator-invites/join`
- [ ] Invite: GET preview, POST accept, POST generate, GET list, POST revoke/share, GET stats
- [ ] Referral: GET/POST link, GET stats/progress/leaderboard/rewards, POST redeem, POST track-click
- [ ] Discover: GET leagues, recommended, trending
- [ ] Content feed: GET with tab, sport, contentType
- [ ] Onboarding: GET/POST funnel, GET/POST checklist
- [ ] Retention: GET nudges, POST dismiss
- [ ] Share: preview, publish, generate-copy, moment, track, targets
- [ ] Social-clips: list, generate, [assetId] get/patch, approve, publish, logs, retry, AI generate/status
- [ ] Blog: list, get/patch article, publish, slug, internal-links, generate, generate-and-save

### Success / error / loading

- [ ] Join: loading “Joining…”, success message + redirect or “Browse creators”, error message + link
- [ ] Invite accept: loading “Loading invite…”, invalid/expired/full/already member, success “You’re in! Redirecting…”
- [ ] Creator profile: loading “Loading…”, not found + link, follow loading disabled state
- [ ] Feed: loading spinner + “Loading your feed…”, error banner, empty state
- [ ] Onboarding checklist: loading “Loading checklist…”, empty handled by API
- [ ] Retention cards: loading “Loading…”, dismiss in progress (button disabled)
- [ ] WaiverAI: loading steps, error banner, feedback “Thanks for your feedback!”

### Mobile and desktop

- [ ] Discover, feed, referral, onboarding funnel, dashboard: responsive; tap targets adequate
- [ ] No horizontal scroll or clipped content on small viewports
- [ ] Creator profile, join, invite accept: usable on mobile

### No dead buttons or broken redirects

- [ ] No `href="#"` or `onClick={() => {}}` left in production growth surfaces
- [ ] No placeholder-only actions (TODO removed from WaiverAI)
- [ ] Redirects: `/creator/leagues/[id]`, `/brackets/leagues/[id]`, `/creators`, `/dashboard`, etc. all have pages

### Stale saved state

- [ ] Feed saved IDs: read from localStorage on mount; write on save toggle
- [ ] No other growth surfaces rely on stale client-only state for critical paths

---

## 5. Manual Testing Checklist

Run through these flows once per release or before shipping growth changes.

1. **Creator leagues**
   - Open `/creators`, click a creator → profile loads.
   - On profile click Follow → loading then state updates; Unfollow same.
   - Click Share → URL copied; optional: confirm share API in network.
   - Click a league → league landing; Join (if not member) → join API, redirect or success message.

2. **Join by code**
   - Open `/join?code=VALID_CODE` (use real creator invite code) → joining → redirect to `/creator/leagues/[id]` or success message.
   - Open `/join?code=INVALID` → error message, link to Browse creators.
   - Open `/join` (no code) → message and link to Browse creators.

3. **Invite accept**
   - Open `/invite/accept?code=TOKEN` (use real InviteLink token) → preview → Accept → redirect to bracket or creator league.
   - Use expired/invalid token → “Invalid or expired invite”.
   - Use full league → “This league is full”.

4. **Referral**
   - Open `/referral` signed in → ReferralSection, Progress, Leaderboard, CTA to Invite links.
   - Open `/referral` signed out → sign-in CTA.
   - Open `/referrals` → invite management + referral dashboard.

5. **Discover**
   - Open `/discover` → redirects to `/discover/leagues`.
   - Open `/discover/leagues` → list and filters load.
   - Open `/discover/leagues/NFL` (or other sport) → filtered list.

6. **Content feed**
   - Open `/feed` (signed in) → tabs, filters, cards.
   - Switch tabs → list refetches.
   - Change sport/type filters → list refetches.
   - Click Refresh → loading then updated list.
   - Click card link → navigates to correct destination.
   - Click Follow on creator card → navigates to creator profile.
   - Click Save → toggles saved state; refresh page → saved state persists (localStorage).

7. **Onboarding**
   - Open `/onboarding/funnel` (signed in) → steps; Next/Skip; sport selection; tool links; league CTAs.
   - Open `/dashboard` with incomplete onboarding → progress widget and checklist visible; click task → correct href; complete a task → state updates (e.g. after funnel or joining league).

8. **Retention**
   - Open `/dashboard` → if nudges returned, cards show; click CTA → navigates; click Dismiss → card disappears; reload → dismissed nudge not shown (within cooldown).

9. **WaiverAI**
   - Open WaiverAI page, get suggestions; click “Helpful” or “Not helpful” on one → toast “Thanks for your feedback!”, buttons replaced by “Thanks for your feedback!” for that suggestion.

10. **Blog**
    - Open `/blog` → list of published articles.
    - Open `/blog/[slug]` → article content.
    - Draft editor (if used): internal links, publish flow.

11. **Social clips**
    - Open `/social-clips` → list/create.
    - Open `/social-clips/[assetId]` → detail/edit/publish.
    - Open `/clips/[id]` → clip view/share.

---

## 6. Automated Test Recommendations

The project has tests under `tests/`, `lib/**/__tests__/`, and `__tests__/`. No existing E2E or growth-specific route tests were found in the audit. Recommendations:

1. **API route tests (Jest or Vitest)**
   - `GET /api/content-feed` — returns 200 and `items` array; with `tab`, `sport`, `contentType` params.
   - `GET /api/onboarding/checklist` — returns 200 and `tasks` when authenticated.
   - `GET /api/retention/nudges` — returns 200 and `nudges` when authenticated.
   - `POST /api/retention/nudges/dismiss` — with `nudgeId` returns 200.
   - `POST /api/creator-invites/join` — with valid code and auth returns `success` and optional `creatorLeagueId`.
   - `GET /api/invite/preview?code=TOKEN` — returns preview or invalid.
   - `POST /api/invite/accept` — with valid token returns `ok`, `inviteType`, `targetId`.

2. **Integration tests**
   - Onboarding: advance funnel step via POST, then GET state — step updated.
   - Retention: GET nudges, POST dismiss with first nudge id, GET again — that nudge excluded (or cooldown).

3. **E2E (Playwright/Cypress) if added**
   - Visit `/join?code=...`, submit or auto-join, assert redirect or success message.
   - Visit `/invite/accept?code=...`, click Accept, assert redirect.
   - Visit `/feed`, switch tab, assert URL or list change.
   - Visit dashboard, dismiss a nudge, assert card gone.

4. **Component tests (React Testing Library)**
   - `WaiverAI`: render with mock suggestions; click “Helpful”; assert toast or “Thanks for your feedback!” and buttons hidden for that index.
   - `ReturnPromptCards`: render with mock nudges; click dismiss; assert POST called and nudge removed from list (mock fetch).
   - `OnboardingChecklist`: render with mock state; click task link; assert correct href and optional milestone POST (mock fetch).

Use the same test runner and patterns as existing `tests/*.test.ts` and `lib/**/__tests__/*.test.ts` for consistency.
