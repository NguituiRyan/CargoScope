"use client"

import { createClient } from "@/lib/supabase/client"
import { SOURCING_BUCKET, type SourcingAttachmentMetadata } from "@/lib/sourcing/storage-shared"

interface SignedUpload extends SourcingAttachmentMetadata { token: string }

export async function uploadSourcingFiles(files: File[]): Promise<SourcingAttachmentMetadata[]> {
  if (!files.length) return []
  const response = await fetch("/api/uploads/sourcing/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: files.map((file) => ({ name: file.name, contentType: file.type, size: file.size })) }),
  })
  const payload = (await response.json()) as { uploads?: SignedUpload[]; error?: string }
  if (!response.ok || !payload.uploads) throw new Error(payload.error || "Could not prepare uploads.")
  const supabase = createClient()
  for (const [index, upload] of payload.uploads.entries()) {
    const { error } = await supabase.storage.from(SOURCING_BUCKET).uploadToSignedUrl(upload.path, upload.token, files[index], { contentType: upload.contentType })
    if (error) throw new Error(`Could not upload ${upload.name}.`)
  }
  return payload.uploads.map((upload) => ({
    path: upload.path,
    name: upload.name,
    contentType: upload.contentType,
    size: upload.size,
  }))
}
