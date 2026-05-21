import { Suspense } from "react";
import { AuthStatusLoadingFallback } from "@/components/auth/AuthStatusShell";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import LoginContent from "./LoginContent";

export const dynamic = "force-dynamic";

function LoginFallback() {
  return <AuthStatusLoadingFallback />;
}

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </AuthPageShell>
  );
}
