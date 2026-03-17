# AI Interface Frontend — Deliverable Summary

## File manifest

### [NEW]

| Path | Description |
|------|-------------|
| `app/ai/layout.tsx` | AI section layout; wraps children in ProductShellLayout. |
| `app/ai/page.tsx` | AI Hub page: hero, Chimmy CTA, tool cards (trade, waiver, draft, rankings, finder, story, content), saved entry, supported sports. |
| `app/ai/saved/page.tsx` | Saved analyses placeholder: empty state + link back to AI Hub. |
| `hooks/useProviderStatus.ts` | Fetches GET /api/ai/providers/status; returns { status, loading, error, refetch, availableCount }. |
| `components/ai-interface/AILayoutContainer.tsx` | Reusable AI layout: optional strip, max-width, padding. |
| `components/ai-interface/AIModeSelector.tsx` | Mode dropdown (single_model, specialist, consensus, unified_brain); only renders when allowedModes.length > 1. |
| `components/ai-interface/AIProviderSelector.tsx` | Shows provider availability from useProviderStatus; optional Compare button when canCompare. |
| `components/ai-interface/DeterministicEvidenceCard.tsx` | Read-only deterministic facts (key/value or list); collapsible. |
| `components/ai-interface/AIVerdictCard.tsx` | AI synthesis block (primaryAnswer + optional verdict). |
| `components/ai-interface/ActionPlanCard.tsx` | Suggested next action + optional alternate path. |
| `components/ai-interface/ConfidenceDisplay.tsx` | Confidence badge (low/medium/high) + optional “Why?” expand. |
| `components/ai-interface/AIErrorFallback.tsx` | Error message + Retry (+ optional View data only); uses AIFailureStateRenderer for deterministic fallback. |
| `components/ai-interface/AILoadingSkeleton.tsx` | Skeleton for facts + synthesis + action blocks. |
| `components/ai-interface/CompareProvidersView.tsx` | Expandable compare view: per-model raw text from modelOutputs. |
| `components/ai-interface/UnifiedBrainResultView.tsx` | Composes deterministic, verdict, action, confidence, sources, caveats, compare. |
| `components/ai-interface/AIResultCard.tsx` | Generic card wrapper with optional title. |
| `components/ai-interface/StickyAIActions.tsx` | Copy, Open in Chimmy, Re-run; sticky on mobile (safe-area-bottom). |
| `components/ai-interface/index.ts` | Barrel export for all ai-interface components. |

### [UPDATED]

| Path | Change |
|------|--------|
| `lib/ai-product-layer/AIProductRouteResolver.ts` | Added AI_HUB_HREF = '/ai', and AI Hub to getStandaloneAIRoutes(). |
| `components/navigation/SharedRightRail.tsx` | Import AI_HUB_HREF; added “AI Hub” link next to “Ask Chimmy” in AI Quick Ask. |
| `app/chimmy/ChimmyLandingClient.tsx` | Added “AI Hub” button (link to /ai) in Use Chimmy section. |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/ai` | AI Hub — tool cards, Chimmy CTA, saved entry, sports. |
| `/ai/saved` | Saved analyses list (placeholder empty state). |
| `/af-legacy?tab=chat` | Chimmy chat (unchanged). |
| `/chimmy` | Chimmy landing (unchanged); now links to AI Hub. |

No existing routes were removed or replaced.

---

## Nav updates

- **SharedRightRail:** “AI Quick Ask” has two links: “Ask Chimmy” (existing) and “AI Hub” (/ai).
- **Chimmy landing:** “Use Chimmy inside AllFantasy” has three buttons: Ask Chimmy, AI Hub, Open AllFantasy Legacy.
- **Product layer:** AI_HUB_HREF and getStandaloneAIRoutes() include AI Hub.

---

## Shared component usage

- **AILayoutContainer:** Wrap any AI tool view; pass `strip` for mode/provider selectors.
- **AIModeSelector:** Control mode state locally; send in API request. Only show when backend allows multiple modes (allowedModes.length > 1).
- **AIProviderSelector:** Use with useProviderStatus(); hide or show Compare based on canCompare (multiple modelOutputs).
- **UnifiedBrainResultView:** Pass UnifiedAIResponse-shaped props from POST /api/ai/run or existing tool endpoints.
- **StickyAIActions:** Pass copyText, chimmyPrompt, onReRun; use stickyMobileOnly=true for mobile sticky bar.
- **AIErrorFallback:** Use for validation/503 errors; set usedDeterministicFallback for fallback and it delegates to AIFailureStateRenderer.
- **AILoadingSkeleton:** Show while loading orchestration result.
- **ConfidenceDisplay:** Use confidencePct and confidenceLabel from API; optional reason for “Why?”.
- **DeterministicEvidenceCard:** Pass deterministicPayload from envelope/response.

---

## Click audit

| Element | Handler | State | API / behavior | Route / disabled |
|--------|---------|--------|-----------------|------------------|
| AI Hub tool card | Link href | — | Navigate | /af-legacy?tab=X or /social-clips |
| Chat with Chimmy (Hub) | Link href | — | Navigate | /af-legacy?tab=chat |
| View saved | Link href | — | Navigate | /ai/saved |
| AI Hub (right rail) | Link href | — | Navigate | /ai |
| Ask Chimmy (right rail) | Link href | — | Navigate | getPrimaryChimmyEntry().href |
| Mode selector | onChange | Parent state | Parent sends mode in request | Disabled when disabled prop |
| Compare (provider) | onCompareClick | Parent toggles compare view | Client-only (modelOutputs) | Shown when canCompare && availableCount > 1 |
| Copy (StickyAIActions) | onClick | — | navigator.clipboard.writeText | — |
| Open in Chimmy | Link href | — | getChimmyChatHrefWithPrompt(prompt) | — |
| Re-run | onReRun | Parent loading | Parent re-invokes API | Disabled when reRunLoading |
| Retry (AIErrorFallback) | onRetry | Parent loading | Parent retries request | Disabled when retryLoading |
| Expand deterministic | onClick | Local expanded | — | — |
| Expand sources | onClick | Local sourcesExpanded | — | — |
| Expand compare | onClick | Local expanded | — | — |
| Confidence “Why?” | onClick | Local showReason | — | — |

No provider secrets; no dead tabs or dead buttons. When no providers are configured, useProviderStatus().availableCount is 0; parent can disable “Run AI” or show message (AIProviderSelector shows “None configured”).

---

## Test checklist

### Mobile

- [ ] AI Hub loads at /ai; tool cards tap to correct tab or social-clips.
- [ ] “Chat with Chimmy” and “View saved” tap to /af-legacy?tab=chat and /ai/saved.
- [ ] Saved page shows empty state and “Go to AI Hub” works.
- [ ] StickyAIActions: bar is fixed at bottom with safe-area; Copy, Open in Chimmy, Re-run tappable (min 44px).
- [ ] DeterministicEvidenceCard and Compare/Sources expand collapse on tap.
- [ ] Mode selector (when shown) is usable; dropdown opens and selects.

### Desktop

- [ ] AI Hub layout and right rail “AI Hub” link present and work.
- [ ] Chimmy landing “AI Hub” button works.
- [ ] UnifiedBrainResultView: all sections (facts, verdict, action, confidence, sources, compare) render and expand.
- [ ] StickyAIActions on desktop: not sticky (lg:relative); actions inline.
- [ ] AIErrorFallback: Retry and View data only (if provided) work.
- [ ] AILoadingSkeleton displays without layout shift when replaced by result.

### Cross-cutting

- [ ] No provider keys or secrets in client.
- [ ] GET /api/ai/providers/status required for provider selector; 401 when unauthenticated is handled (hook sets error).
- [ ] Saved state: /ai/saved refreshes on revisit (placeholder; no list API yet).

---

## Supported sports

Copy on AI Hub and in components references: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer. No sport-specific UI logic in these components; sport comes from envelope/API.
