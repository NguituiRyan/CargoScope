import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { FileText, Plus } from "lucide-react"

import { RfqStatusBadge } from "@/components/rfq/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { formatMoney } from "@/lib/currency/shared"
import { formatDateOnly } from "@/lib/datetime"
import { listBuyerRfqs } from "@/lib/rfq/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("title") }
}

export default async function BuyerRfqsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const user = await requireRole("buyer")
  const t = await getTranslations("rfq")
  const rfqs = await listBuyerRfqs(user)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/rfqs/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" aria-hidden />
          {t("post")}
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rfqs.map((r) => (
            <Link
              key={r.id}
              href={`/rfqs/${r.id}`}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium leading-snug">{r.title}</h2>
                <RfqStatusBadge status={r.status} label={t(`status.${r.status}`)} />
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
                <span className="font-medium text-foreground">
                  {t("quotes", { count: r.quoteCount })}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("postedOn", { date: formatDateOnly(r.createdAt, locale) })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
