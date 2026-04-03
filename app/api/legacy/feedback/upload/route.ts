import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { put } from "@vercel/blob"

const MAX_SIZE = 5 * 1024 * 1024

export const POST = withApiUsage({ endpoint: "/api/legacy/feedback/upload", tool: "LegacyFeedbackUpload" })(
  async (request: NextRequest) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
    }

    try {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 })
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File must be less than 5MB" }, { status: 400 })
      }

      const ext = file.name.split(".").pop() || "png"
      const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`
      const key = `legacy-feedback/${fileName}`

      const blob = await put(key, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      return NextResponse.json({ url: blob.url, fileName })
    } catch (err) {
      console.error("Screenshot upload error:", err)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }
  }
)
