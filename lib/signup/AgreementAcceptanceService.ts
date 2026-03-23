import { validateAgreementAcceptance } from "@/lib/legal/AgreementAcceptanceService"

export function validateSignupAgreements(input: {
  ageConfirmed: boolean
  disclaimerAgreed: boolean
  termsAgreed: boolean
}): { ok: true } | { ok: false; error: string } {
  if (!input.ageConfirmed) {
    return { ok: false, error: "You must confirm you are 18 or older." }
  }
  const agreementResult = validateAgreementAcceptance({
    disclaimerAgreed: input.disclaimerAgreed,
    termsAgreed: input.termsAgreed,
  })
  if (!agreementResult.ok) {
    return { ok: false, error: agreementResult.error ?? "Agreement required." }
  }
  return { ok: true }
}
