# Prompt 115 — AI Fantasy Podcast Generator (Deliverable)

## Primary goal

Automatically generate weekly fantasy podcasts with league recap, top waiver targets, and player performance summaries.

## Podcast content

- **League recap** — Intro and weekly storylines for the user’s league (template-based; can be wired to real league data).
- **Top waiver targets** — RB/WR waiver advice and priority (template).
- **Player performance summary** — QB/RB/WR performance themes (template; can be personalized when league is connected).

## Core modules

### FantasyPodcastGenerator (`lib/podcast-engine/FantasyPodcastGenerator.ts`)

- **generateFantasyPodcastScript(options)** — Returns `GeneratedPodcastScript`: title, full script string, and sections (league recap, waiver targets, performance summary). Options: leagueName, sport, weekLabel. Extensible with AI or live data.

### VoiceSynthesisService (`lib/podcast-engine/VoiceSynthesisService.ts`)

- **synthesizeScriptToAudio(script)** — Returns `SynthesisResult`: audioUrl (null when no server TTS), durationSeconds (estimated from word count). Placeholder for server-side TTS (e.g. ElevenLabs, Azure); playback uses browser SpeechSynthesis when audioUrl is null.

### PodcastDistributionService (`lib/podcast-engine/PodcastDistributionService.ts`)

- **createEpisode(userId, title, script, audioUrl?, durationSeconds?)** — Persists to `PodcastEpisode`; returns episode record.
- **getEpisode(id, userId)**, **listEpisodes(userId, limit)** — Read episodes.
- **getPlaybackUrl(episode)** — Returns episode.audioUrl or null (client uses script + SpeechSynthesis).
- **getShareUrl(episodeId, baseUrl)** — Returns `${baseUrl}/podcast/${episodeId}`.

## Schema

- **PodcastEpisode** — id, userId, title, script, audioUrl (nullable), durationSeconds (nullable), createdAt. Migration: `20260337000000_add_podcast_episodes`.

## API

- **POST /api/podcast/generate** — Auth required. Generates script (FantasyPodcastGenerator), runs VoiceSynthesisService (placeholder), creates episode (PodcastDistributionService). Body: optional leagueName, sport, weekLabel. Response: id, title, script, playbackUrl, shareUrl, durationSeconds, createdAt.
- **GET /api/podcast/episodes** — Auth required. Lists current user’s episodes.
- **GET /api/podcast/episodes/[id]** — Auth required. Returns one episode (owner only); includes playbackUrl, shareUrl.

## UI

- **/podcast** — List episodes + “Generate new podcast” button. Generate calls POST /api/podcast/generate then redirects to /podcast/[id].
- **/podcast/[id]** — Episode page with:
  - **Play podcast button** — If episode has playbackUrl: play/pause via HTMLAudioElement. If no playbackUrl: play/pause via browser SpeechSynthesis with episode script. Button toggles Play/Pause icon and state.
  - **Share podcast button** — Copies share URL to clipboard or opens native share when available; shows “Copied!” on success.

## Mandatory UI click audit

| Element | Location | Behavior |
|--------|----------|----------|
| **Play podcast button** | /podcast/[id] | type="button", onClick=handlePlay. When playbackUrl: uses <audio ref={audioRef}> play()/pause(). When no playbackUrl: uses window.speechSynthesis.speak(script) / cancel(). Playing state toggles; icon switches Play ↔ Pause. |
| **Share podcast button** | /podcast/[id] | type="button", onClick=handleShare. Prefer navigator.share if available; else navigator.clipboard.writeText(shareUrl). shareUrl = origin + /podcast/[id]. On success sets shareDone (shows “Copied!”). |

**Verify podcast generation and playback (QA):**

1. **Generation** — From /podcast click “Generate new podcast”; POST /api/podcast/generate runs; redirect to /podcast/[id]; episode shows title and script.
2. **Playback** — On episode page click Play; script is spoken via SpeechSynthesis (or audio plays if playbackUrl is set). Click Pause (or Play again) stops playback.
3. **Share** — Click Share; URL is copied or share dialog appears; opening the URL in a new tab requires auth and shows the same episode for the owner.

## Files touched

- `prisma/schema.prisma` — PodcastEpisode model; AppUser.podcastEpisodes relation.
- `prisma/migrations/20260337000000_add_podcast_episodes/migration.sql`
- `lib/podcast-engine/types.ts` — GeneratedPodcastScript, PodcastEpisodeRecord, etc.
- `lib/podcast-engine/FantasyPodcastGenerator.ts` — generateFantasyPodcastScript.
- `lib/podcast-engine/VoiceSynthesisService.ts` — synthesizeScriptToAudio (placeholder).
- `lib/podcast-engine/PodcastDistributionService.ts` — createEpisode, getEpisode, listEpisodes, getPlaybackUrl, getShareUrl.
- `lib/podcast-engine/index.ts`
- `lib/routing/DeepLinkHandler.ts` — Allowed /podcast.
- `app/api/podcast/generate/route.ts` — POST generate.
- `app/api/podcast/episodes/route.ts` — GET list.
- `app/api/podcast/episodes/[id]/route.ts` — GET one.
- `app/podcast/page.tsx` — Podcast list page.
- `app/podcast/PodcastListClient.tsx` — List + generate button.
- `app/podcast/[id]/page.tsx` — Episode server page.
- `app/podcast/[id]/PodcastPlayerClient.tsx` — Play and Share buttons, script display.
- `docs/PROMPT115_AI_FANTASY_PODCAST_DELIVERABLE.md` — This deliverable.
