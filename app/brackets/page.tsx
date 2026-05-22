import Image from "next/image"
import Link from "next/link"
import { Globe2, Plus, Sparkles, Trophy, Users } from "lucide-react"
import type { Session } from "next-auth"

const WC_LOGO_SRC    = "/images/brackets/world-cup/af-world-cup-logo.png"
const WC_VIDEO_SRC   = "/videos/brackets/world-cup/af-world-cup-hero.mp4"
const WC_POSTER_SRC  = "/images/brackets/world-cup/af-world-cup-hero-poster.jpg"

export const dynamic = "force-dynamic"

/**
 * /brackets home — World Cup hero page.
 *
 * Fully server-rendered. Session is read server-side via getServerSession
 * (wrapped in try/catch so a NextAuth misconfiguration cannot 500 the page),
 * and signed-in vs guest CTA variants are emitted from server JSX directly.
 *
 * No client islands are used for session detection on initial render — this
 * eliminates the production SSR hazard previously introduced by a client
 * useSession() island and restores Railway /brackets to 200.
 */
export default async function BracketsHomePage() {
  // Server-side session detection. Mirrors the defensive pattern in
  // app/layout.tsx so a NextAuth/import failure cannot crash this route.
  let session: Session | null = null
  try {
    const [{ getServerSession }, { authOptions }] = await Promise.all([
      import("next-auth"),
      import("@/lib/auth"),
    ])
    session = (await getServerSession(authOptions as never)) as Session | null
  } catch {
    session = null
  }
  const isAuthed = Boolean(session?.user)

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ══════════════════════════════════════════════
          WORLD CUP HERO
      ══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: "clamp(580px, 78vh, 880px)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, #060b17 88%, var(--panel2)) 0%, color-mix(in srgb, #080d1a 70%, var(--panel2)) 55%, var(--bg) 100%)",
        }}
      >
        {/* Atmospheric background layers */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-x-0 top-0 h-3/4"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, #064e3b 22%, transparent) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent-cyan) 32%, transparent) 0%, transparent 62%)",
            }}
          />
          <div
            className="absolute -bottom-48 -left-28 h-[480px] w-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 38%, transparent) 0%, transparent 68%)",
            }}
          />
          <div
            className="absolute -top-20 -right-20 h-80 w-80 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 22%, transparent) 0%, transparent 68%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 4%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--accent-purple) 4%, transparent) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              background: "linear-gradient(to bottom, transparent, color-mix(in srgb, #060b17 60%, var(--bg)))",
            }}
          />
          {/* Hero video — decorative, no audio, loads metadata only */}
          <video
            src={WC_VIDEO_SRC}
            poster={WC_POSTER_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 hidden h-full w-full object-cover opacity-[0.13] mix-blend-luminosity sm:block"
          />
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-28 text-center sm:px-6 sm:pt-20 sm:pb-32 lg:pt-24">
          <div className="mb-7 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] sm:gap-2.5 sm:tracking-[0.22em]"
              style={{
                background: "color-mix(in srgb, #16a34a 14%, transparent)",
                borderColor: "color-mix(in srgb, #4ade80 28%, transparent)",
                color: "#4ade80",
              }}
            >
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full"
                style={{ background: "#4ade80" }}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">2026 FIFA World Cup &middot; </span>Registration Open
            </span>
          </div>

          <div className="relative mb-7 inline-flex justify-center">
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 40%, transparent) 0%, transparent 65%)",
                filter: "blur(28px)",
                transform: "scale(2.2)",
              }}
            />
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-3xl border p-2 sm:h-24 sm:w-24 sm:p-3"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 22%, transparent), color-mix(in srgb, var(--accent-purple) 16%, transparent))",
                borderColor: "color-mix(in srgb, var(--accent-cyan) 38%, transparent)",
                boxShadow:
                  "0 0 48px -8px color-mix(in srgb, var(--accent-cyan) 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <Image
                src={WC_LOGO_SRC}
                alt="AllFantasy World Cup"
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[0.92] tracking-tight">
            <span className="block" style={{ color: "rgba(255,255,255,0.97)" }}>
              AF World Cup
            </span>
            <span
              className="block"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-cyan) 0%, #818cf8 52%, var(--accent-purple) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Bracket Challenge
            </span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg lg:text-xl"
            style={{ color: "rgba(255,255,255,0.68)" }}
          >
            32 nations. 48 matches. One champion. Pick every game before kickoff and compete in your own
            pool &mdash; with AI analysis on every matchup. Free forever.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {(["32 Teams", "48 Matches", "Group Stage + Knockouts", "100% Free"] as const).map((label) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.50)" }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--accent-cyan-strong)" }}
                  aria-hidden="true"
                />
                {label}
              </div>
            ))}
          </div>

          {/* Session-aware CTA buttons + social proof (server-rendered) */}
          <div className="mt-9 sm:mt-10">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isAuthed ? (
                <>
                  <Link
                    href="/brackets/world-cup"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:min-w-[200px]"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 68%, #818cf8))",
                      color: "var(--on-accent-bg)",
                      boxShadow:
                        "0 10px 36px -10px color-mix(in srgb, var(--accent-cyan) 72%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent-cyan) 28%, transparent)",
                    }}
                  >
                    <Globe2 className="h-4 w-4 shrink-0" />
                    World Cup Bracket
                  </Link>
                  <Link
                    href="/brackets/world-cup/create"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl border px-7 py-3 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto sm:min-w-[160px]"
                    style={{
                      borderColor: "rgba(255,255,255,0.20)",
                      color: "rgba(255,255,255,0.88)",
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Create Pool
                  </Link>
                  <Link
                    href="/brackets/world-cup/discover"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl border px-7 py-3 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto sm:min-w-[160px]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent-amber) 34%, transparent)",
                      color: "rgba(255,255,255,0.92)",
                      background: "color-mix(in srgb, var(--accent-amber) 12%, transparent)",
                    }}
                  >
                    <Trophy className="h-4 w-4 shrink-0" style={{ color: "var(--accent-amber-strong)" }} />
                    Discover Pools
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup?next=%2Fbrackets&callbackUrl=%2Fbrackets"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:min-w-[200px]"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 68%, #818cf8))",
                      color: "var(--on-accent-bg)",
                      boxShadow:
                        "0 10px 36px -10px color-mix(in srgb, var(--accent-cyan) 72%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent-cyan) 28%, transparent)",
                    }}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Sign Up Free
                  </Link>
                  <Link
                    href="/login?callbackUrl=%2Fbrackets"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl border px-7 py-3 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto sm:min-w-[160px]"
                    style={{
                      borderColor: "rgba(255,255,255,0.20)",
                      color: "rgba(255,255,255,0.88)",
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/brackets/discover"
                    className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl border px-7 py-3 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto sm:min-w-[160px]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent-amber) 34%, transparent)",
                      color: "rgba(255,255,255,0.92)",
                      background: "color-mix(in srgb, var(--accent-amber) 12%, transparent)",
                    }}
                  >
                    <Trophy className="h-4 w-4 shrink-0" style={{ color: "var(--accent-amber-strong)" }} />
                    Discover Pools
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex items-center gap-3 rounded-full border px-4 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.10)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex -space-x-1.5" aria-hidden="true">
                {(["\u{1F1E7}\u{1F1F7}", "\u{1F1EB}\u{1F1F7}", "\u{1F1E9}\u{1F1EA}", "\u{1F1E6}\u{1F1F7}"] as const).map((flag, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                    style={{ borderColor: "rgba(0,0,0,0.35)", background: "rgba(255,255,255,0.09)" }}
                  >
                    {flag}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                Join thousands of fans competing worldwide
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Session-aware bottom CTA card (server-rendered) */}
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <div
          className="mb-10 -mt-6 rounded-3xl border p-6 text-center sm:p-8"
          style={{
            background: "color-mix(in srgb, var(--panel) 92%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent-cyan) 26%, var(--border))",
            boxShadow: "0 28px 64px -32px color-mix(in srgb, var(--accent-cyan) 32%, transparent)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent-cyan) 28%, transparent)",
              color: "var(--accent-cyan-strong)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isAuthed ? "Your bracket hub" : "Get started free"}
          </div>
          <h2 className="mb-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--text)" }}>
            {isAuthed
              ? "Create a pool. Build your bracket. Climb the leaderboard."
              : "Create a pool. Invite friends. Fill your bracket."}
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm" style={{ color: "var(--muted)" }}>
            {isAuthed
              ? "Launch a World Cup pool, fill your bracket, and track live scores — all in one place."
              : "Launch your first bracket pool in minutes. AI analysis on every pick. No fees, no premium tiers. Free forever."}
          </p>

          <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            {isAuthed ? (
              <>
                <Link
                  href="/brackets/world-cup"
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 sm:w-auto"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))",
                    color: "var(--on-accent-bg)",
                    boxShadow: "0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)",
                  }}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  My World Cup Pools
                </Link>
                <Link
                  href="/brackets/world-cup/create"
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 sm:w-auto"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--panel2) 50%, transparent)",
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Pool
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup?next=%2Fbrackets&callbackUrl=%2Fbrackets"
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 sm:w-auto"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))",
                    color: "var(--on-accent-bg)",
                    boxShadow: "0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)",
                  }}
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/login?callbackUrl=%2Fbrackets"
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 sm:w-auto"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--panel2) 50%, transparent)",
                  }}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Feature tiles — always visible */}
          <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--panel2) 60%, transparent)",
              }}
            >
              <Globe2 className="mb-2 h-5 w-5" style={{ color: "var(--accent-cyan-strong)" }} />
              <div className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                World Cup Bracket
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Full FIFA 2026 bracket with group stage + knockout picks
              </div>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--panel2) 60%, transparent)",
              }}
            >
              <Sparkles className="mb-2 h-5 w-5" style={{ color: "#c084fc" }} />
              <div className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                AI Coach
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Win probabilities and upset analysis on every matchup
              </div>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--panel2) 60%, transparent)",
              }}
            >
              <Users className="mb-2 h-5 w-5" style={{ color: "var(--accent-amber-strong)" }} />
              <div className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                Private Pools
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Invite friends with a code — your own live leaderboard
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
