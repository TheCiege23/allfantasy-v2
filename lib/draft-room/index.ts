/**
 * Draft Room UX — view service, board renderer, queue controller, search resolver,
 * war room resolver, AI bridge, sport draft UI.
 */

export {
  getDraftViewState,
  getCurrentPickDisplay,
  getTimerDisplay,
  getPickConfirmationLabel,
  DRAFT_ROOM_MESSAGES,
  type DraftViewState,
  type CurrentPickDisplay,
  type TimerDisplay,
} from './DraftRoomViewService'

export {
  getSlotInRound,
  formatPickLabel,
  getCellKey,
  type PickCell,
} from './DraftBoardRenderer'

export {
  canAddToQueue,
  addToQueue,
  removeFromQueue,
  removeFromQueueByPlayerName,
  reorderQueue,
  getNextQueuedAvailable,
  type QueuePlayer,
} from './DraftQueueController'

export {
  filterBySearch,
  filterByPosition,
  excludeDrafted,
  applyDraftFilters,
  type DraftPlayer,
} from './DraftPlayerSearchResolver'

export {
  DRAFT_WAR_ROOM_LEGACY_URL,
  getLeagueDraftTabUrl,
  shouldShowWarRoomPanel,
  getWarRoomPanelTitle,
  getWarRoomPanelDescription,
} from './DraftWarRoomUIResolver'

export {
  getDraftAIChatUrl,
  buildDraftSummaryForAI,
  type DraftContextForAI,
} from './DraftToAIContextBridge'

export {
  getPositionFilterOptionsForSport,
  getDefaultRosterSlotsForSport,
  getSupportedDraftSports,
  getDraftSportOptions,
  type PositionFilterOption,
  type DraftSportOption,
} from './SportDraftUIResolver'
