import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Bracket Pools | AllFantasy",
  description:
    "Create or join bracket pools — FIFA World Cup, NBA/NHL playoffs, and more. AI analysis, live leaderboards, invite codes. Free forever.",
}

/**
 * MINIMAL HARDENED LAYOUT — restored by emergency Phase 6 hardening.
 *
 * The full layout (with ProductShellLayout + BracketsPageHeader + dynamic
 * SEO + next-auth header) is preserved in `_layout-full.tsx.bak` and will
 * be restored once root cause of the Railway /brackets HTTP 500 is
 * identified and fixed. Do NOT add chrome, providers, or third-party
 * scripts to this file until production is stable.
 */
export default function BracketsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
