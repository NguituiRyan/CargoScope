import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ClipboardCheck, FileWarning, Store } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listManufacturersForVetting } from "@/lib/admin/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin")
  return { title: t("title") }
}

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations("admin")
  const manufacturers = await listManufacturersForVetting()
  const pendingManufacturers = manufacturers.filter(
    (m) => m.verificationStatus === "pending"
  ).length
  const pendingDocs = manufacturers.reduce((sum, m) => sum + m.pendingDocs, 0)

  const stats = [
    { icon: Store, label: t("totalManufacturers"), value: manufacturers.length },
    { icon: ClipboardCheck, label: t("pendingReview"), value: pendingManufacturers },
    { icon: FileWarning, label: t("pendingDocs"), value: pendingDocs },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/manufacturers"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          {t("openQueue")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-2xl">{value}</CardTitle>
                <CardDescription>{label}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("vettingQueue")}</CardTitle>
          <CardDescription>{t("vettingQueueHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/manufacturers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("openQueue")}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
