# Unified AI Interface & Chimmy — QA and Click Audit Deliverable

## 1. Issue list by severity

### Critical (P1)

| ID | Issue | Location | Verification |
|----|--------|----------|--------------|
| P1-1 | **StickyAIActions not used on any result surface** | App-wide | Copy / Open in Chimmy / Re-run exist as a component but are never rendered on trade, waiver, draft, matchup, or rankings result views. Users cannot consistently "Open in Chimmy" or "Re-run" from result cards. |
| P1-2 | **Potential double submit in Chimmy send** | ChimmyChatShell | `sendMessage` relies only on `isTyping` and button disabled; two rapid clicks (or Enter key repeat) could fire two requests before React state update. |

### High (P2)

| ID | Issue | Location | Verification |
|----|--------|----------|--------------|
| P2-1 | **Copy in StickyAIActions gives no feedback when onCopied omitted** | StickyAIActions | Parent may not pass `onCopied`; user gets no toast on copy success. |
| P2-2 | **/ai/saved has no backend** | app/ai/saved | "View saved" and "Go to AI Hub" work; saved list is placeholder only. Document and optionally add "Coming soon" or hide link until API exists. |
| P2-3 | **Compare providers button tap target** | CompareProvidersView | Toggle button has no explicit min-height; ensure ≥44px for mobile. |

### Medium (P3)

| ID | Issue | Location | Verification |
|----|--------|----------|--------------|
| P3-1 | **Voice toggle disabled state not announced** | ChimmyVoiceBar | When `ttsUnavailable`, button is disabled; add clear aria description. |
| P3-2 | **DynastyTradeForm result: no unified Copy / Chimmy / Re-run bar** | DynastyTradeForm | "Discuss in AI Chat" exists; no Copy or Re-run in a single sticky bar; layout differs from intended unified AI actions. |

### Low (P4)

| ID | Issue | Location | Verification |
|----|--------|----------|--------------|
| P4-1 | **Provider status dots not interactive** | ChimmyProviderStatus | Dots are display-only; no tooltip on hover (title is present). Acceptable; optional tooltip improvement. |
| P4-2 | **Save conversation is placeholder** | ChimmyChatTab | "Save conversation" calls `onSaveConversation` → toast "Coming soon"; no dead button. |

---

## 2. File-by-file fix plan

| File | Changes |
|------|---------|
| **components/chimmy/ChimmyChatShell.tsx** | Add `sendingRef` guard in `sendMessage` to prevent double submit; keep `isTyping` and disabled button. |
| **components/ai-interface/StickyAIActions.tsx** | On successful copy, call `onCopied?.()` and if `onCopied` not provided, call `toast.success('Copied to clipboard')` (import sonner). |
| **components/DynastyTradeForm.tsx** | Import StickyAIActions and getChimmyChatHrefWithPrompt (or keep using getTradeAnalyzerAIChatUrl + buildTradeSummaryForAI). Render StickyAIActions after trade result (both sections and legacy result) with copyText, chimmyPrompt, onReRun, reRunLoading, onCopied. Use stickyMobileOnly true. |
| **components/ai-interface/CompareProvidersView.tsx** | Add min-h-[44px] and py-3 to the expand/collapse button for mobile tap target. |
| **components/chimmy/ChimmyVoiceBar.tsx** | When `ttsUnavailable`, set aria-label to "Voice unavailable" on the toggle button. |
| **app/ai/saved/page.tsx** | No code change; ensure "Back to AI Hub" and "Go to AI Hub" links work. Optional: add short note "Saved analyses coming soon" if product wants. |
| **app/ai/page.tsx** | No change; routes and links verified. |

---

## 3. Routes and handlers verified (pre-fix)

| Route / surface | Exists | Renders | Handler / backend | Notes |
|-----------------|--------|---------|--------------------|-------|
| /ai | Yes | Yes | Links only | AI Hub |
| /ai/saved | Yes | Yes | No list API | Placeholder |
| /chimmy | Yes | Yes | Landing; links to /af-legacy?tab=chat | |
| /af-legacy?tab=chat | Yes | ChimmyChatTab → ChimmyChatShell | POST /api/chat/chimmy | Primary Chimmy |
| Trade analyzer (dynasty) | Yes | DynastyTradeForm | POST /api/dynasty-trade-analyzer | Discuss in AI Chat link |
| Waiver AI | Yes | Waiver page / components | POST /api/waiver-ai | Rate limit, retry UI |
| Draft AI | Yes | af-legacy mock-draft, MockDraftSimulatorClient | POST /api/mock-draft/ai-pick | |
| Matchup AI | Yes | MatchupSimulationCard, etc. | getMatchupAIChatUrl → chat | |
| Rankings AI | Yes | af-legacy rankings tab | runRankingsAnalysis, etc. | |
| GET /api/ai/providers/status | Yes | useProviderStatus | Returns openai/deepseek/grok | ChimmyProviderStatus |
| Compare providers | N/A | CompareProvidersView | Read-only; no API | Shown when modelOutputs > 1 |
| Retry flows | Yes | AIFailureStateRenderer, AIErrorFallback, DynastyTradeForm onRetry | Re-call same API | |
| Voice UI | Yes | ChimmyVoiceBar, ChimmyMessageBubble Listen | speakChimmy, stopChimmyVoice; TTS only | STT optional |

---

## 4. Full merged code for fixes (applied in-repo)

Fixes were applied directly to the codebase:

- **ChimmyChatShell.tsx**: Added `sendingRef`; at start of `sendMessage` guard with `if (sendingRef.current) return; sendingRef.current = true`; in `finally` set `sendingRef.current = false`.
- **StickyAIActions.tsx**: Import `toast` from `sonner`; in `handleCopy` after `onCopied?.()` call `if (onCopied == null) toast.success('Copied to clipboard')`.
- **DynastyTradeForm.tsx**: Import `StickyAIActions`; when `result` is set, render `StickyAIActions` with `copyText` (from detVerdict or result), `chimmyPrompt` from `buildTradeSummaryForAI(teamAAssets, teamBAssets, 'dynasty')`, `onReRun={handleAnalyze}`, `reRunLoading={loading}`, `onCopied`, `stickyMobileOnly={true}`.
- **CompareProvidersView.tsx**: Add `min-h-[44px] touch-manipulation` to the expand/collapse button.
- **ChimmyVoiceBar.tsx**: When `ttsUnavailable`, set `title` and `aria-label` to "Voice unavailable".

---

## 5. Final QA checklist

- [ ] **Route exists**: /ai, /ai/saved, /chimmy, /af-legacy?tab=chat all resolve.
- [ ] **Component renders**: AI Hub cards, ChimmyChatTab, ChimmyChatShell, DynastyTradeForm result, StickyAIActions on trade result.
- [ ] **Handlers exist**: Send message, follow-up chips, Copy last reply, Save conversation, Voice toggle, Stop voice, Listen on last message, Copy (StickyAIActions), Open in Chimmy, Re-run (StickyAIActions), Retry (AIFailureStateRenderer).
- [ ] **State updates**: messages append, input clears, isTyping true during request; loading disables Analyze/Re-run.
- [ ] **Backend calls**: POST /api/chat/chimmy, POST /api/dynasty-trade-analyzer, POST /api/waiver-ai, POST /api/mock-draft/ai-pick; GET /api/ai/providers/status.
- [ ] **Success state**: Result cards show; Chimmy shows assistant message; provider status reflects.
- [ ] **Error state**: Toast on send failure; AIFailureStateRenderer on deterministic fallback; rate limit messaging.
- [ ] **Loading state**: isTyping in Chimmy; loading in DynastyTradeForm; Re-run shows "Re-running…".
- [ ] **Mobile layout**: StickyAIActions sticky bottom with safe-area; tap targets ≥44px.
- [ ] **Desktop layout**: Same flows; StickyAIActions inline when stickyMobileOnly true on trade (we use sticky so bar is visible on mobile; desktop still usable).
- [ ] **Disabled/unavailable**: Voice toggle disabled when TTS unavailable; Re-run disabled when reRunLoading.
- [ ] **No dead buttons**: Every button has onClick or is a Link with href.
- [ ] **No broken redirects**: Chimmy links go to /af-legacy?tab=chat or with prompt; /ai/saved "Back" and "Go to AI Hub" go to /ai.
- [ ] **No stale saved state**: /ai/saved is static placeholder; no cached list to invalidate.
- [ ] **No duplicated requests**: sendMessage guarded by sendingRef; Analyze and Re-run disabled when loading.

---

## 6. Manual testing checklist

1. **AI Hub**  
   - Open /ai. Click "Chat with Chimmy" → /af-legacy?tab=chat.  
   - Click each AI tool card → correct tab or page.  
   - Click "View saved" → /ai/saved. Click "Back to AI Hub" / "Go to AI Hub" → /ai.

2. **Chimmy**  
   - Send a message; see typing then reply.  
   - Click follow-up chip → input fills; send again.  
   - Copy last reply → clipboard + toast.  
   - Toggle voice off/on; on last reply click Listen (if TTS available).  
   - Hit Enter twice quickly → only one request (check network).  
   - Paste image, send → image in user bubble and in request.

3. **Trade analyzer**  
   - Run analysis; when result shows, use Copy, Open in Chimmy, Re-run from StickyAIActions.  
   - Open in Chimmy → chat opens with prompt prefilled.  
   - Re-run → loading, then new result.  
   - On deterministic fallback, click Retry → new request.

4. **Waiver / Draft / Matchup / Rankings**  
   - Run each flow once; confirm no double request on double-click where applicable.  
   - Where "Ask Chimmy" or "Discuss in AI Chat" exists, click → chat with context.

5. **Provider status**  
   - Open Chimmy; check header for provider dots (or "Checking…").  
   - After a reply, dots reflect last meta if available.

6. **Mobile**  
   - Use Chimmy and trade result on narrow viewport; StickyAIActions at bottom; all buttons tappable.

---

## 7. Automated test recommendations

If using Jest + React Testing Library (or similar):

1. **ChimmyChatShell**  
   - Render with initialPrompt; assert input is prefilled.  
   - Mock fetch /api/chat/chimmy; fire send; assert one request and messages append.  
   - Assert send button disabled when isTyping and when empty input and no image.  
   - (Optional) Simulate two rapid submit clicks; assert only one fetch call (sendingRef guard).

2. **StickyAIActions**  
   - Render with copyText, chimmyPrompt, onReRun; assert Copy, Open in Chimmy (href), Re-run present.  
   - Click Copy; assert navigator.clipboard.writeText called and onCopied or toast called.  
   - Click Re-run; assert onReRun called; when reRunLoading true, assert button disabled.

3. **DynastyTradeForm**  
   - With result rendered, assert StickyAIActions present and chimmyPrompt derived from trade summary.  
   - Click Re-run; assert handleAnalyze (or equivalent) invoked.

4. **Routes**  
   - Smoke: GET /ai, /ai/saved, /chimmy return 200 (or redirect as configured).  
   - POST /api/chat/chimmy with valid body returns 200 and response text.

5. **useProviderStatus**  
   - Mock fetch /api/ai/providers/status; assert status and availableCount after resolve.

No test framework was assumed; if none exists, add the above as manual regression items until tests are added.
