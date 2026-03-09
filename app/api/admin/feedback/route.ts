import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedbackPatchBody = {
  id?: string;
  status?: string;
  reviewedAt?: string | null;
  adminNotes?: string | null;
  priority?: string | null;
  category?: string | null;
  aiCategory?: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim();
  return undefined;
}

function parseNullableDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed;
}

export async function GET() {
  try {
    const feedback = await prisma.legacyFeedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: unknown) {
    console.error("[admin/feedback][GET] error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to load feedback.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackPatchBody;
    const id = body.id;

    if (!isNonEmptyString(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback id is required.",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (isNonEmptyString(body.status)) {
      updateData.status = body.status.trim();
    }

    const reviewedAt = parseNullableDate(body.reviewedAt);
    if (reviewedAt !== undefined) {
      updateData.reviewedAt = reviewedAt;
    }

    const adminNotes = parseNullableString(body.adminNotes);
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const priority = parseNullableString(body.priority);
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    const aiCategory = parseNullableString(body.aiCategory ?? body.category);
    if (aiCategory !== undefined) {
      updateData.aiCategory = aiCategory;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid fields were provided to update.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.legacyFeedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      feedback: updated,
    });
  } catch (error: unknown) {
    console.error("[admin/feedback][PATCH] error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update feedback.";

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
      Allow: "GET, PATCH, OPTIONS",
    },
  });
}