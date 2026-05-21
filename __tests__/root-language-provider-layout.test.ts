import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const layoutSource = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8")

describe("root language provider layout", () => {
  it("wraps the theme provider and global controls with LanguageProviderClient", () => {
    const languageStart = layoutSource.indexOf("<LanguageProviderClient>")
    const themeStart = layoutSource.indexOf("<ThemeProvider>")
    const modeToggle = layoutSource.indexOf("<GlobalModeToggle />")
    const themeEnd = layoutSource.indexOf("</ThemeProvider>")
    const languageEnd = layoutSource.indexOf("</LanguageProviderClient>")

    expect(languageStart).toBeGreaterThan(-1)
    expect(themeStart).toBeGreaterThan(languageStart)
    expect(modeToggle).toBeGreaterThan(themeStart)
    expect(themeEnd).toBeGreaterThan(modeToggle)
    expect(languageEnd).toBeGreaterThan(themeEnd)
  })
})
