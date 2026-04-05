"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react"
import { isAllowedSessionIdleMinutes } from "@/lib/auth/session-idle-constants"
import {
  getSecurityStatus,
  getContactSummary,
  updateContactEmail,
  startPhoneVerification,
  checkPhoneCode,
  sendVerificationEmail,
  changePassword,
} from "@/lib/security-settings"
import type { SettingsProfile } from "./settings-types"

export function SecuritySettingsSection({
  profile,
  onRefetch,
}: {
  profile: SettingsProfile
  onRefetch: () => void
}) {
  const status = getSecurityStatus(profile)
  const contact = getContactSummary(profile)

  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<"sent" | "already" | "error" | "rate_limited" | null>(null)
  const [emailEdit, setEmailEdit] = useState(false)
  const [emailInput, setEmailInput] = useState(profile?.email ?? "")
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("")
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaveResult, setEmailSaveResult] = useState<
    "saved" | "saved_no_email" | "invalid" | "duplicate" | "wrong_password" | "password_required" | "error" | null
  >(null)

  const [phoneEdit, setPhoneEdit] = useState(false)
  const [phoneInput, setPhoneInput] = useState(profile?.phone ?? "")
  const [phoneSending, setPhoneSending] = useState(false)
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [phoneResult, setPhoneResult] = useState<"verified" | "invalid" | "error" | "rate_limited" | null>(null)
  const [phoneErrorMessage, setPhoneErrorMessage] = useState<string | null>(null)

  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [idleSaving, setIdleSaving] = useState(false)
  const [idleError, setIdleError] = useState<string | null>(null)

  useEffect(() => {
    if (!emailEdit) {
      setEmailInput(profile?.email ?? "")
      setEmailCurrentPassword("")
      setShowEmailCurrentPassword(false)
    }
  }, [profile?.email, emailEdit])

  useEffect(() => {
    if (!phoneEdit) {
      setPhoneInput(profile?.phone ?? "")
    }
  }, [profile?.phone, phoneEdit])

  const handleStartEmailEdit = () => {
    setEmailEdit(true)
    setEmailResult(null)
    setEmailSaveResult(null)
    setEmailInput(profile?.email ?? "")
    setEmailCurrentPassword("")
  }

  const handleCancelEmailEdit = () => {
    setEmailEdit(false)
    setEmailInput(profile?.email ?? "")
    setEmailCurrentPassword("")
    setShowEmailCurrentPassword(false)
    setEmailSaveResult(null)
  }

  const handleSaveEmail = async () => {
    setEmailSaveResult(null)
    const nextEmail = emailInput.trim().toLowerCase()
    if (!nextEmail || !nextEmail.includes("@")) {
      setEmailSaveResult("invalid")
      return
    }
    setEmailSaving(true)
    const result = await updateContactEmail({
      email: nextEmail,
      currentPassword: status.hasPassword ? emailCurrentPassword : undefined,
      returnTo: "/settings?tab=security",
    })
    setEmailSaving(false)

    if (result.ok) {
      setEmailEdit(false)
      setEmailCurrentPassword("")
      setEmailSaveResult(result.verificationEmailSent ? "saved" : "saved_no_email")
      onRefetch()
      return
    }

    if (result.invalidEmail) setEmailSaveResult("invalid")
    else if (result.duplicateEmail) setEmailSaveResult("duplicate")
    else if (result.wrongPassword) setEmailSaveResult("wrong_password")
    else if (result.requiresPassword) setEmailSaveResult("password_required")
    else setEmailSaveResult("error")
  }

  const handleSendVerificationEmail = async () => {
    setEmailSending(true)
    setEmailResult(null)
    setEmailSaveResult(null)
    const result = await sendVerificationEmail("/settings?tab=security")
    setEmailSending(false)
    if (result.ok && result.alreadyVerified) setEmailResult("already")
    else if (result.ok) setEmailResult("sent")
    else if (result.rateLimited) setEmailResult("rate_limited")
    else setEmailResult("error")
  }

  const resolvePhoneErrorMessage = (error?: string) => {
    switch (error) {
      case "PHONE_VERIFY_NOT_CONFIGURED":
        return "Phone verification is not configured on the server yet."
      case "INVALID_PHONE":
        return "Please enter a valid phone number with country code."
      case "UNAUTHENTICATED":
        return "Please sign in again and retry."
      case "SEND_FAILED":
        return "The verification text could not be sent right now."
      case "VERIFY_FAILED":
        return "The verification check failed right now."
      default:
        return error || "Verification failed. Try again."
    }
  }

  const handleSendPhoneCode = async () => {
    const trimmed = phoneInput.replace(/[\s()-]/g, "").trim()
    if (!trimmed) return
    setPhoneSending(true)
    setPhoneResult(null)
    setPhoneErrorMessage(null)
    const result = await startPhoneVerification(trimmed.startsWith("+") ? trimmed : `+1${trimmed}`)
    setPhoneSending(false)
    if (result.ok) setPhoneCodeSent(true)
    else if (result.rateLimited) setPhoneResult("rate_limited")
    else {
      setPhoneResult("error")
      setPhoneErrorMessage(resolvePhoneErrorMessage(result.error))
    }
  }

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim()) return
    const trimmed = phoneInput.replace(/[\s()-]/g, "").trim()
    const phone = trimmed.startsWith("+") ? trimmed : `+1${trimmed}`
    setPhoneVerifying(true)
    setPhoneResult(null)
    setPhoneErrorMessage(null)
    const result = await checkPhoneCode(phone, phoneCode)
    setPhoneVerifying(false)
    if (result.ok) {
      setPhoneResult("verified")
      setPhoneErrorMessage(null)
      setPhoneCodeSent(false)
      setPhoneCode("")
      setPhoneEdit(false)
      onRefetch()
    } else if (result.error === "INVALID_CODE") setPhoneResult("invalid")
    else if (result.error === "RATE_LIMITED") setPhoneResult("rate_limited")
    else {
      setPhoneResult("error")
      setPhoneErrorMessage(resolvePhoneErrorMessage(result.error))
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.")
      return
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Password must be at least 8 characters with letters and numbers.")
      return
    }
    setPasswordChanging(true)
    const result = await changePassword(currentPassword, newPassword)
    setPasswordChanging(false)
    if (result.ok) {
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        setPasswordFormOpen(false)
        setPasswordSuccess(false)
      }, 2000)
    } else {
      setPasswordError(result.message ?? result.error ?? "Failed to change password.")
    }
  }

  const cancelPhoneEdit = () => {
    setPhoneEdit(false)
    setPhoneInput(profile?.phone ?? "")
    setPhoneCodeSent(false)
    setPhoneCode("")
    setPhoneResult(null)
    setPhoneErrorMessage(null)
  }

  async function saveSessionIdle(value: string) {
    setIdleSaving(true)
    setIdleError(null)
    const minutes =
      value === "" || value === "off" ? null : Number.parseInt(value, 10)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdleTimeoutMinutes: minutes,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setIdleError(data?.error ?? "Failed to save session setting")
        return
      }
      if (typeof window !== "undefined") {
        if (minutes == null || minutes === 0) {
          localStorage.removeItem("af_session_idle_minutes")
        } else {
          localStorage.setItem("af_session_idle_minutes", String(minutes))
        }
        window.dispatchEvent(new Event("af-session-idle-updated"))
      }
      onRefetch()
    } finally {
      setIdleSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Security</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Verification, password, and contact methods.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Two-factor authentication</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Authenticator or SMS 2FA is not enabled yet. When it ships, you will be able to turn it on here.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Active sessions</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          You are signed in on this browser. Use Sign out below or from Account to end this session.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Auto sign-out when idle
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              After no keyboard, mouse, or touch activity for the chosen time, you will be signed out and returned to the home page. Turn off to stay signed in until the normal session expiry.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="session-idle-select" className="sr-only">
            Idle session timeout
          </label>
          <select
            id="session-idle-select"
            data-testid="settings-session-idle-timeout"
            disabled={idleSaving}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
            value={
              profile?.sessionIdleTimeoutMinutes != null &&
              isAllowedSessionIdleMinutes(profile.sessionIdleTimeoutMinutes)
                ? String(profile.sessionIdleTimeoutMinutes)
                : "off"
            }
            onChange={(e) => void saveSessionIdle(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="240">4 hours</option>
            <option value="720">12 hours</option>
            <option value="1440">24 hours</option>
          </select>
          {idleSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
          ) : null}
        </div>
        {idleError ? (
          <p className="text-xs text-red-500">{idleError}</p>
        ) : null}
      </div>

      {/* Security status card */}
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Account security status</p>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--muted)" }}>
          <li className="flex items-center gap-2">
            {status.emailVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Email: {status.emailVerified ? "Verified" : "Not verified"}
          </li>
          <li className="flex items-center gap-2">
            {!status.phoneSet ? <XCircle className="h-4 w-4 text-amber-500" /> : status.phoneVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Phone: {!status.phoneSet ? "Not set" : status.phoneVerified ? "Verified" : "Not verified"}
          </li>
          <li className="flex items-center gap-2">
            {status.hasPassword ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
            Password: {status.hasPassword ? "Set" : "Not set"}
          </li>
          {status.recoveryOptions.length > 0 && (
            <li className="flex items-center gap-2">
              <span style={{ color: "var(--muted)" }}>Recovery: {status.recoveryOptions.join(", ")}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Email */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Mail className="h-4 w-4" />
              Email
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{contact.email ?? "—"}</p>
          </div>
          {!emailEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartEmailEdit}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Edit email
              </button>
              {!contact.emailVerified && contact.email && (
                <button
                  type="button"
                  disabled={emailSending}
                  onClick={handleSendVerificationEmail}
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {emailSending ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Sending…</> : "Send verification"}
                </button>
              )}
              <Link
                href="/verify?method=email&returnTo=%2Fsettings%3Ftab%3Dsecurity"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Verify / change
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCancelEmailEdit}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              Cancel
            </button>
          )}
        </div>
        {emailEdit && (
          <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>New email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
              />
            </div>
            {status.hasPassword && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Current password</label>
                <div className="relative">
                  <input
                    type={showEmailCurrentPassword ? "text" : "password"}
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailCurrentPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    aria-label={showEmailCurrentPassword ? "Hide" : "Show"}
                    style={{ color: "var(--muted)" }}
                  >
                    {showEmailCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                  Required to protect your account when changing email.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={emailSaving || !emailInput.trim() || (status.hasPassword && !emailCurrentPassword.trim())}
                onClick={handleSaveEmail}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
              >
                {emailSaving ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Saving…</> : "Save email"}
              </button>
              <button
                type="button"
                onClick={handleCancelEmailEdit}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {emailResult === "sent" && <p className="text-xs text-emerald-600">Check your email for the verification link.</p>}
        {emailResult === "already" && <p className="text-xs" style={{ color: "var(--muted)" }}>Email is already verified.</p>}
        {emailResult === "rate_limited" && <p className="text-xs text-amber-600">Too many attempts. Please try again later.</p>}
        {emailResult === "error" && <p className="text-xs text-red-600">Failed to send. Try again.</p>}
        {emailSaveResult === "saved" && <p className="text-xs text-emerald-600">Email updated. Check your inbox to verify the new address.</p>}
        {emailSaveResult === "saved_no_email" && <p className="text-xs text-amber-600">Email updated, but verification email could not be sent right now.</p>}
        {emailSaveResult === "invalid" && <p className="text-xs text-red-600">Enter a valid email address.</p>}
        {emailSaveResult === "duplicate" && <p className="text-xs text-red-600">That email is already in use by another account.</p>}
        {emailSaveResult === "wrong_password" && <p className="text-xs text-red-600">Current password is incorrect.</p>}
        {emailSaveResult === "password_required" && <p className="text-xs text-red-600">Current password is required to change email.</p>}
        {emailSaveResult === "error" && <p className="text-xs text-red-600">Could not update email. Please try again.</p>}
      </div>

      {/* Phone */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Phone className="h-4 w-4" />
              Phone
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {profile?.phone ? (profile.phoneVerifiedAt ? "Verified" : "Not verified") : "Not set"}
              {profile?.phone && ` · ${profile.phone}`}
            </p>
          </div>
          {!phoneEdit ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhoneEdit(true)}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Update phone
              </button>
              <Link
                href="/verify?method=phone&returnTo=%2Fsettings%3Ftab%3Dsecurity"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Verify / add
              </Link>
            </div>
          ) : (
            <button type="button" onClick={cancelPhoneEdit} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              Cancel
            </button>
          )}
        </div>
        {phoneEdit && (
          <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Phone number</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
              />
            </div>
            {!phoneCodeSent ? (
              <button
                type="button"
                disabled={phoneSending || !phoneInput.trim()}
                onClick={handleSendPhoneCode}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {phoneSending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Send verification code
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={phoneVerifying || !phoneCode.trim()}
                    onClick={handleVerifyPhoneCode}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
                  >
                    {phoneVerifying ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Verifying…</> : "Verify"}
                  </button>
                  <button
                    type="button"
                    disabled={phoneSending}
                    onClick={handleSendPhoneCode}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {phoneSending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Resend code
                  </button>
                </div>
                {phoneResult === "verified" && <p className="text-xs text-emerald-600">Phone verified. Updating…</p>}
                {phoneResult === "invalid" && <p className="text-xs text-red-600">Invalid code. Try again.</p>}
                {phoneResult === "rate_limited" && <p className="text-xs text-amber-600">Too many attempts. Wait a few minutes.</p>}
                {phoneResult === "error" && <p className="text-xs text-red-600">{phoneErrorMessage ?? "Verification failed. Try again."}</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Lock className="h-4 w-4" />
            Password
          </p>
          {!passwordFormOpen ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPasswordFormOpen(true)}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Change password
              </button>
              <Link
                href="/forgot-password"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Forgot password
              </Link>
            </div>
          ) : (
            <button type="button" onClick={() => { setPasswordFormOpen(false); setPasswordError(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              Cancel
            </button>
          )}
        </div>
        {passwordFormOpen && (
          <form onSubmit={handleChangePassword} className="pt-2 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showCurrent ? "Hide" : "Show"}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>New password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showNew ? "Hide" : "Show"}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted2)" }}>Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }} aria-label={showConfirm ? "Hide" : "Show"}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-emerald-600">Password updated successfully.</p>}
            <button
              type="submit"
              disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--accent-cyan)", color: "var(--text)" }}
            >
              {passwordChanging ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Saving…</> : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
