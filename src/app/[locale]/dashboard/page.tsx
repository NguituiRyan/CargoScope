import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { FileText, MessageSquare, Plus, Search, Quote } from "lucide-react"

import { RfqStatusBadge } from "@/components/rfq/status-badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { formatDateOnly } from "@/lib/datetime"
import { getUnreadMessageCount } from "@/lib/messaging/queries"
import { listBuyerRfqs } from "@/lib/rfq/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard")
  return { title: t("buyerTitle") }
}

export default async function BuyerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const user = await requireRole("buyer")
  const t = await getTranslations("dashboard")
  const tr = await getTranslations("rfq")

  const rfqs = await listBuyerRfqs(user)
  const unread = await getUnreadMessageCount()
  const openCount = rfqs.filter(
    (r) => r.status === "open" || r.status === "quoting"
  ).length
  const quotesReceived = rfqs.reduce((n, r) => n + r.quoteCount, 0)
  const recent = rfqs.slice(0, 5)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("buyerTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("buyerSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={FileText} label={t("openRfqs")} value={openCount} href="/rfqs" />
        <StatCard
          icon={Quote}
          label={t("quotesReceived")}
          value={quotesReceived}
          href="/rfqs"
        />
        <StatCard
          icon={MessageSquare}
          label={t("unread")}
          value={unread}
          href="/messages"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/rfqs/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" aria-hidden />
          {t("postRfq")}
        </Link>
        <Link
          href="/products"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Search className="size-4" aria-hidden />
          {t("browse")}
        </Link>
        <Link
          href="/messages"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <MessageSquare className="size-4" aria-hidden />
          {t("messages")}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold">{t("recentRfqs")}</h2>
          {rfqs.length > 0 ? (
            <Link
              href="/rfqs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("viewAll")}
            </Link>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("noRfqs")}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/rfqs/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-ring"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr("quotes", { count: r.quoteCount })} ·{" "}
                    {formatDateOnly(r.createdAt, locale)}
                  </p>
                </div>
                <RfqStatusBadge status={r.status} label={tr(`status.${r.status}`)} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
