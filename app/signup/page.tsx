"use client"

import { Suspense, useState, useCallback, useEffect, useMemo } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { getRedirectAfterSignup, loginUrlWithIntent } from "@/lib/auth/auth-intent-resolver"
import { getDisclaimerUrl, getTermsUrl, getPrivacyUrl } from "@/lib/legal/legal-route-resolver"
import { SIGNUP_TIMEZONES, DEFAULT_SIGNUP_TIMEZONE } from "@/lib/signup/timezones"
import { AVATAR_PRESETS, AVATAR_PRESET_LABELS, type AvatarPresetId } from "@/lib/signup/avatar-presets"
import { getPasswordStrength } from "@/lib/signup/password-strength"
import SocialLoginButtons from "@/components/auth/SocialLoginButtons"
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
} from "lucide-react"

interface SleeperResult {
  found: boolean
  username?: string
  userId?: string
  displayName?: string
  avatar?: string | null
}

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get("next") ?? undefined
  const redirectAfterSignup = getRedirectAfterSignup(nextParam)

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [timezone, setTimezone] = useState(DEFAULT_SIGNUP_TIMEZONE)
  const [preferredLanguage, setPreferredLanguage] = useState("en")
  const [avatarPreset, setAvatarPreset] = useState<string>("crest")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFileError, setAvatarFileError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [sleeperUsername, setSleeperUsername] = useState("")
  const [sleeperResult, setSleeperResult] = useState<SleeperResult | null>(null)
  const [sleeperLooking, setSleeperLooking] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState<"EMAIL" | "PHONE">("EMAIL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle")
  const [usernameMessage, setUsernameMessage] = useState<string>("")
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null)
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [suggestingUsername, setSuggestingUsername] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const progressPercent = useMemo(() => {
    const fields = [
      !!username.trim(),
      usernameStatus === "ok",
      !!email.trim(),
      !!password && passwordStrength.valid,
      password === confirmPassword && confirmPassword.length >= 8,
      !!timezone,
      !!preferredLanguage,
      ageConfirmed,
      termsAgreed,
      disclaimerAgreed,
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [username, usernameStatus, email, password, passwordStrength.valid, confirmPassword, timezone, preferredLanguage, ageConfirmed, termsAgreed, disclaimerAgreed])

  const lookupSleeper = useCallback(async () => {
    if (!sleeperUsername.trim() || sleeperLooking) return
    setSleeperLooking(true)
    setSleeperResult(null)
    try {
      const res = await fetch(`/api/auth/sleeper-lookup?username=${encodeURIComponent(sleeperUsername.trim())}`)
      const data = await res.json()
      setSleeperResult(data)
    } catch {
      setSleeperResult({ found: false })
    } finally {
      setSleeperLooking(false)
    }
  }, [sleeperUsername, sleeperLooking])

  const applyUsernameSuggestion = useCallback(async () => {
    const base = username.trim().toLowerCase() || "user"
    setSuggestingUsername(true)
    setUsernameSuggestion(null)
    try {
      const res = await fetch(`/api/auth/suggest-username?base=${encodeURIComponent(base)}`)
      const data = await res.json()
      if (data?.suggestion) {
        setUsername(data.suggestion)
        setUsernameSuggestion(data.suggestion)
      }
    } finally {
      setSuggestingUsername(false)
    }
  }, [username])

  // Debounced username availability + profanity check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("idle")
      setUsernameMessage("")
      return
    }
    const normalized = username.trim().toLowerCase()
    if (normalized.length < 3 || normalized.length > 30) {
      setUsernameStatus("invalid")
      setUsernameMessage("Username must be 3–30 characters.")
      return
    }
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      setUsernameStatus("invalid")
      setUsernameMessage("Use only letters, numbers, and underscores.")
      return
    }

    let cancelled = false
    setUsernameStatus("checking")
    setUsernameMessage("Checking availability…")

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalized)}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) {
          setUsernameStatus("invalid")
          setUsernameMessage("Unable to validate username right now.")
          return
        }
        if (!data.available) {
          if (data.reason === "taken") {
            setUsernameStatus("taken")
            setUsernameMessage("This username is already taken.")
          } else if (data.reason === "profanity") {
            setUsernameStatus("invalid")
            setUsernameMessage("Please choose a different username.")
          } else if (data.reason === "length") {
            setUsernameStatus("invalid")
            setUsernameMessage("Username must be 3–30 characters.")
          } else if (data.reason === "charset") {
            setUsernameStatus("invalid")
            setUsernameMessage("Use only letters, numbers, and underscores.")
          } else {
            setUsernameStatus("invalid")
            setUsernameMessage("This username is not allowed.")
          }
        } else {
          setUsernameStatus("ok")
          setUsernameMessage("Username is available.")
        }
      } catch {
        if (cancelled) return
        setUsernameStatus("invalid")
        setUsernameMessage("Unable to validate username right now.")
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
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
          displayName: displayName.trim() || username.trim(),
          phone: phone.trim() || undefined,
          sleeperUsername: sleeperResult?.found ? sleeperResult.username : undefined,
          ageConfirmed,
          verificationMethod,
          timezone,
          preferredLanguage,
          avatarPreset,
          avatarDataUrl: avatarPreview || undefined,
          disclaimerAgreed,
          termsAgreed,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        setLoading(false)
        return
      }

      const loginRes = await signIn("credentials", {
        redirect: false,
        login: email.trim(),
        password,
      })

      if (!loginRes?.ok) {
        setSuccess(true)
        setLoading(false)
        return
      }

      if (data.verificationMethod === "PHONE") {
        router.push(`/verify?error=VERIFICATION_REQUIRED&method=phone&returnTo=${encodeURIComponent(redirectAfterSignup)}`)
      } else {
        router.push(redirectAfterSignup)
      }
    } catch {
      setError("Something went wrong. Please try again.")
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
              <p className="text-sm text-white/60">
                We sent a verification link to <span className="text-white/90 font-medium">{email}</span>.
                Click the link to verify your email, then sign in.
              </p>
              <p className="text-xs text-white/40">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
            </>
          )}
          <Link
            href={loginUrlWithIntent(redirectAfterSignup)}
            className="mt-4 inline-block rounded-xl bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-gray-200 transition"
          >
            Go to Sign In
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
          <h1 className="mt-2 text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-white/60">
            One account for Sports App, Bracket, and Legacy.
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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
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
        </div>
        {usernameMessage && (
          <p className="mt-0.5 text-[11px] text-white/45">{usernameMessage}</p>
        )}
        {usernameStatus === "taken" && (
          <button
            type="button"
            onClick={applyUsernameSuggestion}
            disabled={suggestingUsername}
            className="mt-1.5 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition"
          >
            {suggestingUsername ? "Finding suggestion…" : "Suggest a similar username"}
          </button>
        )}
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="Your name (defaults to username)"
              autoComplete="name"
            />
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
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="Re-enter password"
              autoComplete="new-password"
              minLength={8}
              required
            />
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
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Profile Image</label>
            <div className="grid grid-cols-5 gap-2 text-xs mb-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAvatarPreset(preset)
                    setAvatarPreview(null)
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
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      setAvatarFileError("Max file size is 2MB.")
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      setAvatarPreview(reader.result as string)
                      setAvatarPreset("custom")
                      setAvatarFileError(null)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <span>Upload image</span>
              </label>
              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-10 w-10 rounded-full border border-white/20 object-cover"
                />
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
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
            />
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
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2 flex-1 min-w-0">
              <input
                value={sleeperUsername}
                onChange={(e) => {
                  setSleeperUsername(e.target.value)
                  setSleeperResult(null)
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
            {["Yahoo", "ESPN", "MFL", "Fleaflicker", "Fantrax"].map((name) => (
              <button
                key={name}
                type="button"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50 cursor-default"
                title="Coming soon"
              >
                {name} (soon)
              </button>
            ))}
          </div>
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
              ? "We'll send a code to your phone number after you sign in."
              : "We'll send a verification link to your email."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-white/80">
              I confirm that I am 18 years of age or older. *
            </span>
          </label>
          <p className="text-[11px] text-white/40">
            Optional:{" "}
            <button type="button" className="text-cyan-400/80 hover:text-cyan-300 underline" onClick={() => {}}>
              Verify with driver&apos;s license
            </button>{" "}
            for future legal protection flows.
          </p>
        </div>

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
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-white/80">
              I understand this app is for fantasy sports only—no gambling, no DFS. I agree to use it accordingly. *
              <Link href={getDisclaimerUrl(true, nextParam)} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-400 hover:text-cyan-300 underline">
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
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-white/80">
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
            usernameStatus !== "ok" ||
            !username.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            !passwordStrength.valid ||
            !ageConfirmed ||
            !termsAgreed ||
            !disclaimerAgreed ||
            (verificationMethod === "PHONE" && !phone.trim())
          }
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>

        <p className="text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href={loginUrlWithIntent(redirectAfterSignup)} className="text-white/80 hover:text-white hover:underline transition">
            Sign in
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

