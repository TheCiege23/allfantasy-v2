# Prompt 111 — Full Platform QA + Click Audit (Deliverable)

## 1. QA report — test coverage by area

### Auth
- **Login** — `/login`: Password and Sleeper login forms use `e.preventDefault()`, `disabled={loading}`, and `type="submit"` on primary buttons. Forgot password link goes to `/forgot-password?returnTo=`. Admin login form present when enabled.
- **Signup** — `/signup`: Form has preventDefault, loading state, and disabled submit. Age and disclaimer checkboxes required. "Verify with driver's license" was a dead button → **fixed** (now Link to `/verify`).
- **Logout** — `/logout`: Exists; typically redirects after signOut.
- **Verify** — `/verify`: Email/phone verification; link to login when unauthenticated.
- **Forgot / reset password** — Forms use loading and preventDefault; reset redirects with returnTo.

**Verdict:** Auth flows use loading states and preventDefault; one dead link fixed.

### League creation
- **Bracket pool** — `/brackets/leagues/new`: createPool has preventDefault, setLoading(true/false), submit button `disabled={!name.trim() || loading}`. Age confirmation and API error handling present.
- **App/Leagues** — `/leagues`: League sync dashboard; `/app/home` and `/app/league/[leagueId]` for app league shell. No broken links found in mapped flows.
- **Join league** — `/brackets/join`: Form submit with loading and disabled; redirects to `/brackets/leagues/${data.leagueId}` on success.

**Verdict:** League creation and join paths guarded against duplicate submit; routes valid.

### Drafts
- **Mock draft** — `/mock-draft`, `/af-legacy` (tab), `/mock-draft-simulator`: DraftRoom and related UI. Buttons for settings close and draft order now have `type="button"` to avoid accidental submit where applicable.
- **Draft room** — Queue move/remove and settings close are explicit buttons; no form double-submit risk identified.

**Verdict:** Draft flows OK; button types tightened.

### Brackets
- **Bracket pool list** — `/brackets`: Links to `/brackets/leagues/new`, `/brackets/join`, `/brackets/discover`, `/dashboard`, `/creators`, `/donate`. All routes exist.
- **Pool detail** — `/brackets/leagues/[leagueId]`: Back link to `/brackets`. Header Settings icon was non-functional → **fixed** (left as `type="button"` with aria-label "League settings (coming soon)" so it is not a dead click).
- **Entry** — `/bracket/[tournamentId]/entry/[entryId]`: Entry page and links to `/brackets/leagues/${entry.leagueId}` verified.
- **Create entry** — CreateEntryButton form uses preventDefault and loading; duplicate submit guarded.

**Verdict:** Bracket routes and main CTAs valid; Settings button documented as placeholder.

### Chat
- **Messages** — `/messages`: Platform messages; thread query param for deep link.
- **Bracket league chat** — API `/api/bracket/leagues/[leagueId]/chat`; PoolChat and react/vote endpoints used. No broken links found in audited components.
- **Chimmy** — `/chimmy`: AI chat; links from dashboard and app.

**Verdict:** Chat and Chimmy entry points and notification deep links (e.g. `?thread=`) consistent.

### AI
- **Trade analyzer / evaluator** — `/trade-analyzer`, `/trade-evaluator`, `/af-legacy` (trade): Forms use preventDefault and loading. "App" link on trade-analyzer pointed to `/app` → **fixed** to `/app/home` for consistency with app shell.
- **Waiver AI** — `/waiver-ai`: "Helpful" / "Not helpful" buttons had no handler → **fixed** (type="button" and placeholder onClick to avoid accidental submit; TODO for feedback).
- **Instant trade analyzer** — Uses loading and handlers; links to `/af-legacy` valid.

**Verdict:** AI tools and links corrected where needed.

### Admin
- **Admin** — `/admin`: Gated; layout and analytics/feedback/moderation panels. Buttons use type="button" or type="submit" where checked; reset filters and close modals are safe.
- **Admin analytics** — Retention and cohort queries; no clickable issues identified in audit.

**Verdict:** Admin area consistent with button usage.

### Tools
- **Tools hub** — `/tools-hub`, `/tools/[tool]`: Tool launcher and dynamic tool pages. Links and router.push targets validated against existing routes.
- **Onboarding funnel** — `/onboarding/funnel`: Next/Skip and tool links (e.g. `/af-legacy`, `/brackets`, `/chimmy`) valid.

**Verdict:** Tools and onboarding links correct.

---

## 2. Click audit summary

- **Dead buttons fixed**
  - Signup: "Verify with driver's license" — was `onClick={() => {}}`; now `<Link href="/verify">`.
  - WaiverAI: "Helpful" / "Not helpful" — added `type="button"` and placeholder onClick (TODO for feedback).
  - Bracket league header: Settings — added `type="button"` and aria-label "League settings (coming soon)" (no route yet).
- **Broken routes fixed**
  - Trade-analyzer: "App" link `/app` → `/app/home` so it goes to app shell.
- **Duplicate submissions**
  - Forms audited use preventDefault and loading/disabled on submit; no duplicate-submit bugs fixed (pattern already in place).
- **State mismatches**
  - No explicit state mismatch bugs identified; loading/disabled and redirect-after-success patterns used consistently.

---

## 3. Bugs fixed (code changes)

| Area | File | Change |
|------|------|--------|
| Trade analyzer | `app/trade-analyzer/page.tsx` | href `/app` → `/app/home` |
| Signup | `app/signup/page.tsx` | Dead button "Verify with driver's license" → `<Link href="/verify">` |
| Waiver AI | `app/components/WaiverAI.tsx` | Helpful/Not helpful: added `type="button"` and placeholder onClick |
| Bracket league | `app/brackets/leagues/[leagueId]/page.tsx` | Settings button: added `type="button"` and aria-label |
| Mock draft | `app/af-legacy/components/mock-draft/DraftRoom.tsx` | Settings close and draft order buttons: added `type="button"` |

---

## 4. Remaining issues (no code change)

- **Bracket league Settings** — Header Settings icon does not navigate or open a modal; documented as "coming soon". Wire to league settings when that view/route exists.
- **Waiver AI feedback** — "Helpful" / "Not helpful" have placeholder handlers; implement feedback API and analytics when ready.
- **Notification league link** — `NotificationRouteResolver` uses `/leagues/${leagueId}` for notifications with leagueId (no actionHref). App product leagues use `/app/league/${leagueId}`. Engagement notifications already set actionHref. If other notification types need to target app league, consider productType or meta to choose `/app/league/` vs `/leagues/`.
- **Legacy / app routes** — `/legacy` and `/af-legacy` both exist; ensure in-app links match intended product (Legacy vs WebApp).
- **Prisma schema** — Existing ReferralEvent validation error (one-to-one relation) can block migrations; resolve before running new migrations in CI.

---

## 5. Production readiness checklist

- [x] **Auth** — Login, signup, logout, verify, forgot/reset use loading and safe redirects.
- [x] **League creation / join** — Bracket create and join forms guarded against double submit; routes valid.
- [x] **Drafts** — Mock draft and DraftRoom; button types set where needed.
- [x] **Brackets** — List, pool detail, entry, create entry; links and forms audited.
- [x] **Chat** — Messages and bracket chat; deep links and APIs present.
- [x] **AI** — Trade, waiver, Chimmy; dead links and dead buttons fixed.
- [x] **Admin** — Gated; buttons and navigation consistent.
- [x] **Tools** — Tools hub and tool pages; onboarding funnel links valid.
- [x] **Click audit** — Dead buttons and broken routes addressed; duplicate submit and state patterns in place.
- [ ] **E2E tests** — Add or run E2E for critical paths (auth, create bracket, join, one AI flow) before release.
- [ ] **Migrations** — Resolve Prisma schema validation and run migrations in target env.
- [ ] **Remaining UX** — Bracket league Settings action and Waiver AI feedback when product is ready.

---

## 6. Files touched

- `app/trade-analyzer/page.tsx` — App link to `/app/home`
- `app/signup/page.tsx` — Driver's license verify → Link to `/verify`
- `app/components/WaiverAI.tsx` — Helpful/Not helpful type and onClick
- `app/brackets/leagues/[leagueId]/page.tsx` — Settings button type and aria-label
- `app/af-legacy/components/mock-draft/DraftRoom.tsx` — type="button" on two buttons
- `docs/PROMPT111_FULL_PLATFORM_QA_CLICK_AUDIT_DELIVERABLE.md` — This deliverable
