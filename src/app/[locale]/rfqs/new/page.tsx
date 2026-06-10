import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft } from "lucide-react"

import { RfqForm } from "@/components/rfq/rfq-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { getCategoryOptions } from "@/lib/products/queries"
import { listInvitableSuppliers } from "@/lib/rfq/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("newTitle") }
}

export default async function NewRfqPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireRole("buyer")
  const t = await getTranslations("rfq")
  const [categories, suppliers] = await Promise.all([
    getCategoryOptions(),
    listInvitableSuppliers(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <Link
        href="/rfqs"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToRfqs")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("newTitle")}</CardTitle>
          <CardDescription>{t("newSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RfqForm locale={locale} categories={categories} suppliers={suppliers} />
        </CardContent>
      </Card>
    </div>
  )
}
