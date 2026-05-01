type LegacyDraftRuntimeWriteGuardInput = {
  route: string
  operation: string
  sessionId: string
  mode: 'mock' | 'live'
}

export class LegacyDraftRuntimeWriteBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegacyDraftRuntimeWriteBlockedError'
  }
}

/**
 * Blocks user-facing live draft writes against legacy DraftRoom runtime tables.
 * Mock sessions are still allowed for compatibility paths.
 */
export function assertLegacyDraftRuntimeWriteAllowed(input: LegacyDraftRuntimeWriteGuardInput): void {
  if (input.mode === 'live') {
    throw new LegacyDraftRuntimeWriteBlockedError(
      `Blocked legacy draft runtime write in ${input.route}: ${input.operation} for ${input.sessionId}`,
    )
  }
}
