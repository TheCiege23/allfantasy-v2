import { render, screen } from "@testing-library/react"
import { SessionProvider } from "next-auth/react"
import { describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { AppProviders } from "@/components/providers/AppProviders"
import LanguageToggle from "@/components/i18n/LanguageToggle"
import { ModeToggle } from "@/components/theme/ModeToggle"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

const layoutSource = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8")
const appProvidersSource = fs.readFileSync(path.join(process.cwd(), "components", "providers", "AppProviders.tsx"), "utf8")
const signupPageSource = fs.readFileSync(path.join(process.cwd(), "app", "signup", "page.tsx"), "utf8")
const loginPageSource = fs.readFileSync(path.join(process.cwd(), "app", "login", "page.tsx"), "utf8")
const loginContentSource = fs.readFileSync(path.join(process.cwd(), "app", "login", "LoginContent.tsx"), "utf8")
const signinPageSource = fs.readFileSync(path.join(process.cwd(), "app", "signin", "page.tsx"), "utf8")
const languageProviderSource = fs.readFileSync(path.join(process.cwd(), "components", "i18n", "LanguageProviderClient.tsx"), "utf8")
const modeToggleSource = fs.readFileSync(path.join(process.cwd(), "components", "theme", "ModeToggle.tsx"), "utf8")
const languageToggleSource = fs.readFileSync(path.join(process.cwd(), "components", "i18n", "LanguageToggle.tsx"), "utf8")
const uiDocumentSources = [
  ["app/layout.tsx", layoutSource],
  ["components/providers/AppProviders.tsx", appProvidersSource],
  ["app/signup/page.tsx", signupPageSource],
  ["app/login/page.tsx", loginPageSource],
  ["app/signin/page.tsx", signinPageSource],
] as const

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

  it("renders language-dependent toggles without LanguageProviderClient", () => {
    render(
      <SessionProvider session={null}>
        <ThemeProvider>
          <ModeToggle />
        </ThemeProvider>
        <LanguageToggle />
      </SessionProvider>
    )

    expect(screen.getByRole("combobox", { name: /language/i })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /current theme/i }).length).toBeGreaterThan(0)
  })

  it("uses optional language only for auth and global toggle fallbacks", () => {
    expect(languageProviderSource).toContain("export function useOptionalLanguage")
    expect(signupPageSource).toContain("useOptionalLanguage")
    expect(loginContentSource).toContain("useOptionalLanguage")
    expect(modeToggleSource).toContain("useOptionalLanguage")
    expect(languageToggleSource).toContain("useOptionalLanguage")
  })

  it("does not nest full app providers inside auth pages", () => {
    expect(signupPageSource).not.toContain("<AppProviders>")
    expect(loginPageSource).not.toContain("<AppProviders>")
  })

  it("redirects /signin to the canonical login route", () => {
    expect(signinPageSource).toContain('redirect("/login")')
  })

  it("keeps document tags confined to the root layout", () => {
    for (const [file, source] of uiDocumentSources) {
      const hasDocumentTag = /<\/?html|<\/?body/.test(source)
      expect(hasDocumentTag, `${file} should not render html/body outside root layout`).toBe(
        file === "app/layout.tsx"
      )
    }
  })
})
