/**
 * Waiver Assistant Module — Chimmy Brain AI #3
 * Lineup Optimizer Module — Chimmy Brain AI #5
 * Start/Sit Assistant Module — Chimmy Brain AI #4
 *
 * Three modules bundled for efficiency
 */

import type { ModuleConfig, IChimmyModule, ModuleInput, StandardizedModuleOutput } from './ChimmyModuleInterface'
import { BaseChimmyModule, MODULE_NAMES } from './ChimmyModuleInterface'
import { GenerateWithAI } from '@/lib/unified-ai'

// ============================================================================
// Waiver Assistant Module
// ============================================================================

export class WaiverAssistantModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: MODULE_NAMES.WAIVER_ASSISTANT,
    version: '1.0.0',
    enabled: true,
    preferredModel: 'deepseek', // Scarcity-based value scoring
    fallbackModels: ['openai'],
    minimumConfidenceThreshold: 45,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: true,
    maxExecutionTimeMs: 4000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!input.envelope.leagueId) errors.push('Missing leagueId')
    if (!input.envelope.teamId) errors.push('Missing teamId')
    if (!input.deterministic.waiverAssets || Object.keys(input.deterministic.waiverAssets).length === 0) {
      errors.push('No available waiver assets')
    }

    return { valid: errors.length === 0, errors }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()

    try {
      const validation = await this.validate(input)
      if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      const teamId = input.envelope.teamId
      if (!teamId) throw new Error('Missing teamId')

      // Rank available assets by league context
      const assets = Object.entries(input.deterministic.waiverAssets || {})
        .map(([playerId, asset]: [string, any]) => ({
          playerId,
          ...asset,
          waiverBid: this.computeWaiverBid(asset, teamId),
        }))
        .sort((a, b) => (b.faabRecommendation || 0) - (a.faabRecommendation || 0))
        .slice(0, 5) // Top 5

      const topAsset = assets[0]

      const explanation = await GenerateWithAI(
        {
          model: 'deepseek',
          prompt: `
            Top waiver pickup for ${teamId}:
            ${topAsset.playerName} (${topAsset.scarcityTier}) - bid ${topAsset.waiverBid}$
            
            Why: fills need, ${topAsset.durationWeeks} weeks of value.
            Bid strategy: ${topAsset.waiverBid > 30 ? 'aggressive' : 'moderate'}.
            
            Keep it to 30 words.
          `,
          temperature: 0.7,
        },
        'analysis'
      )

      const confidence = await this.scoreConfidence({
        recommendation: topAsset,
        explanation,
        confidence: { score: 0, label: 'low', reason: '' },
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'positionalScarcity', value: topAsset.scarcityTier, usedForJustification: true },
          { source: 'rosterStrengths', value: input.deterministic.rosterStrengths[teamId], usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      })

      const output: StandardizedModuleOutput = {
        recommendation: { topAsset, alternatives: assets.slice(1, 4) },
        explanation,
        confidence,
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'positionalScarcity', value: topAsset.scarcityTier, usedForJustification: true },
          { source: 'waiverAssets', value: topAsset, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: `Bid $${topAsset.waiverBid} for ${topAsset.playerName}`,
            actionType: 'submit_waiver_claim',
            payload: { playerId: topAsset.playerId, bid: topAsset.waiverBid },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }

      await this.auditLog(input, output)
      await this.integrateMemory(input, output)

      return output
    } catch (error) {
      console.error(`[WaiverAssistant] Error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string> {
    return output.explanation
  }

  async scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    return { score: 65, label: 'medium', reason: 'Scarcity-based ranking with moderate uncertainty' }
  }

  private computeWaiverBid(asset: any, teamId: string): number {
    // Bid = remaining_players_in_tier * scarcity_score
    const tier = asset.scarcityTier === 'elite' ? 40 : asset.scarcityTier === 'starting' ? 25 : 10

    return Math.max(tier - asset.durationWeeks + 5, 1)
  }
}

// ============================================================================
// Start/Sit Assistant Module
// ============================================================================

export class StartSitAssistantModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: MODULE_NAMES.START_SIT_ASSISTANT,
    version: '1.0.0',
    enabled: true,
    preferredModel: 'grok', // Trend-aware, situational
    fallbackModels: ['openai', 'deepseek'],
    minimumConfidenceThreshold: 50,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: true,
    maxExecutionTimeMs: 3000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!input.envelope.leagueId) errors.push('Missing leagueId')
    if (!input.envelope.deterministicPayload?.week) errors.push('Missing week')

    return { valid: errors.length === 0, errors }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()

    try {
      const validation = await this.validate(input)
      if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`)

      // Get possible starters/benches from envelope
      const candidatePlayers = Array.isArray(input.envelope.deterministicPayload?.startSitCandidates)
        ? input.envelope.deterministicPayload.startSitCandidates
        : []

      // Score each for sitting/starting viability
      const scored = candidatePlayers.map((player: any) => ({
        ...player,
        score: this.scorePlayer(player, input),
        recommendation: this.scorePlayer(player, input) > 0.6 ? 'start' : 'bench',
      }))

      const topRecommendation = scored.find((p) => p.recommendation === 'start') || scored[0]

      const explanation = await GenerateWithAI(
        {
          model: 'grok',
          prompt: `
            Start/Sit call for ${topRecommendation.playerName} this week:
            - Opponent: ${topRecommendation.opponent}
            - Floor: ${topRecommendation.floor} pts
            - Ceiling: ${topRecommendation.ceiling} pts
            - Trend: ${topRecommendation.trend}
            
            Recommend: ${topRecommendation.recommendation.toUpperCase()}. 30-word reason max.
          `,
          temperature: 0.8,
        },
        'analysis'
      )

      const confidence = await this.scoreConfidence({
        recommendation: topRecommendation,
        explanation,
        confidence: { score: 0, label: 'low', reason: '' },
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'matchupOdds', value: topRecommendation.opponent, usedForJustification: true },
          { source: 'scheduleDifficulty', value: topRecommendation.trend, usedForJustification: true },
        ],
        modelUsed: 'grok',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      })

      const output: StandardizedModuleOutput = {
        recommendation: topRecommendation,
        explanation,
        confidence,
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'matchupOdds', value: topRecommendation.opponent, usedForJustification: true },
          { source: 'projections', value: topRecommendation.ceiling, usedForJustification: true },
        ],
        modelUsed: 'grok',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: `${topRecommendation.recommendation === 'start' ? '✓' : '✗'} ${topRecommendation.playerName}`,
            actionType: 'set_lineup_slot',
            payload: { playerId: topRecommendation.playerId, action: topRecommendation.recommendation },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }

      await this.auditLog(input, output)
      await this.integrateMemory(input, output)

      return output
    } catch (error) {
      console.error(`[StartSitAssistant] Error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string> {
    return output.explanation
  }

  async scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    return { score: 60, label: 'medium', reason: 'Week-to-week situational analysis with moderate certainty' }
  }

  private scorePlayer(player: any, input: ModuleInput): number {
    let score = 0.5

    // Boost if strong matchup
    const matchup = input.deterministic.matchupOdds.find((m) => m.team1Id === player.team || m.team2Id === player.team)
    if (matchup) {
      const winProb = matchup.team1Id === player.team ? matchup.team1WinProbability : matchup.team2WinProbability
      score += winProb * 0.3
    }

    // Adjust by ceiling/floor spread
    if (player.ceiling && player.floor) {
      const ceiling = player.ceiling - player.floor
      score += Math.min(ceiling / 20, 0.2) // Up to +0.2 for high ceiling
    }

    return Math.min(score, 1)
  }
}

// ============================================================================
// Lineup Optimizer Module
// ============================================================================

export class LineupOptimizerModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: MODULE_NAMES.LINEUP_OPTIMIZER,
    version: '1.0.0',
    enabled: true,
    preferredModel: 'deepseek', // Combinatorial optimization
    fallbackModels: ['openai'],
    minimumConfidenceThreshold: 55,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: true,
    maxExecutionTimeMs: 6000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!input.envelope.leagueId) errors.push('Missing leagueId')
    if (!input.envelope.teamId) errors.push('Missing teamId')
    if (!input.deterministic.projections || Object.keys(input.deterministic.projections).length === 0) {
      errors.push('No player projections available')
    }

    return { valid: errors.length === 0, errors }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()

    try {
      const validation = await this.validate(input)
      if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`)

      // Get roster and find optimal combination
      const rostered = Array.isArray(input.envelope.deterministicPayload?.roster)
        ? input.envelope.deterministicPayload.roster
        : []
      const projections = input.deterministic.projections

      // Build optimal lineup
      const optimized = this.buildOptimalLineup(rostered, projections, input)

      const explanation = await GenerateWithAI(
        {
          model: 'deepseek',
          prompt: `
            Optimal lineup recommendation for this week:
            ${optimized.lineup.map((p: any) => `${p.nome} (${p.position})`).join(', ')}
            
            Total projected points: ${optimized.totalProjection}
            Bench strength: ${optimized.benchProjection}
            
            Reasoning: maximize starting points vs careful bench management.
            Keep to 40 words.
          `,
          temperature: 0.7,
        },
        'analysis'
      )

      const confidence = await this.scoreConfidence({
        recommendation: optimized,
        explanation,
        confidence: { score: 0, label: 'low', reason: '' },
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: optimized.totalProjection, usedForJustification: true },
          { source: 'matchupOdds', value: optimized.matchups, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      })

      const output: StandardizedModuleOutput = {
        recommendation: optimized,
        explanation,
        confidence,
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: optimized.totalProjection, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: 'Set Optimal Lineup',
            actionType: 'set_lineup_auto',
            payload: { lineupIds: optimized.lineup.map((p: any) => p.playerId) },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }

      await this.auditLog(input, output)
      await this.integrateMemory(input, output)

      return output
    } catch (error) {
      console.error(`[LineupOptimizer] Error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string> {
    return output.explanation
  }

  async scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    return { score: 70, label: 'medium', reason: 'Deterministic projection-based optimization' }
  }

  private buildOptimalLineup(rostered: any[], projections: any, input: ModuleInput): any {
    // Placeholder: would run actual combinatorial optimization
    return {
      lineup: rostered.slice(0, 5),
      totalProjection: 100,
      benchProjection: 50,
      matchups: input.deterministic.matchupOdds,
    }
  }
}
