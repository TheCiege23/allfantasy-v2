import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  Globe2,
  Layers,
  ListOrdered,
  Plus,
  Radio,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { resolveServerRenderPreferences } from "@/lib/preferences/ServerRenderPreferenceResolver"
import { makeBracketsT } from "@/lib/brackets/bracketsI18n"

export const dynamic = "force-dynamic"

/**
 * Premium AllFantasy Bracket Pools hub — restored for Phase 7.
 *
 * Server component only. No `"use client"`, no useSession, no Prisma, no
 * useState. The original emergency hardening (commit `4bd1caf45`) removed
 * client islands because a BracketsAuthCTA `useSession` hydration race
 * was producing React #418/#423 and a body wipe. This rebuild stays on
 * the safe side of that fence:
 *
 *   - Pure server component — only Next <Link> + <Image> client-bound
 *     primitives, both of which are battle-tested in this app on the
 *     existing /brackets/world-cup routes.
 *   - Reads only the static i18n preference (cookie `af_lang` +
 *     UserProfile.preferredLanguage) via the same
 *     resolveServerRenderPreferences() helper used by
 *     /brackets/world-cup/page.tsx today — that path is wrapped in a
 *     try/catch and never throws.
 *   - No DB writes, no API calls at render time.
 *   - Mode-aware: leaves the AllFantasy dark / AF (legacy) hero
 *     palette intact for those modes, and applies `mode-readable` so
 *     hardcoded dark `bg-[#05070b]` chunks remap to the light theme
 *     under html[data-mode="light"] (rescue rules already in
 *     app/globals.css).
 *   - Hydration-safe: locale comes from the server preference resolver,
 *     so SSR HTML matches first CSR. No locale-formatted dates render
 *     here.
 *
 * Out of scope (intentional, kept English-only / not added here):
 *   - Authenticated "your pools" list (would require Prisma + auth and
 *     reintroduce the client-island risk that caused the original 500).
 *   - Quick-create CTAs that POST to /api/brackets/*.
 *   - Live-data widgets (leaderboard previews, etc.).
 */
type SportCard = {
  key:
    | "worldCup"
    | "nbaPlayoffs"
    | "nhlPlayoffs"
    | "nflPlayoffs"
    | "mlbPostseason"
    | "marchMadness"
    | "collegeFootball"
    | "soccer"
  /** Where to send the user; only "/brackets/world-cup" is wired. */
  href: string | null
  /** "live" → has a real bracket hub; "soon" → renders Coming Soon. */
  status: "live" | "soon"
  Icon: typeof Trophy
}

const SPORT_CARDS: SportCard[] = [
  { key: "worldCup", href: "/brackets/world-cup", status: "live", Icon: Globe2 },
  { key: "nbaPlayoffs", href: null, status: "soon", Icon: Trophy },
  { key: "nhlPlayoffs", href: null, status: "soon", Icon: Trophy },
  { key: "nflPlayoffs", href: null, status: "soon", Icon: Trophy },
  { key: "mlbPostseason", href: null, status: "soon", Icon: Trophy },
  { key: "marchMadness", href: null, status: "soon", Icon: Trophy },
  { key: "collegeFootball", href: null, status: "soon", Icon: Trophy },
  { key: "soccer", href: null, status: "soon", Icon: Globe2 },
]

type AiFeature = {
  key:
    | "aiReport"
    | "rooting"
    | "danger"
    | "commissioner"
    | "share"
    | "leaderboards"
  Icon: typeof Sparkles
}

const AI_FEATURES: AiFeature[] = [
  { key: "aiReport", Icon: Sparkles },
  { key: "rooting", Icon: Trophy },
  { key: "danger", Icon: Shield },
  { key: "commissioner", Icon: ClipboardCheck },
  { key: "share", Icon: Share2 },
  { key: "leaderboards", Icon: ListOrdered },
]

const WC_LOGO_SRC = "/images/brackets/world-cup/af-world-cup-logo.png"
const WC_VIDEO_SRC = "/videos/brackets/world-cup/af-world-cup-hero.mp4"
const WC_POSTER_SRC = "/images/brackets/world-cup/af-world-cup-hero-poster.jpg"
const AF_WORDMARK_SRC = "/branding/allfantasy-wordmark-logo.png"
const AF_MASCOT_SRC = "/af-robot-king.png"

export default async function BracketsHomePage() {
  // Server-side language resolution mirrors the client provider — SSR
  // HTML matches the first CSR pass. resolveServerRenderPreferences is
  // wrapped in try/catch internally and falls back to "en" silently.
  const { language } = await resolveServerRenderPreferences()
  const t = makeBracketsT(language)

  return (
    // `mode-readable` opts into the globals.css light-mode rescue layer
    // so the hardcoded dark hero stays readable on white in light mode
    // without flattening dark / AF mode (rescue rules only fire under
    // html[data-mode="light"]).
    <main className="mode-readable relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      {/* Ambient gradient orbs — purely decorative, hidden in light mode
          via the existing .mode-readable rescue (they sit on a translucent
          mix of --accent so light mode reads as a soft blue wash). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.18),transparent_60%)]"
      />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:gap-14 sm:px-6 sm:py-12">

        {/* ──────────────────────────────────────────────────────────
            Brand strip
            ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src={AF_WORDMARK_SRC}
              alt={t("brk.hub.logoAlt")}
              width={140}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/65 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            {t("brk.hub.heroDashboard")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ──────────────────────────────────────────────────────────
            Hero
            ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/[0.10] via-white/[0.04] to-purple-400/[0.12] p-5 backdrop-blur sm:p-8 lg:p-10">
          {/* Ambient WC video — decorative only, muted and silent. The
              same asset is reused on the WC public hub so it's already
              cached for users who came from there. */}
          <video
            src={WC_VIDEO_SRC}
            poster={WC_POSTER_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden h-full w-full rounded-3xl object-cover opacity-[0.10] mix-blend-luminosity sm:block"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
                {t("brk.hub.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                {t("brk.hub.heroTitle")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                {t("brk.hub.heroSubtitle")}
              </p>

              {/* Launch badge */}
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100">
                <Radio className="h-3 w-3 animate-pulse" />
                {t("brk.hub.heroBadge")}
              </div>

              {/* Primary CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/brackets/world-cup/create"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-black shadow-[0_8px_24px_-8px_rgba(34,211,238,0.65)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  {t("brk.hub.heroCreateWc")}
                </Link>
                <Link
                  href="/brackets/world-cup/join"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08] px-5 py-2.5 text-sm font-black text-cyan-50 transition-colors hover:border-cyan-300/55 hover:bg-cyan-300/[0.14] hover:text-white"
                >
                  {t("brk.hub.heroJoinWithCode")}
                </Link>
                <Link
                  href="/brackets/world-cup/discover"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.10] hover:text-white"
                >
                  {t("brk.hub.heroDiscover")}
                </Link>
              </div>
            </div>

            {/* AF mascot — premium identity anchor. The mascot is a static
                PNG so it inherits the surrounding glow without any client
                JS. Hidden on mobile to keep the hero text-first. */}
            <div className="relative hidden h-40 w-40 shrink-0 items-center justify-center sm:flex md:h-52 md:w-52">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.45),transparent_65%)] blur-2xl"
              />
              <Image
                src={AF_MASCOT_SRC}
                alt={t("brk.hub.mascotAlt")}
                width={208}
                height={208}
                className="relative h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(34,211,238,0.45)]"
                priority
              />
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            World Cup Spotlight
            ──────────────────────────────────────────────────────── */}
        <section
          data-testid="brackets-hub-world-cup-spotlight"
          className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.10] via-white/[0.04] to-emerald-300/[0.06] p-5 backdrop-blur sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-2 sm:h-24 sm:w-24">
              <Image
                src={WC_LOGO_SRC}
                alt={t("brk.hub.wcLogoAlt")}
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
                {t("brk.hub.spotlight.eyebrow")}
              </p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {t("brk.hub.spotlight.title")}
              </h2>
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-white/65">
                {t("brk.hub.spotlight.subtitle")}
              </p>

              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  "brk.hub.spotlight.feature.groupStage",
                  "brk.hub.spotlight.feature.knockoutBracket",
                  "brk.hub.spotlight.feature.aiReport",
                  "brk.hub.spotlight.feature.dangerZones",
                  "brk.hub.spotlight.feature.commissionerTools",
                  "brk.hub.spotlight.feature.inviteShare",
                  "brk.hub.spotlight.feature.fiveLanguages",
                ].map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-white/70">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/80" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/brackets/world-cup/create"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-black shadow-[0_8px_20px_-8px_rgba(34,211,238,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  {t("brk.hub.heroCreateWc")}
                </Link>
                <Link
                  href="/brackets/world-cup/discover"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08] px-4 py-2.5 text-sm font-bold text-cyan-50 transition-colors hover:border-cyan-300/55 hover:bg-cyan-300/[0.14] hover:text-white"
                >
                  {t("brk.hub.heroDiscover")}
                </Link>
                <Link
                  href="/brackets/world-cup/join"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.10] hover:text-white"
                >
                  {t("brk.hub.heroJoinWithCode")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            How it works (3-step)
            ──────────────────────────────────────────────────────── */}
        <section data-testid="brackets-hub-how-it-works" className="space-y-4">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            {t("brk.hub.howItWorks.title")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "brk.hub.howItWorks.step1Title",
                body: "brk.hub.howItWorks.step1Body",
                Icon: Users,
                step: 1,
              },
              {
                title: "brk.hub.howItWorks.step2Title",
                body: "brk.hub.howItWorks.step2Body",
                Icon: ListOrdered,
                step: 2,
              },
              {
                title: "brk.hub.howItWorks.step3Title",
                body: "brk.hub.howItWorks.step3Body",
                Icon: Trophy,
                step: 3,
              },
            ].map(({ title, body, Icon, step }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-[11px] font-black text-cyan-100">
                    {step}
                  </span>
                  <Icon className="h-4 w-4 text-cyan-200" aria-hidden />
                </div>
                <h3 className="text-sm font-black text-white">{t(title)}</h3>
                <p className="text-xs leading-5 text-white/55">{t(body)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            Sports grid
            ──────────────────────────────────────────────────────── */}
        <section data-testid="brackets-hub-sports-grid" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                {t("brk.hub.sports.title")}
              </h2>
              <p className="mt-1 text-sm text-white/55">{t("brk.hub.sports.subtitle")}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SPORT_CARDS.map(({ key, href, status, Icon }) => {
              const isLive = status === "live"
              const titleKey = `brk.hub.sports.sport.${key}`
              const descKey = `brk.hub.sports.sport.${key}.desc`
              const cardClasses = [
                "group flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur transition-colors",
                isLive
                  ? "border-cyan-300/25 bg-gradient-to-br from-cyan-300/[0.10] to-white/[0.04] hover:border-cyan-300/50"
                  : "border-white/10 bg-white/[0.03]",
              ].join(" ")
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          isLive
                            ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/[0.12] text-cyan-200"
                            : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45"
                        }
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <h3 className="text-sm font-black text-white">{t(titleKey)}</h3>
                    </div>
                    <span
                      className={
                        isLive
                          ? "inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200"
                          : "inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/55"
                      }
                    >
                      {isLive && <Radio className="h-2.5 w-2.5 animate-pulse" />}
                      {isLive ? t("brk.hub.sports.statusLive") : t("brk.hub.sports.statusComingSoon")}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-white/55">{t(descKey)}</p>
                  {isLive && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-cyan-200 transition-transform group-hover:translate-x-0.5">
                      {t("brk.hub.sports.openCta")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </>
              )
              if (isLive && href) {
                return (
                  <Link key={key} href={href} className={cardClasses} data-testid={`brackets-hub-sport-${key}`}>
                    {inner}
                  </Link>
                )
              }
              return (
                <div key={key} className={`${cardClasses} cursor-default`} data-testid={`brackets-hub-sport-${key}`}>
                  {inner}
                </div>
              )
            })}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            AI + Social features strip
            ──────────────────────────────────────────────────────── */}
        <section data-testid="brackets-hub-ai-features" className="space-y-4">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            {t("brk.hub.features.title")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_FEATURES.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4 backdrop-blur"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/[0.12] text-cyan-200">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white">{t(`brk.hub.features.${key}`)}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/60">{t(`brk.hub.features.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            Footer / trust note
            ──────────────────────────────────────────────────────── */}
        <footer
          data-testid="brackets-hub-footer"
          className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-[11px] text-white/55 sm:gap-4 sm:p-5"
        >
          <Layers className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
          <p className="flex-1 leading-5">{t("brk.hub.footer.note")}</p>
        </footer>
      </div>
    </main>
  )
}
