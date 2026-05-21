"use client"

import type { ReactNode } from "react"
import { LanguageProviderClient } from "@/components/i18n/LanguageProviderClient"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProviderClient>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProviderClient>
  )
}
