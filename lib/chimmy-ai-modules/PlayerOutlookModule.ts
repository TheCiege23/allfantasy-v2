/**
 * Player Outlook Module — Chimmy Brain AI #16
 *
 * Produces player outlook cards via the player-outlook service.
 * Combines deterministic scoring with optional AI narrative.
 */

import type { ModuleConfig, ModuleInput, StandardizedModuleOutput } from './ChimmyModuleInterface'
import { BaseChimmyModule } from './ChimmyModuleInterface'
import { getPlayerOutlook, type PlayerOutlook } from '@/lib/player-outlook'

export class PlayerOutlookModule extends BaseChimmyModule {
  config: ModuleConfig = {
    name: 'player-outlook',
    version: '1.0.0',
    enabled: true,
    preferredModel: 'deepseek',
    fallbackModels: ['openai'],
    minimumConfidenceThreshold: 30,
    requireDeterministicGrounding: true,
    auditLoggingEnabled: true,
    memoryIntegrationEnabled: false,
    maxExecutionTimeMs: 5000,
  }

  async validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    const playerName = input.context?.playerName
    const playerId = input.context?.playerId

    if (!playerName && !playerId) {
      errors.push('Either playerName or playerId is required in context')
    }

    return { valid: errors.length === 0, errors }
  }

  async execute(input: ModuleInput): Promise<StandardizedModuleOutput> {
    const executionStart = Date.now()
    const auditId = crypto.randomUUID()

    try {
      const validation = await this.validate(input)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      const playerName = input.context?.playerName ?? ''
      const sport = input.context?.sport ?? input.envelope.sport ?? 'NFL'

      // Call the player outlook service
      const outlook: PlayerOutlook = await getPlayerOutlook({
        playerName,
        sport,
        includeNarrative: true,
      })

      const latency = Date.now() - executionStart

      // Build explanation
      const explanation = outlook.narrative
        ?? `${outlook.outlookSummary} ${outlook.trend === 'buy' ? outlook.bullishCase : outlook.trend === 'sell' ? outlook.bearishCase : ''}`

      // Build deterministic references
      const deterministicReferences: StandardizedModuleOutput['deterministicReferences'] = []

      if (outlook.currentValue > 0) {
        deterministicReferences.push({
          source: 'fantasycalc_value',
          value: outlook.currentValue,
          usedForJustification: true,
        })
      }
      deterministicReferences.push({
        source: 'ros_tier',
        value: outlook.restOfSeasonTier,
        usedForJustification: true,
      })
      deterministicReferences.push({
        source: 'dynasty_tier',
        value: outlook.dynastyTier,
        usedForJustification: true,
      })
      if (outlook.riskFlags.length > 0) {
        deterministicReferences.push({
          source: 'risk_flags',
          value: outlook.riskFlags,
          usedForJustification: true,
        })
      }

      const confLabel = outlook.confidencePct >= 70 ? 'high'
        : outlook.confidencePct >= 40 ? 'medium'
        : 'low'

      return {
        recommendation: outlook,
        explanation,
        confidence: {
          score: outlook.confidencePct,
          label: confLabel as 'high' | 'medium' | 'low',
          reason: `Based on ${outlook.sourcesUsed.join(', ')} (${outlook.dataCompleteness}% data completeness)`,
        },
        groundedInDeterministic: true,
        deterministicReferences,
        modelUsed: outlook.narrative ? 'deepseek' : 'openai',
        tokensUsed: outlook.narrative ? 300 : 0,
        latency,
        actions: [
          {
            label: 'View Full Outlook',
            actionType: 'view_player_outlook',
            payload: { playerName, sport },
          },
        ],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }
    } catch (err: any) {
      const latency = Date.now() - executionStart
      return {
        recommendation: {},
        explanation: `Failed to generate outlook: ${err?.message || 'Unknown error'}`,
        confidence: { score: 0, label: 'low', reason: err?.message ?? 'Error' },
        groundedInDeterministic: false,
        deterministicReferences: [],
        modelUsed: 'openai',
        tokensUsed: 0,
        latency,
        actions: [],
        moduleName: this.config.name,
        timestamp: new Date(),
        auditId,
      }
    }
  }

  async explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string> {
    const outlook = output.recommendation as PlayerOutlook | null
    if (!outlook) {
      return output.explanation
    }

    const playerName = context?.playerName ?? outlook.playerName ?? 'This player'
    const trendLabel = outlook.trend === 'buy'
      ? 'trending up'
      : outlook.trend === 'sell'
        ? 'trending down'
        : 'holding steady'

    return `${playerName} is ${trendLabel}. ${output.explanation}`.trim()
  }

  async scoreConfidence(
    output: StandardizedModuleOutput
  ): Promise<{ score: number; label: 'low' | 'medium' | 'high'; reason: string }> {
    const score = Math.max(0, Math.min(100, Math.round(output.confidence.score)))
    const label: 'low' | 'medium' | 'high' =
      score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'

    return {
      score,
      label,
      reason: output.confidence.reason || 'Confidence derived from player outlook coverage and source quality.',
    }
  }
}
