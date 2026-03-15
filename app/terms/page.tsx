import Link from "next/link"
import LegalPageShell, { LEGAL_LAST_UPDATED } from "@/components/legal/LegalPageShell"
import { getSignupReturnUrl } from "@/lib/legal/legal-route-resolver"

interface TermsPageProps {
  searchParams?: Promise<{ from?: string; next?: string }> | { from?: string; next?: string }
}

export const metadata = {
  title: "Terms of Service | AllFantasy",
  description: "Terms of Service for AllFantasy - AI-powered fantasy sports platform",
}

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {}
  const fromSignup = params.from === "signup"
  const next = typeof params.next === "string" ? params.next : undefined
  const signupHref = getSignupReturnUrl(next)

  return (
    <LegalPageShell
      title="Terms of Service"
      description={`Last updated: ${LEGAL_LAST_UPDATED}`}
      backHref={fromSignup ? signupHref : "/"}
      backLabel={fromSignup ? "Back to Sign Up" : "Back to Home"}
    >
      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
        <p>
          By accessing or using AllFantasy (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
          If you do not agree, do not use the Service. We may modify these Terms; continued use after changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">2. Description of Service</h2>
        <p>
          AllFantasy provides AI-powered fantasy sports analysis, trade evaluations, waiver recommendations, league rankings,
          career statistics, and related tools. The Service may integrate with third-party fantasy platforms (e.g., Sleeper, Yahoo,
          MFL, Fantrax) to access league data where you have authorized or made it available.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">3. Platform Rules</h2>
        <p>
          You must use the Service in accordance with these Terms and any in-product rules we publish. You may not use the Service
          to violate any law, infringe others&apos; rights, or abuse other users or the platform. We may enforce these rules through
          warnings, suspension, or termination of access.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">4. Anti-Collusion and Anti-Cheating</h2>
        <p>
          Collusion (e.g., secret agreements between managers to distort league outcomes or disadvantage others) and cheating
          (e.g., manipulating data, using bots or automation to gain an unfair advantage, or circumventing platform rules) are
          prohibited. We may remove or restrict accounts involved in such behavior and reserve the right to report activity to
          league commissioners or third-party platforms where appropriate.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Attempt to gain unauthorized access to any system, account, or data</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Scrape, crawl, or automate access in a way that violates our policies or overburdens our systems</li>
          <li>Resell or commercially exploit the Service without our written permission</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">6. AI Use Policy</h2>
        <p>
          Our AI tools are provided for informational and entertainment purposes. AI-generated content (recommendations, rankings,
          analysis) is not guaranteed to be accurate or complete and should not be the sole basis for decisions. You assume the
          risk of relying on such content. You may not use the Service to generate content for resale or to train external AI
          models without our permission.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">7. No Manipulation or Exploits</h2>
        <p>
          You may not manipulate rankings, scores, or other platform data, or exploit bugs or design flaws to gain an unfair
          advantage. If you discover a vulnerability, you agree to report it to us and not to exploit it.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">8. Paid vs. Free Leagues; Subscriptions and Tokens</h2>
        <p>
          AllFantasy may offer free and paid features (e.g., subscriptions, in-app tokens, or premium tiers). Paid features are
          subject to the pricing and payment terms disclosed at the time of purchase. We do not run your fantasy leagues or handle
          league dues; any money you pay to third parties (e.g., league dues, payouts) is between you and them. Refunds for our
          own subscriptions or tokens are governed by our then-current refund policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">9. Account Responsibilities</h2>
        <p>You agree to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
          <li>Provide accurate information and be at least 18 years old (or the age of majority in your jurisdiction) where required</li>
          <li>Keep your account credentials confidential</li>
          <li>Notify us of any unauthorized use of your account</li>
          <li>Accept responsibility for all activity under your account</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">10. Content Moderation</h2>
        <p>
          We may remove or refuse content (including user-generated content) that violates these Terms or that we deem harmful,
          misleading, or otherwise inappropriate. We are not obligated to host or display any content and may modify or discontinue
          features without liability.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">11. Dispute Handling</h2>
        <p>
          Disputes between users (e.g., league or trade disputes) are between those users; we are not obligated to resolve them.
          For disputes with us, you agree to seek resolution in good faith (e.g., by contacting legal@allfantasy.ai) before
          pursuing formal legal action. These Terms and any dispute are governed by the laws of the United States; you consent to
          the jurisdiction of courts of competent jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">12. Legacy Import and External Data</h2>
        <p>
          Where we offer legacy or historical import (e.g., from Sleeper, Yahoo, ESPN, MFL, Fleaflicker, Fantrax), you are
          responsible for ensuring you have the right to provide that data and that your use complies with those platforms&apos;
          terms. We use such data to provide rankings, levels, and related features. We do not guarantee the accuracy or
          completeness of imported data and are not responsible for how third-party platforms provide or change their data.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">13. Intellectual Property</h2>
        <p>
          AllFantasy content, features, and functionality are our property or our licensors&apos; and are protected by
          intellectual property laws. You may not copy, modify, distribute, or create derivative works without our prior written
          consent.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">14. User Content</h2>
        <p>
          By submitting content to AllFantasy (e.g., feedback, league ideas), you grant us a non-exclusive, worldwide,
          royalty-free license to use, reproduce, modify, and distribute such content in connection with the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">15. Third-Party Platforms</h2>
        <p>
          The Service may integrate with third-party fantasy or other platforms. Your use of those platforms is subject to their
          terms and policies. We are not responsible for their practices or content.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">16. Disclaimer of Warranties</h2>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-sm">
          <p className="font-bold mb-2">THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.</p>
          <p>
            AllFantasy disclaims all warranties, express or implied. We do not warrant that the Service will be uninterrupted,
            secure, or error-free.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">17. Limitation of Liability</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm">
          IN NO EVENT SHALL ALLFANTASY, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, OR USE) RESULTING FROM YOUR ACCESS TO
          OR USE OF—OR INABILITY TO ACCESS OR USE—THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </div>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">18. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless AllFantasy and its officers, directors, employees, and agents from
          and against any claims, liabilities, damages, losses, or expenses arising out of your violation of these Terms or your
          use of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">19. No Gambling or Betting</h2>
        <p>
          AllFantasy is not a gambling or betting service. We do not facilitate or endorse real-money gambling or DFS. Our
          analysis is for entertainment and informational purposes in the context of recreational fantasy sports only.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">20. Termination</h2>
        <p>
          We may terminate or suspend your access immediately, without prior notice, for any reason, including breach of these
          Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">21. Platform Updates and Changes</h2>
        <p>
          We may change, suspend, or discontinue features or the Service at any time. We will use reasonable efforts to notify
          users of material changes (e.g., via the Service or email). Your continued use after changes constitutes acceptance.
          We are not liable for any change or discontinuation.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">22. Severability and Entire Agreement</h2>
        <p>
          If any provision is held unenforceable, the remaining provisions remain in effect. These Terms, together with our
          <Link href="/disclaimer" className="text-cyan-400 hover:text-cyan-300 mx-1">Disclaimer</Link> and
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 mx-1">Privacy Policy</Link>, constitute the entire
          agreement between you and AllFantasy regarding the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">23. Contact</h2>
        <p>
          Questions about these Terms? Contact us at:
        </p>
        <div className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="font-semibold text-white">AllFantasy</p>
          <p className="text-white/60">Email: legal@allfantasy.ai</p>
        </div>
      </section>
    </LegalPageShell>
  )
}
