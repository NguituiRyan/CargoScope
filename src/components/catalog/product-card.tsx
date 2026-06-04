import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Clock, Package } from "lucide-react"

import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { Card } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import type { ProductCard as ProductCardData } from "@/lib/catalog/queries"
import { formatMoney } from "@/lib/format"

export async function ProductCard({ product }: { product: ProductCardData }) {
  const t = await getTranslations("catalog")

  return (
    <Card className="group overflow-hidden p-0 transition-colors hover:border-ring">
      <Link href={`/products/${product.id}`} className="flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105"
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
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {product.title}
          </h3>

          <p className="text-sm font-semibold">
            {product.minPrice !== null
              ? t("fromPrice", {
                  price: formatMoney(product.minPrice, product.currency),
                })
              : t("priceOnRequest")}
          </p>

          <div className="mt-auto flex flex-col gap-1 text-xs text-muted-foreground">
            <span>
              {product.moq
                ? `${t("moq")} ${product.moq} ${product.unit}`
                : product.unit}
            </span>
            {product.leadTimeDays !== null && (
              <span className="inline-flex items-center gap-1">
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
