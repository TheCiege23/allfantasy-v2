import { describe, expect, it } from "vitest"

import {
  getDisclaimerUrl,
  getPrivacyUrl,
  getSignupReturnUrl,
  getTermsUrl,
} from "@/lib/legal/LegalRouteResolver"

describe("Legal route resolver", () => {
  it("builds signup return URL with safe next path", () => {
    expect(getSignupReturnUrl("/brackets")).toBe("/signup?next=%2Fbrackets")
    expect(getSignupReturnUrl("https://bad.site")).toBe("/signup")
  })

  it("builds disclaimer and terms URLs with signup context", () => {
    expect(getDisclaimerUrl(true, "/dashboard")).toContain("from=signup")
    expect(getTermsUrl(true, "/dashboard")).toContain("from=signup")
    expect(getPrivacyUrl(true, "/dashboard")).toContain("from=signup")
  })
})
