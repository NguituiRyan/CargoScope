import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

function Row({ filled, sizeClass }: { filled: boolean; sizeClass: string }) {
  return (
    // w-max keeps the row at its natural 5-star width; shrink-0 stops the stars
    // from shrinking when the overlay row is clipped to a partial width.
    <span className="flex w-max shrink-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn(
            "shrink-0",
            sizeClass,
            filled
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/30"
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}

/**
 * Read-only star rating with precise fractional fill (clipped overlay). Shows the
 * numeric average + count when provided.
 */
export function Stars({
  value,
  count,
  withNumber = true,
  sizeClass = "size-3.5",
  className,
}: {
  value: number
  count?: number
  withNumber?: boolean
  sizeClass?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      <span className="relative inline-block">
        <Row filled={false} sizeClass={sizeClass} />
        <span
          className="absolute left-0 top-0 h-full overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          <Row filled sizeClass={sizeClass} />
        </span>
      </span>
      {withNumber && (count ?? 0) > 0 ? (
        <span className="text-xs font-medium text-foreground">
          {value.toFixed(1)}{" "}
          <span className="font-normal text-muted-foreground">({count})</span>
        </span>
      ) : null}
    </span>
  )
}
