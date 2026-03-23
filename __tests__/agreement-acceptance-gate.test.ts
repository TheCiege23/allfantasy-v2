import { describe, expect, it } from "vitest"

import { validateAgreementAcceptance } from "@/lib/legal/AgreementAcceptanceService"
import { isSignupAgreementGateOpen } from "@/lib/legal/SignupAgreementGate"

describe("Agreement acceptance gate", () => {
  it("requires disclaimer and terms acceptance", () => {
    expect(
      validateAgreementAcceptance({
        disclaimerAgreed: false,
        termsAgreed: true,
      })
    ).toEqual({
      ok: false,
      error: "You must agree to the fantasy sports disclaimer (no gambling/DFS).",
    })

    expect(
      validateAgreementAcceptance({
        disclaimerAgreed: true,
        termsAgreed: false,
      })
    ).toEqual({
      ok: false,
      error: "You must agree to the Terms and Conditions.",
    })
  })

  it("opens gate only when both are accepted", () => {
    expect(
      isSignupAgreementGateOpen({
        disclaimerAgreed: true,
        termsAgreed: true,
      })
    ).toBe(true)
    expect(
      isSignupAgreementGateOpen({
        disclaimerAgreed: true,
        termsAgreed: false,
      })
    ).toBe(false)
  })
})
