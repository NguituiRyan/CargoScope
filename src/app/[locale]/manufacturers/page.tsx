import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { DirectorySearch } from "@/components/manufacturers/directory-search"
import { ManufacturerCard } from "@/components/manufacturers/manufacturer-card"
import { Card, CardContent } from "@/components/ui/card"
import { getVerifiedManufacturers } from "@/lib/catalog/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("directory")
  return { title: t("title") }
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function ManufacturersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("directory")

  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim() || undefined
  const manufacturers = await getVerifiedManufacturers(query)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DirectorySearch />

      {manufacturers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manufacturers.map((manufacturer) => (
            <ManufacturerCard
              key={manufacturer.id}
              manufacturer={manufacturer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
