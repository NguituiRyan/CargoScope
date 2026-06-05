import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, Building2, MapPin } from "lucide-react"

import { ProductCard } from "@/components/catalog/product-card"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getManufacturerStorefront } from "@/lib/catalog/queries"
import { getDisplayCurrency } from "@/lib/currency/server"
import { getDisplayRates } from "@/lib/fx"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const storefront = await getManufacturerStorefront(slug)
  return { title: storefront?.manufacturer.companyName }
}

function yearOf(timestamp: string | null): number | null {
  if (!timestamp) return null
  const year = new Date(timestamp).getFullYear()
  return Number.isFinite(year) ? year : null
}

export default async function ManufacturerStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [storefront, currency, displayRates] = await Promise.all([
    getManufacturerStorefront(slug),
    getDisplayCurrency(),
    getDisplayRates(),
  ])
  if (!storefront) notFound()

  const t = await getTranslations("directory")
  const { manufacturer: m, products } = storefront
  const location = [m.city, m.country].filter(Boolean).join(", ")
  const memberYear = yearOf(m.memberSince)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <Link
        href="/manufacturers"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToDirectory")}
      </Link>

      <Card className="overflow-hidden p-0">
        {m.bannerUrl && (
          <div className="relative aspect-[4/1] w-full bg-muted">
            <Image
              src={m.bannerUrl}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <CardContent className="flex flex-col gap-4 py-6">
          <div className="flex items-start gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              {m.logoUrl ? (
                <Image
                  src={m.logoUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <Building2
                  className="absolute inset-0 m-auto size-7 text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {m.companyName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <VerificationBadge status={m.verificationStatus} />
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {location}
                  </span>
                )}
                {m.yearEstablished && (
                  <span>{t("established", { year: m.yearEstablished })}</span>
                )}
                {memberYear && (
                  <span>{t("memberSince", { year: memberYear })}</span>
                )}
                {m.responseRate !== null && (
                  <span>{t("responseRate", { rate: m.responseRate })}</span>
                )}
              </div>
            </div>
          </div>

          {(m.certifications.length > 0 || m.mainCategories.length > 0) && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {m.certifications.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("certificationsLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {m.certifications.map((cert) => (
                      <Badge key={cert} variant="outline">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {m.mainCategories.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("categoriesLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {m.mainCategories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {m.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("aboutTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {m.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">
            {t("productsTitle")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {t("productsCount", { count: products.length })}
          </span>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("noProducts")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                rates={displayRates.rates}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
