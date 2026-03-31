# PROMPT 286 — Final AI System Validation Deliverable

## Objective

Ensure AI works everywhere: **draft**, **chat**, **trades**, **waivers**, **war room**.

---

## Validation Map

### 1. Draft (AI pick suggestions, mock draft, in-league orphan pick)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/mock-draft/ai-pick` | POST | Mock draft / war room: AI pick, DM suggestion, predict-next. Body: `action`, `available`, `teamRoster`, `round`, `pick`, `leagueContext`, etc. | Session |
| `/api/mock-draft/simulate` | POST | Full mock draft simulation (AI generates full board). | Session |
| `/api/mock-draft/trade-action` | POST | After draft-day trade accepted: AI re-simulates picks from trade point. | Session |
| `/api/leagues/[leagueId]/draft/ai-pick` | POST | In-league live draft: commissioner triggers AI to make pick for **orphan** roster (when on clock). | Commissioner |
| `/api/draft/recommend` | POST | Draft recommendations from pool and draft state (no invented players). | Session |

**Entry points (UI):** AF Legacy → Mock Draft tab (`onAiPick`, `onAiDmSuggestion` calling `/api/mock-draft/ai-pick`). Mock draft lobby and draft room. League draft page for commissioner orphan AI pick.

**Verification:** Provider (OpenAI/DeepSeek/Grok) must be available. `POST /api/mock-draft/ai-pick` with minimal valid body (e.g. `action: 'pick'`, `available: [{ name, position, team }]`) should return a pick or 4xx on bad input.

---

### 2. Chat (Chimmy / AI assistant)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/chimmy` | POST | Preferred Chimmy client entry point. Accepts JSON compatibility payloads and forwards into the dedicated Chimmy chat handler with messages, tools, context enrichment, and multi-provider orchestration. | Session |
| `/api/chat/chimmy` | POST | Dedicated Chimmy handler used underneath `/api/chimmy`; still supports form/messages requests directly. | Session |
| `/api/ai/chimmy` | POST | Alternative Chimmy/orchestration entry. | Session |
| `/api/ai/chat` | POST | Generic AI chat (if used by other surfaces). | Session |

**Entry points (UI):** `/chimmy` page, AF Legacy Chat tab, in-app Chimmy entry.

**Verification:** At least one of OpenAI, DeepSeek, or Grok available. `POST /api/chimmy` with `{ "message": "Hi", "userContext": { "sport": "NFL" } }` should return assistant content or structured error.

---

### 3. Trades (trade analyzer, AI grades, orphan trade decision)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/trade-evaluator` | POST | **Primary Trade Analyzer UI.** Grade, narrative, negotiation tips, accept probability. | Session |
| `/api/dynasty-trade-analyzer` | POST | Full trade analysis: context assembly, dual-brain analyzer, quality gate, fairness score, verdict. | Session |
| `/api/legacy/trade/analyze` | POST | Legacy trade analyze (Trade Analyzer UI). | Session |
| `/api/ai/trade-eval` | POST | AI trade evaluation (orchestration path). | Session |
| `/api/leagues/[leagueId]/trade/ai-decision` | POST | Commissioner: AI decision for **orphan** roster trade (accept/reject/counter). Deterministic/safety default. | Commissioner |

**Entry points (UI):** `/trade-evaluator` (calls `/api/trade-evaluator`), dynasty trade analyzer, legacy trade tab, league trade flows. Orphan AI trade decision from commissioner tools.

**Verification:** Trade analyzer routes use OpenAI/DeepSeek and trade engine. Provider availability and valid request body (rosters, scoring) yield a grade/verdict.

---

### 4. Waivers (Waiver AI)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/waiver-ai` | POST | Main Waiver AI: quant (DeepSeek), trend (Grok), optional OpenAI; FAAB advice, priorities, alerts. Body: roster, waiver pool, league settings, sport. | Session |
| `/api/legacy/waiver/analyze` | POST | Legacy waiver analyze. | Session |
| `/api/ai/waiver` | POST | AI waiver (orchestration). | Session |

**Entry points (UI):** `/waiver-ai` page, legacy waiver tab.

**Verification:** At least one of DeepSeek, Grok, or OpenAI configured for waiver-ai. Valid body (roster, waiverPool, sport) returns suggestions or structured error.

---

### 5. War room (draft command center)

War room **reuses draft AI**: same mock draft board, same AI pick and DM suggestion APIs. No separate backend.

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/mock-draft/ai-pick` | POST | War room on-the-clock suggestion and auto-pick. | Session |
| `/api/mock-draft/needs` | GET/POST | Roster needs for war room. | Session |
| `/api/mock-draft/predict-board` | POST | Predict next picks (AI). | Session |

**Entry points (UI):** AF Legacy → Draft War Room tab (mock-draft), `/mock-draft` lobby and draft room. Same as **Draft**; “war room” is the in-draft experience.

**Verification:** Same as Draft: providers available, `/api/mock-draft/ai-pick` responds to valid payload.

---

## Provider dependency summary

| Area | Typical providers |
|------|-------------------|
| Draft / War room | OpenAI (gpt-4o-mini) in ai-pick, simulate, trade-action |
| Chat | OpenAI, xAI (Grok), DeepSeek (Chimmy multi-provider) |
| Trades | OpenAI, DeepSeek (trade engine / dual-brain) |
| Waivers | DeepSeek (quant), Grok (trend), OpenAI (fallback) |

**Single check:** `GET /api/ai/providers/status` (session required) returns `{ openai, deepseek, grok }` booleans. At least one `true` is required for AI to work in practice; each area may require a specific provider.

---

## Validation API (machine-readable)

**GET /api/ai/validation** (session required) returns:

- **areas:** `draft`, `chat`, `trades`, `waivers`, `war_room` — each with `endpoints[]` and short `description`.
- **providers:** result of `checkProviderAvailability()` (openai, deepseek, grok).
- **ok:** true if at least one provider is available (overall “AI can run”).

Use this for dashboards, admin checks, or automated “AI system check” to ensure AI works everywhere.

---

## Quick verification checklist

1. **Draft:** Open mock draft or war room → make a pick or request DM suggestion → response contains pick or reason.
2. **Chat:** Open Chimmy → send “Hi” or “What’s my best waiver add?” → response from AI.
3. **Trades:** Open Trade Analyzer → submit a trade → receive grade/verdict.
4. **Waivers:** Open Waiver AI → submit roster + pool → receive suggestions / FAAB advice.
5. **War room:** Same as draft; use war room tab and confirm AI suggestion or auto-pick works.

**Admin:** Admin → Providers Diagnostics shows provider health. Admin → Tools / AI usage shows which endpoints are called.

---

## Client → API mapping (verified)

| Area | Page / component | API called |
|------|------------------|------------|
| Draft (mock) | Mock draft simulator, `useAIDraftAssistant` | `POST /api/mock-draft/ai-pick` |
| Draft (live) | Draft room (commissioner orphan pick) | `POST /api/leagues/[leagueId]/draft/ai-pick` |
| Chat | Chimmy UI (`ChimmyChat`) | `POST /api/chimmy` |
| Trades | `/trade-evaluator` page | `POST /api/trade-evaluator` |
| Waivers | `/waiver-ai` page | `POST /api/waiver-ai` |
| War room | Same as draft (mock-draft war room) | `POST /api/mock-draft/ai-pick`, needs, predict-board |
