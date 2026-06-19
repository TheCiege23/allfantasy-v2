import type { DraftExecutionMode, TimerMode } from '@/lib/draft-defaults/DraftUISettingsResolver'
import type { DraftSessionStatus, DraftType } from '@/lib/live-draft-engine/types'

export type RedraftDraftRoomMode = 'live' | 'mock' | 'offline' | 'slow' | 'auto' | 'auction'
export type RedraftDraftEngineCore = 'snake' | 'linear' | 'auction'
export type RedraftDraftRoomSafeState = 'ready' | 'setup_required' | 'paused' | 'complete' | 'blocked'

export type RedraftDraftRoomModeInput = {
  kind?: 'live' | 'mock' | null
  draftType?: string | null
  status?: DraftSessionStatus | string | null
  timerSeconds?: number | null
  timerMode?: TimerMode | string | null
  executionMode?: DraftExecutionMode | string | null
  isSlowDraft?: boolean | null
  rosterConfigurationIncomplete?: boolean | null
  hasDraftOrder?: boolean | null
}

export type RedraftDraftRoomModeCapabilities = {
  board: boolean
  search: boolean
  queue: boolean
  userPicks: boolean
  commissionerPickEntry: boolean
  commissionerControls: boolean
  timer: boolean
  autopick: boolean
  chat: boolean
  warRoom: boolean
  chimmyContext: boolean
  mockDoesNotMutateRosters: boolean
  auctionBudget: boolean
}

export type RedraftDraftRoomModeContract = {
  mode: RedraftDraftRoomMode
  engineCore: RedraftDraftEngineCore
  status: DraftSessionStatus
  safeState: RedraftDraftRoomSafeState
  canStart: boolean
  canSubmitUserPick: boolean
  canSubmitCommissionerPick: boolean
  labels: {
    primary: string
    timer: string
    pickAction: string
  }
  capabilities: RedraftDraftRoomModeCapabilities
  reasonCodes: string[]
}

function normalizeStatus(value: RedraftDraftRoomModeInput['status']): DraftSessionStatus {
  if (value === 'in_progress' || value === 'paused' || value === 'completed' || value === 'pre_draft') return value
  return 'pre_draft'
}

function normalizeDraftType(value: string | null | undefined): string {
  return String(value ?? 'snake').trim().toLowerCase().replace(/-/g, '_')
}

function resolveEngineCore(draftType: string): RedraftDraftEngineCore {
  if (draftType === 'auction') return 'auction'
  if (draftType === 'linear') return 'linear'
  return 'snake'
}

function resolveMode(input: RedraftDraftRoomModeInput, draftType: string): RedraftDraftRoomMode {
  if (input.kind === 'mock' || draftType === 'mock' || draftType === 'mock_draft') return 'mock'
  if (draftType === 'auction') return 'auction'
  if (input.executionMode === 'offline' || draftType === 'offline') return 'offline'
  if (input.executionMode === 'auto' || draftType === 'auto') return 'auto'
  if (
    input.isSlowDraft ||
    draftType === 'slow' ||
    draftType === 'slow_draft' ||
    input.timerMode === 'overnight_pause' ||
    Number(input.timerSeconds ?? 0) >= 3600
  ) {
    return 'slow'
  }
  return 'live'
}

function baseCapabilities(): RedraftDraftRoomModeCapabilities {
  return {
    board: true,
    search: true,
    queue: true,
    userPicks: true,
    commissionerPickEntry: false,
    commissionerControls: true,
    timer: true,
    autopick: true,
    chat: true,
    warRoom: true,
    chimmyContext: true,
    mockDoesNotMutateRosters: false,
    auctionBudget: false,
  }
}

function capabilitiesFor(mode: RedraftDraftRoomMode): RedraftDraftRoomModeCapabilities {
  const caps = baseCapabilities()
  if (mode === 'mock') {
    caps.mockDoesNotMutateRosters = true
    caps.commissionerControls = false
  }
  if (mode === 'offline') {
    caps.userPicks = false
    caps.commissionerPickEntry = true
    caps.timer = false
    caps.autopick = false
  }
  if (mode === 'auto') {
    caps.userPicks = false
    caps.autopick = true
  }
  if (mode === 'slow') {
    caps.timer = true
    caps.autopick = true
  }
  if (mode === 'auction') {
    caps.auctionBudget = true
    caps.queue = true
    caps.userPicks = false
  }
  return caps
}

function labelsFor(mode: RedraftDraftRoomMode): RedraftDraftRoomModeContract['labels'] {
  switch (mode) {
    case 'mock':
      return { primary: 'Mock Draft Room', timer: 'Mock clock', pickAction: 'Draft in mock' }
    case 'offline':
      return { primary: 'Offline Draft Room', timer: 'Timer off', pickAction: 'Log pick' }
    case 'slow':
      return { primary: 'Slow Draft Room', timer: 'Pick window', pickAction: 'Make pick' }
    case 'auto':
      return { primary: 'Auto Draft Room', timer: 'Autopick clock', pickAction: 'Queue priority' }
    case 'auction':
      return { primary: 'Auction Draft Room', timer: 'Nomination clock', pickAction: 'Nominate or bid' }
    default:
      return { primary: 'Live Draft Room', timer: 'Pick clock', pickAction: 'Make pick' }
  }
}

export function resolveRedraftDraftRoomModeContract(input: RedraftDraftRoomModeInput): RedraftDraftRoomModeContract {
  const status = normalizeStatus(input.status)
  const draftType = normalizeDraftType(input.draftType)
  const mode = resolveMode(input, draftType)
  const engineCore = resolveEngineCore(draftType)
  const caps = capabilitiesFor(mode)
  const reasonCodes: string[] = []

  if (input.rosterConfigurationIncomplete) reasonCodes.push('ROSTER_CONFIGURATION_INCOMPLETE')
  if (input.hasDraftOrder === false) reasonCodes.push('DRAFT_ORDER_MISSING')
  if (status === 'pre_draft') reasonCodes.push('DRAFT_SETUP_NOT_STARTED')
  if (status === 'paused') reasonCodes.push('DRAFT_PAUSED')
  if (status === 'completed') reasonCodes.push('DRAFT_COMPLETE')

  const blocked = Boolean(input.rosterConfigurationIncomplete || input.hasDraftOrder === false)
  const safeState: RedraftDraftRoomSafeState = blocked
    ? 'blocked'
    : status === 'completed'
      ? 'complete'
      : status === 'paused'
        ? 'paused'
        : status === 'pre_draft'
          ? 'setup_required'
          : 'ready'

  const canStart = safeState === 'setup_required'
  const canSubmitUserPick = safeState === 'ready' && caps.userPicks
  const canSubmitCommissionerPick =
    (safeState === 'ready' || (mode === 'offline' && safeState !== 'complete')) &&
    (caps.commissionerPickEntry || mode === 'offline')

  return {
    mode,
    engineCore,
    status,
    safeState,
    canStart,
    canSubmitUserPick,
    canSubmitCommissionerPick,
    labels: labelsFor(mode),
    capabilities: caps,
    reasonCodes,
  }
}
