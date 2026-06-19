import {
  DRAFT_PICK_DUPLICATE_PLAYER,
  DRAFT_PICK_INVALID_PAYLOAD,
  DRAFT_PICK_NOT_LIVE,
  DRAFT_PICK_NOT_ON_CLOCK,
  DRAFT_PICK_RACE_RETRY,
  DRAFT_PICK_STALE_OVERALL,
  type PickAuthorityCode,
} from '@/lib/live-draft-engine/pickAuthorityCodes'
import type { DraftSessionStatus } from '@/lib/live-draft-engine/types'

export type RedraftDraftPickErrorCode =
  | 'NOT_ON_CLOCK'
  | 'DRAFT_PAUSED'
  | 'PLAYER_UNAVAILABLE'
  | 'PLAYER_INELIGIBLE'
  | 'STALE_PICK'
  | 'DRAFT_COMPLETE'
  | 'UNAUTHORIZED'
  | 'COMMISSIONER_REQUIRED'
  | 'VALIDATION_FAILED'

export type NormalizeRedraftPickErrorInput = {
  code?: PickAuthorityCode | string | null
  status?: number | null
  sessionStatus?: DraftSessionStatus | string | null
  message?: string | null
  commissionerAction?: boolean | null
}

export type NormalizedRedraftPickError = {
  code: RedraftDraftPickErrorCode
  retryable: boolean
  httpStatus: number
  userMessage: string
}

function normalizeMessage(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase()
}

export function normalizeRedraftDraftPickError(input: NormalizeRedraftPickErrorInput): NormalizedRedraftPickError {
  const code = String(input.code ?? '')
  const message = normalizeMessage(input.message)
  const status = input.status ?? 400

  if (status === 401 || code === 'UNAUTHORIZED') {
    return { code: 'UNAUTHORIZED', retryable: false, httpStatus: 401, userMessage: 'Sign in to draft.' }
  }
  if (status === 403 && input.commissionerAction) {
    return { code: 'COMMISSIONER_REQUIRED', retryable: false, httpStatus: 403, userMessage: 'Commissioner access required.' }
  }
  if (code === DRAFT_PICK_NOT_ON_CLOCK) {
    return { code: 'NOT_ON_CLOCK', retryable: false, httpStatus: 403, userMessage: 'This team is not on the clock.' }
  }
  if (code === DRAFT_PICK_STALE_OVERALL || code === DRAFT_PICK_RACE_RETRY) {
    return { code: 'STALE_PICK', retryable: true, httpStatus: 409, userMessage: 'Draft state changed. Refresh and retry.' }
  }
  if (code === DRAFT_PICK_DUPLICATE_PLAYER || message.includes('already drafted')) {
    return { code: 'PLAYER_UNAVAILABLE', retryable: false, httpStatus: 400, userMessage: 'That player is no longer available.' }
  }
  if (message.includes('eligible') || message.includes('wrong sport') || message.includes('pool')) {
    return { code: 'PLAYER_INELIGIBLE', retryable: false, httpStatus: 400, userMessage: 'That player is not eligible for this draft.' }
  }
  if (code === DRAFT_PICK_NOT_LIVE) {
    if (input.sessionStatus === 'paused' || message.includes('paused')) {
      return { code: 'DRAFT_PAUSED', retryable: true, httpStatus: 400, userMessage: 'The draft is paused.' }
    }
    if (input.sessionStatus === 'completed' || message.includes('complete')) {
      return { code: 'DRAFT_COMPLETE', retryable: false, httpStatus: 400, userMessage: 'The draft is complete.' }
    }
  }
  if (code === DRAFT_PICK_INVALID_PAYLOAD || status === 422) {
    return { code: 'VALIDATION_FAILED', retryable: false, httpStatus: status === 422 ? 422 : 400, userMessage: 'Pick payload is invalid.' }
  }
  return { code: 'VALIDATION_FAILED', retryable: false, httpStatus: status, userMessage: 'Pick could not be submitted.' }
}
