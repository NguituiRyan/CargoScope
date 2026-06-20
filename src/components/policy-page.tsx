import { getTranslations } from "next-intl/server"

/**
 * Shared layout for the trust/compliance pages (buyer protection, supplier
 * verification process, supplier standards, dispute resolution, refunds).
 * Each route passes its own i18n namespace with: title, updated, p1..p3 (+Title).
 */
export async function PolicyPage({ ns }: { ns: string }) {
  const t = await getTranslations(ns)
  const sections = [
    { title: t("p1Title"), body: t("p1") },
    { title: t("p2Title"), body: t("p2") },
    { title: t("p3Title"), body: t("p3") },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("updated")}</p>

      <div className="mt-8 flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-heading text-lg font-semibold">
              {section.title}
            </h2>
            <p className="mt-2 text-pretty text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
