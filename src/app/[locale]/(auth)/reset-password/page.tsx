import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("resetTitle") }
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")
  // The reset link establishes a recovery session via /auth/confirm. No session
  // means the link is missing, invalid, or expired.
  const user = await getSessionUser()

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{t("resetTitle")}</CardTitle>
        <CardDescription>
          {user ? t("resetSubtitle") : t("resetExpired")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <ResetPasswordForm locale={locale} />
        ) : (
          <Link
            href="/forgot-password"
            className={cn(buttonVariants(), "w-full")}
          >
            {t("sendResetLink")}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
