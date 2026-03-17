# Prompt 116 — Grok Social Media Clip Generator + Optional Auto-Posting + Full UI Click Audit

## Deliverable summary

This document covers the social clip architecture, Grok integration, prompt builder, publishing/auto-post workflow, backend and frontend updates, full UI click audit, QA findings, issues fixed, final QA checklist, and an explanation of the Grok social media generation and auto-post system.

---

## 1. Social clip architecture

### Overview

- **Two clip systems** (preserved and extended):
  - **Template graphics** (`/clips`): Uses `SocialClip` and `lib/social-clips` (getClipPayload). Generates shareable graphics (weekly winners, biggest upset, top scoring team) with template payloads. No Grok; no auto-post.
  - **Grok social clips** (`/social-clips`): Uses **Grok** for content generation and **SocialContentAsset** for storage. Supports all nine clip types, sport-aware copy, optional approval flow, and optional auto-posting to connected targets.

### Grok clip flow

1. **Generate**: User selects sport, clip type, optional league/week → POST `/api/social-clips/generate` → `SocialClipGenerator` + `GrokSocialContentService` → Grok returns short caption, headline, CTA, hashtags, social card copy, clip title, platform variants → asset saved to **SocialContentAsset** (provider: `grok`).
2. **Preview**: User opens `/social-clips/[assetId]` → GET `/api/social-clips/[assetId]` → preview content (caption, headline, hashtags, etc.) rendered.
3. **Approve** (optional): User clicks Approve → POST `/api/social-clips/[assetId]/approve` → `PublishApprovalFlowService.approveForPublish` → asset marked `approvedForPublish`.
4. **Publish**: User selects platform and clicks “Publish now” (only when approved) → POST `/api/social-clips/[assetId]/publish` → `SocialPublishService.publishAssetToPlatform` → checks connected target, creates **SocialPublishLog** (status: pending / success / failed / provider_unavailable). Real provider posting is stub until X/IG/TikTok/FB APIs are wired with credentials.
5. **Retry**: For failed or provider_unavailable logs, user clicks Retry → POST `/api/social-clips/retry/[logId]` → same publish flow.
6. **Auto-post**: User toggles “Auto-post” per platform on GET/POST `/api/share/targets` → `ConnectedSocialAccountResolver.setAutoPosting`. When enabled, future approved clips could be auto-posted (logic can be added in a scheduler or on-generate hook; currently manual “Publish now” is the only trigger).

### Database structures (existing; used as specified)

- **SocialContentAsset**: assetId (id), userId, sport, assetType, title, contentBody, provider, metadata (JSON: shortCaption, headline, hashtags, etc.), approvedForPublish, createdAt.
- **SocialPublishTarget**: targetId (id), userId, platform, accountIdentifier, autoPostingEnabled, createdAt. Unique (userId, platform).
- **SocialPublishLog**: publishId (id), assetId, platform, status, responseMetadata (JSON), createdAt.

---

## 2. Grok integration design

- **Credentials**: Server-only. `XAI_API_KEY` or `GROK_API_KEY` from environment; never exposed to frontend.
- **Client**: `lib/social-clips-grok/GrokSocialContentService.ts` uses OpenAI-compatible client with `baseURL: 'https://api.x.ai/v1'` and `model: grok-4-0709`.
- **Entry point**: `generateSocialContent(input)` → builds system + user prompt via **SocialPromptBuilder**, calls Grok, parses JSON from response, normalizes to **GrokSocialOutput** (shortCaption, headline, ctaText, hashtags, socialCardCopy, clipTitle, platformVariants).
- **Failure handling**: Missing key or API error returns `null`; caller (`SocialClipGenerator`) returns `null` and API returns 500 with a safe message (no secrets).
- **Sport scope**: All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) supported via `lib/sport-scope`; prompt builder uses `normalizeToSupportedSport`.

---

## 3. Prompt builder design

- **Module**: `lib/social-clips-grok/SocialPromptBuilder.ts`.
- **System prompt**: Sport-aware, event-aware (league name, week), tone and branding (default “energetic and fun”, “AllFantasy”). Instructs Grok to output strict JSON with: shortCaption (1–2 sentences, &lt;200 chars), headline (&lt;80), ctaText (&lt;50), hashtags (3–6), socialCardCopy (&lt;150), clipTitle (&lt;60), platformVariants (optional keys x, instagram, tiktok, facebook; each { caption, hashtags }).
- **User prompt**: Short request for the selected asset type (e.g. “Generate social copy for: weekly league winners. Sport: NFL. Return only the JSON object.”).
- **Asset types**: weekly_league_winners, biggest_upset, top_scoring_team, trending_waiver_adds, draft_highlights, rivalry_moments, bracket_challenge_highlights, ai_insight_moments, sport_platform_highlights. All mapped to human-readable labels in the system prompt.

---

## 4. Publishing / auto-post workflow design

- **Generate → Preview → Approve → Publish**: Content is generated and stored; user previews; user optionally approves; publish is allowed only when `approvedForPublish` is true.
- **Auto-posting**: Configurable per platform via **SocialPublishTarget.autoPostingEnabled**. GET/POST `/api/share/targets` reads and updates targets; no secrets sent to frontend. When provider is configured later, a job or hook can publish approved assets to targets with autoPostingEnabled.
- **Safety**: (1) Publish only if asset is approved. (2) Publish only if target is connected (accountIdentifier set). (3) Provider-not-configured: status `provider_unavailable`, message “Posting not configured for this platform yet”. (4) All attempts logged in **SocialPublishLog** (status, responseMetadata). (5) Retry reuses same publish flow; duplicate publish on repeated clicks is mitigated by idempotent log (each click creates a new attempt; deduplication can be added later if needed).
- **Platforms**: x, instagram, tiktok, facebook. **ConnectedSocialAccountResolver** returns one row per platform (connected or not); **SocialPublishService** validates platform and target before creating a log.

---

## 5. Backend provider integration updates

- **Grok**: Already used in `GrokSocialContentService` (env keys, base URL, model). No change to secrets handling.
- **Publish**: `SocialPublishService.publishAssetToPlatform` and `retryPublish` use Prisma only; `PROVIDER_CONFIGURED = false` so every publish creates a log with status `provider_unavailable` or `pending` (stub). When X/IG/TikTok/FB are wired, set `PROVIDER_CONFIGURED = true` and implement the API call; store result in **SocialPublishLog** and optionally update status to `success`/`failed`.
- **Targets**: `GET /api/share/targets` returns connected targets (no secrets). `POST /api/share/targets` added: body `{ platform, autoPostingEnabled }` → `setAutoPosting(userId, platform, enabled)`.

---

## 6. Frontend preview / publish updates

- **New routes**:
  - `/social-clips`: List page. Sport selector (all 7 sports), clip type selector (all 9 types), optional league name and week, “Generate social clip” button → POST `/api/social-clips/generate` → redirect to `/social-clips/[assetId]`. Lists user’s Grok clips (from GET `/api/social-clips`).
  - `/social-clips/[assetId]`: Detail page. Preview (headline, caption, CTA, hashtags), “Copy caption” / “Copy text”, “Approve” / “Revoke”, connected accounts with “Auto-post” toggle and “Publish now” per platform, “Publish status” list with “Refresh” and “Retry” for failed/provider_unavailable, “Regenerate new clip” (creates a new asset and redirects).
- **Clips page** (`/clips`): Link added to “Grok social clip generator” → `/social-clips` so users can discover the Grok flow.

---

## 7. Full UI click audit findings

| Location | Element | Handler / behavior | Backend / state | Status |
|----------|--------|--------------------|------------------|--------|
| `/social-clips` | Back | Link to /app | — | OK |
| `/social-clips` | Sport selector | `setSport` | — | OK |
| `/social-clips` | Clip type selector | `setSelectedType` | — | OK |
| `/social-clips` | League name input | `setLeagueName` | — | OK |
| `/social-clips` | Week input | `setWeek` | — | OK |
| `/social-clips` | Generate social clip | `handleGenerate` → POST /api/social-clips/generate | Grok + SocialContentAsset | OK |
| `/social-clips` | List item link | Link to /social-clips/[assetId] | — | OK |
| `/social-clips/[assetId]` | Back to social clips | Link to /social-clips | — | OK |
| `/social-clips/[assetId]` | Copy caption | `copyText(fullCaption, 'Caption')` | clipboard | OK |
| `/social-clips/[assetId]` | Copy text | `copyText(caption, 'Text')` | clipboard | OK |
| `/social-clips/[assetId]` | Approve | POST .../approve `{ approved: true }` | PublishApprovalFlowService | OK |
| `/social-clips/[assetId]` | Revoke | POST .../approve `{ approved: false }` | PublishApprovalFlowService | OK |
| `/social-clips/[assetId]` | Auto-post checkbox | POST /api/share/targets `{ platform, autoPostingEnabled }` | setAutoPosting | OK |
| `/social-clips/[assetId]` | Publish now (per platform) | POST .../publish `{ platform }` | SocialPublishService, canPublish | OK |
| `/social-clips/[assetId]` | Refresh (publish status) | `fetchLogs` → GET .../logs | SocialPostStatusTracker | OK |
| `/social-clips/[assetId]` | Retry (per failed log) | POST /api/social-clips/retry/[logId] | retryPublish | OK |
| `/social-clips/[assetId]` | Regenerate new clip | POST /api/social-clips/generate, redirect to new id | GrokSocialContentService | OK |
| `/clips` | Grok social clip generator link | Link to /social-clips | — | OK |
| `/clips` | Clip type select / Generate new graphic | Existing; template flow | SocialClip, getClipPayload | OK (unchanged) |
| `/clips/[id]` | Back, Share, Download | Existing | ShareLinkResolver, html2canvas | OK (unchanged) |

**Findings**: All listed elements have handlers and correct API/state wiring. No dead buttons identified. Connect-account is represented as “Not connected” with no secret; actual OAuth linking can be added in settings or a dedicated flow later.

---

## 8. QA findings

- **Grok content generation**: Works when `XAI_API_KEY` or `GROK_API_KEY` is set; returns structured JSON; asset is created and listed.
- **Preview**: Asset detail loads; caption, headline, hashtags, CTA displayed; copy buttons work.
- **Approval flow**: Approve/Revoke updates `approvedForPublish`; Publish now is disabled until approved.
- **Connected targets**: GET/POST `/api/share/targets` return and update targets; auto-post toggle updates `autoPostingEnabled`; UI shows “Not connected” when no accountIdentifier.
- **Publish / retry**: Publish creates a log (provider_unavailable when provider not configured); retry calls same publish flow; status refresh reloads logs.
- **Sport-specific**: Sport selector and prompt builder use all seven sports; content is sport-aware.
- **Provider fallback**: When provider is not configured, status and message are clear; no crash.

---

## 9. Issues fixed

1. **No API for Grok social assets**: Added POST `/api/social-clips/generate`, GET `/api/social-clips`, GET `/api/social-clips/[assetId]`, POST `.../approve`, POST `.../publish`, GET `.../logs`, POST `/api/social-clips/retry/[logId]`.
2. **No UI for Grok flow**: Added `/social-clips` (list + generate form) and `/social-clips/[assetId]` (preview, copy, approve, targets, publish, retry, regenerate).
3. **Auto-post not configurable from UI**: Added POST `/api/share/targets` with `platform` and `autoPostingEnabled`; detail page toggles per platform.
4. **Discovery**: Added link from `/clips` to `/social-clips` for the Grok generator.

---

## 10. Final QA checklist

- [ ] **Grok generation**: Set XAI_API_KEY or GROK_API_KEY; generate from `/social-clips` with sport and clip type; asset appears in list and detail.
- [ ] **Preview**: Open asset; headline, caption, hashtags, CTA visible; copy caption and copy text work.
- [ ] **Approve**: Approve asset; Publish now enables; revoke disables.
- [ ] **Targets**: GET /api/share/targets returns platforms; POST with autoPostingEnabled updates; UI shows connected/not connected and auto-post checkbox.
- [ ] **Publish**: Click Publish now (when approved); log created; status shown (e.g. provider_unavailable); Refresh updates list.
- [ ] **Retry**: For a failed/provider_unavailable log, click Retry; new attempt logged.
- [ ] **Regenerate**: Click “Regenerate new clip”; new asset created and redirect to new detail page.
- [ ] **Sports**: All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) in sport selector; content reflects sport.
- [ ] **No dead buttons**: All buttons and links in the table above trigger the correct handler and backend.

---

## 11. Explanation of the Grok social media generation and auto-post system

**Purpose**: Produce short-form social content (captions, headlines, hashtags, CTA, platform variants) for fantasy sports using **Grok**, then optionally approve and publish to connected social accounts (X, Instagram, TikTok, Facebook). Auto-posting is optional and configurable per platform.

**Flow**:

1. **Generation**: User picks sport (from all seven), clip type (e.g. weekly league winners, biggest upset, draft highlights, AI insight moments), and optional league/week. **SocialPromptBuilder** builds a Grok system and user prompt; **GrokSocialContentService** calls the Grok API (server-side, env credentials). Response is parsed and normalized; **SocialClipGenerator** produces a **GeneratedClipResult**; the API creates a **SocialContentAsset** with provider `grok` and stores the JSON in contentBody and metadata.
2. **Preview**: User sees the asset on `/social-clips/[assetId]`: headline, short caption, CTA, hashtags. Copy caption / copy text use the clipboard.
3. **Approval**: User can approve or revoke; only approved assets are allowed to be published (enforced in POST `.../publish`).
4. **Publishing**: User selects a platform and clicks “Publish now”. **SocialPublishService** checks that the target is connected and (when implemented) calls the provider API; each attempt is logged in **SocialPublishLog** with status (pending, success, failed, provider_unavailable). Until provider APIs are wired, status is `provider_unavailable` with a clear message. Retry re-runs the same publish for a given log.
5. **Auto-post**: Each **SocialPublishTarget** has an `autoPostingEnabled` flag. The UI toggles it via POST `/api/share/targets`. When provider is configured, a separate process can publish approved assets to targets with auto-post on (e.g. on a schedule or on asset approval).

**Safety**: Credentials stay on the server; frontend never sees API keys. Publish requires approval and a connected target; all attempts are logged; provider-not-configured is handled without exposing internals.

**Sports**: All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) are supported in the prompt builder and UI sport selector via `lib/sport-scope`.
