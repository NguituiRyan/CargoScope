import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, Calculator } from "lucide-react"

import { LandedCostCalculator } from "@/components/catalog/landed-cost-calculator"
import { ProductCard } from "@/components/catalog/product-card"
import { ProductGallery } from "@/components/catalog/product-gallery"
import {
  ReadyToShipBadge,
  READY_TO_SHIP_MAX_DAYS,
} from "@/components/catalog/ready-to-ship-badge"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { Stars } from "@/components/reviews/stars"
import { ContactSupplierButton } from "@/components/messaging/contact-supplier-button"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { getPublicProduct, getRelatedProducts } from "@/lib/catalog/queries"
import { getProductRatings, getProductReviews } from "@/lib/reviews/queries"
import { startConversationAction } from "@/lib/messaging/actions"
import { getDisplayCurrency } from "@/lib/currency/server"
import { formatDisplayPrice } from "@/lib/currency/shared"
import { getDisplayRates, getFxRate } from "@/lib/fx"
import { cn } from "@/lib/utils"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getPublicProduct(id)
  return { title: product?.title }
}

function yearOf(timestamp: string | null): number | null {
  if (!timestamp) return null
  const year = new Date(timestamp).getFullYear()
  return Number.isFinite(year) ? year : null
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const product = await getPublicProduct(id)
  if (!product) notFound()

  const t = await getTranslations("productView")
  const [user, fx, currency, displayRates] = await Promise.all([
    getSessionUser(),
    getFxRate(),
    getDisplayCurrency(),
    getDisplayRates(),
  ])
  const m = product.manufacturer
  const memberYear = yearOf(m.memberSince)
  const usdTiers = product.priceTiers.map((tier) => ({
    minQty: tier.minQty,
    unitPriceUsd: Number(tier.unitPrice),
  }))

  const [reviews, related] = await Promise.all([
    getProductReviews(product.id),
    getRelatedProducts({ productId: product.id, categoryId: product.categoryId }),
  ])
  const relatedRatings = await getProductRatings(related.map((r) => r.id))
  const readyToShip =
    product.leadTimeDays !== null &&
    product.leadTimeDays <= READY_TO_SHIP_MAX_DAYS
  const baseTierPrice = product.priceTiers.length
    ? Number(product.priceTiers[0].unitPrice)
    : 0

  const specs: { label: string; value: string }[] = [
    {
      label: t("specMoq"),
      value: product.moq ? `${product.moq} ${product.unit}` : t("none"),
    },
    { label: t("specUnit"), value: product.unit },
    {
      label: t("specLeadTime"),
      value:
        product.leadTimeDays !== null
          ? t("leadDays", { days: product.leadTimeDays })
          : t("none"),
    },
    { label: t("specHsCode"), value: product.hsCode || t("none") },
    { label: t("specOrigin"), value: product.originCountry || t("none") },
    {
      label: t("specCustomizable"),
      value: product.customizable ? t("yes") : t("no"),
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <Link
        href="/products"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToCatalog")}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery
          media={product.media}
          primaryImageUrl={product.primaryImageUrl}
          title={product.title}
        />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {product.title}
            </h1>
            {(reviews.rating.count > 0 || readyToShip) && (
              <div className="flex flex-wrap items-center gap-3">
                {reviews.rating.count > 0 ? (
                  <Stars
                    value={reviews.rating.avg}
                    count={reviews.rating.count}
                    sizeClass="size-4"
                  />
                ) : null}
                {readyToShip ? <ReadyToShipBadge label={t("readyToShip")} /> : null}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{t("soldBy")}</span>
              <Link
                href={`/manufacturers/${m.slug}`}
                className="font-medium text-foreground hover:underline"
              >
                {m.companyName}
              </Link>
              <VerificationBadge status={m.verificationStatus} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {memberYear && <span>{t("memberSince", { year: memberYear })}</span>}
              {m.responseRate !== null && (
                <span>{t("responseRate", { rate: m.responseRate })}</span>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("pricingTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {product.priceTiers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">{t("qty")}</th>
                      <th className="pb-2 text-right font-medium">
                        {t("unitPrice")}
                      </th>
                      <th className="pb-2 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.priceTiers.map((tier, i) => {
                      const price = Number(tier.unitPrice)
                      const pct =
                        baseTierPrice > 0
                          ? Math.round(((baseTierPrice - price) / baseTierPrice) * 100)
                          : 0
                      const isBest =
                        product.priceTiers.length > 1 &&
                        i === product.priceTiers.length - 1
                      return (
                        <tr key={tier.id} className={isBest ? "bg-primary/5" : undefined}>
                          <td className="py-2">
                            ≥ {tier.minQty} {product.unit}
                            {isBest ? (
                              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {t("bestValue")}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatDisplayPrice(price, currency, displayRates.rates)}
                          </td>
                          <td className="py-2 text-right">
                            {pct > 0 ? (
                              <span className="text-xs font-medium text-verified-foreground">
                                {t("save", { pct })}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("priceOnRequest")}
                </p>
              )}
              {product.moq && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("moqNote", { moq: product.moq, unit: product.unit })}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("contactTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <form action={startConversationAction}>
                  <input type="hidden" name="manufacturerId" value={m.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <ContactSupplierButton label={t("messageSupplier")} />
                </form>
                {!user ? (
                  <p className="text-xs text-muted-foreground">
                    {t("inquireHint")}
                  </p>
                ) : null}
                <Link
                  href={`/manufacturers/${m.slug}`}
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  {t("viewStorefront")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("specsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col divide-y divide-border text-sm">
              {specs.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="text-right font-medium">{spec.value}</dd>
                </div>
              ))}
              {product.specs.map((spec) => (
                <div
                  key={`attr-${spec.name}`}
                  className="flex justify-between gap-4 py-2"
                >
                  <dt className="text-muted-foreground">{spec.name}</dt>
                  <dd className="text-right font-medium">{spec.value}</dd>
                </div>
              ))}
              {product.certifications.length > 0 && (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">
                    {t("specCertifications")}
                  </dt>
                  <dd className="flex flex-wrap justify-end gap-1">
                    {product.certifications.map((cert) => (
                      <Badge key={cert} variant="outline">
                        {cert}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            {product.sampleAvailable && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{t("sampleAvailableYes")}</p>
                {product.samplePrice && (
                  <p className="text-muted-foreground">
                    {t("samplePrice", {
                      price: formatDisplayPrice(
                        Number(product.samplePrice),
                        currency,
                        displayRates.rates
                      ),
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("descriptionTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {product.description || t("noDescription")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="size-4 text-primary" aria-hidden />
                {t("landedCostTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usdTiers.length > 0 ? (
                <LandedCostCalculator
                  tiers={usdTiers}
                  unit={product.unit}
                  moq={product.moq}
                  hsCode={product.hsCode}
                  fx={fx}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("landedCostHint")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reviewsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewsList rating={reviews.rating} items={reviews.items} />
        </CardContent>
      </Card>

      {related.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold">
            {t("relatedTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
            {related.map((rp) => (
              <ProductCard
                key={rp.id}
                product={rp}
                currency={currency}
                rates={displayRates.rates}
                rating={relatedRatings.get(rp.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
