# PECR Implementation Task
# Save this file as: PECR_TASK.md in your repo root
# In Cursor: open this file, then tell Cursor "read and implement PECR_TASK.md"

## Read These Files First — All of Them — Before Writing Anything

```
lib/decision-log.ts
lib/trade-engine/narrative-validation-logger.ts
lib/trade-engine/ai-assist-orchestrator.ts
lib/trade-engine/quality-gate.ts
lib/trade-engine/index.ts
lib/waiver-engine/index.ts
lib/waiver-engine/waiver-scoring.ts
lib/workers/simulation-worker.ts
lib/queues/bullmq.ts
lib/async-utils.ts
lib/chat-data-enrichment.ts
lib/ai-memory.ts
app/api/chat/chimmy/route.ts
app/api/trade-evaluator/route.ts
app/api/cron/auto-sync/route.ts
app/api/cron/bracket-sync/route.ts
__tests__/trade-analyzer-intel.test.ts
scripts/smoke-check.mjs
```

Run `npx tsc --noEmit` after each step. Fix all errors before the next step.

---

## Step 1 — Create lib/ai/pecr.ts

The logging pattern MUST use Prisma exactly like narrative-validation-logger.ts does.
Read that file first and mirror the import and prisma.ModelName.create() pattern.

```typescript
// Types to export:

export type PECRFeature =
  | 'chimmy'
  | 'trade'
  | 'waiver'
  | 'simulation'
  | 'cron-auto-sync'
  | 'cron-bracket-sync'

export interface PECRPlan {
  intent:      string           // classified intent
  steps:       string[]         // planned steps
  context:     Record<string, unknown>  // enriched data
  refineHints: string[]         // accumulated from failed checks
}

export interface PECRCheckResult {
  passed:      boolean
  failures:    string[]
  refineHint?: string           // added to plan.refineHints on failure
}

export interface PECRResult<T> {
  output:      T
  iterations:  number
  passed:      boolean
  feature:     PECRFeature
  allFailures: string[][]       // one array per failed iteration
  durationMs:  number
}

export interface PECROptions<TInput, TOutput> {
  feature:        PECRFeature
  maxIterations?: number        // default 4
  plan:    (input: TInput) => Promise<PECRPlan>
  execute: (plan: PECRPlan, input: TInput, iteration: number) => Promise<TOutput>
  check:   (output: TOutput, plan: PECRPlan, input: TInput) => PECRCheckResult
}

// Implementation:
export async function runPECR<TInput, TOutput>(
  input: TInput,
  opts: PECROptions<TInput, TOutput>
): Promise<PECRResult<TOutput>>
```

Inside runPECR:
1. Record `startTime = Date.now()`
2. Call `opts.plan(input)` → PECRPlan
3. Loop up to `opts.maxIterations ?? 4`:
   - Call `opts.execute(plan, input, iteration)` → TOutput
   - Call `opts.check(output, plan, input)` → PECRCheckResult
   - If `passed === true` → break
   - Push `refineHint` to `plan.refineHints`, push `failures` to `allFailures`, increment iteration
4. Log result to Prisma using the same pattern as narrative-validation-logger.ts
   — Read decision-log.ts to find which Prisma model to use
   — If no PECR model exists, add it to schema.prisma and run `npx prisma migrate dev`
5. Return `PECRResult`

---

## Step 2 — Wrap app/api/chat/chimmy/route.ts

DO NOT change any model calls, prompts, or parameters.
Only add runPECR around the existing flow.

The existing POST handler does roughly:
```
enrichChatWithData → getFullAIContext → buildMemoryPromptSection
→ openaiChatText → xaiChatJson/parseTextFromXaiChatCompletion
→ deepseekQuantAnalysis → buildChimmyVoiceAnswer → return
```

Map to PECR:

**plan()**: Classify intent from message text:
```typescript
const intent =
  /trade|swap|offer|deal|give|receiv/i.test(msg) ? 'trade' :
  /waiver|wire|pickup|drop|add|free.?agent/i.test(msg) ? 'waiver' :
  /roster|lineup|start|sit|bench|flex/i.test(msg) ? 'roster' :
  /draft|pick|adp|tier|rank/i.test(msg) ? 'draft' : 'general'
```
Call enrichChatWithData and getFullAIContext here.
Store results in plan.context so execute doesn't re-fetch.

**execute()**: Run the existing multi-model pipeline using plan.context.
No changes to any model calls.

**check()**: Verify the answer string:
- `answer.length > 30`
- If intent is trade/waiver/roster and enrichment loaded data:
  answer does NOT contain "I don't have access" or "I cannot access"
- All toolLinks in the response are from valid routes:
  `/trade-analyzer`, `/waiver-wire`, `/draft-helper`,
  `/rankings`, `/mock-draft`, `/fantasy-coach`, `/player-comparison`

If check fails, refineHint =
`"Player and league context is loaded. Reference it explicitly in your answer."`

Add response headers:
```typescript
headers: {
  'x-pecr-iterations': String(result.iterations),
  'x-pecr-passed':     String(result.passed),
  'x-pecr-intent':     plan.intent,
}
```

---

## Step 3 — Wrap lib/workers/simulation-worker.ts

The job processor is currently a stub returning `{ ok: true }`.
Read lib/engine/ to find available simulation functions.

```typescript
// Wrap the job processor:
async (job: Job<SimulationJobData>) => {
  return runPECR(job.data, {
    feature: 'simulation',
    maxIterations: 3,

    plan: async (data) => ({
      intent: String(data.type ?? 'unknown'),
      steps: ['validate input', 'run simulation', 'verify output'],
      context: { jobId: job.id, data },
      refineHints: [],
    }),

    execute: async (plan, data, iteration) => {
      // Call the appropriate engine function based on data.type
      // If none exists yet, return the stub result
      return { ok: true, jobId: job.id, processedAt: new Date().toISOString(), input: data }
    },

    check: (output) => {
      const failures: string[] = []
      if (!output.ok) failures.push('ok is not true')
      // Check all numeric fields are finite
      for (const [k, v] of Object.entries(output)) {
        if (typeof v === 'number' && !Number.isFinite(v)) {
          failures.push(`Field ${k} is not a finite number: ${v}`)
        }
      }
      return { passed: failures.length === 0, failures }
    },
  })
}
```

Keep all existing `worker.on('completed')` and `worker.on('failed')` hooks.
In the completed handler, log `result.iterations`.

---

## Step 4 — Wrap cron routes

Read both files fully first.
For each route (auto-sync, bracket-sync):

```typescript
// plan: validate CRON_SECRET header
plan: async (req) => {
  const auth = req.headers.get('authorization')
  const valid = auth === `Bearer ${process.env.CRON_SECRET}`
  return {
    intent: 'sync',
    steps: ['validate auth', 'run sync', 'verify result'],
    context: { authorized: valid },
    refineHints: [],
  }
},

// execute: run existing sync logic unchanged
execute: async (plan, req, iteration) => {
  if (!plan.context.authorized) throw new Error('Unauthorized')
  // ... existing sync code here unchanged ...
},

// check: verify no unhandled errors
check: (output) => ({
  passed: output !== null && output !== undefined,
  failures: output === null ? ['sync returned null'] : [],
})
```

---

## Step 5 — Wrap app/api/trade-evaluator/route.ts

Read the full file first — it is large.
It already uses quality-gate and runAssistOrchestrator from lib/trade-engine/.

PECR check must use the existing quality gate result, not add a duplicate check:
```typescript
check: (output) => {
  const failures: string[] = []
  if (!output.recommendation) failures.push('missing recommendation')
  if (typeof output.valueDelta !== 'number' || !Number.isFinite(output.valueDelta)) {
    failures.push('valueDelta is missing or not finite')
  }
  // If quality gate result is in the output, use it
  if (output.qualityGate && !output.qualityGate.passed) {
    failures.push(...(output.qualityGate.reasons ?? []))
  }
  return { passed: failures.length === 0, failures }
}
```

---

## Step 6 — Write Tests

Create `__tests__/pecr.test.ts` using vitest (same style as trade-analyzer-intel.test.ts):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { runPECR } from '@/lib/ai/pecr'

describe('runPECR', () => {
  it('completes in 1 iteration when check passes', async () => {
    const result = await runPECR('input', {
      feature: 'chimmy',
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'output',
      check: () => ({ passed: true, failures: [] }),
    })
    expect(result.iterations).toBe(1)
    expect(result.passed).toBe(true)
  })

  it('retries up to maxIterations when check fails', async () => {
    const result = await runPECR('input', {
      feature: 'trade',
      maxIterations: 3,
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'output',
      check: () => ({ passed: false, failures: ['missing data'], refineHint: 'add data' }),
    })
    expect(result.iterations).toBe(3)
    expect(result.passed).toBe(false)
  })

  it('accumulates refineHints across iterations', async () => {
    let captured: string[] = []
    await runPECR('input', {
      feature: 'waiver',
      maxIterations: 3,
      plan: async () => ({ intent: 'test', steps: [], context: {}, refineHints: [] }),
      execute: async (plan) => { captured = [...plan.refineHints]; return 'out' },
      check: () => ({ passed: false, failures: [], refineHint: 'hint-A' }),
    })
    expect(captured.length).toBeGreaterThan(0)
    expect(captured).toContain('hint-A')
  })

  it('durationMs is a positive number', async () => {
    const result = await runPECR('x', {
      feature: 'simulation',
      plan: async () => ({ intent: 'x', steps: [], context: {}, refineHints: [] }),
      execute: async () => 42,
      check: () => ({ passed: true, failures: [] }),
    })
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('allFailures has one array per failed iteration', async () => {
    const result = await runPECR('x', {
      feature: 'trade',
      maxIterations: 2,
      plan: async () => ({ intent: 'x', steps: [], context: {}, refineHints: [] }),
      execute: async () => 'out',
      check: () => ({ passed: false, failures: ['f1', 'f2'] }),
    })
    expect(result.allFailures).toHaveLength(2)
    expect(result.allFailures[0]).toEqual(['f1', 'f2'])
  })
})
```

Run: `npx vitest run __tests__/pecr.test.ts`

---

## Step 7 — Final Smoke Check

```bash
node scripts/smoke-check.mjs
```

If any endpoint returns 500, read its route file and fix the error.
Do not swallow errors with empty catch blocks.

---

## Step 8 — Admin Panel PECR Card

Read `app/admin/components/AdminTools.tsx` and `app/admin/components/AdminOverview.tsx`.
In whichever file shows analytics/tool cards, add a "PECR Health" card using the
same component style already used in those files.

The card shows (read from Prisma PECR log entries):
- Per-feature average iterations
- Check pass rate %
- Last run timestamp

Use the existing Prisma query pattern from decision-log.ts or
narrative-validation-logger.ts — do not invent a new pattern.

---

## Constraints

- No `any` types — fix actual TypeScript errors
- No `@ts-ignore`
- Do not change Prisma schema without running `npx prisma migrate dev`
- Do not touch auth, Supabase config, or UI outside /admin
- Do not change model prompts, temperatures, or API parameters
- Preserve all BullMQ/Redis configuration exactly as-is
