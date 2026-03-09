import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { fetchNewsContext } from '@/lib/upstream-apis'
import { fetchPlayerNewsFromGrok } from '@/lib/ai-gm-intelligence'

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

type Mode = 'needs' | 'bpa'

type ScoutPlayer = {
  name: string
  position: string
  team?: string | null
  adp?: number | null
  value?: number | null
  isRookie?: boolean
  sleeperId?: string | null
}

type LeagueContextInput = {
  rosterPositions?: string[]
  scoringSettings?: Record<string, number>
}

const POSITION_TARGETS: Record<string, { starter: number; ideal: number }> = {
  QB: { starter: 1, ideal: 2 },
  RB: { starter: 2, ideal: 5 },
  WR: { starter: 2, ideal: 5 },
  TE: { starter: 1, ideal: 2 },
  K: { starter: 1, ideal: 1 },
  DEF: { starter: 1, ideal: 1 },
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[.'-]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildScoringProfile(args: {
  rosterSlots: string[]
  scoringSettings?: Record<string, number>
  isSF?: boolean
}): { isSuperflex: boolean; isTEP: boolean } {
  const slots = args.rosterSlots || []
  const scoring = args.scoringSettings || {}
  const isSuperflex = Boolean(args.isSF) || slots.includes('SUPER_FLEX') || slots.includes('OP') || slots.filter((s) => s === 'QB').length >= 2
  const rec = Number(scoring.rec || 1)
  const teBonus = Number(scoring.bonus_rec_te || 0)
  const isTEP = teBonus >= 0.5 || rec >= 1.5
  return { isSuperflex, isTEP }
}

function computeTeamNeeds(roster: { position: string }[], rosterSlots: string[], isSF: boolean): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of roster) {
    const pos = String(p.position || '').toUpperCase()
    counts[pos] = (counts[pos] || 0) + 1
  }

  const needs: Record<string, number> = {}
  for (const [pos, targets] of Object.entries(POSITION_TARGETS)) {
    const count = counts[pos] || 0
    if (count < targets.starter) {
      needs[pos] = clamp(88 + (targets.starter - count) * 10, 0, 100)
    } else if (count < targets.ideal) {
      needs[pos] = clamp(42 + (targets.ideal - count) * 12, 0, 100)
    } else {
      needs[pos] = 10
    }
  }

  if (isSF) {
    needs.QB = clamp((needs.QB || 50) + 18, 0, 100)
  }

  for (const s of rosterSlots) {
    if (s === 'FLEX') {
      needs.RB = clamp((needs.RB || 20) + 8, 0, 100)
      needs.WR = clamp((needs.WR || 20) + 8, 0, 100)
      needs.TE = clamp((needs.TE || 20) + 4, 0, 100)
    }
    if (s === 'SUPER_FLEX' || s === 'OP') {
      needs.QB = clamp((needs.QB || 50) + 12, 0, 100)
    }
  }

  return needs
}

function buildNewsSignalMap(args: {
  available: ScoutPlayer[]
  newsContext: Awaited<ReturnType<typeof fetchNewsContext>> | null
  grokNews: Array<{ playerName: string; sentiment: string; news: string[]; buzz: string }>
}): Map<string, { score: number; signals: string[] }> {
  const byPlayer = new Map<string, { score: number; signals: string[] }>()

  const add = (name: string, score: number, signal: string) => {
    const key = normalizeName(name)
    if (!key) return
    const existing = byPlayer.get(key) || { score: 0, signals: [] }
    existing.score += score
    if (signal) existing.signals.push(signal)
    byPlayer.set(key, existing)
  }

  const knownNames = new Map(args.available.map((p) => [normalizeName(p.name), p.name]))

  for (const item of args.newsContext?.items || []) {
    const title = String(item.title || '')
    const low = title.toLowerCase()
    for (const [k, originalName] of knownNames.entries()) {
      if (!k) continue
      const first = k.split(' ')[0]
      if (low.includes(k) || (first && low.includes(first))) {
        if (item.isInjury || /out|ir|injury|doubtful|questionable|suspension/.test(low)) {
          add(originalName, -12, 'Injury/availability risk in recent news')
        } else if (/starter|promoted|breakout|impressed|surge|extension/.test(low)) {
          add(originalName, 7, 'Positive usage/momentum signal')
        } else {
          add(originalName, 2, 'Recent relevant news mention')
        }
      }
    }
  }

  for (const item of args.grokNews || []) {
    const s = String(item.sentiment || 'neutral').toLowerCase()
    const topHeadline = item.news?.[0] || ''
    if (s === 'bullish') add(item.playerName, 8, topHeadline || 'Bullish X/Twitter sentiment')
    else if (s === 'bearish') add(item.playerName, -8, topHeadline || 'Bearish X/Twitter sentiment')
    else if (s === 'injury_concern') add(item.playerName, -12, topHeadline || 'Injury concern from X/Twitter')
    else add(item.playerName, 1, topHeadline || 'Neutral X/Twitter sentiment')
  }

  return byPlayer
}

function scoreCandidates(args: {
  available: ScoutPlayer[]
  teamRoster: { position: string }[]
  rosterSlots: string[]
  isRookieDraft: boolean
  isDynasty: boolean
  mode: Mode
  round: number
  pick: number
  totalTeams: number
  scoringProfile: { isSuperflex: boolean; isTEP: boolean }
  newsSignals: Map<string, { score: number; signals: string[] }>
}) {
  const needs = computeTeamNeeds(args.teamRoster, args.rosterSlots, args.scoringProfile.isSuperflex)
  const overall = (args.round - 1) * args.totalTeams + args.pick

  const ranked = args.available.slice(0, 80).map((p) => {
    const pos = String(p.position || '').toUpperCase()
    const needScore = needs[pos] || 20
    const adp = Number(p.adp || 999)
    const adpEdge = clamp((overall - adp) * 1.4, -20, 25)
    const valueScore = clamp(Number(p.value || 2000) / 2500, 0.4, 2.4) * 18

    let formatBoost = 0
    if (args.scoringProfile.isSuperflex && pos === 'QB') formatBoost += 14
    if (args.scoringProfile.isTEP && pos === 'TE') formatBoost += 10
    if (args.isRookieDraft && p.isRookie) formatBoost += 18
    if (args.isDynasty && p.isRookie) formatBoost += 8

    if (args.round <= 2 && !args.scoringProfile.isSuperflex && pos === 'QB') formatBoost -= 10
    if (args.round >= 5 && (pos === 'K' || pos === 'DEF')) formatBoost -= 6

    const news = args.newsSignals.get(normalizeName(p.name)) || { score: 0, signals: [] }

    const modeAdjustment = args.mode === 'bpa' ? 0 : needScore * 0.55
    const bpaAdjustment = args.mode === 'bpa' ? valueScore * 0.6 + adpEdge * 0.5 : 0

    const totalScore =
      modeAdjustment +
      bpaAdjustment +
      valueScore * 0.5 +
      adpEdge * 0.9 +
      formatBoost +
      news.score

    return {
      player: p,
      totalScore,
      needScore,
      adpEdge,
      formatBoost,
      newsSignals: news.signals,
      confidence: clamp(Math.round(58 + totalScore * 0.7), 45, 96),
    }
  })

  ranked.sort((a, b) => b.totalScore - a.totalScore)
  return { ranked, needs, overall }
}

function buildPickReasoning(args: {
  managerName: string
  chosen: ReturnType<typeof scoreCandidates>['ranked'][number]
  needs: Record<string, number>
  overall: number
  isRookieDraft: boolean
  scoringProfile: { isSuperflex: boolean; isTEP: boolean }
}): string {
  const c = args.chosen
  const posNeed = args.needs[c.player.position] || 0
  const tags: string[] = []
  if (posNeed >= 70) tags.push(`fills a critical ${c.player.position} need`)
  else if (posNeed >= 45) tags.push(`improves ${c.player.position} depth`)

  if ((c.player.adp || 999) < args.overall - 2) tags.push(`value vs ADP (${Number(c.player.adp).toFixed(1)})`)
  if (args.scoringProfile.isSuperflex && c.player.position === 'QB') tags.push('Superflex QB premium applied')
  if (args.scoringProfile.isTEP && c.player.position === 'TE') tags.push('TE premium scoring boost')
  if (args.isRookieDraft && c.player.isRookie) tags.push('rookie-board priority')
  if (c.newsSignals.length > 0) tags.push(c.newsSignals[0])

  return `${args.managerName} selects ${c.player.name}. This pick ${tags.slice(0, 3).join(', ')}.`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      action = 'pick',
      available = [],
      teamRoster = [],
      rosterSlots = [],
      round = 1,
      pick = 1,
      totalTeams = 12,
      managerName = 'AI Manager',
      isDynasty = true,
      isSF = false,
      isRookieDraft = false,
      mode = 'needs',
      leagueContext,
      nextManagers = [],
    } = body as {
      action?: 'pick' | 'dm-suggestion' | 'trade-proposal' | 'predict-next'
      available?: ScoutPlayer[]
      teamRoster?: { position: string }[]
      rosterSlots?: string[]
      round?: number
      pick?: number
      totalTeams?: number
      managerName?: string
      isDynasty?: boolean
      isSF?: boolean
      isRookieDraft?: boolean
      mode?: Mode
      leagueContext?: LeagueContextInput
      nextManagers?: string[]
    }

    const safeAvailable = Array.isArray(available) ? available : []
    if (safeAvailable.length === 0) {
      return NextResponse.json({ error: 'No available players' }, { status: 400 })
    }

    const effectiveRosterSlots = [
      ...(Array.isArray(rosterSlots) ? rosterSlots : []),
      ...((leagueContext?.rosterPositions || []) as string[]),
    ]
    const scoringProfile = buildScoringProfile({
      rosterSlots: effectiveRosterSlots,
      scoringSettings: leagueContext?.scoringSettings,
      isSF,
    })

    const topCandidateNames = safeAvailable.slice(0, 25).map((p) => p.name).filter(Boolean)

    const [newsContext, grokNews] = await Promise.all([
      fetchNewsContext(
        { prisma, newsApiKey: process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY },
        {
          playerNames: topCandidateNames,
          sport: 'NFL',
          hoursBack: 120,
          limit: 30,
        },
      ).catch(() => null),
      fetchPlayerNewsFromGrok(topCandidateNames.slice(0, 15), 'nfl').catch(() => []),
    ])

    const newsSignals = buildNewsSignalMap({
      available: safeAvailable,
      newsContext,
      grokNews,
    })

    const scored = scoreCandidates({
      available: safeAvailable,
      teamRoster,
      rosterSlots: effectiveRosterSlots,
      isRookieDraft,
      isDynasty,
      mode: mode === 'bpa' ? 'bpa' : 'needs',
      round,
      pick,
      totalTeams,
      scoringProfile,
      newsSignals,
    })

    const legacyMeta = {
      status: 'ok',
      screen: 'draft_war_room',
      meta: {
        confidence: Math.max(0.45, Math.min(0.96, (scored.ranked[0]?.confidence || 72) / 100)),
        usedLiveNewsOverlay: true,
        usedSimulation: action === 'predict-next',
        generatedAt: new Date().toISOString(),
        requestId: `req_${Date.now()}_mock_ai_pick`,
        aiStack: {
          orchestrator: 'openai',
          structuredEvaluator: 'deepseek',
          liveNewsOverlay: 'grok',
        },
      },
      errors: [],
    }

    if (action === 'pick') {
      const selected = scored.ranked[0]
      return NextResponse.json({
        legacyEnvelope: legacyMeta,
        pick: {
          playerName: selected.player.name,
          position: selected.player.position,
          team: selected.player.team || null,
          adp: selected.player.adp,
          sleeperId: selected.player.sleeperId || null,
          isRookie: Boolean(selected.player.isRookie),
        },
        scorecard: {
          totalScore: Number(selected.totalScore.toFixed(2)),
          confidence: selected.confidence,
          needScore: selected.needScore,
          adpEdge: Number(selected.adpEdge.toFixed(2)),
          formatBoost: selected.formatBoost,
          newsSignals: selected.newsSignals.slice(0, 2),
        },
        reasoning: buildPickReasoning({
          managerName,
          chosen: selected,
          needs: scored.needs,
          overall: scored.overall,
          isRookieDraft,
          scoringProfile,
        }),
      })
    }

    if (action === 'predict-next') {
      const managers = Array.isArray(nextManagers) && nextManagers.length > 0
        ? nextManagers.slice(0, 8)
        : ['Manager 2', 'Manager 3', 'Manager 4']

      const predictions = managers.map((m, idx) => {
        const candidate = scored.ranked[Math.min(idx, scored.ranked.length - 1)]
        return {
          manager: m,
          predictedPlayer: candidate.player.name,
          position: candidate.player.position,
          probability: clamp(72 - idx * 9, 36, 90),
          reason: `${candidate.player.position} need + ADP board fit`,
        }
      })

      return NextResponse.json({
        legacyEnvelope: legacyMeta,
        predictions,
        context: {
          overall: scored.overall,
          scoringProfile,
          topNeeds: Object.entries(scored.needs)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3),
        },
      })
    }

    if (action === 'dm-suggestion') {
      const suggestions = scored.ranked.slice(0, 3).map((item, idx) => ({
        player: item.player.name,
        position: item.player.position,
        team: item.player.team || null,
        adp: item.player.adp,
        reason:
          idx === 0
            ? 'Best blend of roster fit, market value, and current signals'
            : idx === 1
              ? 'Alternative with strong upside if top option is sniped'
              : 'Leverage/value fallback with acceptable risk profile',
        confidence: item.confidence,
        type: idx === 0 ? 'primary' : idx === 1 ? 'pivot' : 'value',
      }))

      const topNeeds = Object.entries(scored.needs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      let aiInsight = ''
      try {
        const prompt = `You are an NFL rookie-draft scout helping a fantasy manager pick now.
League profile: ${isDynasty ? 'Dynasty' : 'Redraft'}${isRookieDraft ? ', Rookie Draft' : ''}${scoringProfile.isSuperflex ? ', Superflex' : ', 1QB'}${scoringProfile.isTEP ? ', TE Premium' : ''}.
On clock: Round ${round}, Pick ${pick}, Overall ${scored.overall}.
Top roster needs: ${topNeeds.map(([pos, score]) => `${pos} (${score})`).join(', ')}.
Candidates: ${suggestions.map((s) => `${s.player} (${s.position}, ADP ${Number(s.adp || 999).toFixed(1)})`).join('; ')}.
Return exactly 2 concise sentences with clear action and fallback.`

        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
          temperature: 0.4,
        })
        aiInsight = resp.choices[0]?.message?.content || ''
      } catch {
        aiInsight = ''
      }

      return NextResponse.json({
        legacyEnvelope: legacyMeta,
        suggestions,
        needs: Object.fromEntries(topNeeds),
        rosterCounts: teamRoster.reduce((acc: Record<string, number>, p: { position: string }) => {
          const pos = String(p.position || '').toUpperCase()
          acc[pos] = (acc[pos] || 0) + 1
          return acc
        }, {}),
        aiInsight,
        nextPickPredictions: scored.ranked.slice(0, 3).map((item, idx) => ({
          player: item.player.name,
          probability: clamp(62 - idx * 13, 25, 85),
        })),
        round,
        pick,
        overall: scored.overall,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: pick, dm-suggestion, predict-next' }, { status: 400 })
  } catch (err: any) {
    console.error('[mock-draft/ai-pick] Error:', err)
    return NextResponse.json({ error: err.message || 'AI pick failed' }, { status: 500 })
  }
}
