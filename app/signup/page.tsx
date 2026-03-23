"use client"

import { Suspense, useState, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { loginUrlWithIntent } from "@/lib/auth/auth-intent-resolver"
import {
  sendSignupPhoneVerificationCode,
  verifySignupPhoneCode,
} from "@/lib/auth/PhoneVerificationService"
import {
  resolvePostSignupCallbackUrl,
} from "@/lib/auth/SignupFlowController"
import {
  clearUnifiedAuthDestination,
  rememberUnifiedAuthDestination,
  resolveUnifiedAuthDestination,
} from "@/lib/auth/UnifiedAuthOrchestrator"
import { getDisclaimerUrl, getTermsUrl, getPrivacyUrl } from "@/lib/legal/LegalRouteResolver"
import { SIGNUP_TIMEZONES, DEFAULT_SIGNUP_TIMEZONE } from "@/lib/signup/timezones"
import { AVATAR_PRESETS, AVATAR_PRESET_LABELS, type AvatarPresetId } from "@/lib/signup/avatar-presets"
import { getPasswordStrength } from "@/lib/signup/PasswordStrengthResolver"
import {
  formatSignupPhoneDisplay,
  normalizePhoneForSubmit,
  normalizeSignupPhoneDigits,
} from "@/lib/signup/SignupFlowController"
import {
  checkUsernameAvailability,
  suggestUsername,
} from "@/lib/signup/UsernameAvailabilityService"
import { validateAvatarUploadFile } from "@/lib/signup/AvatarPickerService"
import {
  LEGACY_IMPORT_PROVIDERS,
  getLegacyImportProviderMessage,
  type LegacyImportProvider,
} from "@/lib/signup/LegacyImportOnboardingService"
import { validateSignupAgreements } from "@/lib/signup/AgreementAcceptanceService"
import { isSignupAgreementGateOpen } from "@/lib/legal/SignupAgreementGate"
import SocialLoginButtons from "@/components/auth/SocialLoginButtons"
import { IdentityImageRenderer } from "@/components/identity/IdentityImageRenderer"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { useThemeMode } from "@/components/theme/ThemeProvider"
import {
  ArrowLeft,
  Loader2,
  TriangleAlert,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  Shield,
  Sparkles,
  X,
  CreditCard,
} from "lucide-react"

interface SleeperResult {
  found: boolean
  username?: string
  userId?: string
  displayName?: string
  avatar?: string | null
}

function SignupContent() {
  const { t, language } = useLanguage()
  const { mode } = useThemeMode()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nextParam = searchParams?.get("next") ?? undefined
  const callbackParam = searchParams?.get("callbackUrl") ?? undefined
  const returnToParam = searchParams?.get("returnTo") ?? undefined
  const intentParam = searchParams?.get("intent") ?? undefined
  const redirectAfterSignup = resolveUnifiedAuthDestination({
    next: nextParam,
    callbackUrl: callbackParam,
    returnTo: returnToParam,
    intent: intentParam,
  })
  const refParam = searchParams?.get("ref")?.trim() || undefined

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [timezone, setTimezone] = useState(DEFAULT_SIGNUP_TIMEZONE)
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "es">(
    language === "es" ? "es" : "en"
  )
  const [preferredLanguageTouched, setPreferredLanguageTouched] = useState(false)
  const [avatarPreset, setAvatarPreset] = useState<string | null>("crest")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFileError, setAvatarFileError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState("")
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneCodeVerified, setPhoneCodeVerified] = useState(false)
  const [phoneSendingCode, setPhoneSendingCode] = useState(false)
  const [phoneVerifyingCode, setPhoneVerifyingCode] = useState(false)
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null)
  const [showDlModal, setShowDlModal] = useState(false)
  const [sleeperUsername, setSleeperUsername] = useState("")
  const [sleeperResult, setSleeperResult] = useState<SleeperResult | null>(null)
  const [sleeperLooking, setSleeperLooking] = useState(false)
  const [legacyImportMessage, setLegacyImportMessage] = useState<string | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<"EMAIL" | "PHONE">("EMAIL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [emailVerificationPrepared, setEmailVerificationPrepared] = useState(true)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid" | "unvalidated">("idle")
  const [usernameMessage, setUsernameMessage] = useState<string>("")
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null)
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [suggestingUsername, setSuggestingUsername] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const agreementGateOpen = useMemo(
    () => isSignupAgreementGateOpen({ disclaimerAgreed, termsAgreed }),
    [disclaimerAgreed, termsAgreed]
  )
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword.length) return false
    return password === confirmPassword
  }, [password, confirmPassword])
  const progressPercent = useMemo(() => {
    const fields = [
      !!username.trim(),
      usernameStatus === "ok" || usernameStatus === "unvalidated",
      !!email.trim(),
      !!password && passwordStrength.valid,
      password === confirmPassword && confirmPassword.length >= 8,
      !!timezone,
      !!preferredLanguage,
      ageConfirmed,
      verificationMethod === "PHONE" ? phoneCodeVerified : true,
      termsAgreed,
      disclaimerAgreed,
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [username, usernameStatus, email, password, passwordStrength.valid, confirmPassword, timezone, preferredLanguage, ageConfirmed, verificationMethod, phoneCodeVerified, termsAgreed, disclaimerAgreed])

  const lookupSleeper = useCallback(async () => {
    if (!sleeperUsername.trim() || sleeperLooking) return
    setSleeperLooking(true)
    setSleeperResult(null)
    setLegacyImportMessage(null)
    try {
      const res = await fetch(`/api/auth/sleeper-lookup?username=${encodeURIComponent(sleeperUsername.trim())}`)
      const data = await res.json().catch(() => ({}))
      setSleeperResult(data)
      if (data?.found) {
        setLegacyImportMessage("Sleeper account linked. We’ll queue import after account creation.")
      } else {
        setLegacyImportMessage("Sleeper account not found. You can still create your account and import later.")
      }
    } catch {
      setSleeperResult({ found: false })
      setLegacyImportMessage("Could not look up Sleeper right now. You can import later from Settings.")
    } finally {
      setSleeperLooking(false)
    }
  }, [sleeperUsername, sleeperLooking])

  const applyUsernameSuggestion = useCallback(async () => {
    const base = username.trim() || "user"
    setSuggestingUsername(true)
    setUsernameSuggestion(null)
    try {
      const suggestion = await suggestUsername(base)
      if (suggestion) {
        setUsername(suggestion)
        setUsernameSuggestion(suggestion)
      }
    } finally {
      setSuggestingUsername(false)
    }
  }, [username])

  async function handleSendPhoneCode() {
    const normalizedPhone = normalizePhoneForSubmit(phone)
    if (!normalizedPhone) {
      setPhoneVerificationMessage("Enter your phone number first.")
      return
    }
    setPhoneSendingCode(true)
    setPhoneVerificationMessage(null)
    try {
      const res = await sendSignupPhoneVerificationCode(normalizedPhone)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === "RATE_LIMITED") {
          setPhoneVerificationMessage("Please wait before requesting another code.")
        } else {
          setPhoneVerificationMessage(data?.message || "Could not send verification code.")
        }
        return
      }
      setPhoneCodeSent(true)
      setPhoneCodeVerified(false)
      setPhoneVerificationMessage("Verification code sent.")
    } catch {
      setPhoneVerificationMessage("Could not send verification code.")
    } finally {
      setPhoneSendingCode(false)
    }
  }

  async function handleVerifyPhoneCode() {
    const normalizedPhone = normalizePhoneForSubmit(phone)
    if (!normalizedPhone) {
      setPhoneVerificationMessage("Enter your phone number first.")
      return
    }
    if (!phoneCode.trim()) {
      setPhoneVerificationMessage("Enter the verification code.")
      return
    }
    setPhoneVerifyingCode(true)
    setPhoneVerificationMessage(null)
    try {
      const res = await verifySignupPhoneCode({
        phone: normalizedPhone,
        code: phoneCode.trim(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === "INVALID_CODE") {
          setPhoneCodeVerified(false)
          setPhoneVerificationMessage("Invalid code. Please try again.")
        } else if (data?.error === "RATE_LIMITED") {
          setPhoneCodeVerified(false)
          setPhoneVerificationMessage("Too many attempts. Please wait.")
        } else {
          setPhoneCodeVerified(false)
          setPhoneVerificationMessage(data?.message || "Verification failed.")
        }
        return
      }
      setPhoneCodeVerified(true)
      setPhoneVerificationMessage("Phone verified.")
    } catch {
      setPhoneCodeVerified(false)
      setPhoneVerificationMessage("Verification failed.")
    } finally {
      setPhoneVerifyingCode(false)
    }
  }

  function handleLegacyImportProviderClick(provider: LegacyImportProvider) {
    setLegacyImportMessage(getLegacyImportProviderMessage(provider))
  }

  async function runPostSignupProfileSetup() {
    if (sleeperResult?.found && sleeperResult.username) {
      await fetch("/api/legacy/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sleeper_username: sleeperResult.username }),
      }).catch(() => null)
    }
  }

  useEffect(() => {
    rememberUnifiedAuthDestination(redirectAfterSignup)
  }, [redirectAfterSignup])

  useEffect(() => {
    if (preferredLanguageTouched) return
    setPreferredLanguage(language === "es" ? "es" : "en")
  }, [language, preferredLanguageTouched])

  // Debounced username availability + profanity check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("idle")
      setUsernameMessage("")
      return
    }
    const normalized = username.trim()
    if (normalized.length < 3 || normalized.length > 30) {
      setUsernameStatus("invalid")
      setUsernameMessage(t("signup.username.length"))
      return
    }
    if (!/^[A-Za-z0-9_]+$/.test(normalized)) {
      setUsernameStatus("invalid")
      setUsernameMessage(t("signup.username.charset"))
      return
    }

    let cancelled = false
    setUsernameStatus("checking")
    setUsernameMessage("Checking availability…")

    const timer = setTimeout(async () => {
      try {
        const data = await checkUsernameAvailability(normalized)
        if (cancelled) return
        if (!data.ok) {
          setUsernameStatus("unvalidated")
          if (data.reason === "db_unavailable") {
            setUsernameMessage("Username check is temporarily unavailable (database issue).")
          } else {
            setUsernameMessage(t("signup.username.unable"))
          }
          return
        }
        if (!data.available) {
          if (data.reason === "taken") {
            setUsernameStatus("taken")
            setUsernameMessage(t("signup.username.taken"))
          } else if (data.reason === "profanity") {
            setUsernameStatus("invalid")
            setUsernameMessage(t("signup.username.profanity"))
          } else if (data.reason === "length") {
            setUsernameStatus("invalid")
            setUsernameMessage(t("signup.username.length"))
          } else if (data.reason === "charset") {
            setUsernameStatus("invalid")
            setUsernameMessage(t("signup.username.charset"))
          } else {
            setUsernameStatus("invalid")
            setUsernameMessage(t("signup.username.notAllowed"))
          }
        } else {
          setUsernameStatus("ok")
          setUsernameMessage(t("signup.username.available"))
        }
      } catch {
        if (cancelled) return
        setUsernameStatus("unvalidated")
        setUsernameMessage(t("signup.username.unable"))
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const agreementsValidation = validateSignupAgreements({
      ageConfirmed,
      disclaimerAgreed,
      termsAgreed,
    })
    if (!agreementsValidation.ok) {
      setError(agreementsValidation.error)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t("signup.error.passwordMismatch"))
      setLoading(false)
      return
    }

    if (verificationMethod === "PHONE" && !phoneCodeVerified) {
      setError("Verify your phone number before creating your account.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: username.trim(),
          phone: normalizePhoneForSubmit(phone) || undefined,
          sleeperUsername: sleeperResult?.found ? sleeperResult.username : undefined,
          ageConfirmed,
          verificationMethod,
          phoneVerificationCode:
            verificationMethod === "PHONE" ? phoneCode.trim() : undefined,
          timezone,
          preferredLanguage,
          themePreference: mode,
          avatarPreset,
          avatarDataUrl: avatarPreview || undefined,
          disclaimerAgreed,
          termsAgreed,
          referralCode: refParam,
        }),
      })

      const raw = await res.text().catch(() => "")
      let data: any = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          data = { error: raw }
        }
      }

      if (!res.ok) {
        const backendError = typeof data?.error === "string" ? data.error.trim() : ""
        setError(backendError || t("common.error.tryAgain"))
        setLoading(false)
        return
      }

      // Immediately continue to the authenticated homepage after signup.
      const callbackTarget = resolvePostSignupCallbackUrl({
        redirectAfterSignup,
        verificationMethod:
          typeof data?.verificationMethod === "string"
            ? data.verificationMethod
            : null,
      })
      const signInResult = await signIn("credentials", {
        login: email.trim(),
        password,
        redirect: false,
        callbackUrl: callbackTarget,
      })

      if (!signInResult?.error) {
        await runPostSignupProfileSetup()
        if (typeof window !== "undefined") {
          window.localStorage.setItem("af_lang", preferredLanguage === "es" ? "es" : "en")
          window.localStorage.setItem("af_mode", mode)
        }
        clearUnifiedAuthDestination()
        router.push(signInResult?.url || callbackTarget)
        return
      }

      // Show success screen — user must verify email or phone before signing in
      if (typeof data.emailVerificationPrepared === "boolean") {
        setEmailVerificationPrepared(data.emailVerificationPrepared)
      }
      setSuccess(true)
    } catch {
      setError(t("common.error.tryAgain"))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const isPhone = verificationMethod === "PHONE"
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto w-fit rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold">Account created!</h1>
          {isPhone ? (
            <>
              <p className="text-sm text-white/60">
                Sign in to verify your phone number <span className="text-white/90 font-medium">{phone}</span> and complete setup.
              </p>
              <p className="text-xs text-white/40">
                You'll receive a verification code via SMS after signing in.
              </p>
            </>
          ) : (
            <>
              {emailVerificationPrepared ? (
                <>
                  <p className="text-sm text-white/60">
                    We sent a verification link to <span className="text-white/90 font-medium">{email}</span>.
                    Click the link to verify your email, then sign in.
                  </p>
                  <p className="text-xs text-white/40">
                    The link expires in 1 hour. Check your spam folder if you don't see it.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/60">
                    Your account was created, but email verification setup is temporarily unavailable.
                    Please sign in to continue and retry verification from your account.
                  </p>
                </>
              )}
            </>
          )}
          <Link
            href={loginUrlWithIntent(redirectAfterSignup)}
            className="mt-4 inline-block rounded-xl bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-gray-200 transition"
          >
            {t("signup.success.goSignIn")}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-8">
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AllFantasy.ai
          </div>
          <h1 className="mt-2 text-xl font-semibold">{t("signup.title")}</h1>
          <p className="mt-1 text-sm text-white/60">
            {t("signup.subtitle")}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-white/40">{progressPercent}%</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="flex items-start gap-2">
              <TriangleAlert className="h-5 w-5 mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1">Username *</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="your_username"
              maxLength={30}
              autoComplete="username"
              required
            />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-white/30">Letters, numbers, underscores. 3–30 characters.</span>
          {usernameStatus === "checking" && (
            <span className="text-white/40">Checking…</span>
          )}
        {usernameStatus === "ok" && (
            <span className="text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Available
            </span>
          )}
          {usernameStatus === "taken" && (
            <span className="text-amber-300 flex items-center gap-1">
              <TriangleAlert className="h-3 w-3" />
              Taken
            </span>
          )}
          {usernameStatus === "unvalidated" && (
            <span className="text-white/40 flex items-center gap-1">
              <TriangleAlert className="h-3 w-3" />
              Could not verify
            </span>
          )}
        </div>
        {usernameMessage && (
          <p className="mt-0.5 text-[11px] text-white/45">{usernameMessage}</p>
        )}
        {usernameStatus === "taken" && (
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={applyUsernameSuggestion}
              disabled={suggestingUsername}
              className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition"
            >
              {suggestingUsername ? "Finding suggestion…" : "Suggest a similar username"}
            </button>
            {usernameSuggestion && (
              <span className="text-[11px] text-emerald-300">
                Try: {usernameSuggestion}
              </span>
            )}
          </div>
        )}
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Password *</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
                placeholder="At least 8 characters, letter and number"
                autoComplete="new-password"
                minLength={8}
                required
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
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={passwordStrength.valid ? "text-emerald-400/90" : "text-white/40"}>
                {passwordStrength.label}
              </span>
              {password.length >= 8 && (
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 w-4 rounded-sm ${
                        i <= passwordStrength.level ? "bg-cyan-500" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Confirm Password *</label>
            <div className="relative">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
                placeholder="Re-enter password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={
                !confirmPassword.length
                  ? "text-white/40"
                  : passwordsMatch
                    ? "text-emerald-400/90"
                    : "text-amber-300"
              }>
                {!confirmPassword.length
                  ? "Re-enter your password to confirm."
                  : passwordsMatch
                    ? "Passwords match."
                    : "Passwords do not match."}
              </span>
              {confirmPassword.length >= 8 && (
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 w-4 rounded-sm ${
                        i <= passwordStrength.level ? "bg-cyan-500" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-white/60 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
              >
                {SIGNUP_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => {
                  setPreferredLanguageTouched(true)
                  setPreferredLanguage(e.target.value === "es" ? "es" : "en")
                }}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Profile Image</label>
            <div className="mb-3 flex items-center gap-3">
              <IdentityImageRenderer
                avatarUrl={avatarPreview}
                avatarPreset={avatarPreview ? null : avatarPreset}
                displayName={username || email}
                username={username || email}
                size="md"
              />
              <p className="text-[11px] text-white/45">
                Live preview updates instantly for presets and uploads.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs mb-2">
              <button
                type="button"
                onClick={() => {
                  setAvatarPreset(null)
                  setAvatarPreview(null)
                  setAvatarFileError(null)
                }}
                className={`rounded-lg border px-2 py-2 transition ${
                  avatarPreset == null && !avatarPreview
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 bg-black/20 text-white/70 hover:border-white/20"
                }`}
                title="Use initial"
              >
                Initial
              </button>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAvatarPreset(preset)
                    setAvatarPreview(null)
                    setAvatarFileError(null)
                  }}
                  className={`rounded-lg border px-2 py-2 transition ${
                    avatarPreset === preset && !avatarPreview
                      ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-black/20 text-white/70 hover:border-white/20"
                  }`}
                  title={AVATAR_PRESET_LABELS[preset as AvatarPresetId] ?? preset}
                >
                  {AVATAR_PRESET_LABELS[preset as AvatarPresetId] ?? preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 cursor-pointer hover:border-white/30">
                <input
                  type="file"
                  accept="image/*"
                  data-testid="signup-avatar-upload-input"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const validationError = validateAvatarUploadFile(file)
                    if (validationError) {
                      setAvatarFileError(validationError)
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      setAvatarPreview(reader.result as string)
                      setAvatarFileError(null)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <span>Upload image</span>
              </label>
              {avatarPreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-10 w-10 rounded-full border border-white/20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview(null)
                    }}
                    className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/60 hover:text-white/80"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            {avatarFileError && (
              <p className="mt-1 text-[11px] text-red-300">{avatarFileError}</p>
            )}
            {!avatarPreview && (
              <p className="mt-1 text-[11px] text-white/35">
                Choose a preset or upload your own avatar. You can change this later.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Phone {verificationMethod === "PHONE" ? "*" : "(optional)"}</label>
            <input
              value={phone}
              onChange={(e) => {
                const digits = normalizeSignupPhoneDigits(e.target.value)
                setPhone(digits)
                setPhoneCodeSent(false)
                setPhoneCode("")
                setPhoneCodeVerified(false)
                setPhoneVerificationMessage(null)
              }}
              type="tel"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
              inputMode="numeric"
            />
            {phone.length > 0 && (
              <p className="mt-0.5 text-[11px] text-white/40">Formatted: {formatSignupPhoneDisplay(phone)}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Legacy import (optional)
          </div>
          <p className="text-xs text-white/50">
            Import your fantasy history to get placed into rankings and level systems. Skip and you’ll start at level 1—you can import later in settings.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={sleeperUsername}
                onChange={(e) => {
                  setSleeperUsername(e.target.value)
                  setSleeperResult(null)
                  setLegacyImportMessage(null)
                }}
                className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition"
                placeholder="Sleeper username"
              />
              <button
                type="button"
                onClick={lookupSleeper}
                disabled={sleeperLooking || !sleeperUsername.trim()}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm hover:bg-white/15 disabled:opacity-50 transition"
              >
                {sleeperLooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LEGACY_IMPORT_PROVIDERS.filter((provider) => provider.id !== "sleeper").map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleLegacyImportProviderClick(provider.id)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition"
                >
                  {provider.label} {provider.status === "planned" ? "(soon)" : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setLegacyImportMessage(
                    "No problem. Skip import for now and start at level 1. You can import later from Settings."
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition"
              >
                Skip import for now
              </button>
            </div>
          </div>
          {legacyImportMessage && (
            <p className="text-[11px] text-white/45">{legacyImportMessage}</p>
          )}
          {sleeperResult?.found && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              {sleeperResult.avatar ? (
                <img src={sleeperResult.avatar} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-white/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-emerald-300 truncate">{sleeperResult.displayName}</div>
                <div className="text-xs text-white/40">@{sleeperResult.username}</div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            </div>
          )}
          {sleeperResult && !sleeperResult.found && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <XCircle className="h-4 w-4 shrink-0" />
              Sleeper user not found. Check the username and try again.
            </div>
          )}
        </div>


        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="text-sm font-medium text-white/80">Verification method</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => setVerificationMethod("EMAIL")}
              className={`rounded-lg border px-3 py-2 ${verificationMethod === "EMAIL" ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-black/20 text-white/70"}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setVerificationMethod("PHONE")}
              className={`rounded-lg border px-3 py-2 ${verificationMethod === "PHONE" ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-black/20 text-white/70"}`}
            >
              Phone
            </button>
          </div>
          <p className="text-xs text-white/40">
            {verificationMethod === "PHONE"
              ? "Verify your phone now with a one-time SMS code."
              : "We'll send a verification link to your email."}
          </p>
          {verificationMethod === "PHONE" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  disabled={phoneSendingCode || !phone.trim()}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15 disabled:opacity-50 transition"
                >
                  {phoneSendingCode ? "Sending..." : phoneCodeSent ? "Resend code" : "Send code"}
                </button>
                <input
                  value={phoneCode}
                  onChange={(e) => {
                    setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    setPhoneCodeVerified(false)
                  }}
                  placeholder="Enter code"
                  inputMode="numeric"
                  className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition"
                />
                <button
                  type="button"
                  onClick={handleVerifyPhoneCode}
                  disabled={phoneVerifyingCode || phoneCode.length < 4 || !phoneCodeSent}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50 transition"
                >
                  {phoneVerifyingCode ? "Verifying..." : "Verify"}
                </button>
              </div>
              {phoneVerificationMessage && (
                <p
                  className={`text-[11px] ${
                    phoneCodeVerified ? "text-emerald-300" : "text-white/45"
                  }`}
                >
                  {phoneVerificationMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-cyan-500"
            />
            <span className="text-sm text-white/80 leading-relaxed">
              I confirm that I am 18 years of age or older. *
            </span>
          </label>
          <p className="text-[11px] text-white/40">
            Optional:{" "}
            <button
              type="button"
              onClick={() => setShowDlModal(true)}
              className="text-cyan-400/80 hover:text-cyan-300 underline"
            >
              Verify with driver&apos;s license
            </button>{" "}
            for future legal protection flows.
          </p>
        </div>

        {showDlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-6 space-y-4 relative">
              <button
                type="button"
                onClick={() => setShowDlModal(false)}
                className="absolute right-4 top-4 text-white/40 hover:text-white/80 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
                  <CreditCard className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Driver&apos;s License Verification</h2>
                  <p className="text-xs text-white/50">Age verification for legal protection</p>
                </div>
              </div>
              <p className="text-sm text-white/70">
                Verifying your driver&apos;s license confirms you are 18+ and protects your account in future legal or compliance flows.
              </p>
              <p className="text-sm text-white/70">
                This step is <span className="text-white font-medium">optional</span>. You can verify your age now or complete it later in Settings.
              </p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50 space-y-1">
                <p className="font-medium text-white/70">What you&apos;ll need:</p>
                <p>• A valid government-issued driver&apos;s license</p>
                <p>• A photo or scan of the front of your license</p>
                <p>• Your date of birth must be visible</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDlModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDlModal(false)
                    window.open("/settings/verify-identity", "_blank")
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-cyan-400 hover:to-purple-500 transition"
                >
                  Verify Now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <FileText className="h-4 w-4 text-cyan-400" />
            Disclaimer
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAgreed}
              onChange={(e) => setDisclaimerAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-cyan-500"
            />
            <span className="text-sm text-white/80 leading-relaxed">
              I understand this app is for fantasy sports only—no gambling, no DFS. I agree to use it accordingly. *
              {" "}
              <Link href={getDisclaimerUrl(true, nextParam)} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                Read full Disclaimer
              </Link>
            </span>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Shield className="h-4 w-4 text-cyan-400" />
            Terms and Conditions
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-cyan-500"
            />
            <span className="text-sm text-white/80 leading-relaxed">
              I agree to the{" "}
              <Link href={getTermsUrl(true, nextParam)} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link href={getPrivacyUrl(true, nextParam)} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                Privacy Policy
              </Link>
              . *
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">or link an account</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <SocialLoginButtons callbackUrl={redirectAfterSignup} />

        <button
          type="submit"
          disabled={
            loading ||
            (usernameStatus !== "ok" && usernameStatus !== "unvalidated") ||
            !username.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            !passwordStrength.valid ||
            !ageConfirmed ||
            !agreementGateOpen ||
            (verificationMethod === "PHONE" && (!phone.trim() || !phoneCodeVerified))
          }
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            t("signup.createAccount")
          )}
        </button>

        <p className="text-center text-sm text-white/40">
          {t("signup.alreadyHaveAccount")} {" "}
          <Link href={loginUrlWithIntent(redirectAfterSignup)} className="text-white/80 hover:text-white hover:underline transition">
            {t("common.signIn")}
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

