# Prompt 121 — Viral Social Sharing System + Grok + Optional Auto-Posting + Full UI Click Audit

## 1. Viral sharing architecture

- **Existing:** `lib/social-sharing/` — AchievementShareGenerator (template content), SocialShareService (share URLs, Twitter/Facebook intent, copy payload), types (ACHIEVEMENT_SHARE_TYPES, context). `/app/share-achievements` — share UI; `/share/achievements` — landing with query params. Connected accounts and publish logging live in `lib/social-clips-grok/` (SocialPublishTarget, SocialPublishLog; SocialContentAsset for Grok clips).

- **New / extended:**
  - **ShareableMoment** (Prisma): shareId (id), sport, userId, shareType, title, summary, metadata, createdAt. Stores a viral moment (achievement/milestone) for share links and publish logs.
  - **SharePublishLog** (Prisma): publishId (id), shareId, platform, status, responseMetadata, createdAt. Logs each publish attempt per share and platform.
  - **Share types:** All 11 types supported: winning_matchup, winning_league, high_scoring_team, bracket_success, rivalry_win, playoff_qualification, championship_win, great_waiver_pickup, great_trade, major_upset, top_rank_legacy. Sport-aware via `lib/sport-scope.ts` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
  - **GrokShareCopyService** — Generates captions, headlines, CTA, hashtags, platform variants via Grok (XAI_API_KEY/GROK_API_KEY). Fallback: getTemplateShareCopy from AchievementShareGenerator.
  - **SocialSharePromptBuilder** — Builds Grok system/user prompts (sport-aware, moment-aware).
  - **SharePreviewResolver** — Resolves share URL, title, caption, copy payload, Twitter/Facebook URLs for preview.
  - **SharePublishService** — Publishes a ShareableMoment to a platform; logs to SharePublishLog; stub (provider not configured) with graceful message.
  - **Connected accounts:** Reused from `lib/social-clips-grok/ConnectedSocialAccountResolver` (getConnectedTargets) for optional auto-post and connect-account UI.

- **Flow:** User picks sport and share type → **Generate share card** (POST /api/share/moment → ShareableMoment created, shareUrl returned) → **Generate copy** (POST /api/share/generate-copy → Grok or template) → **Preview** (card with copy link, copy caption, publish) → **Copy link / Copy caption** (clipboard) or **Publish to X** (POST /api/share/publish). Share link opens `/share/[shareId]` (moment landing) or `/share/achievements?type=...` (legacy).

---

## 2. Grok copy generation design

- **GrokShareCopyService** (`lib/social-sharing/GrokShareCopyService.ts`):
  - Server-only; reads XAI_API_KEY or GROK_API_KEY from env.
  - `generateShareCopy(shareType, context, sport)` → calls Grok (grok-4-0709) with prompts from SocialSharePromptBuilder; returns `GrokShareCopyOutput`: caption, headline, cta, hashtags, platformVariants (x, instagram, tiktok).
  - `getTemplateShareCopy(shareType, context)` → fallback using getShareContent + formatShareText so copy is always available when Grok is unavailable or fails.
  - JSON parsed from model output; normalized (length caps, array filters).

- **SocialSharePromptBuilder** (`lib/social-sharing/SocialSharePromptBuilder.ts`):
  - `buildShareCopySystemPrompt(shareType, context, sport)` — sport from normalizeToSupportedSport; context (league, team, opponent, week, score, player, bracket, rivalry, rank/tier); instructs JSON with caption, headline, cta, hashtags, platformVariants.
  - `buildShareCopyUserPrompt(shareType, context)` — short user message.
  - All copy is moment-aware and sport-aware.

---

## 3. Share preview flow

- **SharePreviewResolver** (`lib/social-sharing/SharePreviewResolver.ts`):
  - `resolveSharePreview(shareType, context, grokCopy, shareId?, origin?)` → SharePreviewPayload: shareUrl (either `/share/{shareId}` or getAchievementShareUrl), title, caption, headline, cta, hashtags, copyLinkPayload, twitterUrl, facebookUrl, platformVariants.
  - Preview is used by the share-achievements page after “Generate share card” or “Generate copy” to show a preview card with Copy link, Copy caption, Publish to X.

- **API:** GET `/api/share/preview?shareId=...` (auth) returns payload for a stored moment; GET with shareType + context params returns payload without a stored moment (template URL + copy).

- **UI:** Single preview state (shareUrl, title, caption); “Close” clears it. Copy link and Copy caption write to clipboard; Publish to X calls POST /api/share/publish.

---

## 4. Optional auto-post workflow design

- **Modes:** (1) Copy/share only — user copies link or caption and shares manually. (2) Preview and approve — user sees preview then clicks Publish to X (or other platform). (3) Optional auto-post — when connected accounts and “auto-post” are enabled (future), system could auto-publish on moment creation; currently not implemented; design allows adding it later.

- **Publish:** POST `/api/share/publish` with shareId and platform. SharePublishService checks ShareableMoment ownership, creates SharePublishLog (status: pending or provider_unavailable). Provider is not configured (stub); returns status and message so UI can show “Posting not configured yet” without breaking.

- **Connected accounts:** GET `/api/share/targets` returns targets from ConnectedSocialAccountResolver (same as social-clips-grok). Connect-account and auto-post toggle can be added on the same page or settings; credentials stay server-side.

- **Duplicate-post prevention:** Each publish creates a new log entry; idempotency can be added later (e.g. same shareId+platform within a time window). Reliable logging: every attempt logged in SharePublishLog with status and responseMetadata.

---

## 5. Backend provider integration updates

- **New API routes:**
  - POST `/api/share/moment` — creates ShareableMoment (auth; body: shareType, sport, leagueName, teamName, …). Returns shareId, shareUrl, title, summary, createdAt.
  - POST `/api/share/generate-copy` — generates copy via Grok or template (auth; body: shareType, sport, context). Returns caption, headline, cta, hashtags, platformVariants, fromGrok.
  - GET `/api/share/preview?shareId=...` or `?shareType=...&leagueName=...` etc. — returns SharePreviewPayload (auth for shareId).
  - POST `/api/share/publish` — body: shareId, platform. Creates SharePublishLog; returns status, logId, message (auth).
  - GET `/api/share/targets` — returns connected targets for the user (auth; uses social-clips-grok resolver).

- **Database:** Migration `20260341000000_add_shareable_moments` adds shareable_moments and share_publish_logs with FKs to app_users and shareable_moments.

- **Security:** Grok API key only in server env. No secrets in frontend. Publish and targets require auth; share moment creation and publish are scoped to userId.

---

## 6. Frontend share UX updates

- **`/app/share-achievements`** (ShareAchievementsPage):
  - **Sport selector** — dropdown with SUPPORTED_SPORTS (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
  - **Per share type:** Generate share card, Generate copy, Share, Post to X, Share on Facebook, Copy link. All handlers wired (openTwitter, openFacebook added; previously missing and caused runtime error).
  - **Preview card** (after generate card or generate copy): title, caption, Copy link, Copy caption, Publish to X, Close. Copy caption and Publish use current preview state; Publish uses shareId from last “Generate share card.”
  - **Generate share card** — POST /api/share/moment, sets shareId and preview (shareUrl, title, caption from response).
  - **Generate copy** — POST /api/share/generate-copy, sets preview (headline, caption); shareUrl uses shareId if set, else legacy achievement URL.
  - **Copy link / Copy caption** — clipboard; toast; temporary “Copied!” state.
  - **Publish to X** — POST /api/share/publish with shareId; shows provider_unavailable message when stub returns it.

- **`/share/[shareId]`** — New public landing page; loads ShareableMoment by id; displays title, summary, icon by shareType, CTA to AllFantasy.

- **`/share/achievements`** — Existing landing; TYPE_LABELS and TYPE_ICONS extended for all 11 share types so query-param shares still render correctly.

---

## 7. Full UI click audit findings

| Location | Element | Handler | Backend / wiring | Status |
|----------|--------|--------|------------------|--------|
| /app/share-achievements | Back | Link to /app | — | OK |
| /app/share-achievements | Sport selector | setSport | Local state; sent in moment + generate-copy | OK |
| /app/share-achievements | Generate share card | handleGenerateShareCard | POST /api/share/moment | OK |
| /app/share-achievements | Generate copy | handleGenerateCopy | POST /api/share/generate-copy | OK |
| /app/share-achievements | Share | handleShare | getAchievementSharePayload; native share or Twitter | OK |
| /app/share-achievements | Post to X | openTwitter | getTwitterShareUrl; window.open | OK |
| /app/share-achievements | Share on Facebook | openFacebook | getFacebookShareUrl; window.open | OK |
| /app/share-achievements | Copy link | handleCopyLink | getAchievementSharePayload; clipboard | OK |
| /app/share-achievements | Preview: Close | closePreview | setPreview(null) | OK |
| /app/share-achievements | Preview: Copy link | inline onClick | clipboard shareUrl | OK |
| /app/share-achievements | Preview: Copy caption | handleCopyCaption | clipboard caption | OK |
| /app/share-achievements | Preview: Publish to X | handlePublish | POST /api/share/publish (platform x) | OK |

- **Connect account button / auto-post toggle:** Not added on this page; GET /api/share/targets is available; connect and toggle can be added in settings or same page (design supports it).
- **Retry publish button:** Not added; SharePublishLog supports multiple attempts; retry endpoint can be added (e.g. POST /api/share/publish/retry with logId) and a retry button in UI.
- **Mobile:** Share button uses navigator.share when available; copy and open Twitter/Facebook work on mobile.

---

## 8. QA findings

- Share card generation: POST /api/share/moment creates ShareableMoment and returns shareUrl; preview updates.
- Grok copy: POST /api/share/generate-copy returns caption/headline/cta/hashtags; when Grok is not configured, template copy is returned (fromGrok: false).
- Preview: Preview card shows after generate card or generate copy; copy link and copy caption update clipboard; close clears preview.
- Copy link/caption: Handlers write to clipboard and show toast; Copy link (per type) and Copy caption (preview) both work.
- Optional auto-post: Publish to X calls API; when provider is not configured, API returns provider_unavailable and UI shows message; no crash.
- Provider fallback: SharePublishService and getTemplateShareCopy ensure graceful behavior when Grok or post provider is unavailable.
- Sport-specific: Sport selector and API use SUPPORTED_SPORTS and normalizeToSupportedSport; all seven sports supported.
- Share links: /share/[shareId] loads moment by id; /share/achievements?type=... works for legacy params; TYPE_LABELS/TYPE_ICONS cover all 11 types.

---

## 9. Issues fixed

- **Missing openTwitter and openFacebook:** Share-achievements page referenced these without defining them; both are now implemented (open Twitter/Facebook intent in new tab).
- **TYPE_LABELS and TYPE_ICONS only for three types:** Extended to all 11 ACHIEVEMENT_SHARE_TYPES so new share types render and landing page does not break.
- **DEFAULT_CONTEXT only for three types:** Replaced with getDefaultContext(type) so every share type has a valid context for payload and copy.
- **No share card or Grok copy flow:** Added Generate share card (create moment) and Generate copy (Grok or template), with preview and copy caption / publish.

---

## 10. Final QA checklist

- [ ] Run migration `20260341000000_add_shareable_moments` if not applied.
- [ ] Set XAI_API_KEY or GROK_API_KEY for Grok copy (optional; template copy works without it).
- [ ] On /app/share-achievements, select sport and share type; click **Generate share card** → preview appears with shareUrl and title/summary.
- [ ] Click **Generate copy** → preview updates with new caption/headline (Grok if configured, else template).
- [ ] Click **Copy link** (in preview or per-card) → paste in new tab → share URL opens (/share/[shareId] or /share/achievements?type=...).
- [ ] Click **Copy caption** → paste elsewhere → caption text matches preview.
- [ ] Click **Share** → native share or Twitter intent opens.
- [ ] Click **Post to X** / **Share on Facebook** → correct intent URL opens in new tab.
- [ ] Click **Publish to X** (in preview) → API returns; if provider not configured, message shown and no crash.
- [ ] Click **Close** (preview) → preview clears.
- [ ] Open /share/[shareId] for an existing moment id → landing shows title and summary.
- [ ] All 11 share types and all 7 sports selectable; no dead buttons.

---

## 11. Explanation of the viral social sharing system

The system helps users share **important moments and achievements** from AllFantasy in a way that’s **sport-aware**, **moment-aware**, and **safe** for optional posting.

1. **Share types:** Winning a matchup, winning a league, high scoring team, bracket success, rivalry win, playoff qualification, championship win, great waiver pickup, great trade, major upset, and top rank/legacy milestone. Each type has template copy and optional Grok-generated copy (captions, headlines, CTA, hashtags, platform variants).

2. **Grok:** When XAI_API_KEY (or GROK_API_KEY) is set, **GrokShareCopyService** generates share-ready copy from **SocialSharePromptBuilder** prompts. Output is normalized and returned as JSON. If Grok is unavailable, **getTemplateShareCopy** uses **AchievementShareGenerator** so copy is always available.

3. **Share card:** Creating a share card (POST /api/share/moment) stores a **ShareableMoment** and returns a shareable link (/share/[shareId]). That link can be used in social posts and opens a dedicated landing page.

4. **Preview and approve:** User can generate copy and see a preview (title, caption). They can copy link, copy caption, or click Publish to X. Copy/share-only and manual share are always available.

5. **Optional auto-post:** POST /api/share/publish logs an attempt in **SharePublishLog**. The current implementation is a stub (provider not configured); when real provider credentials are added, the same flow will perform the post. Connected accounts are resolved via **ConnectedSocialAccountResolver** (shared with social-clips-grok); auto-post toggle and connect-account UI can be added without changing this design.

6. **Safety:** No API keys in frontend; publish and moment creation require auth and are scoped to the user; duplicate-post prevention and retry can be added on top of the existing log structure.

7. **Sports:** All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) are supported via sport selector and normalizeToSupportedSport in APIs and prompts.

This delivers a single, end-to-end viral sharing flow: generate card → generate copy → preview → copy link/caption or publish, with a full UI click audit and no dead buttons in the implemented flows.
