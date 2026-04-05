"use client"

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react"
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
import { AuthStatusLoadingFallback } from "@/components/auth/AuthStatusShell"
import { trackLandingSignupComplete } from "@/lib/landing-analytics"
import { useGeoRestriction } from "@/lib/geo/useGeoRestriction"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  TriangleAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  X,
  CreditCard,
} from "lucide-react"

const AVATAR_PRESET_EMOJIS: Record<AvatarPresetId, string> = {
  crest: "🏆",
  bolt: "⚡",
  crown: "👑",
  trophy: "🏆",
  star: "⭐",
  flame: "🔥",
  shield: "🛡️",
  diamond: "💎",
  medal: "🥇",
  target: "🎯",
  zap: "⚡",
  comet: "☄️",
  moon: "🌙",
  sun: "☀️",
  football: "🏈",
  basketball: "🏀",
  baseball: "⚾",
  hockey: "🏒",
  soccer: "⚽",
  champion: "🤺",
}

type SignupStep = 1 | 2 | 3 | 4

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
  const [currentStep, setCurrentStep] = useState<SignupStep>(1)
  const [disclaimerScrolledToEnd, setDisclaimerScrolledToEnd] = useState(false)
  const [legacyImportMessage, setLegacyImportMessage] = useState<string | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<"EMAIL" | "PHONE">("EMAIL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [emailVerificationPrepared, setEmailVerificationPrepared] = useState(true)
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid" | "unvalidated" | "unchecked"
  >("idle")
  const [usernameMessage, setUsernameMessage] = useState<string>("")
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null)
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [suggestingUsername, setSuggestingUsername] = useState(false)
  const signupConversionTrackedRef = useRef(false)
  const autoTimezoneResolvedRef = useRef(false)
  const geo = useGeoRestriction()

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const stepLabels = useMemo(
    () => [
      { id: 1 as SignupStep, label: "Account" },
      { id: 2 as SignupStep, label: "Profile" },
      { id: 3 as SignupStep, label: "Prefs" },
      { id: 4 as SignupStep, label: "Verify" },
    ],
    []
  )
  const agreementGateOpen = useMemo(
    () => isSignupAgreementGateOpen({ disclaimerAgreed, termsAgreed }),
    [disclaimerAgreed, termsAgreed]
  )
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword.length) return false
    return password === confirmPassword
  }, [password, confirmPassword])
  const trackSignupConversion = useCallback((source: string) => {
    if (signupConversionTrackedRef.current) return
    signupConversionTrackedRef.current = true
    trackLandingSignupComplete({
      existing_user: false,
      source,
    })
  }, [])
  const progressPercent = useMemo(() => {
    const fields = [
      !!username.trim(),
      usernameStatus === "ok" || usernameStatus === "unvalidated" || usernameStatus === "unchecked",
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
  const timezoneGroups = useMemo(() => {
    return SIGNUP_TIMEZONES.reduce<Record<string, typeof SIGNUP_TIMEZONES>>((acc, item) => {
      if (!acc[item.region]) acc[item.region] = []
      acc[item.region].push(item)
      return acc
    }, {})
  }, [])

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

  useEffect(() => {
    rememberUnifiedAuthDestination(redirectAfterSignup)
  }, [redirectAfterSignup])

  useEffect(() => {
    if (preferredLanguageTouched) return
    setPreferredLanguage(language === "es" ? "es" : "en")
  }, [language, preferredLanguageTouched])

  useEffect(() => {
    if (autoTimezoneResolvedRef.current) return
    autoTimezoneResolvedRef.current = true
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (SIGNUP_TIMEZONES.some((tz) => tz.value === detected)) {
        setTimezone(detected)
      }
    } catch {
      // no-op
    }
  }, [])

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
          setUsernameMessage(t("signup.username.unable"))
          return
        }
        if (data.status === "unchecked" || (data.ok && data.available && data.reason === "unchecked")) {
          setUsernameStatus("unchecked")
          setUsernameMessage(
            "Couldn't verify availability right now. You can continue — if this name is taken, signup will tell you."
          )
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

  function validateStep(step: SignupStep): boolean {
    if (step === 1) {
      if (!username.trim()) {
        setError("Enter a username.")
        return false
      }
      if (
        usernameStatus !== "ok" &&
        usernameStatus !== "unvalidated" &&
        usernameStatus !== "unchecked"
      ) {
        setError(usernameMessage || "Choose an available username before continuing.")
        return false
      }
      if (!email.trim()) {
        setError("Enter your email address.")
        return false
      }
      if (!passwordStrength.valid) {
        setError("Create a stronger password before continuing.")
        return false
      }
      if (!passwordsMatch) {
        setError("Passwords do not match.")
        return false
      }
    }

    if (step === 3) {
      if (!timezone) {
        setError("Choose your timezone.")
        return false
      }
      if (!preferredLanguage) {
        setError("Choose your preferred language.")
        return false
      }
    }

    setError("")
    return true
  }

  function handleNextStep(step: SignupStep) {
    if (!validateStep(step)) return
    setCurrentStep(Math.min(4, step + 1) as SignupStep)
  }

  function handleBackStep(step: SignupStep) {
    setError("")
    setCurrentStep(Math.max(1, step - 1) as SignupStep)
  }

  function handleStepFormSubmit(e: React.FormEvent) {
    if (currentStep < 4) {
      e.preventDefault()
      handleNextStep(currentStep)
      return
    }
    void handleSubmit(e)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const agreementsValidation = validateSignupAgreements({
        ageConfirmed,
        disclaimerAgreed,
        termsAgreed,
      })
      if (!agreementsValidation.ok) {
        setError(agreementsValidation.error)
        return
      }

      if (password !== confirmPassword) {
        setError(t("signup.error.passwordMismatch"))
        return
      }

      if (verificationMethod === "PHONE" && !phoneCodeVerified) {
        setError("Verify your phone number before creating your account.")
        return
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: username.trim(),
          phone: normalizePhoneForSubmit(phone) || undefined,
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

      let data: Record<string, unknown> = {}
      try {
        data = (await res.json()) as Record<string, unknown>
      } catch {
        data = {}
      }

      if (!res.ok) {
        if (data.code === "DB_UNAVAILABLE") {
          setError(
            "Our servers are temporarily unavailable. Please try again in a moment."
          )
        } else {
          const backendError =
            typeof data.error === "string" ? data.error.trim() : ""
          setError(
            backendError || "Account creation failed. Please try again."
          )
        }
        return
      }

      trackSignupConversion(refParam ? "signup_form_referral" : "signup_form")

      if (typeof data.emailVerificationPrepared === "boolean") {
        setEmailVerificationPrepared(data.emailVerificationPrepared)
      }

      const apiVerificationMethod =
        typeof data.verificationMethod === "string"
          ? data.verificationMethod
          : null
      const isEmailSignup =
        verificationMethod === "EMAIL" || apiVerificationMethod === "EMAIL"

      // Email signup: the server creates the user and sends a verification link.
      // Do not await client signIn here — NextAuth's signIn() can hang on _getSession
      // or throw while parsing callback URLs, which left the UI with no navigation
      // and no success state. Show the inbox confirmation screen immediately.
      if (isEmailSignup) {
        setSuccess(true)
        return
      }

      const callbackTarget = resolvePostSignupCallbackUrl({
        redirectAfterSignup,
        verificationMethod: apiVerificationMethod,
      })

      const signInResult = await signIn("credentials", {
        login: email.trim(),
        password,
        redirect: false,
        callbackUrl: callbackTarget,
      })

      if (!signInResult?.error) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "af_lang",
            preferredLanguage === "es" ? "es" : "en"
          )
          window.localStorage.setItem("af_mode", mode)
        }
        clearUnifiedAuthDestination()
        router.push(signInResult?.url || callbackTarget)
        return
      }

      // e.g. sign-in failed after phone signup — still show success / next steps
      setSuccess(true)
    } catch (err: unknown) {
      console.error("[signup] Create account failed:", err)
      const message =
        err instanceof Error ? err.message.trim() : ""
      setError(message || t("common.error.tryAgain"))
    } finally {
      setLoading(false)
    }
  }

  if (!geo.loading && geo.isFullyBlocked) {
    const sc = geo.stateCode ?? "WA"
    return (
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <header
          className="sticky top-0 z-40 border-b"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--bg) 90%, transparent)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/af-crest.png" alt="AllFantasy crest" className="h-7 w-7 object-contain" />
              <span
                className="text-xl font-semibold tracking-[0.08em]"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AllFantasy
              </span>
            </Link>
          </div>
        </header>
        <main className="flex justify-center px-4 py-16">
          <div className="w-full max-w-lg text-center">
            <img
              src="/af-crest.png"
              alt=""
              className="mx-auto mb-6 h-16 w-16 object-contain opacity-90"
              style={{ filter: "drop-shadow(0 0 14px rgba(6,182,212,0.4))" }}
            />
            <h1 className="mb-3 text-2xl font-semibold">
              🔴 AllFantasy.ai is not available in {geo.stateName ?? sc}
            </h1>
            <p className="mb-6 text-sm leading-7" style={{ color: "var(--muted)" }}>
              State law prohibits fantasy sports services here. Account creation is not available from this location.
            </p>
            <Link
              href={`/geo-blocked?state=${encodeURIComponent(sc)}`}
              className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
              style={{
                backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                color: "var(--on-accent-bg)",
              }}
            >
              View details →
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (success) {
    const isPhone = verificationMethod === "PHONE"
    return (
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <header
          className="sticky top-0 z-40 border-b"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--bg) 90%, transparent)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/af-crest.png" alt="AllFantasy crest" className="h-7 w-7 object-contain" />
              <span
                className="text-xl font-semibold tracking-[0.08em]"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AllFantasy
              </span>
            </Link>
            <Link
              href={loginUrlWithIntent(redirectAfterSignup)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:opacity-90"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              Sign In
            </Link>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-56px)] items-start justify-center px-4 py-10">
          <div className="w-full max-w-lg">
            <div className="mb-8 text-center">
              <img
                src="/af-crest.png"
                alt="AllFantasy crest"
                className="mx-auto mb-4 h-16 w-16 object-contain"
                style={{ filter: "drop-shadow(0 0 14px rgba(6,182,212,0.4))" }}
              />
            </div>
            <div
              className="rounded-2xl border p-8 text-center shadow-2xl"
              style={{ borderColor: "var(--border)", background: "var(--panel)" }}
            >
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent-emerald-strong) 35%, transparent)",
                  background: "color-mix(in srgb, var(--accent-emerald-strong) 12%, transparent)",
                }}
              >
                <CheckCircle2 className="h-7 w-7" style={{ color: "var(--accent-emerald-strong)" }} />
              </div>
              <h1 className="mb-3 text-2xl font-semibold">Account created!</h1>
              {isPhone ? (
                <>
                  <p className="text-sm leading-7" style={{ color: "var(--muted)" }}>
                    Sign in to verify your phone number <span style={{ color: "var(--text)" }}>{phone}</span> and complete setup.
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted2)" }}>
                    You&apos;ll receive a verification code via SMS after signing in.
                  </p>
                </>
              ) : emailVerificationPrepared ? (
                <>
                  <p className="text-sm leading-7" style={{ color: "var(--muted)" }}>
                    We sent a verification link to <span style={{ color: "var(--text)" }}>{email}</span>. Click the link to verify your email, then sign in.
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted2)" }}>
                    The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-7" style={{ color: "var(--muted)" }}>
                  Your account was created, but email verification setup is temporarily unavailable. Please sign in to continue and retry verification from your account.
                </p>
              )}
              <Link
                href={loginUrlWithIntent(redirectAfterSignup)}
                className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                  color: "var(--on-accent-bg)",
                }}
              >
                {t("signup.success.goSignIn")}
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/af-crest.png" alt="AllFantasy crest" className="h-7 w-7 object-contain" />
            <span
              className="text-xl font-semibold tracking-[0.08em]"
              style={{
                backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AllFantasy
            </span>
          </Link>
          <Link
            href={loginUrlWithIntent(redirectAfterSignup)}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            Sign In
          </Link>
        </div>
      </header>

      <main
        className="flex justify-center px-4 py-8 sm:py-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, var(--accent-cyan) 8%, transparent) 0%, transparent 65%)",
        }}
      >
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <img
              src="/af-crest.png"
              alt="AllFantasy crest"
              className="mx-auto mb-4 h-16 w-16 object-contain"
              style={{ filter: "drop-shadow(0 0 14px rgba(6,182,212,0.4))" }}
            />
            <h1 className="mb-1 text-3xl font-semibold tracking-tight">Create Your Account</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              One account for the Sports App, Brackets, and AI Tools.
            </p>
          </div>

          <div className="mb-10 flex items-start justify-center">
            {stepLabels.map((step, index) => (
              <div key={step.id} className="flex items-start">
                <div className="relative flex flex-col items-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-all"
                    style={{
                      borderColor:
                        currentStep === step.id
                          ? "transparent"
                          : currentStep > step.id
                            ? "color-mix(in srgb, var(--accent-emerald-strong) 60%, transparent)"
                            : "var(--border)",
                      background:
                        currentStep === step.id
                          ? "linear-gradient(135deg, var(--accent-cyan), #3b82f6)"
                          : currentStep > step.id
                            ? "color-mix(in srgb, var(--accent-emerald-strong) 14%, transparent)"
                            : "var(--panel)",
                      color:
                        currentStep === step.id
                          ? "#fff"
                          : currentStep > step.id
                            ? "var(--accent-emerald-strong)"
                            : "var(--muted)",
                    }}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <span className="absolute top-10 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: currentStep >= step.id ? "var(--muted)" : "var(--muted2)" }}>
                    {step.label}
                  </span>
                </div>
                {index < stepLabels.length - 1 && (
                  <div
                    className="mx-1 mt-4 h-[2px] w-10 rounded-full"
                    style={{
                      background: currentStep > step.id ? "var(--accent-emerald-strong)" : "var(--border)",
                      opacity: currentStep > step.id ? 0.5 : 1,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div
              className="mb-4 rounded-2xl border p-3 text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--accent-red-strong) 40%, transparent)",
                background: "color-mix(in srgb, var(--accent-red-strong) 10%, transparent)",
                color: "color-mix(in srgb, #fff 88%, var(--accent-red-strong))",
              }}
            >
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{error}</div>
              </div>
            </div>
          )}

          {!geo.loading && geo.isPaidBlocked && geo.stateCode ? (
            <div
              className="mb-4 rounded-2xl border p-4 text-sm leading-6"
              style={{
                borderColor: "color-mix(in srgb, var(--accent-amber-strong) 35%, transparent)",
                background: "color-mix(in srgb, var(--accent-amber-strong) 10%, transparent)",
                color: "var(--muted)",
              }}
            >
              <p className="font-semibold text-amber-200">
                🟡 Important: You&apos;re in {geo.stateName ?? geo.stateCode}
              </p>
              <p className="mt-2">
                You can create a free account, but paid leagues and subscriptions are not available in your state due to state
                law.{" "}
                <Link
                  href={`/paid-restricted?state=${encodeURIComponent(geo.stateCode)}`}
                  className="font-medium text-cyan-400 underline"
                >
                  Learn more →
                </Link>
              </p>
            </div>
          ) : null}

          <form onSubmit={handleStepFormSubmit} className="space-y-4">
            <section
              className={currentStep === 1 ? "block" : "hidden"}
            >
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--accent-emerald-strong)" }}>
                  Step 1 of 4 — Account Details
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                      Username <span style={{ color: "var(--accent-cyan)" }}>*</span>
                    </label>
                    <input
                      value={username}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^A-Za-z0-9_]/g, "")
                        setUsername(v)
                        if (error === "Enter a username." && v.trim().length >= 3) {
                          setError("")
                        }
                      }}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                      style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                      placeholder="your_username"
                      maxLength={30}
                      autoComplete="username"
                      required
                    />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span style={{ color: "var(--muted2)" }}>Letters, numbers, and underscores · 3-30 characters</span>
                      {usernameStatus === "checking" && <span style={{ color: "var(--muted2)" }}>Checking...</span>}
                      {usernameStatus === "ok" && (
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-emerald-strong)" }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Available
                        </span>
                      )}
                      {usernameStatus === "taken" && (
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-amber-strong)" }}>
                          <TriangleAlert className="h-3.5 w-3.5" />
                          Taken
                        </span>
                      )}
                      {usernameStatus === "unvalidated" && (
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--muted2)" }}>
                          <TriangleAlert className="h-3.5 w-3.5" />
                          Could not verify
                        </span>
                      )}
                      {usernameStatus === "unchecked" && (
                        <span className="text-xs" style={{ color: "var(--muted2)" }}>
                          Not verified live
                        </span>
                      )}
                    </div>
                    {usernameMessage && <p className="mt-1 text-xs" style={{ color: "var(--muted2)" }}>{usernameMessage}</p>}
                    {usernameStatus === "taken" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={applyUsernameSuggestion}
                          disabled={suggestingUsername}
                          style={{ color: "var(--accent-cyan)" }}
                          className="transition hover:opacity-80 disabled:opacity-50"
                        >
                          {suggestingUsername ? "Finding suggestion..." : "Suggest a similar username"}
                        </button>
                        {usernameSuggestion && (
                          <span style={{ color: "var(--accent-emerald-strong)" }}>Try: {usernameSuggestion}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                      Email <span style={{ color: "var(--accent-cyan)" }}>*</span>
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                      style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                      Password <span style={{ color: "var(--accent-cyan)" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition"
                        style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                        style={{ color: "var(--muted2)" }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full"
                          style={{
                            background:
                              i <= passwordStrength.level
                                ? passwordStrength.level <= 1
                                  ? "var(--accent-red-strong)"
                                  : passwordStrength.level === 2
                                    ? "var(--accent-amber-strong)"
                                    : passwordStrength.level === 3
                                      ? "var(--accent-emerald-strong)"
                                      : "var(--accent-cyan)"
                                : "color-mix(in srgb, var(--border) 90%, transparent)",
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: passwordStrength.valid ? "var(--accent-emerald-strong)" : "var(--muted2)" }}>
                      {passwordStrength.label}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                      Confirm Password <span style={{ color: "var(--accent-cyan)" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition"
                        style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide confirm password" : "Show confirm password"}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                        style={{ color: "var(--muted2)" }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: !confirmPassword ? "var(--muted2)" : passwordsMatch ? "var(--accent-emerald-strong)" : "var(--accent-amber-strong)" }}>
                      {!confirmPassword ? "Re-enter your password to confirm." : passwordsMatch ? "Passwords match." : "Passwords do not match."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleNextStep(1)}
                    className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                    style={{
                      backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                      color: "var(--on-accent-bg)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className={currentStep === 2 ? "block" : "hidden"}>
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--accent-emerald-strong)" }}>
                  Step 2 of 4 — Your Profile
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Profile Avatar
                  </label>
                  <div className="mb-4 flex items-center gap-4">
                    <div
                      className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2"
                      style={{ borderColor: "color-mix(in srgb, var(--border) 100%, transparent)", background: "var(--panel2)" }}
                    >
                      <IdentityImageRenderer
                        avatarUrl={avatarPreview}
                        avatarPreset={avatarPreview ? null : avatarPreset}
                        displayName={username || email}
                        username={username || email}
                        size="md"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Pick your avatar</h3>
                      <p className="text-xs leading-5" style={{ color: "var(--muted)" }}>
                        Choose a preset or upload your own. You can always change this later.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreset(null)
                        setAvatarPreview(null)
                        setAvatarFileError(null)
                      }}
                      className="rounded-xl border px-2 py-3 text-center text-[11px] transition"
                      style={{
                        borderColor: avatarPreset == null && !avatarPreview ? "var(--accent-cyan)" : "var(--border)",
                        background: avatarPreset == null && !avatarPreview ? "color-mix(in srgb, var(--accent-cyan) 10%, transparent)" : "var(--panel2)",
                        color: avatarPreset == null && !avatarPreview ? "var(--text)" : "var(--muted)",
                      }}
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
                        className="rounded-xl border px-2 py-2 text-center transition"
                        style={{
                          borderColor: avatarPreset === preset && !avatarPreview ? "var(--accent-cyan)" : "var(--border)",
                          background: avatarPreset === preset && !avatarPreview ? "color-mix(in srgb, var(--accent-cyan) 10%, transparent)" : "var(--panel2)",
                        }}
                        title={AVATAR_PRESET_LABELS[preset]}
                      >
                        <span className="block text-lg">{AVATAR_PRESET_EMOJIS[preset as AvatarPresetId]}</span>
                        <span className="mt-1 block text-[9px]" style={{ color: "var(--muted2)" }}>
                          {AVATAR_PRESET_LABELS[preset as AvatarPresetId]}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-xs transition"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    >
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
                      Upload your own image
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => setAvatarPreview(null)}
                        className="rounded-lg border px-3 py-2 text-xs transition"
                        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        Remove upload
                      </button>
                    )}
                  </div>
                  {avatarFileError && (
                    <p className="mt-2 text-xs" style={{ color: "var(--accent-red-strong)" }}>
                      {avatarFileError}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Phone Number <span className="text-xs" style={{ color: "var(--muted2)" }}>(optional)</span>
                  </label>
                  <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2 px-4 text-sm font-medium" style={{ background: "var(--panel2)", color: "var(--muted)" }}>
                      <span>🇺🇸</span>
                      <span>+1</span>
                    </div>
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
                      className="flex-1 border-0 px-4 py-3 text-sm outline-none"
                      style={{ background: "var(--panel2)", color: "var(--text)" }}
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                      inputMode="numeric"
                    />
                  </div>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted2)" }}>
                    Used for account security. Never shared or sold.
                  </p>
                  {phone.length > 0 && (
                    <p className="mt-1 text-xs" style={{ color: "var(--muted2)" }}>
                      Formatted: {formatSignupPhoneDisplay(phone)}
                    </p>
                  )}
                </div>

                <div
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--panel2) 92%, transparent)",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4" style={{ color: "var(--accent-cyan)" }} />
                    Legacy import (optional)
                  </div>
                  <p className="mb-3 text-xs leading-5" style={{ color: "var(--muted)" }}>
                    Import your fantasy history to get placed into rankings and level systems. Skip it for now and start at level 1.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LEGACY_IMPORT_PROVIDERS.filter((provider) => provider.id !== "sleeper").map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleLegacyImportProviderClick(provider.id)}
                        className="rounded-xl border px-3 py-2 text-xs transition"
                        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
                      >
                        {provider.label} {provider.status === "planned" ? "(soon)" : ""}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLegacyImportMessage("No problem. Skip import for now and import later from Settings.")}
                      className="rounded-xl border px-3 py-2 text-xs transition"
                      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
                    >
                      Skip import for now
                    </button>
                  </div>
                  {legacyImportMessage && <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>{legacyImportMessage}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleBackStep(2)}
                    className="flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition hover:opacity-90"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextStep(2)}
                    className="flex-[1.4] rounded-xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                    style={{
                      backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                      color: "var(--on-accent-bg)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className={currentStep === 3 ? "block" : "hidden"}>
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--accent-emerald-strong)" }}>
                  Step 3 of 4 — Your Preferences
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Timezone <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                    style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                  >
                    {Object.entries(timezoneGroups).map(([region, timezones]) => (
                      <optgroup key={region} label={region}>
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div
                    className="mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent-cyan) 18%, transparent)",
                      background: "color-mix(in srgb, var(--accent-cyan) 8%, transparent)",
                      color: "color-mix(in srgb, var(--accent-cyan) 75%, #fff)",
                    }}
                  >
                    <span>🕐</span>
                    <p>
                      This sets your universal timezone across the app. Schedules, draft clocks, matchup deadlines, and notifications will all reflect your local time.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Language <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreferredLanguageTouched(true)
                        setPreferredLanguage("en")
                      }}
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: preferredLanguage === "en" ? "var(--accent-cyan)" : "var(--border)",
                        background: preferredLanguage === "en" ? "color-mix(in srgb, var(--accent-cyan) 8%, transparent)" : "var(--panel2)",
                      }}
                    >
                      <span className="text-xl">🇺🇸</span>
                      <span>
                        <strong className="block text-sm">English</strong>
                        <small style={{ color: "var(--muted)" }}>Default language</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreferredLanguageTouched(true)
                        setPreferredLanguage("es")
                      }}
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: preferredLanguage === "es" ? "var(--accent-cyan)" : "var(--border)",
                        background: preferredLanguage === "es" ? "color-mix(in srgb, var(--accent-cyan) 8%, transparent)" : "var(--panel2)",
                      }}
                    >
                      <span className="text-xl">🇪🇸</span>
                      <span>
                        <strong className="block text-sm">Español</strong>
                        <small style={{ color: "var(--muted)" }}>Spanish</small>
                      </span>
                    </button>
                  </div>
                  <div
                    className="mt-3 rounded-xl border px-3 py-2 text-xs"
                    style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 92%, transparent)", color: "var(--muted2)" }}
                  >
                    ⚡ Translations powered by DeepL API · Changes every screen and notification
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleBackStep(3)}
                    className="flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition hover:opacity-90"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextStep(3)}
                    className="flex-[1.4] rounded-xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                    style={{
                      backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                      color: "var(--on-accent-bg)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className={currentStep === 4 ? "block" : "hidden"}>
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--accent-emerald-strong)" }}>
                  Step 4 of 4 — Verify &amp; Agree
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Verification Method <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border p-1" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("EMAIL")}
                      className="rounded-lg px-3 py-2 text-sm font-medium transition"
                      style={{
                        background: verificationMethod === "EMAIL" ? "linear-gradient(135deg, var(--accent-cyan), #3b82f6)" : "transparent",
                        color: verificationMethod === "EMAIL" ? "#fff" : "var(--muted)",
                      }}
                    >
                      ✉️ Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("PHONE")}
                      className="rounded-lg px-3 py-2 text-sm font-medium transition"
                      style={{
                        background: verificationMethod === "PHONE" ? "linear-gradient(135deg, var(--accent-cyan), #3b82f6)" : "transparent",
                        color: verificationMethod === "PHONE" ? "#fff" : "var(--muted)",
                      }}
                    >
                      📱 Phone
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--muted2)" }}>
                    {verificationMethod === "PHONE"
                      ? "We'll send a one-time code to your phone number."
                      : "We'll send a verification link to your email address."}
                  </p>

                  {verificationMethod === "PHONE" && (
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleSendPhoneCode}
                          disabled={phoneSendingCode || !phone.trim()}
                          className="rounded-xl border px-4 py-3 text-xs transition disabled:opacity-50"
                          style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)" }}
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
                          className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none transition"
                          style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhoneCode}
                          disabled={phoneVerifyingCode || phoneCode.length < 4 || !phoneCodeSent}
                          className="rounded-xl border px-4 py-3 text-xs transition disabled:opacity-50"
                          style={{
                            borderColor: "color-mix(in srgb, var(--accent-cyan) 35%, transparent)",
                            background: "color-mix(in srgb, var(--accent-cyan) 10%, transparent)",
                            color: "color-mix(in srgb, #fff 84%, var(--accent-cyan))",
                          }}
                        >
                          {phoneVerifyingCode ? "Verifying..." : "Verify"}
                        </button>
                      </div>
                      {phoneVerificationMessage && (
                        <p className="text-xs" style={{ color: phoneCodeVerified ? "var(--accent-emerald-strong)" : "var(--muted2)" }}>
                          {phoneVerificationMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Age Confirmation <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
                  >
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>I am 18 years of age or older</strong>
                      <br />
                      You must be 18+ to create an AllFantasy account and use this platform.
                    </span>
                  </label>
                  <p className="mt-2 pl-7 text-xs" style={{ color: "var(--muted2)" }}>
                    Optional:{" "}
                    <button
                      type="button"
                      onClick={() => setShowDlModal(true)}
                      className="underline"
                      style={{ color: "var(--muted)" }}
                    >
                      Verify with a driver&apos;s license
                    </button>{" "}
                    for future identity-protected features.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Disclaimer <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <div
                    onScroll={(e) => {
                      const el = e.currentTarget
                      if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
                        setDisclaimerScrolledToEnd(true)
                      }
                    }}
                    className="relative mb-3 max-h-32 overflow-y-auto rounded-xl border p-4 text-sm leading-6"
                    style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)" }}
                  >
                    <strong style={{ color: "var(--text)" }}>AllFantasy.ai — Platform Disclaimer</strong>
                    <br />
                    AllFantasy.ai is a fantasy sports entertainment platform designed exclusively for recreational use. This platform does not constitute, support, or facilitate gambling, daily fantasy sports contests for real money, or wagering of any kind.
                    <br />
                    <br />
                    By creating an account, you acknowledge that AllFantasy.ai is intended solely for entertainment purposes. AI-generated analysis, trade recommendations, player projections, and related data are informational only.
                    <br />
                    <br />
                    All user data is handled in accordance with our{" "}
                    <Link
                      href={getPrivacyUrl(true, nextParam)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "var(--accent-cyan)" }}
                    >
                      Privacy Policy
                    </Link>
                    . By using this platform you agree to comply with all applicable laws in your jurisdiction.
                    <br />
                    <br />
                    <Link
                      href={getDisclaimerUrl(true, nextParam)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline"
                      style={{ color: "var(--accent-cyan)" }}
                    >
                      Read the full Disclaimer →
                    </Link>
                    {!disclaimerScrolledToEnd && (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-end justify-center rounded-b-xl pb-1 text-[10px]"
                        style={{
                          background: "linear-gradient(to top, var(--panel2), transparent)",
                          color: "var(--muted2)",
                        }}
                      >
                        Scroll to acknowledge
                      </div>
                    )}
                  </div>
                  <label
                    className="flex items-start gap-3 rounded-xl border p-4 transition"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--panel2)",
                      opacity: disclaimerScrolledToEnd || disclaimerAgreed ? 1 : 0.45,
                      pointerEvents: disclaimerScrolledToEnd || disclaimerAgreed ? "auto" : "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={disclaimerAgreed}
                      disabled={!disclaimerScrolledToEnd && !disclaimerAgreed}
                      onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>I have read and acknowledge the Disclaimer</strong>
                      <br />
                      Scroll through the above to acknowledge.
                    </span>
                  </label>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Terms &amp; Conditions <span style={{ color: "var(--accent-cyan)" }}>*</span>
                  </label>
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
                  >
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>I agree to the Terms of Service and Privacy Policy</strong>
                      <br />
                      By creating an account you accept our{" "}
                      <Link
                        href={getTermsUrl(true, nextParam)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: "var(--accent-cyan)" }}
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href={getPrivacyUrl(true, nextParam)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: "var(--accent-cyan)" }}
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  <span className="text-xs uppercase tracking-[0.08em]" style={{ color: "var(--muted2)" }}>
                    or sign up with
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                </div>

                <SocialLoginButtons callbackUrl={redirectAfterSignup} />

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleBackStep(4)}
                    className="flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition hover:opacity-90"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (usernameStatus !== "ok" &&
                        usernameStatus !== "unvalidated" &&
                        usernameStatus !== "unchecked") ||
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
                    className="flex-[1.4] rounded-xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                      color: "var(--on-accent-bg)",
                    }}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">Create Account</span>
                    )}
                  </button>
                </div>
              </div>
            </section>

            <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
              {t("signup.alreadyHaveAccount")}{" "}
              <Link href={loginUrlWithIntent(redirectAfterSignup)} className="underline" style={{ color: "var(--accent-cyan)" }}>
                {t("common.signIn")}
              </Link>
            </p>
          </form>
        </div>
      </main>

      {showDlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)" }}>
          <div className="relative w-full max-w-md rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <button
              type="button"
              onClick={() => setShowDlModal(false)}
              className="absolute right-4 top-4 transition"
              aria-label="Close"
              style={{ color: "var(--muted2)" }}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="rounded-xl border p-2"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent-cyan) 22%, transparent)",
                  background: "color-mix(in srgb, var(--accent-cyan) 10%, transparent)",
                }}
              >
                <CreditCard className="h-5 w-5" style={{ color: "var(--accent-cyan)" }} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Driver&apos;s License Verification</h2>
                <p className="text-xs" style={{ color: "var(--muted2)" }}>
                  Age verification for legal protection
                </p>
              </div>
            </div>
            <p className="mb-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
              Verifying your driver&apos;s license confirms you are 18+ and protects your account in future legal or compliance flows.
            </p>
            <p className="mb-4 text-sm leading-6" style={{ color: "var(--muted)" }}>
              This step is optional. You can verify your age now or complete it later in Settings.
            </p>
            <div className="mb-4 rounded-xl border p-4 text-xs leading-6" style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)" }}>
              <p className="font-medium" style={{ color: "var(--text)" }}>What you&apos;ll need:</p>
              <p>• A valid government-issued driver&apos;s license</p>
              <p>• A photo or scan of the front of your license</p>
              <p>• Your date of birth must be visible</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDlModal(false)}
                className="flex-1 rounded-xl border px-4 py-3 text-sm transition hover:opacity-90"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDlModal(false)
                  window.open("/settings/verify-identity", "_blank")
                }}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), #3b82f6)",
                  color: "var(--on-accent-bg)",
                }}
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthStatusLoadingFallback />}>
      <SignupContent />
    </Suspense>
  )
}

