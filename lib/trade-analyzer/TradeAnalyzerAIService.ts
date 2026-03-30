import { DEFAULT_SPORT, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { runCostControlledOpenAIText } from '@/lib/ai-cost-control'

export interface TradeAnalyzerAssetInput {
  name: string
  value: number
  type?: 'player' | 'pick' | 'faab'
}

export interface TradeAnalyzerSideInput {
  managerName: string
  gives: TradeAnalyzerAssetInput[]
}

export interface TradeAnalyzerAIInput {
  sport?: string
  leagueFormat?: string
  includeAI?: boolean
  sender: TradeAnalyzerSideInput
  receiver: TradeAnalyzerSideInput
}

export interface TradeValueComparison {
  senderGivesValue: number
  senderReceivesValue: number
  senderNetValue: number
  receiverGivesValue: number
  receiverReceivesValue: number
  receiverNetValue: number
  fairnessScore: number
  fairnessLabel: 'balanced' | 'slight_edge' | 'unbalanced'
  favoredSide: 'sender' | 'receiver' | 'even'
  imbalancePct: number
}

export interface TradeAnalyzerAIOutput {
  sport: SupportedSport
  leagueFormat?: string
  deterministic: {
    valueComparison: TradeValueComparison
  }
  fairnessExplanation: {
    source: 'deterministic' | 'ai'
    text: string
  }
  counterSuggestions: {
    source: 'deterministic' | 'ai'
    suggestions: string[]
  }
}

type ParsedAIResponse = {
  fairnessExplanation?: string
  counterSuggestions?: string[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function parseAIResponse(raw: string): ParsedAIResponse | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const fairnessExplanation =
      typeof parsed.fairnessExplanation === 'string' ? parsed.fairnessExplanation.trim() : undefined
    const counterSuggestions = Array.isArray(parsed.counterSuggestions)
      ? parsed.counterSuggestions
          .filter((line): line is string => typeof line === 'string')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 4)
      : undefined
    return { fairnessExplanation, counterSuggestions }
  } catch {
    return null
  }
}

function getFairnessLabel(fairnessScore: number): TradeValueComparison['fairnessLabel'] {
  if (fairnessScore >= 90) return 'balanced'
  if (fairnessScore >= 75) return 'slight_edge'
  return 'unbalanced'
}

function buildDeterministicValueComparison(input: TradeAnalyzerAIInput): TradeValueComparison {
  const senderGivesValue = roundToTenth(
    (input.sender.gives ?? []).reduce((sum, asset) => sum + Number(asset.value ?? 0), 0)
  )
  const receiverGivesValue = roundToTenth(
    (input.receiver.gives ?? []).reduce((sum, asset) => sum + Number(asset.value ?? 0), 0)
  )
  const senderReceivesValue = receiverGivesValue
  const receiverReceivesValue = senderGivesValue
  const senderNetValue = roundToTenth(senderReceivesValue - senderGivesValue)
  const receiverNetValue = roundToTenth(receiverReceivesValue - receiverGivesValue)
  const baseline = Math.max(Math.abs(senderGivesValue), Math.abs(senderReceivesValue), 1)
  const imbalancePct = roundToTenth((Math.abs(senderGivesValue - senderReceivesValue) / baseline) * 100)
  const fairnessScore = clamp(Math.round(100 - imbalancePct), 0, 100)
  const tolerance = baseline * 0.03
  const favoredSide: TradeValueComparison['favoredSide'] =
    Math.abs(senderNetValue) <= tolerance ? 'even' : senderNetValue > 0 ? 'sender' : 'receiver'

  return {
    senderGivesValue,
    senderReceivesValue,
    senderNetValue,
    receiverGivesValue,
    receiverReceivesValue,
    receiverNetValue,
    fairnessScore,
    fairnessLabel: getFairnessLabel(fairnessScore),
    favoredSide,
    imbalancePct,
  }
}

function buildDeterministicExplanation(input: {
  comparison: TradeValueComparison
  senderName: string
  receiverName: string
}): string {
  const { comparison, senderName, receiverName } = input
  if (comparison.favoredSide === 'even') {
    return `The trade is close to balanced by deterministic value: ${senderName} gives ${comparison.senderGivesValue.toFixed(1)} and receives ${comparison.senderReceivesValue.toFixed(1)} (fairness ${comparison.fairnessScore}/100).`
  }

  const favored = comparison.favoredSide === 'sender' ? senderName : receiverName
  const edge = Math.abs(comparison.senderNetValue).toFixed(1)
  return `Deterministic value comparison favors ${favored} by about ${edge} points of trade value (fairness ${comparison.fairnessScore}/100).`
}

function getLowestValueAsset(assets: TradeAnalyzerAssetInput[]): TradeAnalyzerAssetInput | null {
  if (!assets.length) return null
  return [...assets].sort((left, right) => Number(left.value ?? 0) - Number(right.value ?? 0))[0] ?? null
}

function buildDeterministicCounterSuggestions(input: {
  comparison: TradeValueComparison
  sender: TradeAnalyzerSideInput
  receiver: TradeAnalyzerSideInput
}): string[] {
  const { comparison, sender, receiver } = input
  if (comparison.favoredSide === 'even') {
    return ['No counter is required on value alone. You can accept or make a minor roster-fit adjustment.']
  }

  const losingSide = comparison.favoredSide === 'sender' ? receiver : sender
  const winningSide = comparison.favoredSide === 'sender' ? sender : receiver
  const losingName = losingSide.managerName
  const winningName = winningSide.managerName
  const neededValue = roundToTenth(Math.abs(comparison.senderNetValue))

  const winnerThrowIn = getLowestValueAsset(winningSide.gives)
  const loserRemove = getLowestValueAsset(losingSide.gives)

  const suggestions: string[] = [
    `${losingName} can ask ${winningName} to add around ${neededValue.toFixed(1)} more value (pick, depth asset, or FAAB).`,
  ]

  if (winnerThrowIn) {
    suggestions.push(
      `Counter idea: include ${winnerThrowIn.name} from ${winningName}'s side to narrow the deterministic value gap.`
    )
  }
  if (loserRemove) {
    suggestions.push(
      `Alternative: remove ${loserRemove.name} from ${losingName}'s outgoing package to rebalance the offer.`
    )
  }

  return suggestions.slice(0, 4)
}

async function buildAIEnhancement(input: {
  sport: SupportedSport
  leagueFormat?: string
  comparison: TradeValueComparison
  sender: TradeAnalyzerSideInput
  receiver: TradeAnalyzerSideInput
  deterministicExplanation: string
  deterministicCounters: string[]
}): Promise<ParsedAIResponse | null> {
  const ai = await runCostControlledOpenAIText({
    feature: 'trade_analyzer_enhancement',
    enableAI: true,
    fallbackText: null,
    cacheTtlMs: 5 * 60 * 1000,
    repeatCooldownMs: 10 * 1000,
    cacheContext: {
      sport: input.sport,
      leagueFormat: input.leagueFormat ?? null,
      sender: input.sender,
      receiver: input.receiver,
      comparison: input.comparison,
    },
    messages: [
      {
        role: 'system',
        content:
          'You are AllFantasy Trade Analyzer AI. Use deterministic value comparison as ground truth. ' +
          'Do not change or override fairness score or favored side. Return valid JSON only.',
      },
      {
        role: 'user',
        content: [
          `Sport: ${input.sport}`,
          `League format: ${input.leagueFormat ?? 'redraft'}`,
          `Sender: ${input.sender.managerName}`,
          `Receiver: ${input.receiver.managerName}`,
          `Sender gives value: ${input.comparison.senderGivesValue.toFixed(1)}`,
          `Sender receives value: ${input.comparison.senderReceivesValue.toFixed(1)}`,
          `Sender net value: ${input.comparison.senderNetValue.toFixed(1)}`,
          `Fairness score: ${input.comparison.fairnessScore}`,
          `Favored side: ${input.comparison.favoredSide}`,
          `Deterministic explanation: ${input.deterministicExplanation}`,
          `Deterministic counters: ${input.deterministicCounters.join(' | ')}`,
          'Return JSON only:',
          '{',
          '  "fairnessExplanation": "2-3 sentence explanation grounded in deterministic values",',
          '  "counterSuggestions": ["counter suggestion 1", "counter suggestion 2", "counter suggestion 3"]',
          '}',
        ].join('\n'),
      },
    ],
    temperature: 0.35,
    maxTokens: 280,
  })

  if (!ai.ok || !ai.text?.trim()) return null
  return parseAIResponse(ai.text)
}

export async function analyzeTradeWithOptionalAI(
  input: TradeAnalyzerAIInput
): Promise<TradeAnalyzerAIOutput> {
  const sport = normalizeToSupportedSport(input.sport ?? DEFAULT_SPORT)
  const comparison = buildDeterministicValueComparison(input)
  const deterministicExplanation = buildDeterministicExplanation({
    comparison,
    senderName: input.sender.managerName,
    receiverName: input.receiver.managerName,
  })
  const deterministicCounters = buildDeterministicCounterSuggestions({
    comparison,
    sender: input.sender,
    receiver: input.receiver,
  })

  const output: TradeAnalyzerAIOutput = {
    sport,
    leagueFormat: input.leagueFormat,
    deterministic: {
      valueComparison: comparison,
    },
    fairnessExplanation: {
      source: 'deterministic',
      text: deterministicExplanation,
    },
    counterSuggestions: {
      source: 'deterministic',
      suggestions: deterministicCounters,
    },
  }

  if (!input.includeAI) return output

  const aiEnhanced = await buildAIEnhancement({
    sport,
    leagueFormat: input.leagueFormat,
    comparison,
    sender: input.sender,
    receiver: input.receiver,
    deterministicExplanation,
    deterministicCounters,
  })

  if (aiEnhanced?.fairnessExplanation) {
    output.fairnessExplanation = {
      source: 'ai',
      text: aiEnhanced.fairnessExplanation,
    }
  }
  if (aiEnhanced?.counterSuggestions && aiEnhanced.counterSuggestions.length > 0) {
    output.counterSuggestions = {
      source: 'ai',
      suggestions: aiEnhanced.counterSuggestions,
    }
  }

  return output
}
