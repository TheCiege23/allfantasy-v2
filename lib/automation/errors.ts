import type { AutomationJobStatus } from "@/lib/automation/types"

export class AutomationError extends Error {
  readonly name = "AutomationError"

  constructor(
    message: string,
    readonly metadata?: Record<string, unknown>
  ) {
    super(message)
  }
}

/** Transient failures — engine may re-queue / retry until `maxAttempts`. */
export class RetryableAutomationError extends AutomationError {
  readonly name = "RetryableAutomationError"
}

/** Non-retryable — marks job/run failed without retry expectation. */
export class FatalAutomationError extends AutomationError {
  readonly name = "FatalAutomationError"
}

export function isRetryableAutomationError(error: unknown): boolean {
  return error instanceof RetryableAutomationError
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === "string" ? error : JSON.stringify(error)
}

export function toErrorStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) return error.stack
  return null
}

/** Maps handler outcomes / errors to persisted job status strings. */
export function toAutomationJobStatusForError(error: unknown): AutomationJobStatus {
  return isRetryableAutomationError(error) ? "pending" : "failed"
}
