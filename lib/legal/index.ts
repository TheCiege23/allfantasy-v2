/**
 * Legal page routing and signup-return URLs.
 */
export {
  getSignupReturnUrl,
  getDisclaimerUrl,
  getTermsUrl,
  getPrivacyUrl,
  getDataDeletionUrl,
} from "./legal-route-resolver"
export {
  getSignupReturnUrl as resolveSignupReturnUrl,
  getDisclaimerUrl as resolveDisclaimerUrl,
  getTermsUrl as resolveTermsUrl,
  getPrivacyUrl as resolvePrivacyUrl,
  getDataDeletionUrl as resolveDataDeletionUrl,
} from "./LegalRouteResolver"
export {
  validateAgreementAcceptance,
  type AgreementAcceptanceInput,
} from "./AgreementAcceptanceService"
export { isSignupAgreementGateOpen } from "./SignupAgreementGate"
export {
  DISCLAIMER_PAGE_TITLE,
  DISCLAIMER_PAGE_SECTIONS,
} from "./DisclaimerPageService"
export { TERMS_PAGE_TITLE, TERMS_POLICY_CHECKLIST } from "./TermsPageService"
