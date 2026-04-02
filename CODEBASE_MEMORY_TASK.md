# CODEBASE_MEMORY_TASK.md
# Drop this file into your repo root alongside the other files.
# In Cursor Composer: @CODEBASE_MEMORY_TASK.md implement everything in this file step by step

## What This Builds
A codebase intelligence layer that gives every AI feature full awareness of:
- The entire file structure and what each file does
- How files depend on each other (import graph)
- What changed recently and why
- Which files implement which features

The AI uses COMPRESSED SUMMARIES instead of raw file content —
so it understands the whole codebase without exceeding token limits.

---

## File Placement Map

| File to download | Place at |
|---|---|
| `codebase-index.ts`          | `lib/ai/codebase-index.ts` |
| `repo-memory.ts`             | `lib/ai/repo-memory.ts` |
| `codebase-aware-chat.ts`     | `lib/ai/codebase-aware-chat.ts` |
| `codebase-aware-simulation-worker.ts` | `lib/workers/codebase-aware-simulation-worker.ts` |
| `chimmy-route-additions.ts`  | READ ONLY — merge into `app/api/chat/chimmy/route.ts` |
| `codebase-queue.ts`          | `lib/queues/codebase-queue.ts` |
| `codebase-memory-cron.ts`    | `app/api/cron/codebase-memory/route.ts` |
| `schema-additions.prisma`    | PASTE into bottom of `prisma/schema.prisma` |

---

## Step 1 — Read before touching anything

Read these files completely:
```
prisma/schema.prisma
lib/ai-memory.ts
lib/decision-log.ts
lib/queues/bullmq.ts
lib/workers/simulation-worker.ts
app/api/chat/chimmy/route.ts
app/api/cron/auto-sync/route.ts
lib/trade-engine/narrative-validation-logger.ts
```

---

## Step 2 — Add Prisma models

Paste the contents of `schema-additions.prisma` at the bottom of `prisma/schema.prisma`.

The three new models are:
- `AICodebaseEdit` — tracks every AI-driven file change
- `AIRepoMemory` — stores the compressed codebase summary (singleton)
- `PECRLog` — logs every PECR run (Plan→Execute→Check→Repeat)

After pasting, run:
```bash
npx prisma migrate dev --name add_codebase_memory
npx prisma generate
```

Verify no migration errors. Fix any before continuing.

---

## Step 3 — Place lib/ai/ files

Create the `lib/ai/` directory if it doesn't exist.

Place these files exactly as-is:
- `codebase-index.ts` → `lib/ai/codebase-index.ts`
- `repo-memory.ts` → `lib/ai/repo-memory.ts`
- `codebase-aware-chat.ts` → `lib/ai/codebase-aware-chat.ts`

Run: `npx tsc --noEmit`

**Expected errors to fix:**
1. `openaiChatText` — check the exact signature in `lib/openai-client.ts` and match it
2. `xaiChatJson` — check signature in `lib/xai-client.ts` and match it
3. `enrichChatWithData` — check parameter type in `lib/chat-data-enrichment.ts` and match
4. `getFullAIContext` / `buildMemoryPromptSection` — check in `lib/ai-memory.ts` and match
5. Any Prisma model errors — if field names differ, align to the actual schema

Do not use `any` to fix these — find and match the actual types.

---

## Step 4 — Place lib/ai/pecr.ts

Read `lib/trade-engine/narrative-validation-logger.ts` first.
Mirror its Prisma import and `prisma.ModelName.create()` pattern exactly.

Create `lib/ai/pecr.ts` with:

```typescript
import { prisma } from '@/lib/prisma'

export type PECRFeature =
  | 'chimmy' | 'trade' | 'waiver'
  | 'simulation' | 'cron-auto-sync' | 'cron-bracket-sync'
  | 'codebase-memory'   // NEW

export interface PECRPlan {
  intent:      string
  steps:       string[]
  context:     Record<string, unknown>
  refineHints: string[]
}

export interface PECRCheckResult {
  passed:      boolean
  failures:    string[]
  refineHint?: string
}

export interface PECRResult<T> {
  output:      T
  iterations:  number
  passed:      boolean
  feature:     PECRFeature
  allFailures: string[][]
  durationMs:  number
}

export interface PECROptions<TInput, TOutput> {
  feature:        PECRFeature
  maxIterations?: number
  plan:    (input: TInput) => Promise<PECRPlan>
  execute: (plan: PECRPlan, input: TInput, iteration: number) => Promise<TOutput>
  check:   (output: TOutput, plan: PECRPlan, input: TInput) => PECRCheckResult
}

export async function runPECR<TInput, TOutput>(
  input: TInput,
  opts: PECROptions<TInput, TOutput>
): Promise<PECRResult<TOutput>> {
  const startTime  = Date.now()
  const maxIter    = opts.maxIterations ?? 4
  const allFailures: string[][] = []

  const plan = await opts.plan(input)
  let output!: TOutput

  for (let i = 1; i <= maxIter; i++) {
    output = await opts.execute(plan, input, i)
    const check = opts.check(output, plan, input)

    if (check.passed) {
      // Log success to Prisma
      await prisma.pECRLog.create({
        data: {
          feature:    opts.feature,
          iterations: i,
          passed:     true,
          durationMs: Date.now() - startTime,
          allFailures: allFailures,
        },
      }).catch(err => console.warn('[PECR] log failed:', err))

      return {
        output,
        iterations:  i,
        passed:      true,
        feature:     opts.feature,
        allFailures,
        durationMs:  Date.now() - startTime,
      }
    }

    allFailures.push(check.failures)
    if (check.refineHint) plan.refineHints.push(check.refineHint)
  }

  // Log failure to Prisma
  await prisma.pECRLog.create({
    data: {
      feature:     opts.feature,
      iterations:  maxIter,
      passed:      false,
      durationMs:  Date.now() - startTime,
      allFailures: allFailures,
    },
  }).catch(err => console.warn('[PECR] log failed:', err))

  return {
    output,
    iterations:  maxIter,
    passed:      false,
    feature:     opts.feature,
    allFailures,
    durationMs:  Date.now() - startTime,
  }
}
```

Run `npx tsc --noEmit` and fix all errors.

---

## Step 5 — Replace simulation worker

Replace `lib/workers/simulation-worker.ts` with `codebase-aware-simulation-worker.ts`.

The new worker:
- Has PECR-wrapped job processing
- Calls actual engine functions from `lib/engine/`
- Handles `codebase-index` and `repo-memory` job types
- Keeps existing BullMQ event handlers

Run `npx tsc --noEmit` and fix errors.
The engine imports must match what's actually exported from `lib/engine/index.ts`.

---

## Step 6 — Add queue helpers

Place `codebase-queue.ts` at `lib/queues/codebase-queue.ts`.

Run `npx tsc --noEmit` and fix errors.

---

## Step 7 — Add cron route

Place `codebase-memory-cron.ts` at `app/api/cron/codebase-memory/route.ts`.

Add to `vercel.json` (create it if it doesn't exist):
```json
{
  "crons": [
    { "path": "/api/cron/codebase-memory", "schedule": "0 4 * * *" }
  ]
}
```

---

## Step 8 — Merge into chimmy route

Read `chimmy-route-additions.ts` — it shows WHAT to add, not a full replacement.

In `app/api/chat/chimmy/route.ts`:

1. Add at the top of imports:
```typescript
import { codbaseAwareChatStream, codbaseAwareChat, CodebaseAwareChatInput } from '@/lib/ai/codebase-aware-chat'
```

2. Add `isCodeQuery` function before the POST handler:
```typescript
function isCodeQuery(message: string): boolean {
  return /where is|which file|how does|what file|find the file|show me the code|how is this implemented|architecture|dependency|depends on|codebase|what calls|what uses/i
    .test(message)
}
```

3. At the TOP of the POST handler body, before the existing enrichment code, add:
```typescript
const codeMode = body.codeMode === true || isCodeQuery(message)

if (codeMode) {
  // ... paste the codebase-aware branch from chimmy-route-additions.ts ...
}
// existing handler continues below for non-code queries
```

4. Add these headers to the EXISTING final return statement:
```typescript
headers: {
  'x-pecr-mode':       'standard',
  'x-pecr-iterations': '1',
  'x-pecr-passed':     'true',
}
```

Run `npx tsc --noEmit` and fix all errors.

---

## Step 9 — Write tests

Create `__tests__/codebase-index.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { classifyLayer, findFiles } from '@/lib/ai/codebase-index'
// Note: classifyLayer is not exported by default — export it from codebase-index.ts first

describe('codebase-index', () => {
  it('classifies api routes correctly', () => {
    // You'll need to export classifyLayer to test it
    // Add: export { classifyLayer } to codebase-index.ts
  })

  it('findFiles returns matching files', () => {
    const snapshot = {
      indexedAt: new Date().toISOString(),
      fileCount: 2,
      totalBytes: 100,
      files: [
        { path: 'lib/trade-engine/trade.ts', type: 'file' as const, size: 100, lastModified: '', summary: '', exports: [], imports: [], layer: 'lib-engine' as const },
        { path: 'app/api/chat/chimmy/route.ts', type: 'file' as const, size: 200, lastModified: '', summary: '', exports: [], imports: [], layer: 'api-route' as const },
      ],
      deps: [],
      recentEdits: [],
    }
    const result = findFiles('trade', snapshot)
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('lib/trade-engine/trade.ts')
  })
})
```

Run: `npx vitest run __tests__/codebase-index.test.ts`

---

## Step 10 — Admin panel

Read `app/admin/components/AdminTools.tsx` and `app/admin/components/AdminOverview.tsx`.

In whichever file uses card/stat components, add a "Codebase Memory" card:

```typescript
// Fetch from Prisma in the server component or API route:
const memory   = await prisma.aIRepoMemory.findUnique({ where: { id: 'singleton' } })
const lastIndex = memory ? JSON.parse(memory.memory).generatedAt : null
const pECRStats = await prisma.pECRLog.groupBy({
  by:        ['feature'],
  _avg:      { iterations: true },
  _count:    { passed: true },
  orderBy:   { _avg: { iterations: 'desc' } },
})

// Render a card showing:
// - Last indexed: {lastIndex}
// - Files indexed: {fileCount}
// - PECR avg iterations per feature
// - Rebuild Now button → POST /api/cron/codebase-memory
```

Use the exact same card component style already used in the admin panel.

---

## Constraints

- No `any` types — fix actual TypeScript errors
- No `@ts-ignore`
- Match all function signatures to their actual definitions in the existing files
- Run `npx tsc --noEmit` after EVERY step
- Run `node scripts/smoke-check.mjs` at the end
- Preserve all existing BullMQ/Redis configuration exactly
- Do not change Prisma schema without running `npx prisma migrate dev`
