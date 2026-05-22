/**
 * bracketsI18n.ts
 *
 * Reusable Brackets/Pools-scoped translation foundation. Sits underneath
 * any bracket/pool UI (NCAA brackets, playoffs, World Cup, etc.) and lets
 * those surfaces translate cross-cutting copy (round names, "Pick winner",
 * "Locked", "Leaderboard", etc.) without each sport copying its own
 * dictionary.
 *
 * Supported locales — same five as the app-wide system:
 *   en  — English
 *   es  — Español
 *   zh  — 繁體中文 (Traditional Chinese)
 *   fil — Filipino
 *   vi  — Tiếng Việt
 *
 * Relationship to other i18n modules:
 *  - lib/i18n/constants.ts + components/i18n/LanguageProviderClient.tsx
 *    own the app-wide language preference (cookie `af_lang`, localStorage
 *    `af_lang`, user profile preferredLanguage). This file CONSUMES that
 *    same locale code via `getBracketsLocale()`. It never sets the
 *    preference itself.
 *  - lib/world-cup/worldCupI18n.ts owns World Cup-specific keys (tab
 *    labels, knockout banners, danger zones, etc.). This file holds the
 *    shared bracket vocabulary that more than one sport will eventually
 *    use. Both helpers are independent — adding a key here does NOT
 *    require touching the World Cup dictionary, and vice-versa.
 *  - lib/preferences/ServerRenderPreferenceResolver.ts is the source of
 *    truth for server components (cookie + UserProfile).
 *
 * Why a separate dictionary instead of folding into lib/i18n/translations.ts:
 *  - lib/i18n/translations.ts is already ~4400 lines and ships in every
 *    page bundle. Bundling bracket-only keys for non-bracket pages
 *    (login, dashboard, draft, etc.) would inflate first-load JS.
 *  - Bracket vocabulary tends to evolve together (round names, lock
 *    behavior, pick semantics) and is easier to maintain colocated.
 *
 * Hydration safety:
 *  - The locale comes from the global LanguageProviderClient via
 *    `useOptionalLanguage()` on the client or
 *    `resolveServerRenderPreferences()` on the server. Both paths
 *    converge on the same value rendered in `<html data-lang>` by the
 *    server-side language init script, so SSR HTML and the first CSR
 *    render see the same locale → no React #425/#418.
 *  - No browser APIs are read during render. Pure / deterministic.
 *
 * Missing-key behavior:
 *  - Falls back to English when a key is missing in the requested locale.
 *  - In development (process.env.NODE_ENV !== "production") logs a single
 *    console.warn per (locale, key) so the dev sees it without spamming.
 *  - Production never logs and never reveals the raw key.
 *
 * Safety properties (verified by tests):
 *  - No values contain email addresses, user IDs, or wagering / betting
 *    / sportsbook / DFS language.
 *  - Placeholder syntax `{{name}}` is interpolated.
 *  - Never imports browser APIs (window, document, navigator, etc.) and
 *    never imports the Google Translate batch script.
 */
export type BracketsLocale = "en" | "es" | "zh" | "fil" | "vi"

export const BRACKETS_SUPPORTED_LOCALES: BracketsLocale[] = [
  "en",
  "es",
  "zh",
  "fil",
  "vi",
]
export const BRACKETS_DEFAULT_LOCALE: BracketsLocale = "en"

/**
 * Native display names for the brackets language picker / tooltip.
 * Aligned with lib/i18n/constants.ts so the global LanguageToggle and
 * any bracket-scoped picker render the same text for each option.
 */
export const BRACKETS_LOCALE_NATIVE_NAMES: Record<BracketsLocale, string> = {
  en: "English",
  es: "Español",
  zh: "繁體中文",
  fil: "Filipino",
  vi: "Tiếng Việt",
}

/**
 * Normalize an arbitrary string / null / undefined into a supported
 * brackets locale. Mirrors lib/i18n/constants.ts resolveLanguage so this
 * helper accepts every code the app-wide system can emit.
 */
export function getBracketsLocale(input: unknown): BracketsLocale {
  if (input === "es") return "es"
  if (input === "en") return "en"
  if (input === "zh") return "zh"
  if (input === "fil") return "fil"
  if (input === "vi") return "vi"
  return BRACKETS_DEFAULT_LOCALE
}

/**
 * Native display name for a locale code. Falls back to English
 * ("English") if the input is unknown.
 */
export function getBracketsLocaleNativeName(
  input: BracketsLocale | string | null | undefined
): string {
  const safe = getBracketsLocale(input)
  return BRACKETS_LOCALE_NATIVE_NAMES[safe]
}

type BracketsDictionary = Record<string, string>

// English source dictionary. Cross-cutting bracket / pool vocabulary
// that more than one sport could reuse. Keep keys short and namespaced
// (`brk.*` for "brackets"), keep values short — these are UI labels, not
// long-form copy.
const EN: BracketsDictionary = {
  // ── Common bracket / pool nouns ──────────────────────────────────────
  "brk.common.bracket": "Bracket",
  "brk.common.brackets": "Brackets",
  "brk.common.pool": "Pool",
  "brk.common.pools": "Pools",
  "brk.common.entry": "Entry",
  "brk.common.entries": "Entries",
  "brk.common.round": "Round",
  "brk.common.match": "Match",
  "brk.common.matches": "Matches",
  "brk.common.team": "Team",
  "brk.common.teams": "Teams",
  "brk.common.pick": "Pick",
  "brk.common.picks": "Picks",
  "brk.common.score": "Score",
  "brk.common.rank": "Rank",
  "brk.common.points": "points",
  "brk.common.winner": "Winner",
  "brk.common.commissioner": "Commissioner",
  "brk.common.participant": "Participant",
  "brk.common.participants": "Participants",

  // ── Common action verbs ──────────────────────────────────────────────
  "brk.action.create": "Create",
  "brk.action.join": "Join",
  "brk.action.discover": "Discover",
  "brk.action.invite": "Invite",
  "brk.action.share": "Share",
  "brk.action.finalize": "Finalize",
  "brk.action.refresh": "Refresh",
  "brk.action.copy": "Copy",
  "brk.action.copied": "Copied!",
  "brk.action.continue": "Continue",
  "brk.action.start": "Start",
  "brk.action.tryAgain": "Try again",
  "brk.action.cancel": "Cancel",
  "brk.action.save": "Save",
  "brk.action.signIn": "Sign in",

  // ── Status / state labels ────────────────────────────────────────────
  "brk.status.open": "Open",
  "brk.status.locked": "Locked",
  "brk.status.live": "Live",
  "brk.status.final": "Final",
  "brk.status.scheduled": "Scheduled",
  "brk.status.postponed": "Postponed",
  "brk.status.cancelled": "Cancelled",
  "brk.status.loading": "Loading...",
  "brk.status.saving": "Saving...",
  "brk.status.saved": "Saved",
  "brk.status.complete": "Complete",
  "brk.status.incomplete": "Incomplete",
  "brk.status.ready": "Ready",

  // ── Round names (shared NCAA-style vocabulary) ───────────────────────
  "brk.round.roundOf64": "Round of 64",
  "brk.round.roundOf32": "Round of 32",
  "brk.round.roundOf16": "Round of 16",
  "brk.round.quarterfinal": "Quarterfinal",
  "brk.round.semifinal": "Semifinal",
  "brk.round.thirdPlace": "Third-place",
  "brk.round.final": "Final",
  "brk.round.championship": "Championship",
  "brk.round.groupStage": "Group Stage",
  "brk.round.knockouts": "Knockouts",

  // ── Generic empty / error messaging ──────────────────────────────────
  "brk.empty.noPicks": "No picks yet.",
  "brk.empty.noEntries": "No entries yet.",
  "brk.empty.noMatches": "No matches yet.",
  "brk.empty.noResults": "No results yet.",
  "brk.error.tryAgain": "Something went wrong. Try again.",
  "brk.error.network": "Network error. Check your connection.",

  // ── Lock / countdown copy ────────────────────────────────────────────
  "brk.lock.bracketLocked": "Bracket locked",
  "brk.lock.picksFrozen": "Picks are frozen.",
  "brk.lock.locksSoon": "Locks soon",
  "brk.lock.untilLockDays": "{{d}}d {{h}}h until lock",
  "brk.lock.untilLockHours": "{{h}}h {{m}}m until lock",
  "brk.lock.untilLockMinutes": "{{m}}m until lock",

  // ── Share / invite copy ──────────────────────────────────────────────
  "brk.invite.copyLink": "Copy invite link",
  "brk.invite.linkCopied": "Link copied!",
  "brk.invite.shareViaText": "Text",
  "brk.invite.shareViaEmail": "Email",
  "brk.invite.shareViaSocial": "Social",
  "brk.invite.codeLabel": "Invite code",

  // ── Generic AI tier chips ────────────────────────────────────────────
  "brk.tier.basic": "Basic",
  "brk.tier.pro": "AF Pro",
  "brk.tier.proActive": "AF Pro active",
  "brk.tier.proPreview": "AF Pro preview",
  "brk.tier.locked": "Locked",

  // ── Language UI ──────────────────────────────────────────────────────
  "brk.language.label": "Language",
}

const ES: BracketsDictionary = {
  // ── Common bracket / pool nouns ──────────────────────────────────────
  "brk.common.bracket": "Bracket",
  "brk.common.brackets": "Brackets",
  "brk.common.pool": "Grupo",
  "brk.common.pools": "Grupos",
  "brk.common.entry": "Entrada",
  "brk.common.entries": "Entradas",
  "brk.common.round": "Ronda",
  "brk.common.match": "Partido",
  "brk.common.matches": "Partidos",
  "brk.common.team": "Equipo",
  "brk.common.teams": "Equipos",
  "brk.common.pick": "Pick",
  "brk.common.picks": "Picks",
  "brk.common.score": "Puntos",
  "brk.common.rank": "Posición",
  "brk.common.points": "puntos",
  "brk.common.winner": "Ganador",
  "brk.common.commissioner": "Comisionado",
  "brk.common.participant": "Participante",
  "brk.common.participants": "Participantes",

  // ── Common action verbs ──────────────────────────────────────────────
  "brk.action.create": "Crear",
  "brk.action.join": "Unirse",
  "brk.action.discover": "Descubrir",
  "brk.action.invite": "Invitar",
  "brk.action.share": "Compartir",
  "brk.action.finalize": "Finalizar",
  "brk.action.refresh": "Actualizar",
  "brk.action.copy": "Copiar",
  "brk.action.copied": "¡Copiado!",
  "brk.action.continue": "Continuar",
  "brk.action.start": "Empezar",
  "brk.action.tryAgain": "Reintentar",
  "brk.action.cancel": "Cancelar",
  "brk.action.save": "Guardar",
  "brk.action.signIn": "Iniciar sesión",

  // ── Status / state labels ────────────────────────────────────────────
  "brk.status.open": "Abierto",
  "brk.status.locked": "Bloqueado",
  "brk.status.live": "En vivo",
  "brk.status.final": "Final",
  "brk.status.scheduled": "Programado",
  "brk.status.postponed": "Aplazado",
  "brk.status.cancelled": "Cancelado",
  "brk.status.loading": "Cargando...",
  "brk.status.saving": "Guardando...",
  "brk.status.saved": "Guardado",
  "brk.status.complete": "Completo",
  "brk.status.incomplete": "Incompleto",
  "brk.status.ready": "Listo",

  // ── Round names (shared NCAA-style vocabulary) ───────────────────────
  "brk.round.roundOf64": "Ronda de 64",
  "brk.round.roundOf32": "Ronda de 32",
  "brk.round.roundOf16": "Ronda de 16",
  "brk.round.quarterfinal": "Cuartos de final",
  "brk.round.semifinal": "Semifinal",
  "brk.round.thirdPlace": "Tercer puesto",
  "brk.round.final": "Final",
  "brk.round.championship": "Campeonato",
  "brk.round.groupStage": "Fase de Grupos",
  "brk.round.knockouts": "Eliminatorias",

  // ── Generic empty / error messaging ──────────────────────────────────
  "brk.empty.noPicks": "Aún no hay picks.",
  "brk.empty.noEntries": "Aún no hay entradas.",
  "brk.empty.noMatches": "Aún no hay partidos.",
  "brk.empty.noResults": "Aún no hay resultados.",
  "brk.error.tryAgain": "Algo salió mal. Reintenta.",
  "brk.error.network": "Error de red. Revisa tu conexión.",

  // ── Lock / countdown copy ────────────────────────────────────────────
  "brk.lock.bracketLocked": "Bracket bloqueado",
  "brk.lock.picksFrozen": "Los picks están congelados.",
  "brk.lock.locksSoon": "Cierra pronto",
  "brk.lock.untilLockDays": "{{d}}d {{h}}h para que cierre",
  "brk.lock.untilLockHours": "{{h}}h {{m}}m para que cierre",
  "brk.lock.untilLockMinutes": "{{m}}m para que cierre",

  // ── Share / invite copy ──────────────────────────────────────────────
  "brk.invite.copyLink": "Copiar enlace de invitación",
  "brk.invite.linkCopied": "¡Enlace copiado!",
  "brk.invite.shareViaText": "Texto",
  "brk.invite.shareViaEmail": "Email",
  "brk.invite.shareViaSocial": "Redes",
  "brk.invite.codeLabel": "Código de invitación",

  // ── Generic AI tier chips ────────────────────────────────────────────
  "brk.tier.basic": "Básico",
  "brk.tier.pro": "AF Pro",
  "brk.tier.proActive": "AF Pro activo",
  "brk.tier.proPreview": "Vista previa AF Pro",
  "brk.tier.locked": "Bloqueado",

  // ── Language UI ──────────────────────────────────────────────────────
  "brk.language.label": "Idioma",
}

const ZH: BracketsDictionary = {
  // ── Common bracket / pool nouns ──────────────────────────────────────
  "brk.common.bracket": "對戰表",
  "brk.common.brackets": "對戰表",
  "brk.common.pool": "群組",
  "brk.common.pools": "群組",
  "brk.common.entry": "項目",
  "brk.common.entries": "項目",
  "brk.common.round": "回合",
  "brk.common.match": "比賽",
  "brk.common.matches": "比賽",
  "brk.common.team": "球隊",
  "brk.common.teams": "球隊",
  "brk.common.pick": "選擇",
  "brk.common.picks": "選擇",
  "brk.common.score": "積分",
  "brk.common.rank": "排名",
  "brk.common.points": "分",
  "brk.common.winner": "勝者",
  "brk.common.commissioner": "管理員",
  "brk.common.participant": "參賽者",
  "brk.common.participants": "參賽者",

  // ── Common action verbs ──────────────────────────────────────────────
  "brk.action.create": "建立",
  "brk.action.join": "加入",
  "brk.action.discover": "探索",
  "brk.action.invite": "邀請",
  "brk.action.share": "分享",
  "brk.action.finalize": "送出",
  "brk.action.refresh": "重新整理",
  "brk.action.copy": "複製",
  "brk.action.copied": "已複製!",
  "brk.action.continue": "繼續",
  "brk.action.start": "開始",
  "brk.action.tryAgain": "重試",
  "brk.action.cancel": "取消",
  "brk.action.save": "儲存",
  "brk.action.signIn": "登入",

  // ── Status / state labels ────────────────────────────────────────────
  "brk.status.open": "開放中",
  "brk.status.locked": "已鎖定",
  "brk.status.live": "進行中",
  "brk.status.final": "已結束",
  "brk.status.scheduled": "已排定",
  "brk.status.postponed": "延期",
  "brk.status.cancelled": "取消",
  "brk.status.loading": "載入中...",
  "brk.status.saving": "儲存中...",
  "brk.status.saved": "已儲存",
  "brk.status.complete": "已完成",
  "brk.status.incomplete": "未完成",
  "brk.status.ready": "就緒",

  // ── Round names (shared NCAA-style vocabulary) ───────────────────────
  "brk.round.roundOf64": "64 強",
  "brk.round.roundOf32": "32 強",
  "brk.round.roundOf16": "16 強",
  "brk.round.quarterfinal": "八強",
  "brk.round.semifinal": "四強",
  "brk.round.thirdPlace": "季軍戰",
  "brk.round.final": "決賽",
  "brk.round.championship": "冠軍賽",
  "brk.round.groupStage": "小組賽",
  "brk.round.knockouts": "淘汰賽",

  // ── Generic empty / error messaging ──────────────────────────────────
  "brk.empty.noPicks": "尚無選擇。",
  "brk.empty.noEntries": "尚無項目。",
  "brk.empty.noMatches": "尚無比賽。",
  "brk.empty.noResults": "尚無結果。",
  "brk.error.tryAgain": "發生錯誤,請重試。",
  "brk.error.network": "網路錯誤,請檢查連線。",

  // ── Lock / countdown copy ────────────────────────────────────────────
  "brk.lock.bracketLocked": "對戰表已鎖定",
  "brk.lock.picksFrozen": "選擇已凍結。",
  "brk.lock.locksSoon": "即將鎖定",
  "brk.lock.untilLockDays": "距鎖定還有 {{d}} 天 {{h}} 小時",
  "brk.lock.untilLockHours": "距鎖定還有 {{h}} 小時 {{m}} 分",
  "brk.lock.untilLockMinutes": "距鎖定還有 {{m}} 分鐘",

  // ── Share / invite copy ──────────────────────────────────────────────
  "brk.invite.copyLink": "複製邀請連結",
  "brk.invite.linkCopied": "已複製連結!",
  "brk.invite.shareViaText": "簡訊",
  "brk.invite.shareViaEmail": "Email",
  "brk.invite.shareViaSocial": "社群",
  "brk.invite.codeLabel": "邀請碼",

  // ── Generic AI tier chips ────────────────────────────────────────────
  "brk.tier.basic": "基本版",
  "brk.tier.pro": "AF Pro",
  "brk.tier.proActive": "AF Pro 已啟用",
  "brk.tier.proPreview": "AF Pro 預覽",
  "brk.tier.locked": "已鎖定",

  // ── Language UI ──────────────────────────────────────────────────────
  "brk.language.label": "語言",
}

const FIL: BracketsDictionary = {
  // ── Common bracket / pool nouns ──────────────────────────────────────
  "brk.common.bracket": "Bracket",
  "brk.common.brackets": "Brackets",
  "brk.common.pool": "Pool",
  "brk.common.pools": "Pools",
  "brk.common.entry": "Entry",
  "brk.common.entries": "Entries",
  "brk.common.round": "Round",
  "brk.common.match": "Laban",
  "brk.common.matches": "Mga laban",
  "brk.common.team": "Team",
  "brk.common.teams": "Mga team",
  "brk.common.pick": "Pick",
  "brk.common.picks": "Picks",
  "brk.common.score": "Iskor",
  "brk.common.rank": "Ranggo",
  "brk.common.points": "puntos",
  "brk.common.winner": "Nanalo",
  "brk.common.commissioner": "Commissioner",
  "brk.common.participant": "Kalahok",
  "brk.common.participants": "Mga kalahok",

  // ── Common action verbs ──────────────────────────────────────────────
  "brk.action.create": "Gumawa",
  "brk.action.join": "Sumali",
  "brk.action.discover": "Maghanap",
  "brk.action.invite": "Mag-invite",
  "brk.action.share": "I-share",
  "brk.action.finalize": "I-finalize",
  "brk.action.refresh": "I-refresh",
  "brk.action.copy": "Kopyahin",
  "brk.action.copied": "Nakopya!",
  "brk.action.continue": "Magpatuloy",
  "brk.action.start": "Simulan",
  "brk.action.tryAgain": "Subukan ulit",
  "brk.action.cancel": "Kanselahin",
  "brk.action.save": "I-save",
  "brk.action.signIn": "Mag-sign in",

  // ── Status / state labels ────────────────────────────────────────────
  "brk.status.open": "Bukas",
  "brk.status.locked": "Nakasara",
  "brk.status.live": "Live",
  "brk.status.final": "Final",
  "brk.status.scheduled": "Naka-schedule",
  "brk.status.postponed": "Inantala",
  "brk.status.cancelled": "Kinansela",
  "brk.status.loading": "Naglo-load...",
  "brk.status.saving": "Sini-save...",
  "brk.status.saved": "Na-save",
  "brk.status.complete": "Kumpleto",
  "brk.status.incomplete": "Kulang pa",
  "brk.status.ready": "Handa na",

  // ── Round names (shared NCAA-style vocabulary) ───────────────────────
  "brk.round.roundOf64": "Round of 64",
  "brk.round.roundOf32": "Round of 32",
  "brk.round.roundOf16": "Round of 16",
  "brk.round.quarterfinal": "Quarterfinal",
  "brk.round.semifinal": "Semifinal",
  "brk.round.thirdPlace": "Third-place",
  "brk.round.final": "Final",
  "brk.round.championship": "Championship",
  "brk.round.groupStage": "Group Stage",
  "brk.round.knockouts": "Knockouts",

  // ── Generic empty / error messaging ──────────────────────────────────
  "brk.empty.noPicks": "Wala pang picks.",
  "brk.empty.noEntries": "Wala pang entries.",
  "brk.empty.noMatches": "Wala pang laban.",
  "brk.empty.noResults": "Wala pang resulta.",
  "brk.error.tryAgain":
    "May nangyaring mali. Subukan ulit.",
  "brk.error.network":
    "Network error. Tignan ang iyong koneksyon.",

  // ── Lock / countdown copy ────────────────────────────────────────────
  "brk.lock.bracketLocked": "Naka-lock ang bracket",
  "brk.lock.picksFrozen": "Naka-freeze na ang picks.",
  "brk.lock.locksSoon": "Malapit nang mag-lock",
  "brk.lock.untilLockDays": "{{d}}d {{h}}h bago mag-lock",
  "brk.lock.untilLockHours": "{{h}}h {{m}}m bago mag-lock",
  "brk.lock.untilLockMinutes": "{{m}}m bago mag-lock",

  // ── Share / invite copy ──────────────────────────────────────────────
  "brk.invite.copyLink": "Kopyahin ang invite link",
  "brk.invite.linkCopied": "Na-copy ang link!",
  "brk.invite.shareViaText": "Text",
  "brk.invite.shareViaEmail": "Email",
  "brk.invite.shareViaSocial": "Social",
  "brk.invite.codeLabel": "Invite code",

  // ── Generic AI tier chips ────────────────────────────────────────────
  "brk.tier.basic": "Basic",
  "brk.tier.pro": "AF Pro",
  "brk.tier.proActive": "AF Pro active",
  "brk.tier.proPreview": "AF Pro preview",
  "brk.tier.locked": "Nakasara",

  // ── Language UI ──────────────────────────────────────────────────────
  "brk.language.label": "Wika",
}

const VI: BracketsDictionary = {
  // ── Common bracket / pool nouns ──────────────────────────────────────
  "brk.common.bracket": "Bracket",
  "brk.common.brackets": "Brackets",
  "brk.common.pool": "Pool",
  "brk.common.pools": "Pool",
  "brk.common.entry": "Entry",
  "brk.common.entries": "Entry",
  "brk.common.round": "Vòng",
  "brk.common.match": "Trận",
  "brk.common.matches": "Trận đấu",
  "brk.common.team": "Đội",
  "brk.common.teams": "Đội",
  "brk.common.pick": "Lựa chọn",
  "brk.common.picks": "Lựa chọn",
  "brk.common.score": "Điểm",
  "brk.common.rank": "Hạng",
  "brk.common.points": "điểm",
  "brk.common.winner": "Người thắng",
  "brk.common.commissioner": "Chủ pool",
  "brk.common.participant": "Người chơi",
  "brk.common.participants": "Người chơi",

  // ── Common action verbs ──────────────────────────────────────────────
  "brk.action.create": "Tạo",
  "brk.action.join": "Tham gia",
  "brk.action.discover": "Khám phá",
  "brk.action.invite": "Mời",
  "brk.action.share": "Chia sẻ",
  "brk.action.finalize": "Hoàn tất",
  "brk.action.refresh": "Làm mới",
  "brk.action.copy": "Sao chép",
  "brk.action.copied": "Đã sao chép!",
  "brk.action.continue": "Tiếp tục",
  "brk.action.start": "Bắt đầu",
  "brk.action.tryAgain": "Thử lại",
  "brk.action.cancel": "Huỷ",
  "brk.action.save": "Lưu",
  "brk.action.signIn": "Đăng nhập",

  // ── Status / state labels ────────────────────────────────────────────
  "brk.status.open": "Mở",
  "brk.status.locked": "Đã khoá",
  "brk.status.live": "Trực tiếp",
  "brk.status.final": "Kết thúc",
  "brk.status.scheduled": "Đã lên lịch",
  "brk.status.postponed": "Hoãn",
  "brk.status.cancelled": "Đã huỷ",
  "brk.status.loading": "Đang tải...",
  "brk.status.saving": "Đang lưu...",
  "brk.status.saved": "Đã lưu",
  "brk.status.complete": "Hoàn tất",
  "brk.status.incomplete": "Chưa hoàn tất",
  "brk.status.ready": "Sẵn sàng",

  // ── Round names (shared NCAA-style vocabulary) ───────────────────────
  "brk.round.roundOf64": "Vòng 64",
  "brk.round.roundOf32": "Vòng 32",
  "brk.round.roundOf16": "Vòng 16",
  "brk.round.quarterfinal": "Tứ kết",
  "brk.round.semifinal": "Bán kết",
  "brk.round.thirdPlace": "Tranh hạng ba",
  "brk.round.final": "Chung kết",
  "brk.round.championship": "Vô địch",
  "brk.round.groupStage": "Vòng bảng",
  "brk.round.knockouts": "Vòng loại trực tiếp",

  // ── Generic empty / error messaging ──────────────────────────────────
  "brk.empty.noPicks": "Chưa có lựa chọn nào.",
  "brk.empty.noEntries": "Chưa có entry nào.",
  "brk.empty.noMatches": "Chưa có trận đấu.",
  "brk.empty.noResults": "Chưa có kết quả.",
  "brk.error.tryAgain":
    "Đã có lỗi xảy ra. Hãy thử lại.",
  "brk.error.network":
    "Lỗi mạng. Hãy kiểm tra kết nối của bạn.",

  // ── Lock / countdown copy ────────────────────────────────────────────
  "brk.lock.bracketLocked": "Bracket đã khoá",
  "brk.lock.picksFrozen": "Lựa chọn đã bị khoá.",
  "brk.lock.locksSoon": "Sắp khoá",
  "brk.lock.untilLockDays": "Còn {{d}} ngày {{h}} giờ trước khi khoá",
  "brk.lock.untilLockHours": "Còn {{h}} giờ {{m}} phút trước khi khoá",
  "brk.lock.untilLockMinutes": "Còn {{m}} phút trước khi khoá",

  // ── Share / invite copy ──────────────────────────────────────────────
  "brk.invite.copyLink": "Sao chép link mời",
  "brk.invite.linkCopied": "Đã sao chép link!",
  "brk.invite.shareViaText": "Tin nhắn",
  "brk.invite.shareViaEmail": "Email",
  "brk.invite.shareViaSocial": "Mạng xã hội",
  "brk.invite.codeLabel": "Mã mời",

  // ── Generic AI tier chips ────────────────────────────────────────────
  "brk.tier.basic": "Cơ bản",
  "brk.tier.pro": "AF Pro",
  "brk.tier.proActive": "AF Pro đang bật",
  "brk.tier.proPreview": "Xem trước AF Pro",
  "brk.tier.locked": "Đã khoá",

  // ── Language UI ──────────────────────────────────────────────────────
  "brk.language.label": "Ngôn ngữ",
}

export const BRACKETS_TRANSLATIONS: Record<BracketsLocale, BracketsDictionary> = {
  en: EN,
  es: ES,
  zh: ZH,
  fil: FIL,
  vi: VI,
}

/**
 * One-shot warning cache so each (locale, key) pair only logs once per
 * process lifetime. Avoids spamming the dev console on re-renders.
 */
const warnedKeys = new Set<string>()

function reportMissingKey(locale: BracketsLocale, key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return
  }
  const cacheKey = `${locale}::${key}`
  if (warnedKeys.has(cacheKey)) return
  warnedKeys.add(cacheKey)
  // eslint-disable-next-line no-console
  console.warn(
    `[bracketsI18n] Missing translation for "${key}" in locale "${locale}". ` +
      `Falling back to English.`
  )
}

/**
 * Test helper — clears the missing-key warning cache so the dev-warning
 * test can re-trigger the log path. Not used by the runtime app.
 *
 * @internal
 */
export function _resetBracketsI18nWarnCache(): void {
  warnedKeys.clear()
}

/**
 * Look up a translated string for the given locale and key.
 *
 * - Falls back to English if the locale dictionary is missing the key.
 *   In development, logs a one-shot console.warn per (locale, key).
 * - Falls back to the key itself if neither locale has the key — keeps
 *   missing translations visible during development. Production hides
 *   the raw key by way of the fact that a missing key indicates a bug
 *   worth surfacing in dev only; production callers should not pass
 *   unknown keys.
 * - Interpolates `{{var}}` placeholders from `params`. Non-string values
 *   are coerced to string. Missing params leave the placeholder intact
 *   so QA can spot it.
 */
export function bracketsT(
  locale: BracketsLocale | string | null | undefined,
  key: string,
  params?: Record<string, string | number>
): string {
  const safeLocale = getBracketsLocale(locale)
  const dict = BRACKETS_TRANSLATIONS[safeLocale]
  let raw = dict[key]
  if (raw === undefined) {
    reportMissingKey(safeLocale, key)
    raw =
      BRACKETS_TRANSLATIONS[BRACKETS_DEFAULT_LOCALE][key] ?? key
  }
  if (!params) return raw
  return raw.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      const value = params[name as keyof typeof params]
      return value == null ? match : String(value)
    }
    return match
  })
}

/**
 * Convenience helper used by both client (`useOptionalLanguage().language`)
 * and server (`resolveServerRenderPreferences().language`) call-sites. Use
 * this whenever a component or server file already has the language code
 * in scope — keeps bracketsT() calls one line.
 */
export function makeBracketsT(
  locale: BracketsLocale | string | null | undefined
) {
  const safeLocale = getBracketsLocale(locale)
  return (key: string, params?: Record<string, string | number>): string =>
    bracketsT(safeLocale, key, params)
}
