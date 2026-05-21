import nextDynamic from "next/dynamic";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ClientOnlyAuthPage } from "@/components/auth/ClientOnlyAuthPage";

const LoginContent = nextDynamic(() => import("./LoginContent"), {
  ssr: false,
  loading: () => null,
});

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <ClientOnlyAuthPage>
      <AuthPageShell>
        <LoginContent />
      </AuthPageShell>
    </ClientOnlyAuthPage>
  );
}
