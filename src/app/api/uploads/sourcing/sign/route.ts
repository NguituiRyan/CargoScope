import { createAdminClient } from "@/lib/supabase/admin"
import { MAX_SOURCING_FILE_BYTES, MAX_SOURCING_FILES, SOURCING_ACCEPT, SOURCING_BUCKET } from "@/lib/sourcing/storage-shared"

const allowed = new Set(SOURCING_ACCEPT.split(","))
function safeName(name: string): string { return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file" }

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin")
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Invalid upload origin." }, { status: 403 })
  let body: { files?: Array<{ name?: string; contentType?: string; size?: number }> }
  try { body = await request.json() } catch { return Response.json({ error: "Invalid request." }, { status: 400 }) }
  const files = body.files?.slice(0, MAX_SOURCING_FILES) ?? []
  if (!files.length || files.some((file) => !file.name || !file.contentType || !allowed.has(file.contentType) || !file.size || file.size > MAX_SOURCING_FILE_BYTES)) {
    return Response.json({ error: "Unsupported file type or size." }, { status: 400 })
  }
  const folder = `pending/${crypto.randomUUID()}`
  const admin = createAdminClient()
  const uploads = []
  for (const file of files) {
    const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name!)}`
    const { data, error } = await admin.storage.from(SOURCING_BUCKET).createSignedUploadUrl(path)
    if (error || !data) return Response.json({ error: "Could not authorize upload." }, { status: 500 })
    uploads.push({ path, token: data.token, name: file.name, contentType: file.contentType, size: file.size })
  }
  return Response.json({ uploads })
}
