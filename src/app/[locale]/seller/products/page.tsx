import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Package, Plus } from "lucide-react"

import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { localePath } from "@/lib/auth/session"
import { getMyManufacturer } from "@/lib/manufacturers/queries"
import { getMyProducts } from "@/lib/products/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("product")
  return { title: t("listTitle") }
}

export default async function SellerProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const manufacturer = await getMyManufacturer()
  if (!manufacturer) redirect(localePath(locale, "/seller/onboarding"))

  const t = await getTranslations("product")
  const products = await getMyProducts(manufacturer.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("listTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("listSubtitle")}</p>
        </div>
        <Link
          href="/seller/products/new"
          className={cn(buttonVariants({ variant: "default", size: "lg" }))}
        >
          <Plus className="size-4" aria-hidden />
          {t("new")}
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {products.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/seller/products/${p.id}/edit`}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-muted/40"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {p.primaryImageUrl ? (
                        <Image
                          src={p.primaryImageUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <Package
                          className="absolute inset-0 m-auto size-5 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.moq ? `MOQ ${p.moq} ${p.unit}` : p.unit}
                        {" · "}
                        {t("tierCount", { count: p.tierCount })}
                      </p>
                    </div>
                    <ProductStatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
