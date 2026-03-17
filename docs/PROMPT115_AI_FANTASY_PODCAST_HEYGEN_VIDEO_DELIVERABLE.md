# Prompt 115 — AI Fantasy Podcast + HeyGen Video Generator + Full UI Click Audit

## 1. Fantasy podcast/video architecture

- **Podcast (existing)**  
  - **Location:** `lib/podcast-engine/`  
  - **Flow:** User clicks “Generate new podcast” → `POST /api/podcast/generate` → `FantasyPodcastGenerator` + `VoiceSynthesisService` → `PodcastDistributionService.createEpisode()` → redirect to `/podcast/[id]`. Playback uses `audioUrl` (or browser TTS fallback). Share copies `/podcast/[id]` URL.  
  - **Data:** `PodcastEpisode` (id, userId, title, script, audioUrl, durationSeconds, createdAt).

- **Video (new)**  
  - **Location:** `lib/fantasy-media/`, `app/fantasy-media/`, `app/api/fantasy-media/`  
  - **Flow:** User selects sport, content type, optional league name → “Preview script” (optional) → “Generate video” → `POST /api/fantasy-media/generate` → script built via `FantasyVideoScriptBuilder` → `HeyGenVideoService.createHeyGenVideo()` → `FantasyMediaQueryService.createEpisode()` with `provider: 'heygen'`, `providerJobId` → background `VideoGenerationJobTracker.trackVideoJob()` polls HeyGen until completed/failed and updates episode `playbackUrl`/`status`. Client can poll `GET /api/fantasy-media/episodes/[id]/status` for status/playbackUrl. Episode detail page shows video when `status === 'completed'`.  
  - **Data:** `FantasyMediaEpisode` (id, userId, sport, leagueId, mediaType, title, script, status, provider, providerJobId, playbackUrl, meta, createdAt, updatedAt); `FantasyMediaPublishLog` for future publish tracking.

- **Sports:** All flows use `lib/sport-scope.ts`: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER. Video UI uses `SUPPORTED_SPORTS` for the sport selector; script/payload builders use `normalizeToSupportedSport()`.

---

## 2. HeyGen integration design

- **Server-only:** HeyGen API key is read from `process.env.HEYGEN_API_KEY` or `process.env.HEYGEN_API_KEY_SECRET` in `HeyGenVideoService`. No key is ever sent to the frontend or stored in client state.
- **Create:** `POST https://api.heygen.com/v2/videos` with headers `Content-Type: application/json`, `x-api-key: <key>`. Body built by `HeyGenPayloadBuilder` (script, voice_id, avatar_id, title, resolution, aspect_ratio).
- **Status:** Poll via `GET https://api.heygen.com/v1/video_status.get?video_id=<id>` (same API key). Response includes status (waiting/pending/processing/completed/failed), video_url when completed, error when failed.
- **Job tracking:** After creating an episode with `providerJobId`, the server runs `trackVideoJob(episodeId)` in the background. It polls HeyGen until status is completed or failed, then updates the episode’s `status` and `playbackUrl` (or failure). The client can also poll `GET /api/fantasy-media/episodes/[id]/status`, which runs the tracker once and returns current status and playbackUrl.
- **Retries / failures:** Create is single attempt; logging does not expose the API key. Status polling uses a fixed interval and max attempts; on timeout the episode is marked failed. Frontend shows “Video generation failed” and suggests trying again from the list.

---

## 3. Prompt/payload builder design

- **FantasyVideoScriptBuilder** (`lib/fantasy-media/FantasyVideoScriptBuilder.ts`):  
  - Inputs: sport (normalized via `normalizeToSupportedSport`), leagueName, leagueId, week, contentType.  
  - Content types: weekly_recap, waiver_targets, league_recap, player_spotlight, matchup_preview, playoff_preview, playoff_recap, championship_recap, trade_reaction.  
  - Output: `GeneratedVideoScript` with title, full script text, sections (intro, key storylines, top performers, waiver targets, closing). Script is fantasy-sports-specific and sectioned for narration.

- **HeyGenPayloadBuilder** (`lib/fantasy-media/HeyGenPayloadBuilder.ts`):  
  - Input: `HeyGenPayloadInput` (title, sport, contentType, script, optional language, durationTargetSeconds, avatarId, voiceId).  
  - Output: HeyGen request body: script (truncated to 12k chars at sentence boundary), voice_id (default if not provided), avatar_id (default if not provided), title (max 200 chars), resolution 1080p, aspect_ratio 16:9.  
  - No secrets in payload; defaults are fixed server-side avatar/voice IDs.

---

## 4. Backend video workflow updates

- **POST /api/fantasy-media/script**  
  - Auth required. Body: sport?, leagueId?, leagueName?, week?, contentType?.  
  - Returns generated script (title, script, sections, contentType, sport). No DB write.

- **POST /api/fantasy-media/generate**  
  - Auth required. Body: sport?, leagueId?, leagueName?, week?, contentType?, title?, script? (if omitted, server builds script).  
  - Builds script → calls HeyGen create → creates `FantasyMediaEpisode` with status `generating`, provider `heygen`, providerJobId → starts `trackVideoJob(episodeId)` in background → returns episode id, title, status, providerJobId, createdAt.

- **GET /api/fantasy-media/episodes**  
  - Auth required. Query: mediaType?, sport?, leagueId?, limit?.  
  - Returns list of episodes with id, sport, leagueId, mediaType, title, status, playbackUrl (when completed), provider, createdAt, updatedAt.

- **GET /api/fantasy-media/episodes/[id]**  
  - Auth required. Returns single episode with script and playbackUrl when completed.

- **GET /api/fantasy-media/episodes/[id]/status**  
  - Auth required. If episode is generating and has providerJobId, runs `trackVideoJob(id)` once and returns current status and playbackUrl; otherwise returns stored status and playbackUrl.

- **Migration:** `prisma/migrations/20260339000000_add_fantasy_media_episodes/migration.sql` creates `fantasy_media_episodes` and `fantasy_media_publish_logs` with FKs to `app_users` and episodes.

---

## 5. Frontend generation/playback updates

- **Routes:**  
  - `/fantasy-media` — list + generate form (sport, content type, league name, “Preview script”, “Generate video”, “Refresh” list).  
  - `/fantasy-media/[id]` — episode detail: title, status, generating message or video player, “Refresh status”, “Copy link”, script.

- **Podcast page:** Link “Video” added to `/fantasy-media` next to “← Dashboard” on `/podcast`.

- **Fantasy Media list (`FantasyMediaListClient`):**  
  - Sport dropdown: `SUPPORTED_SPORTS`.  
  - Content type dropdown: all `MEDIA_TYPES` with labels.  
  - League name optional text input.  
  - “Preview script” → POST `/api/fantasy-media/script` → shows script in a preview box.  
  - “Generate video” → POST `/api/fantasy-media/generate` → prepends new episode to list and redirects to `/fantasy-media/[id]`.  
  - “Refresh” → GET `/api/fantasy-media/episodes` → replaces list.  
  - Episode cards link to `/fantasy-media/[id]`.

- **Episode player (`FantasyMediaPlayerClient`):**  
  - “← All videos” to `/fantasy-media`.  
  - When status is `generating`, auto-polls `/api/fantasy-media/episodes/[id]/status` every 5s and updates status/playbackUrl.  
  - “Refresh status” button manually calls same endpoint.  
  - When `status === 'completed'` and playbackUrl present, renders `<video src={playbackUrl} controls playsInline>`.  
  - “Copy link” uses Web Share API or clipboard with `/fantasy-media/[id]`.  
  - Script shown in a read-only block.

---

## 6. Full UI click audit findings

| Location | Element | Handler | State / API | Result |
|----------|--------|---------|-------------|--------|
| `/podcast` | “← Dashboard” | Link | — | OK, goes to `/dashboard`. |
| `/podcast` | “Video” | Link | — | OK, goes to `/fantasy-media`. |
| `/podcast` | “Generate new podcast” | `handleGenerate` | POST `/api/podcast/generate`, then redirect to `/podcast/[id]` | OK, wired. |
| `/podcast` | Episode row | Link | `href={/podcast/${ep.id}}` | OK. |
| `/podcast/[id]` | “← All episodes” | Link | — | OK, goes to `/podcast`. |
| `/podcast/[id]` | Play/Pause | `handlePlay` | Uses `playbackUrl` (audio) or TTS fallback | OK. |
| `/podcast/[id]` | Share | `handleShare` | Web Share or clipboard with shareUrl | OK. |
| `/fantasy-media` | “← Dashboard” | Link | — | OK. |
| `/fantasy-media` | “Podcast” | Link | — | OK, goes to `/podcast`. |
| `/fantasy-media` | Sport select | `setSport` | Local state; sent in script/generate | OK. |
| `/fantasy-media` | Content type select | `setContentType` | Local state; sent in script/generate | OK. |
| `/fantasy-media` | League name input | `setLeagueName` | Local state; sent in script/generate | OK. |
| `/fantasy-media` | “Preview script” | `handlePreviewScript` | POST `/api/fantasy-media/script`, sets `previewScript` | OK. |
| `/fantasy-media` | “Generate video” | `handleGenerateVideo` | POST `/api/fantasy-media/generate` (uses current sport/content type), then redirect | OK. |
| `/fantasy-media` | “Generate weekly recap” | `handleGenerateWeeklyRecap` | Same as generate with contentType=weekly_recap | OK. |
| `/fantasy-media` | “Generate waiver video” | `handleGenerateWaiverVideo` | Same as generate with contentType=waiver_targets | OK. |
| `/fantasy-media` | “Refresh” (list) | `fetchList` | GET `/api/fantasy-media/episodes` | OK. |
| `/fantasy-media` | Episode row | Link | `href={/fantasy-media/${ep.id}}` | OK. |
| `/fantasy-media/[id]` | “← All videos” | Link | — | OK. |
| `/fantasy-media/[id]` | Auto status poll | useEffect | GET `/api/fantasy-media/episodes/[id]/status` every 5s when generating | OK; clears when status changes. |
| `/fantasy-media/[id]` | “Refresh status” | `handleRefreshStatus` | GET `/api/fantasy-media/episodes/[id]/status` | OK. |
| `/fantasy-media/[id]` | “Copy link” | `handleShare` | Web Share or clipboard | OK. |
| `/fantasy-media/[id]` | Video playback | `<video>` | `playbackUrl` when completed | OK. |

- **Edit script:** Not implemented; script is read-only after generation. “Preview script” allows viewing before generating.  
- **Publish button:** Not implemented; `FantasyMediaPublishLog` and publish API are for future use.  
- **Mobile playback:** Video uses `playsInline` and standard controls; copy link works on mobile.  
- **Back buttons:** All “← …” links verified; no dead back targets.

---

## 7. QA findings

- **Script generation:** Script endpoint and inline build in generate use the same builder; sport and content type are applied; league name and week are optional.  
- **HeyGen payload:** Payload includes script, voice_id, avatar_id, title, resolution, aspect_ratio; script truncated at 12k chars.  
- **HeyGen request:** Create runs server-side with env key; no key in frontend.  
- **Job tracking:** Background tracker updates episode; status endpoint allows client to pull latest status and playbackUrl.  
- **Playback:** When status is completed and playbackUrl is set, the video element renders and plays.  
- **Retry:** User can create a new video from the list (no “Retry” on failed episode in this deliverable).  
- **Sport-specific:** Sport selector and API use `SUPPORTED_SPORTS` and normalization; all seven sports supported.  
- **Click paths:** All listed buttons and links have handlers and correct API/navigation; no dead buttons identified.

---

## 8. Issues fixed

- **HeyGen payload:** Always send `avatar_id` (default if not provided) so HeyGen v2 request is valid.  
- **Create response:** Use `data.video_id` (single reference) in HeyGen create parsing.  
- **Status polling:** Episode player clears the polling interval when status changes from generating (useEffect cleanup).  
- **Unused import:** Removed `Play` from FantasyMediaPlayerClient (video uses native controls).

---

## 9. Final QA checklist

- [ ] Run Prisma migration `20260339000000_add_fantasy_media_episodes` if not already applied.  
- [ ] Set `HEYGEN_API_KEY` (or `HEYGEN_API_KEY_SECRET`) in server env.  
- [ ] Logged-in user can open `/podcast` and generate a podcast; playback and share work.  
- [ ] Logged-in user can open `/fantasy-media`, choose sport/content type, preview script, generate video; redirects to episode page.  
- [ ] Episode page shows “generating” and then updates to “completed” with video when HeyGen finishes (or “failed” on error).  
- [ ] “Refresh status” updates status/playbackUrl when generating.  
- [ ] When completed, video plays; “Copy link” copies episode URL.  
- [ ] “← All videos” and “← Dashboard” / “Podcast” / “Video” links work.  
- [ ] Sport dropdown shows all seven sports; content type shows all types.  
- [ ] No HeyGen API key or secrets in client bundles or network payloads from the browser.

---

## 10. Explanation of the HeyGen-based fantasy video system

The system produces **fantasy sports recap videos** using AI-generated scripts and **HeyGen** for avatar-based video:

1. **Script:** The app builds a structured script (intro, storylines, top performers, waiver targets, closing) via `FantasyVideoScriptBuilder`, parameterized by sport, content type (e.g. weekly recap, waiver targets), and optional league name/week. Scripts are fantasy-specific and sport-aware.

2. **Payload:** `HeyGenPayloadBuilder` turns that into the HeyGen API body: narration script, voice and avatar IDs, title, resolution, and aspect ratio. No user secrets; optional avatar/voice can be added later.

3. **Create & track:** The server creates the video with HeyGen (`POST /v2/videos`), stores an episode with `provider: 'heygen'` and `providerJobId`, and runs a background job that polls HeyGen status until the video is ready or failed. The episode’s `playbackUrl` and `status` are updated accordingly.

4. **Playback:** The episode page shows a “generating” state with optional manual “Refresh status.” When HeyGen returns a URL, the page shows a `<video>` player and a “Copy link” action for sharing.

5. **Security:** The HeyGen API key is only read on the server; all create and status calls are server-side. The frontend only calls app APIs (`/api/fantasy-media/*`), which then call HeyGen.

6. **Sports:** All supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) are available in the UI and in script/payload building via `lib/sport-scope.ts`.

This delivers a single, end-to-end path from “Generate video” to HeyGen and back to playback, with a full UI click audit and no dead buttons in the implemented flows.
