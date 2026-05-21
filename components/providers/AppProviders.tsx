"use client"

import type { ReactNode } from "react"
import type { Session } from "next-auth"
import { LanguageProviderClient } from "@/components/i18n/LanguageProviderClient"
import SessionAppProvider from "@/components/providers/SessionAppProvider"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

export function AppProviders({
  children,
  session,
}: {
  children: ReactNode
  session?: Session | null
}) {
  return (
    <SessionAppProvider session={session}>
      <LanguageProviderClient>
        <ThemeProvider>{children}</ThemeProvider>
      </LanguageProviderClient>
    </SessionAppProvider>
  )
}
