import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendWelcomeBody = {
  email?: string;
  name?: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildWelcomeEmail(args: { email: string; name: string; baseUrl: string }) {
  const { email, name, baseUrl } = args;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeBaseUrl = baseUrl.replace(/\/+$/, "");

  const subject = "Welcome to AllFantasy";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="margin:0 0 16px;">Welcome to AllFantasy, ${safeName}!</h1>
      <p style="margin:0 0 12px;">
        We’re excited to have you join the AllFantasy community.
      </p>
      <p style="margin:0 0 12px;">
        Your email <strong>${safeEmail}</strong> is now on file, and you can head to the platform anytime using the link below.
      </p>
      <p style="margin:24px 0;">
        <a
          href="${safeBaseUrl}"
          style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;"
        >
          Go to AllFantasy
        </a>
      </p>
      <p style="margin:0 0 12px;">
        Features include fantasy league tools, AI-powered trade help, draft support, and more.
      </p>
      <p style="margin:24px 0 0;color:#555;">
        — The AllFantasy Team
      </p>
    </div>
  `.trim();

  const text = [
    `Welcome to AllFantasy, ${name}!`,
    "",
    `We’re excited to have you join the AllFantasy community.`,
    `Your email ${email} is now on file.`,
    "",
    `Visit: ${safeBaseUrl}`,
    "",
    "Features include fantasy league tools, AI-powered trade help, draft support, and more.",
    "",
    "— The AllFantasy Team",
  ].join("\n");

  return { subject, html, text };
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;
  try {
    const body = (await req.json()) as ResendWelcomeBody;

    if (!isNonEmptyString(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing RESEND_API_KEY.",
        },
        { status: 500 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const name = isNonEmptyString(body.name) ? body.name.trim() : "there";
    const fromEmail = (process.env.RESEND_FROM_EMAIL || "AllFantasy <no-reply@allfantasy.ai>").trim();
    const baseUrl = (process.env.APP_URL || "https://allfantasy.ai").trim();

    const { subject, html, text } = buildWelcomeEmail({
      email,
      name,
      baseUrl,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject,
        html,
        text,
      }),
      cache: "no-store",
    });

    const resendJson = (await resendResponse.json().catch(() => null)) as
      | { id?: string; message?: string; error?: unknown }
      | null;

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            (resendJson && typeof resendJson.message === "string" && resendJson.message) ||
            "Failed to send welcome email.",
          details: resendJson,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      id: resendJson?.id ?? null,
    });
  } catch (error: unknown) {
    console.error("[admin/resend-welcome] error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to resend welcome email.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}