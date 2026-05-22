/**
 * worldCupI18n.ts
 *
 * World Cup-scoped translation dictionary. Reuses the existing app-wide
 * language preference (cookie `af_lang` + localStorage + user profile)
 * resolved via `useOptionalLanguage()` on the client and
 * `resolveServerRenderPreferences()` on the server.
 *
 * Why a separate dictionary instead of folding into lib/i18n/translations.ts:
 *  - The main translations bundle is already 4400+ lines; bundling ~100
 *    World Cup-only keys for every page (login, dashboard, draft, etc.)
 *    would inflate first-load JS for non-WC users.
 *  - WC keys are co-located with the rest of the WC code, easier to keep
 *    in sync as cards evolve.
 *
 * Hydration safety:
 *  - The current locale comes from useOptionalLanguage(), which itself
 *    reads from <html data-lang="..."> set by the server-side language
 *    init script. SSR HTML and the first client render see the same
 *    locale → no React #425/#418 risk.
 *  - On the server, resolveServerRenderPreferences() returns "en"/"es"
 *    from cookie or user profile; same value is rendered on first CSR.
 *
 * Scope:
 *  - English ("en") + Spanish ("es") only for now.
 *  - Unknown keys fall back to the key string (debuggable in devtools).
 *  - Unknown locales fall back to "en".
 *
 * Safety properties verified by tests:
 *  - No values contain email addresses, user IDs, or wagering / betting
 *    language.
 *  - Placeholder syntax `{{name}}` is interpolated.
 */
export type WorldCupLocale = "en" | "es"

export const WORLD_CUP_SUPPORTED_LOCALES: WorldCupLocale[] = ["en", "es"]
export const WORLD_CUP_DEFAULT_LOCALE: WorldCupLocale = "en"

/**
 * Normalize an arbitrary string / null / undefined into a supported World
 * Cup locale. Mirrors lib/i18n/constants.ts resolveLanguage so the WC
 * helper accepts every code the app-wide system can emit.
 */
export function getWorldCupLocale(input: unknown): WorldCupLocale {
  if (input === "es") return "es"
  if (input === "en") return "en"
  // Accept all other app-wide codes by mapping non-es to en.
  if (input === "zh" || input === "fil" || input === "vi") return "en"
  return WORLD_CUP_DEFAULT_LOCALE
}

type WorldCupDictionary = Record<string, string>

const EN: WorldCupDictionary = {
  // ── Shared / shell ───────────────────────────────────────────────────
  "wc.common.loading": "Loading...",
  "wc.common.back": "Back",
  "wc.common.openSettings": "Open settings",
  "wc.common.signIn": "Sign in",
  "wc.common.signOut": "Sign out",

  // ── Public hub: /brackets/world-cup ──────────────────────────────────
  "wc.publicHub.backToBrackets": "← Back to Brackets",
  "wc.publicHub.heroTitle": "World Cup Bracket Challenge",
  "wc.publicHub.heroSubtitle":
    "Create an NCAA-style bracket pool for the FIFA World Cup. Invite friends, make picks, track live scores, and climb the leaderboard.",
  "wc.publicHub.discover": "Discover public pools",
  "wc.publicHub.joinWithCode": "Join with Invite Code",
  "wc.publicHub.createPool": "Create Pool",
  "wc.publicHub.createWorldCupPool": "Create World Cup Pool",
  "wc.publicHub.yourPools": "Your World Cup Pools",
  "wc.publicHub.poolsCountOne": "{{count}} pool",
  "wc.publicHub.poolsCountOther": "{{count}} pools",
  "wc.publicHub.scoreLabel": "Score",
  "wc.publicHub.rankLabel": "Rank",
  "wc.publicHub.participantsOne": "{{count}} participant",
  "wc.publicHub.participantsOther": "{{count}} participants",
  "wc.publicHub.statusOpen": "Open",
  "wc.publicHub.statusLocked": "Locked",
  "wc.publicHub.statusFinal": "Final",
  "wc.publicHub.emptyTitle": "No World Cup pools yet",
  "wc.publicHub.emptyBody":
    "You haven't created or joined a World Cup bracket pool.",
  "wc.publicHub.emptyHint":
    "Create one and invite friends, or ask someone for an invite code.",
  "wc.publicHub.signInTitle": "Sign in to get started",
  "wc.publicHub.signInBody":
    "Create or join a World Cup bracket pool and compete with friends.",
  "wc.publicHub.signInCta": "Sign In to Get Started",
  "wc.publicHub.feature.privatePublic":
    "Private or public pools — up to 100 participants.",
  "wc.publicHub.feature.bracketsPerUser":
    "Up to 5 brackets per user, compete with multiple strategies.",
  "wc.publicHub.feature.ncaaScoring":
    "NCAA-style scoring — more points for later rounds.",
  "wc.publicHub.feature.guidedPicker":
    "Guided pick builder with AI matchup previews.",
  "wc.publicHub.feature.liveTracking":
    "Live score and match-minute tracking.",
  "wc.publicHub.feature.aiBracketBuilder":
    "AI bracket builder fills unpicked matches automatically.",
  "wc.publicHub.feature.perBracketLeaderboard":
    "Per-bracket leaderboard — every entry ranked individually.",
  "wc.publicHub.feature.lockOnKickoff":
    "Brackets lock when the first World Cup match begins.",

  // ── Pool dashboard: tab labels ───────────────────────────────────────
  "wc.tab.home": "Home",
  "wc.tab.groupStage": "Group Stage",
  "wc.tab.picks": "Knockouts",
  "wc.tab.review": "Review",
  "wc.tab.leaderboard": "Leaderboard",
  "wc.tab.rules": "Rules",
  "wc.tab.invite": "Invite",
  "wc.tab.commissioner": "Commissioner",
  "wc.tab.admin": "Admin",

  // ── Pool dashboard: header / status strip ────────────────────────────
  "wc.header.sync": "Sync",
  "wc.header.inviteAria": "Invite friends",
  "wc.header.invite": "Invite",
  "wc.header.testMode": "Test mode",
  "wc.header.testModeNote":
    "results are simulated and can change leaderboard standings.",

  // ── Lock countdown ───────────────────────────────────────────────────
  "wc.lock.untilLockDays": "{{d}}d {{h}}h until picks lock",
  "wc.lock.untilLockHours": "{{h}}h {{m}}m until picks lock",
  "wc.lock.untilLockMinutes": "{{m}}m until picks lock",
  "wc.lock.locksSoon": "Bracket locks soon",
  "wc.lock.bracketLocked": "Bracket Locked",
  "wc.lock.picksFrozen": "Bracket locked — picks are frozen.",

  // ── Knockouts tab ────────────────────────────────────────────────────
  "wc.knockouts.intro.reseeded":
    "Knockout picks open after official Round of 32 fixtures are available.",
  "wc.knockouts.intro.predictive":
    "Your knockout bracket is generated from your predicted group results.",
  "wc.knockouts.subintro.reseeded":
    "Group Stage picks work normally now. Once real knockout fixtures are synced, you will make fresh knockout picks from the official bracket.",
  "wc.knockouts.subintro.predictive":
    "Knockout matchups update based on your Group Stage predictions. Changing group predictions may reset affected knockout picks.",
  "wc.knockouts.startPicks": "Start Picks",
  "wc.knockouts.continuePicks": "Continue Picks",
  "wc.knockouts.guidance.complete":
    "{{done}}/{{required}} currently available picks complete.",
  "wc.knockouts.guidance.nextPick": "Next pick: Match {{matchNumber}}.",
  "wc.knockouts.guidance.blocked":
    "Pick earlier round winners first. More picks unlock as prior winners are selected.",
  "wc.knockouts.guidance.noneReady":
    "No available knockout picks are ready right now.",

  // ── Knockout Danger Zones card ───────────────────────────────────────
  "wc.danger.eyebrow": "Knockouts",
  "wc.danger.title": "Knockout Danger Zones",
  "wc.danger.subtitle":
    "Deterministic — compares your picks against pre-tournament seed strength and live match state.",
  "wc.danger.tierPro": "AF Pro",
  "wc.danger.tierBasic": "Basic",
  "wc.danger.emptyNoEntry": "Open a bracket entry to see danger zones.",
  "wc.danger.emptyNoPicks": "Make knockout picks to see danger zones.",
  "wc.danger.emptyNoRisks":
    "No danger zones right now. All your knockout picks look favored by pre-tournament strength.",
  "wc.danger.severityHigh": "High",
  "wc.danger.severityMedium": "Medium",
  "wc.danger.severityLow": "Low",
  "wc.danger.severitySuffix": "danger",
  "wc.danger.footer":
    "Counts only your own picks vs the public schedule. No AI call. No other users' picks.",

  // ── AI Report (Review tab) ───────────────────────────────────────────
  "wc.aiReport.eyebrow": "Report",
  "wc.aiReport.title": "Your Bracket AI Report",
  "wc.aiReport.subtitle":
    "Six AI signals computed from your own picks. Everything below is private to you.",
  "wc.aiReport.tierActive": "AF Pro active",
  "wc.aiReport.tierPreview": "AF Pro preview",

  // ── Share / Invite ───────────────────────────────────────────────────
  "wc.invite.title": "Invite friends",
  "wc.invite.copyLink": "Copy invite link",
  "wc.invite.copied": "Link copied!",
  "wc.invite.shareNative": "Share",
  "wc.invite.shareViaText": "Text",
  "wc.invite.shareViaEmail": "Email",
  "wc.invite.viaSocial": "Social",
  "wc.invite.heading":
    "Invite friends to compete in {{poolName}} on AllFantasy.",
  "wc.invite.inviteCodeLabel": "Invite code",

  // ── Commissioner Checklist ───────────────────────────────────────────
  "wc.checklist.title": "Pool Completion Checklist",
  "wc.checklist.subtitle":
    "Members of {{poolName}} and where they stand against the lock deadline.",
  "wc.checklist.copyReminder": "Copy reminder",
  "wc.checklist.reminderCopied": "Reminder copied!",
  "wc.checklist.statusReady": "Ready",
  "wc.checklist.statusNoMembers": "No members yet",
  "wc.checklist.statusNoData": "No snapshot available",

  // ── Empty / loading / error states ───────────────────────────────────
  "wc.state.loading": "Loading...",
  "wc.state.refresh": "Refresh",
  "wc.state.tryAgain": "Try again",
  "wc.state.noEntries":
    "You haven't created a bracket entry for this pool yet.",
  "wc.state.createEntry": "Create my bracket",

  // ── Language selector tooltip ────────────────────────────────────────
  "wc.language.label": "Language",
  "wc.language.english": "English",
  "wc.language.spanish": "Español",
}

const ES: WorldCupDictionary = {
  // ── Shared / shell ───────────────────────────────────────────────────
  "wc.common.loading": "Cargando...",
  "wc.common.back": "Atrás",
  "wc.common.openSettings": "Abrir ajustes",
  "wc.common.signIn": "Iniciar sesión",
  "wc.common.signOut": "Cerrar sesión",

  // ── Public hub: /brackets/world-cup ──────────────────────────────────
  "wc.publicHub.backToBrackets": "← Volver a Brackets",
  "wc.publicHub.heroTitle": "Desafío de Brackets de la Copa del Mundo",
  "wc.publicHub.heroSubtitle":
    "Crea un grupo de brackets estilo NCAA para la Copa del Mundo de la FIFA. Invita amigos, haz tus picks, sigue marcadores en vivo y escala el leaderboard.",
  "wc.publicHub.discover": "Descubrir grupos públicos",
  "wc.publicHub.joinWithCode": "Unirse con código",
  "wc.publicHub.createPool": "Crear grupo",
  "wc.publicHub.createWorldCupPool": "Crear grupo de la Copa del Mundo",
  "wc.publicHub.yourPools": "Tus grupos de la Copa del Mundo",
  "wc.publicHub.poolsCountOne": "{{count}} grupo",
  "wc.publicHub.poolsCountOther": "{{count}} grupos",
  "wc.publicHub.scoreLabel": "Puntos",
  "wc.publicHub.rankLabel": "Posición",
  "wc.publicHub.participantsOne": "{{count}} participante",
  "wc.publicHub.participantsOther": "{{count}} participantes",
  "wc.publicHub.statusOpen": "Abierto",
  "wc.publicHub.statusLocked": "Bloqueado",
  "wc.publicHub.statusFinal": "Final",
  "wc.publicHub.emptyTitle": "Aún no tienes grupos de la Copa del Mundo",
  "wc.publicHub.emptyBody":
    "Todavía no has creado ni te has unido a un grupo de brackets de la Copa del Mundo.",
  "wc.publicHub.emptyHint":
    "Crea uno e invita amigos, o pide un código de invitación.",
  "wc.publicHub.signInTitle": "Inicia sesión para comenzar",
  "wc.publicHub.signInBody":
    "Crea o únete a un grupo de brackets de la Copa del Mundo y compite con amigos.",
  "wc.publicHub.signInCta": "Iniciar sesión para comenzar",
  "wc.publicHub.feature.privatePublic":
    "Grupos privados o públicos — hasta 100 participantes.",
  "wc.publicHub.feature.bracketsPerUser":
    "Hasta 5 brackets por usuario, compite con varias estrategias.",
  "wc.publicHub.feature.ncaaScoring":
    "Puntuación estilo NCAA — más puntos en rondas avanzadas.",
  "wc.publicHub.feature.guidedPicker":
    "Asistente de picks guiado con vistas previas de IA.",
  "wc.publicHub.feature.liveTracking":
    "Seguimiento de marcadores y minutos en vivo.",
  "wc.publicHub.feature.aiBracketBuilder":
    "El generador de brackets con IA rellena los partidos sin elegir automáticamente.",
  "wc.publicHub.feature.perBracketLeaderboard":
    "Leaderboard por bracket — cada entrada se clasifica de manera individual.",
  "wc.publicHub.feature.lockOnKickoff":
    "Los brackets se bloquean cuando arranca el primer partido de la Copa del Mundo.",

  // ── Pool dashboard: tab labels ───────────────────────────────────────
  "wc.tab.home": "Inicio",
  "wc.tab.groupStage": "Fase de Grupos",
  "wc.tab.picks": "Eliminatorias",
  "wc.tab.review": "Revisar",
  "wc.tab.leaderboard": "Leaderboard",
  "wc.tab.rules": "Reglas",
  "wc.tab.invite": "Invitar",
  "wc.tab.commissioner": "Comisionado",
  "wc.tab.admin": "Admin",

  // ── Pool dashboard: header / status strip ────────────────────────────
  "wc.header.sync": "Sincronizar",
  "wc.header.inviteAria": "Invitar amigos",
  "wc.header.invite": "Invitar",
  "wc.header.testMode": "Modo de prueba",
  "wc.header.testModeNote":
    "los resultados están simulados y pueden alterar el leaderboard.",

  // ── Lock countdown ───────────────────────────────────────────────────
  "wc.lock.untilLockDays": "{{d}}d {{h}}h para que cierren los picks",
  "wc.lock.untilLockHours": "{{h}}h {{m}}m para que cierren los picks",
  "wc.lock.untilLockMinutes": "{{m}}m para que cierren los picks",
  "wc.lock.locksSoon": "El bracket cierra pronto",
  "wc.lock.bracketLocked": "Bracket bloqueado",
  "wc.lock.picksFrozen": "Bracket bloqueado — los picks están congelados.",

  // ── Knockouts tab ────────────────────────────────────────────────────
  "wc.knockouts.intro.reseeded":
    "Los picks de eliminatorias se habilitan cuando estén disponibles los partidos oficiales de Ronda de 32.",
  "wc.knockouts.intro.predictive":
    "Tu bracket de eliminatorias se genera a partir de tus resultados predichos de Fase de Grupos.",
  "wc.knockouts.subintro.reseeded":
    "Los picks de Fase de Grupos funcionan normalmente. Cuando se sincronicen los partidos reales de eliminatorias, harás picks nuevos desde el bracket oficial.",
  "wc.knockouts.subintro.predictive":
    "Los partidos de eliminatorias se actualizan según tus predicciones de Fase de Grupos. Cambiar las predicciones de grupo puede reiniciar los picks afectados.",
  "wc.knockouts.startPicks": "Empezar picks",
  "wc.knockouts.continuePicks": "Continuar picks",
  "wc.knockouts.guidance.complete":
    "{{done}}/{{required}} picks disponibles completados.",
  "wc.knockouts.guidance.nextPick":
    "Próximo pick: Partido {{matchNumber}}.",
  "wc.knockouts.guidance.blocked":
    "Elige primero los ganadores de rondas previas. Más picks se habilitan al confirmar ganadores anteriores.",
  "wc.knockouts.guidance.noneReady":
    "No hay picks de eliminatorias disponibles ahora mismo.",

  // ── Knockout Danger Zones card ───────────────────────────────────────
  "wc.danger.eyebrow": "Eliminatorias",
  "wc.danger.title": "Zonas de Peligro de Eliminatorias",
  "wc.danger.subtitle":
    "Determinista — compara tus picks con la fuerza pre-torneo y el estado en vivo de cada partido.",
  "wc.danger.tierPro": "AF Pro",
  "wc.danger.tierBasic": "Básico",
  "wc.danger.emptyNoEntry":
    "Abre una entrada del bracket para ver las zonas de peligro.",
  "wc.danger.emptyNoPicks":
    "Haz picks de eliminatorias para ver zonas de peligro.",
  "wc.danger.emptyNoRisks":
    "No hay zonas de peligro por ahora. Todos tus picks de eliminatorias parecen favorecidos por la fuerza pre-torneo.",
  "wc.danger.severityHigh": "Alto",
  "wc.danger.severityMedium": "Medio",
  "wc.danger.severityLow": "Bajo",
  "wc.danger.severitySuffix": "peligro",
  "wc.danger.footer":
    "Cuenta solo tus propios picks vs el calendario público. Sin llamadas de IA. Sin picks de otros usuarios.",

  // ── AI Report (Review tab) ───────────────────────────────────────────
  "wc.aiReport.eyebrow": "Informe",
  "wc.aiReport.title": "Tu Informe de IA del Bracket",
  "wc.aiReport.subtitle":
    "Seis señales de IA calculadas a partir de tus propios picks. Todo lo de abajo es privado tuyo.",
  "wc.aiReport.tierActive": "AF Pro activo",
  "wc.aiReport.tierPreview": "Vista previa AF Pro",

  // ── Share / Invite ───────────────────────────────────────────────────
  "wc.invite.title": "Invita amigos",
  "wc.invite.copyLink": "Copiar enlace de invitación",
  "wc.invite.copied": "¡Enlace copiado!",
  "wc.invite.shareNative": "Compartir",
  "wc.invite.shareViaText": "Texto",
  "wc.invite.shareViaEmail": "Email",
  "wc.invite.viaSocial": "Redes",
  "wc.invite.heading":
    "Invita amigos a competir en {{poolName}} en AllFantasy.",
  "wc.invite.inviteCodeLabel": "Código de invitación",

  // ── Commissioner Checklist ───────────────────────────────────────────
  "wc.checklist.title": "Lista de Avance del Grupo",
  "wc.checklist.subtitle":
    "Miembros de {{poolName}} y su estado frente al plazo de bloqueo.",
  "wc.checklist.copyReminder": "Copiar recordatorio",
  "wc.checklist.reminderCopied": "¡Recordatorio copiado!",
  "wc.checklist.statusReady": "Listo",
  "wc.checklist.statusNoMembers": "Aún sin miembros",
  "wc.checklist.statusNoData": "No hay snapshot disponible",

  // ── Empty / loading / error states ───────────────────────────────────
  "wc.state.loading": "Cargando...",
  "wc.state.refresh": "Actualizar",
  "wc.state.tryAgain": "Reintentar",
  "wc.state.noEntries":
    "Aún no has creado una entrada de bracket para este grupo.",
  "wc.state.createEntry": "Crear mi bracket",

  // ── Language selector tooltip ────────────────────────────────────────
  "wc.language.label": "Idioma",
  "wc.language.english": "English",
  "wc.language.spanish": "Español",
}

export const WORLD_CUP_TRANSLATIONS: Record<WorldCupLocale, WorldCupDictionary> = {
  en: EN,
  es: ES,
}

/**
 * Look up a translated string for the given locale and key.
 *
 * - Falls back to English if the locale dictionary is missing the key.
 * - Falls back to the key itself if neither locale has the key — keeps
 *   missing translations visible during development.
 * - Interpolates `{{var}}` placeholders from `params`. Non-string values
 *   are coerced to string. Missing params leave the placeholder intact
 *   so QA can spot it.
 */
export function wcT(
  locale: WorldCupLocale | string | null | undefined,
  key: string,
  params?: Record<string, string | number>
): string {
  const safeLocale = getWorldCupLocale(locale)
  const dict = WORLD_CUP_TRANSLATIONS[safeLocale]
  const raw =
    dict[key] ?? WORLD_CUP_TRANSLATIONS[WORLD_CUP_DEFAULT_LOCALE][key] ?? key
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
 * in scope — keeps wcT() calls one line.
 */
export function makeWcT(locale: WorldCupLocale | string | null | undefined) {
  const safeLocale = getWorldCupLocale(locale)
  return (key: string, params?: Record<string, string | number>): string =>
    wcT(safeLocale, key, params)
}
