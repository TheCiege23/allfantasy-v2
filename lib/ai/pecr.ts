import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type PECRFeature =
  | "chimmy"
  | "trade"
  | "waiver"
  | "simulation"
  | "cron-auto-sync"
  | "cron-bracket-sync"

export interface PECRPlan {
  intent: string
  steps: string[]
  context: Record<string, unknown>
  refineHints: string[]
}

export interface PECRCheckResult {
  passed: boolean
  failures: string[]
  refineHint?: string
}

export interface PECRResult<T> {
  output: T
  iterations: number
  passed: boolean
  feature: PECRFeature
  allFailures: string[][]
  durationMs: number
}

export interface PECROptions<TInput, TOutput> {
  feature: PECRFeature
  maxIterations?: number
  plan: (input: TInput) => Promise<PECRPlan>
  execute: (plan: PECRPlan, input: TInput, iteration: number) => Promise<TOutput>
  check: (output: TOutput, plan: PECRPlan, input: TInput) => PECRCheckResult
}

function normalizeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return String(value)
  }
}

async function logPECRRun<TOutput>(input: {
  feature: PECRFeature
  maxIterations: number
  plan: PECRPlan
  result: PECRResult<TOutput>
}): Promise<void> {
  try {
    await prisma.pecrLog.create({
      data: {
        feature: input.feature,
        intent: input.plan.intent,
        steps: normalizeJson(input.plan.steps),
        context: normalizeJson(input.plan.context),
        refineHints: normalizeJson(input.plan.refineHints),
        iterations: input.result.iterations,
        maxIterations: input.maxIterations,
        passed: input.result.passed,
        allFailures: normalizeJson(input.result.allFailures),
        durationMs: input.result.durationMs,
        outputPreview: normalizeJson(input.result.output),
      },
    })
  } catch (err) {
    console.error("[PECR] Error:", err)
  }
}

export async function runPECR<TInput, TOutput>(
  input: TInput,
  opts: PECROptions<TInput, TOutput>
): Promise<PECRResult<TOutput>> {
  const startTime = Date.now()
  const maxIterations = opts.maxIterations ?? 4
  const plan = await opts.plan(input)
  const allFailures: string[][] = []

  let latestOutput!: TOutput
  let hasOutput = false
  let iterations = 0
  let passed = false

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    iterations = iteration

    const output = await opts.execute(plan, input, iteration)
    latestOutput = output
    hasOutput = true

    const checkResult = opts.check(output, plan, input)
    if (checkResult.passed) {
      passed = true
      break
    }

    allFailures.push([...checkResult.failures])

    const refineHint = checkResult.refineHint?.trim()
    if (refineHint) {
      plan.refineHints.push(refineHint)
    }
  }

  if (!hasOutput) {
    throw new Error("PECR execute did not produce an output.")
  }

  const result: PECRResult<TOutput> = {
    output: latestOutput,
    iterations,
    passed,
    feature: opts.feature,
    allFailures,
    durationMs: Math.max(Date.now() - startTime, 1),
  }

  await logPECRRun({
    feature: opts.feature,
    maxIterations,
    plan,
    result,
  })

  return result
}
