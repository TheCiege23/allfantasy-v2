import { NextResponse } from "next/server";
import { withApiUsage } from "@/lib/telemetry/usage";
import { requireAdmin } from "@/lib/adminAuth";

type SecretSource = "session_secret" | "admin_password" | "fallback";

function sessionSecretSource(): SecretSource {
  if (process.env.ADMIN_SESSION_SECRET) return "session_secret";
  if (process.env.ADMIN_PASSWORD) return "admin_password";
  return "fallback";
}

function loginPasswordSource(): SecretSource {
  if (process.env.ADMIN_PASSWORD) return "admin_password";
  return "fallback";
}

export const GET = withApiUsage({
  endpoint: "/api/auth/admin-debug",
  tool: "AuthAdminDebug",
})(async () => {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  return NextResponse.json({
    ok: true,
    secretPaths: {
      sessionCookieSigning: sessionSecretSource(),
      loginPassword: loginPasswordSource(),
    },
    flags: {
      hasAdminSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET),
      hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
      hasAdminPasswordHash: Boolean(process.env.ADMIN_PASSWORD_HASH),
      fallbackAdmin123Active:
        !process.env.ADMIN_PASSWORD && !process.env.ADMIN_SESSION_SECRET,
    },
  });
});
