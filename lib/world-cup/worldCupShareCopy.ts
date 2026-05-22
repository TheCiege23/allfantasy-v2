/**
 * worldCupShareCopy.ts
 *
 * Pure deterministic helpers for launch-growth share/invite copy. No LLM
 * call. No external fetch. Used by the Invite tab (commissioner Copy
 * Invite Message) and the Review tab (finalized bracket Share CTA +
 * social caption helpers).
 *
 * Privacy:
 *   - Commissioner-only data (invite code / invite link) is only
 *     surfaced when the caller explicitly passes it. Helpers never
 *     fabricate a fake link.
 *   - Member-facing helpers never include invite code or link.
 */

/**
 * Required social hashtag block. Applied to every generated social
 * caption per product preference, even for World Cup pools.
 */
export const WORLD_CUP_SOCIAL_HASHTAGS =
  "#fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft"

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

// ── 1. Commissioner Invite Message ──────────────────────────────────────────

export type WorldCupInviteMessageInput = {
  /** Pool display name. */
  poolName: string
  /** Public join URL — required. */
  inviteUrl: string
  /** Invite code — optional; surfaced as a secondary line when present. */
  inviteCode?: string | null
  /** Human-readable lock deadline string (e.g. "June 11, 2026 3:00 PM ET"). */
  lockDeadlineLabel?: string | null
  /** Visibility of the message — only "commissioner" surfaces invite code/link. */
  audience?: "commissioner" | "member"
}

export type WorldCupInviteMessageResult = {
  status: "ready" | "member_blocked"
  message: string
  /** Lines used to build the message — useful for previewing. */
  lines: string[]
}

/**
 * Builds a ready-to-send commissioner invite message. Returns a `member_blocked`
 * status when the caller is a non-commissioner — the message is then a safe
 * fallback that does not include invite code or link.
 */
export function buildWorldCupInviteMessage(
  input: WorldCupInviteMessageInput
): WorldCupInviteMessageResult {
  const {
    poolName,
    inviteUrl,
    inviteCode,
    lockDeadlineLabel,
    audience = "commissioner",
  } = input

  if (audience === "member") {
    const lines = [
      `Want to join the AllFantasy World Cup Bracket Pool "${poolName}"?`,
      "Ask the pool commissioner for the invite link.",
      POWERED_BY,
    ]
    return {
      status: "member_blocked",
      message: sanitize(lines.join("\n")),
      lines,
    }
  }

  const lines: string[] = []
  lines.push(
    `Join my 2026 World Cup Bracket Pool on AllFantasy: ${poolName}.`
  )
  lines.push(
    "Make your picks, finalize your bracket, and see if your AI Bracket Report says you can beat the pool."
  )
  if (lockDeadlineLabel) {
    lines.push(`Picks lock ${lockDeadlineLabel}.`)
  }
  lines.push(inviteUrl)
  if (inviteCode) {
    lines.push(`Invite code: ${inviteCode}`)
  }
  lines.push(POWERED_BY)

  return {
    status: "ready",
    message: sanitize(lines.join("\n")),
    lines,
  }
}

// ── 2. Finalized Bracket Share Message ──────────────────────────────────────

export type WorldCupBracketShareInput = {
  poolName: string
  entryName?: string | null
  championName?: string | null
  /** Bracket Grade letter (e.g. "B+"). When absent, falls back to a generic line. */
  gradeLabel?: string | null
  /** Whether the bracket has been submitted/finalized. */
  isComplete?: boolean
  /** Public pool URL — optional. When present, included so friends can join. */
  poolUrl?: string | null
  /** Pre-built AI share card text — when present, takes priority over deterministic build. */
  prebuiltShareText?: string | null
}

export type WorldCupBracketShareResult = {
  status: "ready" | "incomplete"
  message: string
  lines: string[]
}

/**
 * Builds a share message for the user's own finalized bracket. Prefers the
 * AI Share Card text when available; otherwise composes a deterministic
 * message from champion + grade + pool name.
 */
export function buildWorldCupBracketShareMessage(
  input: WorldCupBracketShareInput
): WorldCupBracketShareResult {
  const {
    poolName,
    entryName,
    championName,
    gradeLabel,
    isComplete = false,
    poolUrl,
    prebuiltShareText,
  } = input

  if (prebuiltShareText && prebuiltShareText.trim().length > 0) {
    const cleaned = sanitize(prebuiltShareText)
    return {
      status: isComplete ? "ready" : "incomplete",
      message: cleaned,
      lines: cleaned.split("\n"),
    }
  }

  const lines: string[] = []
  const stateLabel = isComplete ? "locked in" : "in progress"
  lines.push(
    `My AllFantasy World Cup Bracket — ${poolName}.`
  )
  if (entryName) {
    lines.push(`${entryName} — ${stateLabel}.`)
  } else {
    lines.push(`My bracket is ${stateLabel}.`)
  }
  if (championName) {
    lines.push(`Champion pick: ${championName}.`)
  }
  if (gradeLabel) {
    lines.push(`Bracket Grade: ${gradeLabel}.`)
  }
  lines.push(
    isComplete
      ? "Think you can beat my bracket?"
      : "Make your picks before lock and see if you can beat mine."
  )
  if (poolUrl) {
    lines.push(poolUrl)
  }
  lines.push(POWERED_BY)

  return {
    status: isComplete ? "ready" : "incomplete",
    message: sanitize(lines.join("\n")),
    lines,
  }
}

// ── 3. Social Caption Helper ────────────────────────────────────────────────

export type WorldCupSocialCaptionInput = WorldCupBracketShareInput

export type WorldCupSocialCaptions = {
  twitter: string
  instagram: string
  discord: string
}

/**
 * Returns platform-friendly deterministic captions. Each platform respects
 * its own length norms; the required hashtag block is appended to every
 * caption per product preference.
 */
export function buildWorldCupSocialCaptions(
  input: WorldCupSocialCaptionInput
): WorldCupSocialCaptions {
  const base = buildWorldCupBracketShareMessage(input)
  const championLine = input.championName
    ? `Champion: ${input.championName}.`
    : null
  const gradeLine = input.gradeLabel ? `Grade: ${input.gradeLabel}.` : null
  const poolLine = input.poolName ? input.poolName : "World Cup pool"
  const ctaSuffix = input.poolUrl ? ` ${input.poolUrl}` : ""

  // Twitter/X — keep under ~280 chars including hashtags.
  const twitterParts: string[] = []
  twitterParts.push(`My ${poolLine} World Cup bracket is locked in on AllFantasy.`)
  if (championLine) twitterParts.push(championLine)
  if (gradeLine) twitterParts.push(gradeLine)
  twitterParts.push(`Think you can beat it?${ctaSuffix}`)
  twitterParts.push(WORLD_CUP_SOCIAL_HASHTAGS)
  const twitter = sanitize(twitterParts.join(" ")).slice(0, 270)

  // Instagram/TikTok — longer, line-broken with emojis allowed but kept text-only here.
  const instagramParts: string[] = []
  instagramParts.push(`My AllFantasy World Cup bracket is locked in.`)
  instagramParts.push(poolLine ? `Pool: ${poolLine}` : "")
  if (championLine) instagramParts.push(championLine)
  if (gradeLine) instagramParts.push(gradeLine)
  instagramParts.push("AI Bracket Report says it's ready for the field.")
  instagramParts.push("Make your picks and try to beat it.")
  if (input.poolUrl) instagramParts.push(input.poolUrl)
  instagramParts.push("")
  instagramParts.push(WORLD_CUP_SOCIAL_HASHTAGS)
  const instagram = sanitize(instagramParts.filter(Boolean).join("\n"))

  // Discord / group chat — focus on actionable CTA, single-paragraph friendly.
  const discordParts: string[] = []
  discordParts.push(`Locked in my ${poolLine} World Cup bracket on AllFantasy.`)
  if (championLine) discordParts.push(championLine)
  if (gradeLine) discordParts.push(gradeLine)
  discordParts.push("Bet you can't beat it. Pool link below.")
  if (input.poolUrl) discordParts.push(input.poolUrl)
  discordParts.push(WORLD_CUP_SOCIAL_HASHTAGS)
  const discord = sanitize(discordParts.join(" "))

  // Final pass: ensure base message text doesn't leak into caption objects.
  void base
  return { twitter, instagram, discord }
}
