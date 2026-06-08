import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Append a critical-action entry to the audit trail (audit_log). Written with
 * the service role so entries are trusted and can't be forged by users.
 *
 * Best-effort: it must NEVER throw or block the action it records, so any
 * failure is swallowed.
 */
export async function logAudit(entry: {
  actorProfileId: string | null
  action: string
  targetType?: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("audit_log").insert({
      actor_profile_id: entry.actorProfileId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
    })
  } catch {
    // Audit logging must never break the action it records.
  }
}
