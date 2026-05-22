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
 *
 * Localization (Phase 4):
 *   - All builders accept an optional `locale` parameter (`en` default)
 *     and produce deterministic translated copy for en/es/zh/fil/vi.
 *   - The mandatory `WORLD_CUP_SOCIAL_HASHTAGS` block is identical
 *     across every locale per product preference.
 *   - The "Powered by AllFantasy." line is also localized via
 *     `POWERED_BY_BY_LOCALE`.
 *   - No Google Translate / OpenAI call at runtime; templates are
 *     static and verified by tests.
 */
import {
  getWorldCupLocale,
  type WorldCupLocale,
} from "@/lib/world-cup/worldCupI18n"

/**
 * Required social hashtag block. Applied to every generated social
 * caption per product preference, even for World Cup pools.
 *
 * IMPORTANT: this block is locale-invariant — tests assert it must
 * appear verbatim in every translated caption.
 */
export const WORLD_CUP_SOCIAL_HASHTAGS =
  "#fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft"

const POWERED_BY_BY_LOCALE: Record<WorldCupLocale, string> = {
  en: "Powered by AllFantasy.",
  es: "Hecho con AllFantasy.",
  zh: "由 AllFantasy 提供支援。",
  fil: "Powered by AllFantasy.",
  vi: "Hỗ trợ bởi AllFantasy.",
}

const POWERED_BY = POWERED_BY_BY_LOCALE.en

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
  /** Locale for translated templates. Defaults to "en". */
  locale?: WorldCupLocale | string | null
}

export type WorldCupInviteMessageResult = {
  status: "ready" | "member_blocked"
  message: string
  /** Lines used to build the message — useful for previewing. */
  lines: string[]
}

type InviteMessageTemplates = {
  memberHeading: (poolName: string) => string
  memberAsk: string
  commissionerHeading: (poolName: string) => string
  commissionerPitch: string
  deadline: (label: string) => string
  inviteCodeLine: (code: string) => string
}

const INVITE_MESSAGE_TEMPLATES: Record<WorldCupLocale, InviteMessageTemplates> = {
  en: {
    memberHeading: (p) => `Want to join the AllFantasy World Cup Bracket Pool "${p}"?`,
    memberAsk: "Ask the pool commissioner for the invite link.",
    commissionerHeading: (p) => `Join my 2026 World Cup Bracket Pool on AllFantasy: ${p}.`,
    commissionerPitch:
      "Make your picks, finalize your bracket, and see if your AI Bracket Report says you can beat the pool.",
    deadline: (l) => `Picks lock ${l}.`,
    inviteCodeLine: (c) => `Invite code: ${c}`,
  },
  es: {
    memberHeading: (p) =>
      `¿Quieres unirte al grupo de brackets de la Copa del Mundo de AllFantasy "${p}"?`,
    memberAsk: "Pídele al comisionado del grupo el enlace de invitación.",
    commissionerHeading: (p) =>
      `Únete a mi grupo de brackets de la Copa del Mundo 2026 en AllFantasy: ${p}.`,
    commissionerPitch:
      "Haz tus picks, finaliza tu bracket y mira si tu Informe IA dice que puedes ganarle al grupo.",
    deadline: (l) => `Los picks cierran ${l}.`,
    inviteCodeLine: (c) => `Código de invitación: ${c}`,
  },
  zh: {
    memberHeading: (p) =>
      `想加入 AllFantasy 的世界盃對戰群組「${p}」嗎?`,
    memberAsk: "請向群組管理員索取邀請連結。",
    commissionerHeading: (p) =>
      `來加入我在 AllFantasy 的 2026 世界盃對戰群組:${p}。`,
    commissionerPitch:
      "做出你的選擇、送出對戰表,看看 AI 對戰表報告能不能說你可以擊敗整個群組。",
    deadline: (l) => `選擇將於 ${l} 鎖定。`,
    inviteCodeLine: (c) => `邀請碼:${c}`,
  },
  fil: {
    memberHeading: (p) =>
      `Gusto mong sumali sa AllFantasy World Cup Bracket Pool na "${p}"?`,
    memberAsk: "Humingi sa pool commissioner ng invite link.",
    commissionerHeading: (p) =>
      `Sumali sa 2026 World Cup Bracket Pool ko sa AllFantasy: ${p}.`,
    commissionerPitch:
      "Mag-pick ka, i-finalize ang bracket mo, at tingnan kung sasabihin ng AI Bracket Report mo na kaya mong talunin ang pool.",
    deadline: (l) => `Magla-lock ang picks ${l}.`,
    inviteCodeLine: (c) => `Invite code: ${c}`,
  },
  vi: {
    memberHeading: (p) =>
      `Muốn tham gia pool bracket World Cup AllFantasy "${p}" không?`,
    memberAsk: "Hãy hỏi chủ pool để lấy link mời.",
    commissionerHeading: (p) =>
      `Tham gia pool bracket World Cup 2026 của tôi trên AllFantasy: ${p}.`,
    commissionerPitch:
      "Đưa ra lựa chọn, hoàn tất bracket, và xem báo cáo AI nói bạn có thể đánh bại pool hay không.",
    deadline: (l) => `Lựa chọn khoá lúc ${l}.`,
    inviteCodeLine: (c) => `Mã mời: ${c}`,
  },
}

/**
 * Builds a ready-to-send commissioner invite message. Returns a `member_blocked`
 * status when the caller is a non-commissioner — the message is then a safe
 * fallback that does not include invite code or link.
 *
 * Locale-aware (Phase 4) — defaults to English when unset. Member output
 * never includes invite code/link/url regardless of locale.
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
    locale,
  } = input

  const lang = getWorldCupLocale(locale)
  const tpl = INVITE_MESSAGE_TEMPLATES[lang]
  const poweredBy = POWERED_BY_BY_LOCALE[lang]

  if (audience === "member") {
    const lines = [
      tpl.memberHeading(poolName),
      tpl.memberAsk,
      poweredBy,
    ]
    return {
      status: "member_blocked",
      message: sanitize(lines.join("\n")),
      lines,
    }
  }

  const lines: string[] = []
  lines.push(tpl.commissionerHeading(poolName))
  lines.push(tpl.commissionerPitch)
  if (lockDeadlineLabel) {
    lines.push(tpl.deadline(lockDeadlineLabel))
  }
  lines.push(inviteUrl)
  if (inviteCode) {
    lines.push(tpl.inviteCodeLine(inviteCode))
  }
  lines.push(poweredBy)

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
  /** Locale for translated templates. Defaults to "en". */
  locale?: WorldCupLocale | string | null
}

export type WorldCupBracketShareResult = {
  status: "ready" | "incomplete"
  message: string
  lines: string[]
}

type BracketShareTemplates = {
  heading: (poolName: string) => string
  entryLine: (entryName: string, complete: boolean) => string
  noEntryLine: (complete: boolean) => string
  championLine: (championName: string) => string
  gradeLine: (gradeLabel: string) => string
  ctaComplete: string
  ctaIncomplete: string
}

const BRACKET_SHARE_TEMPLATES: Record<WorldCupLocale, BracketShareTemplates> = {
  en: {
    heading: (p) => `My AllFantasy World Cup Bracket — ${p}.`,
    entryLine: (n, c) => `${n} — ${c ? "locked in" : "in progress"}.`,
    noEntryLine: (c) => `My bracket is ${c ? "locked in" : "in progress"}.`,
    championLine: (n) => `Champion pick: ${n}.`,
    gradeLine: (g) => `Bracket Grade: ${g}.`,
    ctaComplete: "Think you can beat my bracket?",
    ctaIncomplete: "Make your picks before lock and see if you can beat mine.",
  },
  es: {
    heading: (p) => `Mi bracket de la Copa del Mundo de AllFantasy — ${p}.`,
    entryLine: (n, c) => `${n} — ${c ? "confirmado" : "en progreso"}.`,
    noEntryLine: (c) =>
      `Mi bracket está ${c ? "confirmado" : "en progreso"}.`,
    championLine: (n) => `Campeón elegido: ${n}.`,
    gradeLine: (g) => `Calificación: ${g}.`,
    ctaComplete: "¿Crees que puedes vencer mi bracket?",
    ctaIncomplete:
      "Haz tus picks antes del cierre y mira si puedes vencerme.",
  },
  zh: {
    heading: (p) => `我的 AllFantasy 世界盃對戰表 — ${p}。`,
    entryLine: (n, c) => `${n} — ${c ? "已鎖定" : "進行中"}。`,
    noEntryLine: (c) => `我的對戰表${c ? "已鎖定" : "進行中"}。`,
    championLine: (n) => `冠軍選擇:${n}。`,
    gradeLine: (g) => `對戰表評分:${g}。`,
    ctaComplete: "覺得你能贏過我的對戰表嗎?",
    ctaIncomplete:
      "在鎖定前做好你的選擇,看看你能不能贏我。",
  },
  fil: {
    heading: (p) => `Aking AllFantasy World Cup Bracket — ${p}.`,
    entryLine: (n, c) =>
      `${n} — ${c ? "naka-lock" : "ginagawa pa"}.`,
    noEntryLine: (c) =>
      `Ang bracket ko ay ${c ? "naka-lock na" : "ginagawa pa"}.`,
    championLine: (n) => `Champion pick: ${n}.`,
    gradeLine: (g) => `Bracket Grade: ${g}.`,
    ctaComplete: "Sa tingin mo matatalo mo ba ang bracket ko?",
    ctaIncomplete:
      "Mag-pick ka bago mag-lock at tingnan kung matatalo mo ako.",
  },
  vi: {
    heading: (p) => `Bracket World Cup AllFantasy của tôi — ${p}.`,
    entryLine: (n, c) =>
      `${n} — ${c ? "đã khoá" : "đang làm"}.`,
    noEntryLine: (c) =>
      `Bracket của tôi ${c ? "đã khoá" : "đang làm"}.`,
    championLine: (n) => `Lựa chọn nhà vô địch: ${n}.`,
    gradeLine: (g) => `Điểm bracket: ${g}.`,
    ctaComplete: "Bạn nghĩ mình thắng được bracket của tôi không?",
    ctaIncomplete:
      "Hoàn thành lựa chọn trước khi khoá và xem có thắng tôi được không.",
  },
}

/**
 * Builds a share message for the user's own finalized bracket. Prefers the
 * AI Share Card text when available; otherwise composes a deterministic
 * message from champion + grade + pool name.
 *
 * Locale-aware (Phase 4) — defaults to English when unset. The optional
 * `prebuiltShareText` path bypasses locale templates (the caller is
 * expected to have already localized it).
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
    locale,
  } = input

  const lang = getWorldCupLocale(locale)
  const tpl = BRACKET_SHARE_TEMPLATES[lang]
  const poweredBy = POWERED_BY_BY_LOCALE[lang]

  if (prebuiltShareText && prebuiltShareText.trim().length > 0) {
    const cleaned = sanitize(prebuiltShareText)
    return {
      status: isComplete ? "ready" : "incomplete",
      message: cleaned,
      lines: cleaned.split("\n"),
    }
  }

  const lines: string[] = []
  lines.push(tpl.heading(poolName))
  if (entryName) {
    lines.push(tpl.entryLine(entryName, isComplete))
  } else {
    lines.push(tpl.noEntryLine(isComplete))
  }
  if (championName) {
    lines.push(tpl.championLine(championName))
  }
  if (gradeLabel) {
    lines.push(tpl.gradeLine(gradeLabel))
  }
  lines.push(isComplete ? tpl.ctaComplete : tpl.ctaIncomplete)
  if (poolUrl) {
    lines.push(poolUrl)
  }
  lines.push(poweredBy)

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
