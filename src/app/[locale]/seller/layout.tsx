import { setRequestLocale } from "next-intl/server"

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <SellerNav />
      {children}
    </div>
  )
}
