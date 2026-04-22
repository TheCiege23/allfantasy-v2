/**
 * When timer expires: prefer AI opponent archetype pick over generic BPA (same submitPick path).
 */

import { prisma } from "@/lib/prisma"
import { submitPick } from "@/lib/live-draft-engine/PickSubmissionService"
import {
  loadAutopickDraftContextForOnClock,
  type BestAvailableAutopickResolved,
} from "@/lib/live-draft-engine/autopickBestAvailableSubmit"
import { decideDraftPick } from "@/lib/ai/opponents/draft/aiOpponentDraft"
import { getAiOpponentsSettings } from "@/lib/ai/opponents/leagueSettings"
import { getAssignmentForTeam, logBotAction, profileFromDbRow } from "@/lib/ai/opponents/db"
import { resolveLeagueTeamIdFromDraftRosterId } from "@/lib/ai/opponents/draftRosterMapping"
import type { DraftDecisionContext, DraftFormatHint, DraftPlayerOption } from "@/lib/ai/opponents/types"
import { createLeagueFeedEvent } from "@/lib/league-feed/createLeagueFeedEvent"
import { getLeagueFeedSettings } from "@/lib/league-feed/leagueFeedSettings"
import { generateFeedFlavorLine } from "@/lib/ai/opponents/botVoiceTemplates"
import { getPersonalityForArchetype } from "@/lib/ai/opponents/botPersonality"
import { recentDuplicateFlavor, recordBotMessageLine, shouldThrottleFlavor } from "@/lib/league-feed/aiMessageHistory"

function mapDraftType(dt: string): DraftFormatHint {
  const u = String(dt || "").toLowerCase()
  if (u === "snake") return "snake"
  if (u === "linear") return "linear"
  if (u.includes("auction")) return "unknown"
  return "unknown"
}

function stablePoolPlayerId(e: { playerName: string; position: string; team: string | null; playerId: string | null }): string {
  return e.playerId ?? `pool:${normalize(e.playerName)}|${String(e.position).toUpperCase()}|${normalize(e.team ?? "")}`
}

function poolToOptions(pool: Array<{ playerName: string; position: string; team: string | null; playerId: string | null; adp: number | null }>): DraftPlayerOption[] {
  return pool.map((e) => ({
    playerId: stablePoolPlayerId(e),
    name: e.playerName,
    position: e.position,
    team: e.team,
    adp: e.adp,
    tier: null,
  }))
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function pickFromPoolById(
  pool: Array<{ playerName: string; position: string; team: string | null; playerId: string | null; byeWeek: number | null; adp: number | null }>,
  id: string
): (typeof pool)[0] | null {
  const direct = pool.find((p) => p.playerId && p.playerId === id)
  if (direct) return direct
  return pool.find((p) => stablePoolPlayerId(p) === id) ?? pool[0] ?? null
}

export async function tryAiOpponentAutopickForExpiredTimer(
  leagueId: string,
  onClockRosterId: string
): Promise<{ ok: true; pick: BestAvailableAutopickResolved } | { ok: false }> {
  const leagueRow = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const leagueSettings = getAiOpponentsSettings(leagueRow?.settings)
  if (!leagueSettings.enabled) return { ok: false }

  const ctx = await loadAutopickDraftContextForOnClock(leagueId, onClockRosterId)
  if (!ctx) return { ok: false }

  if (leagueSettings.mockDraftsOnly && ctx.draftSession.sessionKind !== "mock") {
    return { ok: false }
  }

  const leagueTeamId = await resolveLeagueTeamIdFromDraftRosterId(leagueId, onClockRosterId)
  if (!leagueTeamId) return { ok: false }

  const assign = await getAssignmentForTeam(leagueTeamId)
  if (!assign || assign.leagueId !== leagueId || assign.paused) return { ok: false }

  const bot = profileFromDbRow(assign.profile)
  if (!bot) return { ok: false }

  const rosterCounts: Record<string, number> = {}
  for (const p of ctx.draftSession.picks) {
    if (p.rosterId !== onClockRosterId) continue
    const pos = String(p.position || "FL").toUpperCase()
    const key = pos.includes("RB") ? "RB" : pos.includes("WR") ? "WR" : pos.includes("TE") ? "TE" : pos.includes("QB") ? "QB" : "FL"
    rosterCounts[key] = (rosterCounts[key] ?? 0) + 1
  }

  const available = poolToOptions(ctx.fallbackPool)
  const settingsJson = (leagueRow?.settings as Record<string, unknown>) ?? {}
  const isSuperflex =
    settingsJson.is_superflex === true ||
    settingsJson.superflex === true ||
    String(settingsJson.roster_format_type ?? "")
      .toLowerCase()
      .includes("superflex")

  const decisionCtx: DraftDecisionContext = {
    leagueId,
    teamId: leagueTeamId,
    bot,
    format: mapDraftType(ctx.draftSession.draftType),
    scoring: null,
    isSuperflex,
    isTePremium: false,
    isDynasty: ctx.isDynasty,
    isDevy: false,
    round: ctx.current.round,
    pickInRound: ctx.current.slot,
    overallPick: ctx.overallPick,
    rosterCounts,
    queue: [],
    available,
    avoidPlayerIds: [],
  }

  const t0 = Date.now()
  let decision
  try {
    decision = decideDraftPick(decisionCtx)
  } catch {
    return { ok: false }
  }

  const row = pickFromPoolById(ctx.fallbackPool, decision.playerId)
  if (!row) return { ok: false }

  const pick: BestAvailableAutopickResolved = {
    playerName: row.playerName,
    position: row.position,
    team: row.team,
    playerId: row.playerId,
    byeWeek: row.byeWeek,
    reason: `AI opponent: ${decision.reason}`,
    strategy: "bpa",
  }

  const result = await submitPick({
    leagueId,
    playerName: pick.playerName.trim(),
    position: pick.position.trim(),
    team: pick.team ?? null,
    playerId: pick.playerId ?? null,
    byeWeek: pick.byeWeek ?? null,
    rosterId: onClockRosterId,
    source: "auto",
  })

  if (!result.success) return { ok: false }

  await logBotAction({
    leagueId,
    leagueTeamId,
    botProfileId: assign.profile.botId,
    actionType: "draft_pick_autopick",
    payload: decisionCtx as object,
    result: { ...decision } as object,
    durationMs: Date.now() - t0,
  })

  try {
    const teamRow = await prisma.leagueTeam.findUnique({
      where: { id: leagueTeamId },
      select: { teamName: true },
    })
    const teamName = teamRow?.teamName?.trim() || bot.displayName
    const personality = getPersonalityForArchetype(bot.archetypeId)
    const baseMsg = `${teamName} drafted ${pick.playerName} (${pick.position}) — R${ctx.current.round} P${ctx.current.slot}`
    const feed = getLeagueFeedSettings(leagueRow?.settings)
    let flavorLine: string | null = null
    if (feed.enabled && feed.aiFlavorEnabled && feed.reactions?.draft !== false) {
      const gen = generateFeedFlavorLine({
        personality,
        kind: "auto_pick_made",
        teamName,
        playerName: pick.playerName,
        position: pick.position,
        round: ctx.current.round,
        pick: ctx.current.slot,
        salt: `${ctx.overallPick}|${bot.botId}`,
      })
      const dup = await recentDuplicateFlavor(leagueId, gen.contentHash)
      let throttle = false
      if (feed.verbosity !== "high") {
        throttle = await shouldThrottleFlavor(leagueId, bot.botId)
      }
      let allow = !dup && !throttle
      if (feed.verbosity === "low") {
        allow = allow && ctx.overallPick % 3 === 0
      }
      if (allow) {
        flavorLine = gen.flavor
        await recordBotMessageLine({
          leagueId,
          botId: bot.botId,
          eventType: "auto_pick_made",
          contentHash: gen.contentHash,
          templateKey: gen.templateKey,
        })
      }
    }

    await createLeagueFeedEvent({
      leagueId,
      eventType: "auto_pick",
      message: baseMsg,
      actorType: "ai",
      actorId: bot.botId,
      actorName: bot.displayName,
      actorAvatar: bot.avatarUrl,
      teamId: leagueTeamId,
      teamName,
      flavorLine,
      category: "draft",
      importance: "normal",
      botArchetypeId: bot.archetypeId,
      botArchetypeLabel: personality.label,
      details: {
        overallPick: ctx.overallPick,
        round: ctx.current.round,
        pickInRound: ctx.current.slot,
        playerId: pick.playerId,
      },
    })
  } catch {
    // Feed is best-effort; never fail the pick path.
  }

  return { ok: true, pick }
}
