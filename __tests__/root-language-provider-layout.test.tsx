import { render, screen } from "@testing-library/react"
import { SessionProvider } from "next-auth/react"
import { describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { AppProviders } from "@/components/providers/AppProviders"
import { ModeToggle } from "@/components/theme/ModeToggle"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

const layoutSource = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8")
const appProvidersSource = fs.readFileSync(path.join(process.cwd(), "components", "providers", "AppProviders.tsx"), "utf8")

describe("root language provider layout", () => {
  it("wraps global controls and children with AppProviders", () => {
    const providersStart = layoutSource.indexOf("<AppProviders>")
    const modeToggle = layoutSource.indexOf("<GlobalModeToggle />")
    const providersEnd = layoutSource.indexOf("</AppProviders>")

    expect(providersStart).toBeGreaterThan(-1)
    expect(modeToggle).toBeGreaterThan(providersStart)
    expect(providersEnd).toBeGreaterThan(modeToggle)
  })

  it("keeps LanguageProviderClient outside ThemeProvider inside AppProviders", () => {
    const languageStart = appProvidersSource.indexOf("<LanguageProviderClient>")
    const themeStart = appProvidersSource.indexOf("<ThemeProvider>")
    const themeEnd = appProvidersSource.indexOf("</ThemeProvider>")
    const languageEnd = appProvidersSource.indexOf("</LanguageProviderClient>")

    expect(languageStart).toBeGreaterThan(-1)
    expect(themeStart).toBeGreaterThan(languageStart)
    expect(themeEnd).toBeGreaterThan(themeStart)
    expect(languageEnd).toBeGreaterThan(themeEnd)
  })

  it("renders ModeToggle inside AppProviders without a missing language context", () => {
    render(
      <SessionProvider session={null}>
        <AppProviders>
          <ModeToggle />
        </AppProviders>
      </SessionProvider>
    )

    expect(screen.getByRole("button", { name: /current theme/i })).toBeInTheDocument()
  })
})
