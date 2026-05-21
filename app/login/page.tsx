import { Suspense } from "react";
import { AuthStatusLoadingFallback } from "@/components/auth/AuthStatusShell";
import LoginContent from "./LoginContent";

export const dynamic = "force-dynamic";

function LoginFallback() {
  return <AuthStatusLoadingFallback />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
