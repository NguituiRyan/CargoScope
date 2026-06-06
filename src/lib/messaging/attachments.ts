/**
 * Allowed chat attachment types for buyer↔manufacturer document sharing.
 *
 * This is the single source of truth shared by the client file picker
 * (`accept`) and the server-side validation, so the two can never drift apart.
 * It must also stay in sync with the `chat-attachments` storage bucket's
 * `allowed_mime_types` (see drizzle/0006_widen_chat_mimes_and_fix_media.sql) —
 * the bucket is the final gate, so a type missing there will still be rejected.
 */
export const ATTACHMENT_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text / CSV
  "text/plain",
  "text/csv",
] as const

/** Value for an `<input type="file" accept=...>` picker. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_MIME_TYPES.join(",")

/** Max size per attachment (10 MB) — must match the bucket's file_size_limit. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** Max attachments per message. */
export const MAX_ATTACHMENTS = 5
