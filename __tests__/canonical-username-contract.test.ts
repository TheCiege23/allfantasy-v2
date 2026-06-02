import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { validateUsername } from "@/lib/auth/username-validation"
import { resolveProfilePresentation } from "@/lib/user-settings/ProfilePresentationResolver"

const require = createRequire(import.meta.url)
const { likelyDisplayLoginMismatch } = require("../scripts/repair-username-display-mismatch.cjs") as {
  likelyDisplayLoginMismatch: (user: {
    id: string
    email?: string | null
    username: string
    displayName?: string | null
    profile?: { displayName?: string | null } | null
  }) => null | {
    userId: string
    currentUsername: string
    displayedUsername: string
    suggestedUsername: string
  }
}

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf-8")
}

describe("canonical username policy", () => {
  it("preserves TheCiege26 casing while exposing a lowercase lookup key", () => {
    const result = validateUsername("TheCiege26")
    expect(result).toEqual({
      ok: true,
      normalized: "TheCiege26",
      lookup: "theciege26",
    })
  })

  it("allows login-style case variants as valid username input", () => {
    expect(validateUsername("TheCiege26")).toMatchObject({ ok: true, normalized: "TheCiege26" })
    expect(validateUsername("theciege26")).toMatchObject({ ok: true, normalized: "theciege26" })
    expect(validateUsername("THECIEGE26")).toMatchObject({ ok: true, normalized: "THECIEGE26" })
  })

  it("keeps profile presentation aligned to the canonical login username", () => {
    const presentation = resolveProfilePresentation({
      userId: "u1",
      username: "TheCiege26_1",
      email: "founder@example.com",
      displayName: "TheCiege26",
      profileImageUrl: null,
      avatarPreset: null,
      preferredLanguage: "en",
      timezone: null,
      deviceTimezoneLastSeen: null,
      deviceTimeLastSeen: null,
      timeMismatchFlag: false,
      lastTimeContextAt: null,
      themePreference: null,
      phone: null,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
      ageConfirmedAt: null,
      verificationMethod: null,
      hasPassword: true,
      profileComplete: true,
      sleeperUsername: null,
      sleeperUserId: null,
      sleeperLinkedAt: null,
      discordUserId: null,
      discordUsername: null,
      discordEmail: null,
      discordAvatar: null,
      discordGuildId: null,
      discordConnectedAt: null,
      bio: null,
      preferredSports: null,
      notificationPreferences: null,
      onboardingStep: null,
      onboardingCompletedAt: null,
      sessionIdleTimeoutMinutes: null,
      rankTier: null,
      xpLevel: null,
      xpTotal: null,
      rankCalculatedAt: null,
      careerWins: null,
      careerChampionships: null,
      careerSeasonsPlayed: null,
      careerLeaguesPlayed: null,
      chimmyTtsVoiceId: null,
      updatedAt: new Date(),
      settings: null,
    } as any)

    expect(presentation?.displayName).toBe("TheCiege26_1")
    expect(presentation?.username).toBe("TheCiege26_1")
  })

  it("identifies hidden suffixed username/display mismatches for repair", () => {
    const mismatch = likelyDisplayLoginMismatch({
      id: "u1",
      email: "founder@example.com",
      username: "theciege26_1",
      displayName: "TheCiege26",
      profile: { displayName: "TheCiege26" },
    })

    expect(mismatch).toMatchObject({
      userId: "u1",
      currentUsername: "theciege26_1",
      displayedUsername: "TheCiege26",
      suggestedUsername: "TheCiege26",
    })
  })

  it("uses case-insensitive uniqueness in signup, settings, OAuth, and mentions/DMs", () => {
    expect(read("app/api/auth/register/route.ts")).toContain('mode: "insensitive"')
    expect(read("app/api/auth/check-username/route.ts")).toContain('mode: "insensitive"')
    expect(read("lib/user-settings/UserProfileService.ts")).toContain('mode: "insensitive"')
    expect(read("lib/auth/SocialAccountLinkingService.ts")).toContain('mode: "insensitive"')
    expect(read("app/api/shared/chat/dm/start/route.ts")).toContain('mode: "insensitive"')
    expect(read("app/api/shared/chat/threads/route.ts")).toContain("mode: 'insensitive'")
  })
})
