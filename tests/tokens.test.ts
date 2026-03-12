import { describe, it, expect } from "vitest"
import { isStrongPassword } from "@/lib/tokens"

describe("isStrongPassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(isStrongPassword("a1b2c3")).toBe(false)
  })

  it("rejects passwords without a letter", () => {
    expect(isStrongPassword("12345678")).toBe(false)
  })

  it("rejects passwords without a number", () => {
    expect(isStrongPassword("abcdefgh")).toBe(false)
  })

  it("accepts passwords with at least one letter and one number and length >= 8", () => {
    expect(isStrongPassword("abc12345")).toBe(true)
    expect(isStrongPassword("Password1")).toBe(true)
  })
})

