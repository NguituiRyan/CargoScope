import type { Metadata } from "next"
import { Mail, MessageSquare } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact")
  return { title: t("title") }
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("contact")
  const email = t("email")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">{t("lead")}</p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{t("emailLabel")}</p>
            <TrackedExternalLink
              href={`mailto:${email}`}
              event="contact_click"
              metadata={{ channel: "email", placement: "contact_page" }}
              className="text-sm text-primary hover:underline"
            >
              {email}
            </TrackedExternalLink>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <MessageSquare
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold">{t("chatTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("chat")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
