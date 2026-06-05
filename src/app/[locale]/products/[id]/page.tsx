import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, Calculator } from "lucide-react"

import { LandedCostCalculator } from "@/components/catalog/landed-cost-calculator"
import { ProductGallery } from "@/components/catalog/product-gallery"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { ContactSupplierButton } from "@/components/messaging/contact-supplier-button"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { getPublicProduct } from "@/lib/catalog/queries"
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.priceTiers.map((tier) => (
                      <tr key={tier.id}>
                        <td className="py-2">
                          ≥ {tier.minQty} {product.unit}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatDisplayPrice(
                            Number(tier.unitPrice),
                            currency,
                            displayRates.rates
                          )}
                        </td>
                      </tr>
                    ))}
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
              {user ? (
                <div className="flex flex-col gap-2">
                  <form action={startConversationAction}>
                    <input type="hidden" name="manufacturerId" value={m.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <ContactSupplierButton label={t("messageSupplier")} />
                  </form>
                  <Link
                    href={`/manufacturers/${m.slug}`}
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                  >
                    {t("viewStorefront")}
                  </Link>
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                >
                  {t("signInToContact")}
                </Link>
              )}
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
    </div>
  )
}
