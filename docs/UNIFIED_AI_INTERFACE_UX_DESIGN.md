# AllFantasy Unified AI Interface — UX & Screen System Design

**Purpose:** Define the frontend product experience for the AI layer so all AI-powered features feel like one coherent premium system while supporting tool-specific workflows. Design only; no implementation code.

**Binding context:** AllFantasy Master Project Context; seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER); deterministic-first; Chimmy as product face; UNIFIED_AI_PRODUCT_ARCHITECTURE.md.

---

## 1. Design principles and requirements

### 1.1 Product feel

The AI interface must feel: **premium**, **sleek**, **mobile-first**, **fast**, **modern**, **clean**, **trustworthy**, **calm**, **sports-native**, **consumer-grade**.

### 1.2 Chimmy personality and visual identity

- **Tone:** Calm, natural, clear, trustworthy, helpful; not gimmicky or overhyped.
- **Visual:** Trusted fantasy analyst + premium product assistant; cross between coach, strategist, and concierge. Not a cartoon gimmick unless optional skins are introduced later.
- **Copy:** Short, actionable sentences; cite data (“Based on your league data…”); avoid hype words and emoji overload in system voice.

### 1.3 Supported sports

All AI surfaces must support: **NFL**, **NHL**, **NBA**, **MLB**, **NCAA Basketball (NCAAB)**, **NCAA Football (NCAAF)**, **Soccer**. Sport is resolved from league or context; terminology and examples in prompts/empty states are sport-aware.

---

## 2. Screen inventory

| # | Screen name | Purpose | Primary entry |
|---|-------------|---------|----------------|
| 1 | **AI Hub / Home** | Single landing for all AI tools; discovery and quick launch | `/ai` or `/af-legacy` (overview) |
| 2 | **Chimmy Chat** | Conversational AI; follow-up, cross-tool context | `/af-legacy?tab=chat`, `/chimmy` → redirect to chat |
| 3 | **Trade Analyzer AI view** | Trade fairness + AI explanation + action plan | `/af-legacy?tab=trade`; dynasty trade form + result |
| 4 | **Waiver AI view** | Waiver priority + one-move recommendation + explanation | `/af-legacy?tab=waiver` |
| 5 | **Draft AI view** | Draft War Room; board + AI pick advice + trade-up/down | `/af-legacy?tab=mock-draft` |
| 6 | **Matchup AI view** | Matchup sim + AI explanation and playoff odds | Simulation/forecast surfaces; link to Chimmy |
| 7 | **Rankings AI view** | Power/luck rankings + AI explanation | `/af-legacy?tab=rankings` |
| 8 | **Story / narrative AI view** | League story, HoF tell-story, drama narrative | League app: HoF entry/moment, drama event; “Tell story” |
| 9 | **Content / media AI view** | Social clips, blog, share copy, podcast-style | `/social-clips`, share flows, league fairness |
| 10 | **Provider comparison view** | Compare OpenAI vs Grok vs DeepSeek outputs (when multi-model) | Expand “Compare providers” on result card |
| 11 | **Unified brain merged result view** | Single synthesized result with optional “why” expand | Default result card on all tool views |
| 12 | **Saved analyses / history view** | List of saved AI results; open, copy, re-run, open in Chimmy | `/ai/saved` or drawer/sheet from hub |
| 13 | **AI settings / preferences** | Mode preference, voice on/off, confidence display, saved default | `/settings` (AI section) or sheet from hub/chat |
| 14 | **Chimmy landing** | Marketing/entry page for Chimmy; CTA to chat | `/chimmy` |
| 15 | **Voice-ready / TTS states** | Play, pause, speed, transcript; “Read aloud” on result cards | Inline on Chimmy and on result cards (future) |

---

## 3. Route map

| Route | Screen(s) | Notes |
|-------|-----------|--------|
| `/ai` | AI Hub | New or alias to `/af-legacy?tab=overview` with AI-first layout |
| `/af-legacy` | Tabbed legacy surface | Query: `?tab=overview|transfer|player-finder|rankings|mock-draft|trade|finder|strategy|pulse|waiver|compare|share|chat` |
| `/af-legacy?tab=overview` | Overview / AI hub-style lanes | Tool cards, quick Chimmy, recent/saved |
| `/af-legacy?tab=chat` | Chimmy chat panel | Full-height chat; optional `&prompt=` prefill |
| `/af-legacy?tab=trade` | Trade Command Center | Trade form + analyzer result (unified brain view) |
| `/af-legacy?tab=waiver` | Waiver Engine | Waiver list + AI one-move + explanation |
| `/af-legacy?tab=mock-draft` | Draft War Room | Board + AI pick + trade actions |
| `/af-legacy?tab=rankings` | Team Direction | Rankings table + AI explanation |
| `/af-legacy?tab=finder` | Trade Review | Trade Finder + “Ask AI” → Chimmy with context |
| `/chimmy` | Chimmy landing | CTA to `/af-legacy?tab=chat` |
| `/ai/saved` | Saved AI results | List, filter by tool, open/copy/re-run/open in Chimmy |
| `/settings` | User settings | Section: AI preferences (mode, voice, confidence) |
| `/app/league/[leagueId]/hall-of-fame/...` | HoF entry/moment | “Tell story” → narrative AI view (modal or inline) |
| `/app/league/[leagueId]/drama/[eventId]` | Drama event | “Tell story” |
| `/social-clips`, `/social-clips/[assetId]` | Content/media AI | Generate, approve, publish, copy |
| Matchup/forecast (existing) | Matchup AI view | Link “Ask Chimmy about playoff odds” → chat with prompt |

---

## 4. Component map

| Component | Responsibility | Used on screen(s) |
|-----------|----------------|-------------------|
| **AIHubPage** | AI home layout; hero, tool grid, Chimmy shortcut, recent/saved | AI Hub |
| **AIToolCard** | Single tool: icon, title, description, CTA, optional live insight | Hub, overview |
| **ChimmyChatPanel** | Message list, input, send, chips, voice toggle, stop | Chat tab, embed in drawer |
| **ChimmyMessageBubble** | User/assistant message; timestamp; optional confidence badge | Chat |
| **ProviderModeSelector** | Mode (single/specialist/consensus/unified) + provider (when multi); only when backend supports | Tool views, settings |
| **DeterministicFactsBlock** | Read-only summary: scores, verdict, key numbers from engine | Trade, waiver, rankings, draft result |
| **AISynthesisBlock** | Primary AI text (primaryAnswer); calm typography | All tool result cards |
| **ActionPlanBlock** | Suggested next action + optional alternate path; bullets | Tool result cards |
| **ConfidenceCertaintyDisplay** | Badge or meter: low/medium/high + optional %; “Why this confidence?” expand | All result cards, Chimmy meta |
| **SourceEvidenceDisplay** | keyEvidence list; “Sources” expand; no invented data | Result cards |
| **CompareModelsView** | Tabs or accordion: OpenAI / Grok / DeepSeek raw text (when multiple) | Result card expand |
| **UnifiedBrainResultView** | Merged result: facts + synthesis + action + confidence + expand | Default result card |
| **SavedAnalysesList** | List of saved results; card per item; open, copy, re-run, open in Chimmy | Saved view |
| **SavedAnalysisCard** | Single saved item: tool, date, snippet, actions | Saved view |
| **AISettingsSection** | Mode preference, voice on/off, speed, confidence display, default league | Settings |
| **AIFailureStateRenderer** | Fallback banner, retry, expand provider/details | All tool views (existing) |
| **ConfidenceBadge / TrustExplanationSheet** | Confidence pill; “Why?” sheet | Result cards (existing) |
| **VoicePlaybackBar** | Play, pause, mute, speed, progress; “Read aloud” entry | Chimmy, result cards (future) |
| **TranscriptSyncHighlight** | Highlight sentence/phrase while TTS plays (future) | Chimmy voice |
| **EmptyStateAI** | Illustration + “Run analysis” or “Ask Chimmy”; sport-aware copy | Tool views before first run |
| **ErrorStateAI** | Message + retry + “Show data only” if deterministic available | Tool views on error |

---

## 5. UX behavior spec (by area)

### 5.1 AI Hub landing page

- **Layout:** Mobile-first; hero strip with “Your AI command center” (or similar); grid of tool cards (2 cols mobile, 3–4 desktop); prominent “Chat with Chimmy” card or sticky FAB; optional “Recent” / “Saved” strip.
- **Tool cards:** Icon, title, one-line description, “Open” primary CTA; optional “Quick insight” (one sentence from API) on hover or tap. Each card links to correct tab or route (trade, waiver, rankings, draft, finder, chat, story, content).
- **Sport:** If user has a league context, show league name and sport; otherwise “All sports” or last-used sport. No single-sport-only hub.
- **Empty state:** No recent/saved: show “Run an analysis or ask Chimmy to get started.”

### 5.2 Tool cards and discovery

- **Discovery:** Hub + overview tab show same tool set. AIFeaturesPanel-style cards with route + tabId; add Story and Content/Media cards if not present. “Ask Chimmy” and “Trade Analyzer” etc. must have one canonical route each.
- **Consistency:** Same card component and same navigation target from anywhere (hub, search, quick actions).

### 5.3 Chimmy chat panel

- **Layout:** Full viewport height on chat tab; message list scrollable; input fixed at bottom; optional chips above input (e.g. “Explain my trade”, “Waiver priority”).
- **Send:** Primary CTA; loading state (skeleton or “Chimmy is thinking…”); stream optional later.
- **Messages:** User left, Chimmy right (or full-width blocks); no cartoon avatar unless optional skin; calm colors; optional small confidence badge on assistant messages when meta present.
- **Follow-up:** User can type follow-up; context (last tool result, league) sent via existing API.
- **Empty state:** “Ask me about your league, trades, waivers, or draft.” + chips.
- **Mobile:** Same panel; input avoids keyboard overlap; chips scroll horizontally.

### 5.4 Provider / mode selector

- **Visibility:** Shown only when backend allows multiple modes for that tool (from tool registry). Single-provider config: hide provider selector.
- **Mode selector:** Single Model / Specialist / Consensus / Unified Brain — only options in tool’s allowedModes; default from tool. Selection stored in request (and optionally in AI preferences).
- **Provider selector (compare):** Only when “Compare providers” is available (multi-model run and feature allows). Display-only comparison view, not a “choose provider for next run” unless product explicitly supports it.
- **Placement:** Settings and/or collapsible “AI options” on tool view (e.g. above “Run analysis”).

### 5.5 Deterministic facts summary block

- **Content:** Verdict, scores, key numbers, rankings slice — all from deterministicPayload; no AI-generated numbers. Read-only; clear typography (e.g. small table or key-value list).
- **Placement:** Above AI synthesis on every tool result card; label: “From your data” or “League data”.
- **Mobile:** Collapsible “Data summary” with expand; default open on desktop.

### 5.6 AI synthesis output block

- **Content:** primaryAnswer only; calm, readable font; no hype. Optional “Expand” to show full text if truncated.
- **Placement:** Directly below deterministic block; label: “Summary” or “Why” (tool-specific).
- **Voice:** Optional “Read aloud” button (future) that triggers TTS for this block.

### 5.7 Action plan block

- **Content:** suggestedNextAction; optional alternatePath; optional bullets from keyEvidence.
- **Placement:** Below synthesis; label: “Suggested next step”.
- **CTA:** Optional “Do this” that deep-links to relevant flow (e.g. propose trade, add waiver).

### 5.8 Confidence / certainty display

- **Display:** Badge or meter: Low / Medium / High (and optional %). Color: low = amber, medium = blue, high = green (or neutral to avoid overclaim).
- **Expand:** “Why this confidence?” opens TrustExplanationSheet or short copy (data quality, provider agreement, deterministic strength).
- **Placement:** On result card header or footer; always present when confidence is returned.

### 5.9 Source / evidence display

- **Content:** keyEvidence list (bullets); only data that came from engine/envelope. Label: “Sources” or “Evidence”.
- **Expand:** “View sources” toggles block; default collapsed on mobile, optional open on desktop.
- **No invented data:** Copy must state “From your league data” or “From engine.”

### 5.10 Compare models view

- **When:** Shown when modelOutputs length > 1 and tool allows “Compare providers”. Not a default run mode; user expands “Compare providers” on a result that already has multi-model data.
- **Layout:** Tabs or accordion: “OpenAI”, “Grok”, “DeepSeek”; each tab shows that model’s raw text. No editing; read-only.
- **Mobile:** Tabs or dropdown to switch model; same content.
- **Backend:** No new request; uses modelOutputs from current result.

### 5.11 Unified brain merged result view

- **Content:** Single card: deterministic block + synthesis + action plan + confidence + sources expand + optional compare expand. This is the default “result card” for every tool.
- **Order:** Facts → Summary → Next step → Confidence → (Expand: sources, compare, why confidence).
- **One component:** UnifiedBrainResultView composes DeterministicFactsBlock, AISynthesisBlock, ActionPlanBlock, ConfidenceCertaintyDisplay, SourceEvidenceDisplay, CompareModelsView (when applicable).

### 5.12 Saved analyses / history view

- **Content:** List of saved results (from backend or local); each card: tool name, date, league/sport, snippet, actions: Open, Copy, Re-run, Open in Chimmy.
- **Empty state:** “No saved analyses yet. Save a result from any AI tool to see it here.”
- **Filter:** By tool (trade, waiver, draft, …); optional by league.
- **Route:** `/ai/saved` or drawer from hub.

### 5.13 Follow-up question flow

- **Entry:** “Ask follow-up” or “Open in Chimmy” on a result card → navigate to `/af-legacy?tab=chat&prompt=<encoded context>` (or equivalent). Chimmy input pre-filled with context (e.g. “Explain this trade result” or “What if I add player X?”).
- **State:** Chat opens with prompt in input; user can edit and send. No dead “follow-up” button without prefill.

### 5.14 Error / fallback / retry UX

- **Error state:** User-facing message from UnifiedAIError.userMessage; “Retry” primary CTA; optional “Show data only” when deterministic result exists.
- **Fallback state:** AIFailureStateRenderer: “AI analysis is temporarily unavailable. Showing data-only result.” + Retry button + expand “Data quality & provider details”.
- **Retry:** Same request resubmitted; loading state; then success or error again. No infinite loop; after N retries optional “Contact support” or “Try again later.”

### 5.15 Loading / streaming states

- **Loading:** Skeleton for result card (deterministic block skeleton + synthesis block skeleton); or spinner + “Analyzing…” / “Chimmy is thinking…”.
- **Streaming (future):** If API supports stream, show tokens as they arrive in synthesis block; no skeleton once first token received.
- **Partial (multi-model):** If one provider returns first, optional “Partial result” label and “Waiting for others…” or show first and append (product decision).

### 5.16 Mobile layout behavior

- **Hub:** Single column; sticky “Chat with Chimmy” or FAB; tool cards stack; bottom nav or tab bar if applicable.
- **Tool views:** Single column; forms full width; result card full width; expand/collapse for evidence and compare to save space.
- **Chat:** Input fixed bottom; messages full width; chips horizontal scroll; keyboard pushes content up (no overlap).
- **Touch:** All CTAs min 44px tap target; no hover-only actions; swipe optional for compare/saved.

### 5.17 Desktop layout behavior

- **Hub:** Multi-column grid (3–4); sidebar optional for “Saved” / “Recent”; Chimmy card or sidebar chat teaser.
- **Tool views:** Optional two-panel: form/context left, result right; or single column with max-width. Compare view: side-by-side or tabs.
- **Chat:** Centered column (e.g. 640px); or side panel. Same components as mobile.

---

## 6. Voice / TTS UX (future-ready)

- **Play voice response:** One-tap play on Chimmy message or “Read aloud” on result card; server returns text, client calls TTS endpoint or local TTS.
- **Pause / Resume:** Standard controls on VoicePlaybackBar; state: playing | paused | stopped.
- **Mute:** Global mute or per-session; persists in AI preferences optional.
- **Voice speed:** 0.75x, 1x, 1.25x, 1.5x in settings or on bar.
- **Transcript sync:** Highlight current sentence/phrase while TTS plays (future).
- **“Read this analysis aloud”:** Button on UnifiedBrainResultView; same TTS pipeline for synthesis block.
- **Provider-unavailable:** If TTS service fails: “Voice isn’t available right now. You can read the response below.” No dead play button; button disabled or shows tooltip.

---

## 7. State matrix

| State | Description | UI manifestation | Next states |
|-------|-------------|------------------|-------------|
| **idle** | No request yet; form ready | Empty state or form only | loading |
| **loading** | Request in flight | Skeleton or spinner + “Analyzing…” | success, error, partial |
| **partial** | Some providers returned | Optional “Partial result” + content | success (when rest done) or show as success |
| **success** | Result received | UnifiedBrainResultView with full content | idle (re-run), follow-up (open Chimmy) |
| **error** | Request failed or rate limit | ErrorStateAI + retry | loading (retry), idle |
| **fallback** | Deterministic-only returned | AIFailureStateRenderer + data block | loading (retry), idle |
| **saved** | User saved result | SavedAnalysesList entry | open (navigate), copy, re-run, Chimmy |
| **voice_playing** | TTS playing | VoicePlaybackBar playing | voice_paused, voice_stopped |
| **voice_paused** | TTS paused | VoicePlaybackBar paused | voice_playing, voice_stopped |
| **chat_input_focused** | User typing in Chimmy | Input focused; optional suggestions | sending, idle |

---

## 8. Interaction matrix

| User action | Route / component | Primary CTA | Secondary CTA | State change | Backend | Mobile | Desktop |
|-------------|-------------------|-------------|---------------|--------------|---------|--------|---------|
| Open AI Hub | `/ai` or `/af-legacy?tab=overview` | “Open [Tool]” per card | “Chat with Chimmy” | — | — | Tap card | Click card |
| Open Chimmy | `/af-legacy?tab=chat` | Send message | Chips, voice toggle | idle → loading → success/error | POST /api/chat/chimmy | Tap send | Click send |
| Run trade analysis | `/af-legacy?tab=trade` | “Analyze” | — | idle → loading → success/fallback/error | POST dynasty-trade-analyzer (or unified) | Tap Analyze | Click Analyze |
| Run waiver AI | `/af-legacy?tab=waiver` | “Run AI” / “Get recommendation” | — | idle → loading → success/error | POST waiver-ai | Tap | Click |
| Run draft AI | `/af-legacy?tab=mock-draft` | “Ask AI” / pick suggestion | — | idle → loading → success | POST mock-draft/ai-pick | Tap | Click |
| Run rankings explain | `/af-legacy?tab=rankings` | “Explain” / “Why” | — | idle → loading → success | rankings/league-v2 or explain | Tap | Click |
| Tell story (HoF/drama) | League app HoF/drama page | “Tell story” | — | idle → loading → success | POST hall-of-fame/tell-story or drama/tell-story | Tap | Click |
| Compare providers | Result card expand | “Compare providers” | — | — (uses existing modelOutputs) | None (client-only) | Expand section | Expand section |
| Re-run analysis | Any tool result | “Re-run” / “Retry” | — | success/error → loading → … | Same as Run | Tap Retry | Click Retry |
| Copy result | Result card | “Copy” | — | — | None | Tap Copy | Click Copy |
| Share result | Result card | “Share” | — | — | None (native share) | Share sheet | Copy link or share |
| Save result | Result card | “Save” | — | success → saved | POST save AI result (e.g. /api/ai/saved) | Tap Save | Click Save |
| Ask follow-up | Result card | “Ask follow-up” / “Open in Chimmy” | — | Navigate to chat with prefill | — | Navigate | Navigate |
| Open saved | `/ai/saved` | “Open” on card | Copy, Re-run, Open in Chimmy | — | GET saved list; open = load payload | Tap Open | Click Open |
| Change mode | Tool view or Settings | Mode selector | — | Preference stored; next run uses it | GET/POST preferences (optional) | Select | Select |
| Play voice | Chimmy or result card | “Play” / “Read aloud” | Pause, speed | idle → voice_playing | POST /api/voice/synthesize (future) | Tap Play | Click Play |
| Pause voice | Voice bar | “Pause” | Resume, Stop | voice_playing → voice_paused | — | Tap Pause | Click Pause |
| Expand details | Result card | “Expand” / “View sources” | — | UI expand | — | Tap | Click |
| Retry after error | Any error state | “Retry” | “Show data only” (if available) | error → loading | Same as Run | Tap Retry | Click Retry |

---

## 9. Mandatory click audit (per screen / element)

### 9.1 AI Hub

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Tool card (Trade) | `/af-legacy?tab=trade` | AIToolCard | Open | — | Navigate | — | — | — | Tap | Click |
| Tool card (Waiver) | `/af-legacy?tab=waiver` | AIToolCard | Open | — | Navigate | — | — | — | Tap | Click |
| Tool card (Draft) | `/af-legacy?tab=mock-draft` | AIToolCard | Open | — | Navigate | — | — | — | Tap | Click |
| Tool card (Rankings) | `/af-legacy?tab=rankings` | AIToolCard | Open | — | Navigate | — | — | — | Tap | Click |
| Tool card (Finder) | `/af-legacy?tab=finder` | AIToolCard | Open | — | Navigate | — | — | — | Tap | Click |
| Tool card (Chat) | `/af-legacy?tab=chat` | AIToolCard | Chat with Chimmy | — | Navigate | — | — | — | Tap | Click |
| Saved strip | `/ai/saved` | Link/button | View saved | — | Navigate | GET /api/ai/saved (or equiv) | “No saved yet” | — | Tap | Click |
| Settings | `/settings` (AI section) | Link | AI preferences | — | Navigate | — | — | — | Tap | Click |

### 9.2 Chimmy chat panel

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Send message | `/af-legacy?tab=chat` | ChimmyChatPanel | Send | — | idle → loading → success | POST /api/chat/chimmy | “Ask me about…” | Retry + message | Tap Send | Click Send |
| Chip | same | ChimmyChatPanel | Use chip as prompt | — | Submit prompt | same | — | — | Tap chip | Click chip |
| Voice toggle | same | ChimmyChatPanel | Play / Stop | — | voice_playing ↔ idle | TTS API (future) | — | “Voice unavailable” | Tap | Click |
| Expand confidence | same | ChimmyMessageBubble | “Why?” | — | Expand sheet | — | — | — | Tap | Click |

### 9.3 Trade Analyzer AI view

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Analyze | `/af-legacy?tab=trade` | DynastyTradeForm / wrapper | Analyze | — | idle → loading → success/fallback | POST dynasty-trade-analyzer | — | AIFailureStateRenderer + Retry | Tap Analyze | Click Analyze |
| Re-run | same | UnifiedBrainResultView | Re-run | — | success → loading | same | — | — | Tap | Click |
| Copy | same | Result card | Copy | — | — | — | — | — | Tap | Click |
| Open in Chimmy | same | Result card | Ask follow-up | — | Navigate to chat with prompt | — | — | — | Tap | Click |
| Expand sources | same | SourceEvidenceDisplay | View sources | — | Expand | — | — | — | Tap | Click |
| Compare providers | same | CompareModelsView | Compare | — | Expand tabs | — (uses modelOutputs) | — | — | Tap tabs | Click tabs |
| Retry (fallback) | same | AIFailureStateRenderer | Retry AI | — | fallback → loading | same | — | — | Tap | Click |

### 9.4 Waiver / Draft / Rankings / Story / Content views

Same pattern per tool: **Primary CTA** = Run AI or main action; **Secondary** = Copy, Open in Chimmy, Re-run, Expand; **Backend** = corresponding POST; **Empty** = “Run analysis to see AI insight”; **Error** = ErrorStateAI + Retry; **Mobile/Desktop** = Tap vs Click. (Table omitted for brevity; structure identical to Trade.)

### 9.5 Provider comparison view

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Compare providers | Inside result card | CompareModelsView | Switch tab (OpenAI/Grok/DeepSeek) | — | — | None | “Single model run” | — | Tap tab | Click tab |

### 9.6 Saved analyses / history view

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Open saved | `/ai/saved` | SavedAnalysisCard | Open | Copy, Re-run, Chimmy | Navigate or load | GET saved (open = load) | “No saved yet” | Retry list | Tap Open | Click Open |
| Copy / Re-run / Chimmy | same | SavedAnalysisCard | — | Copy, Re-run, Open in Chimmy | — | — | — | — | Tap | Click |

### 9.7 AI settings / preferences

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Mode preference | `/settings` | AISettingsSection | Select mode | — | Preference saved | POST preferences | Default selected | — | Select | Select |
| Voice on/off | same | AISettingsSection | Toggle | — | Preference saved | POST preferences | — | — | Toggle | Toggle |
| Save | same | AISettingsSection | Save | — | success | POST | — | “Couldn’t save” | Tap Save | Click Save |

### 9.8 Voice / TTS (future)

| Element | Route | Component | Primary CTA | Secondary CTA | State change | Backend | Empty state | Error state | Mobile | Desktop |
|--------|-------|-----------|-------------|---------------|--------------|---------|-------------|-------------|--------|---------|
| Play | Chat / result card | VoicePlaybackBar | Play | — | idle → voice_playing | POST /api/voice/synthesize | — | “Voice unavailable” | Tap Play | Click Play |
| Pause | same | VoicePlaybackBar | Pause | — | voice_playing → voice_paused | — | — | — | Tap | Click |
| Speed | same or Settings | Select | 1x, 1.25x, … | — | Preference/session | — | — | — | Select | Select |

---

## 10. Premium UI recommendations

- **Typography:** One clear sans for UI; one readable serif or sans for long AI text (synthesis block). Sizes: at least 16px body on mobile; clear hierarchy (title > summary > evidence).
- **Color:** Neutral base (e.g. dark theme with white/off-white text); accent for primary CTA and confidence (green/amber/blue); no neon overload. Chimmy area: calm, low saturation.
- **Spacing:** Consistent 4/8/16/24px scale; cards with padding; sections separated.
- **Motion:** Subtle: skeleton pulse, button hover, expand/collapse. No distracting animation on result load.
- **Accessibility:** Contrast WCAG AA; focus states; labels for icon buttons (e.g. “Play voice”); reduce motion respected.
- **Performance:** Lazy-load below-fold (e.g. saved list); skeleton before result; avoid layout shift when result arrives.
- **Sports-native:** Use league name, team name, sport in empty states and labels (“Your NFL league”, “Waiver order”); support all seven sports in copy and examples.
- **Trust signals:** “From your data”, “Based on league settings”, confidence label, “View sources” — always visible or one tap away.

---

## 11. Summary

- **Screen inventory:** 15 screens (Hub, Chat, Trade, Waiver, Draft, Matchup, Rankings, Story, Content, Compare, Unified result, Saved, Settings, Chimmy landing, Voice states).
- **Route map:** `/ai`, `/af-legacy?tab=*`, `/chimmy`, `/ai/saved`, `/settings`, league app routes, `/social-clips`.
- **Component map:** 20+ components from AIHubPage through VoicePlaybackBar and empty/error states.
- **UX spec:** Covers all 17 requested areas; Chimmy calm/trusted; voice-ready; seven sports.
- **State matrix:** idle, loading, partial, success, error, fallback, saved, voice_playing/paused, chat_input_focused.
- **Interaction matrix:** Every primary/secondary CTA with route, component, backend, mobile/desktop.
- **Click audit:** Per-screen tables for Hub, Chat, Trade, Waiver/Draft/Rankings/Story/Content (pattern), Compare, Saved, Settings, Voice; no dead buttons; empty and error states defined.
- **Premium UI:** Typography, color, spacing, motion, a11y, performance, sports-native, trust signals.

*End of Unified AI Interface UX Design. No implementation code.*
