import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  MAX_SOURCING_FILE_BYTES,
  MAX_SOURCING_FILES,
  SOURCING_ACCEPT,
  SOURCING_BUCKET,
} from "@/lib/sourcing/storage-shared"

const allowed = new Set(SOURCING_ACCEPT.split(","))

export interface SourcingAttachment {
  path: string
  name: string
  contentType: string
  size: number
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file"
}

export async function storeSourcingAttachments(
  folder: string,
  files: File[]
): Promise<SourcingAttachment[]> {
  const admin = createAdminClient()
  const stored: SourcingAttachment[] = []
  for (const file of files.filter((f) => f.size > 0).slice(0, MAX_SOURCING_FILES)) {
    if (!allowed.has(file.type) || file.size > MAX_SOURCING_FILE_BYTES) continue
    const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`
    const { error } = await admin.storage.from(SOURCING_BUCKET).upload(
      path,
      await file.arrayBuffer(),
      { contentType: file.type, upsert: false }
    )
    if (!error) {
      stored.push({ path, name: file.name, contentType: file.type, size: file.size })
    }
  }
  return stored
}

export async function signSourcingAttachments(
  attachments: SourcingAttachment[]
): Promise<Array<SourcingAttachment & { url: string | null }>> {
  if (!attachments.length) return []
  const admin = createAdminClient()
  const { data } = await admin.storage
    .from(SOURCING_BUCKET)
    .createSignedUrls(attachments.map((item) => item.path), 900)
  const urls = new Map((data ?? []).map((item) => [item.path, item.signedUrl]))
  return attachments.map((item) => ({ ...item, url: urls.get(item.path) ?? null }))
}

export function parseSourcingAttachments(value: unknown): SourcingAttachment[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is SourcingAttachment =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as SourcingAttachment).path === "string" &&
      typeof (item as SourcingAttachment).name === "string"
  )
}
