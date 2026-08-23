export const SOURCING_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
export const MAX_SOURCING_FILE_BYTES = 25 * 1024 * 1024
export const MAX_SOURCING_FILES = 4
export const SOURCING_BUCKET = "sourcing-attachments"

export interface SourcingAttachmentMetadata {
  path: string
  name: string
  contentType: string
  size: number
}
