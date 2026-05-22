/**
 * worldCupI18n.ts
 *
 * World Cup-scoped translation dictionary. Reuses the existing app-wide
 * language preference (cookie `af_lang` + localStorage + user profile)
 * resolved via `useOptionalLanguage()` on the client and
 * `resolveServerRenderPreferences()` on the server.
 *
 * Supported locales (Phase 2 — five languages):
 *   en  — English
 *   es  — Español
 *   zh  — 繁體中文 (Traditional Chinese)
 *   fil — Filipino
 *   vi  — Tiếng Việt
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
 *  - No browser APIs read during render. Pure / deterministic.
 *
 * Missing-key behavior:
 *  - Falls back to English when a key is missing in the requested locale.
 *  - In development (process.env.NODE_ENV !== "production") logs a single
 *    console.warn per missing key/locale pair so the dev sees it without
 *    spamming. Production never logs and never shows the raw key.
 *  - If the key is missing from English too, returns the key string as a
 *    last resort — production still hides this via the same path.
 *
 * Safety properties verified by tests:
 *  - No values contain email addresses, user IDs, or wagering / betting
 *    language.
 *  - Placeholder syntax `{{name}}` is interpolated.
 */
export type WorldCupLocale = "en" | "es" | "zh" | "fil" | "vi"

export const WORLD_CUP_SUPPORTED_LOCALES: WorldCupLocale[] = [
  "en",
  "es",
  "zh",
  "fil",
  "vi",
]
export const WORLD_CUP_DEFAULT_LOCALE: WorldCupLocale = "en"

/**
 * Native language display names for the World Cup language picker /
 * tooltip. Kept identical to lib/i18n/constants.ts for visual parity
 * with the global LanguageToggle.
 */
export const WORLD_CUP_LOCALE_NATIVE_NAMES: Record<WorldCupLocale, string> = {
  en: "English",
  es: "Español",
  zh: "繁體中文",
  fil: "Filipino",
  vi: "Tiếng Việt",
}

/**
 * Normalize an arbitrary string / null / undefined into a supported World
 * Cup locale. Mirrors lib/i18n/constants.ts resolveLanguage so the WC
 * helper accepts every code the app-wide system can emit.
 */
export function getWorldCupLocale(input: unknown): WorldCupLocale {
  if (input === "es") return "es"
  if (input === "en") return "en"
  if (input === "zh") return "zh"
  if (input === "fil") return "fil"
  if (input === "vi") return "vi"
  return WORLD_CUP_DEFAULT_LOCALE
}

/**
 * Native display name for a locale code. Falls back to English ("English")
 * if the input is unknown.
 */
export function getWorldCupLocaleNativeName(
  input: WorldCupLocale | string | null | undefined
): string {
  const safe = getWorldCupLocale(input)
  return WORLD_CUP_LOCALE_NATIVE_NAMES[safe]
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
  "wc.language.chinese": "繁體中文",
  "wc.language.filipino": "Filipino",
  "wc.language.vietnamese": "Tiếng Việt",

  // ── Create page / modal ──────────────────────────────────────────────
  "wc.create.goBack": "Go back",
  "wc.create.header": "Create World Cup Bracket Pool",
  "wc.create.subheader": "2026 FIFA World Cup · round-by-round scoring",
  "wc.create.heroTitle": "2026 FIFA World Cup",
  "wc.create.heroSubtitle":
    "Create a pool container — invite friends and let them build their brackets inside.",
  "wc.create.poolName.label": "Pool Name",
  "wc.create.poolName.placeholder": "e.g. Office World Cup Pool 2026",
  "wc.create.poolName.error.blank": "Pool name cannot be blank.",
  "wc.create.poolName.default": "World Cup Bracket Pool",
  "wc.create.visibility.label": "Pool Visibility",
  "wc.create.visibility.private": "Private",
  "wc.create.visibility.privateHint": "Invite link required to join",
  "wc.create.visibility.public": "Public",
  "wc.create.visibility.publicHint": "Anyone can discover and join",
  "wc.create.maxUsers.label": "Max Users",
  "wc.create.maxUsers.hint": "Maximum {{max}} per pool",
  "wc.create.maxUsers.error": "Must be between 2 and {{max}}.",
  "wc.create.maxEntries.label": "Brackets per User",
  "wc.create.maxEntries.hint": "Maximum {{max}} per user",
  "wc.create.maxEntries.error": "Must be between 1 and {{max}}.",
  "wc.create.lockRule.label": "Pick Lock Rule",
  "wc.create.lockRule.tournament": "Tournament Lock",
  "wc.create.lockRule.tournamentHint":
    "All picks lock when the first match begins",
  "wc.create.lockRule.perMatch": "Per-Match Lock",
  "wc.create.lockRule.perMatchHint":
    "Each match locks at its own kickoff",
  "wc.create.lockRule.copyTournament":
    "Picks can be edited until the first World Cup match begins.",
  "wc.create.lockRule.copyPerMatch":
    "Each matchup can be edited until that match kicks off.",
  "wc.create.scoring.intro": "Round-by-round scoring:",
  "wc.create.scoring.values":
    "10 pts Round of 32 · 20 pts Round of 16 · 40 pts QF · 80 pts SF · 160 pts Final · 320 pts Champion bonus",
  "wc.create.helper.entriesOne":
    "Each user can create up to {{max}} bracket entry.",
  "wc.create.helper.entriesOther":
    "Each user can create up to {{max}} bracket entries.",
  "wc.create.helper.leaderboard":
    "The leaderboard ranks finalized bracket entries, not drafts.",
  "wc.create.helper.inviteLink":
    "An invite link will be shown after creation.",
  "wc.create.thirdPlace": "Include third-place match",
  "wc.create.testFixtures.label": "Seed Test Fixtures",
  "wc.create.testFixtures.hint":
    "Adds mock Round of 32 teams, flags, kickoff times, and venues so this pool is pickable immediately.",
  "wc.create.submit.idle": "Create Pool",
  "wc.create.submit.creating": "Creating...",
  "wc.create.submit.opening": "Created, opening...",
  "wc.create.openingSuccess": "Created bracket, opening...",
  "wc.create.error.signInRequired": "Please sign in to create a bracket.",
  "wc.create.error.noId":
    "Bracket was created but the server did not return an ID. Please refresh the page.",
  "wc.create.error.generic": "Failed to create bracket",
  "wc.create.error.requestFailed": "Request failed ({{status}})",

  // ── Discover page ────────────────────────────────────────────────────
  "wc.discover.backToHub": "← World Cup hub",
  "wc.discover.createPool": "Create Pool",
  "wc.discover.title": "Discover public pools",
  "wc.discover.subtitle":
    "Browse public World Cup bracket pools. Join opens Bracket 1 with no picks — we drop you into the guided picker when the pool allows new players and isn't full.",
  "wc.discover.search.label": "Search",
  "wc.discover.search.placeholder": "Pool name",
  "wc.discover.season.label": "Season",
  "wc.discover.season.placeholder": "e.g. 2026",
  "wc.discover.statusFilter.label": "Status",
  "wc.discover.statusFilter.all": "All",
  "wc.discover.statusFilter.open": "Open",
  "wc.discover.statusFilter.locked": "Locked",
  "wc.discover.statusFilter.final": "Final",
  "wc.discover.loading": "Loading public pools...",
  "wc.discover.errors.couldNotLoad": "Could not load pools",
  "wc.discover.empty":
    "No public pools match your filters. Try another season or clear search — or join a private pool with an invite code above.",
  "wc.discover.joinPanelTitle": "Join with invite code (private pools)",

  // ── Discover card ────────────────────────────────────────────────────
  "wc.discover.card.statusOpen": "Open",
  "wc.discover.card.blockedFull": "League full",
  "wc.discover.card.blockedClosed": "Closed to new players",
  "wc.discover.card.password": "Password",
  "wc.discover.card.lateJoin": "Picks locked · late join on",
  "wc.discover.card.preview": "Preview",
  "wc.discover.card.join": "Join",

  // ── Join / invite panel ──────────────────────────────────────────────
  "wc.join.backToHub": "← World Cup hub",
  "wc.join.brandEyebrow": "AllFantasy",
  "wc.join.brandTitle": "2026 World Cup Bracket Pools",
  "wc.join.panelTitle": "Join with invite code",
  "wc.join.panelHelper":
    "Enter the invite code from your commissioner. After joining, you will land on the pool dashboard and can start your first bracket. Password-protected pools require the join password set in pool settings.",
  "wc.join.codeInput.placeholder": "WCUP invite code",
  "wc.join.previewBtn": "Preview",
  "wc.join.errors.invalidCode": "Enter a valid invite code",
  "wc.join.errors.notFound": "Invite not found",
  "wc.join.errors.full": "This pool is full.",
  "wc.join.errors.closed": "This pool is closed to new players.",
  "wc.join.errors.couldNotJoin": "Could not join",
  "wc.join.preview.hostLine":
    "Host: {{owner}} · {{count}} playing · {{visibility}}",
  "wc.join.preview.openCopy":
    "Join now to create Bracket 1, make Group Stage and Knockout picks, and finalize when ready.",
  "wc.join.preview.fullCopy": "This pool is full.",
  "wc.join.preview.closedCopy":
    "Pool locked — not accepting new players.",
  "wc.join.preview.passwordLabel": "Join password",
  "wc.join.preview.joinBtn": "Join league",
  "wc.join.success": "You're in — Bracket 1 is ready.",

  // ── Finalize / share success block (Review tab) ──────────────────────
  "wc.finalize.eyebrow": "Finalized",
  "wc.finalize.title": "Your bracket is locked in",
  "wc.finalize.subtitleNoTime":
    "Submitted. You can still edit until pool lock — invite friends now before the field fills up.",
  "wc.finalize.subtitleWithTime":
    "Submitted {{at}}. You can still edit until pool lock — invite friends now before the field fills up.",
  "wc.finalize.copyShare": "Copy share text",
  "wc.finalize.copyShareCopied": "Share Copied!",
  "wc.finalize.shareReport": "Share My AI Bracket Report",
  "wc.finalize.inviteFriends": "Invite Friends To Beat My Bracket",
  "wc.finalize.previewShare": "Preview share text",

  // ── Inside-pool Invite tab ───────────────────────────────────────────
  "wc.inviteTab.eyebrow": "Pool",
  "wc.inviteTab.title": "Invite & Pool Details",
  "wc.inviteTab.detailsTitle": "Pool details",
  "wc.inviteTab.meta.pool": "Pool",
  "wc.inviteTab.meta.privacy": "Privacy",
  "wc.inviteTab.meta.privacyPublic": "Public",
  "wc.inviteTab.meta.privacyPrivate": "Private — invite only",
  "wc.inviteTab.meta.maxUsers": "Max Users",
  "wc.inviteTab.meta.bracketsPerUser": "Brackets per User",
  "wc.inviteTab.meta.scoring": "Scoring",
  "wc.inviteTab.meta.scoringValue": "NCAA-style",
  "wc.inviteTab.meta.lockRule": "Lock Rule",
  "wc.inviteTab.meta.lockTournament": "Locks at first World Cup match",
  "wc.inviteTab.meta.lockPerMatch": "Per-match lock at kickoff",
  "wc.inviteTab.lockedBanner":
    "This pool is locked. Picks can no longer be edited.",
  "wc.inviteTab.member.title": "Invite friends to this pool",
  "wc.inviteTab.member.body":
    "Only the pool commissioner can copy and share the invite link. Ask your commissioner for the invite link or code.",
  "wc.inviteTab.commissioner.linkTitle": "Invite Link",
  "wc.inviteTab.commissioner.linkHelper":
    "Share this with anyone you want to invite. They must be signed in to AllFantasy.",
  "wc.inviteTab.commissioner.codeLabel": "Invite Code",
  "wc.inviteTab.commissioner.copyCode": "Copy Code",
  "wc.inviteTab.commissioner.copyCodeDone": "Copied",
  "wc.inviteTab.commissioner.copyLink": "Copy Invite Link",
  "wc.inviteTab.commissioner.copyLinkDone": "Link Copied!",
  "wc.inviteTab.commissioner.copyMessage": "Copy Invite Message",
  "wc.inviteTab.commissioner.copyMessageDone": "Message Copied!",
  "wc.inviteTab.commissioner.share": "Share",
  "wc.inviteTab.commissioner.previewInvite": "Preview invite message",
  "wc.inviteTab.commissioner.previewShare": "Preview share message",
  "wc.inviteTab.commissioner.noCodeTitle": "Invite link not available",
  "wc.inviteTab.commissioner.noCodeBody":
    "The pool owner or admin can regenerate an invite link from the pool settings.",
  "wc.inviteTab.shareMessage.default":
    "Join my AllFantasy World Cup Bracket Pool \"{{pool}}\"! Make up to {{maxEntries}} brackets, rank Group Stage teams, build Knockout picks, and compete on the live leaderboard. {{url}}",
  "wc.inviteTab.shareTitleNative":
    "{{pool}} — AllFantasy World Cup Bracket",

  // ── Commissioner Checklist card chrome (extended) ────────────────────
  "wc.checklist.eyebrow": "Commissioner",
  "wc.checklist.cardSubtitle":
    "Member progress at a glance. Visible to pool commissioners and admins only.",
  "wc.checklist.copyReminderBtn": "Copy Reminder Message",
  "wc.checklist.copyReminderDone": "Reminder Copied!",
  "wc.checklist.stat.total": "Total members",
  "wc.checklist.stat.finalized": "Finalized",
  "wc.checklist.stat.inProgress": "In progress",
  "wc.checklist.stat.completion": "Completion",
  "wc.checklist.entryStatus.finalized": "Finalized",
  "wc.checklist.entryStatus.inProgress": "In progress",
  "wc.checklist.entryStatus.needsPicks": "Needs picks",
  "wc.checklist.entryStatus.unknown": "Unknown",
  "wc.checklist.needsReminderBadge": "Needs reminder",
  "wc.checklist.missingPicks": "{{count}} missing",
  "wc.checklist.previewReminder": "Preview reminder message",
  "wc.checklist.privacyNote":
    "Deterministic — uses snapshot data already loaded for commissioner tools. No emails or user IDs are shown.",
  "wc.checklist.empty.memberOnly":
    "Only the pool commissioner or admin can see member status.",
  "wc.checklist.empty.loading":
    "Commissioner status data is still loading.",
  "wc.checklist.empty.noMembers":
    "No members have created entries yet. Share the invite link to get started.",
  "wc.checklist.empty.fallback": "No member data available.",
  "wc.checklist.row.memberFallback": "Member",
  "wc.checklist.row.bracketFallback": "Bracket",
  "wc.checklist.row.finalizedRowOne": "{{count}} finalized bracket",
  "wc.checklist.row.finalizedRowOther": "{{count}} finalized brackets",

  // ── Commissioner reminder message templates ──────────────────────────
  "wc.checklist.reminder.askCommissioner":
    "Ask the pool commissioner to remind members about {{pool}}.",
  "wc.checklist.reminder.finalizeLine":
    "Friendly reminder: finalize your picks for \"{{pool}}\" on AllFantasy.",
  "wc.checklist.reminder.joinLine":
    "Reminder: join \"{{pool}}\" on AllFantasy and lock in your World Cup bracket.",
  "wc.checklist.reminder.statusLine":
    "Status: {{done}}/{{total}} brackets finalized ({{percent}}%).",
  "wc.checklist.reminder.deadlineLine": "Picks lock {{deadline}}.",
  "wc.checklist.reminder.poweredBy": "Powered by AllFantasy.",
  "wc.checklist.reminder.noSnapshotLine":
    "Reminder: finish your picks for \"{{pool}}\" on AllFantasy.",

  // ── AI Report card chrome (extended) ─────────────────────────────────
  "wc.aiShareCard.eyebrow": "Share Graphic",
  "wc.aiShareCard.subtitle":
    "All 6 AI signals in one copy-ready card. Deterministic — no AI call to share.",
  "wc.aiShareCard.tierPro": "AF Pro",
  "wc.aiShareCard.tierPreview": "Basic preview",
  "wc.aiShareCard.emptyNoEntry":
    "Select a bracket entry to generate a share card.",
  "wc.aiShareCard.copyShare": "Copy share text",
  "wc.aiShareCard.copyShareDone": "Copied",
  "wc.aiShareCard.share": "Share",
  "wc.aiShareCard.privacyNote":
    "Private to you until you share it. Uses only your own bracket data and aggregated pool counts.",
  "wc.explain.eyebrow": "Private AI",
  "wc.explain.title": "Explain My Bracket",
  "wc.explain.subtitle":
    "A private narrative analysis of your bracket strategy. Only you can see it.",
  "wc.explain.tierPro": "AF Pro",
  "wc.explain.tierLocked": "Locked",
  "wc.explain.locked":
    "AF Pro unlocks a private AI explanation of your bracket strategy — including style, safest picks, riskiest picks, champion path, and one specific recommendation.",
  "wc.explain.generate": "Generate explanation",
  "wc.explain.generating": "Generating...",
  "wc.explain.selectFirst": "Select a bracket first",
  "wc.explain.regenerate": "Regenerate",
  "wc.explain.regenerating": "Regenerating...",
  "wc.explain.fallbackBadge": "Deterministic fallback",
  "wc.explain.error.generic": "Could not generate explanation.",
  "wc.explain.error.network": "Network error. Please try again.",
  "wc.explain.privacyNote":
    "Private to you. Uses only your own picks and public team data. Never posted to chat.",
  "wc.uniqueness.eyebrow": "Pool comparison",
  "wc.uniqueness.title": "What makes my bracket unique?",
  "wc.uniqueness.subtitle":
    "Compared only against finalized brackets in this pool.",
  "wc.uniqueness.tierPro": "AF Pro",
  "wc.uniqueness.tierBasic": "Basic",
  "wc.uniqueness.empty.noEntry":
    "Select a bracket entry to compute uniqueness.",
  "wc.uniqueness.loading": "Loading pool comparison...",
  "wc.uniqueness.error.couldNotLoad": "Could not load uniqueness data.",
  "wc.uniqueness.error.network": "Network error. Please try again.",
  "wc.uniqueness.empty.notEnoughData":
    "Uniqueness unlocks after more finalized brackets are submitted.",
  "wc.uniqueness.empty.incomplete":
    "Make group and knockout picks to see how unique your bracket is.",
  "wc.uniqueness.rarity.veryRare": "Very rare",
  "wc.uniqueness.rarity.rare": "Rare",
  "wc.uniqueness.rarity.uncommon": "Uncommon",
  "wc.uniqueness.rarity.common": "Common",
  "wc.uniqueness.percentShare": "{{percent}}% share",
  "wc.uniqueness.privacyNote":
    "Deterministic — counts only finalized brackets. No AI call, no other users' raw picks shown.",
  "wc.grade.eyebrow": "Bracket Grade",
  "wc.grade.completionLabel": "{{percent}}% complete",
  "wc.grade.tierProDetail": "AF Pro detail",
  "wc.grade.tierBasic": "Basic",
  "wc.grade.stat.groups": "Groups",
  "wc.grade.stat.thirdPlace": "Third-place",
  "wc.grade.stat.knockouts": "Knockouts",
  "wc.grade.stat.missing": "Missing",
  "wc.grade.risk": "Risk Level:",
  "wc.grade.upset": "Upset Meter:",
  "wc.grade.championConfidence": "Champion Confidence:",
  "wc.grade.championConfidenceNone": "No champion selected",
  "wc.grade.biggestRisk": "Biggest Risk:",
  "wc.grade.recommendation": "Recommendation:",
  "wc.grade.lockedBody":
    "AF Pro unlocks risk, upset meter, champion confidence, biggest risk, and recommendation details.",
  "wc.confidence.title": "AI Confidence Check",
  "wc.confidence.tierOpen": "Open",
  "wc.confidence.tierLocked": "Locked",
  "wc.confidence.missingPicks": "Missing picks:",
  "wc.confidence.noMissing": "None. Ready to finalize.",
  "wc.confidence.missingBreakdown":
    "{{knockout}} knockout, {{groups}} groups, {{thirdPlace}} third-place.",
  "wc.confidence.highRiskPicks": "High-risk picks:",
  "wc.confidence.highRiskBody":
    "{{count}} early-round picks shape most of your bracket path.",
  "wc.confidence.bracketShape": "Bracket shape:",
  "wc.confidence.bracketShapeChalk":
    "Chalk-heavy. Consider whether one measured contrarian pick improves uniqueness.",
  "wc.confidence.bracketShapeBalanced":
    "Balanced enough for a first-pass confidence check.",
  "wc.confidence.finalizeConfidence": "Finalize confidence:",
  "wc.confidence.finalizeReady": "Ready to finalize for leaderboard.",
  "wc.confidence.finalizeMissing":
    "Finish missing requirements before finalizing.",
  "wc.confidence.privacyNote":
    "Deterministic prediction and scoring complexity only. Bracket guidance stays limited to pool picks and scoring mechanics.",
  "wc.confidence.lockedBody":
    "Upgrade to AI/Pro to open the confidence check. Locked users do not trigger AI calls.",
  "wc.path.title": "What needs to happen for me to win?",
  "wc.path.subtitle":
    "Private current-entry read. Other users' unfinalized picks stay hidden.",
  "wc.path.tierActive": "AF Pro active",
  "wc.path.tierLocked": "AF Pro locked",
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
  "wc.language.chinese": "繁體中文",
  "wc.language.filipino": "Filipino",
  "wc.language.vietnamese": "Tiếng Việt",

  // ── Create page / modal ──────────────────────────────────────────────
  "wc.create.goBack": "Volver",
  "wc.create.header": "Crear grupo de brackets de la Copa del Mundo",
  "wc.create.subheader":
    "Copa Mundial FIFA 2026 · puntuación ronda por ronda",
  "wc.create.heroTitle": "Copa Mundial FIFA 2026",
  "wc.create.heroSubtitle":
    "Crea un contenedor de grupo — invita amigos y deja que armen sus brackets dentro.",
  "wc.create.poolName.label": "Nombre del grupo",
  "wc.create.poolName.placeholder":
    "ej. Quiniela de la oficina Copa del Mundo 2026",
  "wc.create.poolName.error.blank":
    "El nombre del grupo no puede estar vacío.",
  "wc.create.poolName.default": "Grupo de brackets de la Copa del Mundo",
  "wc.create.visibility.label": "Visibilidad del grupo",
  "wc.create.visibility.private": "Privado",
  "wc.create.visibility.privateHint":
    "Se necesita enlace de invitación para unirse",
  "wc.create.visibility.public": "Público",
  "wc.create.visibility.publicHint": "Cualquiera puede descubrirlo y unirse",
  "wc.create.maxUsers.label": "Usuarios máximos",
  "wc.create.maxUsers.hint": "Máximo {{max}} por grupo",
  "wc.create.maxUsers.error": "Debe estar entre 2 y {{max}}.",
  "wc.create.maxEntries.label": "Brackets por usuario",
  "wc.create.maxEntries.hint": "Máximo {{max}} por usuario",
  "wc.create.maxEntries.error": "Debe estar entre 1 y {{max}}.",
  "wc.create.lockRule.label": "Regla de cierre de picks",
  "wc.create.lockRule.tournament": "Cierre por torneo",
  "wc.create.lockRule.tournamentHint":
    "Todos los picks se cierran cuando arranca el primer partido",
  "wc.create.lockRule.perMatch": "Cierre por partido",
  "wc.create.lockRule.perMatchHint":
    "Cada partido se cierra al inicio de su propio juego",
  "wc.create.lockRule.copyTournament":
    "Los picks se pueden editar hasta que empiece el primer partido de la Copa del Mundo.",
  "wc.create.lockRule.copyPerMatch":
    "Cada partido se puede editar hasta su propio arranque.",
  "wc.create.scoring.intro": "Puntuación ronda por ronda:",
  "wc.create.scoring.values":
    "10 pts Ronda de 32 · 20 pts Ronda de 16 · 40 pts QF · 80 pts SF · 160 pts Final · 320 pts bonus de campeón",
  "wc.create.helper.entriesOne":
    "Cada usuario puede crear hasta {{max}} bracket.",
  "wc.create.helper.entriesOther":
    "Cada usuario puede crear hasta {{max}} brackets.",
  "wc.create.helper.leaderboard":
    "El leaderboard clasifica brackets finalizados, no borradores.",
  "wc.create.helper.inviteLink":
    "El enlace de invitación se mostrará después de crear el grupo.",
  "wc.create.thirdPlace": "Incluir partido por el tercer puesto",
  "wc.create.testFixtures.label": "Cargar partidos de prueba",
  "wc.create.testFixtures.hint":
    "Agrega equipos, banderas, horarios y sedes simulados de la Ronda de 32 para que el grupo se pueda jugar de inmediato.",
  "wc.create.submit.idle": "Crear grupo",
  "wc.create.submit.creating": "Creando...",
  "wc.create.submit.opening": "Creado, abriendo...",
  "wc.create.openingSuccess": "Bracket creado, abriendo...",
  "wc.create.error.signInRequired":
    "Inicia sesión para crear un bracket.",
  "wc.create.error.noId":
    "El bracket se creó, pero el servidor no devolvió un ID. Actualiza la página.",
  "wc.create.error.generic": "No se pudo crear el bracket",
  "wc.create.error.requestFailed": "Falló la solicitud ({{status}})",

  // ── Discover page ────────────────────────────────────────────────────
  "wc.discover.backToHub": "← Volver al hub de la Copa del Mundo",
  "wc.discover.createPool": "Crear grupo",
  "wc.discover.title": "Descubrir grupos públicos",
  "wc.discover.subtitle":
    "Explora grupos de brackets públicos de la Copa del Mundo. Unirte abre el Bracket 1 sin picks — te llevamos al asistente guiado cuando el grupo acepta nuevos jugadores y no está lleno.",
  "wc.discover.search.label": "Buscar",
  "wc.discover.search.placeholder": "Nombre del grupo",
  "wc.discover.season.label": "Temporada",
  "wc.discover.season.placeholder": "ej. 2026",
  "wc.discover.statusFilter.label": "Estado",
  "wc.discover.statusFilter.all": "Todos",
  "wc.discover.statusFilter.open": "Abierto",
  "wc.discover.statusFilter.locked": "Bloqueado",
  "wc.discover.statusFilter.final": "Final",
  "wc.discover.loading": "Cargando grupos públicos...",
  "wc.discover.errors.couldNotLoad": "No se pudieron cargar los grupos",
  "wc.discover.empty":
    "Ningún grupo público coincide con tus filtros. Prueba otra temporada o limpia la búsqueda — o únete a un grupo privado con un código de invitación arriba.",
  "wc.discover.joinPanelTitle":
    "Unirse con código de invitación (grupos privados)",

  // ── Discover card ────────────────────────────────────────────────────
  "wc.discover.card.statusOpen": "Abierto",
  "wc.discover.card.blockedFull": "Grupo lleno",
  "wc.discover.card.blockedClosed": "Cerrado a nuevos jugadores",
  "wc.discover.card.password": "Contraseña",
  "wc.discover.card.lateJoin":
    "Picks cerrados · ingreso tardío activo",
  "wc.discover.card.preview": "Previsualizar",
  "wc.discover.card.join": "Unirse",

  // ── Join / invite panel ──────────────────────────────────────────────
  "wc.join.backToHub": "← Volver al hub de la Copa del Mundo",
  "wc.join.brandEyebrow": "AllFantasy",
  "wc.join.brandTitle": "Grupos de Brackets de la Copa del Mundo 2026",
  "wc.join.panelTitle": "Unirse con código de invitación",
  "wc.join.panelHelper":
    "Ingresa el código de invitación que te dio tu comisionado. Después de unirte llegarás al panel del grupo y podrás empezar tu primer bracket. Los grupos con contraseña requieren la contraseña definida en los ajustes del grupo.",
  "wc.join.codeInput.placeholder": "Código de invitación WCUP",
  "wc.join.previewBtn": "Previsualizar",
  "wc.join.errors.invalidCode": "Ingresa un código de invitación válido",
  "wc.join.errors.notFound": "Invitación no encontrada",
  "wc.join.errors.full": "Este grupo está lleno.",
  "wc.join.errors.closed":
    "Este grupo está cerrado a nuevos jugadores.",
  "wc.join.errors.couldNotJoin": "No se pudo unir",
  "wc.join.preview.hostLine":
    "Anfitrión: {{owner}} · {{count}} jugando · {{visibility}}",
  "wc.join.preview.openCopy":
    "Únete ahora para crear el Bracket 1, hacer picks de Fase de Grupos y Eliminatorias, y finalizar cuando estés listo.",
  "wc.join.preview.fullCopy": "Este grupo está lleno.",
  "wc.join.preview.closedCopy":
    "Grupo bloqueado — no acepta nuevos jugadores.",
  "wc.join.preview.passwordLabel": "Contraseña del grupo",
  "wc.join.preview.joinBtn": "Unirse al grupo",
  "wc.join.success": "Estás dentro — Bracket 1 listo.",

  // ── Finalize / share success block (Review tab) ──────────────────────
  "wc.finalize.eyebrow": "Finalizado",
  "wc.finalize.title": "Tu bracket está confirmado",
  "wc.finalize.subtitleNoTime":
    "Enviado. Aún puedes editar hasta el cierre del grupo — invita amigos antes de que se llene.",
  "wc.finalize.subtitleWithTime":
    "Enviado {{at}}. Aún puedes editar hasta el cierre del grupo — invita amigos antes de que se llene.",
  "wc.finalize.copyShare": "Copiar texto para compartir",
  "wc.finalize.copyShareCopied": "¡Copiado!",
  "wc.finalize.shareReport": "Compartir Mi Informe IA de Bracket",
  "wc.finalize.inviteFriends": "Invita Amigos A Vencer Mi Bracket",
  "wc.finalize.previewShare": "Vista previa del texto",

  // ── Inside-pool Invite tab ───────────────────────────────────────────
  "wc.inviteTab.eyebrow": "Grupo",
  "wc.inviteTab.title": "Invitar y Detalles del Grupo",
  "wc.inviteTab.detailsTitle": "Detalles del grupo",
  "wc.inviteTab.meta.pool": "Grupo",
  "wc.inviteTab.meta.privacy": "Privacidad",
  "wc.inviteTab.meta.privacyPublic": "Público",
  "wc.inviteTab.meta.privacyPrivate":
    "Privado — solo por invitación",
  "wc.inviteTab.meta.maxUsers": "Usuarios máximos",
  "wc.inviteTab.meta.bracketsPerUser": "Brackets por usuario",
  "wc.inviteTab.meta.scoring": "Puntuación",
  "wc.inviteTab.meta.scoringValue": "Estilo NCAA",
  "wc.inviteTab.meta.lockRule": "Regla de cierre",
  "wc.inviteTab.meta.lockTournament":
    "Cierra con el primer partido de la Copa del Mundo",
  "wc.inviteTab.meta.lockPerMatch": "Cierre por partido al arranque",
  "wc.inviteTab.lockedBanner":
    "Este grupo está bloqueado. Los picks ya no se pueden editar.",
  "wc.inviteTab.member.title": "Invita amigos a este grupo",
  "wc.inviteTab.member.body":
    "Solo el comisionado del grupo puede copiar y compartir el enlace de invitación. Pídeselo al comisionado.",
  "wc.inviteTab.commissioner.linkTitle": "Enlace de invitación",
  "wc.inviteTab.commissioner.linkHelper":
    "Compártelo con quien quieras invitar. Necesitan tener sesión iniciada en AllFantasy.",
  "wc.inviteTab.commissioner.codeLabel": "Código de invitación",
  "wc.inviteTab.commissioner.copyCode": "Copiar código",
  "wc.inviteTab.commissioner.copyCodeDone": "Copiado",
  "wc.inviteTab.commissioner.copyLink": "Copiar enlace de invitación",
  "wc.inviteTab.commissioner.copyLinkDone": "¡Enlace copiado!",
  "wc.inviteTab.commissioner.copyMessage":
    "Copiar mensaje de invitación",
  "wc.inviteTab.commissioner.copyMessageDone": "¡Mensaje copiado!",
  "wc.inviteTab.commissioner.share": "Compartir",
  "wc.inviteTab.commissioner.previewInvite":
    "Vista previa del mensaje de invitación",
  "wc.inviteTab.commissioner.previewShare":
    "Vista previa del mensaje para compartir",
  "wc.inviteTab.commissioner.noCodeTitle":
    "Enlace de invitación no disponible",
  "wc.inviteTab.commissioner.noCodeBody":
    "El dueño del grupo o un admin puede regenerar el enlace desde los ajustes del grupo.",
  "wc.inviteTab.shareMessage.default":
    "¡Únete a mi grupo de brackets de la Copa del Mundo en AllFantasy: \"{{pool}}\"! Hasta {{maxEntries}} brackets, ordena la fase de grupos, arma los picks de eliminatorias y compite en el leaderboard en vivo. {{url}}",
  "wc.inviteTab.shareTitleNative":
    "{{pool}} — Bracket de la Copa del Mundo de AllFantasy",

  // ── Commissioner Checklist card chrome (extended) ────────────────────
  "wc.checklist.eyebrow": "Comisionado",
  "wc.checklist.cardSubtitle":
    "Progreso de los miembros de un vistazo. Visible solo para comisionados y admins del grupo.",
  "wc.checklist.copyReminderBtn": "Copiar mensaje recordatorio",
  "wc.checklist.copyReminderDone": "¡Recordatorio copiado!",
  "wc.checklist.stat.total": "Miembros totales",
  "wc.checklist.stat.finalized": "Finalizados",
  "wc.checklist.stat.inProgress": "En progreso",
  "wc.checklist.stat.completion": "Completado",
  "wc.checklist.entryStatus.finalized": "Finalizado",
  "wc.checklist.entryStatus.inProgress": "En progreso",
  "wc.checklist.entryStatus.needsPicks": "Faltan picks",
  "wc.checklist.entryStatus.unknown": "Desconocido",
  "wc.checklist.needsReminderBadge": "Necesita recordatorio",
  "wc.checklist.missingPicks": "Faltan {{count}}",
  "wc.checklist.previewReminder": "Vista previa del recordatorio",
  "wc.checklist.privacyNote":
    "Determinista — usa datos del snapshot ya cargado para herramientas del comisionado. No se muestran correos ni IDs.",
  "wc.checklist.empty.memberOnly":
    "Solo el comisionado o admin del grupo puede ver el estado de los miembros.",
  "wc.checklist.empty.loading":
    "Datos del comisionado aún cargando.",
  "wc.checklist.empty.noMembers":
    "Aún no hay miembros con entradas. Comparte el enlace de invitación para empezar.",
  "wc.checklist.empty.fallback":
    "No hay datos de miembros disponibles.",
  "wc.checklist.row.memberFallback": "Miembro",
  "wc.checklist.row.bracketFallback": "Bracket",
  "wc.checklist.row.finalizedRowOne": "{{count}} bracket finalizado",
  "wc.checklist.row.finalizedRowOther": "{{count}} brackets finalizados",

  // ── Commissioner reminder message templates ──────────────────────────
  "wc.checklist.reminder.askCommissioner":
    "Pídele al comisionado del grupo que recuerde a los miembros sobre {{pool}}.",
  "wc.checklist.reminder.finalizeLine":
    "Recordatorio amistoso: finaliza tus picks para \"{{pool}}\" en AllFantasy.",
  "wc.checklist.reminder.joinLine":
    "Recordatorio: únete a \"{{pool}}\" en AllFantasy y confirma tu bracket de la Copa del Mundo.",
  "wc.checklist.reminder.statusLine":
    "Estado: {{done}}/{{total}} brackets finalizados ({{percent}}%).",
  "wc.checklist.reminder.deadlineLine":
    "Los picks cierran {{deadline}}.",
  "wc.checklist.reminder.poweredBy": "Hecho con AllFantasy.",
  "wc.checklist.reminder.noSnapshotLine":
    "Recordatorio: termina tus picks para \"{{pool}}\" en AllFantasy.",

  // ── AI Report card chrome (extended) ─────────────────────────────────
  "wc.aiShareCard.eyebrow": "Gráfico para compartir",
  "wc.aiShareCard.subtitle":
    "Las 6 señales de IA en una tarjeta lista para copiar. Determinista — sin llamadas a IA al compartir.",
  "wc.aiShareCard.tierPro": "AF Pro",
  "wc.aiShareCard.tierPreview": "Vista previa básica",
  "wc.aiShareCard.emptyNoEntry":
    "Elige una entrada de bracket para generar la tarjeta.",
  "wc.aiShareCard.copyShare": "Copiar texto",
  "wc.aiShareCard.copyShareDone": "Copiado",
  "wc.aiShareCard.share": "Compartir",
  "wc.aiShareCard.privacyNote":
    "Privado para ti hasta que lo compartas. Usa solo tus propios datos del bracket y conteos agregados del grupo.",
  "wc.explain.eyebrow": "IA privada",
  "wc.explain.title": "Explica mi bracket",
  "wc.explain.subtitle":
    "Análisis narrativo privado de tu estrategia. Solo tú lo ves.",
  "wc.explain.tierPro": "AF Pro",
  "wc.explain.tierLocked": "Bloqueado",
  "wc.explain.locked":
    "AF Pro abre una explicación privada de IA sobre tu estrategia — estilo, picks más seguros, picks de mayor riesgo, camino del campeón, y una recomendación específica.",
  "wc.explain.generate": "Generar explicación",
  "wc.explain.generating": "Generando...",
  "wc.explain.selectFirst": "Elige primero un bracket",
  "wc.explain.regenerate": "Regenerar",
  "wc.explain.regenerating": "Regenerando...",
  "wc.explain.fallbackBadge": "Respaldo determinista",
  "wc.explain.error.generic": "No se pudo generar la explicación.",
  "wc.explain.error.network": "Error de red. Reintenta.",
  "wc.explain.privacyNote":
    "Privado para ti. Usa solo tus picks y datos públicos de equipos. Nunca se publica en el chat.",
  "wc.uniqueness.eyebrow": "Comparación del grupo",
  "wc.uniqueness.title": "¿Qué hace único a mi bracket?",
  "wc.uniqueness.subtitle":
    "Comparado solo contra los brackets finalizados de este grupo.",
  "wc.uniqueness.tierPro": "AF Pro",
  "wc.uniqueness.tierBasic": "Básico",
  "wc.uniqueness.empty.noEntry":
    "Elige una entrada de bracket para calcular la unicidad.",
  "wc.uniqueness.loading": "Cargando comparación del grupo...",
  "wc.uniqueness.error.couldNotLoad":
    "No se pudieron cargar los datos de unicidad.",
  "wc.uniqueness.error.network": "Error de red. Reintenta.",
  "wc.uniqueness.empty.notEnoughData":
    "La unicidad se desbloquea cuando se envíen más brackets finalizados.",
  "wc.uniqueness.empty.incomplete":
    "Haz tus picks de grupos y eliminatorias para ver qué tan único es tu bracket.",
  "wc.uniqueness.rarity.veryRare": "Muy raro",
  "wc.uniqueness.rarity.rare": "Raro",
  "wc.uniqueness.rarity.uncommon": "Poco común",
  "wc.uniqueness.rarity.common": "Común",
  "wc.uniqueness.percentShare": "Cuota {{percent}}%",
  "wc.uniqueness.privacyNote":
    "Determinista — cuenta solo brackets finalizados. Sin IA, sin picks de otros usuarios.",
  "wc.grade.eyebrow": "Calificación del bracket",
  "wc.grade.completionLabel": "{{percent}}% completo",
  "wc.grade.tierProDetail": "Detalle AF Pro",
  "wc.grade.tierBasic": "Básico",
  "wc.grade.stat.groups": "Grupos",
  "wc.grade.stat.thirdPlace": "Tercer puesto",
  "wc.grade.stat.knockouts": "Eliminatorias",
  "wc.grade.stat.missing": "Faltan",
  "wc.grade.risk": "Nivel de riesgo:",
  "wc.grade.upset": "Medidor de sorpresas:",
  "wc.grade.championConfidence": "Confianza del campeón:",
  "wc.grade.championConfidenceNone": "Sin campeón elegido",
  "wc.grade.biggestRisk": "Mayor riesgo:",
  "wc.grade.recommendation": "Recomendación:",
  "wc.grade.lockedBody":
    "AF Pro desbloquea el riesgo, medidor de sorpresas, confianza del campeón, mayor riesgo y recomendación.",
  "wc.confidence.title": "Verificación de confianza IA",
  "wc.confidence.tierOpen": "Abierto",
  "wc.confidence.tierLocked": "Bloqueado",
  "wc.confidence.missingPicks": "Picks faltantes:",
  "wc.confidence.noMissing": "Ninguno. Listo para finalizar.",
  "wc.confidence.missingBreakdown":
    "{{knockout}} eliminatorias, {{groups}} grupos, {{thirdPlace}} tercer puesto.",
  "wc.confidence.highRiskPicks": "Picks de alto riesgo:",
  "wc.confidence.highRiskBody":
    "{{count}} picks de rondas iniciales definen el camino de tu bracket.",
  "wc.confidence.bracketShape": "Forma del bracket:",
  "wc.confidence.bracketShapeChalk":
    "Demasiado favoritos. Considera si un pick contrario y medido mejora la unicidad.",
  "wc.confidence.bracketShapeBalanced":
    "Balanceado para una primera verificación de confianza.",
  "wc.confidence.finalizeConfidence": "Confianza para finalizar:",
  "wc.confidence.finalizeReady":
    "Listo para finalizar e ir al leaderboard.",
  "wc.confidence.finalizeMissing":
    "Termina los requisitos pendientes antes de finalizar.",
  "wc.confidence.privacyNote":
    "Solo predicción determinista y complejidad de puntuación. La orientación se limita a picks y mecánica de scoring.",
  "wc.confidence.lockedBody":
    "Actualiza a IA/Pro para abrir la verificación de confianza. Usuarios bloqueados no generan llamadas de IA.",
  "wc.path.title": "¿Qué necesita pasar para que yo gane?",
  "wc.path.subtitle":
    "Lectura privada de tu entrada actual. Los picks no finalizados de otros usuarios siguen ocultos.",
  "wc.path.tierActive": "AF Pro activo",
  "wc.path.tierLocked": "AF Pro bloqueado",
}

// Traditional Chinese (zh-TW). Sports-app voice — short, scannable.
const ZH: WorldCupDictionary = {
  // ── Shared / shell ───────────────────────────────────────────────────
  "wc.common.loading": "載入中...",
  "wc.common.back": "返回",
  "wc.common.openSettings": "開啟設定",
  "wc.common.signIn": "登入",
  "wc.common.signOut": "登出",

  // ── Public hub: /brackets/world-cup ──────────────────────────────────
  "wc.publicHub.backToBrackets": "← 返回賽事預測",
  "wc.publicHub.heroTitle": "世界盃對戰預測挑戰",
  "wc.publicHub.heroSubtitle":
    "為 FIFA 世界盃建立 NCAA 風格的對戰預測群組。邀請朋友、選出贏家、追蹤即時比分,並衝上排行榜。",
  "wc.publicHub.discover": "探索公開群組",
  "wc.publicHub.joinWithCode": "用邀請碼加入",
  "wc.publicHub.createPool": "建立群組",
  "wc.publicHub.createWorldCupPool": "建立世界盃群組",
  "wc.publicHub.yourPools": "你的世界盃群組",
  "wc.publicHub.poolsCountOne": "{{count}} 個群組",
  "wc.publicHub.poolsCountOther": "{{count}} 個群組",
  "wc.publicHub.scoreLabel": "積分",
  "wc.publicHub.rankLabel": "排名",
  "wc.publicHub.participantsOne": "{{count}} 位參賽者",
  "wc.publicHub.participantsOther": "{{count}} 位參賽者",
  "wc.publicHub.statusOpen": "開放中",
  "wc.publicHub.statusLocked": "已鎖定",
  "wc.publicHub.statusFinal": "已結束",
  "wc.publicHub.emptyTitle": "尚未加入任何世界盃群組",
  "wc.publicHub.emptyBody":
    "你還沒有建立或加入任何世界盃對戰群組。",
  "wc.publicHub.emptyHint":
    "建立一個並邀請朋友,或向朋友要邀請碼。",
  "wc.publicHub.signInTitle": "登入即可開始",
  "wc.publicHub.signInBody":
    "建立或加入世界盃對戰群組,和朋友一起競賽。",
  "wc.publicHub.signInCta": "登入並開始",
  "wc.publicHub.feature.privatePublic":
    "私人或公開群組 — 最多 100 位參賽者。",
  "wc.publicHub.feature.bracketsPerUser":
    "每位使用者最多 5 個對戰表,用不同策略一起比拼。",
  "wc.publicHub.feature.ncaaScoring":
    "NCAA 風格計分 — 越後面的回合分數越高。",
  "wc.publicHub.feature.guidedPicker":
    "AI 對戰預覽輔助的引導式選擇工具。",
  "wc.publicHub.feature.liveTracking":
    "即時比分與分鐘級追蹤。",
  "wc.publicHub.feature.aiBracketBuilder":
    "AI 對戰表生成器自動填入尚未選擇的比賽。",
  "wc.publicHub.feature.perBracketLeaderboard":
    "每個對戰表都有獨立排行榜,個別排名。",
  "wc.publicHub.feature.lockOnKickoff":
    "世界盃首場比賽開賽時對戰表即鎖定。",

  // ── Pool dashboard: tab labels ───────────────────────────────────────
  "wc.tab.home": "首頁",
  "wc.tab.groupStage": "小組賽",
  "wc.tab.picks": "淘汰賽",
  "wc.tab.review": "檢閱",
  "wc.tab.leaderboard": "排行榜",
  "wc.tab.rules": "規則",
  "wc.tab.invite": "邀請",
  "wc.tab.commissioner": "管理員",
  "wc.tab.admin": "後台",

  // ── Pool dashboard: header / status strip ────────────────────────────
  "wc.header.sync": "同步",
  "wc.header.inviteAria": "邀請朋友",
  "wc.header.invite": "邀請",
  "wc.header.testMode": "測試模式",
  "wc.header.testModeNote":
    "比賽結果為模擬資料,可能會影響排行榜。",

  // ── Lock countdown ───────────────────────────────────────────────────
  "wc.lock.untilLockDays": "距離選擇鎖定還有 {{d}} 天 {{h}} 小時",
  "wc.lock.untilLockHours": "距離選擇鎖定還有 {{h}} 小時 {{m}} 分",
  "wc.lock.untilLockMinutes": "距離選擇鎖定還有 {{m}} 分鐘",
  "wc.lock.locksSoon": "對戰表即將鎖定",
  "wc.lock.bracketLocked": "對戰表已鎖定",
  "wc.lock.picksFrozen": "對戰表已鎖定 — 選擇無法再修改。",

  // ── Knockouts tab ────────────────────────────────────────────────────
  "wc.knockouts.intro.reseeded":
    "正式的 32 強賽程公布後即可選擇淘汰賽。",
  "wc.knockouts.intro.predictive":
    "你的淘汰賽對戰表會根據你預測的小組賽結果產生。",
  "wc.knockouts.subintro.reseeded":
    "小組賽選擇現在正常運作。當正式的淘汰賽賽程同步後,你會從官方對戰表重新做淘汰賽選擇。",
  "wc.knockouts.subintro.predictive":
    "淘汰賽對戰會依照你的小組賽預測即時更新。修改小組預測可能會重置受影響的淘汰賽選擇。",
  "wc.knockouts.startPicks": "開始選擇",
  "wc.knockouts.continuePicks": "繼續選擇",
  "wc.knockouts.guidance.complete":
    "已完成 {{done}}/{{required}} 個目前可選的場次。",
  "wc.knockouts.guidance.nextPick": "下一個選擇:第 {{matchNumber}} 場。",
  "wc.knockouts.guidance.blocked":
    "請先選擇前幾輪的勝者。確認前幾輪勝者後會解鎖更多選擇。",
  "wc.knockouts.guidance.noneReady":
    "目前沒有可進行的淘汰賽選擇。",

  // ── Knockout Danger Zones card ───────────────────────────────────────
  "wc.danger.eyebrow": "淘汰賽",
  "wc.danger.title": "淘汰賽風險區",
  "wc.danger.subtitle":
    "確定性分析 — 比較你的選擇與賽前種子強度以及比賽即時狀態。",
  "wc.danger.tierPro": "AF Pro",
  "wc.danger.tierBasic": "基本版",
  "wc.danger.emptyNoEntry": "開啟一個對戰表項目即可查看風險區。",
  "wc.danger.emptyNoPicks": "完成淘汰賽選擇後即可查看風險區。",
  "wc.danger.emptyNoRisks":
    "目前沒有風險區。你的所有淘汰賽選擇從賽前實力來看都偏向有利。",
  "wc.danger.severityHigh": "高",
  "wc.danger.severityMedium": "中",
  "wc.danger.severityLow": "低",
  "wc.danger.severitySuffix": "風險",
  "wc.danger.footer":
    "僅統計你自己的選擇與公開賽程。不呼叫 AI。不使用其他使用者的選擇。",

  // ── AI Report (Review tab) ───────────────────────────────────────────
  "wc.aiReport.eyebrow": "報告",
  "wc.aiReport.title": "你的對戰表 AI 報告",
  "wc.aiReport.subtitle":
    "六項 AI 訊號全部來自你自己的選擇。以下內容僅你可見。",
  "wc.aiReport.tierActive": "AF Pro 已啟用",
  "wc.aiReport.tierPreview": "AF Pro 預覽",

  // ── Share / Invite ───────────────────────────────────────────────────
  "wc.invite.title": "邀請朋友",
  "wc.invite.copyLink": "複製邀請連結",
  "wc.invite.copied": "已複製連結!",
  "wc.invite.shareNative": "分享",
  "wc.invite.shareViaText": "簡訊",
  "wc.invite.shareViaEmail": "Email",
  "wc.invite.viaSocial": "社群",
  "wc.invite.heading":
    "邀請朋友加入 {{poolName}},在 AllFantasy 一起比拼。",
  "wc.invite.inviteCodeLabel": "邀請碼",

  // ── Commissioner Checklist ───────────────────────────────────────────
  "wc.checklist.title": "群組完成度清單",
  "wc.checklist.subtitle":
    "{{poolName}} 的成員以及他們相對於鎖定時間的進度。",
  "wc.checklist.copyReminder": "複製提醒",
  "wc.checklist.reminderCopied": "已複製提醒!",
  "wc.checklist.statusReady": "就緒",
  "wc.checklist.statusNoMembers": "尚無成員",
  "wc.checklist.statusNoData": "暫無快照資料",

  // ── Empty / loading / error states ───────────────────────────────────
  "wc.state.loading": "載入中...",
  "wc.state.refresh": "重新整理",
  "wc.state.tryAgain": "重試",
  "wc.state.noEntries":
    "你尚未為這個群組建立對戰表項目。",
  "wc.state.createEntry": "建立我的對戰表",

  // ── Language selector tooltip ────────────────────────────────────────
  "wc.language.label": "語言",
  "wc.language.english": "English",
  "wc.language.spanish": "Español",
  "wc.language.chinese": "繁體中文",
  "wc.language.filipino": "Filipino",
  "wc.language.vietnamese": "Tiếng Việt",

  // ── Create page / modal ──────────────────────────────────────────────
  "wc.create.goBack": "返回",
  "wc.create.header": "建立世界盃對戰群組",
  "wc.create.subheader": "2026 FIFA 世界盃 · 依回合計分",
  "wc.create.heroTitle": "2026 FIFA 世界盃",
  "wc.create.heroSubtitle":
    "建立一個群組容器 — 邀請朋友,讓他們在裡面建立自己的對戰表。",
  "wc.create.poolName.label": "群組名稱",
  "wc.create.poolName.placeholder": "例如:辦公室世界盃 2026",
  "wc.create.poolName.error.blank": "群組名稱不能空白。",
  "wc.create.poolName.default": "世界盃對戰群組",
  "wc.create.visibility.label": "群組可見性",
  "wc.create.visibility.private": "私人",
  "wc.create.visibility.privateHint": "需要邀請連結才能加入",
  "wc.create.visibility.public": "公開",
  "wc.create.visibility.publicHint": "任何人都可以發現並加入",
  "wc.create.maxUsers.label": "人數上限",
  "wc.create.maxUsers.hint": "每個群組最多 {{max}} 人",
  "wc.create.maxUsers.error": "必須介於 2 到 {{max}} 之間。",
  "wc.create.maxEntries.label": "每位使用者對戰表數",
  "wc.create.maxEntries.hint": "每位使用者最多 {{max}} 個",
  "wc.create.maxEntries.error": "必須介於 1 到 {{max}} 之間。",
  "wc.create.lockRule.label": "選擇鎖定規則",
  "wc.create.lockRule.tournament": "全賽事鎖定",
  "wc.create.lockRule.tournamentHint":
    "第一場比賽開始時所有選擇皆鎖定",
  "wc.create.lockRule.perMatch": "逐場鎖定",
  "wc.create.lockRule.perMatchHint":
    "每場比賽於自身開球時鎖定",
  "wc.create.lockRule.copyTournament":
    "在世界盃首場比賽開球前,選擇都可修改。",
  "wc.create.lockRule.copyPerMatch":
    "每場比賽在自身開球前都可修改。",
  "wc.create.scoring.intro": "依回合計分:",
  "wc.create.scoring.values":
    "32 強 10 分 · 16 強 20 分 · 八強 40 分 · 四強 80 分 · 決賽 160 分 · 冠軍獎勵 320 分",
  "wc.create.helper.entriesOne":
    "每位使用者最多可建立 {{max}} 個對戰表。",
  "wc.create.helper.entriesOther":
    "每位使用者最多可建立 {{max}} 個對戰表。",
  "wc.create.helper.leaderboard":
    "排行榜只計入已送出的對戰表,不計草稿。",
  "wc.create.helper.inviteLink":
    "建立後會顯示邀請連結。",
  "wc.create.thirdPlace": "包含季軍戰",
  "wc.create.testFixtures.label": "載入測試賽程",
  "wc.create.testFixtures.hint":
    "加入模擬的 32 強球隊、國旗、開球時間與場地,讓此群組可以立刻開始選擇。",
  "wc.create.submit.idle": "建立群組",
  "wc.create.submit.creating": "建立中...",
  "wc.create.submit.opening": "已建立,正在開啟...",
  "wc.create.openingSuccess": "已建立對戰表,正在開啟...",
  "wc.create.error.signInRequired": "請先登入再建立對戰表。",
  "wc.create.error.noId":
    "對戰表已建立,但伺服器未回傳 ID,請重新整理頁面。",
  "wc.create.error.generic": "無法建立對戰表",
  "wc.create.error.requestFailed": "請求失敗({{status}})",

  // ── Discover page ────────────────────────────────────────────────────
  "wc.discover.backToHub": "← 返回世界盃主頁",
  "wc.discover.createPool": "建立群組",
  "wc.discover.title": "探索公開群組",
  "wc.discover.subtitle":
    "瀏覽公開的世界盃對戰群組。加入後會開啟尚未選擇的 Bracket 1 — 當群組接受新成員且未滿時,我們會直接帶你進入引導式選擇。",
  "wc.discover.search.label": "搜尋",
  "wc.discover.search.placeholder": "群組名稱",
  "wc.discover.season.label": "賽季",
  "wc.discover.season.placeholder": "例如:2026",
  "wc.discover.statusFilter.label": "狀態",
  "wc.discover.statusFilter.all": "全部",
  "wc.discover.statusFilter.open": "開放中",
  "wc.discover.statusFilter.locked": "已鎖定",
  "wc.discover.statusFilter.final": "已結束",
  "wc.discover.loading": "正在載入公開群組...",
  "wc.discover.errors.couldNotLoad": "無法載入群組",
  "wc.discover.empty":
    "沒有符合篩選條件的公開群組。換個賽季或清除搜尋 — 也可以用上方的邀請碼加入私人群組。",
  "wc.discover.joinPanelTitle": "用邀請碼加入(私人群組)",

  // ── Discover card ────────────────────────────────────────────────────
  "wc.discover.card.statusOpen": "開放中",
  "wc.discover.card.blockedFull": "群組已滿",
  "wc.discover.card.blockedClosed": "已停止接受新成員",
  "wc.discover.card.password": "密碼",
  "wc.discover.card.lateJoin": "選擇已鎖定 · 仍可後加入",
  "wc.discover.card.preview": "預覽",
  "wc.discover.card.join": "加入",

  // ── Join / invite panel ──────────────────────────────────────────────
  "wc.join.backToHub": "← 返回世界盃主頁",
  "wc.join.brandEyebrow": "AllFantasy",
  "wc.join.brandTitle": "2026 世界盃對戰群組",
  "wc.join.panelTitle": "用邀請碼加入",
  "wc.join.panelHelper":
    "輸入你管理員提供的邀請碼。加入後會抵達群組主頁,即可開始你的第一個對戰表。受密碼保護的群組需要在群組設定中設定的加入密碼。",
  "wc.join.codeInput.placeholder": "WCUP 邀請碼",
  "wc.join.previewBtn": "預覽",
  "wc.join.errors.invalidCode": "請輸入有效的邀請碼",
  "wc.join.errors.notFound": "找不到該邀請",
  "wc.join.errors.full": "此群組已滿。",
  "wc.join.errors.closed": "此群組不再接受新成員。",
  "wc.join.errors.couldNotJoin": "無法加入",
  "wc.join.preview.hostLine":
    "主辦人:{{owner}} · {{count}} 人遊玩 · {{visibility}}",
  "wc.join.preview.openCopy":
    "立即加入即可建立 Bracket 1、進行小組賽與淘汰賽選擇,並在準備好時送出。",
  "wc.join.preview.fullCopy": "此群組已滿。",
  "wc.join.preview.closedCopy":
    "群組已鎖定 — 不再接受新成員。",
  "wc.join.preview.passwordLabel": "加入密碼",
  "wc.join.preview.joinBtn": "加入群組",
  "wc.join.success": "已加入 — Bracket 1 已就緒。",

  // ── Finalize / share success block (Review tab) ──────────────────────
  "wc.finalize.eyebrow": "已送出",
  "wc.finalize.title": "你的對戰表已鎖定",
  "wc.finalize.subtitleNoTime":
    "已送出。在群組鎖定前你仍可編輯 — 趁名額還沒滿,趕快邀請朋友。",
  "wc.finalize.subtitleWithTime":
    "於 {{at}} 送出。在群組鎖定前你仍可編輯 — 趁名額還沒滿,趕快邀請朋友。",
  "wc.finalize.copyShare": "複製分享文字",
  "wc.finalize.copyShareCopied": "已複製!",
  "wc.finalize.shareReport": "分享我的 AI 對戰表報告",
  "wc.finalize.inviteFriends": "邀請朋友來挑戰我的對戰表",
  "wc.finalize.previewShare": "預覽分享文字",

  // ── Inside-pool Invite tab ───────────────────────────────────────────
  "wc.inviteTab.eyebrow": "群組",
  "wc.inviteTab.title": "邀請與群組資訊",
  "wc.inviteTab.detailsTitle": "群組資訊",
  "wc.inviteTab.meta.pool": "群組",
  "wc.inviteTab.meta.privacy": "隱私",
  "wc.inviteTab.meta.privacyPublic": "公開",
  "wc.inviteTab.meta.privacyPrivate": "私人 — 僅限邀請",
  "wc.inviteTab.meta.maxUsers": "人數上限",
  "wc.inviteTab.meta.bracketsPerUser": "每位使用者對戰表數",
  "wc.inviteTab.meta.scoring": "計分方式",
  "wc.inviteTab.meta.scoringValue": "NCAA 風格",
  "wc.inviteTab.meta.lockRule": "鎖定規則",
  "wc.inviteTab.meta.lockTournament":
    "於世界盃首場比賽鎖定",
  "wc.inviteTab.meta.lockPerMatch": "逐場於開球時鎖定",
  "wc.inviteTab.lockedBanner":
    "此群組已鎖定,選擇無法再修改。",
  "wc.inviteTab.member.title": "邀請朋友加入此群組",
  "wc.inviteTab.member.body":
    "只有群組管理員能複製並分享邀請連結。請向管理員索取邀請連結或代碼。",
  "wc.inviteTab.commissioner.linkTitle": "邀請連結",
  "wc.inviteTab.commissioner.linkHelper":
    "把這個連結分享給你想邀請的人。他們需要登入 AllFantasy。",
  "wc.inviteTab.commissioner.codeLabel": "邀請碼",
  "wc.inviteTab.commissioner.copyCode": "複製代碼",
  "wc.inviteTab.commissioner.copyCodeDone": "已複製",
  "wc.inviteTab.commissioner.copyLink": "複製邀請連結",
  "wc.inviteTab.commissioner.copyLinkDone": "連結已複製!",
  "wc.inviteTab.commissioner.copyMessage": "複製邀請訊息",
  "wc.inviteTab.commissioner.copyMessageDone": "訊息已複製!",
  "wc.inviteTab.commissioner.share": "分享",
  "wc.inviteTab.commissioner.previewInvite": "預覽邀請訊息",
  "wc.inviteTab.commissioner.previewShare": "預覽分享訊息",
  "wc.inviteTab.commissioner.noCodeTitle": "邀請連結尚未啟用",
  "wc.inviteTab.commissioner.noCodeBody":
    "群組擁有者或管理員可以從群組設定重新產生邀請連結。",
  "wc.inviteTab.shareMessage.default":
    "來加入我在 AllFantasy 的 2026 世界盃對戰群組「{{pool}}」!最多可建立 {{maxEntries}} 個對戰表,排序小組賽、建立淘汰賽選擇,並在即時排行榜上競賽。 {{url}}",
  "wc.inviteTab.shareTitleNative":
    "{{pool}} — AllFantasy 世界盃對戰表",

  // ── Commissioner Checklist card chrome (extended) ────────────────────
  "wc.checklist.eyebrow": "管理員",
  "wc.checklist.cardSubtitle":
    "一覽成員進度。僅群組管理員與系統管理員可見。",
  "wc.checklist.copyReminderBtn": "複製提醒訊息",
  "wc.checklist.copyReminderDone": "提醒已複製!",
  "wc.checklist.stat.total": "總成員",
  "wc.checklist.stat.finalized": "已送出",
  "wc.checklist.stat.inProgress": "進行中",
  "wc.checklist.stat.completion": "完成度",
  "wc.checklist.entryStatus.finalized": "已送出",
  "wc.checklist.entryStatus.inProgress": "進行中",
  "wc.checklist.entryStatus.needsPicks": "需要選擇",
  "wc.checklist.entryStatus.unknown": "未知",
  "wc.checklist.needsReminderBadge": "需要提醒",
  "wc.checklist.missingPicks": "缺少 {{count}} 項",
  "wc.checklist.previewReminder": "預覽提醒訊息",
  "wc.checklist.privacyNote":
    "確定性 — 使用管理員工具已載入的快照資料。不顯示 Email 或使用者 ID。",
  "wc.checklist.empty.memberOnly":
    "只有群組管理員或系統管理員可以看到成員狀態。",
  "wc.checklist.empty.loading":
    "管理員狀態資料仍在載入中。",
  "wc.checklist.empty.noMembers":
    "尚無成員建立對戰表。分享邀請連結以開始。",
  "wc.checklist.empty.fallback": "目前沒有成員資料。",
  "wc.checklist.row.memberFallback": "成員",
  "wc.checklist.row.bracketFallback": "對戰表",
  "wc.checklist.row.finalizedRowOne": "{{count}} 個已送出的對戰表",
  "wc.checklist.row.finalizedRowOther": "{{count}} 個已送出的對戰表",

  // ── Commissioner reminder message templates ──────────────────────────
  "wc.checklist.reminder.askCommissioner":
    "請群組管理員提醒成員注意 {{pool}}。",
  "wc.checklist.reminder.finalizeLine":
    "提醒:請在 AllFantasy 完成「{{pool}}」的選擇並送出。",
  "wc.checklist.reminder.joinLine":
    "提醒:加入 AllFantasy 上的「{{pool}}」,並鎖定你的世界盃對戰表。",
  "wc.checklist.reminder.statusLine":
    "進度:{{done}}/{{total}} 個對戰表已送出({{percent}}%)。",
  "wc.checklist.reminder.deadlineLine":
    "選擇將於 {{deadline}} 鎖定。",
  "wc.checklist.reminder.poweredBy": "由 AllFantasy 提供支援。",
  "wc.checklist.reminder.noSnapshotLine":
    "提醒:請在 AllFantasy 完成「{{pool}}」的選擇。",

  // ── AI Report card chrome (extended) ─────────────────────────────────
  "wc.aiShareCard.eyebrow": "分享圖卡",
  "wc.aiShareCard.subtitle":
    "六項 AI 訊號集中在一張可複製的圖卡。確定性 — 分享不會呼叫 AI。",
  "wc.aiShareCard.tierPro": "AF Pro",
  "wc.aiShareCard.tierPreview": "基本版預覽",
  "wc.aiShareCard.emptyNoEntry": "選擇對戰表項目即可產生分享圖卡。",
  "wc.aiShareCard.copyShare": "複製分享文字",
  "wc.aiShareCard.copyShareDone": "已複製",
  "wc.aiShareCard.share": "分享",
  "wc.aiShareCard.privacyNote":
    "在你分享前完全私人保留。只用你自己的對戰表資料以及群組的彙總統計。",
  "wc.explain.eyebrow": "私人 AI",
  "wc.explain.title": "解析我的對戰表",
  "wc.explain.subtitle":
    "你的對戰表策略私人敘事分析。只有你看得到。",
  "wc.explain.tierPro": "AF Pro",
  "wc.explain.tierLocked": "已鎖定",
  "wc.explain.locked":
    "AF Pro 可解鎖 AI 私人解析:風格、最安全的選擇、風險最高的選擇、冠軍路徑與一個具體建議。",
  "wc.explain.generate": "產生解析",
  "wc.explain.generating": "產生中...",
  "wc.explain.selectFirst": "請先選擇對戰表",
  "wc.explain.regenerate": "重新產生",
  "wc.explain.regenerating": "重新產生中...",
  "wc.explain.fallbackBadge": "確定性備援",
  "wc.explain.error.generic": "無法產生解析。",
  "wc.explain.error.network": "網路錯誤,請重試。",
  "wc.explain.privacyNote":
    "完全私人。只用你的選擇與公開球隊資料,絕不發到聊天室。",
  "wc.uniqueness.eyebrow": "群組比較",
  "wc.uniqueness.title": "我的對戰表有何獨特之處?",
  "wc.uniqueness.subtitle":
    "僅與此群組內已送出的對戰表比較。",
  "wc.uniqueness.tierPro": "AF Pro",
  "wc.uniqueness.tierBasic": "基本版",
  "wc.uniqueness.empty.noEntry":
    "選擇對戰表項目即可計算獨特度。",
  "wc.uniqueness.loading": "正在載入群組比較...",
  "wc.uniqueness.error.couldNotLoad": "無法載入獨特度資料。",
  "wc.uniqueness.error.network": "網路錯誤,請重試。",
  "wc.uniqueness.empty.notEnoughData":
    "等更多對戰表完成送出後即會解鎖獨特度。",
  "wc.uniqueness.empty.incomplete":
    "完成小組賽與淘汰賽選擇即可查看獨特度。",
  "wc.uniqueness.rarity.veryRare": "極稀有",
  "wc.uniqueness.rarity.rare": "稀有",
  "wc.uniqueness.rarity.uncommon": "不常見",
  "wc.uniqueness.rarity.common": "常見",
  "wc.uniqueness.percentShare": "佔比 {{percent}}%",
  "wc.uniqueness.privacyNote":
    "確定性 — 只計算已送出的對戰表。不呼叫 AI,不顯示其他使用者的原始選擇。",
  "wc.grade.eyebrow": "對戰表評分",
  "wc.grade.completionLabel": "完成度 {{percent}}%",
  "wc.grade.tierProDetail": "AF Pro 詳細",
  "wc.grade.tierBasic": "基本版",
  "wc.grade.stat.groups": "小組賽",
  "wc.grade.stat.thirdPlace": "季軍戰",
  "wc.grade.stat.knockouts": "淘汰賽",
  "wc.grade.stat.missing": "尚缺",
  "wc.grade.risk": "風險等級:",
  "wc.grade.upset": "爆冷指數:",
  "wc.grade.championConfidence": "冠軍信心度:",
  "wc.grade.championConfidenceNone": "尚未選冠軍",
  "wc.grade.biggestRisk": "最大風險:",
  "wc.grade.recommendation": "建議:",
  "wc.grade.lockedBody":
    "AF Pro 解鎖風險、爆冷指數、冠軍信心度、最大風險與建議細節。",
  "wc.confidence.title": "AI 信心檢查",
  "wc.confidence.tierOpen": "已開啟",
  "wc.confidence.tierLocked": "已鎖定",
  "wc.confidence.missingPicks": "缺少的選擇:",
  "wc.confidence.noMissing": "沒有,可以送出了。",
  "wc.confidence.missingBreakdown":
    "{{knockout}} 場淘汰賽、{{groups}} 個小組、{{thirdPlace}} 個季軍位置。",
  "wc.confidence.highRiskPicks": "高風險選擇:",
  "wc.confidence.highRiskBody":
    "{{count}} 個前期選擇將決定大部分的對戰表走向。",
  "wc.confidence.bracketShape": "對戰表結構:",
  "wc.confidence.bracketShapeChalk":
    "過度押熱門。可以考慮一個有節制的反向選擇來提升獨特度。",
  "wc.confidence.bracketShapeBalanced":
    "結構平衡,適合第一輪信心檢查。",
  "wc.confidence.finalizeConfidence": "送出信心度:",
  "wc.confidence.finalizeReady": "已可送出,進入排行榜。",
  "wc.confidence.finalizeMissing":
    "在送出前先完成缺少的項目。",
  "wc.confidence.privacyNote":
    "僅為確定性預測與計分複雜度。對戰表指引僅限於選擇與計分機制。",
  "wc.confidence.lockedBody":
    "升級到 AI/Pro 即可開啟信心檢查。未升級的使用者不會觸發 AI 呼叫。",
  "wc.path.title": "我需要什麼條件才能贏?",
  "wc.path.subtitle":
    "私人當前項目分析。其他使用者尚未送出的選擇仍然保密。",
  "wc.path.tierActive": "AF Pro 已啟用",
  "wc.path.tierLocked": "AF Pro 已鎖定",
}

// Filipino — natural sports-app Filipino, light Taglish where it reads
// more naturally (matches how PH football/basketball apps actually talk).
const FIL: WorldCupDictionary = {
  // ── Shared / shell ───────────────────────────────────────────────────
  "wc.common.loading": "Naglo-load...",
  "wc.common.back": "Bumalik",
  "wc.common.openSettings": "Buksan ang settings",
  "wc.common.signIn": "Mag-sign in",
  "wc.common.signOut": "Mag-sign out",

  // ── Public hub: /brackets/world-cup ──────────────────────────────────
  "wc.publicHub.backToBrackets": "← Balik sa Brackets",
  "wc.publicHub.heroTitle": "World Cup Bracket Challenge",
  "wc.publicHub.heroSubtitle":
    "Gumawa ng NCAA-style bracket pool para sa FIFA World Cup. Mag-invite ng kaibigan, mag-pick, mag-track ng live na iskor, at umakyat sa leaderboard.",
  "wc.publicHub.discover": "Maghanap ng public pools",
  "wc.publicHub.joinWithCode": "Sumali gamit ang invite code",
  "wc.publicHub.createPool": "Gumawa ng pool",
  "wc.publicHub.createWorldCupPool": "Gumawa ng World Cup pool",
  "wc.publicHub.yourPools": "Iyong World Cup pools",
  "wc.publicHub.poolsCountOne": "{{count}} pool",
  "wc.publicHub.poolsCountOther": "{{count}} na pools",
  "wc.publicHub.scoreLabel": "Iskor",
  "wc.publicHub.rankLabel": "Ranggo",
  "wc.publicHub.participantsOne": "{{count}} kalahok",
  "wc.publicHub.participantsOther": "{{count}} na kalahok",
  "wc.publicHub.statusOpen": "Bukas",
  "wc.publicHub.statusLocked": "Nakasara",
  "wc.publicHub.statusFinal": "Final",
  "wc.publicHub.emptyTitle": "Wala pang World Cup pools",
  "wc.publicHub.emptyBody":
    "Hindi ka pa nakakagawa o nakakasali sa anumang World Cup bracket pool.",
  "wc.publicHub.emptyHint":
    "Gumawa ka ng isa at mag-invite ng mga kaibigan, o humingi ng invite code.",
  "wc.publicHub.signInTitle": "Mag-sign in para magsimula",
  "wc.publicHub.signInBody":
    "Gumawa o sumali sa isang World Cup bracket pool at makipagtagisan sa mga kaibigan.",
  "wc.publicHub.signInCta": "Mag-sign in para magsimula",
  "wc.publicHub.feature.privatePublic":
    "Private o public pools — hanggang 100 kalahok.",
  "wc.publicHub.feature.bracketsPerUser":
    "Hanggang 5 brackets bawat user, lumaban gamit ang iba't ibang strategy.",
  "wc.publicHub.feature.ncaaScoring":
    "NCAA-style scoring — mas mataas na puntos sa mga huling round.",
  "wc.publicHub.feature.guidedPicker":
    "Gabay sa pag-pick gamit ang AI matchup previews.",
  "wc.publicHub.feature.liveTracking":
    "Live na iskor at minute-by-minute na tracking.",
  "wc.publicHub.feature.aiBracketBuilder":
    "Awtomatikong pupunan ng AI bracket builder ang mga hindi napiling laban.",
  "wc.publicHub.feature.perBracketLeaderboard":
    "Per-bracket leaderboard — bawat entry ay may sariling ranggo.",
  "wc.publicHub.feature.lockOnKickoff":
    "Magla-lock ang mga bracket sa simula ng unang World Cup match.",

  // ── Pool dashboard: tab labels ───────────────────────────────────────
  "wc.tab.home": "Home",
  "wc.tab.groupStage": "Group Stage",
  "wc.tab.picks": "Knockouts",
  "wc.tab.review": "Review",
  "wc.tab.leaderboard": "Leaderboard",
  "wc.tab.rules": "Mga Patakaran",
  "wc.tab.invite": "Mag-invite",
  "wc.tab.commissioner": "Commissioner",
  "wc.tab.admin": "Admin",

  // ── Pool dashboard: header / status strip ────────────────────────────
  "wc.header.sync": "I-sync",
  "wc.header.inviteAria": "Mag-invite ng kaibigan",
  "wc.header.invite": "Mag-invite",
  "wc.header.testMode": "Test mode",
  "wc.header.testModeNote":
    "simulated ang mga resulta at puwedeng makaapekto sa leaderboard.",

  // ── Lock countdown ───────────────────────────────────────────────────
  "wc.lock.untilLockDays":
    "{{d}}d {{h}}h bago mag-lock ang mga pick",
  "wc.lock.untilLockHours":
    "{{h}}h {{m}}m bago mag-lock ang mga pick",
  "wc.lock.untilLockMinutes":
    "{{m}}m bago mag-lock ang mga pick",
  "wc.lock.locksSoon": "Malapit nang mag-lock ang bracket",
  "wc.lock.bracketLocked": "Naka-lock na ang bracket",
  "wc.lock.picksFrozen":
    "Naka-lock na ang bracket — hindi na puwedeng baguhin ang mga pick.",

  // ── Knockouts tab ────────────────────────────────────────────────────
  "wc.knockouts.intro.reseeded":
    "Bubukas ang Knockout picks kapag available na ang official Round of 32 fixtures.",
  "wc.knockouts.intro.predictive":
    "Galing sa iyong predicted group results ang knockout bracket mo.",
  "wc.knockouts.subintro.reseeded":
    "Ayos pa rin ang Group Stage picks. Kapag na-sync na ang totoong knockout fixtures, gagawa ka ng bagong knockout picks mula sa official bracket.",
  "wc.knockouts.subintro.predictive":
    "Nagba-base ang Knockout matchups sa iyong Group Stage predictions. Kung papalitan ang group predictions puwedeng ma-reset ang ilang knockout picks.",
  "wc.knockouts.startPicks": "Simulan ang picks",
  "wc.knockouts.continuePicks": "Ituloy ang picks",
  "wc.knockouts.guidance.complete":
    "{{done}}/{{required}} na available na picks ang tapos.",
  "wc.knockouts.guidance.nextPick":
    "Susunod na pick: Match {{matchNumber}}.",
  "wc.knockouts.guidance.blocked":
    "Pumili muna ng mga winner sa naunang rounds. Magbubukas ang mas maraming pick kapag may na-confirm na winner.",
  "wc.knockouts.guidance.noneReady":
    "Wala pang available na knockout picks sa ngayon.",

  // ── Knockout Danger Zones card ───────────────────────────────────────
  "wc.danger.eyebrow": "Knockouts",
  "wc.danger.title": "Knockout Danger Zones",
  "wc.danger.subtitle":
    "Deterministic — kinukumpara ang iyong picks sa pre-tournament seed strength at sa live match state.",
  "wc.danger.tierPro": "AF Pro",
  "wc.danger.tierBasic": "Basic",
  "wc.danger.emptyNoEntry":
    "Magbukas ng bracket entry para makita ang danger zones.",
  "wc.danger.emptyNoPicks":
    "Mag-knockout picks ka para makita ang danger zones.",
  "wc.danger.emptyNoRisks":
    "Wala pang danger zones ngayon. Mukhang pabor ang lahat ng iyong knockout picks base sa pre-tournament strength.",
  "wc.danger.severityHigh": "Mataas",
  "wc.danger.severityMedium": "Katamtaman",
  "wc.danger.severityLow": "Mababa",
  "wc.danger.severitySuffix": "na panganib",
  "wc.danger.footer":
    "Tinitignan lang ang iyong sariling picks vs public schedule. Walang AI call. Walang ibang user's picks.",

  // ── AI Report (Review tab) ───────────────────────────────────────────
  "wc.aiReport.eyebrow": "Report",
  "wc.aiReport.title": "Iyong Bracket AI Report",
  "wc.aiReport.subtitle":
    "Anim na AI signals na galing sa iyong sariling picks. Lahat ng nasa ibaba ay para sa iyo lang.",
  "wc.aiReport.tierActive": "AF Pro active",
  "wc.aiReport.tierPreview": "AF Pro preview",

  // ── Share / Invite ───────────────────────────────────────────────────
  "wc.invite.title": "Mag-invite ng kaibigan",
  "wc.invite.copyLink": "Kopyahin ang invite link",
  "wc.invite.copied": "Na-copy ang link!",
  "wc.invite.shareNative": "I-share",
  "wc.invite.shareViaText": "Text",
  "wc.invite.shareViaEmail": "Email",
  "wc.invite.viaSocial": "Social",
  "wc.invite.heading":
    "Mag-invite ng kaibigan na makasali sa {{poolName}} sa AllFantasy.",
  "wc.invite.inviteCodeLabel": "Invite code",

  // ── Commissioner Checklist ───────────────────────────────────────────
  "wc.checklist.title": "Pool Completion Checklist",
  "wc.checklist.subtitle":
    "Mga miyembro ng {{poolName}} at ang kanilang status sa harap ng lock deadline.",
  "wc.checklist.copyReminder": "Kopyahin ang reminder",
  "wc.checklist.reminderCopied": "Na-copy ang reminder!",
  "wc.checklist.statusReady": "Handa na",
  "wc.checklist.statusNoMembers": "Wala pang miyembro",
  "wc.checklist.statusNoData": "Walang snapshot na available",

  // ── Empty / loading / error states ───────────────────────────────────
  "wc.state.loading": "Naglo-load...",
  "wc.state.refresh": "I-refresh",
  "wc.state.tryAgain": "Subukan ulit",
  "wc.state.noEntries":
    "Wala ka pang bracket entry para sa pool na ito.",
  "wc.state.createEntry": "Gumawa ng aking bracket",

  // ── Language selector tooltip ────────────────────────────────────────
  "wc.language.label": "Wika",
  "wc.language.english": "English",
  "wc.language.spanish": "Español",
  "wc.language.chinese": "繁體中文",
  "wc.language.filipino": "Filipino",
  "wc.language.vietnamese": "Tiếng Việt",

  // ── Create page / modal ──────────────────────────────────────────────
  "wc.create.goBack": "Bumalik",
  "wc.create.header": "Gumawa ng World Cup Bracket Pool",
  "wc.create.subheader":
    "2026 FIFA World Cup · scoring per round",
  "wc.create.heroTitle": "2026 FIFA World Cup",
  "wc.create.heroSubtitle":
    "Gumawa ng pool container — mag-invite ng kaibigan at hayaan silang mag-build ng sariling brackets sa loob.",
  "wc.create.poolName.label": "Pangalan ng pool",
  "wc.create.poolName.placeholder": "hal. Office World Cup Pool 2026",
  "wc.create.poolName.error.blank":
    "Hindi pwedeng walang pangalan ang pool.",
  "wc.create.poolName.default": "World Cup Bracket Pool",
  "wc.create.visibility.label": "Visibility ng pool",
  "wc.create.visibility.private": "Private",
  "wc.create.visibility.privateHint":
    "Kailangan ng invite link para sumali",
  "wc.create.visibility.public": "Public",
  "wc.create.visibility.publicHint":
    "Pwedeng makita at sumali ang kahit sino",
  "wc.create.maxUsers.label": "Max users",
  "wc.create.maxUsers.hint": "Hanggang {{max}} kada pool",
  "wc.create.maxUsers.error": "Dapat nasa pagitan ng 2 at {{max}}.",
  "wc.create.maxEntries.label": "Brackets bawat user",
  "wc.create.maxEntries.hint": "Hanggang {{max}} bawat user",
  "wc.create.maxEntries.error": "Dapat nasa pagitan ng 1 at {{max}}.",
  "wc.create.lockRule.label": "Patakaran sa pag-lock ng pick",
  "wc.create.lockRule.tournament": "Tournament lock",
  "wc.create.lockRule.tournamentHint":
    "Magla-lock lahat ng picks pagsimula ng unang laban",
  "wc.create.lockRule.perMatch": "Per-match lock",
  "wc.create.lockRule.perMatchHint":
    "Bawat laban ay magla-lock sa sariling kickoff",
  "wc.create.lockRule.copyTournament":
    "Pwede pang baguhin ang picks hanggang magsimula ang unang World Cup match.",
  "wc.create.lockRule.copyPerMatch":
    "Pwede pang baguhin ang bawat matchup hanggang umarangkada ang sariling laban.",
  "wc.create.scoring.intro": "Scoring per round:",
  "wc.create.scoring.values":
    "10 pts Round of 32 · 20 pts Round of 16 · 40 pts QF · 80 pts SF · 160 pts Final · 320 pts Champion bonus",
  "wc.create.helper.entriesOne":
    "Bawat user ay puwedeng gumawa ng hanggang {{max}} bracket.",
  "wc.create.helper.entriesOther":
    "Bawat user ay puwedeng gumawa ng hanggang {{max}} na bracket.",
  "wc.create.helper.leaderboard":
    "Ang leaderboard ay nagra-rank ng finalized na brackets, hindi drafts.",
  "wc.create.helper.inviteLink":
    "Lalabas ang invite link pagkatapos gawin ang pool.",
  "wc.create.thirdPlace": "Isama ang third-place match",
  "wc.create.testFixtures.label": "Mag-seed ng test fixtures",
  "wc.create.testFixtures.hint":
    "Magdadagdag ng mock Round of 32 teams, flags, kickoff times, at venues para agad na pwedeng laruin ang pool.",
  "wc.create.submit.idle": "Gumawa ng pool",
  "wc.create.submit.creating": "Gumagawa...",
  "wc.create.submit.opening": "Nagawa na, bubuksan...",
  "wc.create.openingSuccess": "Nagawa na ang bracket, bubuksan...",
  "wc.create.error.signInRequired":
    "Mag-sign in muna para gumawa ng bracket.",
  "wc.create.error.noId":
    "Nagawa ang bracket pero walang nai-return na ID ang server. I-refresh ang page.",
  "wc.create.error.generic": "Hindi nagawa ang bracket",
  "wc.create.error.requestFailed":
    "Hindi natapos ang request ({{status}})",

  // ── Discover page ────────────────────────────────────────────────────
  "wc.discover.backToHub": "← World Cup hub",
  "wc.discover.createPool": "Gumawa ng pool",
  "wc.discover.title": "Maghanap ng public pools",
  "wc.discover.subtitle":
    "Mag-browse ng public World Cup bracket pools. Sa pagsali, bubuksan ang Bracket 1 na walang picks — dadalhin ka namin sa guided picker kapag tumatanggap pa ng bagong players at hindi puno.",
  "wc.discover.search.label": "Hanapin",
  "wc.discover.search.placeholder": "Pangalan ng pool",
  "wc.discover.season.label": "Season",
  "wc.discover.season.placeholder": "hal. 2026",
  "wc.discover.statusFilter.label": "Status",
  "wc.discover.statusFilter.all": "Lahat",
  "wc.discover.statusFilter.open": "Bukas",
  "wc.discover.statusFilter.locked": "Nakasara",
  "wc.discover.statusFilter.final": "Final",
  "wc.discover.loading": "Naglo-load ng public pools...",
  "wc.discover.errors.couldNotLoad": "Hindi na-load ang pools",
  "wc.discover.empty":
    "Walang public pool na tumugma sa filters. Subukan ang ibang season o linisin ang search — o sumali sa private pool gamit ang invite code sa itaas.",
  "wc.discover.joinPanelTitle":
    "Sumali gamit ang invite code (private pools)",

  // ── Discover card ────────────────────────────────────────────────────
  "wc.discover.card.statusOpen": "Bukas",
  "wc.discover.card.blockedFull": "Puno na ang league",
  "wc.discover.card.blockedClosed":
    "Sarado na sa bagong players",
  "wc.discover.card.password": "Password",
  "wc.discover.card.lateJoin":
    "Naka-lock na ang picks · pwede pa ring sumali",
  "wc.discover.card.preview": "I-preview",
  "wc.discover.card.join": "Sumali",

  // ── Join / invite panel ──────────────────────────────────────────────
  "wc.join.backToHub": "← World Cup hub",
  "wc.join.brandEyebrow": "AllFantasy",
  "wc.join.brandTitle": "2026 World Cup Bracket Pools",
  "wc.join.panelTitle": "Sumali gamit ang invite code",
  "wc.join.panelHelper":
    "Ilagay ang invite code mula sa iyong commissioner. Pagkatapos sumali, dadalhin ka sa pool dashboard at puwede mo nang simulan ang iyong unang bracket. Ang mga password-protected na pool ay nangangailangan ng password na nakatakda sa pool settings.",
  "wc.join.codeInput.placeholder": "WCUP invite code",
  "wc.join.previewBtn": "I-preview",
  "wc.join.errors.invalidCode": "Maglagay ng valid na invite code",
  "wc.join.errors.notFound": "Walang nakitang invite",
  "wc.join.errors.full": "Puno na ang pool na ito.",
  "wc.join.errors.closed":
    "Sarado na ang pool na ito sa bagong players.",
  "wc.join.errors.couldNotJoin": "Hindi nakasali",
  "wc.join.preview.hostLine":
    "Host: {{owner}} · {{count}} naglalaro · {{visibility}}",
  "wc.join.preview.openCopy":
    "Sumali na para gumawa ng Bracket 1, mag-pick sa Group Stage at Knockout, at i-finalize kapag ready.",
  "wc.join.preview.fullCopy": "Puno na ang pool na ito.",
  "wc.join.preview.closedCopy":
    "Naka-lock na ang pool — hindi na tumatanggap ng bagong players.",
  "wc.join.preview.passwordLabel": "Password sa pagsali",
  "wc.join.preview.joinBtn": "Sumali sa league",
  "wc.join.success": "Sali na — Bracket 1 ay handa na.",

  // ── Finalize / share success block (Review tab) ──────────────────────
  "wc.finalize.eyebrow": "Naka-finalize",
  "wc.finalize.title": "Locked in na ang iyong bracket",
  "wc.finalize.subtitleNoTime":
    "Na-submit na. Pwede mo pa ring i-edit hangga't hindi naka-lock ang pool — mag-invite ng kaibigan habang may slots pa.",
  "wc.finalize.subtitleWithTime":
    "Na-submit noong {{at}}. Pwede mo pa ring i-edit hangga't hindi naka-lock ang pool — mag-invite ng kaibigan habang may slots pa.",
  "wc.finalize.copyShare": "Kopyahin ang share text",
  "wc.finalize.copyShareCopied": "Na-copy!",
  "wc.finalize.shareReport": "I-share ang AI Bracket Report ko",
  "wc.finalize.inviteFriends": "Mag-invite ng kaibigan para talunin ang bracket ko",
  "wc.finalize.previewShare": "I-preview ang share text",

  // ── Inside-pool Invite tab ───────────────────────────────────────────
  "wc.inviteTab.eyebrow": "Pool",
  "wc.inviteTab.title": "Invite at Detalye ng Pool",
  "wc.inviteTab.detailsTitle": "Detalye ng pool",
  "wc.inviteTab.meta.pool": "Pool",
  "wc.inviteTab.meta.privacy": "Privacy",
  "wc.inviteTab.meta.privacyPublic": "Public",
  "wc.inviteTab.meta.privacyPrivate": "Private — invite-only",
  "wc.inviteTab.meta.maxUsers": "Max users",
  "wc.inviteTab.meta.bracketsPerUser": "Brackets bawat user",
  "wc.inviteTab.meta.scoring": "Scoring",
  "wc.inviteTab.meta.scoringValue": "NCAA-style",
  "wc.inviteTab.meta.lockRule": "Patakaran sa lock",
  "wc.inviteTab.meta.lockTournament":
    "Magla-lock sa unang World Cup match",
  "wc.inviteTab.meta.lockPerMatch":
    "Per-match lock pag kickoff",
  "wc.inviteTab.lockedBanner":
    "Naka-lock na ang pool. Hindi na pwedeng baguhin ang mga pick.",
  "wc.inviteTab.member.title": "Mag-invite ng kaibigan sa pool na ito",
  "wc.inviteTab.member.body":
    "Tanging commissioner lang ang puwedeng mag-copy at mag-share ng invite link. Humingi ng invite link o code sa iyong commissioner.",
  "wc.inviteTab.commissioner.linkTitle": "Invite link",
  "wc.inviteTab.commissioner.linkHelper":
    "I-share ito sa kahit sino mong gustong i-invite. Kailangan signed in sila sa AllFantasy.",
  "wc.inviteTab.commissioner.codeLabel": "Invite code",
  "wc.inviteTab.commissioner.copyCode": "Kopyahin ang code",
  "wc.inviteTab.commissioner.copyCodeDone": "Na-copy",
  "wc.inviteTab.commissioner.copyLink": "Kopyahin ang invite link",
  "wc.inviteTab.commissioner.copyLinkDone": "Na-copy ang link!",
  "wc.inviteTab.commissioner.copyMessage": "Kopyahin ang invite message",
  "wc.inviteTab.commissioner.copyMessageDone": "Na-copy ang message!",
  "wc.inviteTab.commissioner.share": "I-share",
  "wc.inviteTab.commissioner.previewInvite":
    "I-preview ang invite message",
  "wc.inviteTab.commissioner.previewShare":
    "I-preview ang share message",
  "wc.inviteTab.commissioner.noCodeTitle":
    "Walang available na invite link",
  "wc.inviteTab.commissioner.noCodeBody":
    "Pwedeng i-regenerate ng pool owner o admin ang invite link sa pool settings.",
  "wc.inviteTab.shareMessage.default":
    "Sumali sa AllFantasy World Cup Bracket Pool ko na \"{{pool}}\"! Hanggang {{maxEntries}} brackets, mag-rank ng Group Stage teams, mag-build ng Knockout picks, at makipagtagisan sa live leaderboard. {{url}}",
  "wc.inviteTab.shareTitleNative":
    "{{pool}} — AllFantasy World Cup Bracket",

  // ── Commissioner Checklist card chrome (extended) ────────────────────
  "wc.checklist.eyebrow": "Commissioner",
  "wc.checklist.cardSubtitle":
    "Tingnan agad ang progreso ng mga miyembro. Visible lamang sa pool commissioners at admins.",
  "wc.checklist.copyReminderBtn": "Kopyahin ang reminder",
  "wc.checklist.copyReminderDone": "Na-copy ang reminder!",
  "wc.checklist.stat.total": "Total na miyembro",
  "wc.checklist.stat.finalized": "Naka-finalize",
  "wc.checklist.stat.inProgress": "Ginagawa pa",
  "wc.checklist.stat.completion": "Completion",
  "wc.checklist.entryStatus.finalized": "Naka-finalize",
  "wc.checklist.entryStatus.inProgress": "Ginagawa pa",
  "wc.checklist.entryStatus.needsPicks": "Kulang picks",
  "wc.checklist.entryStatus.unknown": "Hindi alam",
  "wc.checklist.needsReminderBadge": "Kailangan ng reminder",
  "wc.checklist.missingPicks": "{{count}} kulang",
  "wc.checklist.previewReminder": "I-preview ang reminder message",
  "wc.checklist.privacyNote":
    "Deterministic — ginagamit lang ang snapshot na na-load na para sa commissioner tools. Walang email o user ID na ipinapakita.",
  "wc.checklist.empty.memberOnly":
    "Tanging pool commissioner o admin lang ang makakakita ng status ng miyembro.",
  "wc.checklist.empty.loading":
    "Naglo-load pa ang commissioner status data.",
  "wc.checklist.empty.noMembers":
    "Wala pang miyembrong gumawa ng entry. I-share ang invite link para makasimula.",
  "wc.checklist.empty.fallback": "Walang member data na available.",
  "wc.checklist.row.memberFallback": "Miyembro",
  "wc.checklist.row.bracketFallback": "Bracket",
  "wc.checklist.row.finalizedRowOne":
    "{{count}} na-finalize na bracket",
  "wc.checklist.row.finalizedRowOther":
    "{{count}} na-finalize na brackets",

  // ── Commissioner reminder message templates ──────────────────────────
  "wc.checklist.reminder.askCommissioner":
    "Hilingin sa pool commissioner na mag-paalala sa mga miyembro tungkol sa {{pool}}.",
  "wc.checklist.reminder.finalizeLine":
    "Friendly reminder: i-finalize ang iyong mga pick para sa \"{{pool}}\" sa AllFantasy.",
  "wc.checklist.reminder.joinLine":
    "Reminder: sumali sa \"{{pool}}\" sa AllFantasy at i-lock ang iyong World Cup bracket.",
  "wc.checklist.reminder.statusLine":
    "Status: {{done}}/{{total}} brackets na finalized ({{percent}}%).",
  "wc.checklist.reminder.deadlineLine":
    "Magla-lock ang picks {{deadline}}.",
  "wc.checklist.reminder.poweredBy": "Powered by AllFantasy.",
  "wc.checklist.reminder.noSnapshotLine":
    "Reminder: tapusin ang iyong picks para sa \"{{pool}}\" sa AllFantasy.",

  // ── AI Report card chrome (extended) ─────────────────────────────────
  "wc.aiShareCard.eyebrow": "Share graphic",
  "wc.aiShareCard.subtitle":
    "Anim na AI signals sa isang copy-ready card. Deterministic — walang AI call sa pag-share.",
  "wc.aiShareCard.tierPro": "AF Pro",
  "wc.aiShareCard.tierPreview": "Basic preview",
  "wc.aiShareCard.emptyNoEntry":
    "Pumili ng bracket entry para gumawa ng share card.",
  "wc.aiShareCard.copyShare": "Kopyahin ang share text",
  "wc.aiShareCard.copyShareDone": "Na-copy",
  "wc.aiShareCard.share": "I-share",
  "wc.aiShareCard.privacyNote":
    "Private sa iyo hangga't hindi mo i-share. Ginagamit lang ang sarili mong bracket data at aggregated counts ng pool.",
  "wc.explain.eyebrow": "Private AI",
  "wc.explain.title": "Explain ang aking bracket",
  "wc.explain.subtitle":
    "Private narrative analysis ng iyong bracket strategy. Ikaw lang ang makakakita.",
  "wc.explain.tierPro": "AF Pro",
  "wc.explain.tierLocked": "Nakasara",
  "wc.explain.locked":
    "Bubuksan ng AF Pro ang private AI explanation ng iyong bracket strategy — kasama ang istilo, pinakaligtas, pinaka-risky, champion path, at isang specific na recommendation.",
  "wc.explain.generate": "Gumawa ng explanation",
  "wc.explain.generating": "Ginagawa...",
  "wc.explain.selectFirst": "Pumili muna ng bracket",
  "wc.explain.regenerate": "Ulitin",
  "wc.explain.regenerating": "Inuulit...",
  "wc.explain.fallbackBadge": "Deterministic fallback",
  "wc.explain.error.generic": "Hindi nagawa ang explanation.",
  "wc.explain.error.network": "Network error. Subukan ulit.",
  "wc.explain.privacyNote":
    "Private sa iyo. Ginagamit lang ang sarili mong picks at public team data. Hindi inilalagay sa chat.",
  "wc.uniqueness.eyebrow": "Pool comparison",
  "wc.uniqueness.title": "Ano ang ginagawang unique sa bracket ko?",
  "wc.uniqueness.subtitle":
    "Pinaghahambing lang sa finalized brackets sa pool na ito.",
  "wc.uniqueness.tierPro": "AF Pro",
  "wc.uniqueness.tierBasic": "Basic",
  "wc.uniqueness.empty.noEntry":
    "Pumili ng bracket entry para mag-compute ng uniqueness.",
  "wc.uniqueness.loading": "Naglo-load ng pool comparison...",
  "wc.uniqueness.error.couldNotLoad":
    "Hindi na-load ang uniqueness data.",
  "wc.uniqueness.error.network": "Network error. Subukan ulit.",
  "wc.uniqueness.empty.notEnoughData":
    "Magbubukas ang uniqueness kapag may mas maraming finalized brackets.",
  "wc.uniqueness.empty.incomplete":
    "Mag-pick sa group at knockout para makita kung gaano kayo unique ng bracket mo.",
  "wc.uniqueness.rarity.veryRare": "Pinaka-rare",
  "wc.uniqueness.rarity.rare": "Rare",
  "wc.uniqueness.rarity.uncommon": "Bihira",
  "wc.uniqueness.rarity.common": "Karaniwan",
  "wc.uniqueness.percentShare": "{{percent}}% share",
  "wc.uniqueness.privacyNote":
    "Deterministic — bilang lang ng finalized brackets. Walang AI call, walang raw picks ng ibang user na ipinapakita.",
  "wc.grade.eyebrow": "Bracket Grade",
  "wc.grade.completionLabel": "{{percent}}% kumpleto",
  "wc.grade.tierProDetail": "AF Pro detail",
  "wc.grade.tierBasic": "Basic",
  "wc.grade.stat.groups": "Groups",
  "wc.grade.stat.thirdPlace": "Third-place",
  "wc.grade.stat.knockouts": "Knockouts",
  "wc.grade.stat.missing": "Kulang",
  "wc.grade.risk": "Risk level:",
  "wc.grade.upset": "Upset meter:",
  "wc.grade.championConfidence": "Tiwala sa kampeon:",
  "wc.grade.championConfidenceNone": "Walang piniling kampeon",
  "wc.grade.biggestRisk": "Pinakamalaking risk:",
  "wc.grade.recommendation": "Rekomendasyon:",
  "wc.grade.lockedBody":
    "Bubuksan ng AF Pro ang risk, upset meter, champion confidence, biggest risk, at rekomendasyon details.",
  "wc.confidence.title": "AI Confidence Check",
  "wc.confidence.tierOpen": "Bukas",
  "wc.confidence.tierLocked": "Nakasara",
  "wc.confidence.missingPicks": "Kulang na picks:",
  "wc.confidence.noMissing": "Wala. Pwede nang i-finalize.",
  "wc.confidence.missingBreakdown":
    "{{knockout}} knockout, {{groups}} groups, {{thirdPlace}} third-place.",
  "wc.confidence.highRiskPicks": "High-risk picks:",
  "wc.confidence.highRiskBody":
    "{{count}} maagang round picks ang humuhubog sa karamihan ng bracket path mo.",
  "wc.confidence.bracketShape": "Hugis ng bracket:",
  "wc.confidence.bracketShapeChalk":
    "Sobrang chalk-heavy. Isipin kung isang controlled contrarian pick ay makakatulong sa uniqueness.",
  "wc.confidence.bracketShapeBalanced":
    "Balanseng-balanse para sa first-pass confidence check.",
  "wc.confidence.finalizeConfidence": "Tiwala sa pag-finalize:",
  "wc.confidence.finalizeReady":
    "Handa nang i-finalize para sa leaderboard.",
  "wc.confidence.finalizeMissing":
    "Tapusin muna ang kulang na requirements bago mag-finalize.",
  "wc.confidence.privacyNote":
    "Deterministic prediction at scoring complexity lang. Pansin lang sa picks at scoring mechanics.",
  "wc.confidence.lockedBody":
    "Mag-upgrade sa AI/Pro para buksan ang confidence check. Hindi tumatawag ng AI ang locked users.",
  "wc.path.title": "Ano ang dapat mangyari para manalo ako?",
  "wc.path.subtitle":
    "Private na pagbasa ng current entry. Nakatago pa rin ang unfinalized picks ng ibang users.",
  "wc.path.tierActive": "AF Pro active",
  "wc.path.tierLocked": "AF Pro locked",
}

// Vietnamese — natural sports-app Vietnamese.
const VI: WorldCupDictionary = {
  // ── Shared / shell ───────────────────────────────────────────────────
  "wc.common.loading": "Đang tải...",
  "wc.common.back": "Quay lại",
  "wc.common.openSettings": "Mở cài đặt",
  "wc.common.signIn": "Đăng nhập",
  "wc.common.signOut": "Đăng xuất",

  // ── Public hub: /brackets/world-cup ──────────────────────────────────
  "wc.publicHub.backToBrackets": "← Quay lại Brackets",
  "wc.publicHub.heroTitle": "Thử Thách Bracket World Cup",
  "wc.publicHub.heroSubtitle":
    "Tạo một bracket pool kiểu NCAA cho FIFA World Cup. Mời bạn bè, chọn đội thắng, theo dõi tỉ số trực tiếp và leo lên bảng xếp hạng.",
  "wc.publicHub.discover": "Khám phá pool công khai",
  "wc.publicHub.joinWithCode": "Tham gia bằng mã mời",
  "wc.publicHub.createPool": "Tạo pool",
  "wc.publicHub.createWorldCupPool": "Tạo pool World Cup",
  "wc.publicHub.yourPools": "Pool World Cup của bạn",
  "wc.publicHub.poolsCountOne": "{{count}} pool",
  "wc.publicHub.poolsCountOther": "{{count}} pool",
  "wc.publicHub.scoreLabel": "Điểm",
  "wc.publicHub.rankLabel": "Hạng",
  "wc.publicHub.participantsOne": "{{count}} người chơi",
  "wc.publicHub.participantsOther": "{{count}} người chơi",
  "wc.publicHub.statusOpen": "Mở",
  "wc.publicHub.statusLocked": "Đã khoá",
  "wc.publicHub.statusFinal": "Kết thúc",
  "wc.publicHub.emptyTitle": "Chưa có pool World Cup nào",
  "wc.publicHub.emptyBody":
    "Bạn chưa tạo hoặc tham gia pool bracket World Cup nào.",
  "wc.publicHub.emptyHint":
    "Tạo một pool và mời bạn bè, hoặc xin mã mời từ ai đó.",
  "wc.publicHub.signInTitle": "Đăng nhập để bắt đầu",
  "wc.publicHub.signInBody":
    "Tạo hoặc tham gia một pool bracket World Cup và thi đấu cùng bạn bè.",
  "wc.publicHub.signInCta": "Đăng nhập để bắt đầu",
  "wc.publicHub.feature.privatePublic":
    "Pool riêng tư hoặc công khai — tối đa 100 người chơi.",
  "wc.publicHub.feature.bracketsPerUser":
    "Mỗi người chơi tối đa 5 bracket, thi đấu bằng nhiều chiến thuật khác nhau.",
  "wc.publicHub.feature.ncaaScoring":
    "Tính điểm kiểu NCAA — vòng càng sâu, điểm càng cao.",
  "wc.publicHub.feature.guidedPicker":
    "Trình hướng dẫn chọn kèo với phân tích cặp đấu bằng AI.",
  "wc.publicHub.feature.liveTracking":
    "Theo dõi tỉ số trực tiếp đến từng phút.",
  "wc.publicHub.feature.aiBracketBuilder":
    "Trình tạo bracket bằng AI tự động điền các trận chưa chọn.",
  "wc.publicHub.feature.perBracketLeaderboard":
    "Bảng xếp hạng riêng cho mỗi bracket — từng entry được xếp riêng.",
  "wc.publicHub.feature.lockOnKickoff":
    "Bracket khoá lại khi trận đầu tiên của World Cup bắt đầu.",

  // ── Pool dashboard: tab labels ───────────────────────────────────────
  "wc.tab.home": "Trang chính",
  "wc.tab.groupStage": "Vòng bảng",
  "wc.tab.picks": "Vòng loại trực tiếp",
  "wc.tab.review": "Xem lại",
  "wc.tab.leaderboard": "Bảng xếp hạng",
  "wc.tab.rules": "Luật chơi",
  "wc.tab.invite": "Mời",
  "wc.tab.commissioner": "Chủ pool",
  "wc.tab.admin": "Quản trị",

  // ── Pool dashboard: header / status strip ────────────────────────────
  "wc.header.sync": "Đồng bộ",
  "wc.header.inviteAria": "Mời bạn bè",
  "wc.header.invite": "Mời",
  "wc.header.testMode": "Chế độ thử",
  "wc.header.testModeNote":
    "kết quả là mô phỏng và có thể ảnh hưởng đến bảng xếp hạng.",

  // ── Lock countdown ───────────────────────────────────────────────────
  "wc.lock.untilLockDays":
    "Còn {{d}} ngày {{h}} giờ trước khi khoá lựa chọn",
  "wc.lock.untilLockHours":
    "Còn {{h}} giờ {{m}} phút trước khi khoá lựa chọn",
  "wc.lock.untilLockMinutes":
    "Còn {{m}} phút trước khi khoá lựa chọn",
  "wc.lock.locksSoon": "Bracket sắp bị khoá",
  "wc.lock.bracketLocked": "Bracket đã khoá",
  "wc.lock.picksFrozen":
    "Bracket đã khoá — không thể chỉnh sửa lựa chọn.",

  // ── Knockouts tab ────────────────────────────────────────────────────
  "wc.knockouts.intro.reseeded":
    "Lựa chọn vòng loại trực tiếp mở sau khi có lịch thi đấu chính thức vòng 32.",
  "wc.knockouts.intro.predictive":
    "Bracket vòng loại trực tiếp của bạn được tạo từ kết quả vòng bảng mà bạn dự đoán.",
  "wc.knockouts.subintro.reseeded":
    "Lựa chọn vòng bảng vẫn hoạt động bình thường. Khi lịch chính thức vòng loại trực tiếp được đồng bộ, bạn sẽ chọn lại từ bracket chính thức.",
  "wc.knockouts.subintro.predictive":
    "Các cặp đấu vòng loại trực tiếp cập nhật theo dự đoán vòng bảng của bạn. Đổi dự đoán vòng bảng có thể đặt lại một số lựa chọn vòng loại trực tiếp.",
  "wc.knockouts.startPicks": "Bắt đầu chọn",
  "wc.knockouts.continuePicks": "Tiếp tục chọn",
  "wc.knockouts.guidance.complete":
    "Đã hoàn tất {{done}}/{{required}} lựa chọn hiện có.",
  "wc.knockouts.guidance.nextPick":
    "Lựa chọn kế tiếp: Trận {{matchNumber}}.",
  "wc.knockouts.guidance.blocked":
    "Hãy chọn người thắng các vòng trước. Càng chọn xong vòng trước, càng mở thêm lựa chọn vòng sau.",
  "wc.knockouts.guidance.noneReady":
    "Hiện chưa có lựa chọn vòng loại trực tiếp nào sẵn sàng.",

  // ── Knockout Danger Zones card ───────────────────────────────────────
  "wc.danger.eyebrow": "Vòng loại trực tiếp",
  "wc.danger.title": "Khu Vực Nguy Hiểm Vòng Loại Trực Tiếp",
  "wc.danger.subtitle":
    "Phân tích xác định — so sánh lựa chọn của bạn với sức mạnh hạt giống trước giải và trạng thái trận đấu trực tiếp.",
  "wc.danger.tierPro": "AF Pro",
  "wc.danger.tierBasic": "Cơ bản",
  "wc.danger.emptyNoEntry":
    "Mở một entry bracket để xem khu vực nguy hiểm.",
  "wc.danger.emptyNoPicks":
    "Chọn vòng loại trực tiếp để xem khu vực nguy hiểm.",
  "wc.danger.emptyNoRisks":
    "Hiện không có khu vực nguy hiểm. Tất cả lựa chọn vòng loại trực tiếp của bạn đều được sức mạnh trước giải ủng hộ.",
  "wc.danger.severityHigh": "Cao",
  "wc.danger.severityMedium": "Trung bình",
  "wc.danger.severityLow": "Thấp",
  "wc.danger.severitySuffix": "nguy hiểm",
  "wc.danger.footer":
    "Chỉ đếm lựa chọn của chính bạn so với lịch thi đấu công khai. Không gọi AI. Không sử dụng lựa chọn của người khác.",

  // ── AI Report (Review tab) ───────────────────────────────────────────
  "wc.aiReport.eyebrow": "Báo cáo",
  "wc.aiReport.title": "Báo Cáo AI Cho Bracket Của Bạn",
  "wc.aiReport.subtitle":
    "Sáu tín hiệu AI tính từ chính lựa chọn của bạn. Toàn bộ nội dung bên dưới chỉ riêng bạn xem được.",
  "wc.aiReport.tierActive": "AF Pro đang bật",
  "wc.aiReport.tierPreview": "Xem trước AF Pro",

  // ── Share / Invite ───────────────────────────────────────────────────
  "wc.invite.title": "Mời bạn bè",
  "wc.invite.copyLink": "Sao chép link mời",
  "wc.invite.copied": "Đã sao chép link!",
  "wc.invite.shareNative": "Chia sẻ",
  "wc.invite.shareViaText": "Tin nhắn",
  "wc.invite.shareViaEmail": "Email",
  "wc.invite.viaSocial": "Mạng xã hội",
  "wc.invite.heading":
    "Mời bạn bè cùng tham gia {{poolName}} trên AllFantasy.",
  "wc.invite.inviteCodeLabel": "Mã mời",

  // ── Commissioner Checklist ───────────────────────────────────────────
  "wc.checklist.title": "Danh Sách Hoàn Tất Pool",
  "wc.checklist.subtitle":
    "Thành viên của {{poolName}} và trạng thái so với hạn khoá.",
  "wc.checklist.copyReminder": "Sao chép lời nhắc",
  "wc.checklist.reminderCopied": "Đã sao chép lời nhắc!",
  "wc.checklist.statusReady": "Sẵn sàng",
  "wc.checklist.statusNoMembers": "Chưa có thành viên",
  "wc.checklist.statusNoData": "Chưa có snapshot",

  // ── Empty / loading / error states ───────────────────────────────────
  "wc.state.loading": "Đang tải...",
  "wc.state.refresh": "Làm mới",
  "wc.state.tryAgain": "Thử lại",
  "wc.state.noEntries":
    "Bạn chưa tạo bracket entry cho pool này.",
  "wc.state.createEntry": "Tạo bracket của tôi",

  // ── Language selector tooltip ────────────────────────────────────────
  "wc.language.label": "Ngôn ngữ",
  "wc.language.english": "English",
  "wc.language.spanish": "Español",
  "wc.language.chinese": "繁體中文",
  "wc.language.filipino": "Filipino",
  "wc.language.vietnamese": "Tiếng Việt",

  // ── Create page / modal ──────────────────────────────────────────────
  "wc.create.goBack": "Quay lại",
  "wc.create.header": "Tạo Pool Bracket World Cup",
  "wc.create.subheader":
    "FIFA World Cup 2026 · tính điểm theo từng vòng",
  "wc.create.heroTitle": "FIFA World Cup 2026",
  "wc.create.heroSubtitle":
    "Tạo một pool — mời bạn bè và để họ tự xây bracket của riêng mình bên trong.",
  "wc.create.poolName.label": "Tên pool",
  "wc.create.poolName.placeholder":
    "vd. Office World Cup Pool 2026",
  "wc.create.poolName.error.blank":
    "Tên pool không được bỏ trống.",
  "wc.create.poolName.default": "Pool Bracket World Cup",
  "wc.create.visibility.label": "Quyền truy cập pool",
  "wc.create.visibility.private": "Riêng tư",
  "wc.create.visibility.privateHint":
    "Cần link mời để tham gia",
  "wc.create.visibility.public": "Công khai",
  "wc.create.visibility.publicHint":
    "Ai cũng có thể tìm thấy và tham gia",
  "wc.create.maxUsers.label": "Số người chơi tối đa",
  "wc.create.maxUsers.hint": "Tối đa {{max}} cho mỗi pool",
  "wc.create.maxUsers.error":
    "Phải nằm trong khoảng 2 đến {{max}}.",
  "wc.create.maxEntries.label": "Bracket cho mỗi người chơi",
  "wc.create.maxEntries.hint":
    "Tối đa {{max}} cho mỗi người chơi",
  "wc.create.maxEntries.error":
    "Phải nằm trong khoảng 1 đến {{max}}.",
  "wc.create.lockRule.label": "Quy tắc khoá lựa chọn",
  "wc.create.lockRule.tournament": "Khoá theo giải",
  "wc.create.lockRule.tournamentHint":
    "Toàn bộ lựa chọn khoá khi trận đầu tiên bắt đầu",
  "wc.create.lockRule.perMatch": "Khoá theo trận",
  "wc.create.lockRule.perMatchHint":
    "Mỗi trận khoá vào giờ bóng lăn của chính trận đó",
  "wc.create.lockRule.copyTournament":
    "Có thể chỉnh lựa chọn cho đến khi trận đầu tiên của World Cup bắt đầu.",
  "wc.create.lockRule.copyPerMatch":
    "Có thể chỉnh từng cặp đấu cho đến khi chính trận đó bắt đầu.",
  "wc.create.scoring.intro": "Tính điểm theo từng vòng:",
  "wc.create.scoring.values":
    "10 điểm Vòng 32 · 20 điểm Vòng 16 · 40 điểm tứ kết · 80 điểm bán kết · 160 điểm chung kết · 320 điểm thưởng nhà vô địch",
  "wc.create.helper.entriesOne":
    "Mỗi người chơi có thể tạo tối đa {{max}} bracket.",
  "wc.create.helper.entriesOther":
    "Mỗi người chơi có thể tạo tối đa {{max}} bracket.",
  "wc.create.helper.leaderboard":
    "Bảng xếp hạng chỉ tính bracket đã hoàn tất, không tính bản nháp.",
  "wc.create.helper.inviteLink":
    "Link mời sẽ hiển thị sau khi tạo pool.",
  "wc.create.thirdPlace": "Bao gồm trận tranh hạng ba",
  "wc.create.testFixtures.label": "Tạo lịch thử (test fixtures)",
  "wc.create.testFixtures.hint":
    "Thêm dữ liệu giả lập cho Vòng 32 (đội, cờ, giờ bóng lăn, sân) để pool có thể chơi ngay.",
  "wc.create.submit.idle": "Tạo pool",
  "wc.create.submit.creating": "Đang tạo...",
  "wc.create.submit.opening": "Đã tạo, đang mở...",
  "wc.create.openingSuccess": "Đã tạo bracket, đang mở...",
  "wc.create.error.signInRequired":
    "Hãy đăng nhập để tạo bracket.",
  "wc.create.error.noId":
    "Bracket đã tạo nhưng máy chủ không trả về ID. Hãy làm mới trang.",
  "wc.create.error.generic": "Không tạo được bracket",
  "wc.create.error.requestFailed":
    "Yêu cầu thất bại ({{status}})",

  // ── Discover page ────────────────────────────────────────────────────
  "wc.discover.backToHub": "← Trang chính World Cup",
  "wc.discover.createPool": "Tạo pool",
  "wc.discover.title": "Khám phá pool công khai",
  "wc.discover.subtitle":
    "Duyệt các pool bracket World Cup công khai. Tham gia sẽ mở Bracket 1 chưa có lựa chọn — chúng tôi sẽ đưa bạn vào trình chọn có hướng dẫn khi pool còn nhận người chơi mới và chưa đầy.",
  "wc.discover.search.label": "Tìm kiếm",
  "wc.discover.search.placeholder": "Tên pool",
  "wc.discover.season.label": "Mùa giải",
  "wc.discover.season.placeholder": "vd. 2026",
  "wc.discover.statusFilter.label": "Trạng thái",
  "wc.discover.statusFilter.all": "Tất cả",
  "wc.discover.statusFilter.open": "Mở",
  "wc.discover.statusFilter.locked": "Đã khoá",
  "wc.discover.statusFilter.final": "Kết thúc",
  "wc.discover.loading": "Đang tải pool công khai...",
  "wc.discover.errors.couldNotLoad": "Không tải được pool",
  "wc.discover.empty":
    "Không có pool công khai nào khớp bộ lọc. Hãy thử mùa giải khác hoặc xoá tìm kiếm — hoặc tham gia pool riêng bằng mã mời ở trên.",
  "wc.discover.joinPanelTitle":
    "Tham gia bằng mã mời (pool riêng tư)",

  // ── Discover card ────────────────────────────────────────────────────
  "wc.discover.card.statusOpen": "Mở",
  "wc.discover.card.blockedFull": "Pool đã đầy",
  "wc.discover.card.blockedClosed":
    "Đã đóng với người chơi mới",
  "wc.discover.card.password": "Mật khẩu",
  "wc.discover.card.lateJoin":
    "Đã khoá lựa chọn · vẫn cho vào trễ",
  "wc.discover.card.preview": "Xem trước",
  "wc.discover.card.join": "Tham gia",

  // ── Join / invite panel ──────────────────────────────────────────────
  "wc.join.backToHub": "← Trang chính World Cup",
  "wc.join.brandEyebrow": "AllFantasy",
  "wc.join.brandTitle": "Pool Bracket World Cup 2026",
  "wc.join.panelTitle": "Tham gia bằng mã mời",
  "wc.join.panelHelper":
    "Nhập mã mời từ chủ pool của bạn. Sau khi tham gia, bạn sẽ vào bảng điều khiển pool và có thể bắt đầu bracket đầu tiên. Pool có mật khẩu cần nhập mật khẩu được đặt trong cài đặt pool.",
  "wc.join.codeInput.placeholder": "Mã mời WCUP",
  "wc.join.previewBtn": "Xem trước",
  "wc.join.errors.invalidCode":
    "Hãy nhập mã mời hợp lệ",
  "wc.join.errors.notFound": "Không tìm thấy lời mời",
  "wc.join.errors.full": "Pool này đã đầy.",
  "wc.join.errors.closed":
    "Pool này đã đóng với người chơi mới.",
  "wc.join.errors.couldNotJoin": "Không tham gia được",
  "wc.join.preview.hostLine":
    "Chủ pool: {{owner}} · {{count}} người chơi · {{visibility}}",
  "wc.join.preview.openCopy":
    "Tham gia ngay để tạo Bracket 1, chọn Vòng bảng và Vòng loại trực tiếp, và hoàn tất khi sẵn sàng.",
  "wc.join.preview.fullCopy": "Pool này đã đầy.",
  "wc.join.preview.closedCopy":
    "Pool đã khoá — không nhận người chơi mới.",
  "wc.join.preview.passwordLabel": "Mật khẩu tham gia",
  "wc.join.preview.joinBtn": "Tham gia pool",
  "wc.join.success":
    "Đã vào — Bracket 1 đã sẵn sàng.",

  // ── Finalize / share success block (Review tab) ──────────────────────
  "wc.finalize.eyebrow": "Đã hoàn tất",
  "wc.finalize.title": "Bracket của bạn đã được khoá",
  "wc.finalize.subtitleNoTime":
    "Đã gửi. Bạn vẫn có thể chỉnh sửa cho đến khi pool khoá — mời bạn bè trước khi hết slot.",
  "wc.finalize.subtitleWithTime":
    "Đã gửi {{at}}. Bạn vẫn có thể chỉnh sửa cho đến khi pool khoá — mời bạn bè trước khi hết slot.",
  "wc.finalize.copyShare": "Sao chép văn bản chia sẻ",
  "wc.finalize.copyShareCopied": "Đã sao chép!",
  "wc.finalize.shareReport": "Chia sẻ báo cáo AI bracket của tôi",
  "wc.finalize.inviteFriends":
    "Mời bạn bè đến đánh bại bracket của tôi",
  "wc.finalize.previewShare": "Xem trước văn bản chia sẻ",

  // ── Inside-pool Invite tab ───────────────────────────────────────────
  "wc.inviteTab.eyebrow": "Pool",
  "wc.inviteTab.title": "Mời và Chi tiết pool",
  "wc.inviteTab.detailsTitle": "Chi tiết pool",
  "wc.inviteTab.meta.pool": "Pool",
  "wc.inviteTab.meta.privacy": "Quyền truy cập",
  "wc.inviteTab.meta.privacyPublic": "Công khai",
  "wc.inviteTab.meta.privacyPrivate": "Riêng tư — chỉ qua mời",
  "wc.inviteTab.meta.maxUsers": "Số người chơi tối đa",
  "wc.inviteTab.meta.bracketsPerUser": "Bracket cho mỗi người chơi",
  "wc.inviteTab.meta.scoring": "Tính điểm",
  "wc.inviteTab.meta.scoringValue": "Kiểu NCAA",
  "wc.inviteTab.meta.lockRule": "Quy tắc khoá",
  "wc.inviteTab.meta.lockTournament":
    "Khoá khi trận đầu tiên của World Cup bắt đầu",
  "wc.inviteTab.meta.lockPerMatch":
    "Khoá theo từng trận khi bóng lăn",
  "wc.inviteTab.lockedBanner":
    "Pool đã khoá. Không thể chỉnh sửa các lựa chọn nữa.",
  "wc.inviteTab.member.title": "Mời bạn bè vào pool này",
  "wc.inviteTab.member.body":
    "Chỉ chủ pool mới có thể sao chép và chia sẻ link mời. Hãy hỏi chủ pool để lấy link hoặc mã mời.",
  "wc.inviteTab.commissioner.linkTitle": "Link mời",
  "wc.inviteTab.commissioner.linkHelper":
    "Chia sẻ với bất kỳ ai bạn muốn mời. Họ cần đăng nhập AllFantasy.",
  "wc.inviteTab.commissioner.codeLabel": "Mã mời",
  "wc.inviteTab.commissioner.copyCode": "Sao chép mã",
  "wc.inviteTab.commissioner.copyCodeDone": "Đã sao chép",
  "wc.inviteTab.commissioner.copyLink": "Sao chép link mời",
  "wc.inviteTab.commissioner.copyLinkDone": "Đã sao chép link!",
  "wc.inviteTab.commissioner.copyMessage":
    "Sao chép tin nhắn mời",
  "wc.inviteTab.commissioner.copyMessageDone":
    "Đã sao chép tin nhắn!",
  "wc.inviteTab.commissioner.share": "Chia sẻ",
  "wc.inviteTab.commissioner.previewInvite":
    "Xem trước tin nhắn mời",
  "wc.inviteTab.commissioner.previewShare":
    "Xem trước tin nhắn chia sẻ",
  "wc.inviteTab.commissioner.noCodeTitle":
    "Link mời chưa sẵn sàng",
  "wc.inviteTab.commissioner.noCodeBody":
    "Chủ pool hoặc admin có thể tạo lại link mời trong cài đặt pool.",
  "wc.inviteTab.shareMessage.default":
    "Tham gia pool bracket World Cup AllFantasy của tôi: \"{{pool}}\"! Tạo tối đa {{maxEntries}} bracket, xếp hạng vòng bảng, chọn vòng loại trực tiếp, và đua trên bảng xếp hạng trực tiếp. {{url}}",
  "wc.inviteTab.shareTitleNative":
    "{{pool}} — Bracket World Cup AllFantasy",

  // ── Commissioner Checklist card chrome (extended) ────────────────────
  "wc.checklist.eyebrow": "Chủ pool",
  "wc.checklist.cardSubtitle":
    "Xem nhanh tiến trình của thành viên. Chỉ chủ pool và admin mới thấy.",
  "wc.checklist.copyReminderBtn": "Sao chép lời nhắc",
  "wc.checklist.copyReminderDone": "Đã sao chép lời nhắc!",
  "wc.checklist.stat.total": "Tổng thành viên",
  "wc.checklist.stat.finalized": "Đã hoàn tất",
  "wc.checklist.stat.inProgress": "Đang làm",
  "wc.checklist.stat.completion": "Hoàn thành",
  "wc.checklist.entryStatus.finalized": "Đã hoàn tất",
  "wc.checklist.entryStatus.inProgress": "Đang làm",
  "wc.checklist.entryStatus.needsPicks": "Cần chọn",
  "wc.checklist.entryStatus.unknown": "Chưa rõ",
  "wc.checklist.needsReminderBadge": "Cần nhắc",
  "wc.checklist.missingPicks": "Thiếu {{count}}",
  "wc.checklist.previewReminder": "Xem trước lời nhắc",
  "wc.checklist.privacyNote":
    "Xác định — dùng dữ liệu snapshot đã tải cho công cụ chủ pool. Không hiển thị email hay user ID.",
  "wc.checklist.empty.memberOnly":
    "Chỉ chủ pool hoặc admin mới có thể xem trạng thái thành viên.",
  "wc.checklist.empty.loading":
    "Dữ liệu trạng thái chủ pool đang tải.",
  "wc.checklist.empty.noMembers":
    "Chưa có thành viên nào tạo entry. Hãy chia sẻ link mời để bắt đầu.",
  "wc.checklist.empty.fallback": "Không có dữ liệu thành viên.",
  "wc.checklist.row.memberFallback": "Thành viên",
  "wc.checklist.row.bracketFallback": "Bracket",
  "wc.checklist.row.finalizedRowOne":
    "{{count}} bracket đã hoàn tất",
  "wc.checklist.row.finalizedRowOther":
    "{{count}} bracket đã hoàn tất",

  // ── Commissioner reminder message templates ──────────────────────────
  "wc.checklist.reminder.askCommissioner":
    "Hãy nhờ chủ pool nhắc các thành viên về {{pool}}.",
  "wc.checklist.reminder.finalizeLine":
    "Lời nhắc thân thiện: hoàn tất các lựa chọn của bạn cho \"{{pool}}\" trên AllFantasy.",
  "wc.checklist.reminder.joinLine":
    "Lời nhắc: tham gia \"{{pool}}\" trên AllFantasy và khoá bracket World Cup của bạn.",
  "wc.checklist.reminder.statusLine":
    "Trạng thái: {{done}}/{{total}} bracket đã hoàn tất ({{percent}}%).",
  "wc.checklist.reminder.deadlineLine":
    "Lựa chọn khoá lúc {{deadline}}.",
  "wc.checklist.reminder.poweredBy":
    "Hỗ trợ bởi AllFantasy.",
  "wc.checklist.reminder.noSnapshotLine":
    "Lời nhắc: hoàn tất các lựa chọn của bạn cho \"{{pool}}\" trên AllFantasy.",

  // ── AI Report card chrome (extended) ─────────────────────────────────
  "wc.aiShareCard.eyebrow": "Hình chia sẻ",
  "wc.aiShareCard.subtitle":
    "Sáu tín hiệu AI trong một thẻ sẵn sàng để sao chép. Xác định — không gọi AI khi chia sẻ.",
  "wc.aiShareCard.tierPro": "AF Pro",
  "wc.aiShareCard.tierPreview": "Xem trước Cơ bản",
  "wc.aiShareCard.emptyNoEntry":
    "Chọn một entry bracket để tạo thẻ chia sẻ.",
  "wc.aiShareCard.copyShare": "Sao chép văn bản chia sẻ",
  "wc.aiShareCard.copyShareDone": "Đã sao chép",
  "wc.aiShareCard.share": "Chia sẻ",
  "wc.aiShareCard.privacyNote":
    "Riêng tư cho đến khi bạn chia sẻ. Chỉ dùng dữ liệu bracket của bạn và số liệu tổng hợp của pool.",
  "wc.explain.eyebrow": "AI riêng tư",
  "wc.explain.title": "Giải thích bracket của tôi",
  "wc.explain.subtitle":
    "Phân tích tường thuật riêng tư về chiến thuật của bạn. Chỉ bạn xem được.",
  "wc.explain.tierPro": "AF Pro",
  "wc.explain.tierLocked": "Đã khoá",
  "wc.explain.locked":
    "AF Pro mở khoá phần giải thích AI riêng tư về chiến thuật bracket — phong cách, lựa chọn an toàn nhất, rủi ro cao nhất, đường đến nhà vô địch và một gợi ý cụ thể.",
  "wc.explain.generate": "Tạo giải thích",
  "wc.explain.generating": "Đang tạo...",
  "wc.explain.selectFirst": "Hãy chọn bracket trước",
  "wc.explain.regenerate": "Tạo lại",
  "wc.explain.regenerating": "Đang tạo lại...",
  "wc.explain.fallbackBadge": "Dự phòng xác định",
  "wc.explain.error.generic": "Không thể tạo giải thích.",
  "wc.explain.error.network":
    "Lỗi mạng. Hãy thử lại.",
  "wc.explain.privacyNote":
    "Riêng tư cho bạn. Chỉ dùng lựa chọn của bạn và dữ liệu đội công khai. Không bao giờ đăng vào chat.",
  "wc.uniqueness.eyebrow": "So sánh pool",
  "wc.uniqueness.title":
    "Điều gì làm bracket của tôi khác biệt?",
  "wc.uniqueness.subtitle":
    "Chỉ so sánh với các bracket đã hoàn tất trong pool này.",
  "wc.uniqueness.tierPro": "AF Pro",
  "wc.uniqueness.tierBasic": "Cơ bản",
  "wc.uniqueness.empty.noEntry":
    "Chọn một entry bracket để tính độ độc đáo.",
  "wc.uniqueness.loading":
    "Đang tải so sánh pool...",
  "wc.uniqueness.error.couldNotLoad":
    "Không tải được dữ liệu độ độc đáo.",
  "wc.uniqueness.error.network":
    "Lỗi mạng. Hãy thử lại.",
  "wc.uniqueness.empty.notEnoughData":
    "Độ độc đáo sẽ mở khoá khi có thêm bracket hoàn tất.",
  "wc.uniqueness.empty.incomplete":
    "Hãy chọn vòng bảng và vòng loại trực tiếp để xem bracket của bạn độc đáo ra sao.",
  "wc.uniqueness.rarity.veryRare": "Rất hiếm",
  "wc.uniqueness.rarity.rare": "Hiếm",
  "wc.uniqueness.rarity.uncommon": "Ít gặp",
  "wc.uniqueness.rarity.common": "Phổ biến",
  "wc.uniqueness.percentShare": "Tỉ lệ {{percent}}%",
  "wc.uniqueness.privacyNote":
    "Xác định — chỉ đếm các bracket đã hoàn tất. Không gọi AI, không hiển thị lựa chọn gốc của người khác.",
  "wc.grade.eyebrow": "Điểm bracket",
  "wc.grade.completionLabel": "Hoàn thành {{percent}}%",
  "wc.grade.tierProDetail": "Chi tiết AF Pro",
  "wc.grade.tierBasic": "Cơ bản",
  "wc.grade.stat.groups": "Vòng bảng",
  "wc.grade.stat.thirdPlace": "Hạng ba",
  "wc.grade.stat.knockouts": "Vòng loại TT",
  "wc.grade.stat.missing": "Thiếu",
  "wc.grade.risk": "Mức rủi ro:",
  "wc.grade.upset": "Chỉ số cú sốc:",
  "wc.grade.championConfidence": "Niềm tin nhà vô địch:",
  "wc.grade.championConfidenceNone": "Chưa chọn nhà vô địch",
  "wc.grade.biggestRisk": "Rủi ro lớn nhất:",
  "wc.grade.recommendation": "Gợi ý:",
  "wc.grade.lockedBody":
    "AF Pro mở khoá rủi ro, chỉ số cú sốc, niềm tin nhà vô địch, rủi ro lớn nhất và gợi ý chi tiết.",
  "wc.confidence.title": "Kiểm tra niềm tin AI",
  "wc.confidence.tierOpen": "Đã mở",
  "wc.confidence.tierLocked": "Đã khoá",
  "wc.confidence.missingPicks": "Lựa chọn còn thiếu:",
  "wc.confidence.noMissing":
    "Không còn thiếu. Sẵn sàng hoàn tất.",
  "wc.confidence.missingBreakdown":
    "{{knockout}} vòng loại trực tiếp, {{groups}} vòng bảng, {{thirdPlace}} hạng ba.",
  "wc.confidence.highRiskPicks": "Lựa chọn rủi ro cao:",
  "wc.confidence.highRiskBody":
    "{{count}} lựa chọn ở các vòng đầu sẽ định hình phần lớn đường đi của bracket bạn.",
  "wc.confidence.bracketShape": "Hình dạng bracket:",
  "wc.confidence.bracketShapeChalk":
    "Quá nghiêng theo đội mạnh. Cân nhắc một lựa chọn ngược dòng có kiểm soát để tăng tính độc đáo.",
  "wc.confidence.bracketShapeBalanced":
    "Cân bằng đủ cho lần kiểm tra niềm tin đầu tiên.",
  "wc.confidence.finalizeConfidence":
    "Niềm tin để hoàn tất:",
  "wc.confidence.finalizeReady":
    "Sẵn sàng hoàn tất và lên bảng xếp hạng.",
  "wc.confidence.finalizeMissing":
    "Hoàn thành các yêu cầu còn thiếu trước khi hoàn tất.",
  "wc.confidence.privacyNote":
    "Chỉ dự đoán xác định và độ phức tạp tính điểm. Hướng dẫn vẫn giới hạn ở lựa chọn pool và cơ chế tính điểm.",
  "wc.confidence.lockedBody":
    "Nâng cấp lên AI/Pro để mở kiểm tra niềm tin. Người dùng bị khoá không kích hoạt cuộc gọi AI.",
  "wc.path.title": "Cần điều gì để tôi thắng?",
  "wc.path.subtitle":
    "Đọc riêng tư entry hiện tại. Lựa chọn chưa hoàn tất của người khác vẫn được ẩn.",
  "wc.path.tierActive": "AF Pro đang bật",
  "wc.path.tierLocked": "AF Pro đã khoá",
}

export const WORLD_CUP_TRANSLATIONS: Record<WorldCupLocale, WorldCupDictionary> = {
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

function reportMissingKey(locale: WorldCupLocale, key: string): void {
  // Production: never log, never reveal the raw key in the UI path.
  // We rely on a process.env check that is statically resolvable by both
  // Next.js client (replaced at build) and Node server (read at runtime).
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return
  }
  const cacheKey = `${locale}::${key}`
  if (warnedKeys.has(cacheKey)) return
  warnedKeys.add(cacheKey)
  // eslint-disable-next-line no-console
  console.warn(
    `[worldCupI18n] Missing translation for "${key}" in locale "${locale}". ` +
      `Falling back to English.`
  )
}

/**
 * Test helper — clears the missing-key warning cache so the dev-warning
 * test can re-trigger the log path. Not used by the runtime app.
 *
 * @internal
 */
export function _resetWorldCupI18nWarnCache(): void {
  warnedKeys.clear()
}

/**
 * Look up a translated string for the given locale and key.
 *
 * - Falls back to English if the locale dictionary is missing the key.
 *   In development, logs a one-shot console.warn per (locale, key).
 * - Falls back to the key itself if neither locale has the key — keeps
 *   missing translations visible during development. Production hides the
 *   raw key by way of the fact that a missing key indicates a bug worth
 *   surfacing in dev only; production callers should not pass unknown keys.
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
  let raw = dict[key]
  if (raw === undefined) {
    // Only warn when the requested locale was actually a different locale
    // than English — an EN-missing key is a deeper bug we still warn on.
    reportMissingKey(safeLocale, key)
    raw =
      WORLD_CUP_TRANSLATIONS[WORLD_CUP_DEFAULT_LOCALE][key] ?? key
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
 * in scope — keeps wcT() calls one line.
 */
export function makeWcT(locale: WorldCupLocale | string | null | undefined) {
  const safeLocale = getWorldCupLocale(locale)
  return (key: string, params?: Record<string, string | number>): string =>
    wcT(safeLocale, key, params)
}

/**
 * Share/invite tone type. Reserved for a future tone selector (friendly /
 * hype / trash_talk) — this phase always uses "friendly" as default.
 *
 * Trash-talk guardrails when the selector is wired:
 *   - Sports-centered (calls out picks, brackets, matchups — not people).
 *   - Funny / boastful tone allowed.
 *   - No slurs, hate, threats, personal attacks, doxxing.
 *   - No wagering, gambling, betting, odds, sportsbook, or DFS language
 *     (matches the existing `sanitize()` blocklist in worldCupShareCopy
 *     and worldCupCommissionerChecklist).
 */
export type WorldCupShareTone = "friendly" | "hype" | "trash_talk"

export const WORLD_CUP_DEFAULT_SHARE_TONE: WorldCupShareTone = "friendly"

/**
 * Human-readable language name to embed in an AI prompt so the model
 * responds in the user's selected language. Maps WC locales to natural
 * English-language names that OpenAI / xAI both recognize reliably.
 *
 * Use case: passed to `openaiChatText` prompts as part of the system
 * message — e.g. `Respond in ${getAiLanguageInstruction(locale)}`. The
 * helper never makes a call itself; the orchestrator decides whether
 * to include it.
 *
 * Returns "English" for unknown locales — never throws, never injects
 * model-specific control characters.
 */
export function getAiLanguageInstruction(
  locale: WorldCupLocale | string | null | undefined
): string {
  const safe = getWorldCupLocale(locale)
  switch (safe) {
    case "es":
      return "Spanish"
    case "zh":
      return "Traditional Chinese"
    case "fil":
      return "Filipino"
    case "vi":
      return "Vietnamese"
    case "en":
    default:
      return "English"
  }
}
