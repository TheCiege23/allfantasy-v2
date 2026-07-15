"use client"

import Link from "next/link"
import { useState, useEffect, type CSSProperties, type ReactNode } from "react"
import { signIn } from "next-auth/react"
import {
  Shield,
  Loader2,
  TriangleAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  X,
  TrendingUp,
  Crown,
  Swords,
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useOptionalLanguage } from "@/components/i18n/LanguageProviderClient"
import { signupUrlWithIntent } from "@/lib/auth/auth-intent-resolver"
import { validateSignInInput } from "@/lib/auth/SignInFormController"
import { resolveLoginErrorMessage } from "@/lib/auth/AuthErrorMessageResolver"
import {
  clearUnifiedAuthDestination,
  rememberUnifiedAuthDestination,
  resolveUnifiedAuthDestination,
} from "@/lib/auth/UnifiedAuthOrchestrator"
import {
  type SocialProvider,
  isSocialProviderEnabled,
} from "@/lib/auth/SocialProviderResolver"
import { buildProviderPendingHref } from "@/lib/auth/ProviderPendingFlow"
import { positionColor } from "@/lib/draft/positions"

function resolveSuccessfulLoginRedirect(callbackUrl: string | null | undefined): string {
  if (typeof callbackUrl === "string") {
    const trimmed = callbackUrl.trim()
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      // Plain "/" would send users to the marketing home — default to app dashboard
      if (trimmed === "/") return "/dashboard"
      return trimmed
    }
  }
  return "/dashboard"
}

/** Small avatar chip for the welcome panel's preview cards — reuses the real product's position colors. */
function MiniAvatar({ initials, pos }: { initials: string; pos: string }) {
  const color = positionColor(pos)
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        background: `color-mix(in srgb, ${color} 22%, var(--panel2))`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      {initials}
    </span>
  )
}

function TrustStat({ label }: { label: string }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-[11px] font-semibold"
      style={{ borderColor: "var(--border)", color: "var(--muted)", background: "color-mix(in srgb, var(--panel2) 60%, transparent)" }}
    >
      {label}
    </span>
  )
}

function DecorativeCard({ label, live, children }: { label: string; live?: boolean; children: ReactNode }) {
  return (
    <div
      className="login-card-hover rounded-xl border p-3"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 55%, transparent)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase" style={{ color: "var(--muted)" }}>{label}</span>
        {live && (
          <span
            className="login-live-pulse rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{ background: "color-mix(in srgb, var(--accent-red) 16%, transparent)", color: "var(--accent-red)" }}
          >
            Live
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/** Fantasy command-center welcome panel — desktop: full panel with the AF crest + preview cards; mobile: compact strip above the form. */
function WelcomeFantasyPanel() {
  return (
    <>
      {/* Desktop: full panel */}
      <aside className="relative z-10 hidden flex-col justify-center px-10 py-16 lg:flex xl:px-16" aria-hidden="true">
        <div className="mx-auto w-full max-w-md">
          <img
            src="/brand/af-shield-transparent.png"
            alt=""
            width={40}
            height={40}
            className="mb-5 h-10 w-10 object-contain"
          />
          <h1 className="mb-3 text-[32px] font-black leading-tight sm:text-[38px]" style={{ color: "var(--text)" }}>
            Welcome back to your league.
          </h1>
          <p className="mb-8 text-sm leading-6" style={{ color: "var(--muted)" }}>
            Your matchups, waivers, trades, drafts, and commissioner tools are waiting.
          </p>

          <div className="space-y-3">
            <DecorativeCard label="Live Matchup" live>
              <div className="flex items-center justify-between text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                <span>Dynasty Dragons</span>
                <span className="text-[15px] font-black" style={{ color: "var(--accent-cyan)" }}>78.4</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] font-semibold" style={{ color: "var(--muted)" }}>
                <span>Gridiron Gang</span>
                <span className="text-[15px] font-black" style={{ color: "var(--text)" }}>71.2</span>
              </div>
            </DecorativeCard>

            <DecorativeCard label="Waiver Alert">
              <div className="flex items-center gap-2.5">
                <MiniAvatar initials="RS" pos="WR" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold" style={{ color: "var(--text)" }}>Rome Odunze available</p>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>62% rostered · trending up</p>
                </div>
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "var(--accent-emerald)" }} aria-hidden="true" />
              </div>
            </DecorativeCard>

            <DecorativeCard label="Trade Offer">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: "var(--accent-emerald-strong)" }}>96/100 fair</span>
              </div>
              <p className="text-[12px]" style={{ color: "var(--text)" }}>
                Jonathan Taylor <span style={{ color: "var(--muted)" }}>for</span> DeVonta Smith
              </p>
            </DecorativeCard>

            <DecorativeCard label="Commissioner Alert">
              <div className="flex items-center gap-2.5">
                <Crown className="h-4 w-4 shrink-0" style={{ color: "var(--accent-amber-strong)" }} aria-hidden="true" />
                <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>Playoff bracket locks in 3 days</p>
              </div>
            </DecorativeCard>

            <DecorativeCard label="Draft Room">
              <div className="flex items-center gap-2.5">
                <Swords className="h-4 w-4 shrink-0" style={{ color: "var(--accent-purple)" }} aria-hidden="true" />
                <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                  On the clock <span style={{ color: "var(--muted)" }}>— Pick 1.03, 0:58 remaining</span>
                </p>
              </div>
            </DecorativeCard>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <TrustStat label="Secure & Private" />
            <TrustStat label="Fantasy Sports Only" />
            <TrustStat label="Built for Commissioners" />
            <TrustStat label="No Gambling" />
          </div>
        </div>
      </aside>

      {/* Mobile/tablet: compact intro above the form — crest visible, no cards, form stays near the top */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-8 text-center lg:hidden">
        <img
          src="/brand/af-shield-transparent.png"
          alt=""
          width={36}
          height={36}
          className="mb-3 h-9 w-9 object-contain"
        />
        <h1 className="text-2xl font-black leading-tight" style={{ color: "var(--text)" }}>
          Welcome back to your league.
        </h1>
      </div>
    </>
  )
}

export default function LoginContent() {
  const { t } = useOptionalLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrlParam = searchParams?.get("callbackUrl")
  const callbackUrl = resolveUnifiedAuthDestination({
    callbackUrl: callbackUrlParam,
    next: searchParams?.get("next"),
    returnTo: searchParams?.get("returnTo"),
    intent: searchParams?.get("intent"),
  })
  const postLoginRedirect = resolveSuccessfulLoginRedirect(callbackUrl)
  const isAdminLogin = callbackUrl.startsWith("/admin")
  const passwordReset = searchParams?.get("reset") === "1"
  const oauthErrorParam = searchParams?.get("error")

  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [devBypassLoading, setDevBypassLoading] = useState(false)

  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminRemaining, setAdminRemaining] = useState<number | null>(null)
  const [adminModalOpen, setAdminModalOpen] = useState(isAdminLogin)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  const [configError, setConfigError] = useState<string | null>(null)
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialProvider | null>(null)
  const showDevBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_ENABLED === "true"

  useEffect(() => {
    rememberUnifiedAuthDestination(callbackUrl)
  }, [callbackUrl])

  useEffect(() => {
    fetch("/api/auth/config-check")
      .then((res) => {
        if (res.status === 503) return res.json()
        return null
      })
      .then((data) => {
        if (data?.ok === false && data?.message) setConfigError(data.message)
      })
      .catch(() => {})
  }, [])

  // NOTE: Supabase onAuthStateChange listener disabled — the app uses NextAuth
  // for all server-side auth (getServerSession, JWT middleware). Keeping a Supabase
  // listener here caused a redirect loop: Supabase detects session → redirects →
  // NextAuth doesn't see it → page flickers back. If Supabase becomes the primary
  // auth provider, re-enable this block.
  // See: https://github.com/nextauthjs/next-auth/discussions/4136

  useEffect(() => {
    if (isAdminLogin) {
      setAdminModalOpen(true)
    }
  }, [isAdminLogin])

  useEffect(() => {
    if (!adminModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAdminModalOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [adminModalOpen])

  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const loginRaw =
      (typeof fd.get("af-login") === "string" ? (fd.get("af-login") as string) : login) || ""
    const passwordRaw =
      (typeof fd.get("af-password") === "string" ? (fd.get("af-password") as string) : password) ||
      ""
    const loginTrimmed = loginRaw.trim()
    const passwordValue = passwordRaw
    setLogin(loginTrimmed)
    setPassword(passwordValue)

    if (!loginTrimmed) {
      setError("Please enter your email, username, or phone number.")
      return
    }
    if (!passwordValue.trim()) {
      setError("Please enter your password.")
      return
    }
    const validation = validateSignInInput({ login: loginTrimmed, password: passwordValue })
    if (!validation.ok) {
      setError(validation.error ?? t("common.error.tryAgain"))
      return
    }

    setLoading(true)

    try {
      const result = await signIn("credentials", {
        login: loginTrimmed,
        password: passwordValue,
        redirect: false,
        callbackUrl: postLoginRedirect,
      })

      if (result?.error) {
        setError(resolveLoginErrorMessage(result.error))
      } else {
        clearUnifiedAuthDestination()
        router.replace(postLoginRedirect)
      }
    } catch {
      setError(t("common.error.tryAgain"))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError(null)

    if (!adminPassword.trim()) {
      setAdminError(t("login.error.enterAdminPassword"))
      return
    }

    setAdminLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, next: "/admin" }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        setAdminError(data?.error || t("login.error.failed"))
        setAdminRemaining(typeof data?.remaining === "number" ? data.remaining : null)
        return
      }

      clearUnifiedAuthDestination()
      window.location.href = data.next || "/admin"
    } catch (err: any) {
      setAdminError(err?.message || t("login.error.failed"))
    } finally {
      setAdminLoading(false)
    }
  }

  async function handleDevBypassLogin() {
    setError(null)
    setDevBypassLoading(true)
    try {
      const result = await signIn("dev-bypass", {
        redirect: false,
        callbackUrl: postLoginRedirect,
      })

      if (result?.error) {
        setError("Local dev sign-in failed. Check DEV_AUTH_BYPASS_ENABLED in .env.local.")
      } else {
        clearUnifiedAuthDestination()
        // Use a full navigation so the newly issued auth cookie is observed immediately.
        window.location.assign(postLoginRedirect)
      }
    } catch {
      setError("Local dev sign-in failed. Check DEV_AUTH_BYPASS_ENABLED in .env.local.")
    } finally {
      setDevBypassLoading(false)
    }
  }

  async function handleSocialProvider(provider: SocialProvider) {
    if (socialLoadingProvider) return
    setSocialLoadingProvider(provider)
    try {
      // Every provider (including google/spotify) is gated through the same
      // shared isSocialProviderEnabled() check used by /signup — no
      // per-provider bypass. NextAuth (not Supabase) still handles the
      // actual sign-in call below; the app uses getServerSession/JWT for
      // auth everywhere, so routing through this check first doesn't
      // reintroduce the old Supabase-session redirect-loop issue this
      // function used to special-case around.
      if (isSocialProviderEnabled(provider)) {
        await signIn(provider, { callbackUrl: postLoginRedirect })
        return
      }

      router.push(
        buildProviderPendingHref({
          provider,
          callbackUrl: postLoginRedirect,
        })
      )
    } finally {
      setSocialLoadingProvider(null)
    }
  }

  const inputSurfaceStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--panel2) 82%, transparent)",
    color: "var(--text)",
    borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 50% 15%, color-mix(in srgb, var(--accent-cyan) 14%, transparent) 0%, transparent 65%),
            radial-gradient(ellipse 40% 35% at 70% 80%, color-mix(in srgb, var(--accent-purple) 8%, transparent) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 20% 60%, color-mix(in srgb, var(--accent-purple) 6%, transparent) 0%, transparent 65%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `linear-gradient(color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 60% at 50% 30%, black, transparent 80%)",
        }}
      />

      <nav
        className="relative z-20 flex h-14 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-8"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="AllFantasy home">
          <img
            src="/brand/allfantasy-wordmark-transparent.png"
            alt="AllFantasy"
            className="nav-wordmark h-[34px] w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={signupUrlWithIntent(callbackUrl)}
            className="rounded-[7px] border px-4 py-1.5 text-[13px] font-medium transition hover:opacity-90"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
              color: "var(--muted)",
            }}
          >
            {t("login.createAccount")}
          </Link>
        </div>
      </nav>

      <main className="relative z-10 min-h-[calc(100vh-56px)] lg:grid lg:grid-cols-2">
        <WelcomeFantasyPanel />

        <div className="flex flex-col items-center justify-center px-4 py-8 sm:px-4 sm:py-12 lg:py-16">
        <div className="w-full max-w-[440px]">
          <div className="pb-8 text-center">
            <div className="relative mb-5 inline-flex">
              <div className="absolute left-1/2 top-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.22)_0%,rgba(59,130,246,0.12)_40%,transparent_70%)] blur-[5px]" />
              <img
                src="/brand/af-shield-transparent.png"
                alt="AllFantasy crest"
                width={72}
                height={72}
                className="relative h-[72px] w-[72px] object-contain drop-shadow-[0_0_16px_rgba(6,182,212,0.42)]"
              />
            </div>
            <p className="text-[20px] font-semibold" style={{ color: "var(--text)" }}>
              {t("login.title")}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {t("login.heroSubtitle")}
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--muted2)" }}>
              {t("login.afterSignInSubtitle")}
            </p>
          </div>

          {configError && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <strong>{t("login.signInUnavailable")}</strong> {configError}
                </div>
              </div>
            </div>
          )}

          {passwordReset && !error && (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {t("login.passwordResetSuccess")}
              </div>
            </div>
          )}

          {oauthErrorParam && !error && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  {oauthErrorParam === "OAuthCallback"
                    ? "Social sign-in couldn't complete — your session may have expired or the browser blocked the sign-in cookie. Please try again."
                    : oauthErrorParam === "OAuthAccountNotLinked"
                      ? "This social account is already linked to a different AllFantasy account. Sign in with your original method and connect it from settings."
                      : oauthErrorParam === "SOCIAL_EMAIL_UNVERIFIED"
                        ? "That sign-in method's email isn't verified, so we can't safely connect it to an existing account. Verify your email with that provider, or sign in with your original method first."
                        : "Social sign-in failed. Please try again or use your email and password."}
                </div>
              </div>
            </div>
          )}

          <div
            className="rounded-[18px] border p-8"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
              background: "color-mix(in srgb, var(--panel) 78%, transparent)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow:
                "0 24px 80px color-mix(in srgb, var(--text) 10%, transparent), inset 0 1px 0 color-mix(in srgb, white 6%, transparent)",
            }}
          >
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="login-identifier"
                    className="text-[13px] font-semibold tracking-[0.02em]"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("login.identifier.label")}
                  </label>
                </div>
                <input
                  id="login-identifier"
                  name="af-login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={loading}
                  placeholder={t("login.identifier.placeholder")}
                  className="w-full rounded-[10px] border px-3.5 py-3 text-[15px] outline-none transition placeholder:[color:var(--muted2)] focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  style={inputSurfaceStyle}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="text-[13px] font-semibold tracking-[0.02em]"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("common.password")}
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="af-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder={t("login.password.placeholder")}
                    className="w-full rounded-[10px] border px-3.5 py-3 pr-11 text-[15px] outline-none transition placeholder:[color:var(--muted2)] focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    style={inputSurfaceStyle}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition [color:var(--muted)] hover:[color:var(--accent-cyan-strong)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mb-2 mt-1 flex justify-end">
                  <Link
                    href={`/forgot-password?method=email&returnTo=${encodeURIComponent(callbackUrl)}`}
                    className="text-sm font-medium transition hover:opacity-75"
                    style={{ color: "var(--accent-cyan-strong)" }}
                  >
                    {t("login.forgotPassword")}
                  </Link>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>{error}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3.5 text-base font-bold transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "var(--on-accent-bg)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.signingIn")}
                  </>
                ) : (
                  <>
                    <span>{t("login.signIn")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div
              className="mt-2 flex items-center justify-center gap-2 text-xs"
              style={{ color: "var(--muted2)" }}
            >
              <span
                className="rounded border px-2 py-0.5 font-mono text-[11px] font-semibold"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
                  background: "var(--panel2)",
                  color: "var(--muted)",
                }}
              >
                Enter
              </span>
              <span style={{ color: "var(--muted)" }}>{t("login.toSignIn")}</span>
            </div>

            <div
              className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--muted2)" }}
            >
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--border) 80%, transparent)" }}
              />
              <span>{t("login.orContinueWith")}</span>
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--border) 80%, transparent)" }}
              />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleSocialProvider("google")}
                disabled={socialLoadingProvider !== null}
                aria-label={
                  isSocialProviderEnabled("google")
                    ? "Continue with Google"
                    : "Continue with Google — Coming Soon"
                }
                className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border px-4 py-3 text-sm font-medium transition hover:opacity-95 disabled:opacity-70"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
                  background: "var(--panel2)",
                  color: "var(--text)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.703-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                <span>{socialLoadingProvider === "google" ? t("login.opening") : t("login.continueWithGoogle")}</span>
                {!isSocialProviderEnabled("google") && (
                  <span className="badge-soon ml-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]">
                    Soon
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleSocialProvider("spotify")}
                disabled={socialLoadingProvider !== null}
                aria-label={
                  isSocialProviderEnabled("spotify")
                    ? "Continue with Spotify"
                    : "Continue with Spotify — Coming Soon"
                }
                className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border px-4 py-3 text-sm font-medium transition hover:opacity-95 disabled:opacity-70"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
                  background: "var(--panel2)",
                  color: "var(--text)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="#1DB954" />
                  <path d="M16.8 16.64a.75.75 0 0 1-1.03.25c-2.8-1.71-6.32-2.1-10.45-1.13a.75.75 0 1 1-.34-1.46c4.52-1.05 8.43-.62 11.57 1.3.36.22.47.68.25 1.04Zm1.48-3.3a.95.95 0 0 1-1.3.31c-3.2-1.97-8.07-2.55-11.84-1.36a.95.95 0 0 1-.58-1.81c4.3-1.38 9.66-.72 13.4 1.57.45.28.6.86.32 1.3Zm.12-3.43C14.57 7.63 8.82 7.4 5.34 8.48a1.15 1.15 0 1 1-.68-2.2c4-1.22 10.43-.98 14.93 1.7a1.15 1.15 0 0 1-1.18 1.93Z" fill="#fff" />
                </svg>
                <span>{socialLoadingProvider === "spotify" ? t("login.opening") : t("login.continueWithSpotify")}</span>
                {!isSocialProviderEnabled("spotify") && (
                  <span className="badge-soon ml-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em]">
                    Soon
                  </span>
                )}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                {
                  provider: "apple" as const,
                  label: "Apple",
                  icon: (
                    <svg className="h-5 w-5 [color:var(--text)]" viewBox="0 0 18 18" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12.71 9.43c-.02-2.14 1.75-3.17 1.83-3.22-1-1.46-2.55-1.66-3.1-1.68-1.33-.13-2.6.78-3.27.78-.67 0-1.7-.76-2.8-.74-1.44.02-2.76.83-3.5 2.12-1.5 2.59-.38 6.43 1.07 8.53.71 1.03 1.56 2.18 2.67 2.14 1.07-.04 1.48-.69 2.77-.69 1.3 0 1.67.69 2.81.67 1.15-.02 1.89-1.05 2.59-2.08.82-1.19 1.16-2.34 1.18-2.4-.03-.01-2.26-.87-2.25-3.43z"
                      />
                      <path
                        fill="currentColor"
                        d="M10.6 3.12c.59-.71.99-1.7.88-2.69-.85.03-1.88.57-2.49 1.27-.54.63-1.02 1.63-.89 2.59.94.07 1.9-.47 2.5-1.17z"
                      />
                    </svg>
                  ),
                },
                {
                  provider: "facebook" as const,
                  label: "Facebook",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.03 4.388 11.025 10.125 11.927V15.563H7.078v-3.49h3.047V9.43c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.252h3.328l-.532 3.49h-2.796v8.437C19.612 23.098 24 18.103 24 12.073z" />
                    </svg>
                  ),
                },
                {
                  provider: "discord" as const,
                  label: "Discord",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#5865F2" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.121.1.247.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  ),
                },
                {
                  provider: "instagram" as const,
                  label: "Instagram",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <defs>
                        <linearGradient id="login-ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f09433" />
                          <stop offset="25%" stopColor="#e6683c" />
                          <stop offset="50%" stopColor="#dc2743" />
                          <stop offset="75%" stopColor="#cc2366" />
                          <stop offset="100%" stopColor="#bc1888" />
                        </linearGradient>
                      </defs>
                      <path fill="url(#login-ig-g)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  ),
                },
                {
                  provider: "x" as const,
                  label: "X / Twitter",
                  icon: (
                    <svg className="h-5 w-5 [color:var(--text)]" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.256 5.622 5.908-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                },
                {
                  provider: "tiktok" as const,
                  label: "TikTok",
                  icon: (
                    <svg className="h-5 w-5 [color:var(--text)]" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.27 8.27 0 004.84 1.55V6.86a4.85 4.85 0 01-1.07-.17z" />
                    </svg>
                  ),
                },
              ].map((item) => {
                const enabled = isSocialProviderEnabled(item.provider)
                return (
                  <button
                    key={item.provider}
                    type="button"
                    onClick={() => void handleSocialProvider(item.provider)}
                    disabled={socialLoadingProvider !== null}
                    aria-label={enabled ? `Continue with ${item.label}` : `${item.label} — Coming Soon`}
                    className="relative flex flex-col items-center gap-1 rounded-[10px] border px-2 py-3 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
                      background: "var(--panel2)",
                      color: "var(--text)",
                    }}
                    title={enabled ? `Continue with ${item.label}` : `${item.label} — coming soon`}
                  >
                    {!enabled && (
                      <span className="badge-soon absolute right-1 top-1 rounded border px-1 text-[8px] font-bold uppercase tracking-[0.04em]">
                        Soon
                      </span>
                    )}
                    {item.icon}
                    <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {showDevBypass && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <Shield className="h-4 w-4" />
                  <span>Local Dev Access</span>
                </div>
                <p className="mb-3 text-xs text-emerald-100/80">
                  Development-only bypass for localhost testing. Signs in as the local test user and works with the dev admin monetization override.
                </p>
                <button
                  type="button"
                  onClick={handleDevBypassLogin}
                  disabled={devBypassLoading}
                  className="w-full rounded-[10px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {devBypassLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.signingIn")}
                    </span>
                  ) : (
                    "Continue as Local Dev User"
                  )}
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  setAdminError(null)
                  setAdminRemaining(null)
                  setAdminModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition hover:opacity-80"
                style={{ color: "var(--muted)" }}
              >
                <Shield className="h-3.5 w-3.5" style={{ color: "var(--accent-purple)" }} />
                Secure admin access
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            {t("login.newToAllFantasy")}{" "}
            <Link
              href={signupUrlWithIntent(callbackUrl)}
              className="font-semibold transition hover:opacity-80"
              style={{ color: "var(--accent-cyan-strong)" }}
            >
              {t("login.createFreeAccount")}
            </Link>
          </div>
        </div>
        </div>
      </main>

      {adminModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: "color-mix(in srgb, var(--bg) 65%, rgba(0,0,0,0.45))" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setAdminModalOpen(false)
            }
          }}
        >
          <div
            className="relative w-full max-w-[340px] rounded-2xl border p-8 shadow-2xl"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 100%, transparent)",
              background: "var(--panel)",
              color: "var(--text)",
            }}
          >
            <button
              type="button"
              onClick={() => setAdminModalOpen(false)}
              className="absolute right-3 top-3 p-1 transition hover:opacity-90"
              style={{ color: "var(--muted)" }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-1 flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: "var(--accent-purple)" }} />
              <h2 className="font-['Bebas_Neue'] text-[22px] tracking-[0.04em]" style={{ color: "var(--text)" }}>
                {t("login.admin.signInTitle")}
              </h2>
            </div>
            <p className="mb-5 text-sm" style={{ color: "var(--muted)" }}>
              Restricted access. Enter your admin credentials to continue.
            </p>

            {adminError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    {adminError}
                    {typeof adminRemaining === "number" && (
                      <span className="ml-1 text-xs text-red-200/70">
                        ({adminRemaining} {t("login.admin.attemptsRemaining")})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  type={showAdminPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("login.admin.placeholder")}
                  disabled={adminLoading}
                  autoFocus
                  className="w-full rounded-[10px] border px-3.5 py-3 pr-11 text-[15px] outline-none transition placeholder:[color:var(--muted2)] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  style={inputSurfaceStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition [color:var(--muted)] hover:[color:var(--accent-purple)]"
                  aria-label={showAdminPassword ? t("common.hidePassword") : t("common.showPassword")}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={adminLoading || !adminPassword.trim()}
                className="w-full rounded-[10px] border px-4 py-3 text-sm font-semibold transition hover:opacity-95 disabled:opacity-60"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent-purple) 45%, var(--border))",
                  background: "color-mix(in srgb, var(--accent-purple) 18%, transparent)",
                  color: "var(--text)",
                }}
              >
                {adminLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.signingIn")}
                  </span>
                ) : (
                  "Sign In as Admin"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .login-card-hover {
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .login-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -18px rgba(2, 6, 23, 0.35);
        }
        .login-live-pulse {
          position: relative;
        }
        .login-live-pulse::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          border: 1px solid color-mix(in srgb, var(--accent-red) 55%, transparent);
          animation: loginLivePulse 1.8s ease-out infinite;
        }
        @keyframes loginLivePulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-card-hover { transition: none; }
          .login-card-hover:hover { transform: none; }
          .login-live-pulse::before { animation: none !important; opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
