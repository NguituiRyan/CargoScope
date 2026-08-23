import "server-only"

import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { sourcingRequests } from "@/lib/db/schema"
import { parseSourcingAttachments, signSourcingAttachments } from "@/lib/sourcing/storage"

export async function listSourcingRequests() {
  return db.select().from(sourcingRequests).orderBy(desc(sourcingRequests.createdAt)).limit(1000)
}

export async function getSourcingRequest(id: string) {
  const [request] = await db.select().from(sourcingRequests).where(eq(sourcingRequests.id, id)).limit(1)
  if (!request) return null
  return { ...request, signedAttachments: await signSourcingAttachments(parseSourcingAttachments(request.attachments)) }
}
