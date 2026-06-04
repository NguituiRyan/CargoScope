import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  ClipboardCheck,
  Languages,
  ListPlus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("howItWorks")
  return { title: t("title") }
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("howItWorks")

  const buyerSteps: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: ShieldCheck, title: t("step1Title"), body: t("step1Body") },
    { icon: Calculator, title: t("step2Title"), body: t("step2Body") },
    { icon: Languages, title: t("step3Title"), body: t("step3Body") },
    { icon: ClipboardCheck, title: t("step4Title"), body: t("step4Body") },
  ]

  const supplierSteps: { icon: LucideIcon; title: string; body: string }[] = [
    {
      icon: BadgeCheck,
      title: t("supplierStep1Title"),
      body: t("supplierStep1Body"),
    },
    {
      icon: ListPlus,
      title: t("supplierStep2Title"),
      body: t("supplierStep2Body"),
    },
    {
      icon: Users,
      title: t("supplierStep3Title"),
      body: t("supplierStep3Body"),
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="font-heading text-xl font-semibold">{t("forBuyers")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {buyerSteps.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-heading text-xl font-semibold">
          {t("forSuppliers")}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {supplierSteps.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-8 sm:flex-row">
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
          href="/sign-up"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 px-6 text-base"
          )}
        >
          {t("ctaSell")}
        </Link>
      </div>
    </div>
  )
}
