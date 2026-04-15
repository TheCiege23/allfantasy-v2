/**
 * AI Action Workflow Prefiller
 * Maps an AIAction to prefill data that will be injected into the target workflow
 * (modal, form, composer, etc.) when the action is executed.
 *
 * prefillTarget  — string key that the UI surfaces listen for
 * prefillData    — structured payload that UI components can spread into forms
 */

import type { AIAction, AIActionType, AIWorkflowPrefill, AIWorkflowType } from './AIActionModel'

function getWorkflowType(type: AIActionType): AIWorkflowType {
  const map: Partial<Record<AIActionType, AIWorkflowType>> = {
    queue_player: 'draft_queue',
    auto_queue_best_3: 'draft_queue',
    draft_player: 'draft_pick',
    set_auction_bid: 'auction_bid',
    claim_player: 'waiver_claim',
    set_faab_bid: 'waiver_claim',
    drop_player_for_claim: 'waiver_claim',
    add_to_watchlist: 'watchlist',
    start_player: 'lineup_edit',
    bench_player: 'lineup_edit',
    optimize_lineup: 'lineup_edit',
    optimize_bench: 'lineup_edit',
    swap_players: 'lineup_edit',
    save_lineup: 'lineup_edit',
    move_to_bench: 'lineup_edit',
    try_alternate_starter: 'lineup_edit',
    optimize_ceiling: 'lineup_edit',
    optimize_floor: 'lineup_edit',
    optimize_categories: 'lineup_edit',
    analyze_trade: 'trade_analysis',
    propose_trade: 'trade_compose',
    generate_counter: 'trade_compose',
    save_counter_draft: 'saved_items',
    ai_trade_review: 'trade_analysis',
    share_trade_summary: 'chat_compose',
    drop_player: 'roster_move',
    move_to_ir: 'roster_move',
    move_to_il: 'roster_move',
    move_to_taxi: 'roster_move',
    move_to_devy: 'roster_move',
    compare_replacement: 'deep_dive',
    flag_trade_block: 'roster_move',
    save_future_move: 'saved_items',
    simulate_matchup: 'simulation',
    save_matchup_strategy: 'saved_items',
    start_simulation: 'simulation',
    draft_announcement: 'announcement',
    post_recap: 'announcement',
    send_warning: 'announcement',
    approve_issue: 'announcement',
    generate_rule_update: 'announcement',
    open_health_report: 'deep_dive',
    join_league: 'league_discovery',
    save_league: 'saved_items',
    compare_leagues: 'league_discovery',
    ask_why_fit: 'deep_dive',
    open_deep_dive: 'deep_dive',
    save_recommendation: 'saved_items',
    schedule_reminder: 'saved_items',
    compare_alternatives: 'deep_dive',
    post_to_league_chat: 'chat_compose',
    bookmark_player: 'saved_items',
    compare_draft_options: 'deep_dive',
    compare_claims: 'deep_dive',
    save_waiver_plan: 'saved_items',
  }

  return map[type] ?? 'saved_items'
}

// ─── Target Map ─────────────────────────────────────────────────────────────────

/**
 * Returns the canonical prefillTarget for a given action type.
 * Falls back to the registry-level prefillTarget if undefined here.
 */
export function getPrefillTarget(type: AIActionType): string | null {
  const targets: Partial<Record<AIActionType, string>> = {
    // Draft
    queue_player: 'draft_queue',
    auto_queue_best_3: 'draft_queue',
    draft_player: 'draft_pick',
    set_auction_bid: 'auction_bidder',
    bookmark_player: 'draft_bookmarks',
    compare_draft_options: 'player_compare_modal',
    // Waiver
    claim_player: 'waiver_claim_modal',
    add_to_watchlist: 'watchlist',
    set_faab_bid: 'faab_bid_modal',
    drop_player_for_claim: 'waiver_claim_modal',
    compare_claims: 'player_compare_modal',
    save_waiver_plan: 'saved_plans',
    // Lineup
    start_player: 'lineup_editor',
    bench_player: 'lineup_editor',
    optimize_lineup: 'lineup_editor',
    optimize_bench: 'lineup_editor',
    swap_players: 'lineup_editor',
    save_lineup: 'lineup_editor',
    // Trade
    analyze_trade: 'trade_analyzer_modal',
    propose_trade: 'trade_composer',
    generate_counter: 'trade_composer',
    save_counter_draft: 'saved_trades',
    ai_trade_review: 'chimmy_chat',
    share_trade_summary: 'league_chat_composer',
    // Roster
    drop_player: 'drop_confirm_modal',
    move_to_bench: 'lineup_editor',
    move_to_ir: 'roster_move_modal',
    move_to_il: 'roster_move_modal',
    move_to_taxi: 'roster_move_modal',
    move_to_devy: 'roster_move_modal',
    compare_replacement: 'player_compare_modal',
    flag_trade_block: 'trade_block',
    save_future_move: 'saved_moves',
    // Matchup
    simulate_matchup: 'matchup_simulator',
    try_alternate_starter: 'lineup_editor',
    optimize_ceiling: 'lineup_editor',
    optimize_floor: 'lineup_editor',
    optimize_categories: 'lineup_editor',
    save_matchup_strategy: 'saved_strategies',
    // Commissioner
    draft_announcement: 'announcement_composer',
    post_recap: 'announcement_composer',
    send_warning: 'warning_composer',
    approve_issue: 'issue_reviewer',
    generate_rule_update: 'announcement_composer',
    open_health_report: 'league_health_modal',
    // Discovery
    join_league: 'league_join_flow',
    save_league: 'saved_leagues',
    compare_leagues: 'league_compare_modal',
    ask_why_fit: 'chimmy_chat',
    // General
    open_deep_dive: 'deep_dive_modal',
    save_recommendation: 'saved_recommendations',
    schedule_reminder: 'reminder_modal',
    compare_alternatives: 'player_compare_modal',
    post_to_league_chat: 'league_chat_composer',
    start_simulation: 'scenario_simulator',
  }

  return targets[type] ?? null
}

// ─── Prefill Data Builder ───────────────────────────────────────────────────────

/**
 * Build the prefill data object for a given action.
 * The UI layer reads action.prefillTarget + action.prefillData to
 * pre-populate the target workflow.
 */
export function buildPrefillData(action: AIAction): Record<string, unknown> {
  const p = action.payload
  const entities = {
    playerIds: (p.playerIds as string[] | undefined) ?? [],
    playerNames: (p.playerNames as string[] | undefined) ?? [],
    teamIds: (p.teamIds as string[] | undefined) ?? [],
    tradeAssets: (p.tradeAssets as string[] | undefined) ?? [],
    bidAmount: (p.bidAmount as number | undefined) ?? null,
    leagueIdTarget: (p.leagueIdTarget as string | undefined) ?? null,
    slots: (p.slots as string[] | undefined) ?? [],
  }

  const base: Record<string, unknown> = {
    actionId: action.id,
    actionType: action.type,
    leagueId: action.leagueId ?? null,
    teamId: action.teamId ?? null,
    sport: action.sport ?? null,
    leagueType: action.leagueType ?? null,
  }

  switch (action.type) {
    // ── Draft ──
    case 'queue_player':
    case 'bookmark_player':
      return { ...base, playerIds: entities.playerIds, playerNames: entities.playerNames }

    case 'auto_queue_best_3':
      return { ...base, mode: 'auto_top_3', sport: action.sport }

    case 'draft_player':
      return { ...base, playerId: entities.playerIds[0] ?? null, playerName: entities.playerNames[0] ?? null }

    case 'set_auction_bid':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
        suggestedBid: entities.bidAmount,
      }

    case 'compare_draft_options':
      return { ...base, playerIds: entities.playerIds }

    // ── Waiver ──
    case 'claim_player':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
        suggestedFaab: entities.bidAmount,
      }

    case 'add_to_watchlist':
      return { ...base, playerIds: entities.playerIds }

    case 'set_faab_bid':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        suggestedBid: entities.bidAmount,
      }

    case 'drop_player_for_claim':
      return {
        ...base,
        claimPlayerId: entities.playerIds[0] ?? null,
        claimPlayerName: entities.playerNames[0] ?? null,
        dropPlayerId: entities.playerIds[1] ?? null,
        dropPlayerName: entities.playerNames[1] ?? null,
        suggestedFaab: entities.bidAmount,
      }

    case 'compare_claims':
      return { ...base, playerIds: entities.playerIds }

    case 'save_waiver_plan':
      return {
        ...base,
        claims: entities.playerIds.map((id, i) => ({
          playerId: id,
          playerName: entities.playerNames[i] ?? null,
        })),
      }

    // ── Lineup ──
    case 'start_player':
    case 'bench_player':
    case 'move_to_bench':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
        slot: entities.slots[0] ?? null,
      }

    case 'swap_players':
      return {
        ...base,
        playerOutId: entities.playerIds[0] ?? null,
        playerInId: entities.playerIds[1] ?? null,
        slot: entities.slots[0] ?? null,
      }

    case 'optimize_lineup':
    case 'optimize_bench':
    case 'save_lineup':
    case 'optimize_ceiling':
    case 'optimize_floor':
    case 'optimize_categories':
    case 'try_alternate_starter':
      return {
        ...base,
        mode: action.type,
        sport: action.sport,
        weatherAware: p.weatherAware ?? false,
        scheduleDensityAware: p.scheduleDensityAware ?? false,
        formationAware: p.formationAware ?? false,
      }

    // ── Trade ──
    case 'analyze_trade':
    case 'propose_trade':
    case 'generate_counter':
    case 'save_counter_draft':
    case 'ai_trade_review':
      return {
        ...base,
        givingAssets: entities.tradeAssets.slice(0, Math.floor(entities.tradeAssets.length / 2)),
        receivingAssets: entities.tradeAssets.slice(Math.floor(entities.tradeAssets.length / 2)),
        targetTeamId: entities.teamIds[0] ?? null,
      }

    case 'share_trade_summary':
      return {
        ...base,
        tradeAssets: entities.tradeAssets,
        message: p.recommendationText ?? '',
      }

    // ── Roster ──
    case 'drop_player':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
      }

    case 'move_to_ir':
    case 'move_to_il':
    case 'move_to_taxi':
    case 'move_to_devy':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
        targetSlot: action.type.replace('move_to_', '').toUpperCase(),
      }

    case 'compare_replacement':
      return { ...base, playerIds: entities.playerIds }

    case 'flag_trade_block':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
      }

    case 'save_future_move':
      return {
        ...base,
        playerIds: entities.playerIds,
        note: p.recommendationText ?? '',
      }

    // ── Matchup ──
    case 'simulate_matchup':
    case 'save_matchup_strategy':
    case 'start_simulation':
      return {
        ...base,
        leagueId: action.leagueId,
        week: (p.leagueState as Record<string, unknown> | undefined)?.currentWeek ?? null,
      }

    // ── Commissioner ──
    case 'draft_announcement':
    case 'post_recap':
    case 'generate_rule_update':
      return {
        ...base,
        draftText: p.recommendationText ?? '',
        leagueId: action.leagueId,
      }

    case 'send_warning':
      return {
        ...base,
        targetTeamId: entities.teamIds[0] ?? null,
      }

    case 'approve_issue':
    case 'open_health_report':
      return { ...base }

    // ── Discovery ──
    case 'join_league':
    case 'save_league':
    case 'compare_leagues':
      return {
        ...base,
        targetLeagueId: entities.leagueIdTarget ?? null,
      }

    case 'ask_why_fit':
      return {
        ...base,
        targetLeagueId: entities.leagueIdTarget ?? null,
        prompt: `Why is this league a good fit for me?`,
      }

    // ── General ──
    case 'open_deep_dive':
      return {
        ...base,
        playerId: entities.playerIds[0] ?? null,
        playerName: entities.playerNames[0] ?? null,
        href: action.deepDiveHref ?? null,
      }

    case 'post_to_league_chat':
      return {
        ...base,
        message: p.recommendationText ?? '',
        leagueId: action.leagueId,
      }

    case 'schedule_reminder':
      return {
        ...base,
        message: p.recommendationText ?? '',
        dueAt: null,
      }

    case 'compare_alternatives':
      return { ...base, playerIds: entities.playerIds }

    case 'save_recommendation':
    default:
      return { ...base, recommendationText: p.recommendationText ?? '' }
  }
}

/**
 * Builds the normalized workflow prefill contract used by the workflow execution layer.
 */
export function buildWorkflowPrefill(action: AIAction): AIWorkflowPrefill {
  const values = buildPrefillData(action)

  return {
    workflowType: getWorkflowType(action.type),
    sport: action.sport ?? null,
    leagueId: action.leagueId ?? null,
    teamId: action.teamId ?? null,
    values,
  }
}
