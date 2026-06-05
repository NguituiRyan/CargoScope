import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Inbox } from "lucide-react"

import { QuoteStatusBadge } from "@/components/rfq/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { formatMoney } from "@/lib/currency/shared"
import { formatDateOnly } from "@/lib/datetime"
import { listOpenRfqs } from "@/lib/rfq/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("openRfqsTitle") }
}

export default async function SellerRfqsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const user = await requireRole("manufacturer")
  const t = await getTranslations("rfq")
  const rfqs = await listOpenRfqs(user)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {t("openRfqsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("openRfqsSubtitle")}</p>
      </div>

      {rfqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t("emptyOpen")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyOpenHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rfqs.map((r) => (
            <Link
              key={r.id}
              href={`/seller/rfqs/${r.id}`}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium leading-snug">{r.title}</h2>
                {r.myQuoteStatus ? (
                  <QuoteStatusBadge
                    status={r.myQuoteStatus}
                    label={t("quoted")}
                  />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {r.categoryName ? <span>{r.categoryName}</span> : null}
                {r.quantity !== null ? (
                  <span>
                    {r.quantity} {r.unit}
                  </span>
                ) : null}
                {r.targetUnitPrice ? (
                  <span>
                    {t("targetPrice")}: {formatMoney(r.targetUnitPrice, r.currency)}
                  </span>
                ) : null}
                <span>{t("quotes", { count: r.quoteCount })}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.deadline
                  ? t("deadline", { date: formatDateOnly(r.deadline, locale) })
                  : t("noDeadline")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
