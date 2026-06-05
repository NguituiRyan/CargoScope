import type { LucideIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  href?: string
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4",
        href && "transition-colors hover:border-ring"
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <span className="font-heading text-2xl font-semibold tracking-tight">
        {value}
      </span>
      {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
    </div>
  )
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}
