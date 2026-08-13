"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth/session"
import { sendSourcingStatusEmail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

const statusSchema = z.enum(["new", "payment_pending", "paid", "sourcing", "quoted", "approved", "ordered", "completed"])

export async function updateSourcingStatusAction(formData: FormData): Promise<void> {
  await requireRole("admin")
  const id = String(formData.get("id") ?? "")
  const status = statusSchema.safeParse(formData.get("status"))
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000)
  if (!id || !status.success) return
  const admin = createAdminClient()
  const { data: request } = await admin.from("sourcing_requests").select("email, reference, status").eq("id", id).maybeSingle()
  if (!request || request.status === status.data) return
  const { error } = await admin.from("sourcing_requests").update({ status: status.data, updated_at: new Date().toISOString() }).eq("id", id)
  if (!error) await sendSourcingStatusEmail(request.email, { reference: request.reference, status: status.data, note: note || undefined })
  revalidatePath("/admin/sourcing")
  revalidatePath(`/admin/sourcing/${id}`)
}
