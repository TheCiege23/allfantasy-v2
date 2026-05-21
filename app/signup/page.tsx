import nextDynamic from "next/dynamic";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ClientOnlyAuthPage } from "@/components/auth/ClientOnlyAuthPage";

const SignupContent = nextDynamic(() => import("./SignupContent"), {
  ssr: false,
  loading: () => null,
});

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <ClientOnlyAuthPage>
      <AuthPageShell>
        <SignupContent />
      </AuthPageShell>
    </ClientOnlyAuthPage>
  );
}
