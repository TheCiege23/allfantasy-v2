"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import {
  ArrowLeft,
  Shield,
  Loader2,
  TriangleAlert,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import AuthShell from "@/components/auth/AuthShell"
import AuthHero from "@/components/auth/AuthHero"
import AuthSocialBlock from "@/components/auth/SocialLoginButtonsBlock"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { signupUrlWithIntent } from "@/lib/auth/auth-intent-resolver"
import { validateSignInInput } from "@/lib/auth/SignInFormController"
import {
  resolveLoginErrorMessage,
  resolveSleeperLoginErrorMessage,
} from "@/lib/auth/AuthErrorMessageResolver"
import {
  clearUnifiedAuthDestination,
  rememberUnifiedAuthDestination,
  resolveUnifiedAuthDestination,
} from "@/lib/auth/UnifiedAuthOrchestrator"

function resolveSuccessfulLoginRedirect(callbackUrl: string | null | undefined): string {
  if (typeof callbackUrl === "string" && callbackUrl.trim().startsWith("/app")) {
    return callbackUrl.trim()
  }
  return "/app/home"
}

export default function LoginContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrlParam = searchParams?.get("callbackUrl")
  const callbackUrl = resolveUnifiedAuthDestination({
    callbackUrl: callbackUrlParam,
    next: searchParams?.get("next"),
    returnTo: searchParams?.get("returnTo"),
    intent: searchParams?.get("intent"),
  })
  const postLoginRedirect = resolveSuccessfulLoginRedirect(callbackUrlParam)
  const isAdminLogin = callbackUrl.startsWith("/admin")
  const passwordReset = searchParams?.get("reset") === "1"
  const destinationLabel = callbackUrl.startsWith("/brackets")
    ? t("login.destination.bracket")
    : callbackUrl.startsWith("/af-legacy")
      ? t("login.destination.legacy")
      : callbackUrl.startsWith("/app") || callbackUrl.startsWith("/leagues")
        ? t("login.destination.webapp")
        : t("login.destination.home")

  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sleeperUsername, setSleeperUsername] = useState("")
  const [sleeperLoading, setSleeperLoading] = useState(false)
  const [devBypassLoading, setDevBypassLoading] = useState(false)

  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminRemaining, setAdminRemaining] = useState<number | null>(null)

  const [configError, setConfigError] = useState<string | null>(null)
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

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const validation = validateSignInInput({ login, password })
    if (!validation.ok) {
      setError(validation.error ?? t("common.error.tryAgain"))
      return
    }

    setLoading(true)

    try {
      const result = await signIn("credentials", {
        login: login.trim(),
        password,
        redirect: false,
        callbackUrl,
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

  async function handleSleeperLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const username = sleeperUsername.trim()
    if (!username) {
      setError("Enter your Sleeper username.")
      return
    }
    setSleeperLoading(true)
    try {
      const result = await signIn("sleeper", {
        sleeperUsername: username,
        redirect: false,
        callbackUrl,
      })
      if (result?.error) {
        setError(resolveSleeperLoginErrorMessage(result.error))
      } else {
        clearUnifiedAuthDestination()
        router.replace(postLoginRedirect)
      }
    } catch {
      setError(t("common.error.tryAgain"))
    } finally {
      setSleeperLoading(false)
    }
  }

  async function handleDevBypassLogin() {
    setError(null)
    setDevBypassLoading(true)
    try {
      const result = await signIn("dev-bypass", {
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError("Local dev sign-in failed. Check DEV_AUTH_BYPASS_ENABLED in .env.local.")
      } else {
        clearUnifiedAuthDestination()
        router.replace(postLoginRedirect)
      }
    } catch {
      setError("Local dev sign-in failed. Check DEV_AUTH_BYPASS_ENABLED in .env.local.")
    } finally {
      setDevBypassLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_42%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.08),transparent_42%)]" />
      </div>

      <Link
        href="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white/80 backdrop-blur-sm transition hover:bg-black/55 hover:text-white md:left-6 md:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <div className="relative z-10 w-full max-w-md space-y-4">
        {isAdminLogin ? (
          <div className="rounded-3xl border border-white/15 bg-black/45 p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xl font-semibold">{t("login.admin.signInTitle")}</div>
                <div className="text-sm text-white/60">{t("login.admin.subtitle")}</div>
              </div>
            </div>

            {adminError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
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

            <form onSubmit={handleAdminLogin} className="mt-5 space-y-3">
              <div>
                <label className="text-sm text-white/70">{t("common.password")}</label>
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/50"
                  placeholder={t("login.admin.placeholder")}
                  disabled={adminLoading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={adminLoading || !adminPassword.trim()}
                className="w-full rounded-xl bg-white text-black px-4 py-2.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-60 transition-colors"
              >
                {adminLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.signingIn")}
                  </span>
                ) : (
                  t("common.signIn")
                )}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-2 flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-black/45 p-2 pr-4 shadow-lg backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/20 to-purple-500/20">
                <Image
                  src="/af-crest.png"
                  alt="AllFantasy crest"
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">AllFantasy</p>
                <p className="text-xs text-white/80">Sports App Sign In</p>
              </div>
            </div>
            <AuthHero title={t("login.title")} subtitle={t("login.subtitle")} />
            <p className="-mt-3 mb-1 text-center text-xs text-white/50">{t("login.afterSignIn")} <span className="font-medium text-cyan-300/90">{destinationLabel}</span></p>

            {configError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <strong>{t("login.signInUnavailable")}</strong> {configError}
                  </div>
                </div>
              </div>
            )}

            {passwordReset && !error && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  {t("login.passwordResetSuccess")}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>{error}</div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-md">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-identifier" className="block text-xs font-medium text-white/70">{t("login.identifier.label")}</label>
                  <input
                    id="login-identifier"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    type="text"
                    autoComplete="username"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder={t("login.identifier.placeholder")}
                    disabled={loading}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-xs font-medium text-white/70">{t("common.password")}</label>
                    <Link href={`/forgot-password?method=email&returnTo=${encodeURIComponent(callbackUrl)}`} className="text-xs text-cyan-400/80 hover:text-cyan-300 transition">
                      {t("login.forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 pr-10 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                      placeholder={t("login.password.placeholder")}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !login.trim() || !password}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 transition-all hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.signingIn")}
                    </span>
                  ) : (
                    t("login.enter")
                  )}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-md">
              <form onSubmit={handleSleeperLogin} className="space-y-3">
                <div>
                  <label htmlFor="sleeper-username" className="block text-xs font-medium text-white/70">
                    Sleeper username
                  </label>
                  <input
                    id="sleeper-username"
                    value={sleeperUsername}
                    onChange={(e) => setSleeperUsername(e.target.value)}
                    type="text"
                    autoComplete="username"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="@your_sleeper_name"
                    disabled={sleeperLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sleeperLoading || !sleeperUsername.trim()}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  {sleeperLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.signingIn")}
                    </span>
                  ) : (
                    "Continue with Sleeper"
                  )}
                </button>
              </form>
            </div>

            {showDevBypass && (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-xl backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-200">
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
                  className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
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

            <div className="rounded-3xl border border-white/15 bg-black/45 p-5 shadow-xl backdrop-blur-sm">
              <AuthSocialBlock callbackUrl={callbackUrl} />
            </div>

            <p className="text-center text-sm text-white/50">
              New to AllFantasy?{" "}
              <Link
                href={signupUrlWithIntent(callbackUrl)}
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                Create your account
              </Link>
            </p>

            <div className="rounded-3xl border border-white/15 bg-black/45 p-5 shadow-xl backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>{t("login.admin.signInTitle")}</span>
              </div>

              {adminError && (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
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

              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="text-xs text-white/60">{t("login.admin.password")}</label>
                  <input
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/60"
                    placeholder={t("login.admin.placeholder")}
                    disabled={adminLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={adminLoading || !adminPassword.trim()}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
                >
                  {adminLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.signingIn")}
                    </span>
                  ) : (
                    t("login.admin.signIn")
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  )
}








