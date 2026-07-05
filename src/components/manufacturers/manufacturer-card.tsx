import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Building2, MapPin } from "lucide-react"

import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import type { StorefrontManufacturer } from "@/lib/catalog/queries"

export async function ManufacturerCard({
  manufacturer,
}: {
  manufacturer: StorefrontManufacturer
}) {
  const t = await getTranslations("directory")
  const location = [manufacturer.city, manufacturer.country]
    .filter(Boolean)
    .join(", ")

  return (
    <Card className="transition-colors hover:border-ring">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {manufacturer.logoUrl ? (
              <Image
                src={manufacturer.logoUrl}
                alt=""
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <Building2
                className="absolute inset-0 m-auto size-5 text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/manufacturers/${manufacturer.slug}`}
              className="font-medium hover:underline"
            >
              {manufacturer.companyName}
            </Link>
            {manufacturer.verificationStatus !== "pending" && (
              <div className="mt-1">
                <VerificationBadge status={manufacturer.verificationStatus} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {location}
            </span>
          )}
          {manufacturer.yearEstablished && (
            <span>{t("established", { year: manufacturer.yearEstablished })}</span>
          )}
        </div>

        {manufacturer.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {manufacturer.certifications.slice(0, 4).map((cert) => (
              <Badge key={cert} variant="outline">
                {cert}
              </Badge>
            ))}
          </div>
        )}

        <Link
          href={`/manufacturers/${manufacturer.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("viewStorefront")}
        </Link>
      </CardContent>
    </Card>
  )
}
