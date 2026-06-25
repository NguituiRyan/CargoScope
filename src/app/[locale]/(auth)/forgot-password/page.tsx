import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getSessionUser, localePath } from "@/lib/auth/session"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("forgotTitle") }
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  if (await getSessionUser()) {
    redirect(localePath(locale, "/account"))
  }
  const t = await getTranslations("auth")

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{t("forgotTitle")}</CardTitle>
        <CardDescription>{t("forgotSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm locale={locale} />
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </CardFooter>
    </Card>
  )
}
