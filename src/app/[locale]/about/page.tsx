import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about")
  return { title: t("title") }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("about")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">{t("lead")}</p>

      <h2 className="mt-8 font-heading text-xl font-semibold">
        {t("missionTitle")}
      </h2>
      <p className="mt-2 text-pretty text-muted-foreground">{t("mission")}</p>
    </div>
  )
}
