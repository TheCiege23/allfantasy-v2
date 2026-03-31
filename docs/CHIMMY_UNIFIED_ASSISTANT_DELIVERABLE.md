# Chimmy Unified Assistant — Deliverable

Chimmy is the **unified calm AI assistant** for AllFantasy: the primary face of the AI experience across AI hub, private chat, trade/waiver/draft/matchup/rankings follow-ups, story mode, and content previews.

---

## 1. State flow

| State | Where | Description |
|-------|--------|-------------|
| **messages** | `ChimmyChatShell` | Array of `{ role: 'user' \| 'assistant', content, imageUrl?, meta? }`. Append on send and on API response. |
| **input** | `ChimmyChatShell` | Current input text. Cleared after send. Can be initialized from `initialPrompt` (e.g. URL `?prompt=`). |
| **isTyping** | `ChimmyChatShell` | True while POST `/api/chimmy` is in flight. Drives loading indicator in thread. |
| **voiceEnabled** | `ChimmyChatShell` | TTS on/off. Toggle in `ChimmyVoiceBar`. |
| **isVoicePlaying** | `ChimmyChatShell` | Driven by `speakChimmy` / `isChimmyVoicePlaying()` from `lib/chimmy-interface`. Used for Listen/Stop in voice bar and last assistant bubble. |
| **lastMeta** | `ChimmyChatShell` | From last assistant message `meta` (e.g. `providerStatus`). Passed to `ChimmyProviderStatus`. |
| **imagePreview / imageFile** | `ChimmyChatShell` | Optional image for next message; cleared after send. |
| **ttsUnavailable** | `ChimmyChatShell` | When true, voice controls show disabled state; no TTS call. |
| **URL prompt** | `ChimmyChatTab` / parent | `searchParams.get('prompt')` decoded and passed as `initialPrompt`; optionally cleared from URL after use (`clearUrlPromptAfterUse`). |

**Flow (send):**

1. User submits (or follow-up chip): append user message (and optional image) to `messages`, clear `input` and `imageFile`/`imagePreview`, set `isTyping = true`.
2. POST `/api/chimmy` (preferred client entry point; JSON compatibility payload including message, optional image data URL, and conversation context).
3. On success: append assistant message with `content` and `meta`; set `lastMeta` from `meta.providerStatus`; set `isTyping = false`. If `voiceEnabled`, call `speakChimmy(reply)`.
4. On error: append or show error; set `isTyping = false`.

**Flow (voice):**

- Toggle voice: `voiceEnabled` flips; no API call.
- Listen (on last assistant message or voice bar): call `speakChimmy(lastReply)` when `voiceEnabled`; `isChimmyVoicePlaying()` drives play/stop UI.
- Stop: `stopChimmyVoice()`.

---

## 2. Routing notes

| Route / usage | Purpose |
|---------------|---------|
| **`/af-legacy?tab=chat`** | Primary Chimmy chat (uses `ChimmyChatTab` → `ChimmyChatShell`). |
| **`/af-legacy?tab=chat&prompt=<encoded>`** | Same; input prefilled from `prompt`, optionally cleared from URL after use. |
| **`getChimmyChatHref()`** | Returns `/af-legacy?tab=chat`. |
| **`getChimmyChatHrefWithPrompt(prompt)`** | Returns `/af-legacy?tab=chat&prompt=...` (prompt trimmed, max 500 chars). Used by StickyAIActions and any “Open in Chimmy” / “Ask Chimmy about this result” actions. |
| **`/chimmy`** | Chimmy landing; CTAs link to `/af-legacy?tab=chat`. |
| **`/legacy?tab=chat`** | Legacy app chat tab; can keep existing `ChimmyChat` or later switch to `ChimmyChatShell` for parity. |

Tool-to-Chimmy handoff:

- **StickyAIActions**: `chimmyPrompt` → `getChimmyChatHrefWithPrompt(chimmyPrompt)` for “Open in Chimmy”.
- **MatchupSimulationCard**: `getMatchupAIChatUrl(buildMatchupSummaryForAI(...))` (same pattern: chat + prompt).
- **LeagueForecastDashboard**: “Ask Chimmy about playoff odds” → `/af-legacy?tab=chat&prompt=...` (consider `getChimmyChatHrefWithPrompt(...)` for consistency).
- Other AI result surfaces should pass a context prompt into `getChimmyChatHrefWithPrompt` where “Ask Chimmy about this result” is offered.

---

## 3. Click audit (every interaction)

| Interaction | Location | Handler / behavior |
|-------------|----------|--------------------|
| **Send message** | ChimmyChatShell input area | Submit: append user message, POST chimmy API, append assistant message; button disabled when empty and no image. |
| **Quick prompts (suggested chips)** | ChimmyChatShell when thread empty | Click sets `input` to chip text; user can edit and send. |
| **Follow-up suggestions** | ChimmyMessageBubble (after last assistant message) | Chips e.g. “Explain in more detail”, “What should I do next?”, “What are the risks?” set `input` to that prompt. |
| **Open result in Chimmy** | StickyAIActions, LeagueForecastDashboard, MatchupSimulationCard, etc. | Navigate to `getChimmyChatHrefWithPrompt(prompt)` (or equivalent); af-legacy chat tab reads `?prompt=` and prefills input. |
| **Copy reply** | ChimmyChatShell (copy last reply) | Copy last assistant `content` to clipboard; toast. |
| **Retry** | (Future) | Not yet in shell; can add “Retry” on last assistant message on error. |
| **Switch provider/mode** | (Future) | No UI in shell yet; backend can return `meta.providerStatus`; `ChimmyProviderStatus` shows status. |
| **Close / open panel** | af-legacy tab | Tab switch: `activeTab === 'chat'` shows ChimmyChatTab; no separate panel open/close. |
| **Mobile drawer** | N/A | Chat is full tab on mobile; drawer behavior is tab-based. |
| **Desktop split-pane** | N/A | Single pane per tab; no split-pane in current implementation. |
| **Voice: listen** | ChimmyVoiceBar / last assistant bubble | When voice enabled: `speakChimmy(lastReply)`; when TTS unavailable or disabled: button disabled or no-op. |
| **Voice: stop** | ChimmyVoiceBar / last assistant bubble | `stopChimmyVoice()`. |
| **Save conversation** | ChimmyChatShell | `onSaveConversation` callback (e.g. toast “Save conversation coming soon” in ChimmyChatTab). |

---

## 4. QA checklist

- [ ] **af-legacy Chat tab**: With `tab=chat`, only `ChimmyChatTab` (and thus `ChimmyChatShell`) is visible; no duplicate legacy chat UI.
- [ ] **URL prefill**: Open `/af-legacy?tab=chat&prompt=Hello` → input shows “Hello”; after send, URL can clear `prompt` if `clearUrlPromptAfterUse` is true.
- [ ] **Send**: Type message, send → user bubble appears, then assistant bubble; no double-send; loading state during request.
- [ ] **Image**: Attach image, send → image in user bubble; API receives image (if backend supports).
- [ ] **Suggested chips**: Empty thread shows chips; clicking one fills input; send works.
- [ ] **Follow-up chips**: After assistant reply, follow-up chips fill input; user can edit and send.
- [ ] **Copy last reply**: Copies last assistant message text; toast appears.
- [ ] **Voice**: With TTS configured, Listen on last message or voice bar plays; Stop stops. When TTS unavailable, Listen is disabled / no-op.
- [ ] **Provider status**: Indicator reflects last response meta or provider status API; no crash when meta missing.
- [ ] **Open in Chimmy from tools**: From trade/waiver/draft/matchup/rankings/story/content result, “Open in Chimmy” (or “Ask Chimmy about this result”) navigates to chat with prompt prefilled.
- [ ] **Mobile**: Chat tab usable; StickyAIActions (when used on result pages) has adequate tap targets (e.g. min 44px).
- [ ] **Desktop**: Same flows work; layout readable and calm (evidence-first styling).

---

## 5. Files touched (reference)

| File | Role |
|------|------|
| `components/chimmy/ChimmyChatShell.tsx` | Main shell: header, thread, input, voice bar, provider status, follow-ups, copy/save. |
| `components/chimmy/ChimmyMessageBubble.tsx` | User/assistant bubble; optional image, meta, follow-up chips, Listen. |
| `components/chimmy/ChimmyResponseStructure.tsx` | Optional evidence-first layout (quick answer, data, meaning, action, caveats). |
| `components/chimmy/ChimmyVoiceBar.tsx` | Voice on/off, stop, TTS loading/disabled, transcript ref. |
| `components/chimmy/ChimmyProviderStatus.tsx` | Provider status indicator. |
| `components/chimmy/index.ts` | Barrel export. |
| `app/af-legacy/components/ChimmyChatTab.tsx` | Wraps ChimmyChatShell; maps URL `prompt` and league name. |
| `app/af-legacy/page.tsx` | Renders `ChimmyChatTab` when `activeTab === 'chat'`; legacy chat block kept behind `false && activeTab === 'chat_legacy'`. |
| `hooks/useChimmyPromptFromUrl.ts` | Optional hook for `?prompt=` read/clear (ChimmyChatTab can use parent’s searchParams instead). |
| `lib/chimmy-interface` | Voice: `speakChimmy`, `stopChimmyVoice`, `isChimmyVoicePlaying`. |
| `lib/ai-product-layer` | `getChimmyChatHrefWithPrompt`, `getChimmyChatHref`, `getPrimaryChimmyEntry`. |
| `app/api/chat/chimmy/route.ts` | Existing; no change for Chimmy routing. |

---

## 6. Backend

- **Chimmy API**: Preferred client calls use POST `/api/chimmy`; it forwards into the existing dedicated POST `/api/chat/chimmy` handler and returns `response`, `result`, `meta`, and `upgradeRequired`.
- **Saved threads**: Not implemented; `onSaveConversation` is a hook for future API/storage.

---

## 7. Voice UX (future-ready)

- **Listen** button on last assistant message and in voice bar.
- **Transcript sync**: `ChimmyVoiceBar` accepts `transcriptRef` for future highlight/sync.
- **Play/pause**: Driven by `isChimmyVoicePlaying()`.
- **Loading**: Optional TTS loading state prop.
- **Disabled**: When `ttsUnavailable` or TTS not configured.
- **Fallback**: If TTS unavailable, Listen is disabled; no error thrown.

---

## 8. Response structure (evidence-first)

Chimmy responses are intended to support: quick answer, what the data says, what it means, action plan, caveats/uncertainty. The API currently returns a single `response` string; `ChimmyResponseStructure` is available for when the API (or client parsing) provides structured sections.
