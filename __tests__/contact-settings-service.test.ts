import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getContactSummary, updateContactEmail } from "@/lib/security-settings/ContactSettingsService"

describe("contact settings service", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("derives contact summary from settings profile", () => {
    const summary = getContactSummary({
      userId: "u1",
      username: "tester",
      email: "user@example.com",
      displayName: "Tester",
      profileImageUrl: null,
      avatarPreset: null,
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      phone: "+15551234567",
      phoneVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      ageConfirmedAt: null,
      verificationMethod: "EMAIL",
      hasPassword: true,
      profileComplete: true,
      sleeperUsername: null,
      sleeperLinkedAt: null,
      bio: null,
      preferredSports: ["NFL"],
      notificationPreferences: null,
      onboardingStep: null,
      onboardingCompletedAt: null,
      settings: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    expect(summary).toEqual({
      email: "user@example.com",
      emailVerified: true,
      phone: "+15551234567",
      phoneVerified: true,
    })
  })

  it("rejects invalid email before calling API", async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await updateContactEmail({
      email: "invalid",
      currentPassword: "Password123!",
      returnTo: "/settings",
    })

    expect(result.ok).toBe(false)
    expect(result.invalidEmail).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("maps successful email update response", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, verificationEmailSent: true }),
    })) as unknown as typeof fetch

    const result = await updateContactEmail({
      email: "new@example.com",
      currentPassword: "Password123!",
      returnTo: "/settings?tab=security",
    })

    expect(result).toEqual({
      ok: true,
      verificationEmailSent: true,
    })
  })

  it("maps password-required and duplicate-email errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "CURRENT_PASSWORD_REQUIRED" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "EMAIL_ALREADY_IN_USE" }),
      })

    globalThis.fetch = fetchMock as unknown as typeof fetch

    const missingPassword = await updateContactEmail({
      email: "new@example.com",
      returnTo: "/settings",
    })
    const duplicateEmail = await updateContactEmail({
      email: "new@example.com",
      currentPassword: "Password123!",
      returnTo: "/settings",
    })

    expect(missingPassword.ok).toBe(false)
    expect(missingPassword.requiresPassword).toBe(true)

    expect(duplicateEmail.ok).toBe(false)
    expect(duplicateEmail.duplicateEmail).toBe(true)
  })
})
