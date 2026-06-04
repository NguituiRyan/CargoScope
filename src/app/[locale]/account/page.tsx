import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { signOutAction } from "@/lib/auth/actions"
import { requireUser } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return { title: t("title") }
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await requireUser()
  const t = await getTranslations("account")

  const roleBadge = cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    user.role === "admin" && "bg-foreground text-background",
    user.role === "manufacturer" && "bg-verified/20 text-verified-foreground",
    user.role === "buyer" && "bg-primary/10 text-primary"
  )

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-muted-foreground">{t("name")}</span>
            <span className="text-sm font-medium">
              {user.fullName ?? t("notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-muted-foreground">{t("email")}</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-muted-foreground">{t("role")}</span>
            <span className={roleBadge}>{t(`roles.${user.role}`)}</span>
          </div>
        </CardContent>
        <CardFooter>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline">
              {t("signOut")}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
