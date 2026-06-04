import { ArrowRight, Calculator, Languages, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("home")

  const pillars = [
    {
      icon: ShieldCheck,
      title: t("pillars.verifiedTitle"),
      body: t("pillars.verifiedBody"),
    },
    {
      icon: Calculator,
      title: t("pillars.landedTitle"),
      body: t("pillars.landedBody"),
    },
    {
      icon: Languages,
      title: t("pillars.translateTitle"),
      body: t("pillars.translateBody"),
    },
  ]

  return (
    <div className="flex flex-col">
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="flex max-w-2xl flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-verified" aria-hidden />
            {t("badge")}
          </span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-11 gap-2 px-6 text-base"
              )}
            >
              {t("ctaBrowse")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/sell"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 px-6 text-base"
              )}
            >
              {t("ctaSell")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-heading text-base font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
