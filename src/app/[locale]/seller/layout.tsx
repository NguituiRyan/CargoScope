import { getTranslations, setRequestLocale } from "next-intl/server"
import { Store } from "lucide-react"

import { SellerNav } from "@/components/manufacturers/seller-nav"
import { requireRole } from "@/lib/auth/session"

export default async function SellerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireRole("manufacturer")
  const t = await getTranslations("seller")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-primary">
          <Store className="size-5" aria-hidden />
          <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {t("portalTitle")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t("portalSubtitle")}</p>
      </div>
      <SellerNav />
      {children}
    </div>
  )
}
