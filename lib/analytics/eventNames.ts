/** Canonical analytics event names (stored in `AnalyticsEvent.event`). */

export const ANALYTICS_TOOL_PRODUCT = 'af_product'
export const ANALYTICS_TOOL_ENGINE = 'af_engine'

/** Create-league funnel (client beacon + server confirmation). */
export const CREATE_LEAGUE = {
  FUNNEL_OPEN: 'product.create_league.funnel_open',
  STEP_ENTER: 'product.create_league.step_enter',
  STEP_DURATION: 'product.create_league.step_duration',
  SUBMIT: 'product.create_league.submit',
  SUCCESS_CLIENT: 'product.create_league.success_client',
  FAIL_CLIENT: 'product.create_league.fail_client',
  FUNNEL_ABANDON: 'product.create_league.funnel_abandon',
  SERVER_SUCCESS: 'product.create_league.server_success',
  SERVER_FAIL: 'product.create_league.server_fail',
} as const

/** Engagement (server or client). */
export const ENGAGEMENT = {
  DRAFT_COMPLETED: 'engagement.draft_completed',
  WAIVER_RUN: 'engagement.waiver_run_completed',
  TRADE_PROCESSED: 'engagement.trade_processed',
  MATCHUP_CENTER_VIEW: 'engagement.matchup_center_view',
  COMMISSIONER_SETTINGS: 'engagement.commissioner_settings_save',
  /** User claimed an open team via invite link (`/join/[token]`). */
  JOIN_INVITE_TEAM_CLAIM: 'engagement.join_invite.team_claim',
} as const

export const AI_USAGE = {
  MATCHUP_ANALYSIS: 'ai.matchup_analysis',
  START_SIT: 'ai.start_sit',
} as const

/** Live draft room (client beacons — complements server draft lifecycle). */
export const DRAFT_ROOM = {
  START_DRAFT: 'engagement.draft_room.start_draft',
  PICK: 'engagement.draft_room.pick',
  QUEUE_ADD: 'engagement.draft_room.queue_add',
  NOMINATE: 'engagement.draft_room.nominate',
  CHAT_SEND: 'engagement.draft_room.chat_send',
  MOBILE_TAB: 'engagement.draft_room.mobile_tab',
  FILTER_POSITION: 'engagement.draft_room.filter_position',
  FILTER_TEAM: 'engagement.draft_room.filter_team',
  POOL_FILTER: 'engagement.draft_room.pool_filter',
  SORT: 'engagement.draft_room.sort',
  SEARCH: 'engagement.draft_room.search',
  AUTOPICK_QUEUE: 'engagement.draft_room.autopick_queue',
  AWAY_MODE: 'engagement.draft_room.away_mode',
  AI_ADP_SORT: 'engagement.draft_room.ai_adp_sort',
  AI_QUEUE_REORDER: 'engagement.draft_room.ai_queue_reorder',
  AI_REORDER_EXPLAIN_TOGGLE: 'engagement.draft_room.ai_reorder_explain_toggle',
  /** Successful copy of invite link from draft top bar (inline or menu). */
  INVITE_COPY: 'engagement.draft_room.invite_copy',
  /** Commissioner toggles league-wide auto-pick (Draft UI settings). */
  COMMISSIONER_AUTOPICK_LEAGUE: 'engagement.draft_room.commissioner_autopick_league',
  /** Commissioner toggles “force auto-pick” for orphan/expired flows. */
  COMMISSIONER_FORCE_AUTOPICK: 'engagement.draft_room.commissioner_force_autopick',
  /** Member without a roster claims a placeholder team from the draft manager strip. */
  CLAIM_SLOT: 'engagement.draft_room.claim_slot',
  /** Opened draft pick trade modal from a board cell (prefilled offer). */
  TRADE_OPEN_FROM_BOARD: 'engagement.draft_room.trade_open_from_board',
} as const

/** Engine / ops (often sampled before persist). */
export const ENGINE = {
  JOB: 'engine.job',
  API_FAILURE: 'engine.api_failure',
  NOTIFICATION_DISPATCH: 'engine.notification_dispatch',
} as const
