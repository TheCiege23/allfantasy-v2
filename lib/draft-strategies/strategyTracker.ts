/**
 * Strategy Execution Tracking & Reporting
 * Logs which strategies were assigned to teams, tracks how they execute, and generates post-draft analysis.
 */

import { DraftStrategy } from './strategyDefinitions'

export interface PickLog {
  overall: number
  round: number
  slot: number
  playerName: string
  position: string
  playerId?: string
  team?: string
  byeWeek?: number
  source: string
  adaptationTriggered?: string
  reasonForPick?: string
}

export interface StrategyExecutionLog {
  draftId: string
  teamId: string
  rosterId: string
  displayName: string
  strategy: DraftStrategy
  assignedAt: string
  picks: PickLog[]
  finalStats: {
    totalPicks: number
    positionCounts: Record<string, number>
    adaptationsTriggered: Array<{ round: number; name: string }>
    adherenceScore: number // 0-100: how closely followed strategy
    strategicConsistency: number // 0-100: how consistent with core strategy
  }
}

// In-memory store for draft strategy logs (in production, use database)
const strategyLogs = new Map<string, Map<string, StrategyExecutionLog>>()

/**
 * Initialize strategy tracking for a draft
 */
export function initializeDraftStrategyTracking(draftId: string): void {
  if (!strategyLogs.has(draftId)) {
    strategyLogs.set(draftId, new Map())
  }
}

/**
 * Create initial log entry for a team with assigned strategy
 */
export function createStrategyLog(
  draftId: string,
  teamId: string,
  rosterId: string,
  displayName: string,
  strategy: DraftStrategy
): void {
  if (!strategyLogs.has(draftId)) {
    initializeDraftStrategyTracking(draftId)
  }

  const draftLogs = strategyLogs.get(draftId)!
  draftLogs.set(teamId, {
    draftId,
    teamId,
    rosterId,
    displayName,
    strategy,
    assignedAt: new Date().toISOString(),
    picks: [],
    finalStats: {
      totalPicks: 0,
      positionCounts: {},
      adaptationsTriggered: [],
      adherenceScore: 100,
      strategicConsistency: 100,
    },
  })
}

/**
 * Log a pick for a team's strategy execution
 */
export function logStrategyPick(
  draftId: string,
  teamId: string,
  pick: PickLog,
  adaptationName?: string
): void {
  const draftLogs = strategyLogs.get(draftId)
  if (!draftLogs) return

  const log = draftLogs.get(teamId)
  if (!log) return

  const pickWithAdaptation: PickLog = {
    ...pick,
    adaptationTriggered: adaptationName,
  }

  log.picks.push(pickWithAdaptation)
  log.finalStats.totalPicks = log.picks.length

  // Update position counts
  if (!log.finalStats.positionCounts[pick.position]) {
    log.finalStats.positionCounts[pick.position] = 0
  }
  log.finalStats.positionCounts[pick.position]++

  // Track adaptations
  if (adaptationName) {
    const existingAdaptation = log.finalStats.adaptationsTriggered.find(
      (a) => a.name === adaptationName && a.round === pick.round
    )
    if (!existingAdaptation) {
      log.finalStats.adaptationsTriggered.push({
        round: pick.round,
        name: adaptationName,
      })
    }
  }
}

/**
 * Record adaptation trigger for a team
 */
export function recordAdaptationTrigger(
  draftId: string,
  teamId: string,
  round: number,
  adaptationName: string
): void {
  const draftLogs = strategyLogs.get(draftId)
  if (!draftLogs) return

  const log = draftLogs.get(teamId)
  if (!log) return

  const exists = log.finalStats.adaptationsTriggered.some(
    (a) => a.round === round && a.name === adaptationName
  )

  if (!exists) {
    log.finalStats.adaptationsTriggered.push({ round, name: adaptationName })
  }
}

/**
 * Calculate adherence score (how closely team followed its strategy)
 * Based on: position distribution matching strategy focus, adaptation appropriateness
 */
export function calculateAdherenceScore(log: StrategyExecutionLog): number {
  const strategy = log.strategy
  const positionCounts = log.finalStats.positionCounts

  // Strategy focus validation
  const primaryFocusMatches = strategy.primaryFocus.filter((focus) => {
    if (focus === 'BPA') return true // Always achievable
    if (focus === 'Elite Talent') return (positionCounts['QB'] ?? 0) > 0
    if (focus === 'Elite RB' || focus === 'Hero RB') return (positionCounts['RB'] ?? 0) >= 2
    if (focus === 'Zero-RB' || focus === 'WR Stack') return (positionCounts['WR'] ?? 0) >= 3
    if (focus === 'TE Priority') return (positionCounts['TE'] ?? 0) >= 1
    if (focus === 'Proven Veterans') return log.picks.filter((p) => p.overall < 100).length >= 4
    if (focus === 'Youth') return (positionCounts['QB'] ?? 0) + (positionCounts['WR'] ?? 0) > 4
    return false
  }).length

  const focusScore = (primaryFocusMatches / Math.max(1, strategy.primaryFocus.length)) * 100

  // Adaptation appropriateness (if team adapted, was it reasonable?)
  const adaptationCount = log.finalStats.adaptationsTriggered.length
  const appropriateAdaptations = Math.min(adaptationCount, 2) // Should have 0-2 adaptations typically

  // Combine scores
  const score = (focusScore * 0.7 + (100 - Math.abs(appropriateAdaptations - 1) * 20) * 0.3) | 0

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate strategy consistency (variance in picks vs strategy tendency)
 * 100 = perfectly consistent, 0 = completely random
 */
export function calculateStrategicConsistency(log: StrategyExecutionLog): number {
  const strategy = log.strategy
  const picks = log.picks

  if (picks.length === 0) return 100

  // Check if picks align with risk level
  let riskMatches = 0

  if (strategy.riskLevel === 'conservative') {
    // Should pick proven players (early ADP)
    riskMatches = picks.filter((p) => parseInt(p.overall) <= 150).length
  } else if (strategy.riskLevel === 'moderate') {
    // Mixed approach
    riskMatches = picks.filter((p) => parseInt(p.overall) <= 250).length
  } else {
    // Aggressive - can be anywhere
    riskMatches = picks.length // All picks are "consistent"
  }

  const consistency = (riskMatches / picks.length) * 100

  return Math.round(consistency)
}

/**
 * Finalize strategy execution log with calculated scores
 */
export function finalizeStrategyLog(draftId: string, teamId: string): StrategyExecutionLog | undefined {
  const draftLogs = strategyLogs.get(draftId)
  if (!draftLogs) return

  const log = draftLogs.get(teamId)
  if (!log) return

  log.finalStats.adherenceScore = calculateAdherenceScore(log)
  log.finalStats.strategicConsistency = calculateStrategicConsistency(log)

  return log
}

/**
 * Get all strategy logs for a draft (for post-draft analysis)
 */
export function getStrategyExecutionReport(draftId: string): StrategyExecutionLog[] {
  const draftLogs = strategyLogs.get(draftId)
  if (!draftLogs) return []

  const logs = Array.from(draftLogs.values())

  // Finalize any remaining logs
  for (const log of logs) {
    if (log.finalStats.adherenceScore === 100 && log.picks.length > 0) {
      // Has picks but hasn't been finalized yet
      finalizeStrategyLog(draftId, log.teamId)
    }
  }

  return logs
}

/**
 * Generate human-readable strategy report
 */
export function generateStrategyReport(logs: StrategyExecutionLog[]): string {
  let report = 'DRAFT SUMMARY - STRATEGY ANALYSIS\n'
  report += '='.repeat(50) + '\n\n'

  for (const log of logs) {
    report += `${log.displayName} | ${log.strategy.name}\n`
    report += '-'.repeat(50) + '\n'
    report += `Strategy: ${log.strategy.description}\n`
    report += `Risk Level: ${log.strategy.riskLevel.toUpperCase()}\n`
    report += `Focus Areas: ${log.strategy.primaryFocus.join(', ')}\n\n`

    report += `Picks: ${log.finalStats.totalPicks}\n`
    report += `Positions: ${Object.entries(log.finalStats.positionCounts)
      .map(([pos, count]) => `${pos}: ${count}`)
      .join(', ')}\n`

    if (log.finalStats.adaptationsTriggered.length > 0) {
      report += `Adaptations Triggered:\n`
      for (const adapt of log.finalStats.adaptationsTriggered) {
        report += `  - Round ${adapt.round}: ${adapt.name}\n`
      }
    } else {
      report += `Adaptations: None (stayed true to core strategy)\n`
    }

    report += `Strategy Adherence: ${log.finalStats.adherenceScore}%\n`
    report += `Strategic Consistency: ${log.finalStats.strategicConsistency}%\n\n`
  }

  return report
}

/**
 * Clear logs for testing
 */
export function clearStrategyLogs(draftId?: string): void {
  if (draftId) {
    strategyLogs.delete(draftId)
  } else {
    strategyLogs.clear()
  }
}

/**
 * Export strategy data for external analysis
 */
export function exportStrategyData(draftId: string): object {
  const logs = getStrategyExecutionReport(draftId)
  return {
    draftId,
    exportedAt: new Date().toISOString(),
    teams: logs.map((log) => ({
      teamId: log.teamId,
      displayName: log.displayName,
      strategy: {
        id: log.strategy.id,
        name: log.strategy.name,
        riskLevel: log.strategy.riskLevel,
      },
      stats: log.finalStats,
      pickCount: log.picks.length,
    })),
  }
}
