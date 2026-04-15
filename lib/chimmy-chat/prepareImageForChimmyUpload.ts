/** Client-side resize/compress so JSON payloads stay under typical hosting limits while preserving quality. */

const MAX_EDGE_PX = 2400
/** Above this, resize even if dimensions are small (e.g. huge BMP/TIFF as PNG). */
const RESIZE_IF_LARGER_THAN_BYTES = 1.75 * 1024 * 1024
const JPEG_QUALITY = 0.88

export async function prepareImageForChimmyUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const w = bitmap.width
    const h = bitmap.height
    const maxDim = Math.max(w, h)
    const scale = maxDim > MAX_EDGE_PX ? MAX_EDGE_PX / maxDim : 1
    const needsResize = scale < 1
    const needsShrinkBytes = file.size > RESIZE_IF_LARGER_THAN_BYTES

    if (!needsResize && !needsShrinkBytes) {
      bitmap.close()
      return file
    }

    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, tw, th)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob || blob.size === 0) {
      return file
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${base}-upload.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}
