import { describe, expect, it } from "vitest"
import { getProductFromPath, getShellVariant } from "@/lib/shell"

describe("shell route resolver", () => {
  it("uses minimal shell for public and auth helper routes", () => {
    expect(getShellVariant("/", false)).toBe("minimal")
    expect(getShellVariant("/tools-hub", false)).toBe("minimal")
    expect(getShellVariant("/sports/nfl", false)).toBe("minimal")
    expect(getShellVariant("/login", false)).toBe("minimal")
    expect(getShellVariant("/verify?method=email".split("?")[0], false)).toBe("minimal")
  })

  it("uses full shell for authenticated app routes", () => {
    expect(getShellVariant("/settings", true)).toBe("full")
    expect(getShellVariant("/dashboard", true)).toBe("full")
    expect(getShellVariant("/af-legacy", true)).toBe("full")
  })

  it("resolves product from path including legacy", () => {
    expect(getProductFromPath("/dashboard")).toBe("home")
    expect(getProductFromPath("/app/league/123")).toBe("webapp")
    expect(getProductFromPath("/leagues/123")).toBe("webapp")
    expect(getProductFromPath("/brackets")).toBe("bracket")
    expect(getProductFromPath("/legacy/players")).toBe("legacy")
  })
})
