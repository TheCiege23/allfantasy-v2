/**
 * LeaguePollService — payload and detection for league chat polls.
 * Bracket league API supports type "poll" with metadata.question and metadata.options.
 * Platform threads: poll can be a messageType with body/metadata; full UI is future.
 */

export const LEAGUE_POLL_MAX_OPTIONS = 6
export const LEAGUE_POLL_QUESTION_MAX_LENGTH = 200
export const LEAGUE_POLL_OPTION_MAX_LENGTH = 100

export function createLeaguePollPayload(question: string, options: string[]): {
  question: string
  options: string[]
  votes?: Record<string, string[]>
} {
  const q = question.trim().slice(0, LEAGUE_POLL_QUESTION_MAX_LENGTH)
  const opts = options
    .slice(0, LEAGUE_POLL_MAX_OPTIONS)
    .map((o) => String(o).trim().slice(0, LEAGUE_POLL_OPTION_MAX_LENGTH))
    .filter(Boolean)
  return { question: q, options: opts, votes: {} }
}

export function isPollMessage(messageType: string, metadata?: { question?: string } | null): boolean {
  return messageType === "poll" || !!(metadata?.question)
}
