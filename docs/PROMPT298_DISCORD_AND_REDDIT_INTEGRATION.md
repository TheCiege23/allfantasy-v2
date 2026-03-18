# PROMPT 298 — Discord and Reddit Integration

## Objective

Expand into communities: share to Discord, Reddit-ready posts, and bot/webhook integration.

## Features

### 1. Share to Discord

- **Copy for Discord**: One-click copy of message text (title, description, link) so users can paste into any Discord channel or DM.
- **Format**: Plain text with title, description, optional extra lines, and URL. No intent URL (Discord has no share URL); copy-paste is the primary flow.
- **Webhook integration**: Server-side POST to a Discord webhook URL so a channel can receive AllFantasy content as an embed (title, description, link, optional image, footer). Users or league admins can add a webhook in Discord (Server Settings → Integrations → Webhooks) and paste the URL into the app to “Post to channel.”

### 2. Reddit-ready posts

- **Title + body**: Content formatted for Reddit (title ≤300 chars, body in Markdown, ≤40k chars).
- **Suggested subreddits**: r/fantasyfootball, r/DynastyFF, r/FFCommish, r/sleeperapp.
- **Submit URL**: Pre-filled `reddit.com/submit?url=...&title=...` so the user only picks the subreddit and submits.
- **Copy title / Copy body**: For pasting into Reddit’s submit form or a draft.

### 3. Bot / webhook integration

- **Discord webhook**: `POST /api/community/discord/webhook` with `webhookUrl` and content (`title`, `description`, `url`, `imageUrl`, `extraLines`). Server POSTs to the webhook so the URL is never exposed to the client. Supports embeds (title, description, url, color, footer, image).
- **Reddit**: No webhook; Reddit-ready title/body and submit URL support community posting. A future Reddit bot would use Reddit API and app credentials separately.

## Deliverable: Integration system

### Library (lib/community-integration/)

- **types.ts** — `CommunityContentKind`, `DiscordShareContent`, `DiscordEmbedPayload`, `DiscordWebhookPayload`, `RedditReadyPost`, `CommunityShareInput`.
- **discord.ts** — `buildDiscordShareContent(input)`, `buildDiscordWebhookPayload(input)`, `postToDiscordWebhook(webhookUrl, input)`.
- **reddit.ts** — `buildRedditReadyPost(input)`, `buildRedditSubmitUrl(url, title, subreddit?)`.
- **index.ts** — Re-exports.

### API

- **POST /api/community/discord/webhook** — Body: `webhookUrl`, `title`, `description`, `url?`, `imageUrl?`, `extraLines?`, `username?`. Server calls Discord webhook with embed. Auth required.
- **POST /api/community/reddit/ready** — Body: `title`, `description`, `url?`, `imageUrl?`, `extraLines?`, `kind?`. Returns `{ title, body, suggestedSubreddits, submitUrl }`. Auth required.

### UI

- **CommunitySharePanel** — Accepts `CommunityShareInput`; shows “Copy for Discord,” Reddit “Copy title,” “Copy body,” “Open Reddit submit,” and optional “Post to Discord (webhook)” (webhook URL input + “Post to channel”). Use alongside any share flow (draft, matchup, league story, social content).

### Usage

- **Share flows**: Build `CommunityShareInput` (title, description, url, optional extraLines/imageUrl) and render `<CommunitySharePanel input={input} showWebhook />` to expose Discord copy, Reddit-ready post, and optional webhook post.
- **Discord webhook setup**: In Discord, create a webhook for the target channel. Copy the webhook URL into the panel and click “Post to channel”; the server will POST the content to that channel.
- **Reddit**: Use “Copy title” and “Copy body” and paste into Reddit’s submit form, or use “Open Reddit submit” and choose r/fantasyfootball (or another suggested subreddit).

## Files

- **Library**: `lib/community-integration/types.ts`, `discord.ts`, `reddit.ts`, `index.ts`
- **API**: `app/api/community/discord/webhook/route.ts`, `app/api/community/reddit/ready/route.ts`
- **UI**: `components/community-integration/CommunitySharePanel.tsx`, `index.ts`

## Summary

- **Share to Discord**: Copy-paste content + optional webhook post (server-side) with embed.
- **Reddit-ready posts**: Title, Markdown body, suggested subreddits, submit URL, copy actions.
- **Bot/webhook integration**: Discord webhook API used by the server; Reddit supported via ready-to-post content and submit URL.
