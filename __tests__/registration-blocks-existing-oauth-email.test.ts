import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Confirms the "Facebook then email/password with the same email" scenario:
 * a credentials-based signup for an email that already belongs to an
 * OAuth-linked AppUser (e.g. created via linkSocialAccountToAppUser) is
 * blocked with a clear 409, not silently creating a second AppUser.
 * Source-assertion style, matching the existing convention in
 * login-identifier-auth.test.ts for this same route.
 */
describe("register route — blocks signup for an email that already has an account (OAuth or otherwise)", () => {
  const src = readFileSync(resolve(process.cwd(), "app/api/auth/register/route.ts"), "utf-8")

  it("looks up any existing AppUser by email (case-insensitive) before creating a new one", () => {
    expect(src).toContain('{ email: { equals: email, mode: "insensitive" } }')
  })

  it("rejects the signup with 409 when that email is already taken — never proceeds to create a duplicate AppUser", () => {
    const conflictBlock = src.match(/existing\?\.email[\s\S]{0,200}/)
    expect(conflictBlock).toBeTruthy()
    expect(conflictBlock?.[0]).toContain("An account with this email already exists.")
    expect(conflictBlock?.[0]).toContain("409")
  })
})
