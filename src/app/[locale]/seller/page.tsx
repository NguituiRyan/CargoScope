import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import {
  FileText,
  MessageSquare,
  Package,
  Plus,
  Quote,
  ShieldCheck,
  Star,
} from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { localePath, requireRole } from "@/lib/auth/session"
import { getMyManufacturer } from "@/lib/manufacturers/queries"
import { getUnreadMessageCount } from "@/lib/messaging/queries"
import { getMyProducts } from "@/lib/products/queries"
import { getManufacturerRating } from "@/lib/reviews/queries"
import { listOpenRfqs } from "@/lib/rfq/queries"
import { tierLimits } from "@/lib/subscription/tiers"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard")
  return { title: t("sellerTitle") }
}

export default async function SellerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const user = await requireRole("manufacturer")
  const m = await getMyManufacturer()
  if (!m) redirect(localePath(locale, "/seller/onboarding"))

  const [t, tp] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("pricing"),
  ])

  const [products, open, rating, unread] = await Promise.all([
    getMyProducts(m.id),
    listOpenRfqs(user),
    getManufacturerRating(m.id),
    getUnreadMessageCount(),
  ])

  const active = products.filter((p) => p.status === "active").length
  const quotesSent = open.filter((r) => r.myQuoteStatus).length
  const limits = tierLimits(m.subscriptionTier)
  const limitLabel = Number.isFinite(limits.maxListings)
    ? String(limits.maxListings)
    : t("unlimited")
  const planTier = ["basic", "verified", "premium"].includes(m.subscriptionTier)
    ? m.subscriptionTier
    : "basic"
  const planName = tp(`tiers.${planTier}.name`)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("sellerTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("sellerSubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          <span className="text-muted-foreground">{t("plan")}:</span>
          <span className="font-semibold">{planName}</span>
        </div>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {t("viewPlans")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label={t("activeListings")}
          value={active}
          sub={t("listingsUsage", { used: active, limit: limitLabel })}
          href="/seller/products"
        />
        <StatCard
          icon={FileText}
          label={t("rfqsAvailable")}
          value={open.length}
          href="/seller/rfqs"
        />
        <StatCard icon={Quote} label={t("quotesSent")} value={quotesSent} href="/seller/rfqs" />
        <StatCard
          icon={Star}
          label={t("rating")}
          value={rating.count > 0 ? rating.avg.toFixed(1) : "—"}
          sub={rating.count > 0 ? `(${rating.count})` : undefined}
        />
        <StatCard
          icon={MessageSquare}
          label={t("unread")}
          value={unread}
          href="/messages"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">{t("quickActions")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/seller/products/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus className="size-4" aria-hidden />
            {t("addProduct")}
          </Link>
          <Link
            href="/seller/rfqs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileText className="size-4" aria-hidden />
            {t("browseRfqs")}
          </Link>
          <Link
            href="/seller/verification"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ShieldCheck className="size-4" aria-hidden />
            {t("verification")}
          </Link>
          <Link
            href="/messages"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <MessageSquare className="size-4" aria-hidden />
            {t("messages")}
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Link href="/seller/products/new" className="text-primary hover:underline">
              {t("addProduct")}
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
