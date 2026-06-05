import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react"

import { QuoteForm } from "@/components/rfq/quote-form"
import { RfqStatusBadge } from "@/components/rfq/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { formatMoney } from "@/lib/currency/shared"
import { formatDateOnly } from "@/lib/datetime"
import { getRfqForQuoting } from "@/lib/rfq/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("quoteTitle") }
}

export default async function SellerRfqDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const user = await requireRole("manufacturer")
  const rfq = await getRfqForQuoting(id, user)
  if (!rfq) notFound()

  const t = await getTranslations("rfq")
  const meta: { label: string; value: string }[] = [
    { label: t("buyer"), value: rfq.buyerCompanyName ?? t("buyer") },
  ]
  if (rfq.categoryName) meta.push({ label: t("category"), value: rfq.categoryName })
  if (rfq.quantity !== null)
    meta.push({ label: t("quantity"), value: `${rfq.quantity} ${rfq.unit}` })
  if (rfq.targetUnitPrice)
    meta.push({
      label: t("targetPrice"),
      value: `${formatMoney(rfq.targetUnitPrice, rfq.currency)} ${t("perUnit", { unit: rfq.unit })}`,
    })

  const destination = [rfq.destinationCity, rfq.destinationCountry]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/seller/rfqs"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToOpen")}
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {rfq.title}
          </h1>
          <RfqStatusBadge status={rfq.status} label={t(`status.${rfq.status}`)} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {destination ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {destination}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {rfq.deadline
              ? t("deadline", { date: formatDateOnly(rfq.deadline, locale) })
              : t("noDeadline")}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("rfqDetailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{m.label}</dt>
                <dd className="text-sm font-medium">{m.value}</dd>
              </div>
            ))}
          </dl>
          {rfq.description ? (
            <p className="whitespace-pre-line border-t border-border pt-4 text-sm text-muted-foreground">
              {rfq.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("yourQuoteTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rfq.myQuote ? (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {t("alreadyQuotedNote")}
            </p>
          ) : null}
          <QuoteForm rfqId={rfq.id} initial={rfq.myQuote} />
        </CardContent>
      </Card>
    </div>
  )
}
