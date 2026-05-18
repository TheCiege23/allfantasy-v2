import { NextResponse } from "next/server"
import {
  isCloudinaryConfigured,
  isWorldCupChatImageType,
  uploadWorldCupChatImageToCloudinary,
  WORLD_CUP_CHAT_IMAGE_MAX_BYTES,
} from "@/lib/world-cup/worldCupChatImageUpload"
import {
  assertWorldCupChallengeMemberOrManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../../_utils"

export const runtime = "nodejs"

type UploadedImageFile = Blob & { name?: string; arrayBuffer: () => Promise<ArrayBuffer> }

function isUploadedImageFile(value: unknown): value is UploadedImageFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
      typeof (value as { size?: unknown }).size === "number"
  )
}

function inferImageMimeType(file: UploadedImageFile) {
  const declared = file.type || ""
  if (declared && declared !== "application/octet-stream") return declared
  const name = typeof (file as File).name === "string" ? (file as File).name.toLowerCase() : ""
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".webp")) return "image/webp"
  if (name.endsWith(".gif")) return "image/gif"
  return declared || "application/octet-stream"
}

export async function POST(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      error: "Cloudinary image uploads are not configured.",
      code: "WORLD_CUP_CLOUDINARY_NOT_CONFIGURED",
      requiredEnv: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    }, { status: 501 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!isUploadedImageFile(file)) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 })
  }

  const mimeType = inferImageMimeType(file)
  if (!isWorldCupChatImageType(mimeType)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, and GIF images are allowed" }, { status: 400 })
  }

  const actualBytes = (await file.arrayBuffer()).byteLength
  if (file.size > WORLD_CUP_CHAT_IMAGE_MAX_BYTES || actualBytes > WORLD_CUP_CHAT_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 })
  }

  try {
    const image = await uploadWorldCupChatImageToCloudinary({
      file,
      challengeId: params.data.challengeId,
      userId: auth.user.id,
    })
    return NextResponse.json({ image })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Image upload failed",
    }, { status: 500 })
  }
}
