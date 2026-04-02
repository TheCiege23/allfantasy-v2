# BEHAVIOR_RULES_AND_MEMORY_TASK.md
# Drop into repo root. In Cursor Composer:
# @BEHAVIOR_RULES_AND_MEMORY_TASK.md implement everything step by step

## What This Builds

### 1 — Behavior Rules Engine (lib/ai/behavior-rules.ts)
Six hard-coded rules enforced on every AI response:
| Rule ID | Severity | What it catches |
|---|---|---|
| no-break-existing | hard | suggestions to delete/rewrite/remove exports |
| verify-before-answer | hard | >5 unverified file paths in one response |
| minimal-changes | hard | touching >8 files for a simple code task |
| no-hallucinated-apis | hard | invented generic function names near real paths |
| stay-on-task | soft | scope creep phrases ("while we're here…") |
| senior-engineer | soft | `as any`, empty catch, bare TODOs, debug logs |
| use-context | soft | asking for info already in the context block |

Rules inject into EVERY system prompt and run in the PECR check() phase.
Hard violations → PECR retries. Soft violations → logged, no retry.

### 2 — Rolling Working Memory (lib/ai/working-memory.ts)
Session-level memory that compresses over time:
- Keeps last 8 entries in full detail
- Compresses older entries into summaries using claude-haiku
- Drops lowest-importance entries when >40 total
- Scores importance by recency decay + tag overlap + entry type
- Redis primary, Prisma AIMemoryEvent fallback (model already exists)

---

## Files to Place

| Download file | Place at |
|---|---|
| `behavior-rules.ts` | `lib/ai/behavior-rules.ts` |
| `working-memory.ts` | `lib/ai/working-memory.ts` |
| `behavior-rules-schema.prisma` | Paste into bottom of `prisma/schema.prisma` |

---

## Step 1 — Read before touching anything

Read these files completely:
```
lib/ai-personality.ts              ← understand existing personality/rule style
lib/ai-memory.ts                   ← understand getFullAIContext, recordMemoryEvent
lib/trade-engine/narrative-validation-logger.ts  ← logging pattern to mirror
lib/queues/bullmq.ts               ← how redis is imported
prisma/schema.prisma               ← existing AIMemoryEvent model
app/api/chat/chimmy/route.ts       ← where to integrate both systems
```

---

## Step 2 — Add Prisma models

Paste `behavior-rules-schema.prisma` at the bottom of `prisma/schema.prisma`.

Two new models:
- `AIRuleViolationLog` — logs every hard/soft rule violation per feature
- `AICustomRule` — user-configurable rules stored in DB

Run:
```bash
npx prisma migrate dev --name add_behavior_rules_and_working_memory
npx prisma generate
```

Fix any migration errors before continuing.

---

## Step 3 — Place lib/ai/behavior-rules.ts

Place the file exactly. Then fix any type errors:

The file imports `prisma` from `@/lib/prisma` — verify this matches the
existing import path used in `narrative-validation-logger.ts`.

The `logRuleViolations()` function writes to `prisma.aIRuleViolationLog` —
verify the generated Prisma client property name matches after migration.
If it generates as `prisma.aIRuleViolationLog` use that. If it generates as
`prisma.aIRuleViolationLog` or something else, align to whatever Prisma
generates.

Run: `npx tsc --noEmit`

**Likely error to fix:** The `AICustomRule.findMany` call — Prisma generates
the model accessor from the model name. Check what `npx prisma generate`
produces and use the correct accessor name.

---

## Step 4 — Place lib/ai/working-memory.ts

The file uses:
- `redis` from `@/lib/queues/bullmq` — verify the export name in bullmq.ts
- `prisma.aIMemoryEvent` — this model already exists in the schema ✅
- `Anthropic` from `@anthropic-ai/sdk` — already used by other lib files ✅

Run: `npx tsc --noEmit` and fix all errors.

**Key things to verify:**
1. `redis` is exported by name from `lib/queues/bullmq.ts` — read that file
   and use whatever it actually exports (could be `redis`, `redisClient`, etc.)
2. `prisma.aIMemoryEvent.upsert` — the `AIMemoryEvent` model has `id` as PK,
   so `where: { id: 'wm-${sessionId}' }` is valid ✅
3. The `content` field on `AIMemoryEvent` is `Json` — the upsert passes
   `JSON.parse(data)` which is correct ✅

---

## Step 5 — Integrate behavior rules into chimmy route

Read `app/api/chat/chimmy/route.ts` fully first.

Find where `buildMemoryPromptSection` is called to build the system prompt.
**Before that call**, add:

```typescript
import { buildBehaviorRulesPrompt } from '@/lib/ai/behavior-rules'

// Inside the POST handler, when building systemPrompt:
const behaviorRulesBlock = buildBehaviorRulesPrompt()
// Then prepend it to the system prompt string, e.g.:
// const systemPrompt = `${behaviorRulesBlock}\n\n${existingSystemPrompt}`
```

Find where the PECR check runs (or where the response is validated).
**Add behavior rule checking** there:

```typescript
import { checkBehaviorRules, logRuleViolations, loadCustomRules, checkCustomRules } from '@/lib/ai/behavior-rules'

// After getting the final answer string:
const builtInCheck = checkBehaviorRules(finalAnswer, {
  input:       message,
  featureName: 'chimmy',
})

const customRules  = await loadCustomRules()
const customViolations = checkCustomRules(finalAnswer, customRules)
const allViolations = [...builtInCheck.violations, ...customViolations]

// Log violations (non-blocking)
logRuleViolations(session?.user?.id ?? null, 'chimmy', allViolations, 1)
  .catch(() => {})

// If any HARD rule violated and we have iterations left → retry
// (wire this into the PECR loop if PECR is already implemented,
//  otherwise just log and continue for now)
if (builtInCheck.hardFailed) {
  console.warn('[Chimmy] Hard behavior rule violated:', builtInCheck.violations.map(v => v.ruleId))
}
```

---

## Step 6 — Integrate working memory into chimmy route

Read `app/api/chat/chimmy/route.ts` again — find where the session ID
or user ID is extracted from the request body.

**At the very start of the POST handler** (after auth, before enrichment):

```typescript
import {
  prepareWorkingMemory,
  recordAIResponse,
  recordToolCall,
  recordDecision,
} from '@/lib/ai/working-memory'

// Extract sessionId from body (add to client if not there yet)
const sessionId = String(body.sessionId ?? `${userId}-${Date.now()}`)

// Load + inject working memory
const { mem, prompt: memPrompt, currentTags } = await prepareWorkingMemory({
  sessionId,
  userId,
  message,
  featureTags: [intent],   // intent classified earlier in the route
})

// Inject into system prompt — add memPrompt.systemBlock to system prompt
// Inject into user content — add memPrompt.contextBlock before the message
```

**After enrichChatWithData** completes, record the tool call:

```typescript
await recordToolCall(sessionId, userId, 'enrichChatWithData',
  `loaded ${Object.keys(enrichment ?? {}).length} data sources`
).catch(() => {})
```

**After the final answer** is synthesized by `buildChimmyVoiceAnswer`:

```typescript
// Record the response (non-blocking — never await in the hot path)
recordAIResponse(sessionId, userId, answer, 0.6).catch(() => {})

// If the answer contains a clear recommendation, record it as a decision
if (/start|sit|accept|decline|add|drop/i.test(answer)) {
  recordDecision(sessionId, userId, answer.slice(0, 200), 0.8).catch(() => {})
}
```

**Add `sessionId` to the response body** so the client can persist it:

```typescript
return NextResponse.json({
  ...existingFields,
  sessionId,   // ← add this
})
```

**On the client side** (`app/components/ChimmyChat.tsx`):
- Store `sessionId` in component state, initialized from `crypto.randomUUID()`
- Pass it in every request body as `sessionId`
- On "New conversation" button / clear — generate a new `sessionId`

---

## Step 7 — Integrate behavior rules into trade evaluator

Read `app/api/trade-evaluator/route.ts` fully.

Find where the final trade recommendation string is generated.
After that point, add:

```typescript
import { checkBehaviorRules, logRuleViolations } from '@/lib/ai/behavior-rules'

const ruleCheck = checkBehaviorRules(recommendation, {
  input:       JSON.stringify({ giving, receiving }),
  featureName: 'trade',
})
logRuleViolations(userId ?? null, 'trade', ruleCheck.violations, 1).catch(() => {})
```

No retry needed for trade evaluator at this stage — just log.

---

## Step 8 — Write tests

Create `__tests__/behavior-rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  checkBehaviorRules,
  buildBehaviorRulesPrompt,
  BEHAVIOR_RULES,
  checkCustomRules,
} from '@/lib/ai/behavior-rules'

describe('checkBehaviorRules', () => {
  it('passes clean output', () => {
    const result = checkBehaviorRules(
      'Start Justin Jefferson this week. His matchup against Detroit is favorable.',
      { input: 'who should I start?', featureName: 'chimmy' }
    )
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('flags delete function as hard violation', () => {
    const result = checkBehaviorRules(
      'delete function handleTrade() and replace the entire file from scratch',
      { featureName: 'chimmy' }
    )
    expect(result.hardFailed).toBe(true)
    expect(result.violations.some(v => v.ruleId === 'no-break-existing')).toBe(true)
  })

  it('flags scope creep as soft violation', () => {
    const result = checkBehaviorRules(
      "I'll fix the trade. While we're here I'll also refactor the waiver system.",
      { featureName: 'chimmy' }
    )
    expect(result.softFailed).toBe(true)
    expect(result.violations.some(v => v.ruleId === 'stay-on-task')).toBe(true)
  })

  it('flags empty catch block as soft violation', () => {
    const result = checkBehaviorRules(
      'catch (err) {} // silently ignore',
      { featureName: 'chimmy' }
    )
    expect(result.violations.some(v => v.ruleId === 'senior-engineer')).toBe(true)
  })

  it('buildBehaviorRulesPrompt returns non-empty string', () => {
    const prompt = buildBehaviorRulesPrompt()
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('HARD')
    expect(prompt).toContain('SOFT')
  })

  it('custom rules work for blocked pattern', () => {
    const violations = checkCustomRules('never use this word: forbidden_word_here', [
      {
        id:             'test-rule',
        description:    'No forbidden words',
        prompt:         'Avoid forbidden_word',
        severity:       'soft',
        category:       'style',
        blockedPattern: 'forbidden_word',
      }
    ])
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('test-rule')
  })
})
```

Create `__tests__/working-memory.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  buildWorkingMemoryPrompt,
  getCurrentTags,
} from '@/lib/ai/working-memory'
import type { WorkingMemory } from '@/lib/ai/working-memory'

function makeMemory(entries: Partial<import('@/lib/ai/working-memory').MemoryEntry>[]): WorkingMemory {
  return {
    sessionId:      'test-session',
    userId:         'test-user',
    compressionGen: 0,
    tokenEstimate:  100,
    updatedAt:      Date.now(),
    entries: entries.map((e, i) => ({
      id:         `entry-${i}`,
      type:       'ai-response' as const,
      content:    e.content ?? 'test content',
      importance: e.importance ?? 0.5,
      timestamp:  e.timestamp ?? Date.now() - i * 60000,
      compressed: e.compressed ?? false,
      tags:       e.tags ?? [],
      ...e,
    })),
  }
}

describe('buildWorkingMemoryPrompt', () => {
  it('returns empty blocks for empty memory', () => {
    const result = buildWorkingMemoryPrompt(makeMemory([]))
    expect(result.contextBlock).toBe('')
    expect(result.tokenCount).toBe(0)
  })

  it('includes entries in output', () => {
    const mem    = makeMemory([{ content: 'Start Nico Collins this week' }])
    const result = buildWorkingMemoryPrompt(mem)
    expect(result.contextBlock).toContain('Nico Collins')
  })

  it('respects token target — does not exceed TOKEN_TARGET', () => {
    const bigMem = makeMemory(
      Array.from({ length: 30 }, (_, i) => ({
        content: 'x'.repeat(300),
        timestamp: Date.now() - i * 1000,
      }))
    )
    const result = buildWorkingMemoryPrompt(bigMem)
    expect(result.tokenCount).toBeLessThanOrEqual(1600)   // TOKEN_TARGET + small buffer
  })

  it('boosts entries with matching tags', () => {
    const mem = makeMemory([
      { content: 'trade advice given', tags: ['trade'], importance: 0.3, timestamp: Date.now() - 10000 },
      { content: 'general chat',       tags: [],        importance: 0.9, timestamp: Date.now() - 1000 },
    ])
    const result = buildWorkingMemoryPrompt(mem, ['trade'])
    // trade entry should appear despite lower base importance
    expect(result.contextBlock).toContain('trade advice given')
  })
})

describe('getCurrentTags', () => {
  it('returns tags from recent entries', () => {
    const mem  = makeMemory([
      { tags: ['trade', 'WR'],  timestamp: Date.now() - 1000 },
      { tags: ['waiver', 'RB'], timestamp: Date.now() - 2000 },
    ])
    const tags = getCurrentTags(mem)
    expect(tags).toContain('trade')
    expect(tags).toContain('waiver')
  })
})
```

Run: `npx vitest run __tests__/behavior-rules.test.ts __tests__/working-memory.test.ts`

Fix all failures before continuing.

---

## Step 9 — Admin panel

Read `app/admin/components/AdminTools.tsx` and `app/admin/components/AdminOverview.tsx`.

Add a "AI Behavior" card showing:
- Rule violation counts by ruleId for the last 7 days
- Hard vs soft breakdown
- Top violated rule
- Custom rules count

```typescript
// Fetch data (in the server component or getServerSideProps equivalent):
const violations = await prisma.aIRuleViolationLog.groupBy({
  by:      ['ruleId', 'severity'],
  _count:  { id: true },
  where:   { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  orderBy: { _count: { id: 'desc' } },
})

const customRuleCount = await prisma.aICustomRule.count({ where: { enabled: true } })
```

Use the same card/stat component style already in the admin panel.

---

## Step 10 — Final checks

```bash
npx tsc --noEmit
npx vitest run __tests__/behavior-rules.test.ts __tests__/working-memory.test.ts
node scripts/smoke-check.mjs
```

Fix every error. Do not suppress with `@ts-ignore` or `any`.

---

## Constraints

- Mirror `narrative-validation-logger.ts` exactly for all Prisma writes
- `redis` import must match the actual export from `lib/queues/bullmq.ts`
- Working memory writes are always fire-and-forget (`.catch(() => {})`) —
  never block the main response path
- Behavior rule checks in the chimmy route must not add >50ms to p99 latency
  — run them after the response is built, not before
- Do not change any existing model calls, prompts, or temperatures
- Do not modify `lib/ai-memory.ts` — working memory is additive, not a replacement
