# PROMPT 145 — AllFantasy Social Share Engine — QA Checklist

## Overview

Premium share system for leagues, bracket standings, AI analyses, matchup results, rankings, and content cards. Supports: copy link, X, Discord, Reddit, email, SMS. Privacy-safe payloads; sport-aware theming; mobile-native share UX.

---

## Implementation Summary

| Area | Location | Notes |
|------|----------|--------|
| Types & payloads | `lib/share-engine/types.ts` | `ShareableKind`, `SharePayload`, `ShareDestination` |
| Share URLs | `lib/share-engine/shareUrls.ts` | X, Reddit, email, SMS, Discord (copy) |
| Tracking (client) | `lib/share-engine/ShareTrackingService.ts` | `share_attempt`, `share_complete` → `/api/share/track` + gtag |
| Tracking (API) | `app/api/share/track/route.ts` | Validates event + meta, writes to `AnalyticsEvent` |
| ShareModal | `components/share/ShareModal.tsx` | Dialog + preview + copy + native + platform actions |
| SharePreviewCard | `components/share/SharePreviewCard.tsx` | Renders payload; sport-aware accent |
| CopyLinkAction | `components/share/CopyLinkAction.tsx` | Copy link + track |
| NativeShareAction | `components/share/NativeShareAction.tsx` | `navigator.share` when available |
| PlatformShareActions | `components/share/PlatformShareActions.tsx` | X, Discord, Reddit, email, SMS |
| Hook | `hooks/useShareModal.ts` | `openShare(payload)`, `open`, `onOpenChange`, `payload` |

---

## Mandatory Click Audit

- [ ] **Share button opens modal**  
  Where a share trigger exists (e.g. league invite, bracket invite, AI result card), clicking it opens `ShareModal` with the correct `SharePayload`.

- [ ] **Preview card renders correct content**  
  `SharePreviewCard` shows the right title, description, optional image, and sport accent for the given payload.

- [ ] **Copy link works**  
  Copy link (dedicated button or platform “Copy link”) copies the share URL (and optionally title + description). Success feedback (e.g. checkmark) appears; no console errors.

- [ ] **Platform-specific share actions work or gracefully fall back**  
  - **X**: Opens Twitter intent with correct URL and text.  
  - **Discord**: Copies link (no intent URL); UX is “copy then paste in Discord”.  
  - **Reddit**: Opens submit URL with link and title.  
  - **Email**: Opens mailto with subject and body.  
  - **SMS**: Opens sms: with body.  
  If a destination is unsupported (e.g. no share sheet on old browser), fallback (e.g. copy or modal stays open) is clear and no dead icon.

- [ ] **Share analytics events fire correctly**  
  - `share_attempt` and `share_complete` appear in backend (e.g. `AnalyticsEvent` with `toolKey: "ShareEngine"`).  
  - gtag `share` event fires on complete with `method` and `content_type`.

- [ ] **No dead share icons**  
  Every visible share icon either performs an action (copy, open URL, native share) or is hidden when not supported.

---

## Shareable Objects (Payloads)

| Kind | Typical URL source | Safe payload fields |
|------|--------------------|----------------------|
| league_invite | Invite link from `/api/invite/*` | url, title, description, sport |
| bracket_invite | Bracket join URL | url, title, bracketName, sport |
| ai_result_card | `/share/[shareId]` or deep link | url, title, description, shareId, sport |
| matchup_result | `/share/[shareId]` or app deep link | url, title, weekOrRound, leagueName (if public) |
| power_rankings | `/share/[shareId]` or app link | url, title, description, sport |
| story_recap | `/share/[shareId]` | url, title, description, shareId |
| creator_league_promo | Creator league discovery URL | url, title, description, sport |
| player_comparison | Tool result share URL | url, title, description |

Ensure no sensitive league info (member lists, emails, private IDs) is in public share URLs or OG payloads.

---

## Route / Integration Notes

- **Existing routes**  
  - `/share/[shareId]`: existing ShareableMoment landing; use for AI cards, moments, etc.  
  - `/api/share/track`: new; share analytics.  
  - `/api/analytics/track`: still used for other events; share can go through `/api/share/track` only.

- **Wiring a share button**  
  1. Build `SharePayload` (url, title, description, kind, optional sport, shareId).  
  2. Use `useShareModal()` and render `<ShareModal open={open} onOpenChange={setOpen} payload={payload} />`.  
  3. On “Share” click: `openShare(payload)`.

---

## Privacy & Safety

- [ ] Share URLs and OG metadata contain only public/safe data (no private league IDs unless intended for invite-only links).  
- [ ] Invite links use tokens; share previews do not expose member names or emails.

---

## Sport-Aware Theming

- [ ] `SharePreviewCard` uses sport accent (e.g. NFL, NBA, NHL, MLB, NCAAB, NCAAF, SOCCER) when `payload.sport` is set.  
- [ ] No single-sport hardcoding; use `lib/sport-scope.ts` for defaults.

---

## Mobile

- [ ] On mobile, “Share via…” (native share) is shown when `navigator.share` is available; fallback is modal or copy.  
- [ ] Modal is responsive and touch-friendly; no dead tap targets.

---

## Files Touched / Added

- `lib/share-engine/types.ts` (new)  
- `lib/share-engine/shareUrls.ts` (new)  
- `lib/share-engine/ShareTrackingService.ts` (new)  
- `lib/share-engine/index.ts` (new)  
- `app/api/share/track/route.ts` (new)  
- `components/share/ShareModal.tsx` (new)  
- `components/share/SharePreviewCard.tsx` (new)  
- `components/share/CopyLinkAction.tsx` (new)  
- `components/share/NativeShareAction.tsx` (new)  
- `components/share/PlatformShareActions.tsx` (new)  
- `components/share/index.ts` (new)  
- `hooks/useShareModal.ts` (new)  
- `docs/PROMPT145_SOCIAL_SHARE_ENGINE_QA_CHECKLIST.md` (this file)
