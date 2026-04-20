import { prisma } from '@/lib/prisma'
import {
  buildIdempotencyKey,
  resolveSpecialtyConceptKey,
  isSpecialtyConcept,
  type AutomationTrigger,
  type HandlerContext,
  type SpecialtyConceptKey,
} from '@/lib/specialty-automation/types'
import { dispatchConceptHandler } from '@/lib/specialty-automation/handlers/registry'
import {
  persistAutomationActions,
  persistLeagueEvents,
  upsertPhaseState,
} from '@/lib/specialty-automation/actionExecutors'
import { validateAutomationContext, validateConceptRulesShape } from '@/lib/specialty-automation/validation'
import { parseSettingsSnapshot } from '@/lib/league-contract/types'
import { assertNonEmptyIdempotencyKey } from '@/lib/engine-testing/hardening/engineInvariants'
import { logEngineInvariantOptional } from '@/lib/engine-testing/runtime/invariantRuntime'

export type RunSpecialtyAutomationInput = {
  leagueId: string
  season: number
  week: number | null
  trigger: AutomationTrigger
  /** Skip idempotency (commissioner force) — creates new run with unique suffix */
  force?: boolean
  source?: string
}

export type RunSpecialtyAutomationOutput = {
  runId: string
  concept: SpecialtyConceptKey
  duplicate: boolean
  result: Awaited<ReturnType<typeof dispatchConceptHandler>>
}

export async function runSpecialtyAutomationOrchestrator(
  input: RunSpecialtyAutomationInput,
): Promise<RunSpecialtyAutomationOutput> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      leagueType: true,
      leagueVariant: true,
      settings: true,
      guillotineMode: true,
      survivorMode: true,
      status: true,
    },
  })
  if (!league) {
    throw new Error('League not found')
  }

  const conceptKey = resolveSpecialtyConceptKey(league)

  let idempotencyKey = buildIdempotencyKey({
    leagueId: input.leagueId,
    season: input.season,
    week: input.week,
    trigger: input.trigger,
    conceptKey,
  })
  if (input.force) {
    idempotencyKey = `${idempotencyKey}:force:${Date.now()}`
  }

  logEngineInvariantOptional(assertNonEmptyIdempotencyKey(idempotencyKey), 'specialty_automation.idempotency_key', {
    leagueId: input.leagueId,
    trigger: input.trigger,
  })

  const existing = await prisma.specialtyAutomationRun.findUnique({
    where: { idempotencyKey },
  })
  if (existing?.status === 'completed') {
    const meta = (existing.metadata as { handlerResult?: unknown } | null) ?? null
    return {
      runId: existing.id,
      concept: conceptKey,
      duplicate: true,
      result: (meta?.handlerResult ?? {
        summary: existing.summary ?? 'Previously completed.',
        actions: [],
        events: [],
        skipped: true,
        skipReason: 'idempotent',
      }) as RunSpecialtyAutomationOutput['result'],
    }
  }

  if (!isSpecialtyConcept(conceptKey) && !input.force) {
    const run = await prisma.specialtyAutomationRun.create({
      data: {
        leagueId: input.leagueId,
        concept: conceptKey,
        triggerType: input.trigger,
        status: 'skipped',
        idempotencyKey,
        summary: 'Standard league — no specialty automation.',
        completedAt: new Date(),
        metadata: { source: input.source } as object,
      },
    })
    return {
      runId: run.id,
      concept: conceptKey,
      duplicate: false,
      result: {
        summary: 'Standard league',
        actions: [],
        events: [],
        skipped: true,
        skipReason: 'standard_league',
      },
    }
  }

  const v = await validateAutomationContext({
    leagueId: input.leagueId,
    season: input.season,
    trigger: input.trigger,
  })
  if (!v.ok && !input.force) {
    const run = await prisma.specialtyAutomationRun.create({
      data: {
        leagueId: input.leagueId,
        concept: conceptKey,
        triggerType: input.trigger,
        status: 'skipped',
        idempotencyKey,
        summary: `Validation failed: ${v.reason}`,
        completedAt: new Date(),
        metadata: { source: input.source, validation: v } as object,
      },
    })
    return {
      runId: run.id,
      concept: conceptKey,
      duplicate: false,
      result: {
        summary: run.summary ?? '',
        actions: [],
        events: [],
        skipped: true,
        skipReason: v.reason,
      },
    }
  }

  const snap = parseSettingsSnapshot(league.settings)
  const conceptRulesRaw = snap?.conceptRules
  const conceptRules =
    conceptRulesRaw && typeof conceptRulesRaw === 'object' && !Array.isArray(conceptRulesRaw)
      ? (conceptRulesRaw as Record<string, unknown>)
      : null

  const cr = validateConceptRulesShape(conceptRules)
  if (!cr.ok && !input.force) {
    const run = await prisma.specialtyAutomationRun.create({
      data: {
        leagueId: input.leagueId,
        concept: conceptKey,
        triggerType: input.trigger,
        status: 'skipped',
        idempotencyKey,
        summary: `Validation failed: ${cr.reason}`,
        completedAt: new Date(),
        metadata: { source: input.source, validation: cr } as object,
      },
    })
    return {
      runId: run.id,
      concept: conceptKey,
      duplicate: false,
      result: {
        summary: run.summary ?? '',
        actions: [],
        events: [],
        skipped: true,
        skipReason: cr.reason,
      },
    }
  }

  const ctx: HandlerContext = {
    leagueId: input.leagueId,
    season: input.season,
    week: input.week,
    trigger: input.trigger,
    conceptKey,
    conceptRules,
    league: {
      id: league.id,
      name: league.name,
      sport: String(league.sport),
      season: league.season,
      leagueType: league.leagueType,
      leagueVariant: league.leagueVariant,
      settings: league.settings,
      guillotineMode: league.guillotineMode,
      survivorMode: league.survivorMode,
      status: league.status,
    },
  }

  const runRow = await prisma.specialtyAutomationRun.create({
    data: {
      leagueId: input.leagueId,
      concept: conceptKey,
      triggerType: input.trigger,
      status: 'running',
      idempotencyKey,
      metadata: { source: input.source } as object,
    },
  })

  let handlerResult: Awaited<ReturnType<typeof dispatchConceptHandler>>
  try {
    handlerResult = await dispatchConceptHandler(conceptKey, ctx)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.specialtyAutomationRun.update({
      where: { id: runRow.id },
      data: {
        status: 'failed',
        error: msg,
        completedAt: new Date(),
        summary: `Failed: ${msg}`,
      },
    })
    throw e
  }

  await prisma.specialtyAutomationRun.update({
    where: { id: runRow.id },
    data: {
      status: handlerResult.skipped ? 'skipped' : 'completed',
      completedAt: new Date(),
      summary: handlerResult.summary,
      metadata: {
        source: input.source,
        handlerResult,
        warnings: handlerResult.warnings,
      } as object,
    },
  })

  await persistAutomationActions(runRow.id, input.leagueId, handlerResult.actions)
  await persistLeagueEvents(input.leagueId, handlerResult.events, runRow.id)

  if (handlerResult.phaseState) {
    await upsertPhaseState(input.leagueId, handlerResult.phaseState)
  }

  return {
    runId: runRow.id,
    concept: conceptKey,
    duplicate: false,
    result: handlerResult,
  }
}
