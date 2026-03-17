# Prompt 126 — Chimmy AI Chat Interface + Calm Natural Voice + Full UI Click Audit

## Deliverable summary

This document covers the Chimmy interface architecture, conversational and calm voice design, backend/orchestration and frontend updates, full UI click audit, QA findings, issues fixed, final QA checklist, and an explanation of the Chimmy interface and voice system.

---

## 1. Chimmy interface architecture

### Overview

- **Chimmy** is AllFantasy’s AI fantasy assistant. It appears in two surfaces:
  - **Standalone ChimmyChat** (`app/components/ChimmyChat.tsx`): used on `/legacy` (Legacy overview). Sends to **`/api/chat/chimmy`** (multi-model: OpenAI + Grok + DeepSeek).
  - **Inline AI Chat** in **af-legacy** (`app/af-legacy/page.tsx`): tab “AI Chat”. Sends to **`/api/legacy/chat`** (OpenAI with league/roster context). Supports `?tab=chat&prompt=...` for tool-to-Chimmy context.

### New lib: `lib/chimmy-interface/`

| Module | Purpose |
|--------|--------|
| **ChimmyVoiceStyleProfile** | Calm TTS defaults (rate, pitch, volume, preferred voice hints). Presets: `calm`, `analyst`, `warm`. |
| **ChimmyPromptStyleResolver** | Backend prompt block: calm analyst tone + response-style rules. Injected into Chimmy system prompt. |
| **ToolContextToChimmyRouter** | Maps tool/surface (matchup, draft, trade, waiver, league_forecast, rankings) to suggested prompt + context hint. |
| **ChimmyResponseFormatter** | Parses confidence from API response; formats for display. |
| **ChimmyConfidenceRenderer** | UI guidance: when to show confidence, display text. |
| **VoicePlaybackController** | TTS: `speakChimmy()`, `stopChimmyVoice()`, `isChimmyVoicePlaying()`. Calm preset, optional `onEnd`. |
| **ChimmyInterfaceService** | Default suggested chips, `getChimmyVoiceConfig()`, re-exports `getToolContextForChimmy()`. |

### Data flow

- **Tool → Chimmy**: Matchup Simulator, Draft, League Forecast, etc. link to `/af-legacy?tab=chat` (or `/legacy?tab=chat`) with optional `prompt=...`. af-legacy reads `prompt` and pre-fills the chat input.
- **Chimmy API** (`/api/chat/chimmy`): Uses `getChimmyPromptStyleBlock()` in `buildDomainGuard()` so all Chimmy replies follow the calm analyst tone.
- **ChimmyChat**: Uses `speakChimmy()` / `stopChimmyVoice()` from `lib/chimmy-interface`, default suggested chips from `getDefaultChimmyChips()`, and subtitle “Calm, clear, evidence-based”.

---

## 2. Conversational style design

- **Role**: Calm fantasy analyst; clear strategist; grounded assistant.
- **Do**: Evidence-first, action-oriented answers; confidence only when justified; sport/league aware (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer); differentiate projection vs certainty.
- **Don’t**: Overstate certainty; invent facts; be theatrical when data is limited; give vibes-based advice; ignore sport or league settings.

Backend tone is enforced via **ChimmyPromptStyleResolver** (see below) and injected into the Chimmy system prompt in `app/api/chat/chimmy/route.ts`.

---

## 3. Calm voice style design

- **Target**: Natural, calm, steady, clear, friendly; not overexcited, gimmicky, or “shouting sports commentator”; trusted analyst by default.
- **TTS** (ChimmyChat and any future voice UI):
  - **ChimmyVoiceStyleProfile**: Default preset `calm` (rate 0.98, pitch 1.05, volume 0.95; optional pause hints; preferred voice hints for calm female/en-US).
  - **VoicePlaybackController**: Single `speakChimmy(text, preset, { onEnd })` entry point; cancel-before-speak; stop button supported via `stopChimmyVoice()` and `onEnd` callback.
- **Pacing**: Readable; short pauses between sections where appropriate; numbers and recommendations spoken clearly. Future presets (e.g. analyst, warm) are supported; default remains calm/natural.

---

## 4. Backend / orchestration updates

- **`app/api/chat/chimmy/route.ts`**
  - Imports `getChimmyPromptStyleBlock` from `@/lib/chimmy-interface`.
  - `buildDomainGuard()` now injects `getChimmyPromptStyleBlock()` into the system prompt so Chimmy’s personality and tone follow the calm analyst and response-style rules.
  - Existing JSON response format and strategy mode context are unchanged.

- **`/api/legacy/chat`**  
  - Unchanged; still used by af-legacy inline chat. Can later be aligned with Chimmy tone if desired.

---

## 5. Frontend chat / voice updates

- **ChimmyChat** (`app/components/ChimmyChat.tsx`):
  - **Subtitle**: “Feminine, kind, and straight-to-the-point” → “Calm, clear, evidence-based”.
  - **Greeting**: Updated to “calm, evidence-based fantasy assistant”.
  - **TTS**: Replaced inline `SpeechSynthesisUtterance` with `speakChimmy()` / `stopChimmyVoice()` from `lib/chimmy-interface`; uses `calm` preset and `onEnd` to keep “voice playing” state in sync.
  - **Stop voice**: When `isVoicePlaying`, a Stop button (Square icon) is shown; click calls `stopChimmyVoice()` and clears state.
  - **Suggested chips**: Uses `getDefaultChimmyChips()`; shows up to 4 chips when `messages.length <= 1`; clicking a chip sets input to `chip.prompt` (user can edit before send).
  - **Enter key**: Send on Enter; prevent default so form doesn’t submit; no send on Shift+Enter (single-line input).

- **LeagueForecastDashboard** (“Ask Chimmy about playoff odds”):
  - Link updated from `/legacy?tab=chat` to `/af-legacy?tab=chat&prompt=Explain%20my%20league's%20playoff%20odds%20and%20what%20I%20should%20do%20next.` so context is pre-filled on the main Chimmy surface (af-legacy).

---

## 6. Full UI click audit findings

| Location | Element | Handler / behavior | State / API / voice | Status |
|----------|--------|--------------------|---------------------|--------|
| **ChimmyChat** (e.g. `/legacy` with tab=chat) | Header “Chimmy” / subtitle | Display only | — | OK; subtitle updated to calm/evidence-based |
| ChimmyChat | Voice toggle (Volume2/VolumeX) | `setVoiceEnabled(!voiceEnabled)` | `voiceEnabled` gates `speak()` | OK |
| ChimmyChat | Stop voice (Square) | `handleStopVoice()` → `stopChimmyVoice()` | `isVoicePlaying` set false | OK (added) |
| ChimmyChat | Suggested chips (first 4) | `onClick` → `setInput(chip.prompt)` | Input only; user sends manually | OK (added) |
| ChimmyChat | Image upload | `handleImageUpload` → `setImageFile` + preview | FormData includes image in send | OK |
| ChimmyChat | Remove image | `setImagePreview(null); setImageFile(null)` | Clears before send | OK |
| ChimmyChat | Mic (voice input) | `toggleListening()` → SpeechRecognition start/stop | `isListening`; transcript → `setInput` | OK |
| ChimmyChat | Text input | `onChange` → `setInput`; `onKeyDown` Enter → `sendMessage()` | — | OK; Enter sends, Shift+Enter no send |
| ChimmyChat | Send button | `onClick` → `sendMessage()`; disabled when `isTyping` | POST `/api/chat/chimmy`, then `setMessages` + `speak(reply)` | OK |
| **af-legacy** (AI Chat tab) | Tab “AI Chat” | Link `href="/af-legacy?tab=chat"` | `handleActiveTabChange('chat')` | OK |
| af-legacy | URL `?prompt=...` | `useEffect` from `searchParams`: `setChatInput(decodeURIComponent(promptParam).slice(0, 500))` | Pre-fills input | OK |
| af-legacy | Suggested prompts (grid) | `onClick` → `setChatInput(prompt)` | Input only | OK |
| af-legacy | Chat input | `onKeyDown` Enter (no Shift) → `sendChatMessage()` | — | OK |
| af-legacy | Send button | `onClick` → `sendChatMessage()` | POST `/api/legacy/chat`; `setChatMessages`; scroll | OK |
| af-legacy | Image upload / paste / drop | `handleChatImageUpload`, `handleChatPaste`, drag handlers | `chatImagePreview`; sent as `imageBase64` | OK |
| af-legacy | Remove image preview | `setChatImagePreview(null)` | — | OK |
| **MatchupSimulationCard** | “Explain matchup” | `Link` to `getMatchupAIChatUrl(buildMatchupSummaryForAI(...))` | URL = `/af-legacy?tab=chat&prompt=...` | OK |
| **LeagueForecastDashboard** | “Ask Chimmy about playoff odds” | `Link` to `/af-legacy?tab=chat&prompt=...` | Pre-fills playoff prompt | OK (fixed) |
| **Home / ChimmyLandingClient** | “Ask Chimmy” CTA | `Link` to `/af-legacy?tab=chat` | — | OK |
| **QuickActionsService** | “Ask Chimmy” | `href: "/af-legacy?tab=chat"` | — | OK |
| **GlobalTopNav / Bracket / etc.** | AI Chat links | `href="/af-legacy?tab=chat"` | — | OK |

**Findings**

- No dead Chimmy-related buttons found; all listed elements have correct handlers and wiring.
- **Fixed**: LeagueForecastDashboard “Ask Chimmy” now points to `/af-legacy?tab=chat` with a playoff-odds prompt so context is preserved.
- ChimmyChat: suggested chips, stop voice, and Enter-to-send behavior are wired and tested in code.
- Tool-to-Chimmy routing (matchup, draft, league forecast) uses existing bridges and URL params; af-legacy reads `prompt` and pre-fills the input.

---

## 7. QA findings

- **Chimmy opens from all intended surfaces**: Home, Chimmy landing, Legacy (both /legacy and /af-legacy), Tools Hub, Matchup Simulator, League Forecast, Bracket, Global nav, Quick Actions — all link to `/chimmy` or `/af-legacy?tab=chat` (or `/legacy?tab=chat`). No broken entry points found.
- **Context from tools**: Matchup “Explain matchup” and League Forecast “Ask Chimmy about playoff odds” now pass a `prompt` when linking to af-legacy; af-legacy pre-fills the input. Draft and other bridges already use `getDraftAIChatUrl` / similar with `prompt`.
- **Tone**: Backend Chimmy prompt uses `getChimmyPromptStyleBlock()` for calm analyst tone; ChimmyChat subtitle and greeting updated to match.
- **Evidence / confidence**: Chimmy API already returns and appends confidence when quant data exists; ChimmyResponseFormatter / ChimmyConfidenceRenderer are available for future UI display of confidence in chat bubbles.
- **Voice**: ChimmyChat uses `speakChimmy(..., 'calm', { onEnd })` and shows a Stop button when playing; no duplicate playback.
- **Mobile / desktop**: ChimmyChat and af-legacy chat are responsive; no mobile-specific dead buttons identified in the audit.

---

## 8. Issues fixed

1. **LeagueForecastDashboard “Ask Chimmy” link**  
   - Before: `/legacy?tab=chat` with no prompt.  
   - After: `/af-legacy?tab=chat&prompt=Explain%20my%20league's%20playoff%20odds%20and%20what%20I%20should%20do%20next.` so the main Chimmy surface opens with playoff-odds context pre-filled.

2. **Chimmy system prompt tone**  
   - Before: Personality and tone were inline and not aligned with a single “calm analyst” spec.  
   - After: `buildDomainGuard()` uses `getChimmyPromptStyleBlock()` so Chimmy’s tone is consistent (calm, natural, evidence-first, confidence-aware).

3. **ChimmyChat voice and UX**  
   - Subtitle and greeting updated to “calm, clear, evidence-based”.  
   - TTS switched to Chimmy voice profile (calm preset) and VoicePlaybackController; added Stop voice button when playing.  
   - Suggested prompt chips added (default chips from ChimmyInterfaceService).  
   - Enter key: send on Enter, no send on Shift+Enter.

4. **No central Chimmy “lib”**  
   - Added `lib/chimmy-interface` with ChimmyVoiceStyleProfile, ChimmyPromptStyleResolver, ToolContextToChimmyRouter, ChimmyResponseFormatter, ChimmyConfidenceRenderer, VoicePlaybackController, and ChimmyInterfaceService for reuse across surfaces and future voice presets.

---

## 9. Final QA checklist

- [ ] **Chimmy opens from all surfaces**: Home, /chimmy, /af-legacy?tab=chat, /legacy?tab=chat, Tools Hub, Matchup “Explain matchup”, League Forecast “Ask Chimmy”, Bracket, Global nav, Quick Actions.
- [ ] **Tool-to-Chimmy context**: From Matchup Simulator and League Forecast, opening Chimmy pre-fills the prompt input on af-legacy (or shows correct URL with `prompt=`).
- [ ] **ChimmyChat**: Suggested chips set input; Send and Enter send message; image upload and remove work; mic sets input; voice toggle enables/disables TTS; Stop voice appears when playing and stops playback.
- [ ] **Tone**: Chimmy responses (from `/api/chat/chimmy`) sound calm and analyst-like; no overstatement of certainty when data is limited.
- [ ] **Sports**: All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) remain supported via sport-scope and existing resolvers; no hardcoding to one sport.
- [ ] **Confidence**: When API returns confidence, it appears in the reply text (existing behavior); ChimmyConfidenceRenderer available for future UI.
- [ ] **Mobile**: Chimmy and af-legacy chat tabs and buttons work on small viewports; no dead taps.

---

## 10. Explanation of the Chimmy interface and voice system

**Chimmy** is the single AI assistant brand for AllFantasy. It should feel like one clear, trustworthy assistant across the app: calm, natural, helpful (not robotic), evidence- and confidence-aware, and sport/league aware.

**Two surfaces**

- **ChimmyChat** (e.g. on `/legacy`): Dedicated chat UI that talks to **`/api/chat/chimmy`** (multi-model pipeline: OpenAI for main answer, Grok for trends, DeepSeek for quant). Uses **Chimmy voice profile** and **VoicePlaybackController** for TTS (calm default, optional stop). Suggested chips and Enter-to-send are wired.
- **af-legacy AI Chat tab**: Inline chat in the main Legacy experience; talks to **`/api/legacy/chat`** with full league/roster context. Supports **tool-to-Chimmy** via `?tab=chat&prompt=...`. Same “Chimmy” branding and goal; backend can be aligned further with Chimmy tone if desired.

**Voice system**

- **Design**: Natural, calm, steady, clear; trusted analyst, not hype. Implemented via **ChimmyVoiceStyleProfile** (rate, pitch, volume, preferred voice hints) and **VoicePlaybackController** (speak, stop, optional onEnd). Default preset is `calm`; future presets (e.g. analyst, warm) are supported.
- **Where it’s used**: ChimmyChat uses TTS for assistant replies when voice is enabled; Stop button appears while playing and stops playback. af-legacy inline chat does not currently use TTS; it can be wired to the same controller later if desired.

**Tool-to-Chimmy**

- **ToolContextToChimmyRouter** and existing bridges (e.g. `SimulatorToAIContextBridge`, `DraftToAIContextBridge`) build suggested prompts and URLs. Links from Matchup Simulator, League Forecast, and Draft open Chimmy (af-legacy or legacy) with `prompt=...` so the user sees a pre-filled, context-aware question and can send or edit it. This keeps context from tools and keeps Chimmy as the single place for follow-up.

**Confidence**

- The Chimmy API already returns and surfaces confidence when quant data exists. **ChimmyResponseFormatter** and **ChimmyConfidenceRenderer** provide parsing and UI guidance so future chat bubbles can show confidence in a consistent, calm way (e.g. “Confidence: 72% (Medium)” only when applicable).

Together, the new **lib/chimmy-interface** and the updates to the Chimmy API and ChimmyChat (and the League Forecast link) implement a single, calm, trustworthy Chimmy experience with voice support and a full UI click audit completed.
