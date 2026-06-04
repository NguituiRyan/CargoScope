import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import type { ProductStatus } from "@/lib/products/queries"

const VARIANT: Record<ProductStatus, "muted" | "verified" | "secondary"> = {
  draft: "muted",
  active: "verified",
  paused: "secondary",
}

export async function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const t = await getTranslations("product")
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>
}
