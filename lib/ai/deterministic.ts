/**
 * Deterministic shortcuts for Chimmy.
 *
 * Returns a pre-built answer for questions that do not require an AI call,
 * saving provider credits and reducing latency. Returns null when the question
 * requires AI.
 *
 * Sports schedule guardrail:
 * - If the user asks about today's games and no schedule context is available,
 *   we return a deterministic refusal rather than calling a paid provider.
 * - If schedule data exists we return null so the pipeline proceeds normally
 *   (the schedule will be injected into the system prompt by the pipeline).
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import { resolveChimmyIntentRoute } from '@/lib/ai/chimmyIntentRouter'
import { DEFAULT_WORLD_CUP_SCORING } from '@/lib/world-cup/worldCupBracketBuilder'

// ── Schedule question detection ───────────────────────────────────────────────

const SCHEDULE_PATTERNS: RegExp[] = [
  /\b(what|are|any|which)\s+(sports?\s+)?games?\s+(are\s+)?(on|playing|today|tonight|now|scheduled)\b/i,
  /\bwhat('?s|\s+is)\s+(on\s+)?(tonight|today)\b/i,
  /\b(today|tonight)('?s)?\s+(schedule|games?|matchups?|action)\b/i,
  /\bgames?\s+(?:are\s+)?(today|tonight|now|being\s+played|on\s+today)\b/i,
  /\bwhat\s+sports?\s+(are\s+)?(on|playing|happening)\s+(today|tonight|now)\b/i,
  /\b(nfl|nba|mlb|nhl|soccer|ncaa)\s+games?\s+(today|tonight)\b/i,
]

export function detectScheduleQuestion(message: string): boolean {
  return SCHEDULE_PATTERNS.some((p) => p.test(message))
}

// ── Schedule context availability ─────────────────────────────────────────────

/**
 * Returns true if there are games in the DB scheduled for today (UTC).
 * Fails safely (returns false) if the DB query errors.
 */
export async function checkScheduleContextAvailable(): Promise<boolean> {
  try {
    const now = new Date()
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1_000)

    const count = await prisma.gameSchedule.count({
      where: {
        startTime: { gte: dayStart, lt: dayEnd },
      },
    })
    return count > 0
  } catch {
    return false
  }
}

// ── Deterministic responses ───────────────────────────────────────────────────

const SCHEDULE_REFUSAL_BY_LOCALE: Record<string, string> = {
  en: "I need live schedule data connected before I can answer today's games accurately.",
  es: "Necesito datos del calendario en vivo para responder con precisión sobre los partidos de hoy.",
  zh: "我需要即時賽程資料才能準確回答今天的比賽問題。",
  fil: "Kailangan ko ng live na datos ng iskedyul bago ako makasagot nang tama tungkol sa mga laro ngayon.",
  vi: "Tôi cần dữ liệu lịch thi đấu trực tiếp để trả lời chính xác về các trận hôm nay.",
}

function buildWorldCupScoringAnswer(locale?: string): string {
  const s = DEFAULT_WORLD_CUP_SCORING
  const base =
    `World Cup bracket scoring is supported in AllFantasy. Standard scoring rewards later rounds more heavily: ` +
    `Round of 32 ${s.roundOf32Points} points, Round of 16 ${s.roundOf16Points}, quarterfinals ${s.quarterFinalPoints}, semifinals ${s.semiFinalPoints}, finals ${s.finalPoints}, and a ${s.championBonusPoints}-point champion bonus` +
    `${s.thirdPlacePoints ? `, with ${s.thirdPlacePoints} points for third-place picks` : ""}. ` +
    `Group-stage picks matter for building the knockout bracket and pool strategy. If you open a specific World Cup pool, I can use that pool's saved settings, leaderboard, and your picks for a pool-specific answer.`

  if (locale === 'es') {
    return `La puntuación de brackets del Mundial sí está soportada en AllFantasy. La puntuación estándar vale más en rondas posteriores: Ronda de 32 ${s.roundOf32Points}, Ronda de 16 ${s.roundOf16Points}, cuartos ${s.quarterFinalPoints}, semifinales ${s.semiFinalPoints}, final ${s.finalPoints}, y bono de campeón de ${s.championBonusPoints}. Abre un pool específico para que use sus ajustes, tabla y tus picks.`
  }
  return base
}

function buildUnsupportedLiveWorldCupAnswer(locale?: string): string {
  if (locale === 'es') {
    return "No tengo datos frescos y confiables del proveedor en vivo para eso ahora mismo. Puedo ayudarte con reglas de puntuación, picks guardados, leaderboard del pool y contexto visible del bracket sin cobrar tokens por datos no disponibles."
  }
  return "I don't have fresh live provider data for that right now. I can still help with World Cup scoring rules, saved bracket picks, pool standings, and visible pool context, and this unavailable-data answer should not charge tokens."
}

/**
 * Check whether the message can be answered deterministically.
 *
 * Returns the deterministic answer string, or null if the pipeline should run.
 *
 * Current shortcuts:
 * 1. Schedule question with no schedule data in the DB →
 *    returns the guardrail refusal without calling any provider.
 *
 * @param message  The user's message.
 * @param locale   The user's selected locale (af_lang cookie value). Defaults to 'en'.
 */
export async function tryDeterministicAnswer(message: string, locale?: string): Promise<string | null> {
  const intentRoute = resolveChimmyIntentRoute(message)
  if (intentRoute.category === 'world_cup_scoring') {
    return buildWorldCupScoringAnswer(locale)
  }
  if (intentRoute.category === 'unsupported_live_data') {
    return buildUnsupportedLiveWorldCupAnswer(locale)
  }
  if (detectScheduleQuestion(message)) {
    const hasContext = await checkScheduleContextAvailable()
    if (!hasContext) {
      const safeLocale = locale && SCHEDULE_REFUSAL_BY_LOCALE[locale] ? locale : 'en'
      return SCHEDULE_REFUSAL_BY_LOCALE[safeLocale]
    }
  }
  return null
}

/** Metadata marker for deterministic responses. */
export const DETERMINISTIC_SOURCE = 'deterministic' as const
