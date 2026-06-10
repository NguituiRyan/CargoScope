import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft } from "lucide-react"

import { RfqForm } from "@/components/rfq/rfq-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { requireRole } from "@/lib/auth/session"
import { getCategoryOptions } from "@/lib/products/queries"
import { getRfqForEdit } from "@/lib/rfq/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq")
  return { title: t("editTitle") }
}

export default async function EditRfqPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const user = await requireRole("buyer")
  const [rfq, categories] = await Promise.all([
    getRfqForEdit(id, user),
    getCategoryOptions(),
  ])
  if (!rfq) notFound()
  const t = await getTranslations("rfq")

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <Link
        href={`/rfqs/${id}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToRfq")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("editTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RfqForm locale={locale} categories={categories} rfq={rfq} />
        </CardContent>
      </Card>
    </div>
  )
}
