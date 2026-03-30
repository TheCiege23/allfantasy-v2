import { describe, expect, it } from "vitest"

import {
  FANCRED_BOUNDARY_DISCLOSURE_VERSION,
  getFanCredBoundaryChecklist,
  getFanCredBoundaryDisclosure,
  getFanCredBoundaryDisclosureLong,
  getFanCredCommissionerSetupNotice,
  getFanCredBoundaryDisclosureShort,
} from "@/lib/legal/FanCredBoundaryDisclosure"

describe("FanCred boundary disclosure resolver", () => {
  it("returns stable short/long copy and checklist", () => {
    const short = getFanCredBoundaryDisclosureShort()
    const long = getFanCredBoundaryDisclosureLong()
    const commissionerSetup = getFanCredCommissionerSetupNotice()
    const checklist = getFanCredBoundaryChecklist()
    const payload = getFanCredBoundaryDisclosure()

    expect(short.toLowerCase()).toContain("fancred")
    expect(short.toLowerCase()).toContain("does not process")
    expect(long.toLowerCase()).toContain("no gambling")
    expect(commissionerSetup.toLowerCase()).toContain("commissioners are responsible")
    expect(checklist.length).toBeGreaterThanOrEqual(4)
    expect(payload.version).toBe(FANCRED_BOUNDARY_DISCLOSURE_VERSION)
    expect(payload.commissionerSetup).toBe(commissionerSetup)
  })
})
