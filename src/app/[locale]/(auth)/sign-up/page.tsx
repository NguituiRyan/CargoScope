import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { SignUpForm } from "@/components/auth/sign-up-form"
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
  return { title: t("signUpTitle") }
}

export default async function SignUpPage({
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
        <CardTitle>{t("signUpTitle")}</CardTitle>
        <CardDescription>{t("signUpSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm locale={locale} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>{t("haveAccount")}</span>
        <Link
          href="/sign-in"
          className="ml-1 font-medium text-primary hover:underline"
        >
          {t("signInCta")}
        </Link>
      </CardFooter>
    </Card>
  )
}
