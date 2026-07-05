import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ChevronRight } from "lucide-react"

import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { listManufacturersForVetting } from "@/lib/admin/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin")
  return { title: t("manufacturersTitle") }
}

export default async function AdminManufacturersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations("admin")
  const manufacturers = await listManufacturersForVetting()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("manufacturersTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("manufacturersSubtitle")}
        </p>
      </div>

      {manufacturers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noManufacturers")}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {manufacturers.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/manufacturers/${m.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.city, m.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.pendingDocs > 0 ? (
                        <Badge variant="secondary">
                          {t("docsPending", { count: m.pendingDocs })}
                        </Badge>
                      ) : null}
                      {m.isPublished ? (
                        <Badge variant="outline">{t("live")}</Badge>
                      ) : null}
                      <VerificationBadge
                        status={m.verificationStatus}
                        forceShow={true}
                      />
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
