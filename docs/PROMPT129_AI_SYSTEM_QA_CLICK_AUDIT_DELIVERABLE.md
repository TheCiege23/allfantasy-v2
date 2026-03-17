# PROMPT 129 — AI System QA and Click Audit

## 1. Issue list by severity

### High
| # | Surface | Issue | Verification |
|---|--------|--------|--------------|
| H1 | af-legacy | **Tab state not in URL** — Clicking a tab (Trade, Waiver, Chat, etc.) did not update the URL. Refresh reverted to default tab. | **Fixed:** `handleActiveTabChange` now calls `router.replace(pathname + '?' + q.toString())` so `?tab=` is always in sync. Deep links and refresh preserve tab. |

### Medium
| # | Surface | Issue | Verification |
|---|--------|--------|--------------|
| M1 | Trade AI | **No Retry on error** — When inline trade analysis failed, only the error message was shown; no explicit Retry action. | **Fixed:** Added a "Retry" button next to `inlineTradeError` that clears error and calls `analyzeInlineTrade()`. |
| M2 | Waiver AI | Waiver error state has no dedicated Retry button; user can re-click "Analyze Free Agents". | **Accepted:** Re-running is the retry; no code change. |

### Low
| # | Surface | Issue | Verification |
|---|--------|--------|--------------|
| L1 | AI Hub | **No link to /ai/tools** — Tools grid exists but "View all tools" (or equivalent) did not link to `/ai/tools`. | **Fixed:** Added "View all tools" link next to "AI Tools" heading → `/ai/tools`. |
| L2 | Chimmy | Provider "Compare" opens toast (placeholder); no dedicated compare page yet. | **Accepted:** Button is wired; product can add compare route later. |

### Verified OK (no change)
- **AI Hub:** All tool cards have correct `href` (trade, waiver, draft, matchup, rankings, story, coach, content). Quick actions are `Link` with correct hrefs. "Open saved" → `/ai/history`. "Chat with Chimmy" → `getChimmyChatHref()`.
- **Chimmy Chat:** Send message (button + Enter), quick prompts (set input), copy response, Retry (re-send last), provider indicator + Compare (toast), close panel when `onClose` provided. API: POST `/api/chat/chimmy`.
- **Trade AI:** Analyze button triggers `analyzeInlineTrade` → POST `/api/legacy/trade/analyze`. State: `inlineTradeResult`, `inlineTradeError`, `inlineTradeLoading`. Dropdowns: league, format; handlers update state.
- **Waiver AI:** "Analyze Free Agents" → `runWaiverAnalysis` → POST `/api/legacy/waiver/analyze`. League and goal dropdowns wired. Data reloads on new selection.
- **Rankings AI:** "Retry" button present when `rankingsError`; calls `runRankingsAnalysis()`. API and state OK.
- **Draft AI (mock-draft):** DraftRoom component; league/config state and API usage present.
- **Matchup AI:** Hub links to Chimmy with prompt "Explain my matchup"; no standalone matchup tab.
- **Content AI:** `/social-clips` — Generate calls POST `/api/social-clips/generate`; redirect to asset detail. Buttons and dropdowns wired.

---

## 2. Fix plan (completed)

| Fix | Action | Status |
|-----|--------|--------|
| 1 | af-legacy: on tab change, call `router.replace(pathname + '?tab=' + t)` (preserve other query params) | Done |
| 2 | Trade tab: add Retry button next to `inlineTradeError` that clears error and calls `analyzeInlineTrade()` | Done |
| 3 | AI Hub: add "View all tools" link to `/ai/tools` | Done |

---

## 3. Merged code fixes (summary)

- **app/af-legacy/page.tsx**
  - Import `useRouter`, `usePathname` from `next/navigation`.
  - In `handleActiveTabChange`: after `setActiveTab` / `setMobileMainTab`, update URL with `router.replace(pathname + '?' + q.toString())` so `tab` query is in sync.
  - In Trade section: when `inlineTradeError` is shown, add a "Retry" button that clears error and calls `analyzeInlineTrade()`.
- **components/ai-hub/AIHubPage.tsx**
  - In AI Tools section: add a "View all tools" `Link` to `/ai/tools` next to the "AI Tools" heading.

---

## 4. Manual testing checklist

### AI Hub (`/ai`)
- [ ] **Buttons / links:** "Chat with Chimmy" opens `/af-legacy?tab=chat`.
- [ ] **Quick actions:** Each quick action (Ask Chimmy, Compare Trade, Find Waiver Targets, Draft Advice, Explain Matchup) navigates to the correct route.
- [ ] **Tool cards:** Each of the 8 tool cards navigates to the correct href (trade, waiver, mock-draft, Chimmy matchup prompt, rankings, overview, chat, social-clips).
- [ ] **History:** "Open saved" goes to `/ai/history`.
- [ ] **View all tools:** "View all tools" goes to `/ai/tools` and shows the same tools grid with "Back to AI Hub".
- [ ] **Mobile:** Layout is usable; cards and quick actions tappable.
- [ ] **Desktop:** Same flows work.

### Chimmy Chat (`/af-legacy?tab=chat`)
- [ ] **Send message:** Type and click Send (or Enter); message appears and reply loads (POST `/api/chat/chimmy`).
- [ ] **Quick prompts:** Click a quick prompt; input is set; user can edit and send.
- [ ] **Copy response:** "Copy response" copies last assistant message.
- [ ] **Retry:** After at least one exchange, "Retry" appears; click runs last user message again and replaces last reply.
- [ ] **Provider / Compare:** Provider dots visible; "Compare" shows toast (or future compare view).
- [ ] **Close panel:** If rendered with `onClose`, close button dismisses panel.
- [ ] **Mobile:** Input and buttons usable; drawer behavior if applicable.
- [ ] **Desktop:** Same.

### Trade AI (`/af-legacy?tab=trade`)
- [ ] **URL:** Visiting `/af-legacy?tab=trade` opens Trade tab; refreshing keeps Trade tab.
- [ ] **Tab sync:** Clicking another tab updates URL; refresh keeps that tab.
- [ ] **League dropdown:** Changing league updates state and clears/refreshes as designed.
- [ ] **Analyze:** Enter sides, click analyze; loading then result or error.
- [ ] **Retry on error:** On error, "Retry" button appears; click clears error and re-runs analysis.
- [ ] **Mobile / Desktop:** Same behavior.

### Waiver AI (`/af-legacy?tab=waiver`)
- [ ] **URL:** `/af-legacy?tab=waiver` opens Waiver tab; refresh preserves it.
- [ ] **Find Leagues:** Loads leagues when applicable.
- [ ] **League / Goal dropdowns:** Selections update state.
- [ ] **Analyze Free Agents:** Triggers analysis; result or error shown.
- [ ] **Mobile / Desktop:** Usable.

### Draft AI (`/af-legacy?tab=mock-draft`)
- [ ] **URL:** Tab and refresh preserved.
- [ ] **League/config:** Selections and start flow work as designed.
- [ ] **Mobile / Desktop:** Usable.

### Rankings AI (`/af-legacy?tab=rankings`)
- [ ] **URL:** Tab and refresh preserved.
- [ ] **Run / Retry:** Run analysis; on error, "Retry" re-runs.
- [ ] **Mobile / Desktop:** Usable.

### Content AI (`/social-clips`)
- [ ] **Generate:** Sport/type/options + Generate; POST then redirect to asset detail.
- [ ] **Detail page:** Preview, approve, publish, download/share as implemented.
- [ ] **Mobile / Desktop:** Usable.

### General
- [ ] **Handlers:** Every button/link has a handler or `href` (no dead buttons).
- [ ] **APIs:** Each action that should call an API does so (correct method and route).
- [ ] **State:** Dropdowns and toggles update state and drive UI/API correctly.
- [ ] **Data reload:** Changing league/context triggers expected reload or clear.

---

## 5. Automated test recommendations

### Unit / integration (e.g. React Testing Library + Jest or Playwright)
- **AI Hub:** Render `/ai`; assert all tool cards have `href` and quick actions are links with correct `href`; click "Open saved" and assert navigation to `/ai/history`; click "View all tools" and assert navigation to `/ai/tools`.
- **Chimmy:** Render ChimmyChatShell with mock fetch for POST `/api/chat/chimmy`; submit message and assert request body and that reply appears; click Retry and assert second request; click Copy and assert clipboard or no throw.
- **Trade (af-legacy):** Mock POST `/api/legacy/trade/analyze`; trigger analyze with side A/B; assert loading then result or error; trigger Retry on error and assert analyze called again and error cleared.
- **URL / tab sync:** Render af-legacy with `?tab=waiver`; assert Waiver content visible; simulate tab change (e.g. click Trade); assert URL includes `tab=trade`; simulate refresh (re-render with same URL) and assert Trade still active.

### E2E (Playwright or Cypress)
- **Flow: Hub → Chimmy:** From `/ai`, click "Chat with Chimmy" → assert URL and chat visible; send a message → assert reply (or loading then reply).
- **Flow: Hub → Trade → Retry:** From `/ai`, click Trade Analyzer → enter sides → Analyze → if error, click Retry → assert second request and UI update.
- **Flow: Tab persistence:** Go to `/af-legacy?tab=rankings` → refresh → assert Rankings tab still active and URL unchanged.
- **Flow: Content AI:** Go to `/social-clips` → select options → Generate → assert redirect to `/social-clips/[id]` and preview/actions available.

### API / contract
- **Smoke:** GET `/api/ai/tools`, GET `/api/ai/providers` return 200 and expected shape.
- **Auth:** POST `/api/chat/chimmy`, POST `/api/media/*` without session return 401.
- **Media:** POST `/api/media/podcast`, `/video`, `/blog`, `/social` with valid body and session return 200 and `id` + `type` in response.

### Accessibility
- **Buttons:** All interactive elements have accessible names (aria-label or visible text).
- **Forms:** Trade/Waiver inputs and dropdowns have associated labels or aria attributes.

---

## 6. Summary

- **Issues addressed:** Tab–URL sync (high), Trade retry (medium), AI Hub tools link (low).
- **Fixes merged:** af-legacy `handleActiveTabChange` URL sync; Trade inline error Retry button; AI Hub "View all tools" link.
- **Manual checklist:** Covers AI Hub, Chimmy, Trade, Waiver, Draft, Rankings, Content AI, and general handler/API/state checks.
- **Automated recommendations:** Unit/integration for hub and Chimmy and Trade; E2E for key flows; API smoke and auth; a11y for buttons and forms.
