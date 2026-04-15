/**
 * AIAssistantEngine.ts
 * AI-powered recommendations, scoring, and strategy logic
 */

import {
  AIStrategy,
  AIPersonality,
  AIRecommendation,
  UnifiedDraftConfig,
  DraftExecutionState,
  DraftPick,
} from './DraftEngineTypes';

interface PlayerAnalysis {
  playerId: string;
  rank: number;
  adp: number; // Average Draft Position
  valueScore: number; // 0-100
  positionalNeed: number; // 0-100 based on team's roster gaps
  stackScore: number; // 0-100 for stacking correlation
  riskScore: number; // 0-100 injury/uncertainty risk
  upsideScore: number; // 0-100 breakout potential
}

export class AIAssistantEngine {
  /**
   * Generate AI recommendations for next pick
   */
  static recommendNextPicks(
    config: UnifiedDraftConfig,
    state: DraftExecutionState,
    teamId: string,
    playerPool: PlayerAnalysis[],
    count: number = 5,
  ): AIRecommendation[] {
    if (!config.aiAssistant?.enabled || !playerPool.length) {
      return [];
    }

    const strategy = config.aiAssistant.strategy;
    const personality = config.aiAssistant.personality;

    // Get available players (not yet drafted)
    const draftedPlayerIds = new Set(state.picks.map(p => p.playerId));
    const availablePlayers = playerPool.filter(p => !draftedPlayerIds.has(p.playerId));

    if (!availablePlayers.length) {
      return [];
    }

    // Get team's roster analysis
    const teamPicks = state.picks.filter(p => p.teamId === teamId);
    const rosterAnalysis = this.analyzeTeamRoster(teamPicks, playerPool);

    // Score players based on strategy
    const scoredPlayers = availablePlayers.map(player => ({
      player,
      score: this.scorePlayer(player, strategy, personality, rosterAnalysis),
    }));

    // Sort by score descending
    scoredPlayers.sort((a, b) => b.score - a.score);

    // Return top recommendations
    return scoredPlayers.slice(0, count).map((item, idx) => ({
      playerId: item.player.playerId,
      playerName: `Player-${item.player.playerId}`, // TODO: Get from player data
      playerPosition: 'TBD', // TODO: Get from player data
      rank: idx + 1,
      score: item.score,
      rationale: this.generateRationale(item.player, strategy, rosterAnalysis),
      considerationFactors: {
        positionNeeds: [],
        valueEstimate: `${Math.round(item.player.valueScore)}%`,
        upsideRating: `${Math.round(item.player.upsideScore)}%`,
        tieredRanking: `#${item.player.rank}`,
      },
    }));
  }

  /**
   * Analyze team's current roster needs and gaps
   */
  private static analyzeTeamRoster(
    teamPicks: DraftPick[],
    playerPool: PlayerAnalysis[],
  ): {
    gaps: Record<string, number>;
    strength: Record<string, number>;
  } {
    // Count positions drafted by this team
    const positionCounts: Record<string, number> = {};
    const positionValues: Record<string, number> = {};
    for (const pick of teamPicks) {
      const pos = pick.playerPosition || 'UNKNOWN';
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
      // Find this player's value score in the pool
      const poolPlayer = playerPool.find(p => p.playerId === pick.playerId);
      positionValues[pos] = (positionValues[pos] || 0) + (poolPlayer?.valueScore || 50);
    }

    // Standard requirements (adjust per league format in the future)
    const requirements: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };

    const gaps: Record<string, number> = {};
    const strength: Record<string, number> = {};

    for (const pos of Object.keys(requirements)) {
      const have = positionCounts[pos] || 0;
      const needed = requirements[pos] || 1;
      const gap = Math.max(0, needed - have);
      // Gap score: 0-100 where 100 = critical need
      gaps[pos] = Math.min(100, Math.round((gap / needed) * 100));
      // Strength: based on average value of drafted players at this position
      strength[pos] = have > 0 ? Math.min(100, Math.round(positionValues[pos] / have)) : 0;
    }

    return { gaps, strength };
  }

  /**
   * Score a player based on draft strategy
   */
  private static scorePlayer(
    player: PlayerAnalysis,
    strategy: AIStrategy,
    personality: AIPersonality,
    rosterAnalysis: { gaps: Record<string, number>; strength: Record<string, number> },
  ): number {
    let baseScore = 50;

    // Apply strategy weighting
    switch (strategy) {
      case 'balanced':
        baseScore = player.valueScore * 0.5 + player.positionalNeed * 0.35 + player.upsideScore * 0.15;
        break;

      case 'value':
        baseScore = player.valueScore * 0.7 + player.adp * 0.2 + (100 - player.riskScore) * 0.1;
        break;

      case 'upside':
        baseScore = player.upsideScore * 0.6 + player.valueScore * 0.2 + (100 - player.riskScore) * 0.2;
        break;

      case 'positional-need':
        baseScore = player.positionalNeed * 0.6 + player.valueScore * 0.3 + player.upsideScore * 0.1;
        break;

      case 'stack':
        baseScore = player.stackScore * 0.5 + player.valueScore * 0.35 + player.upsideScore * 0.15;
        break;

      case 'league-winning':
        baseScore = player.upsideScore * 0.5 + player.valueScore * 0.3 + player.positionalNeed * 0.2;
        break;
    }

    // Apply personality modifier
    const personalityModifier = this.getPersonalityModifier(personality);
    baseScore = baseScore * personalityModifier;

    // Apply risk tolerance
    const riskAdjustment = this.getRiskAdjustment(personality, player.riskScore);
    baseScore = baseScore + riskAdjustment;

    return Math.max(0, Math.min(100, baseScore));
  }

  /**
   * Get personality-based score modifier
   */
  private static getPersonalityModifier(personality: AIPersonality): number {
    switch (personality) {
      case 'conservative':
        return 0.8; // Lower risk, lower reward
      case 'moderate':
        return 1.0;
      case 'aggressive':
        return 1.2; // Higher risk, higher reward
      case 'elite':
        return 1.4; // Max risk, max reward
      default:
        return 1.0;
    }
  }

  /**
   * Get risk adjustment based on personality
   */
  private static getRiskAdjustment(personality: AIPersonality, riskScore: number): number {
    switch (personality) {
      case 'conservative':
        return (100 - riskScore) * 0.3; // Penalize risky picks
      case 'moderate':
        return 0;
      case 'aggressive':
        return (100 - riskScore) * -0.2; // Encourage risky picks
      case 'elite':
        return (100 - riskScore) * -0.5; // Strongly encourage risky picks
      default:
        return 0;
    }
  }

  /**
   * Generate natural language rationale for recommendation
   */
  private static generateRationale(
    player: PlayerAnalysis,
    strategy: AIStrategy,
    rosterAnalysis: { gaps: Record<string, number>; strength: Record<string, number> },
  ): string {
    switch (strategy) {
      case 'balanced':
        return `Well-rounded player with strong value and potential. Addresses positional needs while maintaining upside.`;

      case 'value':
        return `Excellent value pick at current ADP. Primary recommendation based on cost-benefit analysis.`;

      case 'upside':
        return `High upside potential with breakout possibility. Risk-reward profile favors this pick.`;

      case 'positional-need':
        return `Addresses critical positional gap in current roster. Prioritizing stability at needed position.`;

      case 'stack':
        return `Complements existing roster with synergistic correlation. Stacking recommendation for ceiling play.`;

      case 'league-winning':
        return `Best path to championship. Combines value, positional fit, and elite upside potential.`;

      default:
        return `Recommended based on current strategy and roster needs.`;
    }
  }

  /**
   * Generate auto-pick on timer expiration
   */
  static generateAutoPick(
    availablePlayers: PlayerAnalysis[],
    strategy: AIStrategy,
    personality: AIPersonality,
  ): string | null {
    if (!availablePlayers.length) return null;

    // Get highest-scored player
    const recommendations = this.recommendNextPicks(
      {
        leagueId: 'league-1',
        sport: 'NFL',
        leagueType: 'redraft',
        createdAt: new Date(),
        type: 'snake',
        orderType: 'manual',
        order: [],
        rounds: [],
        totalPicks: 1,
        totalTeams: 1,
        timer: { enabled: true, secondsPerPick: 120 },
        aiAssistant: {
          enabled: true,
          strategy,
          personality,
          autoPickOnTimeExpired: true,
          recommendationMode: 'top5',
          considerTeamNeeds: true,
          considerLeagueContext: true,
          draftWithHistory: true,
        },
        mode: 'live',
        poolSettings: { includeRookies: true, includeDevy: false, includeFreeAgents: true },
        dualTrack: false,
        allowPickUndos: true,
        allowSkipTeam: true,
        allowForcePick: true,
        allowRestart: true,
        status: 'active',
        state: {
          currentPick: 1,
          currentRound: 1,
          currentPosition: 1,
          currentTeamId: 'team-1',
          picks: [],
          completed: false,
          completedPickCount: 0,
        },
        audit: { version: 1, createdAt: new Date(), lastModifiedAt: new Date(), entries: [] },
      },
      {
        currentPick: 1,
        currentRound: 1,
        currentPosition: 1,
        currentTeamId: 'team-1',
        picks: [],
        completed: false,
        completedPickCount: 0,
      },
      'team-1',
      availablePlayers,
      1,
    );

    return recommendations.length > 0 ? recommendations[0].playerId : null;
  }

  /**
   * Get positional analysis for team's roster
   */
  static async getPositionalAnalysis(teamId: string, leagueId: string): Promise<Record<string, any>> {
    // TODO: Implement positional analysis based on league scoring format and position requirements
    return {};
  }

  /**
   * Evaluate value at position
   */
  static evaluateValueAtPosition(playerPool: PlayerAnalysis[], position: string): number {
    // TODO: Calculate average value score for position
    return 50;
  }
}
