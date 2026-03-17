# Prompt 105 — Viral League Invite System + Full UI Click Audit

## Deliverable summary

- **Invite architecture:** Bracket leagues use a unique `joinCode`; core modules `InviteTokenGenerator`, `InviteValidationResolver`, and `LeagueInviteService` provide link generation, validation (invalid/expired/full/already-member), and share URL building. Optional `inviteExpiresAt` on `BracketLeague` for expiry.
- **Invite flow:** Generate invite link (existing joinCode or regenerate in manage) → preview league info (GET `/api/league-invite/preview?code=`) → join league (POST `/api/bracket/leagues/join`).
- **Share channels:** Link, Copy, SMS, Email, Discord (copy link), Reddit, Twitter/X, plus native Web Share where available.
- **QA:** Invite link validity, expired invites, and duplicate join prevention implemented and documented below.

---

## 1. Invite architecture

### 1.1 Core modules (`lib/league-invite/`)

| Module | Purpose |
|--------|--------|
| **InviteTokenGenerator** | `getInviteTokenForLeague(leagueId, baseUrl?)` → `{ ok, joinCode, inviteLink }` or error. `buildInviteLink(joinCode, baseUrl?)` → public URL `/brackets/join?code=XXX`. Bracket leagues already have a unique `joinCode` at creation; no separate token table. |
| **InviteValidationResolver** | `normalizeJoinCode(raw)` → uppercase trim. `validateInviteCode(code, { userId? })` → `{ valid, preview? }` or `{ valid: false, error: INVALID_CODE \| EXPIRED \| LEAGUE_FULL \| ALREADY_MEMBER, preview? }`. Uses `BracketLeague` + `inviteExpiresAt`, member count, and optional already-member check. |
| **LeagueInviteService** | `getInviteLink(leagueId, baseUrl?)`, `getLeaguePreviewByCode(code, { userId? })`, `buildInviteShareUrl(inviteLink, channel, options?)` for `sms` \| `email` \| `twitter` \| `reddit` \| `discord`. |
| **buildInviteShareUrl** | Pure helper (no Prisma) in `buildInviteShareUrl.ts` for client-safe use. Builds `sms:?body=`, `mailto:?subject=&body=`, Twitter intent, Reddit submit, and returns raw link for Discord. |

### 1.2 Data model

- **BracketLeague:** `joinCode` (unique), optional `inviteExpiresAt` (DateTime, added in this deliverable). Join code is generated at league creation and can be regenerated via manage action `regenerate_join_code` (when tournament not locked).
- **BracketLeagueMember:** unique `(leagueId, userId)`; join is idempotent via upsert (duplicate join = no-op).

### 1.3 API

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/league-invite/preview` | GET | `?code=XXX` (optional `&userId=`). Returns league preview or error (404 invalid, 410 expired, 409 full/already-member). Public. |
| `/api/bracket/leagues/join` | POST | Body `{ joinCode }`. Validates via `InviteValidationResolver` (normalized code, expiry, full, already-member), then upserts `BracketLeagueMember`. Returns `{ ok, leagueId }` or error. |

### 1.4 Invite flow (end-to-end)

1. **Generate invite link:** League already has `joinCode`. Invite link = `{origin}/brackets/join?code={joinCode}`. Owner can regenerate code in pool manage UI.
2. **Preview league info:** User opens link → join page reads `?code=` → GET `/api/league-invite/preview?code=XXX` → show league name, tournament, member count, and “Join league” or error (invalid / expired / full / already a member).
3. **Join league:** User clicks “Join league” → POST `/api/bracket/leagues/join` with normalized code → validation (invalid/expired/full/already-member) → upsert member → redirect to `/brackets/leagues/{leagueId}`.

---

## 2. Share channels

| Channel | Implementation |
|---------|----------------|
| **Link** | Displayed in invite section; same URL as copy. |
| **Copy** | Copy-invite-link button; clipboard write. |
| **SMS** | `sms:?body={message}%20{url}`. |
| **Email** | `mailto:?subject=...&body=...`. |
| **Twitter/X** | `https://twitter.com/intent/tweet?text=...&url=...`. |
| **Reddit** | `https://www.reddit.com/submit?url=...&title=...`. |
| **Discord** | No submit URL; “Copy link (paste in Discord)” button copies invite URL. |
| **Native share** | Existing “Share” button uses `navigator.share` when available. |

Share UI: **Invite section** in bracket league home (`LeagueHomeTabs` → `InviteSection`) shows link + copy + native share, plus **LeagueInviteShareButtons** (Copy, SMS, Email, Twitter, Reddit, Discord, Share).

---

## 3. Mandatory UI click audit

### 3.1 Invite button

| Control | Location | Target / Result |
|---------|----------|------------------|
| “INVITE TO POOL” | Bracket league home (InviteSection) | Toggles invite panel (link + copy + share row + “Share via” row). |

### 3.2 Copy link button

| Control | Location | Target / Result |
|---------|----------|------------------|
| Copy (icon) | InviteSection, first row | Copies full invite URL to clipboard; checkmark feedback. |
| Copy (in LeagueInviteShareButtons) | InviteSection, “Share via” row | Same invite URL copied. |

### 3.3 Share buttons

| Control | Location | Target / Result |
|---------|----------|------------------|
| Share (Share2) | InviteSection, first row | Native share or copy. |
| SMS | LeagueInviteShareButtons | Opens `sms:?body=...` (or copy on unsupported). |
| Email | LeagueInviteShareButtons | Opens `mailto:?subject=...&body=...`. |
| Twitter/X | LeagueInviteShareButtons | Opens Twitter intent in new tab with correct URL and text. |
| Reddit | LeagueInviteShareButtons | Opens Reddit submit in new tab with URL and title. |
| Discord | LeagueInviteShareButtons | Copies invite link (paste in Discord). |
| Share (Share2) in LeagueInviteShareButtons | InviteSection | Native share or copy. |

### 3.4 Join league button

| Control | Location | Target / Result |
|---------|----------|------------------|
| “Join league” | `/brackets/join` (with code in URL and valid preview) | POST `/api/bracket/leagues/join` with normalized code → redirect to `/brackets/leagues/{leagueId}`. |
| “Join league” disabled | When preview is expired or full | Button disabled; user sees preview error message. |

### 3.5 Invite links load correct league context

| Scenario | Result |
|----------|--------|
| Open `/brackets/join?code=VALID_CODE` | Preview API returns that league’s name, tournament, member count; join uses same code and league. |
| Open `/brackets/join?code=INVALID` | Preview returns 404/invalid; join button still submitable but API returns invalid. |
| Open `/brackets/join?code=EXPIRED` (league has `inviteExpiresAt` in past) | Preview returns 410 and preview error message; join disabled or API returns “Invite expired”. |
| Open `/brackets/join?code=FULL` | Preview returns 409 and “This pool is full”; join disabled or API returns “League is full”. |
| Open `/brackets/join` (no code) | No preview; user can type code and submit; preview loads when code is present in URL. |

---

## 4. QA results

### 4.1 Invite link validity

- **Preview:** GET `/api/league-invite/preview?code=XXX` uses `validateInviteCode`; returns league preview when code matches a `BracketLeague.joinCode` and invite is not expired/full.
- **Join:** POST `/api/bracket/leagues/join` normalizes code and runs same validation before upserting; invalid code → 404 “Invalid code”.
- **Link format:** Invite link is `{origin}/brackets/join?code={joinCode}`; join page and API use same normalization (uppercase, trim).

### 4.2 Expired invites

- **Schema:** `BracketLeague.inviteExpiresAt` (optional DateTime) added; migration `20260326000000_add_bracket_league_invite_expires`.
- **Validation:** `InviteValidationResolver.validateInviteCode` treats invite as expired when `inviteExpiresAt` is set and in the past; returns `error: "EXPIRED"` and optional preview.
- **Preview API:** Returns 410 with `error: "EXPIRED"` and preview when applicable.
- **Join API:** Returns 410 “Invite expired” when code is valid but expired.
- **UI:** Join page shows “This invite has expired.” and disables join when preview indicates expired.

### 4.3 Duplicate join prevention

- **Idempotent join:** POST join uses `bracketLeagueMember.upsert` on `(leagueId, userId)`; existing member is updated with no-op (no duplicate rows).
- **Already-member response:** When `validateInviteCode` is called with `userId`, it detects existing membership and returns `error: "ALREADY_MEMBER"`. Join API returns 409 “Already a member” in that case.
- **Preview:** Optional `?userId=` on preview API allows showing “You’re already in this pool” when applicable.

---

## 5. Files touched (reference)

- **New:** `lib/league-invite/InviteTokenGenerator.ts`, `InviteValidationResolver.ts`, `LeagueInviteService.ts`, `buildInviteShareUrl.ts`, `index.ts`; `app/api/league-invite/preview/route.ts`; `components/bracket/LeagueInviteShareButtons.tsx`; `prisma/migrations/20260326000000_add_bracket_league_invite_expires/migration.sql`.
- **Modified:** `prisma/schema.prisma` (BracketLeague: `inviteExpiresAt`); `app/api/bracket/leagues/join/route.ts` (validation + normalized code); `app/brackets/join/page.tsx` (preview fetch, league card, preview errors, “Join league”); `components/bracket/LeagueHomeTabs.tsx` (InviteSection: LeagueInviteShareButtons row).

---

## 6. Optional follow-ups

- **Commissioner leagues:** The existing `/api/commissioner/leagues/[leagueId]/invite` and `/join?code=` flow could be wired through the same `LeagueInviteService`/validation patterns if desired (e.g. unified preview by code for both bracket and commissioner leagues).
- **Set expiry in UI:** Manage UI could expose “Set invite expiry” (e.g. 7 days) writing `inviteExpiresAt` on `BracketLeague` for testing and product use.
