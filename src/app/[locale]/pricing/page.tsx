import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Check } from "lucide-react"

import { SubscribeButton } from "@/components/billing/subscribe-button"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { getMyManufacturer } from "@/lib/manufacturers/queries"
import { PADDLE_PRICE_IDS } from "@/lib/paddle/config"
import { PRICING_TIERS } from "@/lib/subscription/tiers"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing")
  return { title: t("title") }
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("pricing")
  const user = await getSessionUser()
  const m = user?.role === "manufacturer" ? await getMyManufacturer() : null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-3">
        {PRICING_TIERS.map(({ tier, monthlyUsd, recommended }) => {
          const features = t.raw(`tiers.${tier}.features`) as string[]
          return (
            <Card
              key={tier}
              className={cn(
                "relative flex flex-col",
                recommended &&
                  "border-primary shadow-md ring-1 ring-primary/20 md:-mt-2"
              )}
            >
              {recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  {t("recommended")}
                </span>
              ) : null}
              <CardHeader className="gap-1">
                <h2 className="font-heading text-xl font-semibold">
                  {t(`tiers.${tier}.name`)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(`tiers.${tier}.tagline`)}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {monthlyUsd === 0 ? (
                    t("free")
                  ) : (
                    <>
                      ${monthlyUsd}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        {t("perMonth")}
                      </span>
                    </>
                  )}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-verified-foreground"
                        aria-hidden
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {m?.subscriptionTier === tier ? (
                  <span className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-sm font-medium text-muted-foreground">
                    {t("currentPlan")}
                  </span>
                ) : monthlyUsd > 0 &&
                  m &&
                  (tier === "verified" || tier === "premium") &&
                  PADDLE_PRICE_IDS[tier] ? (
                  <SubscribeButton
                    priceId={PADDLE_PRICE_IDS[tier]!}
                    manufacturerId={m.id}
                    email={user!.email}
                    label={t("subscribe")}
                    variant={recommended ? "default" : "outline"}
                  />
                ) : (
                  <Link
                    href="/sign-up"
                    className={cn(
                      buttonVariants({ variant: recommended ? "default" : "outline" })
                    )}
                  >
                    {t("cta")}
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">{t("buyerNote")}</p>
    </div>
  )
}
