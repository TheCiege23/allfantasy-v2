import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getFromEmail(): string {
  return (process.env.RESEND_FROM_EMAIL || "AllFantasy <no-reply@allfantasy.ai>").trim();
}

export async function GET() {
  try {
    const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
    const fromEmail = getFromEmail();

    const configured = resendApiKey.length > 0;

    try {
      const prismaAny = prisma as any;

      if (prismaAny?.analyticsEvent?.create) {
        await prismaAny.analyticsEvent.create({
          data: {
            event: "admin_resend_verify",
            category: "email",
            label: fromEmail,
            metadata: {
              configured,
              fromEmail,
              checkedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (analyticsError) {
      console.warn("[admin/resend/verify] analytics logging skipped:", analyticsError);
    }

    if (!configured) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: "Missing RESEND_API_KEY.",
          fromEmail,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      configured: true,
      fromEmail,
    });
  } catch (error: unknown) {
    console.error("[admin/resend/verify] error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to verify Resend configuration.";

    return NextResponse.json(
      {
        success: false,
        configured: false,
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
      Allow: "GET, OPTIONS",
    },
  });
}