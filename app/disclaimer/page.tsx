import Link from "next/link"
import LegalPageShell, { LEGAL_LAST_UPDATED } from "@/components/legal/LegalPageShell"
import { getSignupReturnUrl } from "@/lib/legal/legal-route-resolver"

interface DisclaimerPageProps {
  searchParams?: Promise<{ from?: string; next?: string }> | { from?: string; next?: string }
}

export const metadata = {
  title: "Disclaimer | AllFantasy",
  description: "AllFantasy fantasy sports disclaimer - no gambling, no DFS, entertainment and management tools only",
}

export default async function DisclaimerPage({ searchParams }: DisclaimerPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {}
  const fromSignup = params.from === "signup"
  const next = typeof params.next === "string" ? params.next : undefined
  const signupHref = getSignupReturnUrl(next)

  return (
    <LegalPageShell
      title="Disclaimer"
      description={`Last updated: ${LEGAL_LAST_UPDATED}`}
      backHref={fromSignup ? signupHref : "/"}
      backLabel={fromSignup ? "Back to Sign Up" : "Back to Home"}
    >
      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Purpose of the Platform</h2>
        <p>
          AllFantasy is a platform for <strong>fantasy sports entertainment and management tools</strong>.
          We provide analysis, rankings, trade evaluations, and related features to help you manage and enjoy
          fantasy leagues. The platform is not a gambling product and does not offer real-money betting or
          wagering of any kind.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">No Gambling or DFS</h2>
        <p>
          <strong>No gambling is being offered by AllFantasy.</strong> We do not facilitate, operate, or
          endorse any form of gambling. We do not offer daily fantasy sports (DFS), paid pick’em, or any
          product where you pay to enter for a chance to win money based on the outcome of real-world events.
          Our tools are intended for use in traditional, season-long fantasy leagues and related entertainment only.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">League Dues and Payments</h2>
        <p>
          AllFantasy does not collect, hold, or distribute league dues or entry fees. Any payments between
          league members (e.g., dues, payouts) are solely between users and/or handled by third-party
          services. We are not responsible for those transactions. If we provide links or references to
          third-party payment or league-management services, their terms and policies apply.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">AI Tools and Guidance</h2>
        <p>
          Our AI tools (including trade analyzers, rankings, and recommendations) provide <strong>guidance
          and informational content only</strong>. They do not guarantee outcomes, wins, or specific results.
          Past performance and AI analysis are not predictors of future results. You are solely responsible
          for your fantasy decisions; use of our tools is at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Your Responsibility and Local Laws</h2>
        <p>
          You are responsible for complying with all applicable local, state, and national laws. Fantasy
          sports and related activities may be restricted or prohibited in some jurisdictions. It is your
          obligation to determine that your use of AllFantasy is legal where you are. We do not provide
          legal advice.
        </p>
      </section>

      <section>
        <p className="text-white/60 text-sm">
          By using AllFantasy, you acknowledge that you have read and understood this Disclaimer. For our
          full rules and policies, see our <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">Privacy Policy</Link>.
        </p>
      </section>
    </LegalPageShell>
  )
}
