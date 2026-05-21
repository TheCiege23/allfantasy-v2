import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { AppProviders } from "@/components/providers/AppProviders"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import { AuthRouteGlobalChrome } from "@/components/auth/AuthRouteGlobalChrome"
import LanguageToggle from "@/components/i18n/LanguageToggle"
import { ModeToggle } from "@/components/theme/ModeToggle"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  signOut: vi.fn(),
  useSession: () => undefined,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

const layoutSource = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8")
const appProvidersSource = fs.readFileSync(path.join(process.cwd(), "components", "providers", "AppProviders.tsx"), "utf8")
const signupPageSource = fs.readFileSync(path.join(process.cwd(), "app", "signup", "page.tsx"), "utf8")
const loginPageSource = fs.readFileSync(path.join(process.cwd(), "app", "login", "page.tsx"), "utf8")
const loginContentSource = fs.readFileSync(path.join(process.cwd(), "app", "login", "LoginContent.tsx"), "utf8")
const signinPageSource = fs.readFileSync(path.join(process.cwd(), "app", "signin", "page.tsx"), "utf8")
const authPageShellSource = fs.readFileSync(path.join(process.cwd(), "components", "auth", "AuthPageShell.tsx"), "utf8")
const authRouteGlobalChromeSource = fs.readFileSync(path.join(process.cwd(), "components", "auth", "AuthRouteGlobalChrome.tsx"), "utf8")
const globalAppShellSource = fs.readFileSync(path.join(process.cwd(), "components", "shared", "GlobalAppShell.tsx"), "utf8")
const languageProviderSource = fs.readFileSync(path.join(process.cwd(), "components", "i18n", "LanguageProviderClient.tsx"), "utf8")
const middlewareSource = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8")
const optionalSessionSource = fs.readFileSync(path.join(process.cwd(), "components", "auth", "useOptionalSession.ts"), "utf8")
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
    const providersStart = layoutSource.indexOf("<AppProviders")
    const chromeGate = layoutSource.indexOf("<AuthRouteGlobalChrome />")
    const providersEnd = layoutSource.indexOf("</AppProviders>")

    expect(providersStart).toBeGreaterThan(-1)
    expect(chromeGate).toBeGreaterThan(providersStart)
    expect(providersEnd).toBeGreaterThan(chromeGate)
  })

  it("skips client-heavy root chrome on auth routes", () => {
    expect(layoutSource).toContain("<AuthRouteGlobalChrome />")
    expect(authRouteGlobalChromeSource).toContain("usePathname")
    expect(authRouteGlobalChromeSource).toContain('"/login"')
    expect(authRouteGlobalChromeSource).toContain('"/signup"')
    expect(authRouteGlobalChromeSource).toContain('"/signin"')
    expect(authRouteGlobalChromeSource).toContain("return null")
    expect(authRouteGlobalChromeSource).toContain("<GlobalModeToggle />")
    expect(authRouteGlobalChromeSource).toContain("<Toaster")
    expect(authRouteGlobalChromeSource).toContain("<BackToTop />")
  })

  it("skips root document-mutating scripts on auth routes", () => {
    expect(layoutSource).toContain("headers()")
    expect(layoutSource).toContain("isAuthRoutePath")
    expect(layoutSource).toContain("!isAuthRoute")
    expect(layoutSource).toContain("{!isAuthRoute && (")
    expect(layoutSource).toContain("af-register-sw")
    expect(layoutSource).toContain("af-unregister-sw")
    expect(layoutSource).toContain("af-init-mode")
    expect(layoutSource).toContain("af-init-lang")
    expect(layoutSource).toContain("connect.facebook.net")
    expect(layoutSource).toContain('id="fb-root"')
    expect(layoutSource.indexOf("!isAuthRoute && (")).toBeLessThan(
      layoutSource.indexOf('id="af-register-sw"')
    )
    expect(layoutSource.indexOf("!isAuthRoute && (")).toBeLessThan(
      layoutSource.indexOf('id="af-init-mode"')
    )
    expect(layoutSource.indexOf("metaPixelId && !isAuthRoute")).toBeLessThan(
      layoutSource.indexOf('id="meta-pixel"')
    )
  })

  it("bypasses AppProviders and session preload on auth routes", () => {
    expect(layoutSource).toContain("if (!isAuthRoute)")
    expect(layoutSource.indexOf("if (!isAuthRoute)")).toBeLessThan(
      layoutSource.indexOf("getServerSession")
    )
    expect(layoutSource).toContain("isAuthRoute ? (")
    expect(layoutSource).toContain("<ErrorBoundaryClient>{children}</ErrorBoundaryClient>")
    expect(layoutSource.indexOf("isAuthRoute ? (")).toBeLessThan(
      layoutSource.indexOf("<AppProviders")
    )
  })

  it("keeps LanguageProviderClient outside ThemeProvider inside AppProviders", () => {
    const sessionStart = appProvidersSource.indexOf("<SessionAppProvider")
    const languageStart = appProvidersSource.indexOf("<LanguageProviderClient>")
    const themeStart = appProvidersSource.indexOf("<ThemeProvider>")
    const themeEnd = appProvidersSource.indexOf("</ThemeProvider>")
    const languageEnd = appProvidersSource.indexOf("</LanguageProviderClient>")
    const sessionEnd = appProvidersSource.indexOf("</SessionAppProvider>")

    expect(sessionStart).toBeGreaterThan(-1)
    expect(languageStart).toBeGreaterThan(-1)
    expect(languageStart).toBeGreaterThan(sessionStart)
    expect(themeStart).toBeGreaterThan(languageStart)
    expect(themeEnd).toBeGreaterThan(themeStart)
    expect(languageEnd).toBeGreaterThan(themeEnd)
    expect(sessionEnd).toBeGreaterThan(languageEnd)
  })

  it("renders ModeToggle inside AppProviders without a missing language context", () => {
    render(
      <AppProviders>
        <ModeToggle />
      </AppProviders>
    )

    expect(screen.getByRole("button", { name: /current theme/i })).toBeInTheDocument()
  })

  it("renders language-dependent toggles without LanguageProviderClient", () => {
    render(
      <>
        <ThemeProvider>
          <ModeToggle />
        </ThemeProvider>
        <LanguageToggle />
      </>
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

  it("uses optional session fallbacks for global auth chrome", () => {
    expect(optionalSessionSource).toContain("export function useOptionalSession")
    expect(optionalSessionSource).toContain('status: "unauthenticated"')
    expect(modeToggleSource).toContain("useOptionalSession")
    expect(languageToggleSource).toContain("useOptionalSession")
  })

  it("does not nest full app providers inside auth pages", () => {
    expect(signupPageSource).not.toContain("<AppProviders>")
    expect(loginPageSource).not.toContain("<AppProviders>")
  })

  it("uses the minimal auth page shell for login and signup", () => {
    expect(authPageShellSource).toContain('data-auth-page-shell="true"')
    expect(authPageShellSource).not.toContain("GlobalShellClient")
    expect(authPageShellSource).not.toContain("AppProviders")
    expect(authPageShellSource).not.toContain("LanguageToggle")
    expect(authPageShellSource).not.toContain("ModeToggle")
    expect(authPageShellSource).not.toContain("ServiceWorkerRegistration")
    expect(authPageShellSource).not.toContain("useSession")
    expect(authPageShellSource).not.toContain("document.")
    expect(loginPageSource).toContain("<AuthPageShell>")
    expect(signupPageSource).toContain("<AuthPageShell>")
  })

  it("keeps auth pages free of global chrome, toggles, and PWA install imports", () => {
    for (const [file, source] of [
      ["app/login/page.tsx", loginPageSource],
      ["app/login/LoginContent.tsx", loginContentSource],
      ["app/signup/page.tsx", signupPageSource],
    ] as const) {
      expect(source, `${file} should not import GlobalShellClient`).not.toContain("GlobalShellClient")
      expect(source, `${file} should not import ModeToggle`).not.toContain("ModeToggle")
      expect(source, `${file} should not import LanguageToggle`).not.toContain("LanguageToggle")
      expect(source, `${file} should not import PWA install logic`).not.toMatch(
        /ServiceWorkerRegistration|beforeinstallprompt|navigator\.serviceWorker|PWAClient|Install/
      )
    }
    expect(signupPageSource).not.toContain("useThemeMode")
  })

  it("renders AuthPageShell without provider context", () => {
    render(
      <AuthPageShell>
        <div>Auth child</div>
      </AuthPageShell>
    )

    expect(screen.getByText("Auth child")).toBeInTheDocument()
  })

  it("renders global chrome on non-auth routes", () => {
    render(
      <AppProviders>
        <AuthRouteGlobalChrome />
      </AppProviders>
    )

    expect(screen.getByRole("button", { name: /current theme/i })).toBeInTheDocument()
  })

  it("bypasses global shell chrome for auth routes", () => {
    expect(middlewareSource).toContain('"x-af-pathname"')
    expect(globalAppShellSource).toContain('"/login"')
    expect(globalAppShellSource).toContain('"/signup"')
    expect(globalAppShellSource).toContain('"/signin"')
    expect(globalAppShellSource).toContain("isAuthShellBypassPath")
    expect(globalAppShellSource.indexOf("return <>{children}</>")).toBeLessThan(
      globalAppShellSource.indexOf("<GlobalShellClient")
    )
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
