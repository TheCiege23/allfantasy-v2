/**
 * Failover system — retry logic, fallback states, graceful degradation.
 * Use runWithRetryAndFallback for server-side flows; useFailoverState for client UI state.
 */

export type { FailoverResult, FailoverState, FailoverStateAndMessage, RunWithFailoverOptions } from './types'
export { runWithRetryAndFallback, runWithRetryOnly } from './run-with-failover'
export { getDegradedMessage } from './messages'
