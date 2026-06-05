import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"

/** "Ready to Ship" trust badge — in-stock / fast-dispatch products. */
export function ReadyToShipBadge({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-verified/15 px-2 py-0.5 text-[11px] font-medium text-verified-foreground",
        className
      )}
    >
      <Zap className="size-3" aria-hidden />
      {label}
    </span>
  )
}

/** Lead-time threshold (days) under which a product is treated as in-stock. */
export const READY_TO_SHIP_MAX_DAYS = 7
