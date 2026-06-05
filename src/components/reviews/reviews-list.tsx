import { getLocale, getTranslations } from "next-intl/server"

import { Stars } from "@/components/reviews/stars"
import { formatDateOnly } from "@/lib/datetime"
import type { Rating, ReviewItem } from "@/lib/reviews/queries"

export async function ReviewsList({
  rating,
  items,
  showProduct = false,
}: {
  rating: Rating
  items: ReviewItem[]
  showProduct?: boolean
}) {
  const t = await getTranslations("reviews")
  const locale = await getLocale()

  if (rating.count === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-heading text-3xl font-semibold tracking-tight">
          {rating.avg.toFixed(1)}
        </span>
        <div className="flex flex-col gap-0.5">
          <Stars value={rating.avg} withNumber={false} sizeClass="size-4" />
          <span className="text-xs text-muted-foreground">
            {t("based", { count: rating.count })}
          </span>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {items.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {r.author ?? t("verifiedBuyer")}
              </span>
              <Stars value={r.rating} withNumber={false} sizeClass="size-3.5" />
            </div>
            {showProduct && r.productTitle ? (
              <span className="text-xs text-muted-foreground">{r.productTitle}</span>
            ) : null}
            {r.comment ? (
              <p className="text-sm text-muted-foreground">{r.comment}</p>
            ) : null}
            {r.createdAt ? (
              <span className="text-xs text-muted-foreground/70">
                {formatDateOnly(r.createdAt, locale)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
