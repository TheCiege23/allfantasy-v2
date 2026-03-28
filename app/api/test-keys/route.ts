import { NextRequest, NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/provider-config";
import { runClearSportsHealthCheck } from "@/lib/clear-sports/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServiceResult = {
  configured: boolean;
  ok: boolean;
  message: string;
  details?: Record<string, unknown> | null;
};

function maskKey(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

async function testOpenAI(): Promise<ServiceResult> {
  const status = getProviderStatus();
  if (!status.openai) {
    return {
      configured: false,
      ok: false,
      message: "OpenAI key not configured.",
      details: null,
    };
  }

  return {
    configured: true,
    ok: true,
    message: "OpenAI key is configured.",
    details: null,
  };
}

async function testDeepSeek(): Promise<ServiceResult> {
  const status = getProviderStatus();
  if (!status.deepseek) {
    return {
      configured: false,
      ok: false,
      message: "DeepSeek key not configured.",
      details: null,
    };
  }
  return {
    configured: true,
    ok: true,
    message: "DeepSeek key is configured.",
    details: null,
  };
}

async function testXai(): Promise<ServiceResult> {
  const status = getProviderStatus();
  if (!status.xai) {
    return {
      configured: false,
      ok: false,
      message: "xAI key not configured.",
      details: null,
    };
  }
  return {
    configured: true,
    ok: true,
    message: "xAI key is configured.",
    details: null,
  };
}

async function testClearSports(): Promise<ServiceResult> {
  const health = await runClearSportsHealthCheck();
  if (!health.configured) {
    return {
      configured: false,
      ok: false,
      message: "ClearSports credentials not configured (requires key + base URL).",
      details: null,
    };
  }
  if (!health.available) {
    return {
      configured: true,
      ok: false,
      message: "ClearSports is configured but not reachable.",
      details: {
        latencyMs: health.latencyMs ?? null,
        error: health.error ?? null,
      },
    };
  }
  return {
    configured: true,
    ok: true,
    message: "ClearSports credentials are configured and provider is reachable.",
    details: {
      latencyMs: health.latencyMs ?? null,
    },
  };
}

async function testStripe(): Promise<ServiceResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";

  if (!secretKey.trim()) {
    return {
      configured: false,
      ok: false,
      message: "Stripe secret key not configured.",
      details: null,
    };
  }

  return {
    configured: true,
    ok: true,
    message: "Stripe key is configured.",
    details: {
      keyPreview: maskKey(secretKey),
    },
  };
}

async function testSupabase(): Promise<ServiceResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!url.trim() || !anonKey.trim()) {
    return {
      configured: false,
      ok: false,
      message: "Supabase env vars are incomplete.",
      details: {
        hasUrl: !!url.trim(),
        hasAnonKey: !!anonKey.trim(),
      },
    };
  }

  return {
    configured: true,
    ok: true,
    message: "Supabase env vars are configured.",
    details: {
      url,
      anonKeyPreview: maskKey(anonKey),
    },
  };
}

async function testResend(): Promise<ServiceResult> {
  try {
    const { getResendClient } = await import("@/lib/resend-client");
    const { client, fromEmail } = await getResendClient();

    const response = await client.domains.list();

    return {
      configured: true,
      ok: true,
      message: "Resend is configured and reachable.",
      details: {
        fromEmail,
        domainsCount:
          Array.isArray((response as any)?.data?.data)
            ? (response as any).data.data.length
            : Array.isArray((response as any)?.data)
              ? (response as any).data.length
              : null,
      },
    };
  } catch (error: unknown) {
    const envKey = process.env.RESEND_API_KEY || "";

    return {
      configured: !!envKey.trim(),
      ok: false,
      message: error instanceof Error ? error.message : "Resend test failed.",
      details: {
        keyPreview: maskKey(envKey),
      },
    };
  }
}

async function testTwilio(): Promise<ServiceResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const apiKey = process.env.TWILIO_API_KEY || "";
  const apiSecret = process.env.TWILIO_API_SECRET || "";
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
  const from = process.env.TWILIO_PHONE_NUMBER || "";

  const hasAuthTokenMode = !!sid.trim() && !!token.trim();
  const hasApiKeyMode = !!sid.trim() && !!apiKey.trim() && !!apiSecret.trim();

  if (!hasAuthTokenMode && !hasApiKeyMode) {
    return {
      configured: false,
      ok: false,
      message: "Twilio env vars are incomplete.",
      details: {
        hasSid: !!sid.trim(),
        hasAuthToken: !!token.trim(),
        hasApiKey: !!apiKey.trim(),
        hasApiSecret: !!apiSecret.trim(),
        hasFrom: !!from.trim(),
        hasVerifyServiceSid: !!verifySid.trim(),
      },
    };
  }

  return {
    configured: true,
    ok: true,
    message: hasApiKeyMode
      ? "Twilio configured (API key/secret mode)."
      : "Twilio configured (account SID/auth token mode).",
    details: {
      accountSidPreview: maskKey(sid),
      mode: hasApiKeyMode ? "api_key" : "auth_token",
      hasFromNumber: !!from.trim(),
      hasVerifyServiceSid: !!verifySid.trim(),
    },
  };
}

async function testCoinbase(): Promise<ServiceResult> {
  const key =
    process.env.COINBASE_COMMERCE_API_KEY ||
    process.env.COINBASE_API_KEY ||
    "";

  if (!key.trim()) {
    return {
      configured: false,
      ok: false,
      message: "Coinbase key not configured.",
      details: null,
    };
  }

  return {
    configured: true,
    ok: true,
    message: "Coinbase key is configured.",
    details: null,
  };
}

async function testPayPal(): Promise<ServiceResult> {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET || "";

  if (!clientId.trim() || !secret.trim()) {
    return {
      configured: false,
      ok: false,
      message: "PayPal env vars are incomplete.",
      details: {
        hasClientId: !!clientId.trim(),
        hasSecret: !!secret.trim(),
      },
    };
  }

  return {
    configured: true,
    ok: true,
    message: "PayPal env vars are configured.",
    details: null,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const [
      openai,
      deepseek,
      xai,
      clearsports,
      resend,
      stripe,
      supabase,
      twilio,
      coinbase,
      paypal,
    ] = await Promise.all([
      testOpenAI(),
      testDeepSeek(),
      testXai(),
      testClearSports(),
      testResend(),
      testStripe(),
      testSupabase(),
      testTwilio(),
      testCoinbase(),
      testPayPal(),
    ]);

    return NextResponse.json({
      ok: true,
      services: {
        openai,
        deepseek,
        xai,
        clearsports,
        resend,
        stripe,
        supabase,
        twilio,
        coinbase,
        paypal,
      },
      summary: {
        configuredCount: [
          openai,
          deepseek,
          xai,
          clearsports,
          resend,
          stripe,
          supabase,
          twilio,
          coinbase,
          paypal,
        ].filter((x) => x.configured).length,
        passingCount: [
          openai,
          deepseek,
          xai,
          clearsports,
          resend,
          stripe,
          supabase,
          twilio,
          coinbase,
          paypal,
        ].filter((x) => x.ok).length,
      },
    });
  } catch (error: unknown) {
    console.error("[test-keys][GET] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Key test failed.",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
    },
  });
}
