import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { FileText } from "lucide-react"

import { DocStatusBadge } from "@/components/manufacturers/doc-status-badge"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { VerificationForm } from "@/components/manufacturers/verification-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { localePath } from "@/lib/auth/session"
import {
  getMyManufacturer,
  getVerifications,
} from "@/lib/manufacturers/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller")
  return { title: t("verificationTitle") }
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const manufacturer = await getMyManufacturer()
  if (!manufacturer) redirect(localePath(locale, "/seller/onboarding"))

  const t = await getTranslations("seller")
  const tv = await getTranslations("verification")
  const verifications = await getVerifications(manufacturer.id)
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{t("verificationTitle")}</CardTitle>
              <CardDescription className="mt-1">
                {t("verificationSubtitle")}
              </CardDescription>
            </div>
            <VerificationBadge
              status={manufacturer.verificationStatus}
              showPending={true}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("verifyHelp")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("submitTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationForm locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noSubmissions")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {verifications.map((v) => (
                <li key={v.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <FileText
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      {tv(`type.${v.type}`)}
                    </span>
                    <DocStatusBadge status={v.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{dateFmt.format(new Date(v.createdAt))}</span>
                    <span>{t("fileCount", { count: v.documents.length })}</span>
                  </div>
                  {v.notes ? (
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {t("reviewerNotes")}:{" "}
                      </span>
                      {v.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
