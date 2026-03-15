import Link from "next/link"
import type { ReactNode } from "react"

const LEGAL_LAST_UPDATED = "March 2026"

interface LegalPageShellProps {
  title: string
  description?: string
  children: ReactNode
  backHref?: string
  backLabel?: string
}

export default function LegalPageShell({
  title,
  description,
  children,
  backHref = "/",
  backLabel = "Back to Home",
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 md:py-16">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 sm:mb-8 transition"
        >
          ← {backLabel}
        </Link>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>
        {description && <p className="text-white/50 mb-6 sm:mb-8">{description}</p>}

        <div className="space-y-8 text-white/85 leading-relaxed text-sm sm:text-base">
          {children}
        </div>

        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <Link href="/disclaimer" className="text-cyan-400 hover:text-cyan-300 transition">
            Disclaimer
          </Link>
          <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 transition">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition">
            Privacy Policy
          </Link>
          <Link href="/" className="text-white/60 hover:text-white transition">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export { LEGAL_LAST_UPDATED }
