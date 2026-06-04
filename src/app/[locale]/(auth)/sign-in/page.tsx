import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { SignInForm } from "@/components/auth/sign-in-form"
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
  return { title: t("signInTitle") }
}

export default async function SignInPage({
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
        <CardTitle>{t("signInTitle")}</CardTitle>
        <CardDescription>{t("signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm locale={locale} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>{t("noAccount")}</span>
        <Link
          href="/sign-up"
          className="ml-1 font-medium text-primary hover:underline"
        >
          {t("signUpCta")}
        </Link>
      </CardFooter>
    </Card>
  )
}
