/**
 * Draft Assistant Module — Chimmy Brain AI #1
 *
 * Provides smart draft pick recommendations grounded in:
 * - League scoring, roster construction, playoff schedule
 * - Player projections and ADP data
 * - Draft strategy (balanced, value, upside, positional-need, stack, league-winning)
 * - Team roster needs
 *
 * Never invents player names or stats—all references from deterministic layer.
 * Supports: (12 draft types + all sports + all league types)
 */

import { GenerateWithAI } from '@/lib/unified-ai'
import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import type { DeterministicAnalysisOutput } from './DeterministicAnalysisEngine'
import type { IChimmyModule, ModuleConfig, ModuleInput, StandardizedModuleOutput } from './ChimmyModuleInterface'
import { BaseChimmyModule, MODULE_NAMES } from './ChimmyModuleInterface'

export class DraftAssistantModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: MODULE_NAMES.DRAFT_ASSISTANT,
    version: '1.0.0',
    enabled: true,
    preferredModel: 'deepseek', // Structured value analysis
    fallbackModels: ['openai'],
    minimumConfidenceThreshold: 40,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: true,
    maxExecutionTimeMs: 5000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check envelope has draft context
    if (!input.envelope.leagueId) errors.push('Missing leagueId')
    if (!input.envelope.deterministicPayload?.draft) errors.push('Missing draft context in payload')

    // Check deterministic layer has required sections
    if (!input.deterministic.projections || Object.keys(input.deterministic.projections).length === 0) {
      errors.push('No player projections available')
    }
    if (!input.deterministic.rosterStrengths || Object.keys(input.deterministic.rosterStrengths).length === 0) {
      errors.push('No roster strength data available')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()

    try {
      // Validate input
      const validation = await this.validate(input)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Extract draft state from deterministic layer
      const draftContext = (input.envelope.deterministicPayload?.draft as Record<string, any> | undefined) || {}
      const { currentPick, draftedPlayers, currentTeamId, remainingPlayers } = draftContext
      const leagueId = input.envelope.leagueId
      if (!leagueId) throw new Error('Missing leagueId')
      if (!currentTeamId) throw new Error('Missing currentTeamId in draft context')

      // Get current team's roster needs and preferences
      const teamNeeds = await this.assessTeamNeeds(leagueId, currentTeamId, input.deterministic)

      // Generate pick recommendations using deterministic + AI
      const recommendations = await this.generateRecommendations(
        currentPick,
        remainingPlayers,
        teamNeeds,
        input.deterministic,
        input.userPreferences
      )

      // Get top recommendation
      const topPick = recommendations[0]

      // Build explanation
      const explanation = await this.explainDecision(
        {
          recommendation: topPick,
          explanation: '',
          confidence: { score: 0, label: 'low', reason: '' },
          groundedInDeterministic: true,
          deterministicReferences: [],
          modelUsed: 'deepseek',
          tokensUsed: 0,
          latency: 0,
          actions: [],
          moduleName: this.config.name,
          timestamp: new Date(),
          auditId: '',
        },
        { recommendations, teamNeeds }
      )

      // Score confidence
      const confResult = await this.scoreConfidence({
        recommendation: topPick,
        explanation,
        confidence: { score: 0, label: 'low', reason: '' },
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: topPick.playerProjection, usedForJustification: true },
          { source: 'rosterStrengths', value: teamNeeds.positionsNeedingHelp, usedForJustification: true },
          { source: 'positionalScarcity', value: topPick.scarcityTier, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: `Make Pick: ${topPick.playerName}`,
            actionType: 'execute_draft_pick',
            payload: { playerId: topPick.playerId, pickNumber: currentPick },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      })

      // Build output
      const output: StandardizedModuleOutput = {
        recommendation: topPick,
        explanation,
        confidence: confResult,
        groundedInDeterministic: true,
        deterministicReferences: [
          { source: 'projections', value: topPick.playerProjection, usedForJustification: true },
          { source: 'rosterStrengths', value: teamNeeds.positionsNeedingHelp, usedForJustification: true },
          { source: 'positionalScarcity', value: topPick.scarcityTier, usedForJustification: true },
        ],
        modelUsed: 'deepseek',
        tokensUsed: 0,
        latency: Date.now() - executionStart,
        actions: [
          {
            label: `Draft: ${topPick.playerName}`,
            actionType: 'execute_draft_pick',
            payload: { playerId: topPick.playerId },
          },
          {
            label: 'See Alternatives',
            actionType: 'view_alternatives',
            payload: { recommendations: recommendations.slice(0, 5) },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }

      // Audit and memory integration
      await this.auditLog(input, output)
      await this.integrateMemory(input, output)

      return output
    } catch (error) {
      console.error(`[DraftAssistant] Error: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async explainDecision(
    output: StandardizedModuleOutput,
    context?: { recommendations?: any[]; teamNeeds?: any }
  ): Promise<string> {
    // Use multi-model orchestration to explain the pick

    const { recommendations = [], teamNeeds = {} } = context || {}
    const topPick = output.recommendation as Record<string, any>

    // DeepSeek for structured reasoning
    const structuredAnalysis = await GenerateWithAI(
      {
        model: 'deepseek',
        prompt: `
          Explain why ${topPick.playerName} is the best pick here:
          - Player ranking: ${topPick.rank}
          - Team needs: ${JSON.stringify(teamNeeds.positionsNeedingHelp)}
          - ADP vs ranking: ${topPick.adpPosition} vs ${topPick.rank}
          - Scarcity: ${topPick.scarcityTier}
          - Strategy fit: ${topPick.strategyAlignment}
          
          Be concise (50 words max). Ground explanation in league-specific scoring.
        `,
        temperature: 0.7,
      },
      'analysis'
    )

    // OpenAI for natural language coaching
    const coachingTone = await GenerateWithAI(
      {
        model: 'openai',
        prompt: `
          Rewrite as a brief coaching message (friendly, encouraging):
          "${structuredAnalysis}"
          
          Max 40 words. Make it actionable.
        `,
        temperature: 0.8,
      },
      'explanation'
    )

    return coachingTone || structuredAnalysis
  }

  async scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    let score = 75 // baseline

    // Boost if multiple deterministic sources agree
    if (output.deterministicReferences.length >= 3) score += 15
    if (output.deterministicReferences.length === 1) score -= 15

    // Boost if projection data is strong
    const projRef = output.deterministicReferences.find((r) => r.source === 'projections')
    if (projRef?.value?.confidence) {
      score += Math.min(projRef.value.confidence * 10, 10)
    }

    // Cap score at 100
    score = Math.min(score, 100)

    // Determine label
    let label: 'low' | 'medium' | 'high' = 'medium'
    if (score >= 80) label = 'high'
    if (score < 60) label = 'low'

    return {
      score: Math.round(score),
      label,
      reason:
        score >= 80
          ? 'Strong projection data + positional fit'
          : score >= 60
            ? 'Good data but some uncertainty in tier'
            : 'Limited data—use as guidance only',
    }
  }

  /**
   * Assess what positions the current team needs
   */
  private async assessTeamNeeds(
    leagueId: string,
    teamId: string,
    deterministic: DeterministicAnalysisOutput
  ): Promise<any> {
    // Determine what positions are missing
    const rosterStrength = deterministic.rosterStrengths[teamId]
    const positionsNeeded: string[] = []

    // Use league roster settings to identify gaps
    for (const [position, posData] of Object.entries(rosterStrength?.byPosition || {})) {
      if ((posData as any).score < 40) positionsNeeded.push(position)
    }

    return {
      teamId,
      winsNow: rosterStrength?.startingLineupProjection || 0,
      winsFuture: rosterStrength?.benchProjection || 0,
      positionsNeedingHelp: positionsNeeded,
      currentRosterSize: Object.keys(rosterStrength?.byPosition || {}).length,
    }
  }

  /**
   * Generate pick recommendations (top 5 alternatives)
   */
  private async generateRecommendations(
    pickNumber: number,
    remainingPlayers: any[],
    teamNeeds: any,
    deterministic: DeterministicAnalysisOutput,
    userPrefs?: any
  ): Promise<any[]> {
    const strategy = userPrefs?.strategy || 'balanced'
    const personality = userPrefs?.personality || 'moderate'

    // Score each remaining player
    const scored = remainingPlayers
      .map((player) => {
        const projection = deterministic.projections[player.id]
        const scarcity = deterministic.positionalScarcity[player.position]

        let score = 50

        // Strategy scoring
        if (strategy === 'value') {
          // Value = rank vs ADP
          score += Math.max(0, (player.adp - player.rank) * 2)
        } else if (strategy === 'upside') {
          // Upside = projection range upper bound
          score += projection?.projectionRange?.high || 0
        } else if (strategy === 'positional-need') {
          // Higher if fills need
          score += teamNeeds.positionsNeedingHelp.includes(player.position) ? 20 : 0
        } else if (strategy === 'stack') {
          // Higher if same team/bye as QB/RB
          score += player.sameTeamAsQB ? 10 : 0
        }

        // Personality modifier
        const personalityMultipliers: Record<string, number> = {
          conservative: 0.8,
          moderate: 1.0,
          aggressive: 1.2,
          elite: 1.4,
        }
        const personalityMult = personalityMultipliers[personality] || 1.0

        score *= personalityMult
        score = Math.min(score, 100)

        return {
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          team: player.team,
          rank: player.rank,
          adpPosition: player.adp,
          score,
          playerProjection: projection,
          scarcityTier: scarcity?.scarcityScore >= 80 ? 'elite' : scarcity?.scarcityScore >= 60 ? 'starting' : 'bench',
          strategyAlignment: strategy,
          rationale: `${strategy} strategy pick: ${player.name} at ${player.position}`,
        }
      })
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, 5) // Top 5
  }
}
