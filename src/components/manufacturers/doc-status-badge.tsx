import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import type { VerificationRecord } from "@/lib/manufacturers/queries"

const VARIANT: Record<
  VerificationRecord["status"],
  "muted" | "verified" | "destructive"
> = {
  pending: "muted",
  approved: "verified",
  rejected: "destructive",
}

export async function DocStatusBadge({
  status,
}: {
  status: VerificationRecord["status"]
}) {
  const t = await getTranslations("verification")
  return <Badge variant={VARIANT[status]}>{t(`docStatus.${status}`)}</Badge>
}
