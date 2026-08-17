import nextDynamic from "next/dynamic";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ClientOnlyAuthPage } from "@/components/auth/ClientOnlyAuthPage";
import { AuthV4 } from "@/components/core-app/screens/AuthV4";



export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <ClientOnlyAuthPage>
      <AuthPageShell>
        /*
 * ⚠ CUTOVER: AuthV4 replaced the previous LoginContent here.
 *
 * The auth WORKFLOW is unchanged and was NOT rewired — AuthV4 calls the same
 * next-auth `signIn('credentials')` and the same POST /api/auth/register that
 * LoginContent already used, and resolves provider availability through the same
 * isSocialProviderEnabled. It is a new presentation of the existing flow, verified
 * end to end in a browser: duplicate email surfaces the server's own error, a new
 * account is created and auto-signed-in, a wrong password returns the shared
 * message, and a correct one lands on /dashboard.
 *
 * The shells (AuthPageShell / ClientOnlyAuthPage) are kept because they carry the
 * page chrome and the client-only boundary. One-line rollback: restore the
 * LoginContent import and element.
 */
        <AuthV4 mode="signin" />
      </AuthPageShell>
    </ClientOnlyAuthPage>
  );
}
