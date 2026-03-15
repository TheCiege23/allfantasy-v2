# Prompt 86 — Rich Media / GIF / Emoji / File Attachments + Full UI Click Audit

## 1. Rich Media Architecture

### Overview

Rich messaging support adds **emojis**, **GIFs** (paste URL or future search), **image upload**, and **safe rendering** in chat. The stack reuses the existing **PlatformChatMessage** (`body`, `messageType`, `metadata`) and adds a **lib/rich-message** layer for picker services, attachment validation, payload builders, and a safe **RichMessageRenderer**. Upload uses a new **POST /api/shared/chat/upload** endpoint that writes to `public/uploads/chat` and returns a URL.

### Supported Message Types

| messageType | body | metadata | Use |
|-------------|------|----------|-----|
| **text** | Plain text | optional | Default; emoji are Unicode and render as-is. |
| **image** | Image URL | `{ alt? }` | Uploaded image or pasted URL. |
| **gif** | GIF/image URL | `{ source? }` | Pasted GIF URL. |
| **file** | File URL | `{ filename, contentType? }` | Attachment (backend accepts; composer can be extended). |
| **media** | JSON `{ mediaUrl, mediaType, caption }` | — | Legacy media route; renderer supports it. |

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **EmojiPickerService** | `lib/rich-message/EmojiPickerService.ts` | `EMOJI_LIST`, `appendEmoji`, `insertEmojiAtPosition`, `getEmojiCategoryLabel`. |
| **GIFIntegrationResolver** | `lib/rich-message/GIFIntegrationResolver.ts` | `isGifSearchConfigured()` (NEXT_PUBLIC_TENOR/GIPHY), `getTenorSearchUrl`, `getGiphySearchUrl`, `isValidGifOrImageUrl`. Graceful fallback when no API key. |
| **MessageAttachmentService** | `lib/rich-message/MessageAttachmentService.ts` | `validateImageFile`, `validateAttachmentFile`, `getMessagePayloadForImage`, `getMessagePayloadForGif`, `getMessagePayloadForFile`; size/type constants. |
| **AttachmentPreviewController** | Inline in MessagesContent | State `attachmentPreview` (ImagePreview \| GifPreview); preview strip with remove + send; clear on send/cancel. |
| **RichMessageRenderer** | `lib/rich-message/RichMessageRenderer.tsx` | Renders by messageType: text (pre-wrap), image/gif/media (safe img), file (safe link or label). |
| **MediaViewerController** | Inline in MessagesContent | Modal when `mediaViewerUrl` set; image expand; close on overlay or button. |
| **safeMedia** | `lib/rich-message/safeMedia.ts` | `getSafeMessageMediaUrl(url)` — allows `/` and `https:` (and `http:` on localhost only). |

---

## 2. Attachment / Media Handling Logic

- **Image:** User clicks image button → file input → `validateImageFile(file)` → POST FormData to `/api/shared/chat/upload` → response `{ url }` → set `attachmentPreview = { type: "image", file, url }`. Preview strip shows thumbnail and Remove. Send uses `getMessagePayloadForImage(url)` → POST messages with `messageType: "image"`, `body: url`.
- **GIF:** User clicks GIF button → "Paste GIF URL" panel (or message that search is available when configured). Input URL → `isValidGifOrImageUrl(url)` → set `attachmentPreview = { type: "gif", url }`. Send uses `getMessagePayloadForGif(url)`.
- **Emoji:** Picker opens on Smile click; grid of `EMOJI_LIST`; click inserts via `appendEmoji(input, emoji)` and closes picker.
- **Preview remove:** Button clears `attachmentPreview` and `uploadError`.
- **Send with attachment:** If `attachmentPreview` set, send image or gif payload (body = URL, messageType, metadata); then clear preview. Can send attachment with or without text in input (text is optional when preview present).
- **Safe render:** Only `/` and `https:` (and `http:` on localhost) URLs are used in `img`/`a`; otherwise show "[Unsupported media]" or filename-only for file.

---

## 3. Backend / Storage Updates

- **POST /api/shared/chat/upload** (new)  
  - Auth required. Multipart `file`. Allowed: image (JPEG, PNG, GIF, WebP) max 5MB; other allowed types (e.g. PDF, txt, csv) max 10MB. Writes to `public/uploads/chat/<uuid>.<ext>`, returns `{ url: "/uploads/chat/..." }`.

- **POST /api/shared/chat/threads/[threadId]/messages** (updated)  
  - Accepts `messageType`: `text` (default), `image`, `gif`, `file`. For `image`/`gif`/`file`, `body` is the URL; max length for these types raised to 2000 (URLs). `metadata` unchanged (optional object).

- **Existing**  
  - `createPlatformThreadMessage` already accepts `messageType` and `metadata`; no schema change. PlatformChatMessage stores `body`, `messageType`, `metadata` (Json). Legacy **POST .../media** still creates `messageType: "media"` with JSON body; RichMessageRenderer supports it.

---

## 4. Frontend Composer and Renderer Updates

- **MessagesContent.tsx**  
  - **State:** `emojiPickerOpen`, `attachmentPreview`, `gifUrlInput`, `gifUrlOpen`, `uploadError`, `uploading`, `mediaViewerUrl`, `imageInputRef`.  
  - **Toolbar:** Emoji (Smile) toggles picker; Image opens file input; GIF opens paste-URL panel.  
  - **Preview:** When `attachmentPreview` set, strip above input with thumbnail, "Image"/"GIF" label, Remove (X).  
  - **Send:** If preview, send image/gif payload and clear preview; else send text. `canSend = (input.trim() || attachmentPreview) && !sending`.  
  - **Emoji picker:** Absolute panel with `EMOJI_LIST`; click inserts and closes.  
  - **GIF panel:** URL input + Cancel / Add GIF; `isGifSearchConfigured()` used for copy only (paste URL works either way).  
  - **Message list:** Each message rendered with **RichMessageRenderer**; `onImageClick` sets `mediaViewerUrl`.  
  - **Media viewer:** Full-screen overlay with image and Close (X); click overlay or button closes.

- **RichMessageRenderer**  
  - Handles `text`, `image`, `gif`, `file`, `media`. Uses `getSafeMessageMediaUrl` for all media URLs. Image/gif/media: clickable img; file: safe link or filename-only if unsafe.

---

## 5. Full UI Click Audit Findings

| Element | Component / Route | Handler | State / API | Status |
|--------|-------------------|--------|-------------|--------|
| Emoji picker open/close | MessagesContent | Smile button toggles `emojiPickerOpen` | Local state | Wired |
| Emoji insert | MessagesContent | Click emoji → `handleEmojiSelect` → `appendEmoji` → close picker | Input state | Wired |
| GIF button | MessagesContent | Opens `gifUrlOpen` panel | Local state | Wired |
| GIF paste URL | MessagesContent | Input + "Add GIF" → `handleGifUrlSubmit` → `isValidGifOrImageUrl` → set `attachmentPreview` | Preview state | Wired |
| GIF cancel | MessagesContent | "Cancel" closes panel, clears `gifUrlInput` | Local state | Wired |
| Image upload button | MessagesContent | Triggers `imageInputRef` file input | — | Wired |
| Image file select | MessagesContent | `handleImageSelect`: validate → POST upload → set preview | Preview + upload state | Wired |
| Preview remove | MessagesContent | X button → `setAttachmentPreview(null)` | Preview state | Wired |
| Preview send | MessagesContent | Send button when `attachmentPreview` → `handleSend` with image/gif payload | API + clear preview | Wired |
| Cancel attachment | MessagesContent | Same as preview remove | Wired |
| Message media (image/gif) click | RichMessageRenderer | `onImageClick(url)` → set `mediaViewerUrl` | Modal state | Wired |
| Media viewer close | MessagesContent | Overlay click or X → `setMediaViewerUrl(null)` | Modal state | Wired |
| File attach (generic) | — | Backend supports `messageType: "file"`; composer file picker not added | Optional extension | Backend ready |
| Download/open file link | RichMessageRenderer | `<a href={url}>` for safe file URLs | Safe URL only | Wired |
| Emoji picker outside click | — | Picker closes only via emoji select; toggle again to close | Acceptable | Documented |

---

## 6. QA Findings

- **Emoji insert:** Picker opens; selecting emoji appends to input and closes picker.  
- **GIF flow:** Paste URL → Add GIF sets preview; send posts gif message; message list shows image. Fails gracefully when URL invalid (error message).  
- **Image upload:** Select file → upload → preview appears; remove clears; send posts image message; render shows image.  
- **Attachment send/cancel:** Send with preview posts once and clears preview; cancel/remove clears preview without sending.  
- **Media in history:** Image/gif/file messages render via RichMessageRenderer; safe URLs only.  
- **Media viewer:** Click image opens modal; close or overlay closes.  
- **Mobile:** Composer toolbar and preview are responsive; media viewer uses max-h and padding.  
- **Graceful fallback:** No GIF API key: paste-URL still works; copy explains "Paste a GIF or image URL".

---

## 7. Issues Fixed

- **Message length for URLs:** Backend allowed max 1000 chars; image/gif/file URLs can be longer. Max length for `messageType` image/gif/file set to 2000 in messages route.  
- **Safe rendering:** RichMessageRenderer and safeMedia only use `/` and `https:` (and `http:` on localhost) for img and file links; otherwise fallback text.  
- **Legacy "media" type:** Renderer parses JSON body and renders `mediaUrl` when `messageType === "media"`.  
- **File type when URL unsafe:** Renderer shows filename only (no link) when URL fails safe check.  
- **GIF resolver client-safe:** Uses only `NEXT_PUBLIC_TENOR_API_KEY` / `NEXT_PUBLIC_GIPHY_API_KEY` so `isGifSearchConfigured()` works in browser.

---

## 8. Final QA Checklist

- [ ] Emoji picker opens; selecting an emoji inserts into input and closes picker.  
- [ ] Image: choose file → upload → preview appears; remove clears preview; send creates image message and shows in list.  
- [ ] GIF: open GIF panel → paste valid URL → Add GIF → preview appears; send creates gif message and shows in list.  
- [ ] Invalid GIF URL shows error; preview not set.  
- [ ] Send with only attachment (no text) works; preview clears after send.  
- [ ] Click image/gif in message opens media viewer; close/overlay closes viewer.  
- [ ] File-type messages (if any) show safe link or filename.  
- [ ] No dead buttons: emoji, GIF, image, remove, send, media close all wired.

---

## 9. Explanation of Rich Media in Chat

- **Emojis** are Unicode characters; the picker offers a fixed list of common emojis and appends the chosen emoji to the message input. No backend change; they are stored as part of the text body.

- **GIFs** are supported by pasting a GIF or image URL. The composer shows a small panel for the URL; when valid, it’s added as a preview and sent as a message with `messageType: "gif"` and `body` set to the URL. If Tenor or Giphy API keys are configured (via `NEXT_PUBLIC_*`), the UI can mention search; the current flow still uses paste-URL so it works without any provider.

- **Images** are uploaded via the chat upload API, which stores files under `public/uploads/chat` and returns a relative URL. That URL is sent as the message body with `messageType: "image"`. The message list and media viewer render it with safe-URL checks.

- **Attachments** (e.g. files): the backend accepts `messageType: "file"` with a URL in `body` and optional `metadata.filename`. The upload API allows PDF and text types; the renderer shows a safe download link or filename when the URL is not safe.

- **Preview-before-send** is the strip above the composer: after selecting an image or adding a GIF URL, the user sees a thumbnail and can remove it or send. Sending clears the preview and posts one message.

- **Safe rendering** ensures only trusted URLs (relative or https, and http on localhost) are used in `<img>` and `<a>` to avoid XSS or mixed content; otherwise a fallback label is shown.
