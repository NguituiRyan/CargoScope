import "server-only"

import {
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/messaging/attachments"
import { createClient } from "@/lib/supabase/server"

export const RFQ_ATTACHMENTS_BUCKET = "rfq-attachments"
const SIGNED_URL_TTL_SECONDS = 600
const ALLOWED = new Set<string>(ATTACHMENT_MIME_TYPES)

export interface RfqAttachment {
  path: string
  name: string
  contentType: string
  size: number
}

export interface SignedRfqAttachment {
  name: string
  url: string | null
  contentType: string
  size: number
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file"
}

/** Validate + upload RFQ files under the RFQ's folder; returns stored metadata. */
export async function storeRfqAttachments(
  rfqId: string,
  files: File[]
): Promise<RfqAttachment[]> {
  const valid = files.filter((f) => f.size > 0).slice(0, MAX_ATTACHMENTS)
  if (valid.length === 0) return []

  const supabase = await createClient()
  const stored: RfqAttachment[] = []
  for (const file of valid) {
    if (!ALLOWED.has(file.type) || file.size > MAX_ATTACHMENT_BYTES) continue
    const path = `${rfqId}/${crypto.randomUUID()}-${safeName(file.name)}`
    const buffer = await file.arrayBuffer()
    const { error } = await supabase.storage
      .from(RFQ_ATTACHMENTS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (!error) {
      stored.push({
        path,
        name: file.name,
        contentType: file.type,
        size: file.size,
      })
    }
  }
  return stored
}

/** Coerce the stored jsonb column into typed attachments. */
export function parseRfqAttachments(value: unknown): RfqAttachment[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (a): a is RfqAttachment =>
      !!a &&
      typeof a === "object" &&
      typeof (a as RfqAttachment).path === "string" &&
      typeof (a as RfqAttachment).name === "string"
  )
}

/** Mint short-lived signed URLs for display (read RLS handles authorization). */
export async function signRfqAttachments(
  attachments: RfqAttachment[]
): Promise<SignedRfqAttachment[]> {
  if (attachments.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from(RFQ_ATTACHMENTS_BUCKET)
    .createSignedUrls(
      attachments.map((a) => a.path),
      SIGNED_URL_TTL_SECONDS
    )
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return attachments.map((a) => ({
    name: a.name,
    url: byPath.get(a.path) ?? null,
    contentType: a.contentType,
    size: a.size,
  }))
}
