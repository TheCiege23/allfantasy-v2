/**
 * Verifies that buildLanguageInitScript accepts all 5 supported locales
 * and rejects unsupported ones — fixing the regression where zh/fil/vi
 * fell back to "en" because only "en" and "es" were whitelisted.
 */
import { describe, expect, it } from "vitest"
import { buildLanguageInitScript } from "@/lib/preferences/HtmlPreferenceSync"

function runInitScript(script: string, storedLang: string | null): string {
  const mockStorage: Record<string, string> = {}
  if (storedLang !== null) mockStorage["af_lang"] = storedLang

  const attrs: Record<string, string> = {}
  const mockDoc = {
    documentElement: {
      setAttribute: (k: string, v: string) => { attrs[k] = v },
    },
  }

  const fn = new Function("localStorage", "document", script)
  fn(
    { getItem: (k: string) => mockStorage[k] ?? null },
    mockDoc,
  )
  return attrs["data-lang"] ?? ""
}

describe("buildLanguageInitScript — language validation", () => {
  it("keeps 'en' when stored", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "en")).toBe("en")
  })

  it("keeps 'es' when stored", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "es")).toBe("es")
  })

  it("keeps 'zh' when stored (was incorrectly rejected before fix)", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "zh")).toBe("zh")
  })

  it("keeps 'fil' when stored (was incorrectly rejected before fix)", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "fil")).toBe("fil")
  })

  it("keeps 'vi' when stored (was incorrectly rejected before fix)", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "vi")).toBe("vi")
  })

  it("falls back to 'en' for an unsupported stored value", () => {
    expect(runInitScript(buildLanguageInitScript("en"), "xx")).toBe("en")
    expect(runInitScript(buildLanguageInitScript("en"), "fr")).toBe("en")
    expect(runInitScript(buildLanguageInitScript("en"), "de")).toBe("en")
  })

  it("uses serverLang as fallback when localStorage is empty", () => {
    expect(runInitScript(buildLanguageInitScript("es"), null)).toBe("es")
    expect(runInitScript(buildLanguageInitScript("zh"), null)).toBe("zh")
  })

  it("stored language wins over serverLang", () => {
    expect(runInitScript(buildLanguageInitScript("es"), "zh")).toBe("zh")
    expect(runInitScript(buildLanguageInitScript("zh"), "vi")).toBe("vi")
  })
})
