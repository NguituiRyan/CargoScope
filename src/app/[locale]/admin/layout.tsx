import { setRequestLocale } from "next-intl/server"

import { requireRole } from "@/lib/auth/session"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireRole("admin")

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>
  )
}
