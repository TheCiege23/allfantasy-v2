/**
 * worldCupCommissionerChecklist.ts
 *
 * Pure deterministic helper for the Commissioner "Pool Completion
 * Checklist" card. Composes finalized/incomplete counts + per-entry
 * rows + a copy-ready reminder message from data already loaded on
 * the Commissioner Brain panel — no new API route, no LLM call.
 *
 * Privacy:
 *   - Output never exposes userId or email.
 *   - Display names fall back to "Member" when unsafe/missing.
 *   - Reminder message includes pool name + optional invite URL +
 *     optional deadline; nothing else.
 */

export type ChecklistEntryStatus =
  | "Finalized"
  | "In progress"
  | "Needs picks"
  | "Unknown"

export type ChecklistStatus = "ready" | "no_members" | "no_data"

export type ChecklistRow = {
  /** Entry display name (e.g. "Bracket 1"). */
  entryName: string
  /** Member display name (sanitized — never email, never user id). */
  displayName: string
  status: ChecklistEntryStatus
  /** Missing pick count for this entry (0 when finalized). */
  missingPicks: number
}

export type ChecklistSummary = {
  totalEntries: number
  finalized: number
  inProgress: number
  notStarted: number
  /** 0–100 integer percent of entries that are finalized. */
  percentComplete: number
}

export type ChecklistResult = {
  status: ChecklistStatus
  summary: ChecklistSummary
  rows: ChecklistRow[]
  reminderMessage: string
  /** Optional friendly fallback lines when no rows render. */
  emptyLines?: string[]
}

/** Snapshot-like input from the Commissioner Brain endpoint. */
export type WorldCupChecklistSnapshot = {
  totalEntries: number
  completedBracketCount: number
  incompleteBracketCount: number
  totalMissingPicks: number
  /** Users with at least one incomplete entry. userId is used internally to look up display names; never rendered. */
  usersWithIncompleteBrackets: Array<{
    userId?: string | null
    displayName?: string | null
    incompleteEntryCount?: number
    missingPicks?: number
  }>
  /** Specific entries that are missing picks. userId is used internally to look up display names; never rendered. */
  entriesMissingPicks: Array<{
    entryName?: string | null
    missingPicks?: number
    userId?: string | null
  }>
}

export type BuildChecklistInput = {
  /** Snapshot already loaded by WorldCupCommissionerBrainPanel. */
  snapshot: WorldCupChecklistSnapshot | null
  /** Pool/challenge display name. */
  poolName: string
  /** Public pool URL (e.g. /brackets/world-cup/[id]) — optional. */
  poolUrl?: string | null
  /** Human-readable lock deadline label — optional. */
  lockDeadlineLabel?: string | null
  /** Whether the viewer is commissioner/admin. Member-mode renders nothing. */
  isCommissioner?: boolean
}

const POWERED_BY = "Powered by AllFantasy."

const FORBIDDEN_TERMS = [
  /\bdfs\b/gi,
  /\bbetting\b/gi,
  /\bwager(?:ing|s|ed)?\b/gi,
  /\bsportsbook\b/gi,
  /\bodds\b/gi,
]

function sanitize(text: string): string {
  let cleaned = text
  for (const pattern of FORBIDDEN_TERMS) {
    cleaned = cleaned.replace(pattern, "prediction")
  }
  return cleaned.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

function safeDisplayName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return "Member"
  // Defensive: never let an email-shaped string leak into the UI.
  if (/@/.test(trimmed) || /^user[-_]?[0-9a-f]{6,}$/i.test(trimmed)) {
    return "Member"
  }
  return trimmed.slice(0, 40)
}

function safeEntryName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return "Bracket"
  return trimmed.slice(0, 80)
}

/**
 * Builds the deterministic checklist + reminder text. Always returns a
 * stable object — non-commissioner viewers receive a `no_data` status
 * with a safe fallback message and no per-row data.
 */
export function buildWorldCupCommissionerChecklist(
  input: BuildChecklistInput
): ChecklistResult {
  const {
    snapshot,
    poolName,
    poolUrl,
    lockDeadlineLabel,
    isCommissioner = false,
  } = input

  if (!isCommissioner) {
    return {
      status: "no_data",
      summary: { totalEntries: 0, finalized: 0, inProgress: 0, notStarted: 0, percentComplete: 0 },
      rows: [],
      reminderMessage: sanitize(
        `Ask the pool commissioner to remind members about ${poolName}.`
      ),
      emptyLines: ["Only the pool commissioner or admin can see member status."],
    }
  }

  if (!snapshot) {
    return {
      status: "no_data",
      summary: { totalEntries: 0, finalized: 0, inProgress: 0, notStarted: 0, percentComplete: 0 },
      rows: [],
      reminderMessage: sanitize(
        [
          `Reminder: finish your picks for "${poolName}" on AllFantasy.`,
          lockDeadlineLabel ? `Picks lock ${lockDeadlineLabel}.` : null,
          poolUrl ?? null,
          POWERED_BY,
        ]
          .filter(Boolean)
          .join("\n")
      ),
      emptyLines: ["Commissioner status data is still loading."],
    }
  }

  const totalEntries = Math.max(0, Number(snapshot.totalEntries) || 0)
  const completed = Math.max(0, Number(snapshot.completedBracketCount) || 0)
  const incompleteCount = Math.max(0, Number(snapshot.incompleteBracketCount) || 0)

  if (totalEntries === 0) {
    return {
      status: "no_members",
      summary: { totalEntries: 0, finalized: 0, inProgress: 0, notStarted: 0, percentComplete: 0 },
      rows: [],
      reminderMessage: sanitize(
        [
          `Reminder: join "${poolName}" on AllFantasy and lock in your World Cup bracket.`,
          lockDeadlineLabel ? `Picks lock ${lockDeadlineLabel}.` : null,
          poolUrl ?? null,
          POWERED_BY,
        ]
          .filter(Boolean)
          .join("\n")
      ),
      emptyLines: ["No members have created entries yet. Share the invite link to get started."],
    }
  }

  // Build a userId → safe display-name lookup from the users-with-incomplete-brackets list.
  // userIds are used only internally; the resulting display name is the only PII-safe value rendered.
  const displayNameByUserId = new Map<string, string>()
  for (const user of snapshot.usersWithIncompleteBrackets ?? []) {
    if (!user.userId) continue
    displayNameByUserId.set(String(user.userId), safeDisplayName(user.displayName))
  }

  // Build per-entry rows from the incomplete entries; everything else is treated as finalized.
  const incompleteRows: ChecklistRow[] = (snapshot.entriesMissingPicks ?? []).map(
    (row) => {
      const missingPicks = Math.max(0, Number(row.missingPicks ?? 0) || 0)
      // Map missing-pick count to a stable status label.
      const status: ChecklistEntryStatus =
        missingPicks <= 0 ? "Unknown" : missingPicks <= 3 ? "In progress" : "Needs picks"
      const lookup = row.userId ? displayNameByUserId.get(String(row.userId)) : null
      return {
        entryName: safeEntryName(row.entryName),
        displayName: lookup ?? "Member",
        status,
        missingPicks,
      }
    }
  )

  // If incompleteRows < incompleteCount (because some incomplete entries have 0 missing per the
  // snapshot detail), pad with generic rows so the UI mirrors the headline count.
  const missingRows = Math.max(0, incompleteCount - incompleteRows.length)
  for (let i = 0; i < missingRows; i++) {
    incompleteRows.push({
      entryName: `Bracket`,
      displayName: "Member",
      status: "In progress",
      missingPicks: 0,
    })
  }

  // Finalized rows — we don't have a per-entry finalized list on the snapshot, so represent
  // them as a single aggregated row when commissioner has at least one finalized entry.
  const finalizedRows: ChecklistRow[] =
    completed > 0
      ? [
          {
            entryName: `${completed} finalized bracket${completed === 1 ? "" : "s"}`,
            displayName: "—",
            status: "Finalized",
            missingPicks: 0,
          },
        ]
      : []

  const rows: ChecklistRow[] = [...finalizedRows, ...incompleteRows]

  // Counts derived strictly from the snapshot — never invent data.
  const notStarted = Math.max(0, totalEntries - completed - incompleteCount)
  const percentComplete = totalEntries > 0 ? Math.round((completed / totalEntries) * 100) : 0

  const summary: ChecklistSummary = {
    totalEntries,
    finalized: completed,
    inProgress: incompleteCount,
    notStarted,
    percentComplete,
  }

  // Reminder copy — commissioner-safe.
  const reminderLines: string[] = []
  reminderLines.push(`Friendly reminder: finalize your picks for "${poolName}" on AllFantasy.`)
  if (lockDeadlineLabel) {
    reminderLines.push(`Picks lock ${lockDeadlineLabel}.`)
  }
  reminderLines.push(
    `Status: ${completed}/${totalEntries} brackets finalized (${percentComplete}%).`
  )
  if (poolUrl) {
    reminderLines.push(poolUrl)
  }
  reminderLines.push(POWERED_BY)

  return {
    status: "ready",
    summary,
    rows,
    reminderMessage: sanitize(reminderLines.join("\n")),
  }
}
