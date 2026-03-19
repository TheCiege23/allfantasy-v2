"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import {
  ArrowLeft,
  Shield,
  Loader2,
  TriangleAlert,
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import AuthShell from "@/components/auth/AuthShell"
import AuthHero from "@/components/auth/AuthHero"
import SocialLoginButtons from "@/components/auth/SocialLoginButtons"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

export default function LoginContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams?.get("callbackUrl") || searchParams?.get("next") || "/dashboard"
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
  const [sleeperError, setSleeperError] = useState<string | null>(null)

  const [keepSignedIn, setKeepSignedIn] = useState(true)

  const [showAdmin, setShowAdmin] = useState(isAdminLogin)
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminRemaining, setAdminRemaining] = useState<number | null>(null)

  const [configError, setConfigError] = useState<string | null>(null)

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

    if (!login.trim()) {
      setError(t("login.error.enterIdentifier"))
      return
    }

    if (!password) {
      setError(t("login.error.enterPassword"))
      return
    }

    setLoading(true)

    try {
      const result = await signIn("credentials", {
        login: login.trim(),
        password,
        redirect: false,
        callbackUrl,
        // hint for future session-tuning; ignored by backend today
        keepSignedIn: keepSignedIn ? "1" : "0",
      })

      if (result?.error) {
        if (result.error.includes("SLEEPER_ONLY_ACCOUNT")) {
          setError(t("login.error.sleeperOnly"))
        } else if (result.error.includes("PASSWORD_NOT_SET")) {
          setError(t("login.error.passwordNotSet"))
        } else {
          setError(t("login.error.invalidCredentials"))
        }
      } else if (result?.url) {
        router.push(result.url)
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError(t("common.error.tryAgain"))
    } finally {
      setLoading(false)
    }
  }

  async function handleSleeperLogin(e: React.FormEvent) {
    e.preventDefault()
    setSleeperError(null)

    if (!sleeperUsername.trim()) {
      setSleeperError(t("login.error.enterSleeper"))
      return
    }

    setSleeperLoading(true)
    try {
      const result = await signIn("sleeper", {
        sleeperUsername: sleeperUsername.trim(),
        redirect: false,
        callbackUrl: "/rankings",
      })

      if (result?.error) {
        setSleeperError(t("login.error.sleeperNotFound"))
      } else if (result?.url) {
        router.push(result.url)
      } else {
        router.push("/rankings")
      }
    } catch {
      setSleeperError(t("common.error.tryAgain"))
    } finally {
      setSleeperLoading(false)
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

      window.location.href = data.next || "/admin"
    } catch (err: any) {
      setAdminError(err?.message || t("login.error.failed"))
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <AuthShell>
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <div className="w-full max-w-md space-y-4">
        {isAdminLogin ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-2">
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
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/20"
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
            <AuthHero title={t("login.title")} subtitle={t("login.subtitle")} />
            <p className="-mt-3 mb-1 text-center text-xs text-white/45">{t("login.afterSignIn")} {destinationLabel}</p>

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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-identifier" className="block text-xs font-medium text-white/70">{t("login.identifier.label")}</label>
                  <input
                    id="login-identifier"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    type="text"
                    autoComplete="username"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder={t("login.identifier.placeholder")}
                    disabled={loading}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-xs font-medium text-white/70">{t("common.password")}</label>
                    <Link href={`/forgot-password?returnTo=${encodeURIComponent(callbackUrl)}`} className="text-xs text-cyan-400/80 hover:text-cyan-300 transition">
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
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 pr-10 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                      placeholder={t("login.password.placeholder")}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/40">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-white/30 bg-black/40 text-cyan-500 focus:ring-cyan-500"
                      disabled={loading}
                    />
                    <span>{t("login.keepSignedIn")}</span>
                  </label>
                  <span>{t("login.secureSession")}</span>
                </div>
                <button
                  type="submit"
                  disabled={loading || !login.trim() || !password}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 transition-all"
                >
                  {loading ? (
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

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/40">{t("login.orSignInWith")}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <SocialLoginButtons callbackUrl={callbackUrl} />
            <p className="pt-1 text-[11px] text-white/40 leading-relaxed">
              {t("login.oneAccountNote")}
            </p>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold">S</div>
                <span className="text-sm font-medium text-white/80">{t("login.sleeper.title")}</span>
              </div>

              {sleeperError && (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>{sleeperError}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSleeperLogin} className="space-y-3">
                <div>
                  <label className="text-xs text-white/60">{t("login.sleeper.username")}</label>
                  <input
                    value={sleeperUsername}
                    onChange={(e) => setSleeperUsername(e.target.value)}
                    type="text"
                    autoComplete="username"
                    className="mt-1 w-full rounded-xl border border-cyan-500/20 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-cyan-500/40"
                    placeholder={t("login.sleeper.placeholder")}
                    disabled={sleeperLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sleeperLoading || !sleeperUsername.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 transition-all"
                >
                  {sleeperLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("login.sleeper.connecting")}
                    </span>
                  ) : (
                    t("login.sleeper.signIn")
                  )}
                </button>
              </form>
              <p className="mt-2 text-center text-xs text-white/30">
                {t("login.sleeper.note")}
              </p>
            </div>

            <p className="text-center text-sm text-white/40">
              {t("login.noAccount")} {" "}
              <Link href={`/signup?next=${encodeURIComponent(callbackUrl)}`} className="text-white/80 hover:text-white hover:underline transition">
                {t("common.signUp")}
              </Link>
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdmin((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm text-white/50 hover:text-white/70 transition"
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t("login.admin.toggle")}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdmin ? "rotate-180" : ""}`}
                />
              </button>

              {showAdmin && (
                <div className="px-5 pb-5 pt-1 border-t border-white/5">
                  {adminError && (
                    <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          {adminError}
                          {typeof adminRemaining === "number" && (
                            <span className="ml-1 text-xs text-red-200/70">
                              ({adminRemaining} attempts remaining)
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
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/20"
                        placeholder={t("login.admin.placeholder")}
                        disabled={adminLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={adminLoading || !adminPassword.trim()}
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-60 transition"
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
              )}
            </div>
          </>
        )}
      </div>
    </AuthShell>
  )
}








