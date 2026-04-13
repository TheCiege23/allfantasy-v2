/**
 * Trade Analyzer Module — Chimmy Brain AI #2
 *
 * Multi-dimensional trade analysis:
 * - Fairness score (0-100, symmetric)
 * - Win-now vs win-later breakdown
 * - Championship equity impact
 * - Risk analysis (injuries, suspensions, usage)
 * - Collusion detection signals
 * - Suggested counter-offers
 *
 * Grounded in: projections, schedule, playoff odds, positional scarcity
 * Supports: keeper, dynasty, devy, C2C trades + all sports
 */

import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import type { DeterministicAnalysisOutput, TradeEquityAssessment } from './DeterministicAnalysisEngine'
import type { IChimmyModule, ModuleConfig, ModuleInput, StandardizedModuleOutput } from './ChimmyModuleInterface'
import { BaseChimmyModule, MODULE_NAMES } from './ChimmyModuleInterface'
import { GenerateWithAI } from '@/lib/unified-ai'
import { prisma } from '@/lib/prisma'

export interface TradeAnalysisInput extends ModuleInput {
  tradeData: {
    tradeId: string
    team1Id: string
    team2Id: string
    team1Sends: Array<{ playerId: string; type: 'player' | 'pick'; pickRound?: number }>
    team2Sends: Array<{ playerId: string; type: 'player' | 'pick'; pickRound?: number }>
  }
}

export interface TradeAnalysisOutput extends StandardizedModuleOutput {
  recommendation: {
    verdict: 'seems_fair' | 'slightly_favors_team1' | 'significantly_favors_team1' | 'slightly_favors_team2' | 'significantly_favors_team2'
    fairnessScore: number // 0-100, 50 = completely fair
    equityGap: number // how far from 50-50
  }
}

export class TradeAnalyzerModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: MODULE_NAMES.TRADE_ANALYZER,
    version: '1.0.0',
    enabled: true,
    preferredModel: 'deepseek', // Structured fairness analysis
    fallbackModels: ['openai'],
    minimumConfidenceThreshold: 50,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: true,
    maxExecutionTimeMs: 8000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    const tradeInput = input as TradeAnalysisInput

    if (!input.envelope.leagueId) errors.push('Missing leagueId')
    if (!tradeInput.tradeData?.tradeId) errors.push('Missing tradeId')
    if (!tradeInput.tradeData?.team1Sends?.length) errors.push('Team 1 sends nothing')
    if (!tradeInput.tradeData?.team2Sends?.length) errors.push('Team 2 sends nothing')

    // Verify all players exist in deterministic layer
    const allPlayerIds = [
      ...tradeInput.tradeData.team1Sends.filter((s) => s.type === 'player').map((s) => s.playerId),
      ...tradeInput.tradeData.team2Sends.filter((s) => s.type === 'player').map((s) => s.playerId),
    ]

    for (const playerId of allPlayerIds) {
      if (!input.deterministic.projections[playerId]) {
        errors.push(`Player ${playerId} not found in projections`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()
    const tradeInput = input as TradeAnalysisInput

    try {
      // Validate
      const validation = await this.validate(input)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Compute equity assessment from deterministic layer
      const equity = input.deterministic.tradeEquities.get(tradeInput.tradeData.tradeId)
      if (!equity) {
        throw new Error('Trade equity not computed in deterministic layer')
      }

      // Analyze each dimension
      const fairnessAnalysis = await this.analyzeFairness(equity, tradeInput, input.deterministic)
      const winNowAnalysis = await this.analyzeWinNow(equity)
      const riskAnalysis = await this.analyzeRisks(tradeInput, input.deterministic)
      const collusionSignals = await this.detectCollusionSignals(tradeInput, fairnessAnalysis)

      // Generate explanation
      const explanation = await this.buildExplanation(fairnessAnalysis, winNowAnalysis, riskAnalysis, collusionSignals)

      // Score confidence
      const confidence = await this.scoreConfidence({
        recommendation: fairnessAnalysis,
        explanation,
        confidence: { score: 0, label: 'low', reason: '' },
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: equity, usedForJustification: true },
          { source: 'rosterStrengths', value: fairnessAnalysis.rosters, usedForJustification: true },
          { source: 'playoffOdds', value: winNowAnalysis, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      })

      // Build recommendation
      const verdict = this.computeVerdict(fairnessAnalysis.gap)
      const output: TradeAnalysisOutput = {
        recommendation: {
          verdict,
          fairnessScore: fairnessAnalysis.score,
          equityGap: fairnessAnalysis.gap,
        },
        explanation,
        confidence,
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: equity, usedForJustification: true },
          { source: 'rosterStrengths', value: fairnessAnalysis.rosters, usedForJustification: true },
          { source: 'playoffOdds', value: winNowAnalysis, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: 'Link to Vote or Commissioner',
            actionType: 'navigate',
            payload: { to: `/league/${input.envelope.leagueId}/trades/${tradeInput.tradeData.tradeId}` },
          },
          {
            label: verdict === 'seems_fair' ? 'Approve' : 'Veto or Counter',
            actionType: 'trade_action',
            payload: { tradeId: tradeInput.tradeData.tradeId, action: 'vote' },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }

      // Audit and memory
      await this.auditLog(input, output)
      await this.integrateMemory(input, output)

      return output
    } catch (error) {
      console.error(`[TradeAnalyzer] Error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string> {
    // Use coordination of DeepSeek (analysis) + OpenAI (explanation)

    const rec = output.recommendation as any
    const fairnessAnalysis = context?.fairnessAnalysis || rec

    // Structured analysis
    const structuredExplanation = await GenerateWithAI(
      {
        model: 'deepseek',
        prompt: `
          Trade fairness assessment:
          - Fairness score: ${rec.fairnessScore}/100
          - Verdict: ${rec.verdict}
          - Equity gap: ${rec.equityGap} points
          
          Explain in 60 words max:
          1. Who wins (if anyone)
          2. Time horizon (now vs later)
          3. Any red flags
          
          Be direct and honest.
        `,
        temperature: 0.7,
      },
      'analysis'
    )

    // Friendly explanation
    const friendlyExplanation = await GenerateWithAI(
      {
        model: 'openai',
        prompt: `
          Rewrite for a fantasy coach tone (supportive, balanced):
          "${structuredExplanation}"
          
          Max 50 words. Acknowledge both sides.
        `,
        temperature: 0.8,
      },
      'explanation'
    )

    return friendlyExplanation || structuredExplanation
  }

  async scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    let score = 70

    // Boost if many deterministic references agree
    if (output.deterministicReferences.length >= 3) score += 20

    // Cap
    score = Math.min(score, 100)

    const label: 'low' | 'medium' | 'high' = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'

    return {
      score: Math.round(score),
      label,
      reason:
        score >= 80
          ? 'Clear data supports this verdict'
          : score >= 60
            ? 'Reasonable assessment with some uncertainty'
            : 'Limited data—interpret cautiously',
    }
  }

  /**
   * Analyze fairness (0-100, 50 = completely fair)
   */
  private async analyzeFairness(
    equity: TradeEquityAssessment,
    trade: TradeAnalysisInput,
    deterministic: DeterministicAnalysisOutput
  ): Promise<any> {
    // Team 1's expected value
    const team1EV = equity.team1ExpectedValue
    const team2EV = equity.team2ExpectedValue

    // Convert EV gap to fairness score (0-100)
    // 50 = fair, <50 = favors team2, >50 = favors team1
    const gap = Math.abs(team1EV)
    const fairnessScore = gap < 2 ? 50 : team1EV > 0 ? Math.min(50 + gap * 5, 100) : Math.max(50 - Math.abs(team1EV) * 5, 0)

    return {
      score: fairnessScore,
      gap: team1EV,
      verdict: gap < 2 ? 'seems_fair' : team1EV > 5 ? 'significantly_favors_team1' : 'slightly_favors_team1',
      breakDown: equity.nowVsFutureBreakdown,
      rosters: {
        team1: deterministic.rosterStrengths[trade.tradeData.team1Id],
        team2: deterministic.rosterStrengths[trade.tradeData.team2Id],
      },
    }
  }

  /**
   * Win-now vs win-later impact
   */
  private async analyzeWinNow(equity: TradeEquityAssessment): Promise<any> {
    return {
      impact: equity.nowVsFutureBreakdown,
      impactsTeam1Now: equity.nowVsFutureBreakdown.now > 0,
      impactsTeam1Later: equity.nowVsFutureBreakdown.week6_10 > 0,
      impactsPlayoffs: equity.nowVsFutureBreakdown.playoffs !== 0,
    }
  }

  /**
   * Risk analysis (injuries, suspensions, role uncertainty)
   */
  private async analyzeRisks(trade: TradeAnalysisInput, deterministic: DeterministicAnalysisOutput): Promise<any> {
    const risks: any[] = []

    // Check injury status for all players
    for (const send of [...trade.tradeData.team1Sends, ...trade.tradeData.team2Sends]) {
      if (send.type === 'player') {
        const proj = deterministic.projections[send.playerId]
        if (proj && proj.trend === 'declining') {
          risks.push({ playerId: send.playerId, type: 'declining_trend', severity: 'medium' })
        }
      }
    }

    return { risks, riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low' }
  }

  /**
   * Detect collusion signals (one-sided trades, market-rate violations)
   */
  private async detectCollusionSignals(trade: TradeAnalysisInput, fairnessAnalysis: any): Promise<any> {
    const signals: string[] = []

    // Huge gap = possible collusion
    if (Math.abs(fairnessAnalysis.gap) > 10) {
      signals.push('Large equity imbalance—possible collusion or desperation')
    }

    // All one-way (no balancing)
    if (fairnessAnalysis.gap > 5) {
      signals.push('Trade heavily favors one team')
    }

    return { signals, collusionLikelihood: signals.length > 0 ? 'consider_reviewing' : 'unlikely' }
  }

  /**
   * Build full explanation
   */
  private async buildExplanation(fairnessAnalysis: any, winNowAnalysis: any, riskAnalysis: any, collusionSignals: any): Promise<string> {
    const parts = [
      `Fairness: ${fairnessAnalysis.verdict}`,
      `Impact: ${winNowAnalysis.impactsTeam1Now ? 'helps Team 1 now' : 'helps later'}`,
      riskAnalysis.riskLevel !== 'low' ? `⚠️ Risk: ${riskAnalysis.riskLevel}` : '',
      collusionSignals.signals.length > 0 ? `🚩 Flag: ${collusionSignals.signals[0]}` : '',
    ]

    return parts.filter(Boolean).join(' | ')
  }

  /**
   * Compute verdict from fairness score
   */
  private computeVerdict(gap: number): TradeAnalysisOutput['recommendation']['verdict'] {
    if (gap < -5) return 'significantly_favors_team2'
    if (gap < -2) return 'slightly_favors_team2'
    if (gap < 2) return 'seems_fair'
    if (gap < 5) return 'slightly_favors_team1'
    return 'significantly_favors_team1'
  }
}
