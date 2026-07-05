import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import type { VerificationTier } from "@/lib/manufacturers/queries"

const VARIANT: Record<
  VerificationTier,
  "muted" | "secondary" | "verified" | "premium" | "destructive"
> = {
  pending: "muted",
  identity: "secondary",
  verified: "verified",
  premium: "premium",
  rejected: "destructive",
}

export async function VerificationBadge({
  status,
  forceShow = false,
}: {
  status: VerificationTier
  forceShow?: boolean
}) {
  if (!forceShow) {
    return null
  }
  const t = await getTranslations("verification")
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>
}
