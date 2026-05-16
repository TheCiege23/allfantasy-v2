import { describe, expect, it } from "vitest"
import { normalizeWorldCupBracketTab, worldCupTabToQueryValue } from "@/lib/world-cup/worldCupTabs"

describe("World Cup bracket tab routing", () => {
  it("keeps Group Stage, Knockouts, and Review query tabs stable on initial render", () => {
    expect(normalizeWorldCupBracketTab("group-stage")).toBe("group-stage")
    expect(normalizeWorldCupBracketTab("knockouts")).toBe("picks")
    expect(normalizeWorldCupBracketTab("review")).toBe("review")
  })

  it("maps legacy picks to Knockouts without breaking direct picks support", () => {
    expect(normalizeWorldCupBracketTab("picks")).toBe("picks")
    expect(worldCupTabToQueryValue("picks")).toBe("knockouts")
    expect(worldCupTabToQueryValue("group-stage")).toBe("group-stage")
    expect(worldCupTabToQueryValue("review")).toBe("review")
  })
})
