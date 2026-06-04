import { setRequestLocale } from "next-intl/server"

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      {children}
    </div>
  )
}
