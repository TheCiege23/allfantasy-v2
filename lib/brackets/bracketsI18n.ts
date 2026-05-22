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

  // ── /brackets premium hub (Phase 7) ──────────────────────────────────
  "brk.hub.eyebrow": "AllFantasy",
  "brk.hub.heroTitle": "Bracket Pools",
  "brk.hub.heroSubtitle":
    "Create or join bracket pools for the FIFA World Cup, NBA & NHL playoffs, March Madness, NFL playoffs, and more. Free to play. AI analysis. Live leaderboards.",
  "brk.hub.heroBadge": "2026 World Cup pools are live",
  "brk.hub.heroCreateWc": "Create World Cup Pool",
  "brk.hub.heroJoinWithCode": "Join with code",
  "brk.hub.heroDiscover": "Discover public pools",
  "brk.hub.heroDashboard": "Dashboard",

  "brk.hub.spotlight.eyebrow": "Launching now",
  "brk.hub.spotlight.title": "2026 FIFA World Cup",
  "brk.hub.spotlight.subtitle":
    "The flagship bracket experience on AllFantasy. Build your bracket, compete with friends, and let our AI report grade your picks.",
  "brk.hub.spotlight.feature.groupStage": "Group stage picks",
  "brk.hub.spotlight.feature.knockoutBracket": "Knockout bracket",
  "brk.hub.spotlight.feature.aiReport": "AI Bracket Report",
  "brk.hub.spotlight.feature.dangerZones": "Knockout Danger Zones",
  "brk.hub.spotlight.feature.commissionerTools": "Commissioner tools",
  "brk.hub.spotlight.feature.inviteShare": "Invite + share tools",
  "brk.hub.spotlight.feature.fiveLanguages": "5-language support",

  "brk.hub.howItWorks.title": "How bracket pools work",
  "brk.hub.howItWorks.step1Title": "Create or join a pool",
  "brk.hub.howItWorks.step1Body":
    "Spin up a private pool for friends or a public pool anyone can discover — or jump into someone else's with an invite code.",
  "brk.hub.howItWorks.step2Title": "Make and finalize your picks",
  "brk.hub.howItWorks.step2Body":
    "Rank groups, pick knockout winners, and confirm your bracket. Edit anytime until pool lock.",
  "brk.hub.howItWorks.step3Title": "Track, compete, and share",
  "brk.hub.howItWorks.step3Body":
    "Follow live standings, get AI insights on your picks, and share your bracket report card.",

  "brk.hub.sports.title": "Sports",
  "brk.hub.sports.subtitle":
    "World Cup is live now. The rest of the season slate is on the way.",
  "brk.hub.sports.statusLive": "Live now",
  "brk.hub.sports.statusComingSoon": "Coming soon",
  "brk.hub.sports.openCta": "Open hub",
  "brk.hub.sports.sport.worldCup": "FIFA World Cup",
  "brk.hub.sports.sport.worldCup.desc":
    "Group stage, knockouts, champion pick, and full AI report card.",
  "brk.hub.sports.sport.nbaPlayoffs": "NBA Playoffs",
  "brk.hub.sports.sport.nbaPlayoffs.desc":
    "Bracket pool for the NBA postseason. Coming this season.",
  "brk.hub.sports.sport.nhlPlayoffs": "NHL Playoffs",
  "brk.hub.sports.sport.nhlPlayoffs.desc":
    "Stanley Cup bracket pool. Coming this season.",
  "brk.hub.sports.sport.nflPlayoffs": "NFL Playoffs",
  "brk.hub.sports.sport.nflPlayoffs.desc":
    "Wild-card to Super Bowl bracket pool. Coming this winter.",
  "brk.hub.sports.sport.mlbPostseason": "MLB Postseason",
  "brk.hub.sports.sport.mlbPostseason.desc":
    "Postseason bracket pool. Coming this fall.",
  "brk.hub.sports.sport.marchMadness": "March Madness",
  "brk.hub.sports.sport.marchMadness.desc":
    "NCAA tournament bracket pool. Coming next spring.",
  "brk.hub.sports.sport.collegeFootball": "College Football",
  "brk.hub.sports.sport.collegeFootball.desc":
    "CFP bracket pool. Coming this winter.",
  "brk.hub.sports.sport.soccer": "Soccer",
  "brk.hub.sports.sport.soccer.desc":
    "Champions League, Euros, and Copa América brackets. Coming soon.",

  "brk.hub.features.title": "Built-in AI + commissioner tools",
  "brk.hub.features.aiReport": "AI Bracket Report",
  "brk.hub.features.aiReport.desc":
    "Letter grade, champion confidence, win probability, and what makes your bracket unique.",
  "brk.hub.features.rooting": "Rooting Guide",
  "brk.hub.features.rooting.desc":
    "Daily \"who should I root for?\" recommendation from your own picks.",
  "brk.hub.features.danger": "Knockout Danger Zones",
  "brk.hub.features.danger.desc":
    "Deterministic flags on at-risk picks before each round kicks off.",
  "brk.hub.features.commissioner": "Commissioner Brain",
  "brk.hub.features.commissioner.desc":
    "Member completion checklist, reminder text, hype copy, and post-round recaps.",
  "brk.hub.features.share": "Share cards + social captions",
  "brk.hub.features.share.desc":
    "Copy-ready post text for Text / Email / Twitter / Instagram / Discord.",
  "brk.hub.features.leaderboards": "Live leaderboards",
  "brk.hub.features.leaderboards.desc":
    "Per-bracket ranking, per-round breakdown, and possible-points-remaining tracker.",

  "brk.hub.footer.note":
    "AllFantasy · Free forever · No prizes · Bracket pools for entertainment",

  "brk.hub.mascotAlt": "AllFantasy mascot",
  "brk.hub.logoAlt": "AllFantasy",
  "brk.hub.wcLogoAlt": "AllFantasy World Cup",

  // ── /brackets premium hub v2 — centered WC challenge hero ────────────
  "brk.hub.v2.regBadge": "2026 FIFA World Cup · Registration Open",
  "brk.hub.v2.titleLine1": "AF World Cup",
  "brk.hub.v2.titleLine2": "Bracket Challenge",
  "brk.hub.v2.subtitle":
    "32 nations. 48 matches. One champion. Pick every game before kickoff and compete in your own pool — with AI analysis on every matchup. Free forever.",
  "brk.hub.v2.feature.teams": "32 Teams",
  "brk.hub.v2.feature.matches": "48 Matches",
  "brk.hub.v2.feature.format": "Group Stage + Knockouts",
  "brk.hub.v2.feature.free": "100% Free",
  "brk.hub.v2.cta.openBracket": "World Cup Bracket",
  "brk.hub.v2.cta.createPool": "Create Pool",
  "brk.hub.v2.cta.discoverPools": "Discover Pools",
  "brk.hub.v2.fanLine": "Join thousands of fans competing worldwide",
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

  // ── /brackets premium hub (Phase 7) ──────────────────────────────────
  "brk.hub.eyebrow": "AllFantasy",
  "brk.hub.heroTitle": "Bracket Pools",
  "brk.hub.heroSubtitle":
    "Crea o únete a grupos de brackets de la Copa del Mundo de la FIFA, playoffs de NBA y NHL, March Madness, playoffs de NFL y más. Gratis para jugar. Análisis con IA. Tablas en vivo.",
  "brk.hub.heroBadge": "Los grupos de la Copa del Mundo 2026 ya están abiertos",
  "brk.hub.heroCreateWc": "Crear grupo de la Copa del Mundo",
  "brk.hub.heroJoinWithCode": "Unirse con código",
  "brk.hub.heroDiscover": "Descubrir grupos públicos",
  "brk.hub.heroDashboard": "Panel",

  "brk.hub.spotlight.eyebrow": "Lanzamiento",
  "brk.hub.spotlight.title": "Copa Mundial FIFA 2026",
  "brk.hub.spotlight.subtitle":
    "La experiencia bracket insignia de AllFantasy. Arma tu bracket, compite con amigos y deja que nuestro informe IA califique tus picks.",
  "brk.hub.spotlight.feature.groupStage": "Picks de fase de grupos",
  "brk.hub.spotlight.feature.knockoutBracket": "Bracket de eliminatorias",
  "brk.hub.spotlight.feature.aiReport": "Informe IA del Bracket",
  "brk.hub.spotlight.feature.dangerZones": "Zonas de peligro de eliminatorias",
  "brk.hub.spotlight.feature.commissionerTools": "Herramientas de comisionado",
  "brk.hub.spotlight.feature.inviteShare": "Invitar y compartir",
  "brk.hub.spotlight.feature.fiveLanguages": "Soporte en 5 idiomas",

  "brk.hub.howItWorks.title": "Cómo funcionan los grupos",
  "brk.hub.howItWorks.step1Title": "Crea o únete a un grupo",
  "brk.hub.howItWorks.step1Body":
    "Crea un grupo privado para amigos, uno público que cualquiera pueda descubrir, o únete a otro con un código de invitación.",
  "brk.hub.howItWorks.step2Title": "Haz y finaliza tus picks",
  "brk.hub.howItWorks.step2Body":
    "Ordena grupos, elige ganadores de eliminatorias y confirma tu bracket. Edita en cualquier momento hasta el cierre.",
  "brk.hub.howItWorks.step3Title": "Sigue, compite y comparte",
  "brk.hub.howItWorks.step3Body":
    "Sigue tablas en vivo, recibe ideas IA sobre tus picks y comparte tu informe del bracket.",

  "brk.hub.sports.title": "Deportes",
  "brk.hub.sports.subtitle":
    "La Copa del Mundo está en vivo. El resto del calendario llega pronto.",
  "brk.hub.sports.statusLive": "En vivo",
  "brk.hub.sports.statusComingSoon": "Próximamente",
  "brk.hub.sports.openCta": "Abrir hub",
  "brk.hub.sports.sport.worldCup": "Copa Mundial FIFA",
  "brk.hub.sports.sport.worldCup.desc":
    "Fase de grupos, eliminatorias, pick de campeón e informe IA completo.",
  "brk.hub.sports.sport.nbaPlayoffs": "Playoffs NBA",
  "brk.hub.sports.sport.nbaPlayoffs.desc":
    "Grupo bracket para la postemporada NBA. Llega esta temporada.",
  "brk.hub.sports.sport.nhlPlayoffs": "Playoffs NHL",
  "brk.hub.sports.sport.nhlPlayoffs.desc":
    "Grupo bracket de la Copa Stanley. Llega esta temporada.",
  "brk.hub.sports.sport.nflPlayoffs": "Playoffs NFL",
  "brk.hub.sports.sport.nflPlayoffs.desc":
    "Grupo bracket desde wild-card hasta Super Bowl. Llega este invierno.",
  "brk.hub.sports.sport.mlbPostseason": "Postemporada MLB",
  "brk.hub.sports.sport.mlbPostseason.desc":
    "Grupo bracket de la postemporada. Llega este otoño.",
  "brk.hub.sports.sport.marchMadness": "March Madness",
  "brk.hub.sports.sport.marchMadness.desc":
    "Grupo bracket del torneo NCAA. Llega la próxima primavera.",
  "brk.hub.sports.sport.collegeFootball": "Fútbol americano universitario",
  "brk.hub.sports.sport.collegeFootball.desc":
    "Grupo bracket CFP. Llega este invierno.",
  "brk.hub.sports.sport.soccer": "Fútbol",
  "brk.hub.sports.sport.soccer.desc":
    "Champions League, Eurocopa y Copa América. Próximamente.",

  "brk.hub.features.title": "Herramientas IA y de comisionado integradas",
  "brk.hub.features.aiReport": "Informe IA del Bracket",
  "brk.hub.features.aiReport.desc":
    "Calificación, confianza del campeón, probabilidad de victoria y qué hace único tu bracket.",
  "brk.hub.features.rooting": "Guía de a quién apoyar",
  "brk.hub.features.rooting.desc":
    "Recomendación diaria de a quién apoyar a partir de tus propios picks.",
  "brk.hub.features.danger": "Zonas de peligro de eliminatorias",
  "brk.hub.features.danger.desc":
    "Alertas deterministas sobre picks en riesgo antes de cada ronda.",
  "brk.hub.features.commissioner": "Cerebro de comisionado",
  "brk.hub.features.commissioner.desc":
    "Checklist de avance, mensajes de recordatorio, hype y recaps por ronda.",
  "brk.hub.features.share": "Tarjetas para compartir y captions",
  "brk.hub.features.share.desc":
    "Texto listo para SMS, email, Twitter, Instagram y Discord.",
  "brk.hub.features.leaderboards": "Tablas en vivo",
  "brk.hub.features.leaderboards.desc":
    "Ranking por bracket, desglose por ronda y puntos posibles restantes.",

  "brk.hub.footer.note":
    "AllFantasy · Gratis para siempre · Sin premios · Bracket pools solo para entretenimiento",

  "brk.hub.mascotAlt": "Mascota de AllFantasy",
  "brk.hub.logoAlt": "AllFantasy",
  "brk.hub.wcLogoAlt": "AllFantasy Copa del Mundo",

  // ── /brackets premium hub v2 — centered WC challenge hero ────────────
  "brk.hub.v2.regBadge":
    "Copa Mundial FIFA 2026 · Inscripciones abiertas",
  "brk.hub.v2.titleLine1": "AF Copa del Mundo",
  "brk.hub.v2.titleLine2": "Desafío de Brackets",
  "brk.hub.v2.subtitle":
    "32 selecciones. 48 partidos. Un campeón. Elige cada partido antes del pitazo inicial y compite en tu propio grupo — con análisis IA en cada partido. Gratis para siempre.",
  "brk.hub.v2.feature.teams": "32 selecciones",
  "brk.hub.v2.feature.matches": "48 partidos",
  "brk.hub.v2.feature.format": "Fase de grupos + Eliminatorias",
  "brk.hub.v2.feature.free": "100% gratis",
  "brk.hub.v2.cta.openBracket": "Abrir Bracket de la Copa",
  "brk.hub.v2.cta.createPool": "Crear grupo",
  "brk.hub.v2.cta.discoverPools": "Descubrir grupos",
  "brk.hub.v2.fanLine":
    "Únete a miles de fans que compiten en el mundo entero",
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

  // ── /brackets premium hub (Phase 7) ──────────────────────────────────
  "brk.hub.eyebrow": "AllFantasy",
  "brk.hub.heroTitle": "對戰群組",
  "brk.hub.heroSubtitle":
    "為 FIFA 世界盃、NBA 與 NHL 季後賽、March Madness、NFL 季後賽等比賽建立或加入對戰群組。免費遊玩、AI 解析、即時排行榜。",
  "brk.hub.heroBadge": "2026 世界盃群組已開放",
  "brk.hub.heroCreateWc": "建立世界盃群組",
  "brk.hub.heroJoinWithCode": "用代碼加入",
  "brk.hub.heroDiscover": "探索公開群組",
  "brk.hub.heroDashboard": "儀表板",

  "brk.hub.spotlight.eyebrow": "重磅推出",
  "brk.hub.spotlight.title": "2026 FIFA 世界盃",
  "brk.hub.spotlight.subtitle":
    "AllFantasy 的旗艦對戰體驗。建立你的對戰表、和朋友較量,讓 AI 報告為你評分。",
  "brk.hub.spotlight.feature.groupStage": "小組賽選擇",
  "brk.hub.spotlight.feature.knockoutBracket": "淘汰賽對戰表",
  "brk.hub.spotlight.feature.aiReport": "AI 對戰表報告",
  "brk.hub.spotlight.feature.dangerZones": "淘汰賽風險區",
  "brk.hub.spotlight.feature.commissionerTools": "管理員工具",
  "brk.hub.spotlight.feature.inviteShare": "邀請與分享工具",
  "brk.hub.spotlight.feature.fiveLanguages": "支援 5 種語言",

  "brk.hub.howItWorks.title": "對戰群組怎麼玩",
  "brk.hub.howItWorks.step1Title": "建立或加入群組",
  "brk.hub.howItWorks.step1Body":
    "為朋友建立私人群組、開放公開群組讓任何人加入,或用邀請碼加入別人的群組。",
  "brk.hub.howItWorks.step2Title": "做出並送出你的選擇",
  "brk.hub.howItWorks.step2Body":
    "排序小組、選出淘汰賽勝者、確認你的對戰表。鎖定前隨時可以調整。",
  "brk.hub.howItWorks.step3Title": "追蹤、比拼、分享",
  "brk.hub.howItWorks.step3Body":
    "追蹤即時排行榜、獲得 AI 對選擇的解析,並分享你的對戰表報告。",

  "brk.hub.sports.title": "支援的賽事",
  "brk.hub.sports.subtitle":
    "世界盃已經開放。其餘賽事也即將推出。",
  "brk.hub.sports.statusLive": "進行中",
  "brk.hub.sports.statusComingSoon": "即將推出",
  "brk.hub.sports.openCta": "開啟主頁",
  "brk.hub.sports.sport.worldCup": "FIFA 世界盃",
  "brk.hub.sports.sport.worldCup.desc":
    "小組賽、淘汰賽、冠軍選擇,以及完整的 AI 報告卡。",
  "brk.hub.sports.sport.nbaPlayoffs": "NBA 季後賽",
  "brk.hub.sports.sport.nbaPlayoffs.desc":
    "NBA 季後賽對戰群組。本季推出。",
  "brk.hub.sports.sport.nhlPlayoffs": "NHL 季後賽",
  "brk.hub.sports.sport.nhlPlayoffs.desc":
    "史丹利盃對戰群組。本季推出。",
  "brk.hub.sports.sport.nflPlayoffs": "NFL 季後賽",
  "brk.hub.sports.sport.nflPlayoffs.desc":
    "從外卡賽到超級盃的對戰群組。今冬推出。",
  "brk.hub.sports.sport.mlbPostseason": "MLB 季後賽",
  "brk.hub.sports.sport.mlbPostseason.desc":
    "MLB 季後賽對戰群組。今秋推出。",
  "brk.hub.sports.sport.marchMadness": "瘋狂三月",
  "brk.hub.sports.sport.marchMadness.desc":
    "NCAA 錦標賽對戰群組。明年春天推出。",
  "brk.hub.sports.sport.collegeFootball": "大學美式足球",
  "brk.hub.sports.sport.collegeFootball.desc":
    "CFP 對戰群組。今冬推出。",
  "brk.hub.sports.sport.soccer": "足球",
  "brk.hub.sports.sport.soccer.desc":
    "歐冠、歐錦賽與美洲盃對戰群組。即將推出。",

  "brk.hub.features.title": "內建 AI 與管理員工具",
  "brk.hub.features.aiReport": "AI 對戰表報告",
  "brk.hub.features.aiReport.desc":
    "字母評分、冠軍信心度、奪冠機率,以及讓你的對戰表獨特的關鍵。",
  "brk.hub.features.rooting": "幫誰加油指南",
  "brk.hub.features.rooting.desc":
    "每日從你自己的選擇推薦該為誰加油。",
  "brk.hub.features.danger": "淘汰賽風險區",
  "brk.hub.features.danger.desc":
    "在每輪開賽前對風險選擇做出確定性提示。",
  "brk.hub.features.commissioner": "管理員大腦",
  "brk.hub.features.commissioner.desc":
    "成員完成度清單、提醒文案、加油文案與每輪賽後回顧。",
  "brk.hub.features.share": "分享圖卡與社群文案",
  "brk.hub.features.share.desc":
    "可一鍵複製的簡訊、Email、Twitter、Instagram 與 Discord 文案。",
  "brk.hub.features.leaderboards": "即時排行榜",
  "brk.hub.features.leaderboards.desc":
    "每個對戰表的排名、每輪細項與剩餘可獲得分數。",

  "brk.hub.footer.note":
    "AllFantasy · 永久免費 · 無獎金 · 對戰群組僅供娛樂",

  "brk.hub.mascotAlt": "AllFantasy 吉祥物",
  "brk.hub.logoAlt": "AllFantasy",
  "brk.hub.wcLogoAlt": "AllFantasy 世界盃",

  // ── /brackets premium hub v2 — centered WC challenge hero ────────────
  "brk.hub.v2.regBadge": "2026 FIFA 世界盃 · 報名開放中",
  "brk.hub.v2.titleLine1": "AF 世界盃",
  "brk.hub.v2.titleLine2": "對戰挑戰",
  "brk.hub.v2.subtitle":
    "32 個國家。48 場比賽。一位冠軍。在開球前選好每一場、和你自己的群組一較高下 — 每場比賽都有 AI 解析。永久免費。",
  "brk.hub.v2.feature.teams": "32 個國家",
  "brk.hub.v2.feature.matches": "48 場比賽",
  "brk.hub.v2.feature.format": "小組賽 + 淘汰賽",
  "brk.hub.v2.feature.free": "100% 免費",
  "brk.hub.v2.cta.openBracket": "開啟世界盃對戰",
  "brk.hub.v2.cta.createPool": "建立群組",
  "brk.hub.v2.cta.discoverPools": "探索群組",
  "brk.hub.v2.fanLine":
    "加入全球數千名球迷一起競賽",
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

  // ── /brackets premium hub (Phase 7) ──────────────────────────────────
  "brk.hub.eyebrow": "AllFantasy",
  "brk.hub.heroTitle": "Bracket Pools",
  "brk.hub.heroSubtitle":
    "Gumawa o sumali sa bracket pools para sa FIFA World Cup, NBA & NHL playoffs, March Madness, NFL playoffs at iba pa. Libre laruin. AI analysis. Live na leaderboards.",
  "brk.hub.heroBadge": "Bukas na ang 2026 World Cup pools",
  "brk.hub.heroCreateWc": "Gumawa ng World Cup pool",
  "brk.hub.heroJoinWithCode": "Sumali gamit ang code",
  "brk.hub.heroDiscover": "Maghanap ng public pools",
  "brk.hub.heroDashboard": "Dashboard",

  "brk.hub.spotlight.eyebrow": "Inilulunsad ngayon",
  "brk.hub.spotlight.title": "2026 FIFA World Cup",
  "brk.hub.spotlight.subtitle":
    "Ang pangunahing bracket experience ng AllFantasy. Bumuo ng iyong bracket, makipagtagisan sa mga kaibigan, at hayaang i-grade ng AI report ang iyong picks.",
  "brk.hub.spotlight.feature.groupStage": "Picks sa group stage",
  "brk.hub.spotlight.feature.knockoutBracket": "Knockout bracket",
  "brk.hub.spotlight.feature.aiReport": "AI Bracket Report",
  "brk.hub.spotlight.feature.dangerZones": "Knockout Danger Zones",
  "brk.hub.spotlight.feature.commissionerTools": "Commissioner tools",
  "brk.hub.spotlight.feature.inviteShare": "Invite at share tools",
  "brk.hub.spotlight.feature.fiveLanguages": "Suporta sa 5 wika",

  "brk.hub.howItWorks.title": "Paano gumagana ang bracket pools",
  "brk.hub.howItWorks.step1Title": "Gumawa o sumali sa pool",
  "brk.hub.howItWorks.step1Body":
    "Gumawa ng private pool para sa mga kaibigan, isang public pool na pwedeng makita ng kahit sino, o sumali sa iba gamit ang invite code.",
  "brk.hub.howItWorks.step2Title": "Mag-pick at i-finalize",
  "brk.hub.howItWorks.step2Body":
    "I-rank ang mga group, pumili ng knockout winners, at i-confirm ang bracket mo. Maaari pang i-edit hanggang mag-lock ang pool.",
  "brk.hub.howItWorks.step3Title": "I-track, makipagtagisan, mag-share",
  "brk.hub.howItWorks.step3Body":
    "Sundan ang live na leaderboard, kunin ang AI insights sa iyong picks, at i-share ang iyong bracket report card.",

  "brk.hub.sports.title": "Mga sport",
  "brk.hub.sports.subtitle":
    "Live na ang World Cup. Susunod na ang ibang sports sa season.",
  "brk.hub.sports.statusLive": "Live na",
  "brk.hub.sports.statusComingSoon": "Malapit na",
  "brk.hub.sports.openCta": "Buksan ang hub",
  "brk.hub.sports.sport.worldCup": "FIFA World Cup",
  "brk.hub.sports.sport.worldCup.desc":
    "Group stage, knockouts, champion pick, at buong AI report card.",
  "brk.hub.sports.sport.nbaPlayoffs": "NBA Playoffs",
  "brk.hub.sports.sport.nbaPlayoffs.desc":
    "Bracket pool para sa NBA postseason. Darating ngayong season.",
  "brk.hub.sports.sport.nhlPlayoffs": "NHL Playoffs",
  "brk.hub.sports.sport.nhlPlayoffs.desc":
    "Stanley Cup bracket pool. Darating ngayong season.",
  "brk.hub.sports.sport.nflPlayoffs": "NFL Playoffs",
  "brk.hub.sports.sport.nflPlayoffs.desc":
    "Bracket pool mula wild-card hanggang Super Bowl. Darating ngayong taglamig.",
  "brk.hub.sports.sport.mlbPostseason": "MLB Postseason",
  "brk.hub.sports.sport.mlbPostseason.desc":
    "Bracket pool para sa postseason. Darating ngayong taglagas.",
  "brk.hub.sports.sport.marchMadness": "March Madness",
  "brk.hub.sports.sport.marchMadness.desc":
    "NCAA tournament bracket pool. Darating sa susunod na tagsibol.",
  "brk.hub.sports.sport.collegeFootball": "College Football",
  "brk.hub.sports.sport.collegeFootball.desc":
    "CFP bracket pool. Darating ngayong taglamig.",
  "brk.hub.sports.sport.soccer": "Soccer",
  "brk.hub.sports.sport.soccer.desc":
    "Champions League, Euros, at Copa América brackets. Malapit na.",

  "brk.hub.features.title": "Built-in AI at commissioner tools",
  "brk.hub.features.aiReport": "AI Bracket Report",
  "brk.hub.features.aiReport.desc":
    "Letter grade, champion confidence, win probability, at kung ano ang nag-pa-unique sa bracket mo.",
  "brk.hub.features.rooting": "Rooting Guide",
  "brk.hub.features.rooting.desc":
    "Pang-araw na rekomendasyon kung sino ang i-root for galing sa iyong picks.",
  "brk.hub.features.danger": "Knockout Danger Zones",
  "brk.hub.features.danger.desc":
    "Deterministic na flags sa at-risk na picks bago magsimula ang bawat round.",
  "brk.hub.features.commissioner": "Commissioner Brain",
  "brk.hub.features.commissioner.desc":
    "Member completion checklist, reminder text, hype copy, at post-round recaps.",
  "brk.hub.features.share": "Share cards at social captions",
  "brk.hub.features.share.desc":
    "Copy-ready text para sa Text, Email, Twitter, Instagram, at Discord.",
  "brk.hub.features.leaderboards": "Live na leaderboards",
  "brk.hub.features.leaderboards.desc":
    "Per-bracket ranking, per-round breakdown, at possible-points-remaining tracker.",

  "brk.hub.footer.note":
    "AllFantasy · Libre habambuhay · Walang premyo · Bracket pools para sa libangan lamang",

  "brk.hub.mascotAlt": "Mascot ng AllFantasy",
  "brk.hub.logoAlt": "AllFantasy",
  "brk.hub.wcLogoAlt": "AllFantasy World Cup",

  // ── /brackets premium hub v2 — centered WC challenge hero ────────────
  "brk.hub.v2.regBadge":
    "2026 FIFA World Cup · Bukas na ang registration",
  "brk.hub.v2.titleLine1": "AF World Cup",
  "brk.hub.v2.titleLine2": "Bracket Challenge",
  "brk.hub.v2.subtitle":
    "32 bansa. 48 laban. Isang kampeon. Pumili sa bawat laban bago mag-kickoff at makipagtagisan sa sarili mong pool — may AI analysis sa bawat matchup. Libre habambuhay.",
  "brk.hub.v2.feature.teams": "32 bansa",
  "brk.hub.v2.feature.matches": "48 laban",
  "brk.hub.v2.feature.format": "Group Stage + Knockouts",
  "brk.hub.v2.feature.free": "100% libre",
  "brk.hub.v2.cta.openBracket": "World Cup Bracket",
  "brk.hub.v2.cta.createPool": "Gumawa ng pool",
  "brk.hub.v2.cta.discoverPools": "Maghanap ng pools",
  "brk.hub.v2.fanLine":
    "Sumali sa libu-libong fans na nagkokompetensya sa buong mundo",
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

  // ── /brackets premium hub (Phase 7) ──────────────────────────────────
  "brk.hub.eyebrow": "AllFantasy",
  "brk.hub.heroTitle": "Bracket Pools",
  "brk.hub.heroSubtitle":
    "Tạo hoặc tham gia bracket pools cho FIFA World Cup, NBA & NHL playoffs, March Madness, NFL playoffs và nhiều giải khác. Miễn phí. Phân tích AI. Bảng xếp hạng trực tiếp.",
  "brk.hub.heroBadge": "Pool World Cup 2026 đã mở",
  "brk.hub.heroCreateWc": "Tạo pool World Cup",
  "brk.hub.heroJoinWithCode": "Tham gia bằng mã",
  "brk.hub.heroDiscover": "Khám phá pool công khai",
  "brk.hub.heroDashboard": "Bảng điều khiển",

  "brk.hub.spotlight.eyebrow": "Ra mắt ngay",
  "brk.hub.spotlight.title": "FIFA World Cup 2026",
  "brk.hub.spotlight.subtitle":
    "Trải nghiệm bracket chủ lực của AllFantasy. Xây bracket, đua với bạn bè, và để báo cáo AI chấm điểm lựa chọn của bạn.",
  "brk.hub.spotlight.feature.groupStage": "Lựa chọn vòng bảng",
  "brk.hub.spotlight.feature.knockoutBracket": "Bracket vòng loại trực tiếp",
  "brk.hub.spotlight.feature.aiReport": "Báo cáo AI Bracket",
  "brk.hub.spotlight.feature.dangerZones": "Khu vực nguy hiểm vòng loại trực tiếp",
  "brk.hub.spotlight.feature.commissionerTools": "Công cụ chủ pool",
  "brk.hub.spotlight.feature.inviteShare": "Mời và chia sẻ",
  "brk.hub.spotlight.feature.fiveLanguages": "Hỗ trợ 5 ngôn ngữ",

  "brk.hub.howItWorks.title": "Cách bracket pools hoạt động",
  "brk.hub.howItWorks.step1Title": "Tạo hoặc tham gia một pool",
  "brk.hub.howItWorks.step1Body":
    "Tạo pool riêng cho bạn bè, pool công khai ai cũng tìm thấy, hoặc tham gia pool của người khác bằng mã mời.",
  "brk.hub.howItWorks.step2Title": "Chọn và hoàn tất bracket",
  "brk.hub.howItWorks.step2Body":
    "Xếp hạng các bảng, chọn người thắng vòng loại trực tiếp, và xác nhận bracket. Có thể chỉnh sửa bất kỳ lúc nào trước khi pool khoá.",
  "brk.hub.howItWorks.step3Title": "Theo dõi, thi đấu, chia sẻ",
  "brk.hub.howItWorks.step3Body":
    "Theo dõi bảng xếp hạng trực tiếp, nhận phân tích AI cho lựa chọn của bạn, và chia sẻ thẻ báo cáo bracket.",

  "brk.hub.sports.title": "Các môn",
  "brk.hub.sports.subtitle":
    "World Cup đã mở. Các môn khác sẽ ra mắt sau.",
  "brk.hub.sports.statusLive": "Đang mở",
  "brk.hub.sports.statusComingSoon": "Sắp ra mắt",
  "brk.hub.sports.openCta": "Mở hub",
  "brk.hub.sports.sport.worldCup": "FIFA World Cup",
  "brk.hub.sports.sport.worldCup.desc":
    "Vòng bảng, vòng loại trực tiếp, lựa chọn nhà vô địch và thẻ báo cáo AI đầy đủ.",
  "brk.hub.sports.sport.nbaPlayoffs": "NBA Playoffs",
  "brk.hub.sports.sport.nbaPlayoffs.desc":
    "Pool bracket cho hậu mùa NBA. Sẽ có trong mùa này.",
  "brk.hub.sports.sport.nhlPlayoffs": "NHL Playoffs",
  "brk.hub.sports.sport.nhlPlayoffs.desc":
    "Pool bracket Stanley Cup. Sẽ có trong mùa này.",
  "brk.hub.sports.sport.nflPlayoffs": "NFL Playoffs",
  "brk.hub.sports.sport.nflPlayoffs.desc":
    "Pool bracket từ wild-card đến Super Bowl. Sẽ có vào mùa đông này.",
  "brk.hub.sports.sport.mlbPostseason": "MLB Postseason",
  "brk.hub.sports.sport.mlbPostseason.desc":
    "Pool bracket hậu mùa. Sẽ có vào mùa thu này.",
  "brk.hub.sports.sport.marchMadness": "March Madness",
  "brk.hub.sports.sport.marchMadness.desc":
    "Pool bracket giải NCAA. Sẽ có vào mùa xuân năm sau.",
  "brk.hub.sports.sport.collegeFootball": "College Football",
  "brk.hub.sports.sport.collegeFootball.desc":
    "Pool bracket CFP. Sẽ có vào mùa đông này.",
  "brk.hub.sports.sport.soccer": "Bóng đá",
  "brk.hub.sports.sport.soccer.desc":
    "Champions League, Euros và Copa América. Sắp có.",

  "brk.hub.features.title": "Công cụ AI và chủ pool tích hợp sẵn",
  "brk.hub.features.aiReport": "Báo cáo AI Bracket",
  "brk.hub.features.aiReport.desc":
    "Điểm chữ, niềm tin nhà vô địch, xác suất thắng, và điều khiến bracket của bạn khác biệt.",
  "brk.hub.features.rooting": "Hướng dẫn cổ vũ",
  "brk.hub.features.rooting.desc":
    "Gợi ý hằng ngày nên cổ vũ ai dựa trên lựa chọn của bạn.",
  "brk.hub.features.danger": "Khu vực nguy hiểm vòng loại trực tiếp",
  "brk.hub.features.danger.desc":
    "Cảnh báo xác định cho các lựa chọn có rủi ro trước mỗi vòng đấu.",
  "brk.hub.features.commissioner": "Bộ não chủ pool",
  "brk.hub.features.commissioner.desc":
    "Danh sách hoàn tất của thành viên, lời nhắc, lời hype, và tóm tắt sau mỗi vòng.",
  "brk.hub.features.share": "Thẻ chia sẻ và caption mạng xã hội",
  "brk.hub.features.share.desc":
    "Văn bản sẵn để sao chép cho Tin nhắn, Email, Twitter, Instagram và Discord.",
  "brk.hub.features.leaderboards": "Bảng xếp hạng trực tiếp",
  "brk.hub.features.leaderboards.desc":
    "Xếp hạng từng bracket, chi tiết theo vòng, và bộ đếm điểm còn lại.",

  "brk.hub.footer.note":
    "AllFantasy · Miễn phí vĩnh viễn · Không giải thưởng · Bracket pools chỉ để giải trí",

  "brk.hub.mascotAlt": "Linh vật AllFantasy",
  "brk.hub.logoAlt": "AllFantasy",
  "brk.hub.wcLogoAlt": "AllFantasy World Cup",

  // ── /brackets premium hub v2 — centered WC challenge hero ────────────
  "brk.hub.v2.regBadge":
    "FIFA World Cup 2026 · Đăng ký đã mở",
  "brk.hub.v2.titleLine1": "AF World Cup",
  "brk.hub.v2.titleLine2": "Thử thách Bracket",
  "brk.hub.v2.subtitle":
    "32 đội tuyển. 48 trận đấu. Một nhà vô địch. Chọn từng trận trước giờ bóng lăn và thi đấu trong pool của bạn — có phân tích AI cho mỗi trận. Miễn phí mãi mãi.",
  "brk.hub.v2.feature.teams": "32 đội tuyển",
  "brk.hub.v2.feature.matches": "48 trận",
  "brk.hub.v2.feature.format": "Vòng bảng + Vòng loại trực tiếp",
  "brk.hub.v2.feature.free": "Miễn phí 100%",
  "brk.hub.v2.cta.openBracket": "Mở Bracket World Cup",
  "brk.hub.v2.cta.createPool": "Tạo pool",
  "brk.hub.v2.cta.discoverPools": "Khám phá pool",
  "brk.hub.v2.fanLine":
    "Tham gia hàng nghìn người hâm mộ trên toàn thế giới",
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
