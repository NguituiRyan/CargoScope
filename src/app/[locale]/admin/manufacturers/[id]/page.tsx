import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeft, FileText } from "lucide-react"

import { ManufacturerStatusForm } from "@/components/admin/manufacturer-status-form"
import { VerificationReview } from "@/components/admin/verification-review"
import { DocStatusBadge } from "@/components/manufacturers/doc-status-badge"
import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import {
  getManufacturerForReview,
  getSignedDocUrls,
} from "@/lib/admin/queries"
import { getManufacturerContacts } from "@/lib/manufacturers/queries"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const review = await getManufacturerForReview(id)
  return { title: review?.manufacturer.companyName ?? "Manufacturer" }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export default async function ManufacturerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const review = await getManufacturerForReview(id)
  if (!review) notFound()

  const { manufacturer: m, ownerEmail, verifications } = review
  const t = await getTranslations("admin")
  const tv = await getTranslations("verification")
  const ts = await getTranslations("seller")
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })

  const allPaths = verifications.flatMap((v) => v.documents.map((d) => d.path))
  const signed = await getSignedDocUrls(allPaths)
  const contacts = await getManufacturerContacts(m.id)
  const location = [m.city, m.country].filter(Boolean).join(", ") || "—"

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/manufacturers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToQueue")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {m.companyName}
          </h1>
          <p className="text-sm text-muted-foreground">{location}</p>
        </div>
        <VerificationBadge status={m.verificationStatus} forceShow={true} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("companyDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border text-sm">
              <DetailRow label={t("owner")} value={ownerEmail ?? "—"} />
              <DetailRow
                label={ts("yearEstablished")}
                value={m.yearEstablished?.toString() ?? "—"}
              />
              <DetailRow
                label={ts("mainCategories")}
                value={m.mainCategories.join(", ") || "—"}
              />
              <DetailRow
                label={ts("certifications")}
                value={m.certifications.join(", ") || "—"}
              />
            </CardContent>
            {m.description ? (
              <CardContent>
                <p className="text-sm whitespace-pre-line">{m.description}</p>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{ts("contactsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border text-sm">
              <DetailRow label={ts("wechat")} value={contacts?.wechat || "—"} />
              <DetailRow
                label={ts("whatsapp")}
                value={contacts?.whatsapp || "—"}
              />
              <DetailRow label={ts("phone")} value={contacts?.phone || "—"} />
              <DetailRow
                label={ts("contactEmail")}
                value={contacts?.contactEmail || "—"}
              />
              <DetailRow
                label={ts("website")}
                value={contacts?.website || "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("documents")}</CardTitle>
              <CardDescription>{t("documentsHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noDocuments")}
                </p>
              ) : (
                <ul className="flex flex-col gap-5">
                  {verifications.map((v) => (
                    <li
                      key={v.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{tv(`type.${v.type}`)}</span>
                        <DocStatusBadge status={v.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateFmt.format(new Date(v.createdAt))}
                      </p>
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {v.documents.map((d) => (
                          <li key={d.path}>
                            {signed[d.path] ? (
                              <a
                                href={signed[d.path]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                              >
                                <FileText className="size-4" aria-hidden />
                                {d.name}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <FileText className="size-4" aria-hidden />
                                {d.name}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {v.notes ? (
                        <p className="mt-3 text-sm">
                          <span className="text-muted-foreground">
                            {t("reviewNotes")}:{" "}
                          </span>
                          {v.notes}
                        </p>
                      ) : null}
                      {v.status === "pending" ? (
                        <div className="mt-3 border-t border-border pt-3">
                          <VerificationReview
                            verificationId={v.id}
                            manufacturerId={m.id}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-lg">{t("decision")}</CardTitle>
              <CardDescription>{t("decisionHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ManufacturerStatusForm
                key={`${m.verificationStatus}-${m.isPublished}`}
                manufacturerId={m.id}
                status={m.verificationStatus}
                isPublished={m.isPublished}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
