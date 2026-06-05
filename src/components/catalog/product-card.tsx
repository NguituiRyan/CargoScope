import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Clock, Package } from "lucide-react"

import {
  ReadyToShipBadge,
  READY_TO_SHIP_MAX_DAYS,
} from "@/components/catalog/ready-to-ship-badge"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { Stars } from "@/components/reviews/stars"
import { Card } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import type { ProductCard as ProductCardData } from "@/lib/catalog/queries"
import {
  formatDisplayPrice,
  type DisplayCurrency,
  type DisplayRates,
} from "@/lib/currency/shared"

export async function ProductCard({
  product,
  currency,
  rates,
  rating,
}: {
  product: ProductCardData
  currency: DisplayCurrency
  rates: DisplayRates["rates"]
  rating?: { avg: number; count: number }
}) {
  const t = await getTranslations("catalog")
  const tv = await getTranslations("productView")
  const readyToShip =
    product.leadTimeDays !== null &&
    product.leadTimeDays <= READY_TO_SHIP_MAX_DAYS

  return (
    <Card className="group overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-ring hover:shadow-md">
      <Link href={`/products/${product.id}`} className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.title}
              fill
              unoptimized
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Package
              className="absolute inset-0 m-auto size-10 text-muted-foreground"
              aria-hidden
            />
          )}
          <div className="absolute left-2 top-2">
            <VerificationBadge status={product.manufacturer.verificationStatus} />
          </div>
          {readyToShip ? (
            <div className="absolute right-2 top-2">
              <ReadyToShipBadge label={tv("readyToShip")} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {product.title}
          </h3>

          <p className="text-[15px] font-semibold tracking-tight">
            {product.minPrice !== null ? (
              t("fromPrice", {
                price: formatDisplayPrice(product.minPrice, currency, rates),
              })
            ) : (
              <span className="text-muted-foreground">{t("priceOnRequest")}</span>
            )}
          </p>

          {rating && rating.count > 0 ? (
            <Stars value={rating.avg} count={rating.count} />
          ) : null}

          <div className="mt-auto flex flex-wrap gap-1.5 text-xs">
            {product.moq ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {t("moq")} {product.moq} {product.unit}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {product.unit}
              </span>
            )}
            {product.leadTimeDays !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                <Clock className="size-3" aria-hidden />
                {t("leadDays", { days: product.leadTimeDays })}
              </span>
            )}
          </div>

          <p className="truncate border-t border-border pt-2 text-xs text-muted-foreground">
            {product.manufacturer.companyName}
            {product.manufacturer.country
              ? ` · ${product.manufacturer.country}`
              : ""}
          </p>
        </div>
      </Link>
    </Card>
  )
}
