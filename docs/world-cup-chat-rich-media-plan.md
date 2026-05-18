# World Cup Chat Rich Media Plan

## Current Phase

World Cup pool chat supports text, safe rich text, emoji, Klipy-backed GIF metadata, and a Cloudinary-backed image upload foundation. Polls and voice notes remain disabled foundations until pool-scoped storage, moderation, and metadata rules are fully wired.

## Cloudinary Upload Design

Recommended server-side environment variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- Optional upload preset only if signed server-side uploads are retained.

Do not expose API secrets to the client. World Cup chat features must stay consolidated behind the pool chat route to avoid Vercel route-budget growth:

- `POST /api/brackets/world-cup/[challengeId]/chat?action=upload_image`
- Require authenticated user.
- Require `WorldCupBracketParticipant` membership or manager/admin access.
- Accept multipart `file` for image upload.
- Store media in Cloudinary under a World Cup scoped folder such as `world-cup/{challengeId}/{userId}/...`.
- Persist only metadata and delivery URLs in `WorldCupBracketChatEvent.metadata`; do not store binary data in Neon/Postgres.

Suggested limits:

- Images: JPEG, PNG, WebP, GIF; max 5 MB.
- Voice notes: WebM, MP4/M4A, OGG, WAV; max 5 MB and max duration enforced client + server where possible.
- Reject SVG, HTML, executable formats, and unrecognized MIME types.

Current image message metadata:

- `messageType: "image"`
- `image.provider: "cloudinary"`
- `image.assetId`
- `image.publicId`
- `image.secureUrl`
- `image.width`
- `image.height`
- `image.format`
- `image.bytes`

## Klipy GIF Search Design

Use the existing `lib/rich-message/GIFIntegrationResolver.ts` pattern through the consolidated chat route:

- `GET /api/brackets/world-cup/[challengeId]/chat?action=gifs&q=...`
- Require pool membership.
- Use Klipy first via `VITE_KLIPY_API_KEY` or `KLIPY_API_KEY`, then existing Tenor/Giphy fallback if configured.
- Return normalized `{ id, url, previewUrl, provider }`.
- Do not return API keys or provider debug payloads.

GIF posts should save as text chat events with metadata:

- `messageType: "gif"`
- `media.provider`
- `media.url`
- `media.previewUrl`
- `visibility: "public"`

## Poll Design

Polls should use metadata first unless volume requires a dedicated model:

- `messageType: "poll"`
- `poll.question`
- `poll.options[]`
- `poll.closesAt`
- `poll.allowMultiple`

Voting should use `POST /api/brackets/world-cup/[challengeId]/chat` with `action: "poll_vote"`, one vote per user per poll option set. Commissioner-only polls can be added later, but regular pool polls should still respect membership.

## Voice Notes

Voice recording should remain disabled until:

- Browser permission UX is clear.
- Duration and file size are enforced.
- Upload route verifies pool membership.
- Playback UI never autoplays.
- Private `@chimmy` prompts never expose recordings publicly.

## Security And Privacy

- Every chat action must verify pool membership.
- Commissioner cannot override a user's notification preferences.
- Private `@chimmy` content remains visible only to sender.
- Media URLs must be stored as metadata, not as Neon binary blobs.
- All provider credentials stay server-side.
- Moderation/delete controls must exist before public media launch.
