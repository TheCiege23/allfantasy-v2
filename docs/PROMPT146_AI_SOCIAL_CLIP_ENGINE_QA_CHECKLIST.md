# PROMPT 146 — AllFantasy AI Social Clip Engine — QA Checklist

## Overview

AI social clip engine that turns platform insights into share-ready social content using multi-provider orchestration: xAI (narrative/viral), DeepSeek (fact check), OpenAI (polish). Workflow: generate → preview → edit → approve → publish or copy.

---

## Implementation Summary

| Area | Location | Notes |
|------|----------|--------|
| Types | `lib/ai-social-clip-engine/types.ts` | ClipInputType, ClipOutputType, DeterministicFacts, AIClipResult |
| Prompts | `lib/ai-social-clip-engine/prompts.ts` | xAI, DeepSeek, OpenAI prompt builders |
| Orchestrator | `lib/ai-social-clip-engine/AISocialClipOrchestrator.ts` | xAI → DeepSeek → OpenAI; retry/fallback |
| Moderation | `lib/ai-social-clip-engine/moderation.ts` | Blocklist and length check on output |
| Generate API | `app/api/social-clips/ai/generate/route.ts` | POST inputType, outputType, sport, deterministicFacts |
| Status API | `app/api/social-clips/ai/status/route.ts` | GET provider availability |
| Asset PATCH | `app/api/social-clips/[assetId]/route.ts` | PATCH title, metadata (edit mode) |
| Generator UI | `app/social-clips/page.tsx` | AI Clip card: input/output type, sport, facts, Generate |
| Detail / Edit | `app/social-clips/[assetId]/page.tsx` | Preview, Edit mode, Save, Approve, Publish/Copy |

---

## Mandatory Click Audit

- [x] **Generate clip button works**  
  On `/social-clips`, in the "AI social clip" card, "Generate clip" calls `POST /api/social-clips/ai/generate` with selected input/output type and context. On success, redirects to `/social-clips/[id]`. No silent failure.

- [x] **Preview updates correctly**  
  On the asset detail page, the Preview section shows headline, caption, CTA, hashtags from asset metadata. After edit and save, preview reflects saved values.

- [x] **Edit mode works**  
  "Edit" toggles to inline fields (title, headline, caption, CTA, card copy, clip title). "Save" sends PATCH to `/api/social-clips/[assetId]` and updates asset; "Cancel" exits without saving.

- [x] **Approve state works**  
  "Approve" / "Revoke" calls `/api/social-clips/[assetId]/approve` and updates `approvedForPublish`. Publish actions require approval.

- [x] **Publish or copy action works**  
  "Publish now" per platform calls `/api/social-clips/[assetId]/publish` and is only enabled when approved. "Copy caption" / "Copy text" copy to clipboard. No auto-post on generate; auto-post is opt-in per target.

- [x] **Provider unavailable state works**  
  When no provider is configured (GET `/api/social-clips/ai/status` returns `anyAvailable: false`), the AI generator shows a message and the Generate button is disabled. On generate failure, error and optional `providerStatus` are shown.

- [x] **No dead auto-post buttons**  
  Auto-post is a per-platform checkbox; "Publish now" is explicit. No button that claims to auto-post on generate without user opt-in.

---

## Input Types

| Input type | Description |
|------------|-------------|
| matchup_result | Matchup result recap |
| trade_verdict | Trade verdict / analysis |
| power_rankings | Power rankings snapshot |
| player_trend_alert | Player trend alert |
| story_recap | Story recap |
| creator_league_promo | Creator league promo |
| bracket_update | Bracket update |

## Output Types

| Output type | Description |
|-------------|-------------|
| short_post | Short feed post |
| thread_format | Multi-tweet thread |
| image_caption | Image caption |
| video_caption | Video caption |
| promo_copy | Promo copy |
| recap_copy | Recap copy |

---

## Backend Requirements

- **Provider-safe orchestration**: xAI first (narrative), then DeepSeek (fact check when facts provided), then OpenAI (polish). If xAI fails, fallback to OpenAI-only. If OpenAI fails after xAI, use xAI output as final.
- **Deterministic fact injection**: `deterministicFacts` passed in request and injected into prompts; DeepSeek checks copy consistency with facts.
- **Output moderation**: Blocklist and max length in `moderation.ts`; pipeline fails if moderation does not pass.
- **Retry and fallback**: Up to 2 retries for xAI step; fallback to OpenAI-only generation when xAI unavailable or failing.
- **Audit logging**: `aiClipAudit` stored in asset metadata (inputType, outputType, providersUsed, factCheckPassed, moderationPassed, generatedAt).

---

## Provider Integration Notes

- **xAI (Grok)**  
  - Env: `XAI_API_KEY` or `GROK_API_KEY`.  
  - Role: Narrative framing, punchy social language, viral angle.  
  - Used in: `runXaiStep()` via `xaiChatJson` (no tools for clip).  
  - Model: default from xai-client (e.g. grok-4-fast-non-reasoning).

- **OpenAI**  
  - Env: `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY`.  
  - Role: Polished final copy, clean CTA, preview quality.  
  - Used in: `runOpenAIStep()` via `openaiChatText` (then parse JSON from content).  
  - Model: from `getOpenAIConfig()` (e.g. gpt-4o).

- **DeepSeek**  
  - Env: `DEEPSEEK_API_KEY`.  
  - Role: Structured fact review, consistency with deterministic facts.  
  - Used in: `runDeepSeekStep()` via `deepseekChat`.  
  - Model: deepseek-chat.  
  - When unavailable or no facts: step skipped, `factCheckPassed` undefined.

---

## Supported Sports

NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer. Use `lib/sport-scope.ts` and `normalizeToSupportedSport()`.

---

## Files Touched / Added

- `lib/ai-social-clip-engine/types.ts` (new)
- `lib/ai-social-clip-engine/prompts.ts` (new)
- `lib/ai-social-clip-engine/moderation.ts` (new)
- `lib/ai-social-clip-engine/AISocialClipOrchestrator.ts` (new)
- `lib/ai-social-clip-engine/index.ts` (new)
- `app/api/social-clips/ai/generate/route.ts` (new)
- `app/api/social-clips/ai/status/route.ts` (new)
- `app/api/social-clips/[assetId]/route.ts` (PATCH added)
- `app/social-clips/page.tsx` (AI Clip generator card)
- `app/social-clips/[assetId]/page.tsx` (edit mode, Save)
- `app/e2e/social-clips-grok/SocialClipsGrokHarnessClient.tsx` (Prompt 146 click-audit controls)
- `e2e/social-clips-grok-click-audit.spec.ts` (Prompt 146 click audit assertions)
- `docs/PROMPT146_AI_SOCIAL_CLIP_ENGINE_QA_CHECKLIST.md` (this file)
