import { Suspense } from "react";
import { AuthStatusLoadingFallback } from "@/components/auth/AuthStatusShell";
import { AppProviders } from "@/components/providers/AppProviders";
import LoginContent from "./LoginContent";

export const dynamic = "force-dynamic";

function LoginFallback() {
  return <AuthStatusLoadingFallback />;
}

export default function LoginPage() {
  return (
    <AppProviders>
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </AppProviders>
  );
}
