import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "blog-media"
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
])

export async function storeBlogMedia(file: File): Promise<{ type: "image" | "video"; url: string } | null> {
  if (!file.size || file.size > 25 * 1024 * 1024 || !ALLOWED.has(file.type)) return null
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "media"
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${name}`
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  })
  if (error) return null
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { type: file.type.startsWith("video/") ? "video" : "image", url: data.publicUrl }
}
