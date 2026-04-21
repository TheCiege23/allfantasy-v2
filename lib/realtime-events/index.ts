export {
  publishMatchupLiveTickDebounced,
  publishLeagueFanoutEvent,
  emitPlayerInjuryOrNewsFanout,
  emitPlayoffAdvancementFanout,
  type PublishLeagueFanoutInput,
} from '@/lib/realtime-events/realtimeEventService'

export {
  fanoutInjurySyncBatch,
  type InjurySyncFanoutRow,
} from '@/lib/realtime-events/injurySyncFanout'

export {
  injuryFanoutSortPriority,
  shouldIncludeInjuryInFanoutBatch,
} from '@/lib/realtime-events/injuryFanoutPolicy'
