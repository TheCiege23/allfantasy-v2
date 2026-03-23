import {
  validateAgreementAcceptance,
  type AgreementAcceptanceInput,
} from "@/lib/legal/AgreementAcceptanceService"

export function isSignupAgreementGateOpen(input: AgreementAcceptanceInput): boolean {
  return validateAgreementAcceptance(input).ok
}
