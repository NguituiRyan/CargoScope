import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react"

import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { AcceptQuoteButton } from "@/components/rfq/accept-quote-button"
import { DeleteRfqButton } from "@/components/rfq/delete-rfq-button"
import { QuoteComparison } from "@/components/rfq/quote-comparison"
import { RfqAttachments } from "@/components/rfq/rfq-attachments"
import { QuoteStatusBadge, RfqStatusBadge } from "@/components/rfq/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { formatMoney } from "@/lib/currency/shared"
import { formatDateOnly } from "@/lib/datetime"
import { setRfqStatusAction } from "@/lib/rfq/actions"
import { getBuyerRfqDetail } from "@/lib/rfq/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("title") }
}

export default async function BuyerRfqDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const user = await requireRole("buyer")
  const rfq = await getBuyerRfqDetail(id, user)
  if (!rfq) notFound()

  const t = await getTranslations("rfq")
  const hasAcceptedQuote = rfq.quotes.some((q) => q.status === "accepted")
  const meta: { label: string; value: string }[] = []
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link
        href="/rfqs"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToRfqs")}
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
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
          <span>{t("postedOn", { date: formatDateOnly(rfq.createdAt, locale) })}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {rfq.status !== "closed" ? (
          <Link
            href={`/rfqs/${rfq.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("manageEdit")}
          </Link>
        ) : null}
        {rfq.status !== "closed" ? (
          <form action={setRfqStatusAction}>
            <input type="hidden" name="rfqId" value={rfq.id} />
            <input type="hidden" name="status" value="closed" />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("manageClose")}
            </button>
          </form>
        ) : !hasAcceptedQuote ? (
          <form action={setRfqStatusAction}>
            <input type="hidden" name="rfqId" value={rfq.id} />
            <input type="hidden" name="status" value="open" />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("manageReopen")}
            </button>
          </form>
        ) : null}
        <DeleteRfqButton rfqId={rfq.id} />
      </div>

      {(meta.length > 0 || rfq.description) && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            {meta.length > 0 && (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {meta.map((m) => (
                  <div key={m.label} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">{m.label}</dt>
                    <dd className="text-sm font-medium">{m.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {rfq.description ? (
              <p className="whitespace-pre-line border-t border-border pt-4 text-sm text-muted-foreground">
                {rfq.description}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <RfqAttachments attachments={rfq.attachments} />

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {t("detailQuotesTitle")} · {t("quotes", { count: rfq.quotes.length })}
        </h2>

        {rfq.status === "closed" ? (
          <p className="text-sm text-muted-foreground">{t("closedNote")}</p>
        ) : null}

        {rfq.quotes.length >= 2 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("compareTitle")}
            </h3>
            <QuoteComparison
              quotes={rfq.quotes}
              rfqId={rfq.id}
              unit={rfq.unit}
              closed={rfq.status === "closed"}
              locale={locale}
            />
          </div>
        ) : null}

        {rfq.quotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
              <p className="text-sm font-medium">{t("noQuotes")}</p>
              <p className="text-sm text-muted-foreground">{t("noQuotesHint")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {rfq.quotes.map((q) => (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">
                      {q.manufacturerSlug ? (
                        <Link
                          href={`/manufacturers/${q.manufacturerSlug}`}
                          className="hover:underline"
                        >
                          {q.manufacturerName ?? t("buyer")}
                        </Link>
                      ) : (
                        (q.manufacturerName ?? t("buyer"))
                      )}
                    </CardTitle>
                    <VerificationBadge status={q.manufacturerStatus} />
                  </div>
                  <QuoteStatusBadge
                    status={q.status}
                    label={t(`quoteStatus.${q.status}`)}
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-lg font-semibold tracking-tight">
                    {formatMoney(q.unitPrice, q.currency)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("perUnit", { unit: rfq.unit })}
                    </span>
                  </p>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {q.moq !== null ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">{t("moq")}</dt>
                        <dd className="font-medium">
                          {q.moq} {rfq.unit}
                        </dd>
                      </div>
                    ) : null}
                    {q.leadTimeDays !== null ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("leadTime")}
                        </dt>
                        <dd className="font-medium">
                          {t("leadDays", { days: q.leadTimeDays })}
                        </dd>
                      </div>
                    ) : null}
                    {q.incoterm ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("incoterm")}
                        </dt>
                        <dd className="font-medium">{q.incoterm}</dd>
                      </div>
                    ) : null}
                    {q.validUntil ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("validUntil")}
                        </dt>
                        <dd className="font-medium">
                          {formatDateOnly(q.validUntil, locale)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {q.notes ? (
                    <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      {q.notes}
                    </p>
                  ) : null}
                  {q.status === "accepted" ? (
                    <p className="text-sm font-medium text-verified-foreground">
                      {t("acceptedNote")}
                    </p>
                  ) : rfq.status !== "closed" ? (
                    <AcceptQuoteButton
                      rfqId={rfq.id}
                      quoteId={q.id}
                      label={t("accept")}
                    />
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
