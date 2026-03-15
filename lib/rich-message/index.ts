/**
 * Rich message — emoji, GIF, image, file attachment services and safe renderer.
 */

export {
  EMOJI_CATEGORIES,
  EMOJI_LIST,
  insertEmojiAtPosition,
  appendEmoji,
  getEmojiCategoryLabel,
} from "./EmojiPickerService"

export {
  isGifSearchConfigured,
  getGifProviderName,
  getTenorSearchUrl,
  getGiphySearchUrl,
  isValidGifOrImageUrl,
} from "./GIFIntegrationResolver"

export {
  MAX_IMAGE_SIZE_BYTES,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_FILE_TYPES,
  validateImageFile,
  validateAttachmentFile,
  getMessagePayloadForImage,
  getMessagePayloadForGif,
  getMessagePayloadForFile,
} from "./MessageAttachmentService"
export type { ImagePreview, GifPreview, FilePreview, AttachmentPreview } from "./MessageAttachmentService"

export { RichMessageRenderer } from "./RichMessageRenderer"
export type { RichMessageRendererProps } from "./RichMessageRenderer"

export { getSafeMessageMediaUrl, isSafeToRenderMedia } from "./safeMedia"
